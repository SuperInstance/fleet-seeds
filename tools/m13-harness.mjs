#!/usr/bin/env node
// m13-harness.mjs — wave 68-f — THE M13 FALSIFICATION HARNESS (cross-executor
// re-seal).
//
// M13 (lode/mines.jsonl row 13): "procedure value is executor-scoped; nested
// loops must re-seal what they inherit." This harness is the falsifiable,
// zero-external-model instrument for the executor half of that law: it takes
// PROCEDURES (deterministic functions of an inherited sealed prefix {seed,
// constants, priorState}) and re-seals them across MULTIPLE EXECUTORS:
//
//   A  same-process node (the executor that sealed the instrument)
//   B  child_process node with a CLEAN ENV (no inherited environment; the
//      subprocess-isolated executor)
//   C  python3 re-implementation when the procedure is language-portable,
//      else node with --random-seed variation (the mission's fallback) —
//      the positive control takes the fallback, by design.
//
// THE RE-SEAL DECISION RULE (registered with the harness, not invented after
// the fact): every executor must produce BYTE-IDENTICAL output AND the same
// verdict given the same inherited seal.
//   * any divergence  => executor-scoped procedure value CONFIRMED — M13's
//     mechanism holds for that procedure class;
//   * byte-identical everywhere => procedure value NOT executor-scoped in
//     this instance — the honest falsification direction for M13's
//     universality (still a finding, never a shrug).
//
// TWO SEALS RIDE TOGETHER (the full jepa/67-c ritual, dogfooded):
//   1. tools/preregister.mjs seals the PREDICTIONS (seeds/m13-harness-68f.json)
//      — committed and pushed BEFORE the scored run;
//   2. THIS tool seals the INSTRUMENT (procs + prefix + python port) and
//      verifies it fail-closed at run time: a procedure file tampered between
//      seal and run refuses BY NAME (E_PROCEDURE_MODIFIED / E_PREFIX_MODIFIED
//      / E_PYPORT_MODIFIED) — qcells' refuse-stale law at instrument level.
//
// POSITIVE + NEGATIVE CONTROLS (the harness must discriminate, or it is blind
// to exactly what M13 warns about):
//   * wallclock-leak (unsealed: Date.now() + unseeded Math.random()) MUST be
//     flagged DIVERGENT — the positive control;
//   * battery-eval + qrng-pick (sealed-deterministic) MUST re-seal identical
//     everywhere — the negative control.
//
// CLASSIFICATION (fail-visible, never silently tolerated):
//   NONDETERMINISTIC_SAME_EXECUTOR — A disagrees with itself (unsealed entropy)
//   EXECUTOR_SENSITIVE             — A stable but B diverges (clean-env scoping)
//   PORT_DIVERGENT                 — A==B but C diverges (port or runtime scoping;
//                                     a port BUG is an instrument defect and must
//                                     be ruled out by the calibration suite before
//                                     a scored-run divergence is read as a finding)
//
// CLI (exit 0 ok — "scored", not "all passed"; 1 fail-closed named; 2 usage):
//   m13-harness.mjs seal   --procs=<p> --prefix=<p> --py=<p> --out=<s.json> [--note=<t>]
//   m13-harness.mjs verify --procs=<p> --prefix=<p> --py=<p> --seal=<s.json>
//   m13-harness.mjs run    --procs=<p> --prefix=<p> --py=<p> --seal=<s.json> \
//                          [--nudge-prefix=<p>] --out=<results.json>
//
// ZERO NETWORK. Zero npm dependencies. node:crypto + node:fs + node:child_process.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir, platform, arch } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { canonicalJSON, claimsHashOf } from './preregister.mjs';

export const TOOL = 'm13-harness@1';
const HASH_PREFIX = 'sha256:';
const sha256OfBuf = (buf) => HASH_PREFIX + createHash('sha256').update(buf).digest('hex');

export class M13Error extends Error {
  constructor(name, message) { super(`${name}: ${message}`); this.name = name; this.errName = name; }
}
const fail = (name, msg) => { throw new M13Error(name, msg); };

const HERE = dirname(fileURLToPath(import.meta.url));
export const CHILD_RUNNER = join(HERE, 'm13-child.mjs');

// ── loading ────────────────────────────────────────────────────────────────
function loadJson(path, errName) {
  let text;
  try { text = readFileSync(path, 'utf8'); }
  catch (e) { fail(errName, `cannot read ${path}: ${e.message}`); }
  try { return JSON.parse(text); }
  catch (e) { fail(errName, `${path} is not valid JSON: ${e.message}`); }
}

// ── instrument seal (the qcells refuse-stale law, instrument-level) ────────
export function sealDoc({ procsPath, prefixPath, pyPath }, note) {
  const prefixDoc = loadJson(prefixPath, 'E_PREFIX_MODIFIED');
  const seal = {
    tool: TOOL,
    sealedAt: new Date().toISOString(),
    procsHash: sha256OfBuf(readFileSync(procsPath)),
    prefixHash: claimsHashOf(prefixDoc),
    pyHash: sha256OfBuf(readFileSync(pyPath)),
    paths: { procs: basename(procsPath), prefix: basename(prefixPath), py: basename(pyPath) },
  };
  if (note) seal.note = String(note);
  return seal;
}

export function loadHarnessSeal(path) {
  const seal = loadJson(path, 'E_SEAL_MALFORMED');
  if (!seal || typeof seal !== 'object' || Array.isArray(seal)) fail('E_SEAL_MALFORMED', `${path} is not a seal object`);
  if (seal.tool !== TOOL) fail('E_SEAL_MALFORMED', `seal.tool is '${seal.tool ?? ''}', expected '${TOOL}'`);
  for (const k of ['sealedAt', 'procsHash', 'prefixHash', 'pyHash']) {
    if (typeof seal[k] !== 'string' || seal[k].length === 0) fail('E_SEAL_MALFORMED', `seal.${k} is missing`);
  }
  for (const k of ['procsHash', 'prefixHash', 'pyHash']) {
    if (!seal[k].startsWith(HASH_PREFIX) || !/^[0-9a-f]{64}$/.test(seal[k].slice(HASH_PREFIX.length))) {
      fail('E_SEAL_MALFORMED', `seal.${k} must be ${HASH_PREFIX}<64 hex>`);
    }
  }
  return seal;
}

// verifySeal — re-derive every hash; refuse BY NAME on any mismatch. This is
// the "nested loops must re-seal what they inherit" enforcement: the run
// refuses to execute on an instrument that moved after sealing.
export function verifySeal({ procsPath, prefixPath, pyPath }, seal) {
  const gotProcs = sha256OfBuf(readFileSync(procsPath));
  if (gotProcs !== seal.procsHash) {
    fail('E_PROCEDURE_MODIFIED', `procs re-hash ${gotProcs} != sealed ${seal.procsHash} — the procedures were touched after sealing; the run refuses`);
  }
  const gotPrefix = claimsHashOf(loadJson(prefixPath, 'E_PREFIX_MODIFIED'));
  if (gotPrefix !== seal.prefixHash) {
    fail('E_PREFIX_MODIFIED', `prefix re-hash ${gotPrefix} != sealed ${seal.prefixHash} — the inherited prefix was touched after sealing; the run refuses`);
  }
  const gotPy = sha256OfBuf(readFileSync(pyPath));
  if (gotPy !== seal.pyHash) {
    fail('E_PYPORT_MODIFIED', `python port re-hash ${gotPy} != sealed ${seal.pyHash} — executor-C moved after sealing; the run refuses`);
  }
  return true;
}

// ── executors ──────────────────────────────────────────────────────────────
// Clean env: CONSTRUCTED constants only — no inherited environment, no
// NODE_OPTIONS, no secrets. This is what makes executor-B a different runtime
// from executor-A despite the same node binary.
export function cleanEnv(tag) {
  return {
    PATH: '/usr/bin:/bin',
    HOME: tmpdir(),
    LANG: 'C.UTF-8',
    M13_EXECUTOR: tag,
  };
}

export function execInProcess(mod, procId, prefix) {
  const emit = mod.runProcedure(procId, prefix);
  const bytes = Buffer.from(mod.emitLine(emit), 'utf8');
  return { bytes, emit };
}

export function execNodeChild({ procsPath, prefixPath, procId, nodeArgs = [], tag = 'B' }) {
  const args = [...nodeArgs, CHILD_RUNNER,
    `--proc=${procId}`,
    `--procs=${resolve(procsPath)}`,
    `--prefix=${resolve(prefixPath)}`];
  const r = spawnSync(process.execPath, args, {
    env: cleanEnv(tag),
    timeout: 15000,
    encoding: 'buffer',
  });
  if (r.error) fail('E_EXECUTOR_FAILED', `executor-${tag} spawn failed: ${r.error.message}`);
  if (r.status !== 0 && r.status !== null) {
    fail('E_EXECUTOR_FAILED', `executor-${tag} exited ${r.status}: ${r.stderr.toString('utf8').slice(0, 400)}`);
  }
  return { bytes: r.stdout, stderr: r.stderr.toString('utf8') };
}

export function execPython({ pyPath, procId, prefix, tag = 'C' }) {
  const r = spawnSync('python3', [resolve(pyPath), procId], {
    input: Buffer.from(JSON.stringify(prefix), 'utf8'),
    timeout: 15000,
    encoding: 'buffer',
  });
  if (r.error) fail('E_EXECUTOR_FAILED', `executor-${tag} (python3) spawn failed: ${r.error.message}`);
  if (r.status !== 0 && r.status !== null) {
    fail('E_EXECUTOR_FAILED', `executor-${tag} (python3) exited ${r.status}: ${r.stderr.toString('utf8').slice(0, 400)}`);
  }
  return { bytes: r.stdout, stderr: r.stderr.toString('utf8') };
}

const verdictOf = (bytes) => {
  try { return JSON.parse(bytes.toString('utf8')).verdict ?? null; }
  catch { return null; }
};

// ── one procedure's cross-executor re-seal ─────────────────────────────────
export async function resealProcedure(mod, meta, procId, files, prefix, pythonAvailable, prefixPathOverride) {
  const childPrefixPath = prefixPathOverride || files.prefixPath;
  const a1 = execInProcess(mod, procId, prefix);
  const a2 = execInProcess(mod, procId, prefix); // repeat — the self-stability probe
  const selfStable = a1.bytes.equals(a2.bytes);

  const b = execNodeChild({ procsPath: files.procsPath, prefixPath: childPrefixPath, procId, tag: 'B' });

  let c;
  let cExecutor;
  if (meta.portable && pythonAvailable) {
    c = execPython({ pyPath: files.pyPath, procId, prefix, tag: 'C' });
    cExecutor = 'python3';
  } else {
    // mission fallback: node with --random-seed variation where applicable.
    // Only reached for the node-only positive control (its value comes from
    // executor-adjacent entropy by construction).
    c = execNodeChild({ procsPath: files.procsPath, prefixPath: childPrefixPath, procId, nodeArgs: ['--random-seed=1379'], tag: 'C' });
    cExecutor = 'node--random-seed=1379';
  }

  const rec = {
    id: procId,
    class: meta.class,
    portable: meta.portable,
    executors: {
      A: { sha256: sha256OfBuf(a1.bytes), bytesLen: a1.bytes.length, verdict: verdictOf(a1.bytes), selfStable },
      B: { sha256: sha256OfBuf(b.bytes), bytesLen: b.bytes.length, verdict: verdictOf(b.bytes), executor: 'node-clean-env' },
      C: { sha256: sha256OfBuf(c.bytes), bytesLen: c.bytes.length, verdict: verdictOf(c.bytes), executor: cExecutor },
    },
  };
  const hA = rec.executors.A.sha256, hB = rec.executors.B.sha256, hC = rec.executors.C.sha256;
  rec.pairs = { 'A==B': hA === hB, 'A==C': hA === hC, 'B==C': hB === hC };
  const verdicts = [rec.executors.A.verdict, rec.executors.B.verdict, rec.executors.C.verdict];
  rec.verdictsAgree = verdicts.every((v) => v === verdicts[0]);
  rec.verdicts = verdicts;

  if (hA === hB && hA === hC && selfStable && rec.verdictsAgree) {
    rec.reseal = 'IDENTICAL';
  } else {
    rec.reseal = 'DIVERGENT';
    rec.classification = !selfStable ? 'NONDETERMINISTIC_SAME_EXECUTOR'
      : (hA !== hB ? 'EXECUTOR_SENSITIVE'
        : (hA !== hC ? 'PORT_DIVERGENT' : 'VERDICT_DIVERGENT'));
  }
  return rec;
}

// ── tamper battery (fail-closed proof, run every time) ─────────────────────
// Copies the SEALED instrument to a temp dir, re-seals the copy, then tampers
// each member and expects the NAMED refusal. The control (untampered copy)
// must verify ok — the battery discriminates.
export function tamperBattery(files, procsMod) {
  const tmp = mkdtempSync(join(tmpdir(), 'm13-tamper-'));
  try {
    const tProcs = join(tmp, 'procs.mjs');
    const tPrefix = join(tmp, 'prefix.json');
    const tPy = join(tmp, 'procs.py');
    copyFileSync(files.procsPath, tProcs);
    copyFileSync(files.prefixPath, tPrefix);
    copyFileSync(files.pyPath, tPy);
    const tFiles = { procsPath: tProcs, prefixPath: tPrefix, pyPath: tPy };
    const tSeal = sealDoc(tFiles);

    const attempt = (fn) => { try { fn(); return null; } catch (e) { return e instanceof M13Error ? e.errName : `E_UNNAMED:${e.message}`; } };

    const control = attempt(() => verifySeal(tFiles, tSeal));
    const restore = (p, src) => copyFileSync(src, p);
    const procsTamper = attempt(() => {
      writeFileSync(tProcs, readFileSync(tProcs) + Buffer.from('\n// tampered\n'));
      verifySeal(tFiles, tSeal);
    });
    restore(tProcs, files.procsPath);
    const prefixTamper = attempt(() => {
      const doc = JSON.parse(readFileSync(tPrefix, 'utf8'));
      doc.priorState.acc = (doc.priorState.acc + 1) >>> 0; // change a VALUE (canonical hash is reformat-proof)
      writeFileSync(tPrefix, JSON.stringify(doc, null, 2));
      verifySeal(tFiles, tSeal);
    });
    restore(tPrefix, files.prefixPath);
    const pyTamper = attempt(() => {
      writeFileSync(tPy, readFileSync(tPy) + Buffer.from('\n# tampered\n'));
      verifySeal(tFiles, tSeal);
    });

    const allRefusalsNamed = (control === null
      && procsTamper === 'E_PROCEDURE_MODIFIED'
      && prefixTamper === 'E_PREFIX_MODIFIED'
      && pyTamper === 'E_PYPORT_MODIFIED') ? 1 : 0;
    return {
      control: control === null ? 'ok' : control,
      procsTamper,
      prefixTamper,
      pyTamper,
      allRefusalsNamed,
      law: 'untampered copy verifies ok (the battery discriminates); every tampered member refuses BY NAME — qcells refuse-stale at instrument level',
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ── the full scored run ────────────────────────────────────────────────────
export async function runMatrix({ procsPath, prefixPath, pyPath, sealPath, nudgePrefixPath }) {
  const seal = loadHarnessSeal(sealPath);
  const files = { procsPath, prefixPath, pyPath };
  verifySeal(files, seal); // fail-closed BEFORE anything executes

  const procsPathAbs = resolve(procsPath);
  const mod = await import(pathToFileURL(procsPathAbs).href);
  const prefix = loadJson(prefixPath, 'E_PREFIX_MODIFIED');

  // python availability probe (named, receipted — never silently skipped)
  const pyProbe = spawnSync('python3', ['--version'], { timeout: 5000 });
  const pythonAvailable = pyProbe.status === 0;
  const pythonVersion = pythonAvailable ? pyProbe.stdout.toString('utf8').trim() || pyProbe.stderr.toString('utf8').trim() : 'absent';

  const procedures = {};
  const metrics = {
    abByteIdenticalSealedProcedures: 0,
    abcByteIdenticalSealedProcedures: 0,
    sealedVerdictsAgree: 0,
    qrngSealedResealIdentical: 0,
    positiveControlDivergent: 0,
    sealedClassExecutorScoping: 0,
    unsealedClassExecutorScoping: 0,
  };
  const sealedIds = [];

  for (const procId of mod.PROC_IDS) {
    const meta = mod.PROC_META[procId];
    const rec = await resealProcedure(mod, meta, procId, files, prefix, pythonAvailable);
    procedures[procId] = rec;
    if (rec.class === 'sealed') {
      sealedIds.push(procId);
      if (rec.pairs['A==B']) metrics.abByteIdenticalSealedProcedures++;
      if (meta.portable && rec.pairs['A==B'] && rec.pairs['A==C']) metrics.abcByteIdenticalSealedProcedures++;
      if (rec.verdictsAgree) metrics.sealedVerdictsAgree++;
      if (rec.reseal !== 'IDENTICAL') metrics.sealedClassExecutorScoping++;
    } else if (rec.reseal !== 'IDENTICAL') {
      metrics.unsealedClassExecutorScoping = 1;
    }
  }
  if (procedures['qrng-pick']?.reseal === 'IDENTICAL') metrics.qrngSealedResealIdentical = 1;
  if (procedures['wallclock-leak']?.reseal === 'DIVERGENT') metrics.positiveControlDivergent = 1;

  // ── the nudge probe: procedure verdicts must be INHERITED-PREFIX-CONDITIONAL
  // (the re-seal-what-you-inherit half of M13) while executors still agree
  // byte-identically under each prefix (executor agreement is not verdict
  // custody — the prefix is part of the seal).
  let nudge = null;
  if (nudgePrefixPath) {
    const nudgePrefix = loadJson(nudgePrefixPath, 'E_PREFIX_MODIFIED');
    const nudgeRecs = [];
    for (const procId of mod.PROC_IDS.filter((id) => mod.PROC_META[id].portable)) {
      const rec = await resealProcedure(mod, mod.PROC_META[procId], procId, files, nudgePrefix, pythonAvailable, nudgePrefixPath);
      nudgeRecs.push(rec);
    }
    const baseBattery = procedures['battery-eval'];
    const nudgeBattery = nudgeRecs.find((r) => r.id === 'battery-eval');
    const agree = (r) => r.pairs['A==B'] && r.pairs['A==C'] && r.executors.A.selfStable;
    nudge = {
      nudgePrefixPath: basename(nudgePrefixPath),
      baseVerdict: baseBattery.executors.A.verdict,
      nudgedVerdict: nudgeBattery.executors.A.verdict,
      flip: baseBattery.executors.A.verdict !== nudgeBattery.executors.A.verdict,
      executorsAgreeBase: agree(baseBattery),
      executorsAgreeNudged: agree(nudgeBattery),
      executors: Object.fromEntries(nudgeRecs.map((r) => [r.id, {
        reseal: r.reseal,
        verdicts: r.verdicts,
        sha256_A: r.executors.A.sha256,
      }])),
      law: 'executor agreement under each prefix does NOT make the verdict inheritable across a prior change — re-seal what you inherit',
    };
    metrics.prefixNudgeFlipsVerdict = nudge.flip ? 1 : 0;
    metrics.nudgeExecutorAgreement = (nudge.executorsAgreeBase && nudge.executorsAgreeNudged) ? 1 : 0;
  }

  const tamper = tamperBattery(files, mod);
  metrics.tamperRefusalNamed = tamper.allRefusalsNamed;

  return {
    tool: TOOL,
    sealedInstrument: {
      procsHash: seal.procsHash,
      prefixHash: seal.prefixHash,
      pyHash: seal.pyHash,
      sealPath: basename(sealPath),
      sealedAt: seal.sealedAt,
    },
    executors: {
      A: { kind: 'same-process node', node: process.version, platform: platform(), arch: arch() },
      B: { kind: 'child_process node, clean env', env: cleanEnv('B'), childRunner: 'm13-child.mjs' },
      C: { kind: pythonAvailable ? 'python3 re-implementation' : 'node --random-seed variation (mission fallback)', python: pythonVersion, node: process.version },
    },
    resealRule: 'byte-identical output AND same verdict across executors given the same inherited seal; divergence => executor-scoped procedure value CONFIRMED (M13 mechanism holds); identical => procedure value NOT executor-scoped in this instance (honest falsification direction)',
    procedures,
    nudge,
    tamper,
    metrics,
  };
}

// ── CLI plumbing (preregister.mjs conventions: 0 ok / 1 fail-closed / 2 usage)
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith('--')) fail('E_USAGE', `unexpected argument '${a}' (use --key=value)`);
    const eq = a.indexOf('=');
    if (eq < 0) fail('E_USAGE', `argument '${a}' needs a value (--key=value)`);
    out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}
function needArg(args, key) { if (!args[key]) { usage(); process.exit(2); } return args[key]; }
function usage() {
  process.stderr.write([
    'usage:',
    '  m13-harness.mjs seal   --procs=<p> --prefix=<p> --py=<p> --out=<s.json> [--note=<t>]',
    '  m13-harness.mjs verify --procs=<p> --prefix=<p> --py=<p> --seal=<s.json>',
    '  m13-harness.mjs run    --procs=<p> --prefix=<p> --py=<p> --seal=<s.json> [--nudge-prefix=<p>] --out=<results.json>',
    'exit: 0 ok ("scored", not "all passed") · 1 fail-closed (named error) · 2 usage. zero network, stdlib only.',
  ].join('\n') + '\n');
}

function cmdSeal(args) {
  const files = { procsPath: needArg(args, 'procs'), prefixPath: needArg(args, 'prefix'), pyPath: needArg(args, 'py') };
  const seal = sealDoc(files, args.note);
  const text = JSON.stringify(seal, null, 2) + '\n';
  writeFileSync(needArg(args, 'out'), text);
  process.stdout.write(text);
  return 0;
}

function cmdVerify(args) {
  const files = { procsPath: needArg(args, 'procs'), prefixPath: needArg(args, 'prefix'), pyPath: needArg(args, 'py') };
  const seal = loadHarnessSeal(needArg(args, 'seal'));
  verifySeal(files, seal);
  process.stdout.write(JSON.stringify({ ok: true, procsHash: seal.procsHash, prefixHash: seal.prefixHash, pyHash: seal.pyHash, sealedAt: seal.sealedAt }) + '\n');
  return 0;
}

async function cmdRun(args) {
  const out = await runMatrix({
    procsPath: needArg(args, 'procs'),
    prefixPath: needArg(args, 'prefix'),
    pyPath: needArg(args, 'py'),
    sealPath: needArg(args, 'seal'),
    nudgePrefixPath: args['nudge-prefix'],
  });
  const text = JSON.stringify(out, null, 2) + '\n';
  if (args.out) writeFileSync(args.out, text);
  process.stdout.write(text);
  return 0;
}

export function main(argv) {
  const [cmd, ...rest] = argv;
  let args;
  try { args = parseArgs(rest); } catch (e) {
    if (e instanceof M13Error && e.errName === 'E_USAGE') { process.stderr.write(`${e.message}\n`); usage(); return 2; }
    throw e;
  }
  switch (cmd) {
    case 'seal': return cmdSeal(args);
    case 'verify': return cmdVerify(args);
    case 'run': return cmdRun(args);
    case 'help': case '--help': case undefined: usage(); return cmd === undefined ? 2 : 0;
    default:
      process.stderr.write(`unknown command '${cmd}'\n`);
      usage();
      return 2;
  }
}

export function run() {
  Promise.resolve(main(process.argv.slice(2))).then(
    (code) => process.exit(code),
    (e) => {
      if (e instanceof M13Error) {
        process.stderr.write(JSON.stringify({ ok: false, error: e.errName, message: e.message }) + '\n');
        process.exit(1);
      }
      process.stderr.write(JSON.stringify({ ok: false, error: 'E_INTERNAL', message: String(e && e.stack || e) }) + '\n');
      process.exit(1);
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('m13-harness.mjs')) {
  run();
}
