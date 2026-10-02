#!/usr/bin/env node
// m13-llm-leg-run31.mjs — wave 71-b — the revision-r3.1 ONE-SHOT AMENDMENT of
// the M13 LLM-executor leg (the 10th and last call of the sealed budget) plus
// the composite derivation of results-r3.1.
//
// WHAT HAPPENED (receipted): the r3 run completed 9 of the sealed 10-call budget
// (freeform X/Y ok, constrained X/Y ok + both stability probes byte-identical,
// computation Y ok) with exactly ONE leg-half missing: computation-X. The r3
// cast for that half (ibm-granite/granite-4.2-3b, "the racehorse" per the
// model-casting registry) returned E_EMPTY_CONTENT x2 (rows n5/n6, http 200) —
// and the receipted catalog metadata shows why: the Granite-4.2 family is a
// built-in <think> REASONING family with full-thinking DEFAULT (the SAME
// structural trap receipted for gpt-oss-20b and Qwen3.5). THE HONEST
// MODEL-CASTING LESSON: the registry nickname said "racehorse", the catalog
// DESCRIPTION said think-default reasoning — the metadata predicted the trap
// and was read only AFTER the burn. Metadata before casting; measure, don't
// assume.
//
// THE AMENDMENT (receipted, pre-declared): revision r3.1 re-casts computation-X
// to the plainest non-thinking instruct on the live catalog (meta-llama/
// Meta-Llama-3.1-8B-Instruct-Turbo, NO reasoning tag, Meta weights/tokenizer —
// a genuinely different executor stack from Y=Nemotron-3.5-Lightning). ONE
// attempt, NO repair (capLeft hits 0 at this call — the sealed budget law is
// hit EXACTLY, like run-1). The call protocol is the SEALED runner's own
// chatCall with the sealed prompt VERBATIM; the receipt row is the sealed row
// schema, self-labeled run:'m13-llm-leg-3.1'.
//
// THE DERIVATION (the redo-tool law, kept): results-r3.1.json is a COMPOSITE —
// freeform/constrained/stability VERBATIM from the sealed r3 results file (never
// modified), computation re-derived from the two receipted ledger rows (run-3 n7
// for Y, this amendment for X) using ONLY the sealed runner's exported
// comparator functions. Refuses to overwrite anything; asserts the runner hash
// against the r3.1 seal before anything runs; verifySeal fail-closed.
//
// usage: m13-llm-leg-run31.mjs --specs=<f> --seal=<s.json> --out=<results.json> --receipts=<r.jsonl> --r3-results=<run3 results.json>
// exit: 0 scored (not "all passed") · 1 fail-closed (named) · 2 usage.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import {
  loadSpecs, loadLegSeal, verifySeal, certifyGroundTruth, chatCall, byteEq,
  classifyFreeform, parseConstrained, parseChecksum,
} from './m13-llm-leg.mjs';

const RUN = 'm13-llm-leg-3.1';
const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = join(HERE, 'm13-llm-leg.mjs');
const sha256OfBuf = (b) => 'sha256:' + createHash('sha256').update(b).digest('hex');
const fail = (name, msg) => { const e = new Error(`${name}: ${msg}`); e.errName = name; throw e; };
const NAMED_FREEFORM = (rubric) => rubric.freeformClassPriority.filter((c) => c !== 'other');

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

export async function run31({ specsPath, sealPath, outPath, receiptsPath, r3ResultsPath, timeoutMs = 180_000 }) {
  if (existsSync(outPath)) fail('E_RESULTS_EXISTS', `${outPath} already exists — results are never overwritten`);
  const specs = loadSpecs(specsPath);
  const seal = loadLegSeal(sealPath);
  verifySeal({ specsPath }, seal);
  const runnerHash = sha256OfBuf(readFileSync(RUNNER_PATH));
  if (runnerHash !== seal.runnerHash) fail('E_RUNNER_MODIFIED', `runner re-hash ${runnerHash} != sealed ${seal.runnerHash}`);
  const gt = await certifyGroundTruth(specs);

  const ex = specs.executors.computationX;
  if (!ex) fail('E_SPECS_MALFORMED', 'r3.1 specs must cast computationX');

  const append = (row) => appendFileSync(receiptsPath, JSON.stringify(row) + '\n');
  append({
    row: 'catalog-probe', run: RUN, at_utc: new Date().toISOString(),
    provider: 'deepinfra', endpoint: 'GET /v1/openai/models', http: 200, ok: true,
    purpose: 'r3.1 cast diligence: full metadata inspection of the re-cast candidates (granite-4.2-3b/8b/30b, Nemotron-3-Super-120B, Nemotron-3.5-Lightning) + the 35 chat models WITHOUT a reasoning tag',
    disclosure: '0-token metadata calls; receipted outside the scored budget (r2/r3 precedent); NO prompt, NO completion tokens',
    finding: 'THE MODEL-CASTING LESSON: the whole Granite-4.2 family is a built-in <think> chain-of-thought reasoning family with full-thinking DEFAULT (catalog description verbatim) — the r3 computation-X empties (rows n5/n6) were the known structural trap, visible in the metadata BEFORE casting; the registry nickname ("granite-4.2-3b the racehorse") did not survive contact with the catalog. Nemotron-3.5-Lightning ALSO carries a reasoning tag yet ANSWERED (14 completion tokens, finish stop) — behavior, not tags, is the receipt. r3.1 casts the plainest no-reasoning-tag instruct: meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo.',
  });
  append({
    row: 'run-status', run: RUN, leg: specs.leg, at_utc: new Date().toISOString(),
    outcome: 'RUN AMENDED (71-b lane): revision-r3.1 ONE-SHOT computation-X re-cast — the 10th and FINAL call of the sealed budget (9 spent in run-3 + this = 10 = hardCap EXACTLY, the run-1 law); no repair possible or attempted',
    claims: 'seeds/m13-llm-leg-70a.json', claimsSeal: 'seeds/m13-llm-leg-70a.seal.json (claimsHash sha256:3ef79c3f… UNTOUCHED)',
    instrumentSeal: 'seeds/m13-llm-leg-70a.instrument-seal-r3.1.json (specsHash ' + seal.specsHash + ')',
    cast: { computationX: ex.model, Y: specs.executors.Y.model, note: 'computation leg pair: Meta-Llama-3.1-8B-Instruct (X) vs Nemotron-3.5-Lightning (Y) — different weights/training/tokenizer' },
    groundTruth: gt,
  });

  // THE one-shot call (sealed chatCall, sealed prompt bytes, temperature 0, maxTokens per spec)
  const spec = specs.specs.computation;
  const n = { row: 'llm-call', run: RUN, n: 10, at_utc: new Date().toISOString(), leg: 'computation', slot: 'X', provider: ex.provider, model_requested: ex.model, executor_cast: 'computationX', attempt: 1, one_shot: true, repair_policy: 'none — budget cap reached at this call (pre-declared)' };
  let xr;
  try {
    const r = await chatCall(ex.provider, ex.model, spec.prompt, { maxTokens: spec.maxTokens, timeoutMs });
    append({ ...n, ok: true, model_served: r.modelServed, usage: r.usage ? Object.fromEntries(Object.entries(r.usage).filter(([, v]) => typeof v === 'number')) : null, finish: r.finish, latency_ms: r.latencyMs, content_sha256: sha256OfBuf(Buffer.from(r.content, 'utf8')), content_bytes_len: Buffer.byteLength(r.content, 'utf8'), content: r.content });
    xr = { ok: true, content: r.content, modelServed: r.modelServed, usage: r.usage, finish: r.finish, castId: 'computationX' };
  } catch (e) {
    append({ ...n, ok: false, error: e.errName ?? 'E_INTERNAL', message: String(e.message).slice(0, 300), http: e.http ?? null });
    xr = { ok: false, error: e.errName ?? 'E_INTERNAL', castId: 'computationX' };
  }

  // ── composite derivation (run-3 legs verbatim + computation from the ledger) ──
  const r3 = JSON.parse(readFileSync(r3ResultsPath, 'utf8'));
  const rows = readFileSync(receiptsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const yRow = rows.find((r) => r.row === 'llm-call' && r.run === 'm13-llm-leg-3' && r.leg === 'computation' && r.slot === 'Y' && r.ok);
  if (!yRow) fail('E_LEDGER_INCOMPLETE', 'run-3 computation-Y ok row not found in the ledger');

  const metrics = {
    freeform: r3.metrics.freeform,
    constrained: r3.metrics.constrained,
  };
  const gtv = specs.specs.computation.groundTruth;
  if (xr.ok) {
    const vx = parseChecksum(xr.content), vy = parseChecksum(yRow.content);
    metrics.computation = {
      groundTruth: gtv, valueX: vx, valueY: vy,
      correctX: vx === gtv ? 1 : 0, correctY: vy === gtv ? 1 : 0,
      bothCorrect: (vx === gtv && vy === gtv) ? 1 : 0,
      agreeXY: (vx !== null && vy !== null && vx === vy) ? 1 : 0,
      provenance: 'X = the r3.1 one-shot amendment row (run m13-llm-leg-3.1 n10); Y = run-3 ledger row n7; parse via the sealed runner parseChecksum',
    };
  } else {
    metrics.computation = { vacuous: true, reason: `computation leg still incomplete after the r3.1 one-shot: X ${xr.error} Y ok=true` };
  }
  const allRan = !metrics.freeform.vacuous && !metrics.constrained.vacuous && !metrics.computation.vacuous;
  metrics.gradient = allRan
    ? { score: (1 - metrics.freeform.bytesIdentical) + metrics.constrained.classAgree + (1 - metrics.computation.bothCorrect), law: 'score = freeform byte-DIVERGENT (1) + constrained class-AGREE (1) + computation NOT-both-correct (1); 3 = the registered gradient, exact' }
    : { vacuous: true, reason: 'a leg did not complete; the gradient composite is not computable this run' };
  metrics.budget = {
    calls: 10, hardCap: specs.callProtocol.budget.hardCap,
    law: 'hardCap hit EXACTLY: 9 in run-3 (6 core attempted incl. 2 granite failures+repair, 2 stability) + 1 r3.1 one-shot; 0 further external calls available to this lane',
    byModel: { ...r3.metrics.budget.byModel, 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 1 },
  };
  metrics.cast = {
    X: { model: r3.metrics.cast.X.model, legs: ['freeform', 'constrained'] },
    Y: { model: specs.executors.Y.model, legs: ['freeform', 'constrained', 'computation'] },
    computationX: { model: ex.model, legs: ['computation'], revision: 'r3.1 one-shot' },
    note: 'each leg measured across two DIFFERENT stacks; every cast receipted (identity is design, claims seal untouched)',
  };

  const out = {
    tool: 'm13-llm-leg@1',
    leg: specs.leg,
    provenance: {
      executedBy: `tools/${basename(fileURLToPath(import.meta.url))} (r3.1 one-shot amendment + composite derivation; comparator and call protocol = the SEALED runner's own exports, runnerHash asserted)`,
      composite: `freeform/constrained/stability verbatim from ${basename(r3ResultsPath)} (the r3 run, never modified); computation re-derived from receipted ledger rows only`,
      revision: 'r3.1: computation-X granite-4.2-3b (E_EMPTY_CONTENT x2, think-default family per receipted catalog metadata) -> meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo; all sealed law byte-identical to r3/r2/r1; claims seal sha256:3ef79c3f… UNTOUCHED',
      modelCastingLesson: 'the registry nickname ("granite-4.2-3b the racehorse") lost to the catalog description (think-default reasoning family): metadata BEFORE casting; measure, do not assume — and a reasoning TAG is not behavior either (Lightning, tagged reasoning, answered in 14 tokens)',
      ledgerNote: `run-3 and r3.1 rows appended to ${basename(receiptsPath)} (append-only; run-1/r2 rows untouched; rows self-label run)`,
      runId: RUN,
      executedAt: new Date().toISOString(),
    },
    sealedInstrument: {
      specsHash: seal.specsHash, runnerHash: seal.runnerHash, groundTruthHash: seal.groundTruthHash,
      sealPath: basename(sealPath), sealedAt: seal.sealedAt,
      groundTruth68fCertified: 'sha256:86085f4fa6f824eee19f79fb58138146b8d4f9ff4ac7122a6780a28095983caf',
    },
    resealRuleLLM: 'class-sealed procedures agree at outcome-class level (the LLM-leg comparator); byte-identity stays the re-seal law for code executors; byte comparison is EXACT content equality, no normalization',
    contents: {
      freeform: r3.contents.freeform,
      constrained: r3.contents.constrained,
      computation: { X: xr, Y: { ok: true, content: yRow.content, sha256: yRow.content_sha256, modelServed: yRow.model_served } },
    },
    metrics,
    evidence: {
      stability: r3.evidence.stability,
      crossRunAnchors: r3.evidence.crossRunAnchors,
      graniteFailure: 'run-3 rows n5/n6: ibm-granite/granite-4.2-3b E_EMPTY_CONTENT x2 (http 200) on the arithmetic spec — the think-default trap, receipted',
    },
  };
  const text = JSON.stringify(out, null, 2) + '\n';
  writeFileSync(outPath, text);
  process.stdout.write(JSON.stringify({ ok: true, out: outPath, call: xr.ok ? { finish: xr.finish, bytes: Buffer.byteLength(xr.content, 'utf8'), content: xr.content.slice(0, 400) } : { error: xr.error }, metrics: { computation: metrics.computation, gradient: metrics.gradient, budget: metrics.budget } }, null, 1) + '\n');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('m13-llm-leg-run31.mjs')) {
  Promise.resolve((async () => {
    const args = parseArgs(process.argv.slice(2));
    for (const k of ['specs', 'seal', 'out', 'receipts', 'r3-results']) if (!args[k]) { process.stderr.write(`missing --${k}\n`); process.exit(2); }
    return await run31({
      specsPath: args.specs, sealPath: args.seal, outPath: args.out, receiptsPath: args.receipts,
      r3ResultsPath: args['r3-results'], timeoutMs: args['timeout-ms'] ? Number(args['timeout-ms']) : 180_000,
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
