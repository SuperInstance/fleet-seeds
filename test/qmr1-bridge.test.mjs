// qmr1-bridge.test.mjs — conformance tests for fleet-seeds' qmr1 producer
// (tools/qmr1-bridge.mjs). node --test, zero dependencies, no network, no keys.
//
// THE SIGNER BELOW IS INDEPENDENT: it is re-derived from the qmr1 spec
// (SuperInstance/quilt-mcp-receipts DESIGN.md §2) and NOT imported from the
// bridge or from the MCP server — spec-verified, not self-tautological.
//   canonicalJSON = recursive key-sorted, no-whitespace serialization
//   id  = sha256("qmr1:" + seq + ":" + prev + ":" + canonicalJSON(body))
//   sig = HMAC-SHA256(secret, "qmr1:sig:" + id)
//   genesis prev = 64 zeros; seq = 1, 2, 3 …; receipt = exactly
//   {seq, prev, body, id, sig}.
//
// Pinned behaviors:
//   1. fresh-store genesis (genesis + one lode.snapshot per lode, honest backfill)
//   2. append → verify ok (produce seals new lode rows; tip advances)
//   3. tamper trio rejected fail-closed, store untouched
//      (body flip → E_HASH_MISMATCH · sig flip → E_BAD_SIGNATURE ·
//       row deletion → E_SEQ_MISMATCH)
//   4. double-append of the same row rejected (E_SEQ_MISMATCH)
//   5. the bridge refuses to run when chain verification fails
//   6. row_sha256 / snapshot sha256 actually match the lode bytes
//      (independent recompute from the file, not from the bridge's memory)
//   7. bridge-level laws: E_LODE_TRUNCATED, E_LODE_ROW_REWRITTEN, idempotent
//      no-op produce, --check writes nothing, E_ALREADY_SEEDED.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LODES, GENESIS_PREV, DEFAULT_ROUND,
  canonicalJSON, verifyChain, verifyChainSigned, appendReceipt,
  seedChain, produce, readLode, readSecret,
} from '../tools/qmr1-bridge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── the independent spec signer (DESIGN.md §2, hand-ported) ──────────────────
const SPEC_canonical = (v) =>
  v === null || typeof v !== 'object' ? JSON.stringify(v) ?? 'null'
  : Array.isArray(v) ? '[' + v.map(SPEC_canonical).join(',') + ']'
  : '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + SPEC_canonical(v[k])).join(',') + '}';
const SPEC_id = (seq, prev, body) =>
  createHash('sha256').update(`qmr1:${seq}:${prev}:${SPEC_canonical(body)}`).digest('hex');
const SPEC_sig = (secret, id) =>
  createHmac('sha256', secret).update(`qmr1:sig:${id}`).digest('hex');

// ── fixtures ─────────────────────────────────────────────────────────────────
// A hermetic lode dir: small synthetic-but-shape-exact JSONL files.
function makeLodeDir(dir, counts = { registry: 3, lessons: 2, mines: 2 }) {
  const lodeDir = path.join(dir, 'lode');
  fs.mkdirSync(lodeDir, { recursive: true });
  for (const lode of LODES) {
    const n = counts[lode];
    const lines = [];
    for (let i = 1; i <= n; i++) {
      lines.push(JSON.stringify({ id: `${lode.toUpperCase()}-${i}`, ts: '2026-10-03T00:00:00Z', note: `synthetic ${lode} row ${i} of ${n}` }));
    }
    fs.writeFileSync(path.join(lodeDir, `${lode}.jsonl`), lines.join('\n') + '\n');
  }
  return lodeDir;
}

function makeEnv(t, counts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmr1-bridge-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const lodeDir = makeLodeDir(dir, counts);
  const storePath = path.join(dir, 'ledger', 'qmr1-store.jsonl');
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const secretPath = path.join(dir, '.qmr1-secret');
  return { dir, lodeDir, storePath, secretPath };
}

// the bridge owns the secret FILE — tests read it back (readSecret), never inject
const secretOf = (env) => readSecret(env.secretPath).secret;
const WRONG_SECRET = 'bb'.repeat(32); // deterministic non-secret for forgery cases

const seed = (env, round = DEFAULT_ROUND) => seedChain({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath, round });
const run = (env, args) => execFileSync(process.execPath, [path.join(HERE, '..', 'tools', 'qmr1-bridge.mjs'), ...args,
  '--store', env.storePath, '--secret', env.secretPath, '--lode-dir', env.lodeDir], { encoding: 'utf8' });
const runRefused = (env, args) => {
  try {
    return { res: run(env, args), code: 0 };
  } catch (e) {
    return { res: `${e.stdout || ''}\n${e.stderr || ''}`, code: e.status };
  }
};

// append a synthetic row to a lode file (the honest producer's input event)
const appendLodeRow = (env, lode, obj) => {
  const p = path.join(env.lodeDir, `${lode}.jsonl`);
  fs.appendFileSync(p, JSON.stringify(obj) + '\n');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return { rowSeq: lines.length, line: lines[lines.length - 1] };
};

const storeLines = (env) => {
  const t = fs.readFileSync(env.storePath, 'utf8');
  const lines = t.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
};

// ── 1. fresh-store genesis ───────────────────────────────────────────────────
describe('genesis (fresh store)', () => {
  test('seed writes genesis + one lode.snapshot per lode; verify ok; ids/sigs match the INDEPENDENT spec signer', () => {
    const env = makeEnv(test, { registry: 3, lessons: 2, mines: 2 });
    const res = seed(env);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.secret_created, true);
    assert.equal(res.count, 1 + LODES.length);

    const secret = secretOf(env);
    const v = verifyChainSigned(env.storePath, secret);
    assert.equal(v.ok, true, JSON.stringify(v));
    assert.equal(v.count, 4);

    // canonical-form cross-check: the spec signer's serializer agrees with the
    // bridge's on sorted keys / nested arrays / string escaping
    assert.equal(
      SPEC_canonical({ b: 1, a: [{ z: 26, y: [2, 1] }, 'x"y'], c: null }),
      canonicalJSON({ c: null, a: [{ y: [2, 1], z: 26 }, 'x"y'], b: 1 }),
    );

    const receipts = storeLines(env).map((l) => JSON.parse(l));
    // genesis law: seq 1, prev = 64 zeros
    assert.equal(receipts[0].seq, 1);
    assert.equal(receipts[0].prev, GENESIS_PREV);
    assert.equal(receipts[0].body.kind, 'lode.chain.genesis');
    // five fields exactly, nothing more
    for (const r of receipts) assert.deepEqual(Object.keys(r).sort(), ['body', 'id', 'prev', 'seq', 'sig']);
    // every id and sig re-derived by the INDEPENDENT signer matches the store
    let prev = GENESIS_PREV;
    receipts.forEach((r, i) => {
      assert.equal(r.seq, i + 1);
      assert.equal(r.prev, prev);
      assert.equal(r.id, SPEC_id(r.seq, r.prev, r.body), `id conformance at seq ${r.seq}`);
      assert.equal(r.sig, SPEC_sig(secret, r.id), `sig conformance at seq ${r.seq}`);
      prev = r.id;
    });
    // snapshots: one per lode, kind + rows count + file digest + honest round stamp
    const snaps = receipts.filter((r) => r.body.kind === 'lode.snapshot');
    assert.deepEqual(snaps.map((s) => s.body.lode).sort(), [...LODES].sort());
    for (const s of snaps) {
      assert.equal(s.body.rows, { registry: 3, lessons: 2, mines: 2 }[s.body.lode]);
      assert.equal(s.body.sealed_at_round, DEFAULT_ROUND);
      assert.match(s.body.sha256, /^[0-9a-f]{64}$/);
      assert.match(s.body.ts, /^\d{4}-\d{2}-\d{2}T/);
      assert.match(s.body.note, /snapshot/i, 'backfill honestly marked as snapshot');
    }
    // secret file: 64-hex, chmod 600
    assert.equal(fs.readFileSync(env.secretPath, 'utf8').trim(), secret);
    assert.equal((fs.statSync(env.secretPath).mode & 0o777), 0o600);
  });

  test('seeding is a one-time verb (E_ALREADY_SEEDED); re-seed never rewrites rows', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    const before = fs.readFileSync(env.storePath, 'utf8');
    const res = seed(env);
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_ALREADY_SEEDED');
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'store untouched by the refused re-seed');
  });
});

// ── 2. append → verify ok ────────────────────────────────────────────────────
describe('produce (the honest writer)', () => {
  test('new lode rows are sealed one-receipt-per-row; tip advances; verify ok', () => {
    const env = makeEnv(test, { registry: 2, lessons: 1, mines: 1 });
    assert.equal(seed(env).ok, true);
    const tipBefore = verifyChain(env.storePath).tip;

    const r1 = appendLodeRow(env, 'registry', { id: 'REG-NEW-1', ts: '2026-10-03T01:00:00Z' });
    const r2 = appendLodeRow(env, 'registry', { id: 'REG-NEW-2', ts: '2026-10-03T01:01:00Z' });
    const r3 = appendLodeRow(env, 'mines', { id: 'MINES-NEW-1', ts: '2026-10-03T01:02:00Z' });

    const res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.appended, 3);
    assert.equal(res.count, 4 + 3);

    const v = verifyChainSigned(env.storePath, secretOf(env));
    assert.equal(v.ok, true, JSON.stringify(v));
    assert.equal(v.count, 7);
    assert.notEqual(v.tip, tipBefore, 'tip advanced');

    const rows = storeLines(env).map((l) => JSON.parse(l)).filter((r) => r.body.kind === 'lode.row');
    assert.deepEqual(rows.map((r) => [r.body.lode, r.body.row_seq]), [
      ['registry', r1.rowSeq], ['registry', r2.rowSeq], ['mines', r3.rowSeq],
    ]);
    for (const r of rows) assert.equal(r.body.sealed_at_round, DEFAULT_ROUND);
    // tip reported by the bridge == the recomputed tip of the last row receipt
    assert.equal(res.tip, rows[rows.length - 1].id);
  });

  test('produce is idempotent when nothing new happened (appends nothing)', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    assert.equal(produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath }).ok, true);
    const before = fs.readFileSync(env.storePath, 'utf8');
    const res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, true);
    assert.equal(res.appended, 0);
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'no writes when there is nothing to seal');
  });
});

// ── 3. tamper trio, fail-closed, store untouched ─────────────────────────────
describe('tamper trio (fail-closed detection)', () => {
  const tamperedCopy = (env, mutate) => {
    const lines = storeLines(env);
    const out = mutate(lines);
    fs.writeFileSync(env.storePath, out.join('\n') + '\n');
  };

  test('body value flip → E_HASH_MISMATCH (localized)', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    tamperedCopy(env, (lines) => {
      const r = JSON.parse(lines[1]);
      r.body.rows = r.body.rows + 1; // flip one value inside the body
      lines[1] = JSON.stringify(r);
      return lines;
    });
    const v = verifyChainSigned(env.storePath, secretOf(env));
    assert.equal(v.ok, false);
    assert.equal(v.error, 'E_HASH_MISMATCH');
    assert.equal(v.at_seq, 2);
  });

  test('sig flip → E_BAD_SIGNATURE', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    tamperedCopy(env, (lines) => {
      const r = JSON.parse(lines[2]);
      r.sig = r.sig.slice(0, 62) + (r.sig.endsWith('a') ? 'b' : 'a');
      lines[2] = JSON.stringify(r);
      return lines;
    });
    const v = verifyChainSigned(env.storePath, secretOf(env));
    assert.equal(v.ok, false);
    assert.equal(v.error, 'E_BAD_SIGNATURE');
    assert.equal(v.at_seq, 3);
  });

  test('row deletion → E_SEQ_MISMATCH (removal is never silently skipped)', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    tamperedCopy(env, (lines) => lines.filter((_, i) => i !== 2)); // delete seq 3
    const v = verifyChainSigned(env.storePath, secretOf(env));
    assert.equal(v.ok, false);
    assert.equal(v.error, 'E_SEQ_MISMATCH');
    assert.equal(v.at_seq, 3, 'the gap is named at the row after the deletion');
  });

  test('forged appends are refused and leave the store byte-identical', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    const secret = secretOf(env);
    const before = fs.readFileSync(env.storePath, 'utf8');
    const tip = JSON.parse(storeLines(env).slice(-1)[0]);

    // (a) replayed tip (double-append of an existing receipt) → E_SEQ_MISMATCH
    const replay = JSON.parse(JSON.stringify(tip));
    let res = appendReceipt(env.storePath, replay, { secret });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_SEQ_MISMATCH');
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'store untouched');

    // (b) broken prev link → E_PREV_MISMATCH
    const body = { kind: 'attack.simulation', ts: '2026-10-03T00:00:00Z' };
    const forged = { seq: tip.seq + 1, prev: 'f'.repeat(64), body, id: SPEC_id(tip.seq + 1, 'f'.repeat(64), body), sig: '' };
    forged.sig = SPEC_sig(secret, forged.id);
    res = appendReceipt(env.storePath, forged, { secret });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_PREV_MISMATCH');
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'store untouched');

    // (c) valid-shape receipt signed with the WRONG secret → E_BAD_SIGNATURE
    const wrongSig = { seq: tip.seq + 1, prev: tip.id, body, id: SPEC_id(tip.seq + 1, tip.id, body), sig: '' };
    wrongSig.sig = SPEC_sig(WRONG_SECRET, wrongSig.id);
    res = appendReceipt(env.storePath, wrongSig, { secret });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_BAD_SIGNATURE');
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'store untouched');

    // (d) unknown extra field → E_UNKNOWN_FIELD (strictness on purpose)
    const smug = { seq: tip.seq + 1, prev: tip.id, body, id: SPEC_id(tip.seq + 1, tip.id, body), sig: '', note: 'smuggled' };
    smug.sig = SPEC_sig(secret, smug.id);
    res = appendReceipt(env.storePath, smug, { secret });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_UNKNOWN_FIELD');
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'store untouched');
  });
});

// ── 4. double-append of the same ROW (the producer's replay case) ────────────
describe('double-append refusal', () => {
  test('re-sealing an already-covered row at a stale seq is refused (E_SEQ_MISMATCH)', () => {
    const env = makeEnv(test, { registry: 1, lessons: 1, mines: 1 });
    assert.equal(seed(env).ok, true);
    const row = appendLodeRow(env, 'registry', { id: 'REG-DUP', ts: '2026-10-03T02:00:00Z' });
    const first = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(first.ok, true);
    assert.equal(first.appended, 1);
    const afterFirst = fs.readFileSync(env.storePath, 'utf8');

    // even a PERFECTLY re-signed receipt at the stale seq is a fork: refused
    const perfect = {
      seq: first.receipts[0].seq,
      prev: JSON.parse(storeLines(env).slice(-1)[0]).id,
      body: { kind: 'lode.row', ts: '2026-10-03T02:00:00Z', lode: 'registry', row_seq: row.rowSeq, row_sha256: createHash('sha256').update(row.line, 'utf8').digest('hex'), sealed_at_round: DEFAULT_ROUND },
      id: '', sig: '',
    };
    perfect.id = SPEC_id(perfect.seq, perfect.prev, perfect.body);
    perfect.sig = SPEC_sig(secretOf(env), perfect.id);
    const res = appendReceipt(env.storePath, perfect, { secret: secretOf(env) });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_SEQ_MISMATCH', `seq ${perfect.seq} is already covered — refork refused`);
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), afterFirst, 'store untouched');
  });
});

// ── 5. the bridge refuses to run when the chain fails to verify ──────────────
describe('fail-closed producer (CLI level)', () => {
  test('produce on a tampered store exits non-zero, names the error, writes NOTHING', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    // append a new lode row (there IS honest work waiting) …
    appendLodeRow(env, 'lessons', { id: 'LES-NEW', ts: '2026-10-03T03:00:00Z' });
    // … then corrupt the store behind the bridge's back
    const lines = storeLines(env);
    const r = JSON.parse(lines[0]);
    r.body.note = 'tampered genesis note';
    lines[0] = JSON.stringify(r);
    fs.writeFileSync(env.storePath, lines.join('\n') + '\n');

    const before = fs.readFileSync(env.storePath, 'utf8');
    const { res, code } = runRefused(env, []);
    assert.notEqual(code, 0, 'non-zero exit');
    assert.match(res, /E_HASH_MISMATCH/);
    const after = fs.readFileSync(env.storePath, 'utf8');
    assert.equal(after, before, 'the producer wrote nothing on a broken chain');
    assert.equal(storeLines(env).length, 4, 'no receipt was appended');
  });

  test('produce on a missing store → E_STORE_NOT_SEEDED (no silent re-seed)', () => {
    const env = makeEnv(test);
    const res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_STORE_NOT_SEEDED');
    assert.equal(fs.existsSync(env.storePath), false);
  });
});

// ── 6. row_sha256 matches the lode row bytes (independent recompute) ─────────
describe('binding to the lode bytes', () => {
  test('each lode.row receipt hashes the exact row bytes, recomputed from the file', () => {
    const env = makeEnv(test, { registry: 2, lessons: 1, mines: 1 });
    assert.equal(seed(env).ok, true);
    appendLodeRow(env, 'registry', { id: 'REG-BIND', ts: '2026-10-03T04:00:00Z', note: 'binding probe' });
    appendLodeRow(env, 'mines', { id: 'MINES-BIND', ts: '2026-10-03T04:01:00Z' });
    const res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, true, JSON.stringify(res));

    // INDEPENDENT recompute: read the lode files directly, hash the lines
    for (const lode of LODES) {
      const p = path.join(env.lodeDir, `${lode}.jsonl`);
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const receipted = storeLines(env).map((l) => JSON.parse(l)).filter((r) => r.body.kind === 'lode.row' && r.body.lode === lode);
      for (const r of receipted) {
        const expect = createHash('sha256').update(lines[r.body.row_seq - 1], 'utf8').digest('hex');
        assert.equal(r.body.row_sha256, expect, `${lode} row ${r.body.row_seq} digest binds the actual file bytes`);
      }
      // the snapshot sha is the digest of the file AS SEALED — re-derived here
      // by hashing the first `rows` lines each with its newline
      const snaps = storeLines(env).map((l) => JSON.parse(l)).filter((r) => r.body.kind === 'lode.snapshot' && r.body.lode === lode);
      assert.equal(snaps.length, 1);
      const prefixBytes = lines.slice(0, snaps[0].body.rows).map((l) => l + '\n').join('');
      assert.equal(createHash('sha256').update(prefixBytes, 'utf8').digest('hex'), snaps[0].body.sha256, `${lode} snapshot digest covers exactly its ${snaps[0].body.rows} rows`);
    }
  });

  test('rewriting a row-receipt-covered lode row is detected (E_LODE_ROW_REWRITTEN); truncation too (E_LODE_TRUNCATED)', () => {
    const env = makeEnv(test, { registry: 2, lessons: 1, mines: 1 });
    assert.equal(seed(env).ok, true);
    appendLodeRow(env, 'registry', { id: 'REG-REW', ts: '2026-10-03T05:00:00Z' }); // row 3, sealed per-row by produce
    assert.equal(produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath }).ok, true);
    const before = fs.readFileSync(env.storePath, 'utf8');

    // rewrite the ROW-RECEIPT-covered row (row 3) in place (same count, changed bytes)
    const p = path.join(env.lodeDir, 'registry.jsonl');
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const original = lines[2];
    lines[2] = JSON.stringify({ id: 'REG-REW', ts: '2026-10-03T05:00:00Z', note: 'REWRITTEN BEHIND THE CHAIN' });
    fs.writeFileSync(p, lines.filter((l) => l !== '').join('\n') + '\n');

    let res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_LODE_ROW_REWRITTEN');
    assert.equal(res.row_seq, 3, 'the rewritten row is named');
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, 'nothing sealed on top of rewritten history');

    // HONEST RESIDUAL, pinned as documented: a row covered ONLY by the round-71
    // snapshot digest (rows 1-2) is not per-row-verifiable — that is exactly the
    // snapshot scope the README receipts. Per-row receipts close it row by row.
    lines[2] = original;
    lines[1] = JSON.stringify({ id: 'REG-2-REWRITTEN', ts: '2026-10-03T00:00:00Z', note: 'snapshot-covered row rewritten' });
    fs.writeFileSync(p, lines.filter((l) => l !== '').join('\n') + '\n');
    res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, true, 'snapshot-covered rewrites are outside per-row custody (documented residual, see README)');
    assert.equal(res.appended, 0);

    // restore, then truncate below coverage
    fs.writeFileSync(p, lines.filter((l) => l !== '').join('\n') + '\n');
    const okBytes = fs.readFileSync(p, 'utf8');
    fs.writeFileSync(p, '');
    res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_LODE_TRUNCATED');
    fs.writeFileSync(p, okBytes);
  });

  test('snapshot honesty: the seeded snapshot sha is the REAL lode file digest at seed time', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    const receipts = storeLines(env).map((l) => JSON.parse(l));
    for (const lode of LODES) {
      const L = readLode(env.lodeDir, lode);
      const snap = receipts.find((r) => r.body.kind === 'lode.snapshot' && r.body.lode === lode);
      assert.equal(snap.body.rows, L.rows.length);
      assert.equal(snap.body.sha256, createHash('sha256').update(L.raw).digest('hex'));
    }
  });
});

// ── 7. CLI surface ───────────────────────────────────────────────────────────
describe('CLI surface', () => {
  test('--seed then produce via CLI; --check verifies and writes nothing', () => {
    const env = makeEnv(test, { registry: 1, lessons: 1, mines: 1 });
    const s = JSON.parse(run(env, ['--seed', '--json']));
    assert.equal(s.ok, true);
    assert.equal(s.count, 4);
    appendLodeRow(env, 'registry', { id: 'REG-CLI', ts: '2026-10-03T06:00:00Z' });
    const p = JSON.parse(run(env, ['--json']));
    assert.equal(p.ok, true);
    assert.equal(p.appended, 1);
    const before = fs.readFileSync(env.storePath, 'utf8');
    const c = JSON.parse(run(env, ['--check', '--json']));
    assert.equal(c.ok, true);
    assert.equal(c.count, 5);
    assert.equal(fs.readFileSync(env.storePath, 'utf8'), before, '--check wrote nothing');
  });

  test('--check on a tampered store refuses with a named error, non-zero exit', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true);
    const lines = storeLines(env);
    const r = JSON.parse(lines[3]);
    r.body.rows = 999;
    lines[3] = JSON.stringify(r);
    fs.writeFileSync(env.storePath, lines.join('\n') + '\n');
    const { res, code } = runRefused(env, ['--check']);
    assert.notEqual(code, 0);
    assert.match(res, /E_HASH_MISMATCH/);
  });

  test('malformed secret file refuses loudly (E_SECRET_MALFORMED), no overwrite', () => {
    const env = makeEnv(test);
    assert.equal(seed(env).ok, true); // creates the real secret
    fs.writeFileSync(env.secretPath, 'not-a-secret\n');
    const res = produce({ storePath: env.storePath, lodeDir: env.lodeDir, secretPath: env.secretPath });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'E_SECRET_MALFORMED');
    assert.equal(fs.readFileSync(env.secretPath, 'utf8'), 'not-a-secret\n', 'secret never overwritten');
    const chk = readSecret(env.secretPath);
    assert.equal(chk.ok, false);
    assert.equal(chk.error, 'E_SECRET_MALFORMED');
  });
});

// ── 8. standing integration check (read-only, REAL repo store) ───────────────
describe('real fleet store (read-only)', () => {
  const REAL_STORE = path.join(HERE, '..', 'ledger', 'qmr1-store.jsonl');
  const REAL_LODES = path.join(HERE, '..', 'lode');
  test('the committed chain verifies and every sealed row still matches the live lode bytes', { skip: !fs.existsSync(REAL_STORE) }, () => {
    const secret = readSecret(path.join(HERE, '..', '.qmr1-secret'));
    // sigs are only verifiable for secret holders; the LINK law is public —
    // verify ids/links unconditionally, sigs only when the secret is present.
    const v = verifyChain(REAL_STORE);
    assert.equal(v.ok, true, JSON.stringify(v));
    if (secret.ok) {
      const vs = verifyChainSigned(REAL_STORE, secret.secret);
      assert.equal(vs.ok, true, JSON.stringify(vs));
    }
    const receipts = fs.readFileSync(REAL_STORE, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    for (const lode of LODES) {
      const L = readLode(REAL_LODES, lode);
      assert.equal(L.exists, true);
      const snap = receipts.filter((r) => r.body.kind === 'lode.snapshot' && r.body.lode === lode).slice(-1)[0];
      if (snap) assert.ok(L.rows.length >= snap.body.rows, `${lode} can never shrink below its snapshot`);
      const rows = receipts.filter((r) => r.body.kind === 'lode.row' && r.body.lode === lode);
      for (const r of rows) {
        const expect = createHash('sha256').update(L.rows[r.body.row_seq - 1], 'utf8').digest('hex');
        assert.equal(r.body.row_sha256, expect, `${lode} row ${r.body.row_seq} still byte-identical to the live lode`);
      }
    }
  });
});
