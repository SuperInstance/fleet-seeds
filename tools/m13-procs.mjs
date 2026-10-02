#!/usr/bin/env node
// m13-procs.mjs — wave 68-f — THE INHERITED PROCEDURES under the M13 re-seal.
//
// M13 (lode/mines.jsonl row 13): "procedure value is executor-scoped; nested
// loops must re-seal what they inherit." This module holds the procedures the
// m13-harness re-seals across executors. Every procedure is a deterministic
// function of an INHERITED SEALED PREFIX {seed, constants, priorState} — the
// shape a nested self-improvement loop receives from its parent — except the
// positive control, which deliberately reads executor-adjacent entropy.
//
// PORTABILITY LAW: emits are integers, booleans and ASCII strings ONLY, so
// the arithmetic is bit-exact across node and python3:
//   * uint32 domain everywhere: JS (Math.imul(a,x)+c)>>>0 == python (a*x+c)%2**32
//   * FNV-1a-32 over ASCII bytes: JS charCodeAt == python s.encode('ascii') bytes
//   * emits are serialized with the fleet canonicalJSON dialect (recursive
//     key-sort, raw non-ASCII, JSON.stringify semantics) — python port mirrors
//     it (ensure_ascii=False), never json.dumps defaults (the 67-a gotcha).
//
// The three procedures (classes named in PROC_META):
//   battery-eval   sealed, portable  — a scoring loop over the inherited
//                    prefix (the LLM-battery analog at instrument scale):
//                    LCG stream from seed, accumulator folded with priorState,
//                    score = acc % 1000, verdict accept/reject vs threshold.
//   qrng-pick      sealed, portable  — the engine run-8 shape: priors have a
//                    pick; a certified draw (the seed, CARRIED IN THE SEAL)
//                    either overrides it or not. Entropy is external, bound in
//                    the prefix — never drawn from the executor.
//   wallclock-leak unsealed, node-only — the positive control: reads
//                    Date.now() + unseeded Math.random() WITHOUT any seal.
//                    Executor-scoped BY CONSTRUCTION. Node-only deliberately:
//                    a python port would diverge on string formatting, which
//                    proves nothing — the harness's executor-C for this class
//                    is node with --random-seed variation (mission's fallback),
//                    isolating the entropy mechanism instead.
//
// ZERO NETWORK. stdlib only. Import of preregister.mjs is for the canonical
// dialect (one source of truth for the byte law).

import { canonicalJSON } from './preregister.mjs';

export const PROC_IDS = ['battery-eval', 'qrng-pick', 'wallclock-leak'];

export const PROC_META = {
  'battery-eval': { class: 'sealed', portable: true },
  'qrng-pick': { class: 'sealed', portable: true },
  'wallclock-leak': { class: 'unsealed', portable: false },
};

// ── portable uint32 arithmetic (the cross-language bit law) ───────────────
const LCG_A = 1664525;
const LCG_C = 1013904223;

export function lcgNext(x) {
  return (Math.imul(LCG_A, x) + LCG_C) >>> 0;
}

export function fnv1a32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ── the procedures ─────────────────────────────────────────────────────────
export function batteryEval(prefix) {
  const { seed, constants, priorState } = prefix;
  let x = seed >>> 0;
  let acc = priorState.acc >>> 0;
  const trace = [];
  for (let i = 1; i <= constants.steps; i++) {
    x = lcgNext(x);
    acc = ((acc ^ x) + Math.imul(constants.w1, i) + constants.w2) >>> 0;
    if (i === 1 || i === Math.floor(constants.steps / 2) || i === constants.steps) trace.push(acc);
  }
  const score = acc % 1000;
  const verdict = score >= constants.threshold ? 'accept' : 'reject';
  return {
    id: 'battery-eval',
    class: 'sealed',
    score,
    verdict,
    steps: constants.steps,
    finalX: x,
    acc,
    trace,
  };
}

export function qrngPick(prefix) {
  const { seed, constants } = prefix;
  let x = seed >>> 0;
  const draws = [];
  for (let i = 0; i < 8; i++) { x = lcgNext(x); draws.push(x % 100); }
  const c = constants.candidates;
  const scores = [];
  for (let k = 0; k < c; k++) scores.push(draws[k * 2] + draws[k * 2 + 1]);
  let pick = 0;
  for (let k = 1; k < c; k++) if (scores[k] > scores[pick]) pick = k; // tie-break: lowest index
  const override = pick !== constants.priorsPick;
  return {
    id: 'qrng-pick',
    class: 'sealed',
    draws,
    scores,
    pick,
    priorsPick: constants.priorsPick,
    override,
    verdict: override ? 'override' : 'uphold',
    drawFnv: fnv1a32(draws.join(',')),
  };
}

export function wallclockLeak() {
  const now = Date.now();
  const r = Math.random();
  return {
    id: 'wallclock-leak',
    class: 'unsealed',
    wallMs: now,
    wallBucket: now % 86400000,
    iso: new Date(now).toISOString(),
    entropyHex: r.toString(16).slice(2, 12),
  };
}

export function runProcedure(id, prefix) {
  switch (id) {
    case 'battery-eval': return batteryEval(prefix);
    case 'qrng-pick': return qrngPick(prefix);
    case 'wallclock-leak': return wallclockLeak();
    default: throw new Error(`E_UNKNOWN_PROC: '${id}' not in [${PROC_IDS.join(', ')}]`);
  }
}

// The byte law: every executor emits canonicalJSON(emit) + '\n' — nothing else
// on stdout. Executor noise (warnings, debug prints) shows up as divergence:
// fail-visible, never silently tolerated.
export function emitLine(emit) {
  return canonicalJSON(emit) + '\n';
}
