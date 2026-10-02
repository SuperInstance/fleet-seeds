#!/usr/bin/env node
// m13-llm-leg-run3.mjs — wave 71-b — the revision-r3 LIVE RE-CAST RUN of the
// M13 LLM-executor leg (the pending-leg closer: P1 / P3 / P4 on healthy stacks).
//
// WHY THIS EXISTS (receipted): runs 1-2 left P1/P3/P4 PENDING on blocked stacks
// (typesafe 404 dead, kimi 429 suspended, Qwen3.5-27B thinking-exhaustion at 400
// tokens on the TRIVIAL constrained leg, gpt-oss-20b empty-final-channel on the
// arithmetic spec at 4096 AND 16384 — receipted structural). The r2 receipt's
// own recipe named the fix: a NON-THINKING executor. Revision r3 re-casts the
// executors (identity is DESIGN, receipted — claims seal sha256:3ef79c3f…
// untouched):
//   X             = deepinfra openai/gpt-oss-20b  (freeform+constrained ONLY —
//                    the receipted byte-stable constrained anchor; structurally
//                    dead on computation, so NOT re-cast there)
//   Y             = deepinfra nvidia/NVIDIA-Nemotron-3.5-Lightning (all legs;
//                    the model-casting registry's answers-in-2 non-thinking stack)
//   computationX  = deepinfra ibm-granite/granite-4.2-3b (computation only; the
//                    registry racehorse — deliberately a DIFFERENT model from Y
//                    so the computation leg still compares two different stacks)
//   Yfallback     = DROPPED (kimi receipted 429-suspended across both prior runs)
//
// HONEST PROVENANCE (the redo-tool law, kept): this driver does NOT reimplement
// the comparator or the call protocol. It imports the SEALED runner's own
// exports (chatCall, byteEq, classifyFreeform, parseConstrained, parseChecksum,
// loadSpecs, loadLegSeal, verifySeal, certifyGroundTruth) and asserts the runner
// file hash against the r3 instrument seal before anything runs — the metric
// code is the sealed code, the prompt bytes are the sealed fixture's bytes sent
// VERBATIM by the sealed runner's chatCall. The driver only orchestrates the
// per-leg cast and writes receipts/results.
//
// BUDGET LAW (unchanged, sealed): hard cap 10 external calls = 6 core + 2
// stability + <=2 repair; one receipt row per attempt INCLUDING failures. The
// 0-token catalog probe was receipted separately (catalog-probe row) per the r2
// precedent — metadata calls are outside the scored budget.
//
// LEDGER LAW (receipted): run-3 rows are APPENDED to receipts/m13-llm-leg-1.jsonl
// (the leg's ledger, per the 71-b mission instruction) — append-only, existing
// run-1/r2 rows never rewritten; every run-3 row self-labels run:'m13-llm-leg-3'
// so the mixed ledger stays unambiguous.
//
// ZERO shell-out. Zero npm deps. node:crypto/fs, global fetch.
// usage: m13-llm-leg-run3.mjs --specs=<f> --seal=<s.json> --out=<results.json> --receipts=<r.jsonl>
// exit: 0 scored (not "all passed") · 1 fail-closed (named) · 2 usage.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import {
  loadSpecs, loadLegSeal, verifySeal, certifyGroundTruth, chatCall, M13LegError,
  byteEq, classifyFreeform, parseConstrained, parseChecksum,
} from './m13-llm-leg.mjs';

const RUN = 'm13-llm-leg-3';
const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = join(HERE, 'm13-llm-leg.mjs');
const sha256OfBuf = (b) => 'sha256:' + createHash('sha256').update(b).digest('hex');
const fail = (name, msg) => { const e = new Error(`${name}: ${msg}`); e.errName = name; throw e; };

// FREEFORM_ENUM is module-private in the sealed runner; the identical named-class
// set is sourced from the sealed specs rubric (freeformClassPriority minus 'other')
const NAMED_FREEFORM = (rubric) => rubric.freeformClassPriority.filter((c) => c !== 'other');
const VACUOUS = (reason) => ({ vacuous: true, reason });

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

export async function run3({ specsPath, sealPath, outPath, receiptsPath, timeoutMs = 180_000 }) {
  if (existsSync(outPath)) fail('E_RESULTS_EXISTS', `${outPath} already exists — results are never overwritten`);
  const specs = loadSpecs(specsPath);
  const seal = loadLegSeal(sealPath);
  verifySeal({ specsPath }, seal); // fail-closed BEFORE anything executes (E_*_MODIFIED by name)
  const runnerHash = sha256OfBuf(readFileSync(RUNNER_PATH));
  if (runnerHash !== seal.runnerHash) fail('E_RUNNER_MODIFIED', `runner re-hash ${runnerHash} != sealed ${seal.runnerHash} — the metric/call code must BE the sealed runner`);
  const gt = await certifyGroundTruth(specs); // the checksum law's executor must be the 68-f-certified module

  // the r3 cast, resolved and declared
  const castOf = (leg, slot) => {
    if (slot === 'Y') return { ex: specs.executors.Y, castId: 'Y' };
    if (leg === 'computation') {
      if (!specs.executors.computationX) fail('E_SPECS_MALFORMED', 'computation leg has no computationX cast');
      return { ex: specs.executors.computationX, castId: 'computationX' };
    }
    return { ex: specs.executors.X, castId: 'X' };
  };
  const castDecl = {
    X: { model: specs.executors.X.model, legs: specs.executors.X.legs ?? ['freeform', 'constrained'] },
    Y: { model: specs.executors.Y.model, legs: specs.executors.Y.legs ?? ['freeform', 'constrained', 'computation'] },
    computationX: specs.executors.computationX ? { model: specs.executors.computationX.model, legs: specs.executors.computationX.legs ?? ['computation'] } : { dropped: true },
    Yfallback: specs.executors.Yfallback ? { model: specs.executors.Yfallback.model } : { dropped: true, reason: 'kimi receipted 429-suspended across runs 1-2; no dead-channel fallback' },
  };

  // ledger: append-only, run-3 rows self-labeled (mixed-ledger law, receipted)
  const append = (row) => appendFileSync(receiptsPath, JSON.stringify(row) + '\n');
  append({
    row: 'run-status', run: RUN, leg: specs.leg, at_utc: new Date().toISOString(),
    outcome: 'RUN OPENED (71-b lane): revision-r3 live re-cast of the pending legs',
    disclosure: 'run-3 rows are APPENDED to this leg ledger (run-1/r2 rows untouched, never rewritten); every run-3 row self-labels run:' + RUN,
    claims: 'seeds/m13-llm-leg-70a.json', claimsSeal: 'seeds/m13-llm-leg-70a.seal.json (claimsHash sha256:3ef79c3f… UNTOUCHED)',
    instrumentSeal: 'seeds/m13-llm-leg-70a.instrument-seal-r3.json (specsHash ' + seal.specsHash + ', runnerHash ' + seal.runnerHash + ', groundTruthHash ' + seal.groundTruthHash + ')',
    cast: castDecl,
    groundTruth: gt,
    budget: specs.callProtocol.budget,
    catalogProbe: 'receipted catalog-probe row above (0-token metadata call; outside the scored budget, r2 precedent)',
  });

  const budget = specs.callProtocol.budget;
  let calls = 0;
  const byProvider = {};
  const byModel = {};
  const capLeft = () => budget.hardCap - calls;

  // the call+receipt loop: EXACTLY the sealed runner's repair law, with run labels
  const callWithReceipt = (leg, slot, spec, attemptNote) => {
    const { ex, castId } = castOf(leg, slot);
    const base = {
      row: 'llm-call', run: RUN, n: calls + 1, at_utc: new Date().toISOString(), leg, slot,
      provider: ex.provider, model_requested: ex.model, executor_cast: castId, ...attemptNote,
    };
    const usageOf = (u) => u ? Object.fromEntries(Object.entries(u).filter(([, v]) => typeof v === 'number')) : null;
    const attempt = async () => {
      calls++;
      byProvider[ex.provider] = (byProvider[ex.provider] ?? 0) + 1;
      byModel[ex.model] = (byModel[ex.model] ?? 0) + 1;
      try {
        const r = await chatCall(ex.provider, ex.model, spec.prompt, { maxTokens: spec.maxTokens, timeoutMs });
        append({ ...base, ok: true, model_served: r.modelServed, usage: usageOf(r.usage), finish: r.finish, latency_ms: r.latencyMs, content_sha256: sha256OfBuf(Buffer.from(r.content, 'utf8')), content_bytes_len: Buffer.byteLength(r.content, 'utf8'), content: r.content });
        return { ok: true, content: r.content, modelServed: r.modelServed, usage: r.usage, finish: r.finish };
      } catch (e) {
        const repairable = e instanceof M13LegError && (e.errName === 'E_TRANSPORT' || e.errName === 'E_EMPTY_CONTENT' || (e.errName === 'E_HTTP' && e.paramRejection)) && capLeft() > 0;
        append({ ...base, ok: false, error: e.errName, message: String(e.message).slice(0, 300), http: e.http ?? null, repairable });
        if (!repairable) return { ok: false, error: e.errName };
        const dropTemp = e.errName === 'E_HTTP' && e.paramRejection;
        const n2 = {
          row: 'llm-call', run: RUN, n: calls + 1, at_utc: new Date().toISOString(), leg, slot,
          provider: ex.provider, model_requested: ex.model, executor_cast: castId,
          repair_of: base.n, repair: dropTemp ? 'drop-temperature' : 'straight-retry',
        };
        calls++;
        byProvider[ex.provider] = (byProvider[ex.provider] ?? 0) + 1;
        byModel[ex.model] = (byModel[ex.model] ?? 0) + 1;
        try {
          const r = await chatCall(ex.provider, ex.model, spec.prompt, { maxTokens: spec.maxTokens, timeoutMs, sendTemperature: !dropTemp });
          append({ ...n2, ok: true, model_served: r.modelServed, usage: usageOf(r.usage), finish: r.finish, latency_ms: r.latencyMs, content_sha256: sha256OfBuf(Buffer.from(r.content, 'utf8')), content_bytes_len: Buffer.byteLength(r.content, 'utf8'), content: r.content });
          return { ok: true, content: r.content, modelServed: r.modelServed, usage: r.usage, finish: r.finish };
        } catch (e2) {
          append({ ...n2, ok: false, error: e2.errName, message: String(e2.message).slice(0, 300), http: e2.http ?? null });
          return { ok: false, error: e2.errName };
        }
      }
    };
    return attempt();
  };

  const runSlot = async (leg, spec, slot) => {
    if (capLeft() <= 0) {
      append({ row: 'llm-call', run: RUN, leg, slot, skipped: 'budget-cap-exhausted', ok: false });
      return { ok: false, error: 'budget-cap' };
    }
    return await callWithReceipt(leg, slot, spec, { attempt: 1 });
  };

  const results = {};
  const L = specs.specs;
  for (const leg of ['freeform', 'constrained', 'computation']) {
    const x = await runSlot(leg, L[leg], 'X');
    const y = await runSlot(leg, L[leg], 'Y');
    results[leg] = { X: x, Y: y };
  }

  // stability probes (receipt-only diagnostics; constrained end; no claim rides)
  const stability = { purpose: 'executor self-stability at the constrained end (A1/A2 analog); receipt-only, no claim rides on them' };
  for (const slot of ['X', 'Y']) {
    const first = results.constrained[slot];
    if (!first?.ok) { stability[slot] = { skipped: `first attempt failed: ${first?.error ?? 'unknown'}` }; continue; }
    if (capLeft() <= 0) { stability[slot] = { skipped: 'budget-cap-exhausted' }; continue; }
    const rep = await callWithReceipt('constrained-stability', slot, L.constrained, { attempt: 1, stability_repeat_of: 'constrained' });
    stability[slot] = rep.ok
      ? { repeatBytesIdentical: byteEq(rep.content, first.content), repeatContent_sha256: sha256OfBuf(Buffer.from(rep.content, 'utf8')) }
      : { skipped: `repeat failed: ${rep.error ?? 'unknown'}` };
  }

  // ── comparator: the SEALED runner's own exported functions, exact rubric law ──
  const rubric = specs.comparatorRubric;
  const metrics = {};
  {
    const { X, Y } = results.freeform;
    if (X.ok && Y.ok) {
      const cx = classifyFreeform(X.content, rubric);
      const cy = classifyFreeform(Y.content, rubric);
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
    const gtv = specs.specs.computation.groundTruth;
    if (X.ok && Y.ok) {
      const vx = parseChecksum(X.content), vy = parseChecksum(Y.content);
      metrics.computation = {
        groundTruth: gtv, valueX: vx, valueY: vy,
        correctX: vx === gtv ? 1 : 0, correctY: vy === gtv ? 1 : 0,
        bothCorrect: (vx === gtv && vy === gtv) ? 1 : 0,
        agreeXY: (vx !== null && vy !== null && vx === vy) ? 1 : 0,
      };
    } else metrics.computation = VACUOUS(`computation leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
  }
  const allRan = !metrics.freeform.vacuous && !metrics.constrained.vacuous && !metrics.computation.vacuous;
  metrics.gradient = allRan
    ? { score: (1 - metrics.freeform.bytesIdentical) + metrics.constrained.classAgree + (1 - metrics.computation.bothCorrect), law: 'score = freeform byte-DIVERGENT (1) + constrained class-AGREE (1) + computation NOT-both-correct (1); 3 = the registered gradient, exact' }
    : VACUOUS('a leg did not complete; the gradient composite is not computable this run');
  metrics.budget = { calls, hardCap: budget.hardCap, byProvider, byModel };
  metrics.cast = castDecl;

  const out = {
    tool: 'm13-llm-leg@1',
    leg: specs.leg,
    provenance: {
      executedBy: `tools/${basename(fileURLToPath(import.meta.url))} (revision-r3 live re-cast run; the comparator and the call protocol are the SEALED runner's own exports — runnerHash asserted against the seal before anything ran)`,
      revision: 'r3: executor-cast revision (identity is design, receipted; claims seal sha256:3ef79c3f… untouched) — Y -> nvidia/NVIDIA-Nemotron-3.5-Lightning, computation-X -> ibm-granite/granite-4.2-3b, kimi fallback dropped; sealed prompts/rubric/prefix/policy/budget byte-identical to r1/r2',
      catalogProbe: 'deepinfra GET /v1/openai/models (0-token metadata call, receipted catalog-probe row; exact ids taken from the live catalog, 183 models)',
      ledgerNote: `run-3 rows appended to ${basename(receiptsPath)} per the 71-b mission instruction (append-only; run-1/r2 rows untouched; every row self-labels run:${RUN})`,
      runId: RUN,
      executedAt: new Date().toISOString(),
    },
    sealedInstrument: {
      specsHash: seal.specsHash, runnerHash: seal.runnerHash, groundTruthHash: seal.groundTruthHash,
      sealPath: basename(sealPath), sealedAt: seal.sealedAt,
      groundTruth68fCertified: 'sha256:86085f4fa6f824eee19f79fb58138146b8d4f9ff4ac7122a6780a28095983caf',
    },
    resealRuleLLM: 'class-sealed procedures agree at outcome-class level (the LLM-leg comparator); byte-identity stays the re-seal law for code executors; byte comparison is EXACT content equality, no normalization',
    contents: results,
    metrics,
    evidence: { stability, groundTruthRecomputed: gt },
  };

  // cross-run anchors (disclosed evidence, not a scored metric): run-3's
  // gpt-oss-20b outputs vs the run-1 receipted anchors (temperature 0)
  try {
    const r1 = readFileSync(receiptsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const a1 = r1.find((r) => r.row === 'llm-call' && r.leg === 'freeform' && r.slot === 'X' && r.ok && r.run === undefined);
    const a4 = r1.find((r) => r.row === 'llm-call' && r.leg === 'constrained' && r.slot === 'X' && r.ok && r.run === undefined);
    out.evidence.crossRunAnchors = {
      note: 'run-3 X (gpt-oss-20b) outputs vs the run-1 receipted anchors (temperature 0): byte-stability across lanes and restarts',
      freeformX_sha_run1: a1?.content_sha256 ?? null,
      freeformX_matchesRun1: results.freeform.X.ok && a1 ? sha256OfBuf(Buffer.from(results.freeform.X.content, 'utf8')) === a1.content_sha256 : null,
      constrainedX_sha_run1: a4?.content_sha256 ?? null,
      constrainedX_matchesRun1: results.constrained.X.ok && a4 ? sha256OfBuf(Buffer.from(results.constrained.X.content, 'utf8')) === a4.content_sha256 : null,
    };
  } catch { out.evidence.crossRunAnchors = { error: 'run-1 ledger unreadable' }; }

  const text = JSON.stringify(out, null, 2) + '\n';
  writeFileSync(outPath, text);
  process.stdout.write(JSON.stringify({ ok: true, out: outPath, metrics: { freeform: metrics.freeform, constrained: metrics.constrained, computation: metrics.computation, gradient: metrics.gradient, budget: metrics.budget }, stability, crossRunAnchors: out.evidence.crossRunAnchors }, null, 1) + '\n');
  return 0;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('m13-llm-leg-run3.mjs')) {
  Promise.resolve((async () => {
    const args = parseArgs(process.argv.slice(2));
    for (const k of ['specs', 'seal', 'out', 'receipts']) if (!args[k]) { process.stderr.write(`missing --${k}\n`); process.exit(2); }
    return await run3({
      specsPath: args.specs, sealPath: args.seal, outPath: args.out, receiptsPath: args.receipts,
      timeoutMs: args['timeout-ms'] ? Number(args['timeout-ms']) : 180_000,
    });
  })()).then(
    (code) => process.exit(code ?? 0),
    (e) => {
      if (e && e.errName) { process.stderr.write(JSON.stringify({ ok: false, error: e.errName, message: e.message }) + '\n'); process.exit(1); }
      process.stderr.write(JSON.stringify({ ok: false, error: 'E_INTERNAL', message: String(e && e.stack || e) }) + '\n');
      process.exit(1);
    },
  );
}
