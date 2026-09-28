#!/usr/bin/env node
// scripts/g7_validate.mjs — G7 watt-receipt validator.
//
// Companion to docs/G7-WATT-RECEIPTS.md (schema g7-watt-receipt@1). Stdlib-only
// (node:fs, node:os, node:path, node:url). No network. No deps. node >= 18.
//
// Usage:
//   node scripts/g7_validate.mjs <receipt.json>   exit 0 = schema-valid receipt (gate admits it)
//                                                 exit 1 = refused; every reason printed (gate: run VOID)
//   node scripts/g7_validate.mjs --selftest       exercises the control battery; every expected
//                                                 refusal must refuse and every valid control must
//                                                 pass. Prints "selftest: N/N controls ...".
//
// Gate law (GPU-AGENT-PLAYBOOK G7): "no receipt → run VOID". Exit 1 on a receipt file = the gate
// refusing the receipt = the run it describes ships no verdict. Fail-closed: an unreadable file,
// a parse error, or ANY failed check is a refusal, never a warning.
//
// This file is honest tooling, not a receipt: it performs zero GPU compute (CPU-only lane tool,
// wave 53 lane 53-f) and therefore ships no watt-receipt of its own.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCHEMA_ID = "g7-watt-receipt@1";
const GATE_RULE_VERBATIM = "no receipt → run VOID";
const ENERGY_SOURCES = ["measured", "estimated", "tdp_derived"];
const VERDICTS = ["PASS", "VOID"];
const WH_TOLERANCE = 0.02; // |joules/3600 - watt_hours| <= 2% of watt_hours

// ---------------------------------------------------------------- checking machinery
const reasons = [];
const info = [];
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string";

function req(cond, msg) { if (!cond) reasons.push(msg); return cond; }

function validateReceipt(receipt) {
  // -- top level ----------------------------------------------------------------
  if (!req(isObj(receipt), "top level: file must contain a single JSON object (one receipt per file)")) return;
  const known = new Set(["schema", "receipt_id", "task_id", "agent", "device", "energy",
    "compute", "cost", "determinism", "gate"]);
  for (const k of Object.keys(receipt)) {
    if (!known.has(k)) info.push(`info: unknown field '${k}' tolerated (not schema-checked)`);
  }
  if (receipt.schema !== undefined) {
    req(receipt.schema === SCHEMA_ID, `schema: expected '${SCHEMA_ID}' if present, got ${JSON.stringify(receipt.schema)}`);
  }
  req(isStr(receipt.receipt_id) && receipt.receipt_id.trim() !== "",
    "receipt_id: required non-empty string");
  req(isStr(receipt.task_id) && receipt.task_id.trim() !== "",
    "task_id: required non-empty string");
  req(isStr(receipt.agent) && receipt.agent.trim() !== "",
    "agent: required non-empty string");

  // -- device -------------------------------------------------------------------
  if (req(isObj(receipt.device), "device: required object {model, vram_gb, driver}")) {
    const d = receipt.device;
    req(isStr(d.model) && d.model.trim() !== "", "device.model: required non-empty string");
    req(isNum(d.vram_gb) && d.vram_gb > 0, "device.vram_gb: required number > 0");
    req(isStr(d.driver) && d.driver.trim() !== "", "device.driver: required non-empty string");
  }

  // -- energy (THE gate block: absent/invalid energy is the canonical refusal) ----
  if (req(isObj(receipt.energy),
    "energy: required block missing — the gate refuses this receipt (rule: no receipt → run VOID); " +
    "a receipt that cannot say what the run cost in energy is not a receipt")) {
    const e = receipt.energy;
    req(isNum(e.joules) && e.joules >= 0, "energy.joules: required number >= 0");
    req(isNum(e.watt_hours) && e.watt_hours >= 0, "energy.watt_hours: required number >= 0");
    if (isNum(e.joules) && e.joules >= 0 && isNum(e.watt_hours) && e.watt_hours > 0) {
      const drift = Math.abs(e.joules / 3600 - e.watt_hours) / e.watt_hours;
      req(drift <= WH_TOLERANCE,
        `energy: joules/3600 = ${(e.joules / 3600).toFixed(6)} kWh vs watt_hours = ${e.watt_hours} ` +
        `drift ${(drift * 100).toFixed(2)}% exceeds ${WH_TOLERANCE * 100}% tolerance — the two must agree`);
    }
    req(ENERGY_SOURCES.includes(e.source),
      `energy.source: must be one of ${ENERGY_SOURCES.join(" | ")}, got ${JSON.stringify(e.source)}`);
    req(isStr(e.sampling_method) && e.sampling_method.trim() !== "",
      "energy.sampling_method: required non-empty string (how energy was sampled/integrated over the run)");
    // honesty rule 1: estimated/tdp_derived MUST say estimated + derivation
    if (e.source === "estimated" || e.source === "tdp_derived") {
      req(isStr(e.derivation) && e.derivation.trim() !== "",
        `energy.derivation: REQUIRED for source='${e.source}' — honesty rule: estimated energy must ` +
        "carry its arithmetic (assumptions: TDP value, duty factor, wall window), not a vibe");
    }
    if (e.source === "measured") {
      // honesty rule 2: measured MUST name the instrument
      req(isStr(e.instrument) && e.instrument.trim() !== "",
        "energy.instrument: REQUIRED for source='measured' — honesty rule: measured energy must name " +
        "the instrument ('I measured it' is not an instrument)");
    }
  }

  // -- compute ------------------------------------------------------------------
  if (req(isObj(receipt.compute), "compute: required object {gpu_seconds, kernel_count?}")) {
    const c = receipt.compute;
    req(isNum(c.gpu_seconds) && c.gpu_seconds >= 0, "compute.gpu_seconds: required number >= 0");
    if (c.kernel_count !== undefined) {
      req(Number.isInteger(c.kernel_count) && c.kernel_count >= 0,
        "compute.kernel_count: optional, but if present must be integer >= 0");
    }
  }

  // -- cost ---------------------------------------------------------------------
  if (req(isObj(receipt.cost), "cost: required object {currency, amount, rate_source}")) {
    const c = receipt.cost;
    req(isStr(c.currency) && /^[A-Z]{3}$/.test(c.currency),
      `cost.currency: required ISO-4217 3 uppercase letters, got ${JSON.stringify(c.currency)}`);
    req(isNum(c.amount) && c.amount >= 0, "cost.amount: required number >= 0");
    req(isStr(c.rate_source) && c.rate_source.trim() !== "",
      "cost.rate_source: required non-empty string (where the rate came from)");
  }

  // -- determinism ----------------------------------------------------------------
  if (req(isObj(receipt.determinism), "determinism: required object {seed, state_digest}")) {
    const det = receipt.determinism;
    const seedOk = (isStr(det.seed) && det.seed.trim() !== "") || isNum(det.seed);
    req(seedOk, "determinism.seed: required non-empty string or number");
    req(isStr(det.state_digest) && /^[0-9a-f]{64}$/.test(det.state_digest),
      "determinism.state_digest: required 64 lowercase hex chars (sha256 of the bound run-state artifact)");
  }

  // -- gate ---------------------------------------------------------------------
  if (req(isObj(receipt.gate), "gate: required object {rule, verdict}")) {
    const g = receipt.gate;
    req(g.rule === GATE_RULE_VERBATIM,
      `gate.rule: drift detected — must be exactly ${JSON.stringify(GATE_RULE_VERBATIM)}, ` +
      `got ${JSON.stringify(g.rule)} (the registered gate rule is never rewritten quietly)`);
    req(VERDICTS.includes(g.verdict),
      `gate.verdict: must be one of ${VERDICTS.join(" | ")}, got ${JSON.stringify(g.verdict)}`);
  }
}

// ---------------------------------------------------------------- selftest (control battery)
// Controls run through the exact same validateReceipt() path as the CLI; the expectRefuse=true
// rows are additionally written to a temp dir first to mirror the file-based flow.
function makeValid(over = {}) {
  return {
    schema: SCHEMA_ID,
    receipt_id: "g7-wr-selftest-000",
    task_id: "53-f",
    agent: "selftest (g7_validate)",
    device: { model: "NVIDIA GeForce RTX 4090", vram_gb: 24, driver: "550.54.15 / CUDA 12.4" },
    energy: {
      joules: 43200, watt_hours: 12, source: "measured",
      sampling_method: "nvidia-smi power.draw at 1 Hz over the whole run; mean x wall_s / 3600",
      instrument: "nvidia-smi (NVML power.draw)",
      derivation: null
    },
    compute: { gpu_seconds: 43.2, kernel_count: 1204 },
    cost: { currency: "USD", amount: 0.144, rate_source: "grid $0.12/kWh host marginal rate" },
    determinism: { seed: "moth-seal comet-qrng-v1 2026-09-28T00:00:00Z", state_digest: "a".repeat(64) },
    gate: { rule: GATE_RULE_VERBATIM, verdict: "PASS" },
    ...over
  };
}

function selftest() {
  const dir = join(tmpdir(), `g7-selftest-${process.pid}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const controls = [
    // [name, receipt, expectRefuse]
    ["valid-measured", makeValid(), false],
    ["valid-estimated-with-derivation", makeValid({
      receipt_id: "g7-wr-selftest-001",
      energy: { joules: 36000, watt_hours: 10, source: "estimated",
        sampling_method: "no sampling — wall clock x nameplate estimate",
        instrument: null,
        derivation: "450 W TDP x 0.55 duty factor x 145 s wall / 3600 = 9.99 Wh; duty factor from nvidia-smi spot samples" }
    }), false],
    ["void-missing-energy", (() => { const r = makeValid(); delete r.energy; return r; })(), true],
    ["measured-without-instrument", makeValid({
      energy: { joules: 1000, watt_hours: 0.278, source: "measured",
        sampling_method: "nvidia-smi", instrument: "", derivation: null }
    }), true],
    ["estimated-without-derivation", makeValid({
      energy: { joules: 1000, watt_hours: 0.278, source: "estimated",
        sampling_method: "guess", instrument: null, derivation: null }
    }), true],
    ["tdp-derived-without-derivation", makeValid({
      energy: { joules: 1000, watt_hours: 0.278, source: "tdp_derived",
        sampling_method: "tdp x wall", instrument: null, derivation: null }
    }), true],
    ["bad-energy-source", makeValid({
      energy: { joules: 1000, watt_hours: 0.278, source: "vibes", sampling_method: "n/a", derivation: "n/a" }
    }), true],
    ["joules-watthours-inconsistent", makeValid({
      energy: { joules: 3.6e6, watt_hours: 1.0, source: "measured",
        sampling_method: "nvidia-smi", instrument: "nvidia-smi (NVML)", derivation: null }
    }), true],
    ["gate-rule-drift", makeValid({ gate: { rule: "no receipt -> run VOID", verdict: "PASS" } }), true],
    ["bad-verdict", makeValid({ gate: { rule: GATE_RULE_VERBATIM, verdict: "pass" } }), true],
    ["digest-not-64hex", makeValid({ determinism: { seed: 12345, state_digest: "deadbeef" } }), true],
    ["negative-cost", makeValid({ cost: { currency: "USD", amount: -0.01, rate_source: "grid" } }), true],
    ["bad-currency", makeValid({ cost: { currency: "dollars", amount: 0.1, rate_source: "grid" } }), true],
    ["missing-compute", (() => { const r = makeValid(); delete r.compute; return r; })(), true],
    ["negative-gpu-seconds", makeValid({ compute: { gpu_seconds: -1 } }), true],
    ["kernel-count-float", makeValid({ compute: { gpu_seconds: 1, kernel_count: 12.5 } }), true]
  ];
  let pass = 0;
  const results = [];
  for (const [name, receipt, expectRefuse] of controls) {
    const p = join(dir, `${name}.json`);
    reasons.length = 0; info.length = 0;
    let refused = false; let why = "";
    try {
      if (expectRefuse) writeFileSync(p, JSON.stringify(receipt, null, 2) + "\n");
      validateReceipt(receipt);
      refused = reasons.length > 0;
      why = refused ? reasons[0] : "";
    } catch (e) { refused = true; why = e.message; }
    const ok = refused === expectRefuse;
    if (ok) pass++;
    results.push(`${ok ? "ok" : "CONTROL-FAILURE"}  ${name}: expected ${expectRefuse ? "REFUSE" : "PASS"}, got ${refused ? "REFUSE" : "PASS"}${why ? ` — ${why}` : ""}`);
  }
  rmSync(dir, { recursive: true, force: true });
  for (const r of results) console.log(r);
  console.log(`selftest: ${pass}/${controls.length} controls behaved as registered`);
  return pass === controls.length ? 0 : 1;
}

// ---------------------------------------------------------------- main
if (process.argv[2] === "--selftest") process.exit(selftest());
const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/g7_validate.mjs <receipt.json> | --selftest");
  process.exit(1);
}
try {
  const stat = readFileSync(target, "utf8"); // existence probe for a precise message
  void stat;
} catch (e) {
  console.error(`REFUSED (exit 1): cannot read ${target}: ${e.message}`);
  process.exit(1);
}
let receipt;
try { receipt = JSON.parse(readFileSync(target, "utf8")); }
catch (e) {
  console.error(`REFUSED (exit 1): ${target} is not valid JSON: ${e.message}`);
  process.exit(1);
}
reasons.length = 0; info.length = 0;
validateReceipt(receipt);
if (reasons.length > 0) {
  console.error(`REFUSED (exit 1): ${target} failed ${SCHEMA_ID} validation — ${reasons.length} reason(s):`);
  for (const r of reasons) console.error(`  - ${r}`);
  console.error(`gate: ${GATE_RULE_VERBATIM} (the run this file describes ships no verdict)`);
  process.exit(1);
}
for (const i of info) console.error(i);
console.log(`OK (exit 0): ${target} is a valid ${SCHEMA_ID} watt-receipt` +
  `${receipt.gate && receipt.gate.verdict === "VOID" ? " — self-declared VOID by its own gate" : ""}`);
process.exit(0);
