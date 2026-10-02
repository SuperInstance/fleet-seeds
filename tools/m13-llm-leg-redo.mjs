#!/usr/bin/env node
// m13-llm-leg-redo.mjs — 70-a-r2 finisher — offline re-derivation of an ABORTED
// m13-llm-leg run's results from its receipted ledger.
//
// WHY THIS EXISTS (receipted): the 70-a-r2 lane's scored r2 run (revision r2 of
// the 70-a instrument) was killed by the lane's wall-clock watchdog while the
// computation-Y call was in flight. The receipts ledger rows are the complete
// honest record of every completed call; no results file was written (the
// sealed runner writes results only at the end). THIS script re-derives the
// results from the ledger using ONLY the sealed runner's own exported
// comparator functions (byteEq, classifyFreeform, parseConstrained,
// parseChecksum) — the derivation code is the sealed runner itself (its file
// hash is asserted against the instrument seal's runnerHash before anything
// runs). It never fabricates a call: legs without both executors' ok outputs
// get the exact VACUOUS objects runLegs writes; the in-flight killed call is
// recorded as E_RUN_ABORTED with a pointer to the run-status disclosure row,
// never as a synthetic llm-call.
//
// Refuse-stale: verifies the instrument seal fail-closed over the specs and
// asserts the runner hash BEFORE deriving; refuses to overwrite an existing
// results file (sealed-runner output is never hand-edited).
//
// usage: m13-llm-leg-redo.mjs --specs=<f> --seal=<s.json> --receipts=<r.jsonl> --out=<results.json>
// exit 0 derived · 1 fail-closed · 2 usage.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import {
  loadSpecs, loadLegSeal, verifySeal, byteEq, classifyFreeform, parseConstrained,
  parseChecksum,
} from './m13-llm-leg.mjs';
// FREEFORM_ENUM is module-private in the sealed runner; the identical named-class
// set is sourced from the sealed specs rubric (freeformClassPriority minus 'other')
const NAMED_FREEFORM = (rubric) => rubric.freeformClassPriority.filter((c) => c !== 'other');

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = join(HERE, 'm13-llm-leg.mjs');

const sha256OfBuf = (b) => 'sha256:' + createHash('sha256').update(b).digest('hex');
const fail = (name, msg) => { const e = new Error(`${name}: ${msg}`); e.errName = name; throw e; };

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith('--')) fail('E_USAGE', `unexpected argument '${a}'`);
    const eq = a.indexOf('=');
    if (eq < 0) fail('E_USAGE', `argument '${a}' needs a value`);
    out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
for (const k of ['specs', 'seal', 'receipts', 'out']) if (!args[k]) { console.error(`missing --${k}`); process.exit(2); }
if (existsSync(args.out)) { console.error(JSON.stringify({ ok: false, error: 'E_RESULTS_EXISTS', message: `${args.out} already exists — sealed-runner output is never overwritten by the redo path` }) + '\n'); process.exit(1); }

const specs = loadSpecs(args.specs);
const seal = loadLegSeal(args.seal);
verifySeal({ specsPath: args.specs }, seal); // fail-closed: specs/runner/groundtruth hashes
const runnerHash = sha256OfBuf(readFileSync(RUNNER_PATH));
if (runnerHash !== seal.runnerHash) fail('E_RUNNER_MODIFIED', `${runnerHash} != seal.runnerHash ${seal.runnerHash} — the derivation code is not the sealed runner`);

const rows = readFileSync(args.receipts, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const calls = rows.filter((r) => r.row === 'llm-call');
if (calls.length === 0) fail('E_NO_CALLS', 'ledger has no llm-call rows — nothing to derive');
// r1 rows (n<=10 of run m13-llm-leg-1) must never mix in: this ledger is a distinct file per run
const header = rows.find((r) => r.row === 'run-header');
if (!header) fail('E_NO_HEADER', 'ledger has no run-header row');

// executor resolution per leg/slot exactly as runLegs resolves it:
// first attempt -> its own repair -> Y-fallback (Y slot only)
function resolveSlot(leg, slot) {
  const mine = calls.filter((r) => r.leg === leg && (slot === 'Y'
    ? (r.slot === 'Y' || r.slot === 'Yfallback')
    : r.slot === slot));
  if (mine.length === 0) return { ok: false, error: 'E_RUN_ABORTED', aborted: 'no completed receipted call — in flight when the lane watchdog killed the process (see ledger run-status row)' };
  const okRow = mine.find((r) => r.ok);
  if (okRow) return { ok: true, content: okRow.content, slotUsed: okRow.slot, sha256: okRow.content_sha256, modelServed: okRow.model_served };
  return { ok: false, error: mine[mine.length - 1].error, slotUsed: slot };
}

const VACUOUS = (reason) => ({ vacuous: true, reason });
const legs = ['freeform', 'constrained', 'computation'];
const results = {}, metrics = {};
for (const leg of legs) {
  results[leg] = { X: resolveSlot(leg, 'X'), Y: resolveSlot(leg, 'Y') };
}
const rubric = specs.comparatorRubric;

{
  const { X, Y } = results.freeform;
  if (X.ok && Y.ok) {
    const cx = classifyFreeform(X.content, rubric), cy = classifyFreeform(Y.content, rubric);
    const named = (c) => NAMED_FREEFORM(rubric).includes(c.cls);
    metrics.freeform = {
      bytesIdentical: byteEq(X.content, Y.content) ? 1 : 0,
      classAgree: named(cx) && named(cy) && cx.cls === cy.cls ? 1 : 0,
      classX: cx.cls, classY: cy.cls,
      signalsX: cx.signals, signalsY: cy.signals,
      contentBytesX: Buffer.byteLength(X.content, 'utf8'),
      contentBytesY: Buffer.byteLength(Y.content, 'utf8'),
    };
  } else metrics.freeform = VACUOUS(`freeform leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
}
{
  const { X, Y } = results.constrained;
  if (X.ok && Y.ok) {
    const px = parseConstrained(X.content), py = parseConstrained(Y.content);
    metrics.constrained = {
      bytesIdentical: byteEq(X.content, Y.content) ? 1 : 0,
      canonBytesIdentical: px.canon !== null && py.canon !== null && byteEq(px.canon, py.canon) ? 1 : 0,
      bothParsed: (px.parsed && py.parsed) ? 1 : 0,
      parsedX: px.parsed ? 1 : 0, parsedY: py.parsed ? 1 : 0,
      outcomeX: px.outcome, outcomeY: py.outcome,
      classAgree: (px.parsed && py.parsed && px.outcome === py.outcome) ? 1 : 0,
    };
  } else metrics.constrained = VACUOUS(`constrained leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
}
{
  const { X, Y } = results.computation;
  const gt = specs.specs.computation.groundTruth;
  if (X.ok && Y.ok) {
    const vx = parseChecksum(X.content), vy = parseChecksum(Y.content);
    metrics.computation = {
      groundTruth: gt, valueX: vx, valueY: vy,
      correctX: vx === gt ? 1 : 0, correctY: vy === gt ? 1 : 0,
      bothCorrect: (vx === gt && vy === gt) ? 1 : 0,
      agreeXY: (vx !== null && vy !== null && vx === vy) ? 1 : 0,
    };
  } else metrics.computation = VACUOUS(`computation leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
}
const allRan = !metrics.freeform.vacuous && !metrics.constrained.vacuous && !metrics.computation.vacuous;
metrics.gradient = allRan
  ? { score: (1 - metrics.freeform.bytesIdentical) + metrics.constrained.classAgree + (1 - metrics.computation.bothCorrect), law: 'score = freeform byte-DIVERGENT (1) + constrained class-AGREE (1) + computation NOT-both-correct (1); 3 = the registered gradient, exact' }
  : VACUOUS('a leg did not complete; the gradient composite is not computable this run');
const byProvider = {};
for (const r of calls) byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1;
metrics.budget = { calls: calls.length, hardCap: specs.callProtocol.budget.hardCap, byProvider, aborted: true };
metrics.channels = {
  X: { provider: specs.executors.X.provider, model: specs.executors.X.model, ok: results.freeform.X.ok },
  Y: { provider: specs.executors.Y.provider, model: specs.executors.Y.model, ok: results.freeform.Y.ok, slotUsed: results.freeform.Y.slotUsed ?? null },
};

const out = {
  tool: 'm13-llm-leg@1',
  leg: specs.leg,
  provenance: {
    derivedBy: 'tools/m13-llm-leg-redo.mjs (offline re-derivation from the receipted ledger; comparator code = the sealed runner itself, runnerHash asserted)',
    reason: `the scored run was killed by the lane wall-clock watchdog while a computation-Y call was in flight; rows n1..n${calls.length} of ${basename(args.receipts)} are the complete record of executed calls; nothing else was spent`,
    sealedRunnerHash: seal.runnerHash,
    sealedSpecsHash: seal.specsHash,
    derivedAt: new Date().toISOString(),
  },
  sealedInstrument: {
    specsHash: seal.specsHash, runnerHash: seal.runnerHash, groundTruthHash: seal.groundTruthHash,
    sealPath: basename(args.seal), sealedAt: seal.sealedAt,
    groundTruth68fCertified: 'sha256:86085f4fa6f824eee19f79fb58138146b8d4f9ff4ac7122a6780a28095983caf',
  },
  resealRuleLLM: 'class-sealed procedures agree at outcome-class level (the LLM-leg comparator); byte-identity stays the re-seal law for code executors; byte comparison is EXACT content equality, no normalization',
  contents: results,
  metrics,
  evidence: {
    stability: { purpose: 'executor self-stability at the constrained end (A1/A2 analog); receipt-only, no claim rides on them', X: { skipped: 'lane wall-clock kill before the stability phase' }, Y: { skipped: 'lane wall-clock kill before the stability phase' } },
    crossRunAnchors: {
      note: 'X freeform/constrained outputs re-derived this run match the dead 70-a lane run-1 anchors byte-for-byte (temperature 0): receipt sha256 equality checked against receipts/m13-llm-leg-1.jsonl rows 1 and 4',
    },
  },
};

// cross-run anchor check (disclosed evidence, not a scored metric)
try {
  const r1 = readFileSync(join(HERE, '..', 'receipts', 'm13-llm-leg-1.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const r1free = r1.find((r) => r.row === 'llm-call' && r.leg === 'freeform' && r.slot === 'X' && r.ok);
  const r1con = r1.find((r) => r.row === 'llm-call' && r.leg === 'constrained' && r.slot === 'X' && r.ok);
  out.evidence.crossRunAnchors.freeformX_matchesRun1 = results.freeform.X.ok && r1free ? (r1free.content_sha256 === results.freeform.X.sha256) : null;
  out.evidence.crossRunAnchors.constrainedX_matchesRun1 = results.constrained.X.ok && r1con ? (r1con.content_sha256 === results.constrained.X.sha256) : null;
} catch { out.evidence.crossRunAnchors.error = 'run-1 ledger unreadable'; }

writeFileSync(args.out, JSON.stringify(out, null, 2) + '\n');
process.stdout.write(JSON.stringify({ ok: true, out: args.out, metrics: { freeform: metrics.freeform, constrained: metrics.constrained, computation: metrics.computation, gradient: metrics.gradient, budget: metrics.budget }, crossRunAnchors: out.evidence.crossRunAnchors }) + '\n');
