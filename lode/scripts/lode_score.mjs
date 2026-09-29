#!/usr/bin/env node
// lode_score.mjs — deterministic Elo over scores.jsonl (pairwise triage of mines).
// K=32, base rating 1000, matches processed strictly in file order. Same input -> same output.
//   usage: lode_score.mjs --mines <mines.jsonl> --scores <scores.jsonl> [--json]
//   selftest: lode_score.mjs --selftest
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(msg) { console.error(`LODE-FAIL: ${msg}`); process.exit(2); }

const K = 32, BASE = 1000;
const elo = (ra, rb, scoreA) => {
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  return [ra + K * (scoreA - ea), rb + K * ((1 - scoreA) - (1 - ea))];
};

function rank(minesFile, scoresFile) {
  const lines = (f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.trim() !== '');
  const ratings = new Map();
  for (const l of lines(minesFile)) {
    const m = JSON.parse(l);
    if (!ratings.has(m.id)) ratings.set(m.id, BASE);
  }
  for (const l of lines(scoresFile)) {
    const s = JSON.parse(l);
    if (!ratings.has(s.a) || !ratings.has(s.b)) fail(`pair references unknown mine: ${s.a} vs ${s.b}`);
    if (s.winner !== s.a && s.winner !== s.b) fail(`bad winner in pair ${s.a}/${s.b}`);
    const [ra, rb] = elo(ratings.get(s.a), ratings.get(s.b), s.winner === s.a ? 1 : 0);
    ratings.set(s.a, ra); ratings.set(s.b, rb);
  }
  return [...ratings.entries()]
    .map(([id, r]) => ({ id, elo: Math.round(r * 10) / 10 }))
    .sort((x, y) => y.elo - x.elo || x.id.localeCompare(y.id));
}

function main() {
  const a = process.argv.slice(2);
  if (a[0] === '--selftest') return selftest();
  const g = (f) => { const i = a.indexOf(f, 0); if (i < 0) fail(`missing ${f}`); return a[i + 1]; };
  const r = rank(g('--mines'), g('--scores'));
  if (a.includes('--json')) { console.log(JSON.stringify(r)); return; }
  for (const { id, elo } of r) console.log(`${id}  ${elo.toFixed(1)}`);
}

function selftest() {
  // Known-answer fixture: A beats B twice; B beats C once.
  // Hand computation from BASE=1000, K=32:
  let [a, b] = elo(BASE, BASE, 1);   // A 1016, B  984
  [a, b] = elo(a, b, 1);             // A 1030.23..., B 969.76...
  let [b2, c] = elo(b, BASE, 1);     // B 987.55..., C 996.44...
  const expA = Math.round(a * 10) / 10, expB = Math.round(b2 * 10) / 10, expC = Math.round(c * 10) / 10;
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = join(here, `.selftest-${process.pid}`);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/m.jsonl`, ['A', 'B', 'C'].map((id) => JSON.stringify({ id, ts: '2026-09-29T02:00:00Z' })).join('\n') + '\n');
    writeFileSync(`${dir}/s.jsonl`, [
      { ts: '2026-09-29T02:01:00Z', a: 'A', b: 'B', winner: 'A', reason: 'x' },
      { ts: '2026-09-29T02:02:00Z', a: 'A', b: 'B', winner: 'A', reason: 'y' },
      { ts: '2026-09-29T02:03:00Z', a: 'B', b: 'C', winner: 'B', reason: 'z' },
    ].map((o) => JSON.stringify(o)).join('\n') + '\n');
    const r = spawnSync(process.execPath, [process.argv[1], '--mines', `${dir}/m.jsonl`, '--scores', `${dir}/s.jsonl`, '--json'], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`scorer exited ${r.status}: ${r.stderr}`);
    const got = JSON.parse(r.stdout);
    const want = [{ id: 'A', elo: expA }, { id: 'C', elo: expC }, { id: 'B', elo: expB }].sort((x, y) => y.elo - x.elo || x.id.localeCompare(y.id));
    const good = want.every((w, i) => got[i].id === w.id && Math.abs(got[i].elo - w.elo) < 1e-6);
    console.log(`SELFTEST ${good ? '1/1' : '0/1'} — determinism KAT ${good ? 'PASS' : `FAIL got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
    if (!good) process.exit(2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
