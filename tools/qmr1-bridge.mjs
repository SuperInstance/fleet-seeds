#!/usr/bin/env node
// qmr1-bridge.mjs — the fleet-seeds producer for the qmr1 receipt chain
// (erised-fleet-table hardening plan move #1, quest-log insight #3: "a receipt
// chain with no producer is a door nobody knocks on").
//
// WHAT IT DOES
//   One honest writer for the lode ledgers: on every invocation it (a) re-verifies
//   the ENTIRE chain from genesis and refuses to write on any failure (fail-closed,
//   named error), (b) seals the current lode state — one `lode.row` receipt per
//   lode append going forward, `lode.snapshot` receipts for the round-71 backfill —
//   into ledger/qmr1-store.jsonl. Append-only: existing rows are never rewritten,
//   deleted, or reordered; the tool has no verb that could.
//
// THE DIALECT (qmr1, spec-verified from SuperInstance/quilt-mcp-receipts
// DESIGN.md §2 — implemented here from the spec, not by importing the server):
//   store     = one JSONL file, one receipt per line, exactly five fields
//               {seq, prev, body, id, sig} — nothing more, nothing less.
//   canonical = recursive key-sorted, no-whitespace JSON (arrays keep order).
//   id        = sha256("qmr1:" + seq + ":" + prev + ":" + canonicalJSON(body))
//   sig       = HMAC-SHA256(secret, "qmr1:sig:" + id)
//   genesis   = prev of the first receipt is 64 zeros; seq starts at 1.
//   body law  = body must be an object with non-empty string `kind` and `ts`
//               (E_BODY_INVALID otherwise) — so the store stays loadable by the
//               quilt-mcp-receipts organ verbatim.
//   Secret    = gitignored `.qmr1-secret` (64-hex, chmod 600, created on first
//               run, NEVER committed). HMAC residual is receipted honestly:
//               sigs verify only for holders of the secret; the id chain
//               (seq:prev:body linkage) remains publicly re-derivable.
//
// HONEST SCOPE OF THE BACKFILL (round 71)
//   Pre-round-71 lode rows are NOT retroactively sealed per-row. They are covered
//   by one `lode.snapshot` receipt per lode — {rows: N, sha256: <sha256 of the
//   full lode file at seed time>} — a snapshot digest, not per-row custody.
//   Every row appended AFTER the snapshot gets its own `lode.row` receipt whose
//   row_sha256 is re-verified against the live file bytes on every run.
//
// USAGE
//   node tools/qmr1-bridge.mjs --seed      # first run: genesis + 3 snapshots
//   node tools/qmr1-bridge.mjs             # seal any lode appends since last run
//   node tools/qmr1-bridge.mjs --check     # verify only, write nothing
//   flags: --store <p> --secret <p> --lode-dir <p> --round <n> --json
//
// Exit codes: 0 ok · 2 refused (named error) · 1 unexpected failure.

import { createHash, createHmac, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);

export const LODES = ['registry', 'lessons', 'mines'];
export const GENESIS_PREV = '0'.repeat(64);
export const DEFAULT_ROUND = 71; // erised hardening wave — sealed_at_round on every body minted here
export const DEFAULT_STORE = path.join(REPO, 'ledger', 'qmr1-store.jsonl');
export const DEFAULT_SECRET = path.join(REPO, '.qmr1-secret');
export const DEFAULT_LODE_DIR = path.join(REPO, 'lode');

// Chain-level named errors — the qmr1 fail-closed set (DESIGN.md §3), re-declared
// from the spec so this producer stands alone.
// Bridge-level named errors (conditions outside the chain itself):
//   E_SECRET_MALFORMED  .qmr1-secret exists but is not 64-hex
//   E_STORE_NOT_SEEDED  produce/check on a missing or empty store (run --seed)
//   E_ALREADY_SEEDED    --seed on a non-empty store (seeding is a one-time verb)
//   E_COVERAGE_INVALID  row receipts for a lode are not a contiguous 1..k run
//                       above that lode's snapshot row count (producer contract)
//   E_LODE_TRUNCATED    lode has fewer rows than the chain already covers
//   E_LODE_ROW_REWRITTEN a row covered by a lode.row receipt no longer matches
//                        its sealed row_sha256 (append-only violated upstream)
//   E_APPEND_VERIFY_FAILED post-write re-verify failed (data is append-only and
//                        stays; the failure is named loudly, never papered over)

// ------------------------------------------------------------------ qmr1 core
export function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
}

export function qmr1Id(seq, prev, body) {
  return createHash('sha256').update(`qmr1:${seq}:${prev}:${canonicalJSON(body)}`).digest('hex');
}

export function qmr1Sig(secret, id) {
  return createHmac('sha256', secret).update(`qmr1:sig:${id}`).digest('hex');
}

const REQUIRED_FIELDS = ['seq', 'prev', 'body', 'id', 'sig'];
const isHex64 = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);

// ------------------------------------------------------------------- store IO
export function loadStore(storePath) {
  if (!fs.existsSync(storePath)) return { receipts: [], corrupted_lines: [] };
  const text = fs.readFileSync(storePath, 'utf8');
  const receipts = [];
  const corrupted_lines = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      receipts.push(JSON.parse(line));
    } catch {
      corrupted_lines.push(i + 1);
    }
  });
  return { receipts, corrupted_lines };
}

export function storeBytes(storePath) {
  return fs.existsSync(storePath) ? fs.readFileSync(storePath) : null;
}

// ----------------------------------------------------------------- verify law
// Re-derives the full chain from genesis, in the spec's order, fail-closed on
// the first broken row. Never writes.
export function verifyChain(storePath) {
  const { receipts, corrupted_lines } = loadStore(storePath);
  if (corrupted_lines.length > 0) {
    return {
      ok: false, error: 'E_STORE_CORRUPT',
      detail: `store contains non-JSON lines: ${corrupted_lines.join(',')}`,
      corrupted_lines, count_checked: receipts.length, tip: null,
    };
  }
  let prev = GENESIS_PREV;
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const at_seq = i + 1;
    const fail = (error, detail) => ({ ok: false, error, at_seq, detail, count_checked: i, tip: null });
    if (r === null || typeof r !== 'object' || Array.isArray(r)) return fail('E_BODY_INVALID', 'row is not an object');
    for (const f of REQUIRED_FIELDS) if (!(f in r)) return fail('E_MISSING_FIELD', `missing field "${f}"`);
    for (const k of Object.keys(r)) if (!REQUIRED_FIELDS.includes(k)) return fail('E_UNKNOWN_FIELD', `unknown field "${k}"`);
    if (!Number.isInteger(r.seq) || r.seq < 1) return fail('E_SEQ_MISMATCH', `seq ${JSON.stringify(r.seq)} is not a positive integer`);
    if (!isHex64(r.prev) && r.prev !== GENESIS_PREV) return fail('E_PREV_MISMATCH', 'prev is not 64-hex (or genesis)');
    if (!isHex64(r.id)) return fail('E_HASH_MISMATCH', 'id is not 64-hex');
    if (!isHex64(r.sig)) return fail('E_BAD_SIGNATURE', 'sig is not 64-hex');
    if (!r.body || typeof r.body !== 'object' || Array.isArray(r.body)) return fail('E_BODY_INVALID', 'body must be a JSON object');
    if (typeof r.body.kind !== 'string' || r.body.kind.length === 0) return fail('E_BODY_INVALID', 'body.kind must be a non-empty string');
    if (typeof r.body.ts !== 'string' || r.body.ts.length === 0) return fail('E_BODY_INVALID', 'body.ts must be a non-empty string');
    if (r.seq !== at_seq) return fail('E_SEQ_MISMATCH', `row ${i + 1} claims seq ${r.seq}`);
    if (r.prev !== prev) return fail('E_PREV_MISMATCH', `row ${r.seq} links to ${String(r.prev).slice(0, 12)}…, expected ${prev.slice(0, 12)}…`);
    const recomputedId = qmr1Id(r.seq, r.prev, r.body);
    if (r.id !== recomputedId) return fail('E_HASH_MISMATCH', `recomputed id ${recomputedId.slice(0, 12)}… ≠ stored ${String(r.id).slice(0, 12)}…`);
    prev = r.id;
  }
  return { ok: true, count: receipts.length, tip: receipts.length ? prev : null, receipts };
}

// Full verify INCLUDING the HMAC layer. The bridge never writes on the word of
// a link-only check: a flipped body with a recomputed id would pass a link-only
// verify, so the sig over the id is re-derived on every run.
export function verifyChainSigned(storePath, secret) {
  const v = verifyChain(storePath);
  if (!v.ok) return v;
  const { receipts } = loadStore(storePath);
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const expect = qmr1Sig(secret, r.id);
    if (r.sig !== expect) {
      return { ok: false, error: 'E_BAD_SIGNATURE', at_seq: i + 1, detail: `HMAC mismatch over id ${r.id.slice(0, 12)}… (wrong secret or forged row)`, count_checked: i, tip: null };
    }
  }
  return v;
}

// ------------------------------------------------------------ append law
// Validate the full existing chain first (fail-closed), then the candidate in
// spec order (structure → body → seq → prev → id → sig), then append ONE line.
// Any refusal leaves the store byte-identical.
export function appendReceipt(storePath, receipt, { secret } = {}) {
  if (secret === undefined) throw new Error('appendReceipt requires { secret }');
  const before = storeBytes(storePath);
  const { receipts, corrupted_lines } = loadStore(storePath);
  if (corrupted_lines.length > 0) {
    return { ok: false, error: 'E_STORE_CORRUPT', detail: `store contains non-JSON lines: ${corrupted_lines.join(',')}`, at_seq: corrupted_lines[0] };
  }
  if (receipts.length === 0) {
    return { ok: false, error: 'E_STORE_NOT_SEEDED', detail: 'store is missing or empty — run --seed first' };
  }
  // 1. the chain as it stands must fully verify (structure + links + ids + sigs)
  const v = verifyChainSigned(storePath, secret);
  if (!v.ok) return { ok: false, error: v.error, at_seq: v.at_seq, detail: `existing chain failed verification: ${v.detail}` };
  // 2. the candidate
  const bad = (error, detail) => ({ ok: false, error, detail });
  if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt)) return bad('E_BODY_INVALID', 'receipt is not an object');
  for (const f of REQUIRED_FIELDS) if (!(f in receipt)) return bad('E_MISSING_FIELD', `missing field "${f}"`);
  for (const k of Object.keys(receipt)) if (!REQUIRED_FIELDS.includes(k)) return bad('E_UNKNOWN_FIELD', `unknown field "${k}"`);
  if (!receipt.body || typeof receipt.body !== 'object' || Array.isArray(receipt.body)) return bad('E_BODY_INVALID', 'body must be a JSON object');
  if (typeof receipt.body.kind !== 'string' || receipt.body.kind.length === 0) return bad('E_BODY_INVALID', 'body.kind must be a non-empty string');
  if (typeof receipt.body.ts !== 'string' || receipt.body.ts.length === 0) return bad('E_BODY_INVALID', 'body.ts must be a non-empty string');
  if (!Number.isInteger(receipt.seq) || receipt.seq < 1) return bad('E_SEQ_MISMATCH', `seq ${JSON.stringify(receipt.seq)} is not a positive integer`);
  const tip = receipts[receipts.length - 1];
  if (receipt.seq !== tip.seq + 1) return bad('E_SEQ_MISMATCH', `seq ${receipt.seq} ≠ tip+1 (${tip.seq + 1}) — replay or fork refused`);
  if (receipt.prev !== tip.id) return bad('E_PREV_MISMATCH', `prev ${String(receipt.prev).slice(0, 12)}… ≠ tip id ${tip.id.slice(0, 12)}…`);
  const recomputedId = qmr1Id(receipt.seq, receipt.prev, receipt.body);
  if (receipt.id !== recomputedId) return bad('E_HASH_MISMATCH', `recomputed id ${recomputedId.slice(0, 12)}… ≠ submitted ${String(receipt.id).slice(0, 12)}…`);
  if (!isHex64(receipt.sig)) return bad('E_BAD_SIGNATURE', 'sig is not 64-hex');
  if (receipt.sig !== qmr1Sig(secret, receipt.id)) return bad('E_BAD_SIGNATURE', `HMAC mismatch over id ${receipt.id.slice(0, 12)}…`);
  // 3. write exactly one line, then prove the store still verifies
  fs.appendFileSync(storePath, JSON.stringify(receipt) + '\n');
  const after = verifyChainSigned(storePath, secret);
  if (!after.ok) {
    return { ok: false, error: 'E_APPEND_VERIFY_FAILED', at_seq: after.at_seq, detail: `store failed verification after append: ${after.detail} (append-only: the line is NOT rolled back — fix forward, never rewrite)` };
  }
  return { ok: true, seq: receipt.seq, id: receipt.id, tip: after.tip, count: after.count };
}

// ---------------------------------------------------------------- lode state
// A row's bytes = its line content in the file WITHOUT the trailing newline;
// a lode file's bytes = the whole file as it sits on disk.
export function readLode(lodeDir, lode) {
  const p = path.join(lodeDir, `${lode}.jsonl`);
  if (!fs.existsSync(p)) return { exists: false, path: p, rows: [], raw: null, fileSha256: null };
  const raw = fs.readFileSync(p);
  const text = raw.toString('utf8');
  const lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop(); // trailing newline is not a row
  return { exists: true, path: p, rows: lines, raw, fileSha256: createHash('sha256').update(raw).digest('hex') };
}

export const rowSha256 = (rowLine) => createHash('sha256').update(rowLine, 'utf8').digest('hex');

// Coverage model per lode from the chain: the last `lode.snapshot` for that
// lode fixes the snapshot row count; every `lode.row` receipt must carry a
// row_seq forming the contiguous run snapshotRows+1 .. snapshotRows+k.
// Returns {ok:false, error, detail} or {ok:true, covered} (rows covered per lode).
export function coverageFrom(storePath) {
  const { receipts } = loadStore(storePath);
  const cov = {};
  for (const lode of LODES) cov[lode] = { snapshotRows: null, rowSeqs: [], snapshotSha: null, snapshotSeq: null };
  for (const r of receipts) {
    const b = r && r.body;
    if (!b) continue;
    if (b.kind === 'lode.snapshot' && LODES.includes(b.lode)) {
      cov[b.lode].snapshotRows = b.rows;
      cov[b.lode].snapshotSha = b.sha256;
      cov[b.lode].snapshotSeq = r.seq;
    } else if (b.kind === 'lode.row' && LODES.includes(b.lode)) {
      cov[b.lode].rowSeqs.push({ rowSeq: b.row_seq, rowSha: b.row_sha256, receiptSeq: r.seq });
    }
  }
  for (const lode of LODES) {
    const c = cov[lode];
    if (c.rowSeqs.length === 0) { c.covered = c.snapshotRows ?? 0; continue; }
    c.rowSeqs.sort((a, b) => a.rowSeq - b.rowSeq);
    const base = c.snapshotRows ?? 0;
    for (let i = 0; i < c.rowSeqs.length; i++) {
      if (c.rowSeqs[i].rowSeq !== base + 1 + i) {
        return { ok: false, error: 'E_COVERAGE_INVALID', lode, detail: `lode.row receipts for "${lode}" are not the contiguous run ${base + 1}..${base + c.rowSeqs.length} (got row_seq ${c.rowSeqs[i].rowSeq} at position ${i + 1})` };
      }
    }
    c.covered = base + c.rowSeqs.length;
  }
  return { ok: true, coverage: cov };
}

// ------------------------------------------------------------------- secret
// readSecret: read-only — --check must never create key material as a side effect.
export function readSecret(secretPath) {
  if (!fs.existsSync(secretPath)) return { ok: false, error: 'E_SECRET_MISSING', detail: `${secretPath} does not exist — sigs cannot be verified without it (run --seed or produce once to create it)` };
  const s = fs.readFileSync(secretPath, 'utf8').trim();
  if (!/^[0-9a-f]{64}$/.test(s)) return { ok: false, error: 'E_SECRET_MALFORMED', detail: `${secretPath} is not 64-hex — refusing (never overwrite an existing secret)` };
  return { ok: true, secret: s };
}

export function ensureSecret(secretPath) {
  if (fs.existsSync(secretPath)) {
    const s = fs.readFileSync(secretPath, 'utf8').trim();
    if (!/^[0-9a-f]{64}$/.test(s)) {
      return { ok: false, error: 'E_SECRET_MALFORMED', detail: `${secretPath} exists but is not 64-hex — refusing (never overwrite an existing secret)` };
    }
    return { ok: true, secret: s, created: false };
  }
  const s = randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, s + '\n', { mode: 0o600 });
  fs.chmodSync(secretPath, 0o600);
  return { ok: true, secret: s, created: true };
}

// --------------------------------------------------------------------- verbs
export function seedChain({ storePath, lodeDir, secretPath, round = DEFAULT_ROUND, ts } = {}) {
  const fail = (error, detail) => ({ ok: false, error, detail });
  const existing = loadStore(storePath);
  if (existing.receipts.length > 0 || existing.corrupted_lines.length > 0) {
    return fail('E_ALREADY_SEEDED', `store already holds ${existing.receipts.length} receipt(s) — seeding is a one-time verb (never rewrite existing rows)`);
  }
  const snapshots = [];
  const state = {};
  for (const lode of LODES) {
    const L = readLode(lodeDir, lode);
    if (!L.exists) return fail('E_LODE_MISSING', `lode file not found: ${L.path}`);
    state[lode] = L;
    snapshots.push({ lode, rows: L.rows.length, sha256: L.fileSha256 });
  }
  const secretRes = ensureSecret(secretPath);
  if (!secretRes.ok) return secretRes;
  const { secret } = secretRes;

  let seq = 0;
  let prev = GENESIS_PREV;
  const mint = (body) => {
    seq += 1;
    const receipt = {
      seq, prev, body,
      id: qmr1Id(seq, prev, body),
      sig: '',
    };
    receipt.sig = qmr1Sig(secret, receipt.id);
    fs.appendFileSync(storePath, JSON.stringify(receipt) + '\n');
    prev = receipt.id;
    return receipt;
  };
  const at = ts ?? new Date().toISOString();
  mint({
    kind: 'lode.chain.genesis', ts: at, dialect: 'qmr1', lodes: [...LODES],
    sealed_at_round: round,
    note: 'fleet-seeds producer genesis — erised hardening move #1: the lode ledgers now have an honest qmr1 writer',
  });
  const minted = [];
  for (const s of snapshots) {
    minted.push(mint({
      kind: 'lode.snapshot', ts: at, lode: s.lode, rows: s.rows, sha256: s.sha256,
      sealed_at_round: round,
      note: 'backfill is a SNAPSHOT digest of the file as sealed — pre-snapshot rows are covered by this digest, not by per-row receipts (honest scope, see README)',
    }));
  }
  const v = verifyChainSigned(storePath, secret);
  if (!v.ok) return { ok: false, error: 'E_APPEND_VERIFY_FAILED', at_seq: v.at_seq, detail: `store failed verification after seed: ${v.detail}` };
  return { ok: true, seeded: true, count: seq, tip: prev, snapshots: minted.map((r) => ({ seq: r.seq, lode: r.body.lode, rows: r.body.rows, id: r.id })), secret_created: secretRes.created };
}

// produce: seal every lode row appended since the last seal. Verifies from
// genesis FIRST and refuses to write on any failure. Never rewrites rows.
export function produce({ storePath, lodeDir, secretPath, round = DEFAULT_ROUND, ts } = {}) {
  const fail = (error, detail, extra = {}) => ({ ok: false, error, detail, ...extra });
  if (!fs.existsSync(storePath) || loadStore(storePath).receipts.length === 0) {
    return fail('E_STORE_NOT_SEEDED', 'store is missing or empty — run `node tools/qmr1-bridge.mjs --seed` first');
  }
  const secretRes = ensureSecret(secretPath);
  if (!secretRes.ok) return secretRes;
  const { secret } = secretRes;

  // 1. the whole chain, from genesis, ids AND sigs — refuse before any write
  const v = verifyChainSigned(storePath, secret);
  if (!v.ok) return fail(v.error, `chain verification failed — refusing to write: ${v.detail}`, { at_seq: v.at_seq });

  // 2. coverage contract
  const cov = coverageFrom(storePath);
  if (!cov.ok) return fail(cov.error, cov.detail, { lode: cov.lode });

  // 3. per-lode checks against the live files, then mint what is new
  const at = ts ?? new Date().toISOString();
  const appended = [];
  const perLode = {};
  for (const lode of LODES) {
    const L = readLode(lodeDir, lode);
    if (!L.exists) return fail('E_LODE_MISSING', `lode file not found: ${L.path}`);
    const c = cov.coverage[lode];
    if (L.rows.length < c.covered) {
      return fail('E_LODE_TRUNCATED', `lode "${lode}" has ${L.rows.length} rows but the chain covers ${c.covered} — rows were removed upstream (append-only violated)`, { lode });
    }
    // every row covered by a lode.row receipt must still be byte-identical
    for (const rr of c.rowSeqs) {
      const idx = rr.rowSeq - 1;
      if (rowSha256(L.rows[idx]) !== rr.rowSha) {
        return fail('E_LODE_ROW_REWRITTEN', `lode "${lode}" row ${rr.rowSeq} no longer matches its sealed row_sha256 (sealed at receipt seq ${rr.receiptSeq}) — the lode was rewritten; refusing to seal on top of rewritten history`, { lode, row_seq: rr.rowSeq });
      }
    }
    perLode[lode] = { covered: c.covered, current: L.rows.length, appended: 0 };
    for (let rowSeq = c.covered + 1; rowSeq <= L.rows.length; rowSeq++) {
      const idx = rowSeq - 1;
      const body = {
        kind: 'lode.row', ts: at, lode,
        row_seq: rowSeq,
        row_sha256: rowSha256(L.rows[idx]),
        sealed_at_round: round,
      };
      const tip = loadStore(storePath).receipts.slice(-1)[0];
      const receipt = { seq: tip.seq + 1, prev: tip.id, body, id: '', sig: '' };
      receipt.id = qmr1Id(receipt.seq, receipt.prev, receipt.body);
      receipt.sig = qmr1Sig(secret, receipt.id);
      const res = appendReceipt(storePath, receipt, { secret });
      if (!res.ok) return fail(res.error, res.detail, { lode, row_seq: rowSeq, at_seq: res.at_seq });
      appended.push({ seq: res.seq, lode, row_seq: rowSeq, id: res.id });
      perLode[lode].appended += 1;
      perLode[lode].covered = rowSeq;
    }
  }
  const v2 = verifyChainSigned(storePath, secret);
  if (!v2.ok) return fail('E_APPEND_VERIFY_FAILED', `store failed verification after produce: ${v2.detail}`, { at_seq: v2.at_seq });
  return { ok: true, appended: appended.length, receipts: appended, per_lode: perLode, count: v2.count, tip: v2.tip, verified: true, secret_created: secretRes.created };
}

// ----------------------------------------------------------------------- CLI
function main() {
  const argv = process.argv.slice(2);
  const argValue = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  const storePath = path.resolve(argValue('--store') || DEFAULT_STORE);
  const secretPath = path.resolve(argValue('--secret') || DEFAULT_SECRET);
  const lodeDir = path.resolve(argValue('--lode-dir') || DEFAULT_LODE_DIR);
  const round = Number(argValue('--round') || DEFAULT_ROUND);
  const asJson = argv.includes('--json');

  const report = (res, label) => {
    const { secret, ...safe } = res; // never print secret material
    if (asJson) {
      process.stdout.write(JSON.stringify(safe, null, 2) + '\n');
    } else if (res.ok) {
      const tip = safe.tip ? String(safe.tip).slice(0, 16) : '-';
      if (label === 'CHECKED') {
        process.stdout.write(`[qmr1-bridge] CHECKED count=${safe.count} tip=${tip}… verified=true (wrote nothing)\n`);
      } else {
        process.stdout.write(`[qmr1-bridge] ${label} appended=${safe.appended ?? 0} count=${safe.count} tip=${tip}… verified=true\n`);
      }
    } else {
      process.stderr.write(`[qmr1-bridge] REFUSED ${res.error}${res.at_seq ? ` at_seq=${res.at_seq}` : ''}: ${res.detail}\n`);
    }
  };

  let res;
  let label = 'PRODUCED';
  if (argv.includes('--seed')) {
    label = 'SEEDED';
    res = seedChain({ storePath, lodeDir, secretPath, round });
  } else if (argv.includes('--check')) {
    label = 'CHECKED';
    const secretRes = readSecret(secretPath);
    if (!secretRes.ok) { report(secretRes, label); process.exit(2); }
    res = verifyChainSigned(storePath, secretRes.secret);
    if (res.ok && res.count === 0) res = { ok: false, error: 'E_STORE_NOT_SEEDED', detail: 'store is missing or empty — run --seed first' };
  } else {
    res = produce({ storePath, lodeDir, secretPath, round });
  }
  report(res, label);
  process.exit(res.ok ? 0 : 2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
