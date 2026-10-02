#!/usr/bin/env node
// m13-llm-leg.mjs — wave 70-a — THE M13 LLM-EXECUTOR LEG (the registry's
// LLM-executor-scope NULL, folded by measurement).
//
// M13 (lode/mines.jsonl row 13): "procedure value is executor-scoped; nested
// loops must re-seal what they inherit." The 68-f harness (tools/m13-harness.mjs)
// resolved the DETERMINISTIC-executor scope (node/python: NOT executor-scoped
// for the sealed-deterministic class) and left M13's LLM-executor scope open —
// the registry note says it "folds NULL by wave-70 if untested". THIS tool is
// the test.
//
// AN LLM EXECUTOR is an LLM ASKED TO EXECUTE the sealed procedure's SPEC (not
// its code): the executor receives the documented input->output law plus the
// sealed prefix as bytes and must produce the output. Re-seal question: do TWO
// DIFFERENT LLM executors produce byte-identical outputs for a deterministic
// procedure? Registered gradient prediction (seeds/m13-llm-leg-70a.json):
//   * free-form generation  -> byte DIVERGENCE (executor-scoped at byte level),
//     classified by an OUTCOME-CLASS comparator (the LLM-leg analog of the
//     re-seal rule: same outcome class = agreement for class-sealed procedures;
//     byte-sealed stays the law for code executors);
//   * constrained output (exactly one JSON object, sealed enum) -> class
//     agreement, possibly byte agreement;
//   * hand-executed arithmetic (checksum law) -> divergence or failure.
// The gradient IS the finding, either direction it lands.
//
// TWO SEALS RIDE TOGETHER (the 68-f ritual, dogfooded):
//   1. tools/preregister.mjs seals the PREDICTIONS (seeds/m13-llm-leg-70a.json)
//      — committed and pushed BEFORE the scored run;
//   2. THIS tool seals the INSTRUMENT (specs fixture + runner + ground-truth
//      module) and verifies fail-closed at run time: any member touched after
//      sealing refuses BY NAME (E_SPECS_MODIFIED / E_RUNNER_MODIFIED /
//      E_GROUNDTRUTH_MODIFIED). The ground-truth certification additionally
//      requires tools/m13-procs.mjs to still match the 68-f instrument seal
//      (procsHash sha256:86085f4f…) — the checksum law's reference executor is
//      the SEALED module from the previous lane, re-verified at lane open.
//
// BUDGET LAW: hard cap 10 external calls (6 core + 2 stability + <=2 repair).
// EVERY call — including failures — appends a receipt row to the receipts JSONL
// before the next decision. No receipt, no call. No key material ever leaves
// process.env; nothing is printed, nothing is stored.
//
// ZERO shell-out. Zero npm dependencies. node:crypto/fs, global fetch.
// CLI exit: 0 scored · 1 fail-closed (named) · 2 usage.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJSON } from './preregister.mjs';

export const TOOL = 'm13-llm-leg@1';
const HASH_PREFIX = 'sha256:';
const sha256OfBuf = (buf) => HASH_PREFIX + createHash('sha256').update(buf).digest('hex');

export class M13LegError extends Error {
  constructor(name, message) { super(`${name}: ${message}`); this.name = name; this.errName = name; }
}
const fail = (name, msg) => { throw new M13LegError(name, msg); };

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = fileURLToPath(import.meta.url);
// the ground-truth checksum law's reference executor: the module the 68-f
// instrument seal certifies (the scored 68-f run's own procsHash)
export const GROUNDTRUTH_PATH = join(HERE, 'm13-procs.mjs');
export const SEAL_68F_PATH = join(resolve(HERE, '..'), 'seeds', 'm13-harness-68f.instrument-seal.json');
export const EXPECTED_68F_PROCS_HASH = 'sha256:86085f4fa6f824eee19f79fb58138146b8d4f9ff4ac7122a6780a28095983caf';

// ── loading ────────────────────────────────────────────────────────────────
export function loadSpecs(path) {
  let doc;
  try { doc = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { fail('E_SPECS_MALFORMED', `cannot read ${path}: ${e.message}`); }
  if (doc?.schema !== 'm13-llm-leg-specs@1') fail('E_SPECS_MALFORMED', `schema is '${doc?.schema ?? ''}', expected 'm13-llm-leg-specs@1'`);
  for (const k of ['leg', 'sealedPrefix', 'policyLaw', 'specs', 'comparatorRubric', 'executors', 'callProtocol']) {
    if (doc[k] === undefined) fail('E_SPECS_MALFORMED', `specs.${k} is missing`);
  }
  for (const id of ['freeform', 'constrained', 'computation']) {
    if (typeof doc.specs[id]?.prompt !== 'string' || doc.specs[id].prompt.length === 0) {
      fail('E_SPECS_MALFORMED', `specs.${id}.prompt is missing`);
    }
  }
  if (!/^[0-9A-F]{8}$/.test(doc.specs.computation.groundTruth ?? '')) {
    fail('E_SPECS_MALFORMED', 'specs.computation.groundTruth must be 8 hex digits');
  }
  return doc;
}

// ── instrument seal (qcells refuse-stale, LLM-leg instrument level) ────────
export function sealDoc({ specsPath }, note) {
  const seal = {
    tool: TOOL,
    sealedAt: new Date().toISOString(),
    specsHash: sha256OfBuf(readFileSync(specsPath)),
    runnerHash: sha256OfBuf(readFileSync(RUNNER_PATH)),
    groundTruthHash: sha256OfBuf(readFileSync(GROUNDTRUTH_PATH)),
    expected68fProcsHash: EXPECTED_68F_PROCS_HASH,
    paths: { specs: basename(specsPath), runner: basename(RUNNER_PATH), groundTruth: basename(GROUNDTRUTH_PATH) },
  };
  if (note) seal.note = String(note);
  return seal;
}

export function loadLegSeal(path) {
  let seal;
  try { seal = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { fail('E_SEAL_MALFORMED', `cannot read ${path}: ${e.message}`); }
  if (seal?.tool !== TOOL) fail('E_SEAL_MALFORMED', `seal.tool is '${seal?.tool ?? ''}', expected '${TOOL}'`);
  for (const k of ['sealedAt', 'specsHash', 'runnerHash', 'groundTruthHash', 'expected68fProcsHash']) {
    if (typeof seal[k] !== 'string' || seal[k].length === 0) fail('E_SEAL_MALFORMED', `seal.${k} is missing`);
  }
  return seal;
}

export function verifySeal({ specsPath }, seal) {
  const got = (p) => sha256OfBuf(readFileSync(p));
  if (got(specsPath) !== seal.specsHash) {
    fail('E_SPECS_MODIFIED', `specs re-hash ${got(specsPath)} != sealed ${seal.specsHash} — the sealed law was touched after sealing; the run refuses`);
  }
  if (got(RUNNER_PATH) !== seal.runnerHash) {
    fail('E_RUNNER_MODIFIED', `runner re-hash ${got(RUNNER_PATH)} != sealed ${seal.runnerHash} — the executor/comparator code was touched after sealing; the run refuses`);
  }
  if (got(GROUNDTRUTH_PATH) !== seal.groundTruthHash) {
    fail('E_GROUNDTRUTH_MODIFIED', `ground-truth module re-hash != sealed ${seal.groundTruthHash} — the checksum law's reference executor moved after sealing; the run refuses`);
  }
  return true;
}

// ── ground-truth certification (the checksum law's executor is SEALED) ─────
export function certifyGroundTruth(specs) {
  const gtHash = sha256OfBuf(readFileSync(GROUNDTRUTH_PATH));
  if (gtHash !== EXPECTED_68F_PROCS_HASH) {
    fail('E_GROUNDTRUTH_MODIFIED', `tools/m13-procs.mjs re-hash ${gtHash} != the 68-f instrument seal's procsHash ${EXPECTED_68F_PROCS_HASH} — the reference executor is no longer the sealed module; the run refuses`);
  }
  return import(pathToFileURL(GROUNDTRUTH_PATH)).then((mod) => {
    const computed = mod.fnv1a32(specs.specs.computation.checksumInput);
    const hex = computed.toString(16).toUpperCase().padStart(8, '0');
    if (hex !== specs.specs.computation.groundTruth) {
      fail('E_GROUNDTRUTH_MODIFIED', `sealed fnv1a32('${specs.specs.computation.checksumInput}') = ${hex} != fixture groundTruth ${specs.specs.computation.groundTruth} — the sealed law and the sealed module disagree; the run refuses`);
    }
    return hex;
  });
}

// ── the outcome-class comparator (the LLM-leg re-seal rule) ────────────────
// byte law: EXACT content equality, NO normalization — executor noise IS the
// finding. The only canonicalization in the leg is applied AFTER parsing a
// constrained object, for the descriptive canonBytesIdentical metric.
export function byteEq(a, b) {
  return Buffer.compare(Buffer.from(a ?? '', 'utf8'), Buffer.from(b ?? '', 'utf8')) === 0;
}

const FREEFORM_ENUM = ['deny+store-credit', 'manager-review', 'deny-only'];

// first balanced {...}, quote/escape-aware; first object wins
export function firstBalancedObject(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

const OUTCOME_ENUM = ['full-refund', 'store-credit', 'manager-review'];

export function parseConstrained(content) {
  const raw = firstBalancedObject(String(content ?? ''));
  if (raw === null) return { parsed: false, outcome: null, canon: null };
  let obj;
  try { obj = JSON.parse(raw); } catch { return { parsed: false, outcome: null, canon: null }; }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return { parsed: false, outcome: null, canon: null };
  const keys = Object.keys(obj);
  const legal = keys.length === 1 && keys[0] === 'outcome' && OUTCOME_ENUM.includes(obj.outcome);
  return { parsed: legal, outcome: legal ? obj.outcome : null, canon: legal ? canonicalJSON(obj) : null };
}

export function classifyFreeform(content, rubric) {
  const text = String(content ?? '');
  const rx = (k) => new RegExp(rubric.freeformSignals[k], 'i'); // patterns stored bare in the fixture; case-insensitive by law
  const refusal = rx('refusal').test(text);
  const credit = rx('storeCredit').test(text);
  const manager = rx('manager').test(text);
  let cls = 'other';
  if (refusal && credit) cls = 'deny+store-credit';
  else if (manager && !credit) cls = 'manager-review';
  else if (refusal) cls = 'deny-only';
  return { cls, signals: { refusal, storeCredit: credit, manager } };
}

export function parseChecksum(content) {
  const m = String(content ?? '').match(/CHECKSUM\s*=\s*([0-9A-Fa-f]{8})/);
  return m ? m[1].toUpperCase() : null;
}

// ── executor clients (receipted; keys runtime-only, never echoed) ──────────
export const CLIENTS = {
  deepinfra: {
    envKey: 'DEEPINFRA_API_KEY',
    endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
  },
  typesafe: {
    envKey: 'TYPESAFE_API_KEY',
    endpoint: 'https://api.typesafe.ai/v1/chat/completions',
  },
  kimi: {
    envKey: 'KIMI_API_KEY',
    endpoint: 'https://api.moonshot.ai/v1/chat/completions',
  },
};

export async function chatCall(provider, model, prompt, { temperature = 0, maxTokens = 1024, timeoutMs = 180_000, sendTemperature = true } = {}) {
  const client = CLIENTS[provider];
  const key = process.env[client.envKey];
  if (!key) { const e = new M13LegError('E_CHANNEL_CLOSED', `${client.envKey} missing — ${provider} channel closed (fail-closed)`); e.noRetry = true; throw e; }
  const body = { model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens };
  if (sendTemperature) body.temperature = temperature;
  const t0 = Date.now();
  let res, payload;
  try {
    res = await fetch(client.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    payload = await res.json().catch(() => ({}));
  } catch (e) {
    const err = new M13LegError('E_TRANSPORT', `${provider} transport failure: ${e.message}`);
    err.http = null;
    throw err;
  }
  const latencyMs = Date.now() - t0;
  if (!res.ok) {
    const err = new M13LegError('E_HTTP', `${provider} HTTP ${res.status}: ${JSON.stringify(payload).slice(0, 200)}`);
    err.http = res.status;
    err.paramRejection = (res.status === 400 || res.status === 422) && sendTemperature; // the pre-declared minimal repair
    throw err;
  }
  const content = payload.choices?.[0]?.message?.content ?? null;
  if (typeof content !== 'string' || content.length === 0) {
    const err = new M13LegError('E_EMPTY_CONTENT', `${provider} returned no content`);
    err.http = res.status;
    throw err;
  }
  return { content, modelServed: payload.model ?? model, usage: payload.usage ?? null, finish: payload.choices?.[0]?.finish_reason ?? null, latencyMs };
}

// ── receipts (append-only; one row per external attempt, failures too) ─────
export function receiptWriter(receiptsPath) {
  const exists = existsSync(receiptsPath);
  const append = (row) => appendFileSync(receiptsPath, JSON.stringify(row) + '\n');
  return { exists, append };
}

export function headerRow(specs, seal, claimsPath, claimsSealPath) {
  return {
    row: 'run-header',
    schema: 'm13-llm-leg-receipt@1',
    run: specs.runId ?? 'm13-llm-leg-1', // runId added by instrument revision r2 (receipted); default preserves r1 behavior
    leg: specs.leg,
    task: '70-a',
    mine: 'M13 (lode/mines.jsonl row 13) — LLM-executor scope: the registry NULL this leg folds by measurement',
    claims: claimsPath,
    claimsSeal: claimsSealPath,
    instrumentSeal: seal,
    executors: {
      X: { provider: specs.executors.X.provider, model: specs.executors.X.model },
      Y: { provider: specs.executors.Y.provider, model: specs.executors.Y.model, fallback: specs.executors.Yfallback.provider },
    },
    resealRuleLLM: 'class-sealed procedures agree at OUTCOME-CLASS level (the LLM-leg comparator); byte-identity stays the re-seal law for code executors; byte comparison is EXACT content equality, no normalization',
    budget: specs.callProtocol.budget,
    discipline: 'one receipt row per external attempt (failures included); keys runtime-only; no key material in any artifact; lode/ untouched',
  };
}

// ── the scored run ─────────────────────────────────────────────────────────
const VACUOUS = (reason) => ({ vacuous: true, reason });

export async function runLegs({ specsPath, sealPath, outPath, receiptsPath, claimsPath, claimsSealPath, timeoutMs = 180_000 }) {
  const specs = loadSpecs(specsPath);
  const seal = loadLegSeal(sealPath);
  verifySeal({ specsPath }, seal); // fail-closed BEFORE anything executes
  await certifyGroundTruth(specs); // the checksum law's executor must be the 68-f-certified module

  const rw = receiptWriter(receiptsPath);
  if (!rw.exists) rw.append(headerRow(specs, seal, claimsPath, claimsSealPath));

  const budget = specs.callProtocol.budget;
  let calls = 0;
  const byProvider = {};
  const capLeft = () => budget.hardCap - calls;

  const callWithReceipt = async (leg, slot, spec, attemptNote) => {
    const provider = specs.executors[slot].provider;
    const model = specs.executors[slot].model;
    const attempt = {
      row: 'llm-call', n: calls + 1, at_utc: new Date().toISOString(), leg, slot,
      provider, model_requested: model, ...attemptNote,
    };
    calls++;
    byProvider[provider] = (byProvider[provider] ?? 0) + 1;
    const usageOf = (u) => u ? Object.fromEntries(Object.entries(u).filter(([, v]) => typeof v === 'number')) : null;
    try {
      const r = await chatCall(provider, model, spec.prompt, { maxTokens: spec.maxTokens, timeoutMs });
      rw.append({ ...attempt, ok: true, model_served: r.modelServed, usage: usageOf(r.usage), finish: r.finish, latency_ms: r.latencyMs, content_sha256: sha256OfBuf(Buffer.from(r.content, 'utf8')), content_bytes_len: Buffer.byteLength(r.content, 'utf8'), content: r.content });
      return { ok: true, content: r.content, modelServed: r.modelServed, usage: r.usage, finish: r.finish };
    } catch (e) {
      const repairable = e instanceof M13LegError && (e.errName === 'E_TRANSPORT' || e.errName === 'E_EMPTY_CONTENT' || (e.errName === 'E_HTTP' && e.paramRejection)) && capLeft() > 0;
      rw.append({ ...attempt, ok: false, error: e.errName, message: String(e.message).slice(0, 300), http: e.http ?? null, repairable });
      if (!repairable) return { ok: false, error: e.errName };
      // ONE pre-declared repair attempt: drop temperature on param rejection, straight retry otherwise
      const dropTemp = e.errName === 'E_HTTP' && e.paramRejection;
      const n2 = {
        row: 'llm-call', n: calls + 1, at_utc: new Date().toISOString(), leg, slot,
        provider, model_requested: model, repair_of: attempt.n, repair: dropTemp ? 'drop-temperature' : 'straight-retry',
      };
      calls++;
      byProvider[provider] = (byProvider[provider] ?? 0) + 1;
      try {
        const r = await chatCall(provider, model, spec.prompt, { maxTokens: spec.maxTokens, timeoutMs, sendTemperature: !dropTemp });
        rw.append({ ...n2, ok: true, model_served: r.modelServed, usage: usageOf(r.usage), finish: r.finish, latency_ms: r.latencyMs, content_sha256: sha256OfBuf(Buffer.from(r.content, 'utf8')), content_bytes_len: Buffer.byteLength(r.content, 'utf8'), content: r.content });
        return { ok: true, content: r.content, modelServed: r.modelServed, usage: r.usage, finish: r.finish };
      } catch (e2) {
        rw.append({ ...n2, ok: false, error: e2.errName, message: String(e2.message).slice(0, 300), http: e2.http ?? null });
        return { ok: false, error: e2.errName };
      }
    }
  };

  // run one leg for one executor SLOT, honoring the named Y-fallback
  const runSlot = async (leg, spec, slot) => {
    if (capLeft() <= 0) {
      rw.append({ row: 'llm-call', leg, slot, skipped: 'budget-cap-exhausted', ok: false });
      return { ok: false, error: 'budget-cap' };
    }
    const r = await callWithReceipt(leg, slot, spec, { attempt: 1 });
    if (r.ok) return { ...r, slotUsed: slot };
    if (slot === 'Y' && specs.executors.Yfallback && capLeft() > 0) {
      rw.append({ row: 'fallback-note', leg, from: 'Y', to: 'Yfallback', reason: r.error ?? 'unknown' });
      const rf = await callWithReceipt(leg, 'Yfallback', spec, { attempt: 1, fallback_of: 'Y' });
      return { ...rf, slotUsed: rf.ok ? 'Yfallback' : slot };
    }
    return { ...r, slotUsed: slot };
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

  // ── comparator (the pre-registered rubric; exact sealed law) ──────────────
  const rubric = specs.comparatorRubric;
  const metrics = {};
  const evidence = { stability };

  // freeform
  {
    const { X, Y } = results.freeform;
    if (X.ok && Y.ok) {
      const cx = classifyFreeform(X.content, rubric);
      const cy = classifyFreeform(Y.content, rubric);
      const named = (c) => FREEFORM_ENUM.includes(c.cls);
      metrics.freeform = {
        bytesIdentical: byteEq(X.content, Y.content) ? 1 : 0,
        classAgree: named(cx) && named(cy) && cx.cls === cy.cls ? 1 : 0,
        classX: cx.cls, classY: cy.cls,
        signalsX: cx.signals, signalsY: cy.signals,
        contentBytesX: Buffer.byteLength(X.content, 'utf8'),
        contentBytesY: Buffer.byteLength(Y.content, 'utf8'),
      };
    } else {
      metrics.freeform = VACUOUS(`freeform leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
    }
  }
  // constrained
  {
    const { X, Y } = results.constrained;
    if (X.ok && Y.ok) {
      const px = parseConstrained(X.content);
      const py = parseConstrained(Y.content);
      metrics.constrained = {
        bytesIdentical: byteEq(X.content, Y.content) ? 1 : 0,
        canonBytesIdentical: px.canon !== null && py.canon !== null && byteEq(px.canon, py.canon) ? 1 : 0,
        bothParsed: (px.parsed && py.parsed) ? 1 : 0,
        parsedX: px.parsed ? 1 : 0, parsedY: py.parsed ? 1 : 0,
        outcomeX: px.outcome, outcomeY: py.outcome,
        classAgree: (px.parsed && py.parsed && px.outcome === py.outcome) ? 1 : 0,
      };
    } else {
      metrics.constrained = VACUOUS(`constrained leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
    }
  }
  // computation
  {
    const { X, Y } = results.computation;
    const gt = specs.specs.computation.groundTruth;
    if (X.ok && Y.ok) {
      const vx = parseChecksum(X.content);
      const vy = parseChecksum(Y.content);
      metrics.computation = {
        groundTruth: gt,
        valueX: vx, valueY: vy,
        correctX: vx === gt ? 1 : 0,
        correctY: vy === gt ? 1 : 0,
        bothCorrect: (vx === gt && vy === gt) ? 1 : 0,
        agreeXY: (vx !== null && vy !== null && vx === vy) ? 1 : 0,
      };
    } else {
      metrics.computation = VACUOUS(`computation leg incomplete: X ok=${!!X.ok} (${X.error ?? ''}) Y ok=${!!Y.ok} (${Y.error ?? ''})`);
    }
  }
  // the gradient composite (only computable when every leg ran)
  const allRan = !metrics.freeform.vacuous && !metrics.constrained.vacuous && !metrics.computation.vacuous;
  metrics.gradient = allRan
    ? {
        score: (1 - metrics.freeform.bytesIdentical) + metrics.constrained.classAgree + (1 - metrics.computation.bothCorrect),
        law: 'score = freeform byte-DIVERGENT (1) + constrained class-AGREE (1) + computation NOT-both-correct (1); 3 = the registered gradient, exact',
      }
    : VACUOUS('a leg did not complete; the gradient composite is not computable this run');
  metrics.budget = { calls, hardCap: budget.hardCap, byProvider };
  metrics.channels = {
    X: { provider: specs.executors.X.provider, model: specs.executors.X.model, ok: results.freeform.X.ok },
    Y: { provider: (results.freeform.Y.slotUsed === 'Yfallback' ? specs.executors.Yfallback.provider : specs.executors.Y.provider), model_requested: specs.executors.Y.model, ok: results.freeform.Y.ok, slotUsed: results.freeform.Y.slotUsed ?? null },
  };
  metrics.slotUsage = Object.fromEntries(Object.entries(results).map(([leg, r]) => [leg, { X: r.X.slotUsed ?? null, Y: r.Y.slotUsed ?? null }]));

  const out = {
    tool: TOOL,
    leg: specs.leg,
    sealedInstrument: {
      specsHash: seal.specsHash, runnerHash: seal.runnerHash, groundTruthHash: seal.groundTruthHash,
      sealPath: basename(sealPath), sealedAt: seal.sealedAt,
      groundTruth68fCertified: EXPECTED_68F_PROCS_HASH,
    },
    resealRuleLLM: 'class-sealed procedures agree at outcome-class level (the LLM-leg comparator); byte-identity stays the re-seal law for code executors; byte comparison is EXACT content equality, no normalization',
    contents: results,
    metrics,
    evidence,
  };
  const text = JSON.stringify(out, null, 2) + '\n';
  if (outPath) writeFileSync(outPath, text);
  process.stdout.write(text);
  return 0;
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
    '  m13-llm-leg.mjs seal --specs=<f> --out=<s.json> [--note=<t>]',
    '  m13-llm-leg.mjs verify --specs=<f> --seal=<s.json>',
    '  m13-llm-leg.mjs run --specs=<f> --seal=<s.json> --out=<results.json> --receipts=<r.jsonl> --claims=<c.json> --claims-seal=<cs.json>',
    'exit: 0 scored (not "all passed") · 1 fail-closed (named) · 2 usage. budget hard cap 10 external calls; every attempt receipted.',
  ].join('\n') + '\n');
}

function cmdSeal(args) {
  const seal = sealDoc({ specsPath: needArg(args, 'specs') }, args.note);
  const text = JSON.stringify(seal, null, 2) + '\n';
  writeFileSync(needArg(args, 'out'), text);
  process.stdout.write(text);
  return 0;
}
function cmdVerify(args) {
  const seal = loadLegSeal(needArg(args, 'seal'));
  verifySeal({ specsPath: needArg(args, 'specs') }, seal);
  process.stdout.write(JSON.stringify({ ok: true, specsHash: seal.specsHash, runnerHash: seal.runnerHash, groundTruthHash: seal.groundTruthHash, sealedAt: seal.sealedAt }) + '\n');
  return 0;
}
function cmdRun(args) {
  return runLegs({
    specsPath: needArg(args, 'specs'),
    sealPath: needArg(args, 'seal'),
    outPath: needArg(args, 'out'),
    receiptsPath: needArg(args, 'receipts'),
    claimsPath: needArg(args, 'claims'),
    claimsSealPath: needArg(args, 'claims-seal'),
  });
}
export function main(argv) {
  const [cmd, ...rest] = argv;
  let args;
  try { args = parseArgs(rest); } catch (e) {
    if (e instanceof M13LegError && e.errName === 'E_USAGE') { process.stderr.write(`${e.message}\n`); usage(); return 2; }
    throw e;
  }
  switch (cmd) {
    case 'seal': return cmdSeal(args);
    case 'verify': return cmdVerify(args);
    case 'run': return cmdRun(args);
    case 'help': case '--help': case undefined: usage(); return cmd === undefined ? 2 : 0;
    default:
      process.stderr.write(`unknown command '${cmd}'\n`); usage(); return 2;
  }
}
export function run() {
  Promise.resolve(main(process.argv.slice(2))).then(
    (code) => process.exit(code),
    (e) => {
      if (e instanceof M13LegError) {
        process.stderr.write(JSON.stringify({ ok: false, error: e.errName, message: e.message }) + '\n');
        process.exit(1);
      }
      process.stderr.write(JSON.stringify({ ok: false, error: 'E_INTERNAL', message: String(e && e.stack || e) }) + '\n');
      process.exit(1);
    },
  );
}
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('m13-llm-leg.mjs')) {
  run();
}
