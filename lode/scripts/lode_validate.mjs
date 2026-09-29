#!/usr/bin/env node
// lode_validate.mjs — fail-closed validator for the lode ledgers.
// Exit 0 = valid. Exit 2 = any violation (schema, sha, duplicate id, non-monotone ts,
// bad pair reference, append-only prefix violation). Nothing partial: first violation aborts.
//   usage: lode_validate.mjs <kind> <file> [--against <prev-copy>]
//          kind in {mines, registry, scores}
//          --against proves append-only: every line of <prev-copy> must byte-prefix <file>.
//   selftest: lode_validate.mjs --selftest
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function fail(msg) {
  console.error(`LODE-FAIL: ${msg}`);
  process.exit(2);
}

const REQUIRED = {
  mines: ['id', 'ts', 'source', 'claim', 'abstraction', 'prediction', 'pred_sha256', 'lane', 'status'],
  registry: ['set_id', 'repo', 'commit', 'predictions', 'verdict', 'ts'],
  scores: ['ts', 'a', 'b', 'winner', 'reason'],
  lessons: ['id', 'ts', 'cls', 'claim', 'evidence', 'status'],
};

function loadLines(file) {
  let raw;
  try { raw = readFileSync(file, 'utf8'); } catch (e) { fail(`cannot read ${file}: ${e.message}`); }
  const lines = raw.split('\n');
  if (lines[lines.length - 1] === '') lines.pop(); // trailing newline is canonical
  return lines;
}

function validateKind(kind, file, mineIds) {
  const lines = loadLines(file);
  if (lines.length === 0) fail(`${file}: empty ledger`);
  const seen = new Set();
  let prevTs = null;
  lines.forEach((line, i) => {
    let obj;
    try { obj = JSON.parse(line); } catch (e) { fail(`${file}:${i + 1} not valid JSON: ${e.message}`); }
    for (const f of REQUIRED[kind]) {
      if (obj[f] === undefined || obj[f] === null || obj[f] === '') fail(`${file}:${i + 1} missing field ${f}`);
    }
    if (kind === 'mines') {
      if (seen.has(obj.id)) fail(`${file}:${i + 1} duplicate mine id ${obj.id}`);
      seen.add(obj.id);
      if (sha256(obj.prediction) !== obj.pred_sha256) fail(`${file}:${i + 1} pred_sha256 mismatch for ${obj.id} (prediction text does not match its seal)`);
      if (!['open', 'registered', 'superseded', 'folded'].includes(obj.status)) fail(`${file}:${i + 1} bad status ${obj.status}`);
      if (obj.nearest_prior !== undefined && !seen.has(obj.nearest_prior) && obj.nearest_prior !== null) fail(`${file}:${i + 1} nearest_prior ${obj.nearest_prior} not an earlier mine`);
    }
    if (kind === 'registry') {
      if (seen.has(obj.set_id)) fail(`${file}:${i + 1} duplicate set_id ${obj.set_id}`);
      seen.add(obj.set_id);
      if (!Number.isInteger(obj.predictions) || obj.predictions < 1) fail(`${file}:${i + 1} predictions must be a positive integer`);
      if (!['PASS', 'FAIL', 'PARTIAL', 'PENDING', 'VOID', 'ARMED'].includes(obj.verdict)) fail(`${file}:${i + 1} bad verdict ${obj.verdict}`);
    }
    if (kind === 'lessons') {
      if (seen.has(obj.id)) fail(`${file}:${i + 1} duplicate lesson id ${obj.id}`);
      seen.add(obj.id);
    }
    if (kind === 'scores') {
      if (obj.a === obj.b) fail(`${file}:${i + 1} pair must be distinct mines`);
      if (obj.winner !== obj.a && obj.winner !== obj.b) fail(`${file}:${i + 1} winner must be one of the pair`);
      if (mineIds && !mineIds.has(obj.a)) fail(`${file}:${i + 1} unknown mine ${obj.a}`);
      if (mineIds && !mineIds.has(obj.b)) fail(`${file}:${i + 1} unknown mine ${obj.b}`);
    }
    const ts = Date.parse(obj.ts);
    if (Number.isNaN(ts)) fail(`${file}:${i + 1} bad ts ${obj.ts}`);
    if (prevTs !== null && ts < prevTs) fail(`${file}:${i + 1} ts not monotone (${obj.ts} < previous)`);
    prevTs = ts;
  });
  return { lines: lines.length, ids: seen };
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') return selftest();
  const [kind, file] = args;
  if (!REQUIRED[kind]) fail(`unknown kind ${kind}`);
  let mineIds = null;
  if (kind === 'scores') {
    const minesFile = args[args.indexOf('--mines', 2)];
    if (!minesFile) fail('scores validation requires --mines <file>');
    mineIds = validateKind('mines', args[args.indexOf('--mines', 2) + 1]).ids;
  }
  const res = validateKind(kind, file, mineIds);
  const ai = args.indexOf('--against', 2);
  if (ai > 0) {
    const prev = loadLines(args[ai + 1]);
    const cur = loadLines(file);
    for (let i = 0; i < prev.length; i++) {
      if (cur[i] !== prev[i]) fail(`append-only violation at line ${i + 1}: history was rewritten`);
    }
    if (cur.length < prev.length) fail('append-only violation: ledger shrank');
    console.log(`LODE-OK append-only proven: ${prev.length} prior lines are a byte-prefix of ${cur.length}`);
  }
  console.log(`LODE-OK ${kind} ${file}: ${res.lines} entries valid`);
}

function selftest() {
  const dir = join(tmpdir(), 'lode-selftest-' + process.pid);
  let n = 0, ok = 0;
  const t = (name, fn) => { n++; try { fn(); ok++; console.log(`  selftest ${n} PASS ${name}`); } catch (e) { console.log(`  selftest ${n} FAIL ${name}: ${e.message}`); process.exitCode = 2; } };
  const runV = (...a) => spawnSync(process.execPath, [process.argv[1], ...a], { encoding: 'utf8' });
  mkdirSync(dir, { recursive: true });
  const mines = [
    { id: 'M1', ts: '2026-09-29T02:00:00Z', source: 'https://example.com/a', claim: 'c1', abstraction: 'a1', prediction: 'pred-one', pred_sha256: sha256('pred-one'), lane: 'test', status: 'open' },
    { id: 'M2', ts: '2026-09-29T02:01:00Z', source: 'https://example.com/b', claim: 'c2', abstraction: 'a2', prediction: 'pred-two', pred_sha256: sha256('pred-two'), lane: 'test', status: 'open', nearest_prior: 'M1' },
  ];
  const mf = join(dir, 'mines.jsonl');
  writeFileSync(mf, mines.map((m) => JSON.stringify(m)).join('\n') + '\n');
  t('valid mines ledger passes', () => { const r = runV('mines', mf); if (r.status !== 0) throw new Error(r.stderr); });
  t('sha KAT', () => { if (sha256('abc') !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') throw new Error('sha256 kat failed'); });
  t('tampered pred_sha256 exits 2', () => {
    const bad = join(dir, 'bad.jsonl');
    writeFileSync(bad, JSON.stringify({ ...mines[0], pred_sha256: '0'.repeat(64) }) + '\n');
    const r = runV('mines', bad); if (r.status !== 2) throw new Error('expected exit 2');
  });
  t('non-monotone ts exits 2', () => {
    const bad = join(dir, 'badts.jsonl');
    writeFileSync(bad, JSON.stringify(mines[0]) + '\n' + JSON.stringify({ ...mines[1], ts: '2026-09-29T01:00:00Z' }) + '\n');
    const r = runV('mines', bad); if (r.status !== 2) throw new Error('expected exit 2');
  });
  t('unknown nearest_prior exits 2', () => {
    const bad = join(dir, 'badnp.jsonl');
    writeFileSync(bad, JSON.stringify(mines[0]) + '\n' + JSON.stringify({ ...mines[1], nearest_prior: 'M9' }) + '\n');
    const r = runV('mines', bad); if (r.status !== 2) throw new Error('expected exit 2');
  });
  t('append-only prefix proof', () => {
    const grown = join(dir, 'grown.jsonl');
    writeFileSync(grown, mines.map((m) => JSON.stringify(m)).join('\n') + '\n' + JSON.stringify({ ...mines[0], id: 'M3', ts: '2026-09-29T03:00:00Z' }) + '\n');
    const r = runV('mines', grown, '--against', mf); if (r.status !== 0) throw new Error(r.stderr);
  });
  t('rewritten history exits 2 via --against', () => {
    const rew = join(dir, 'rew.jsonl');
    writeFileSync(rew, JSON.stringify({ ...mines[0], claim: 'REWRITTEN' }) + '\n' + JSON.stringify(mines[1]) + '\n');
    const r = runV('mines', rew, '--against', mf); if (r.status !== 2) throw new Error('expected exit 2');
  });
  rmSync(dir, { recursive: true, force: true });
  console.log(`SELFTEST ${ok}/${n} — ${ok === n ? 'green' : 'RED'}`);
  if (ok !== n) process.exit(2);
}

main();
