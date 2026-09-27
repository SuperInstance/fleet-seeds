#!/usr/bin/env node
// test.mjs — KAT + negative controls for the witness grammar (end-to-end via
// the verify.mjs CLI). Per claims.json P1-P3:
//   P1: committed KAT chain verifies (exit 0, ok=true, pinned tip matches)
//   P2: 6 negative controls ALL fail (exit != 0, ok=false):
//       (a) tampered claim byte   (b) wrong parent on middle receipt
//       (c) skipped middle receipt (d) reordered receipts
//       (e) tampered ts byte      (f) forged first receipt (64-hex parent)
//   P3: determinism — same receipt hashed in two processes -> identical id;
//       single-receipt GENESIS chain passes; mutated claim fails.
// Tampered chains are written to os.tmpdir() (never the repo).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { receiptId, canon } from './witness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERIFY = path.join(HERE, 'verify.mjs');
const KAT = path.join(HERE, 'kat', 'chain.jsonl');
const TIP = fs.readFileSync(path.join(HERE, 'kat', 'chain.tip'), 'utf8').trim();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), '44b-witness-'));
let pass = 0, fail = 0;
const failures = [];

function runVerify(file, extraArgs = []) {
  const r = spawnSync(process.execPath, [VERIFY, file, ...extraArgs], { encoding: 'utf8' });
  let verdict = null;
  try { verdict = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { /* non-JSON output */ }
  return { code: r.status, verdict };
}

function expect(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; failures.push(`${name} ${detail}`); console.log(`  FAIL ${name} ${detail}`); }
}

// ── P1: KAT verifies, tip pinned ─────────────────────────────────────────────
console.log('P1: committed KAT chain');
{
  const r = runVerify(KAT, [`--expect-tip=${TIP}`]);
  expect('kat verifies with pinned tip', r.code === 0 && r.verdict?.ok === true, JSON.stringify(r.verdict));
  expect('kat receipt count = 5', r.verdict?.receipts === 5);
  expect('kat tip recomputed == pinned tip', r.verdict?.tip === TIP);
  // independent recomputation of the tip from the file itself (not via verify)
  const lines = fs.readFileSync(KAT, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  expect('independent last-receipt hash == tip', receiptId(lines[lines.length - 1]) === TIP);
}

// ── P2: negatives must ALL fail ──────────────────────────────────────────────
console.log('P2: negative controls (all must FAIL)');
{
  const lines = fs.readFileSync(KAT, 'utf8').trim().split('\n');
  const write = (name, arr) => {
    const p = path.join(tmp, name);
    fs.writeFileSync(p, arr.join('\n') + '\n');
    return p;
  };
  const mustFail = (name, p, extra = []) => {
    const r = runVerify(p, extra);
    expect(name, r.code !== 0 && r.verdict?.ok === false,
      `exit=${r.code} verdict=${JSON.stringify(r.verdict)}`);
  };

  // (a) tampered claim byte in receipt 2
  const a = lines.map((l) => JSON.parse(l));
  a[2].claim = a[2].claim.replace('schedule', 'schedulX');
  mustFail('(a) tampered claim byte', write('a.jsonl', a.map((x) => JSON.stringify(x))));

  // (b) wrong parent on middle receipt (receipt 3 re-anchored to receipt 1)
  const b = lines.map((l) => JSON.parse(l));
  b[3].parent = receiptId(JSON.parse(lines[1]));
  mustFail('(b) wrong parent on middle receipt', write('b.jsonl', b.map((x) => JSON.stringify(x))));

  // (c) skipped middle receipt (delete receipt 2)
  const c = lines.filter((_, i) => i !== 2);
  mustFail('(c) skipped middle receipt', write('c.jsonl', c));

  // (d) reordered receipts (swap 1 and 2)
  const d = [...lines.map((l) => JSON.parse(l))];
  [d[1], d[2]] = [d[2], d[1]];
  mustFail('(d) reordered receipts', write('d.jsonl', d.map((x) => JSON.stringify(x))));

  // (e) tampered ts byte
  const e = lines.map((l) => JSON.parse(l));
  e[1].ts = e[1].ts.replace('T', 't');
  mustFail('(e) tampered ts byte', write('e.jsonl', e.map((x) => JSON.stringify(x))));

  // (f) forged first receipt: 64-hex parent instead of GENESIS
  const f = lines.map((l) => JSON.parse(l));
  f[0].parent = '0'.repeat(64);
  mustFail('(f) forged first receipt (non-GENESIS parent)', write('f.jsonl', f.map((x) => JSON.stringify(x))));

  // extra fail-closed checks
  mustFail('(g) empty chain', write('g.jsonl', []));
  mustFail('(h) corrupt JSON line', write('h.jsonl', [lines[0], '{not json}']));
  mustFail('(i) wrong expected tip', KAT, [`--expect-tip=${'f'.repeat(64)}`]);
  // tampered LAST receipt: chain-internal links pass, only the pin catches it
  const j = lines.map((l) => JSON.parse(l));
  j[4].output_sha256 = 'a'.repeat(64);
  mustFail('(j) tampered last receipt vs pinned tip', write('j.jsonl', j.map((x) => JSON.stringify(x))), [`--expect-tip=${TIP}`]);
}

// ── P3: determinism + single-receipt chains ──────────────────────────────────
console.log('P3: determinism');
{
  const script = `import { canon, receiptId } from ${JSON.stringify(path.join(HERE, 'witness.mjs'))};
const r = { claim: 'determinism probe', inputs_sha256: '${'1'.repeat(64)}', output_sha256: '${'2'.repeat(64)}', parent: 'GENESIS', ts: '2026-09-28T00:00:00.000Z' };
console.log(receiptId(r));`;
  const ids = [0, 1].map(() => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    return r.stdout.trim();
  });
  expect('same receipt -> identical id across two processes', ids[0] === ids[1] && /^[0-9a-f]{64}$/.test(ids[0]), JSON.stringify(ids));

  const one = path.join(tmp, 'one.jsonl');
  fs.writeFileSync(one, `${JSON.stringify({ claim: 'single', inputs_sha256: '1'.repeat(64), output_sha256: '2'.repeat(64), parent: 'GENESIS', ts: '2026-09-28T00:00:00.000Z' })}\n`);
  const r1 = runVerify(one);
  expect('single-receipt GENESIS chain passes', r1.code === 0 && r1.verdict?.ok === true && r1.verdict?.receipts === 1);

  const mut = path.join(tmp, 'mut.jsonl');
  fs.writeFileSync(mut, `${JSON.stringify({ claim: 'single!', inputs_sha256: '1'.repeat(64), output_sha256: '2'.repeat(64), parent: 'GENESIS', ts: '2026-09-28T00:00:00.000Z' })}\n`);
  // note: mutated claim alone still self-verifies unless pinned — pin the ORIGINAL id
  const r2 = runVerify(mut, [`--expect-tip=${ids[0]}`]);
  expect('mutated claim fails against pinned tip', r2.code !== 0 && r2.verdict?.ok === false);
}

console.log(`\n${pass} pass / ${fail} fail`);
console.log(`tmp dir (left for inspection): ${tmp}`);
process.exit(fail === 0 ? 0 : 1);
