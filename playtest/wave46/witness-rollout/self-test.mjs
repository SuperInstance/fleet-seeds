#!/usr/bin/env node
// self-test.mjs — lane 46-e negative controls + reproducibility check.
//
// Run AFTER `node rollup.mjs` has produced receipts/rollup-chain.jsonl.
// Controls (claims.json P3 + P4):
//   N1 one tampered byte in the qthe e_q10 chain bytes  -> stone walker ok=false
//   N2 wrong expected tip on good chain bytes           -> stone walker ok=false
//   N3 one tampered byte in a fixture copy              -> fixture manifest fails
//   N4 one tampered byte in the crab-traps 44-a bytes   -> artifact pin check fails
//   N5 one tampered byte inside a wave-46 receipt       -> wave-44 CLI exit != 0
//   N6 tampered LAST wave-46 receipt vs pinned tip      -> CLI exit != 0
//   N7 deleted (skipped) middle receipt                 -> CLI exit != 0
//   N8 reproducibility (P4): an independent rollup run into a tmp dir is
//      byte-identical to the official chain after normalizing ONLY ts fields.
// Tampered copies live in os.tmpdir() — the repo is never modified.
// Exit 0 IFF every negative fails closed AND N8 is byte-identical.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PINS, walkStoneBytes, walkArtifactBytes, walkFixturesBytes } from './walkers.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const WAVE44_VERIFY = path.join(HERE, '..', '..', 'wave44', 'witness-grammar', 'verify.mjs');
const OUT = path.join(HERE, 'receipts');
const CHAIN = path.join(OUT, 'rollup-chain.jsonl');
const TIP = fs.readFileSync(path.join(OUT, 'rollup-chain.tip'), 'utf8').trim();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), '46e-selftest-'));
let pass = 0, fail = 0;
const results = [];
const controls = (id, name, expect, ok, detail) => {
  results.push({ id, name, expect, ok, detail });
  if (ok) { pass++; process.stderr.write(`  ok  ${id} ${name}\n`); }
  else { fail++; process.stderr.write(`  FAIL ${id} ${name} — ${detail}\n`); }
};
const readRepo = (p) => fs.readFileSync(path.join(REPO, p));

if (!fs.existsSync(CHAIN)) {
  process.stderr.write('self-test: receipts/rollup-chain.jsonl missing — run `node rollup.mjs` first\n');
  process.exit(2);
}

// N1: tamper one byte in the saved LIVE qthe e_q10 chain bytes
{
  const saved = path.join(OUT, 'fetched', 'qthe_e_q10', 'e_q10_chain.jsonl');
  const bytes = fs.readFileSync(saved).toString('utf8');
  const tampered = bytes.replace('"stone.header"', '"stone.headem"');
  const w = walkStoneBytes({ id: 'qthe_e_q10', bytes: Buffer.from(tampered, 'utf8'), expectTip: PINS.qtheEq10.expectTip, expectLinks: PINS.qtheEq10.expectLinks });
  controls('N1', 'tampered chain byte -> walker fails', 'fail', w.ok === false, w.why ?? 'walker unexpectedly passed');
}

// N2: wrong expected tip on GOOD chain bytes
{
  const bytes = fs.readFileSync(path.join(OUT, 'fetched', 'qthe_e_q10', 'e_q10_chain.jsonl'));
  const w = walkStoneBytes({ id: 'qthe_e_q10', bytes, expectTip: 'f'.repeat(64), expectLinks: PINS.qtheEq10.expectLinks });
  controls('N2', 'wrong pinned tip -> walker fails', 'fail', w.ok === false, w.why ?? 'walker unexpectedly passed');
}

// N3: tamper one byte in a fixture copy -> manifest check must fail
{
  const f = PINS.fleetFixtures.files[0];
  const bytes = readRepo(f.path).toString('utf8');
  const tampered = bytes.replace('"stone.header"', '"stone.headem"');
  const w = walkFixturesBytes({ id: 'fleetseeds_fixtures', files: [{ path: f.path, bytes: Buffer.from(tampered, 'utf8'), expectSha256: f.expectSha256 }] });
  controls('N3', 'tampered fixture byte -> manifest fails', 'fail', w.ok === false, w.why ?? 'manifest unexpectedly passed');
}

// N4: tamper one byte in the saved crab-traps 44-a artifact
{
  const saved = path.join(OUT, 'fetched', 'crabtraps_44a', 'arena-scenarios-003-gan-results.json');
  const bytes = fs.readFileSync(saved).toString('utf8');
  const tampered = bytes.replace('"pre_registration"', '"pre_registrationX"');
  const preds = fs.readFileSync(path.join(OUT, 'fetched', 'crabtraps_44a', 'arena-scenarios-003-gan-predictions.json'));
  const w = walkArtifactBytes({ id: 'crabtraps_44a', artifactBytes: Buffer.from(tampered, 'utf8'), predictionsBytes: preds, expectArtifactSha256: PINS.crabTraps44a.expectArtifactSha256, expectPredictionsSha256: PINS.crabTraps44a.expectPredictionsSha256 });
  controls('N4', 'tampered artifact byte -> pin check fails', 'fail', w.ok === false, w.why ?? 'artifact walker unexpectedly passed');
}

// CLI helper: verify a (possibly tampered) chain copy with the wave-44 CLI
const runVerify = (file, extra = []) => {
  const r = spawnSync(process.execPath, [WAVE44_VERIFY, file, ...extra], { encoding: 'utf8' });
  let verdict = null;
  try { verdict = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { /* non-JSON */ }
  return { code: r.status, verdict };
};
const writeTampered = (name, mutate) => {
  const lines = fs.readFileSync(CHAIN, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const out = mutate(lines).map((r) => JSON.stringify(r));
  const p = path.join(tmp, name);
  fs.writeFileSync(p, out.join('\n') + '\n');
  return p;
};

// N5: tamper a byte inside receipt 2's claim
{
  const p = writeTampered('n5.jsonl', (ls) => { ls[2].claim = ls[2].claim.replace('verified', 'verifieX'); return ls; });
  const r = runVerify(p, [`--expect-tip=${TIP}`]);
  controls('N5', 'tampered wave-46 receipt -> CLI fails', 'fail', r.code !== 0 && r.verdict?.ok === false, `exit=${r.code} verdict=${JSON.stringify(r.verdict)}`);
}

// N6: tampered LAST receipt — only the pinned tip can catch it
{
  const p = writeTampered('n6.jsonl', (ls) => { ls[ls.length - 1].output_sha256 = 'a'.repeat(64); return ls; });
  const r = runVerify(p, [`--expect-tip=${TIP}`]);
  controls('N6', 'tampered last receipt vs pinned tip -> CLI fails', 'fail', r.code !== 0 && r.verdict?.ok === false, `exit=${r.code} verdict=${JSON.stringify(r.verdict)}`);
}

// N7: skipped middle receipt
{
  const p = writeTampered('n7.jsonl', (ls) => ls.filter((_, i) => i !== 4));
  const r = runVerify(p);
  controls('N7', 'skipped middle receipt -> CLI fails', 'fail', r.code !== 0 && r.verdict?.ok === false, `exit=${r.code} verdict=${JSON.stringify(r.verdict)}`);
}

// N8 (P4): reproducibility — independent LIVE rollup into tmp, normalize ts,
// byte-compare with the official chain.
{
  const reproOut = path.join(tmp, 'repro');
  const rr = spawnSync(process.execPath, [path.join(HERE, 'rollup.mjs'), `--out=${reproOut}`, '--quiet'], { encoding: 'utf8' });
  const reproChain = path.join(reproOut, 'rollup-chain.jsonl');
  if (rr.status !== 0 || !fs.existsSync(reproChain)) {
    controls('N8', 'repro rollup run', 'exit 0 + chain', false, `repro exit=${rr.status} stderr=${(rr.stderr || '').slice(-300)}`);
  } else {
    const norm = (file) => fs.readFileSync(file, 'utf8').trim().split('\n')
      .map((l) => { const r = JSON.parse(l); r.ts = '<TS>'; return JSON.stringify(r); }).join('\n') + '\n';
    const a = norm(CHAIN); const b = norm(reproChain);
    if (a === b) {
      controls('N8', 'repro chain byte-identical modulo ts (P4)', 'identical', true, 'ts-normalized official == ts-normalized repro');
    } else {
      const la = a.split('\n'); const lb = b.split('\n');
      const i = la.findIndex((l, k) => l !== lb[k]);
      controls('N8', 'repro chain byte-identical modulo ts (P4)', 'identical', false, `first differing receipt ${i}: official=${la[i]?.slice(0, 200)} repro=${lb[i]?.slice(0, 200)}`);
    }
  }
}

fs.writeFileSync(path.join(OUT, 'self-test-receipt.json'), JSON.stringify({
  tool: 'fleet-seeds/playtest/wave46/witness-rollout/self-test.mjs',
  lane: '46-e witness-roller',
  ran_at: new Date().toISOString(),
  official_chain_tip: TIP,
  tmp_dir: tmp,
  controls: results,
  pass, fail,
  all_ok: fail === 0,
}, null, 2) + '\n');

process.stderr.write(`\n${pass} pass / ${fail} fail — tmp: ${tmp}\n`);
process.exit(fail === 0 ? 0 : 1);
