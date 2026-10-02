// m13-harness.test.mjs — wave 68-f — node --test battery for the M13
// falsification harness. Runs instrument CALIBRATION pre-seal: the harness
// must already discriminate (positive control diverges, sealed procedures
// re-seal identical, tamper refuses by name) BEFORE the scored run — a
// scored-run divergence is only a finding if calibration agreed (see the
// claims' refusal branches in seeds/m13-harness-68f.json).
//
// Repo-safety: the tamper tests operate on TEMP COPIES (seal/verify only hash
// bytes) and the full run uses the real instrument with outputs to a temp
// dir. No repo file is ever modified.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { canonicalJSON } from './preregister.mjs';
import * as procsMod from './m13-procs.mjs';
import { fnv1a32, lcgNext, batteryEval, qrngPick, PROC_META, PROC_IDS, emitLine } from './m13-procs.mjs';
import {
  TOOL, M13Error, sealDoc, loadHarnessSeal, verifySeal, execInProcess,
  execNodeChild, execPython, cleanEnv, tamperBattery, resealProcedure,
  runMatrix, main,
} from './m13-harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROCS = join(HERE, 'm13-procs.mjs');
const PREFIX = join(HERE, 'fixtures', 'm13-prefix.json');
const NUDGE = join(HERE, 'fixtures', 'm13-prefix-nudge.json');
const PY = join(HERE, 'm13-procs.py');

const python3Available = spawnSync('python3', ['--version'], { timeout: 5000 }).status === 0;
const prefix = JSON.parse(readFileSync(PREFIX, 'utf8'));
const nudgePrefix = JSON.parse(readFileSync(NUDGE, 'utf8'));

const tmp = () => mkdtempSync(join(tmpdir(), 'm13-test-'));
const files = { procsPath: PROCS, prefixPath: PREFIX, pyPath: PY };

// ── 1. portable-arithmetic KATs (independent BigInt reference) ─────────────
test('fnv1a32 KAT: published FNV-1a-32 vectors', () => {
  assert.equal(fnv1a32(''), 0x811c9dc5);
  assert.equal(fnv1a32('a'), 0xe40c292c);
  // independent BigInt reference over a longer string
  const ref = (s) => {
    let h = 0x811c9dc5n;
    for (const b of Buffer.from(s, 'ascii')) {
      h = (h ^ BigInt(b)) & 0xFFFFFFFFn;
      h = (h * 0x01000193n) & 0xFFFFFFFFn;
    }
    return Number(h);
  };
  for (const s of ['', 'a', 'abc', 'm13-reseal', '87,78,69,0,43,38,41,40']) {
    assert.equal(fnv1a32(s), ref(s), `fnv1a32('${s}')`);
  }
});

test('lcg uint32 KAT: Math.imul chain == BigInt reference incl. wraparound', () => {
  const ref = (x) => Number(((1664525n * BigInt(x >>> 0)) + 1013904223n) & 0xFFFFFFFFn);
  for (const x of [0, 1, 305419896, 0xFFFFFFFF, 0x7FFFFFFF, 4000000000]) {
    assert.equal(lcgNext(x >>> 0), ref(x));
  }
  let a = 305419896, b = 305419896;
  for (let i = 0; i < 1000; i++) { a = lcgNext(a); b = ref(b); assert.equal(a, b); }
});

// ── 2. in-process determinism + emit shape ─────────────────────────────────
test('battery-eval is deterministic in-process (A == A2) and integer-only', () => {
  const e1 = batteryEval(prefix);
  const e2 = batteryEval(prefix);
  assert.equal(emitLine(e1), emitLine(e2));
  assert.equal(e1.id, 'battery-eval');
  assert.equal(e1.class, 'sealed');
  for (const v of [e1.score, e1.finalX, e1.acc, ...e1.trace]) {
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 0xFFFFFFFF, `uint32: ${v}`);
  }
  assert.ok(e1.verdict === 'accept' || e1.verdict === 'reject');
});

test('qrng-pick: entropy drawn ONLY from the sealed seed (run-8 shape)', () => {
  const q = qrngPick(prefix);
  assert.equal(q.class, 'sealed');
  assert.equal(q.draws.length, 8);
  assert.equal(q.scores.length, 3);
  assert.equal(typeof q.priorsPick, 'number');
  assert.equal(q.override, q.pick !== q.priorsPick);
  assert.equal(q.verdict, q.override ? 'override' : 'uphold');
});

// ── 3. executor-A vs executor-B (clean-env node child) ─────────────────────
test('A==B byte-identical for both sealed procedures (same node, clean env)', () => {
  for (const id of ['battery-eval', 'qrng-pick']) {
    const a = execInProcess(procsMod, id, prefix);
    const b = execNodeChild({ procsPath: PROCS, prefixPath: PREFIX, procId: id, tag: 'B' });
    assert.ok(a.bytes.equals(b.bytes), `${id}: A bytes != B bytes`);
  }
});

// ── 4. executor-C python port byte-identity ────────────────────────────────
test('A==C byte-identical for portable procedures (python3 re-implementation)', { skip: python3Available ? false : 'python3 absent' }, () => {
  for (const id of ['battery-eval', 'qrng-pick']) {
    const a = execInProcess(procsMod, id, prefix);
    const c = execPython({ pyPath: PY, procId: id, prefix, tag: 'C' });
    assert.ok(a.bytes.equals(c.bytes), `${id}: node bytes != python bytes\n  node:   ${a.bytes.toString()}\n  python: ${c.bytes.toString()}`);
  }
});

test('python canonical dialect == node canonicalJSON on the shared fixture (67-a gotcha)', { skip: python3Available ? false : 'python3 absent' }, () => {
  const doc = { b: [1, true, null, 'x"y'], a: 2, z: { k: false } };
  const expect = {
    "fnv1a32('')": fnv1a32(''),
    "fnv1a32('a')": fnv1a32('a'),
    'lcg(1)': lcgNext(1),
    'canon(doc)': canonicalJSON(doc),
  };
  const r = spawnSync('python3', [PY, '--selftest'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(r.stdout);
  assert.equal(got["fnv1a32('')"], expect["fnv1a32('')"]);
  assert.equal(got["fnv1a32('a')"], expect["fnv1a32('a')"]);
  assert.equal(got['lcg(1)'], expect['lcg(1)']);
  assert.equal(got['canon(doc)'], expect['canon(doc)']);
});

// ── 5. positive control: the harness MUST flag unsealed entropy ────────────
test('positive control (wallclock-leak) is flagged DIVERGENT / NONDETERMINISTIC', async () => {
  const rec = await resealProcedure(procsMod, PROC_META['wallclock-leak'], 'wallclock-leak', files, prefix, python3Available);
  assert.equal(rec.reseal, 'DIVERGENT');
  assert.equal(rec.classification, 'NONDETERMINISTIC_SAME_EXECUTOR');
  assert.equal(rec.executors.A.selfStable, false);
  assert.equal(rec.pairs['A==B'], false);
  assert.equal(rec.pairs['A==C'], false);
});

// ── 6. negative control: sealed procedures re-seal IDENTICAL ───────────────
test('sealed procedures re-seal IDENTICAL across A/B/C with agreeing verdicts', { skip: python3Available ? false : 'python3 absent' }, async () => {
  for (const id of ['battery-eval', 'qrng-pick']) {
    const rec = await resealProcedure(procsMod, PROC_META[id], id, files, prefix, python3Available);
    assert.equal(rec.reseal, 'IDENTICAL', `${id}: ${JSON.stringify(rec)}`);
    assert.equal(rec.verdictsAgree, true);
    assert.ok(rec.pairs['A==B'] && rec.pairs['A==C'] && rec.pairs['B==C']);
  }
});

// ── 7. tamper battery: fail-closed, named refusals, discriminating control ─
test('tamper battery: control ok, every tampered member refuses BY NAME', () => {
  const t = tamperBattery(files, procsMod);
  assert.equal(t.control, 'ok');
  assert.equal(t.procsTamper, 'E_PROCEDURE_MODIFIED');
  assert.equal(t.prefixTamper, 'E_PREFIX_MODIFIED');
  assert.equal(t.pyTamper, 'E_PYPORT_MODIFIED');
  assert.equal(t.allRefusalsNamed, 1);
});

// ── 8. CLI end-to-end: seal → verify → tamper-refuse → scored run ──────────
test('CLI: seal + verify the real instrument', () => {
  const d = tmp();
  try {
    const out = join(d, 'instrument-seal.json');
    const code = main(['seal', `--procs=${PROCS}`, `--prefix=${PREFIX}`, `--py=${PY}`, `--out=${out}`, '--note=test']);
    assert.equal(code, 0);
    const seal = loadHarnessSeal(out);
    assert.equal(seal.tool, TOOL);
    assert.equal(main(['verify', `--procs=${PROCS}`, `--prefix=${PREFIX}`, `--py=${PY}`, `--seal=${out}`]), 0);
    assert.equal(main(['nope']), 2);
    assert.equal(main([]), 2);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('CLI: verify refuses a tampered instrument COPY by name (repo untouched)', () => {
  const d = tmp();
  try {
    writeFileSync(join(d, 'p.mjs'), readFileSync(PROCS));
    writeFileSync(join(d, 'x.json'), readFileSync(PREFIX));
    writeFileSync(join(d, 'y.py'), readFileSync(PY));
    const out = join(d, 'seal.json');
    assert.equal(main(['seal', `--procs=${join(d, 'p.mjs')}`, `--prefix=${join(d, 'x.json')}`, `--py=${join(d, 'y.py')}`, `--out=${out}`]), 0);
    writeFileSync(join(d, 'p.mjs'), readFileSync(join(d, 'p.mjs')) + Buffer.from('\n// tampered\n'));
    assert.throws(
      () => main(['verify', `--procs=${join(d, 'p.mjs')}`, `--prefix=${join(d, 'x.json')}`, `--py=${join(d, 'y.py')}`, `--seal=${out}`]),
      (e) => e instanceof M13Error && e.errName === 'E_PROCEDURE_MODIFIED',
    );
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('runMatrix: scored shape — sealed identical, control divergent, nudge flips, tamper named', { skip: python3Available ? false : 'python3 absent' }, async () => {
  const d = tmp();
  try {
    // seal the real instrument, then run the full matrix with the nudge probe
    const sealPath = join(d, 'instrument-seal.json');
    assert.equal(main(['seal', `--procs=${PROCS}`, `--prefix=${PREFIX}`, `--py=${PY}`, `--out=${sealPath}`]), 0);
    const results = await runMatrix({
      procsPath: PROCS, prefixPath: PREFIX, pyPath: PY, sealPath, nudgePrefixPath: NUDGE,
    });
    assert.equal(results.tool, TOOL);
    assert.equal(results.metrics.abByteIdenticalSealedProcedures, 2);
    assert.equal(results.metrics.abcByteIdenticalSealedProcedures, 2);
    assert.equal(results.metrics.sealedVerdictsAgree, 2);
    assert.equal(results.metrics.qrngSealedResealIdentical, 1);
    assert.equal(results.metrics.positiveControlDivergent, 1);
    assert.equal(results.metrics.sealedClassExecutorScoping, 0);
    assert.equal(results.metrics.unsealedClassExecutorScoping, 1);
    assert.equal(results.metrics.prefixNudgeFlipsVerdict, 1);
    assert.equal(results.metrics.nudgeExecutorAgreement, 1);
    assert.equal(results.metrics.tamperRefusalNamed, 1);
    assert.equal(results.nudge.baseVerdict, 'reject');
    assert.equal(results.nudge.nudgedVerdict, 'accept');
    assert.equal(results.procedures['qrng-pick'].executors.A.verdict, 'override');
    // the run's own verifySeal already enforced the instrument seal (fail-closed path exercised)
    assert.equal(results.sealedInstrument.procsHash.startsWith('sha256:'), true);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('runMatrix refuses tampered instrument BEFORE executing (fail-closed run)', async () => {
  const d = tmp();
  try {
    writeFileSync(join(d, 'p.mjs'), readFileSync(PROCS));
    writeFileSync(join(d, 'x.json'), readFileSync(PREFIX));
    writeFileSync(join(d, 'y.py'), readFileSync(PY));
    const sealPath = join(d, 'seal.json');
    assert.equal(main(['seal', `--procs=${join(d, 'p.mjs')}`, `--prefix=${join(d, 'x.json')}`, `--py=${join(d, 'y.py')}`, `--out=${sealPath}`]), 0);
    const doc = JSON.parse(readFileSync(join(d, 'x.json'), 'utf8'));
    doc.priorState.acc += 1;
    writeFileSync(join(d, 'x.json'), JSON.stringify(doc, null, 2));
    await assert.rejects(
      () => runMatrix({ procsPath: join(d, 'p.mjs'), prefixPath: join(d, 'x.json'), pyPath: join(d, 'y.py'), sealPath }),
      (e) => e instanceof M13Error && e.errName === 'E_PREFIX_MODIFIED',
    );
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// ── 9. nudge fixture calibration is pure arithmetic on sealed constants ────
test('nudge fixture: verdict flips reject↔accept; draw stream untouched', () => {
  const base = batteryEval(prefix);
  const nudged = batteryEval(nudgePrefix);
  assert.equal(base.verdict, 'reject');
  assert.equal(nudged.verdict, 'accept');
  const qBase = qrngPick(prefix);
  const qNudge = qrngPick(nudgePrefix);
  assert.deepEqual(qBase.draws, qNudge.draws); // reads only the sealed seed — the update did not re-roll the certified draw
});

test('executor agreement holds under the changed prior too (A==B==C on nudge prefix)', { skip: python3Available ? false : 'python3 absent' }, () => {
  const id = 'battery-eval';
  const a = execInProcess(procsMod, id, nudgePrefix);
  const b = execNodeChild({ procsPath: PROCS, prefixPath: NUDGE, procId: id, tag: 'B' });
  const c = execPython({ pyPath: PY, procId: id, prefix: nudgePrefix, tag: 'C' });
  assert.ok(a.bytes.equals(b.bytes) && a.bytes.equals(c.bytes));
  const nudgeEmit = JSON.parse(a.bytes.toString('utf8'));
  assert.equal(nudgeEmit.verdict, 'accept');
});
