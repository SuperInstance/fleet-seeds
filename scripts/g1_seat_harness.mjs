#!/usr/bin/env node
// scripts/g1_seat_harness.mjs — G1 local-LLM seat harness (wave 54, task 54-d, lane-d).
//
// Companion to docs/G1-SEAT-SPIKE.md (seat spec + harness contract + sealed predictions)
// and docs/GPU-AGENT-PLAYBOOK.md G1. Stdlib-only (node:fs, node:os, node:path, node:url,
// node:crypto, node:http via global fetch, node:child_process). No npm deps. node >= 18.
//
// PURPOSE: turn the G1 seat run into a fail-closed, receipt-or-VOID instrument.
//   probe chain : ollama HTTP (127.0.0.1:11434) -> llama.cpp (llama-server HTTP health on
//                 :8080, then binaries on PATH) -> nothing.
//   no seat     : write a timestamped g1-void-record@1 to receipts/g1/ (reason=no_seat,
//                 full probe evidence, ZERO fabricated numbers) and exit 2.
//   seat found  : run the certified-seed prompt battery, collect raw responses, build a
//                 g7-watt-receipt@1 from the operator's run evidence + run facts the
//                 harness can honestly observe, then VALIDATE THE RECEIPT through
//                 scripts/g7_validate.mjs. Receipt refused -> no response is accepted,
//                 VOID record, exit 2 (receipt-or-VOID is code here, not policy).
//
// HONESTY LAW (zero fabrication):
//   * The harness computes NO energy number of its own. Energy/device/cost facts come
//     only from --run-evidence (operator-supplied, instrument-or-derivation backed).
//   * A no-seat run has no device and no energy: the void record deliberately leaves
//     energy.joules/watt_hours null and carries NO device block, because a
//     g7-watt-receipt@1 would require fabricating device.vram_gb > 0. The void record is
//     its own schema (g1-void-record@1) and is EXPECTED to be refused by g7_validate.mjs
//     (selftest control 3). The G7 gate is still satisfied: the run is VOID, and the
//     void record is the receipt OF the void.
//   * An uncertified battery (house law: moth-seal certified seeds for real runs) can
//     only produce a run whose own receipt declares gate.verdict "VOID" — plumbing yes,
//     shipping verdict no.
//
// CLI:
//   node scripts/g1_seat_harness.mjs [--battery <file>] [--run-evidence <file>]
//        [--out-dir receipts/g1] [--model <name>] [--model-path <gguf>] [--task-id 54-d]
//        [--agent "lane-d (subagent)"] [--ollama-url http://127.0.0.1:11434]
//        [--llama-server-url http://127.0.0.1:8080] [--selftest]
//
// Exit codes: 0 seat run completed (receipt validated; verdict may still be VOID-by-
//             receipt when the battery is uncertified) · 2 fail-closed VOID (no seat /
//             battery invalid / receipt refused / no model) · 3 fail-closed run-level
//             (no run evidence on the success path) · 4 usage error · 1 reserved for
//             unexpected internal faults (never a verdict).
//
// This file is honest tooling, not a receipt: it performs zero GPU compute and ships no
// watt-receipt of its own (same rule as scripts/g7_validate.mjs, 53-f).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync,
  writeFileSync, mkdtempSync, accessSync, constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const G7_VALIDATE = join(SCRIPT_DIR, "g7_validate.mjs");
const GATE_RULE_VERBATIM = "no receipt → run VOID";
const VOID_SCHEMA = "g1-void-record@1";
const RECEIPT_SCHEMA = "g7-watt-receipt@1";
const OLLAMA_TIMEOUT_MS = 2500;
const LLAMA_HEALTH_TIMEOUT_MS = 1500;

const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");
const nowUtc = (d = new Date()) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const utcCompact = (d = new Date()) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

// ---------------------------------------------------------------- argument parsing
function parseArgs(argv) {
  const opts = {
    battery: null, runEvidence: null, outDir: join(REPO_ROOT, "receipts", "g1"),
    model: null, modelPath: null, taskId: "54-d", agent: "lane-d (subagent)",
    ollamaUrl: "http://127.0.0.1:11434", llamaServerUrl: "http://127.0.0.1:8080",
    selftest: false
  };
  const known = new Set(["--battery", "--run-evidence", "--out-dir", "--model",
    "--model-path", "--task-id", "--agent", "--ollama-url", "--llama-server-url", "--selftest"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--selftest") { opts.selftest = true; continue; }
    if (!known.has(a)) throw Object.assign(new Error(`unknown argument: ${a}`), { usage: true });
    const val = argv[++i];
    if (val === undefined) throw Object.assign(new Error(`missing value for ${a}`), { usage: true });
    if (a === "--battery") opts.battery = val;
    else if (a === "--run-evidence") opts.runEvidence = val;
    else if (a === "--out-dir") opts.outDir = val;
    else if (a === "--model") opts.model = val;
    else if (a === "--model-path") opts.modelPath = val;
    else if (a === "--task-id") opts.taskId = val;
    else if (a === "--agent") opts.agent = val;
    else if (a === "--ollama-url") opts.ollamaUrl = val;
    else if (a === "--llama-server-url") opts.llamaServerUrl = val;
  }
  return opts;
}

// ---------------------------------------------------------------- probe machinery
// Every probe returns {name, method, result: "PRESENT"|"ABSENT", evidence} — evidence is
// a factual string (command/result or error text), never an inference. Probes never
// invent numbers: what they cannot observe stays out of the record.

async function probeOllama(url, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const method = `GET ${url}/api/tags (timeout ${timeoutMs} ms)`;
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await res.text();
    if (res.status !== 200) {
      return { name: "ollama-http", method, result: "ABSENT", evidence: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    let parsed;
    try { parsed = JSON.parse(body); } catch { return { name: "ollama-http", method, result: "ABSENT", evidence: "HTTP 200 but body is not JSON" }; }
    const models = Array.isArray(parsed.models) ? parsed.models.map((m) => m.name).filter(Boolean) : null;
    if (models === null) return { name: "ollama-http", method, result: "ABSENT", evidence: "HTTP 200 JSON but no models array" };
    return { name: "ollama-http", method, result: "PRESENT", evidence: `HTTP 200, models: ${models.length ? models.join(", ") : "(none pulled)"}`, models };
  } catch (e) {
    const why = e.name === "TimeoutError" ? `no answer within ${timeoutMs} ms` : `${e.cause?.code ?? e.name}: ${e.cause?.message ?? e.message}`;
    return { name: "ollama-http", method, result: "ABSENT", evidence: why };
  }
}

function which(bin, pathEnv = process.env.PATH) {
  const dirs = (pathEnv ?? "").split(process.platform === "win32" ? ";" : ":").filter(Boolean);
  for (const dir of dirs) {
    const p = join(dir, bin);
    try { accessSync(p, fsConstants.X_OK); return p; } catch { /* keep scanning */ }
  }
  return null;
}

function probeLlamaServerHttp(url, timeoutMs = LLAMA_HEALTH_TIMEOUT_MS) {
  const method = `GET ${url}/health (timeout ${timeoutMs} ms)`;
  return (async () => {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(timeoutMs) });
      return { name: "llama-server-http", method, result: "PRESENT", evidence: `HTTP ${res.status} (server answering)` };
    } catch (e) {
      const why = e.name === "TimeoutError" ? `no answer within ${timeoutMs} ms` : `${e.cause?.code ?? e.name}: ${e.cause?.message ?? e.message}`;
      return { name: "llama-server-http", method, result: "ABSENT", evidence: why };
    }
  })();
}

function probeLlamaBinaries(pathEnv = process.env.PATH) {
  const candidates = ["llama-server", "llama-cli"];
  const found = [];
  for (const bin of candidates) {
    const p = which(bin, pathEnv);
    if (!p) continue;
    let version = "(--version produced no output)";
    try {
      const r = spawnSync(p, ["--version"], { encoding: "utf8", timeout: 5000 });
      version = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n")[0] || version;
      if (r.error) version = `spawn failed: ${r.error.message}`;
    } catch (e) { version = `spawn failed: ${e.message}`; }
    found.push({ name: `llama-bin:${bin}`, method: `PATH scan + ${bin} --version`, result: "PRESENT", evidence: `${p} — ${version}` });
  }
  if (found.length === 0) {
    found.push({ name: "llama-bin:llama-server/llama-cli", method: "PATH scan for llama-server, llama-cli", result: "ABSENT", evidence: "no llama.cpp binary found on PATH" });
  }
  return found;
}

// Evidence probes: never gate the seat decision (v1 seat sources are ollama + llama.cpp
// per the registered probe order); they exist so absence is EVIDENCED, not asserted.
function probeEvidenceStatic() {
  const rows = [];
  const smi = which("nvidia-smi");
  rows.push(smi
    ? { name: "nvidia-smi", method: "PATH scan", result: "PRESENT", evidence: smi }
    : { name: "nvidia-smi", method: "PATH scan", result: "ABSENT", evidence: "nvidia-smi not on PATH" });
  try {
    const dri = readdirSync("/dev").filter((f) => f === "dri" || f.startsWith("nvidia"));
    rows.push(dri.length
      ? { name: "/dev/dri|/dev/nvidia*", method: "readdir /dev", result: "PRESENT", evidence: dri.join(", ") }
      : { name: "/dev/dri|/dev/nvidia*", method: "readdir /dev", result: "ABSENT", evidence: "no dri/nvidia nodes in /dev" });
  } catch (e) { rows.push({ name: "/dev/dri|/dev/nvidia*", method: "readdir /dev", result: "ABSENT", evidence: `/dev unreadable: ${e.code ?? e.message}` }); }
  let modules = null; // null = unreadable; "" = readable but empty (container: no modules listed)
  try { modules = readFileSync("/proc/modules", "utf8"); } catch { modules = null; }
  const gpuMods = (modules ?? "").split("\n").filter((l) => /^(nvidia|amdgpu|i915|xe)\b/.test(l));
  rows.push(modules === null
    ? { name: "gpu-kernel-modules", method: "read /proc/modules, match ^(nvidia|amdgpu|i915|xe)", result: "ABSENT", evidence: "/proc/modules unreadable" }
    : (gpuMods.length
        ? { name: "gpu-kernel-modules", method: "read /proc/modules, match ^(nvidia|amdgpu|i915|xe)", result: "PRESENT", evidence: gpuMods.map((l) => l.split(" ")[0]).join(", ") }
        : { name: "gpu-kernel-modules", method: "read /proc/modules, match ^(nvidia|amdgpu|i915|xe)", result: "ABSENT", evidence: `/proc/modules readable but lists ${modules.split("\n").filter(Boolean).length} modules — no GPU modules matched` }));
  for (const p of ["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"]) {
    if (existsSync(p)) {
      let v = ""; try { v = readFileSync(p, "utf8").trim(); } catch { /* keep empty */ }
      rows.push({ name: "cgroup-memory.max", method: `read ${p}`, result: "PRESENT", evidence: `${v} bytes${/^\d+$/.test(v) ? ` (${(Number(v) / 2 ** 30).toFixed(2)} GiB)` : ""}` });
      break;
    }
  }
  return rows;
}

async function realProbeNodeLlamaCpp(cwd) {
  const method = `import resolve from ${cwd} (node-llama-cpp)`;
  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(join(cwd, "package.json"));
    const p = req.resolve("node-llama-cpp");
    return { name: "node-llama-cpp", method, result: "PRESENT", evidence: p };
  } catch (e) {
    return { name: "node-llama-cpp", method, result: "ABSENT", evidence: `not resolvable (${e.code ?? e.message}) — recorded as evidence; not a v1 seat source` };
  }
}

// ---------------------------------------------------------------- battery
function loadBattery(path) {
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { throw Object.assign(new Error(`battery unreadable: ${e.message}`), { code: "battery_invalid" }); }
  let b;
  try { b = JSON.parse(raw); }
  catch (e) { throw Object.assign(new Error(`battery not valid JSON: ${e.message}`), { code: "battery_invalid" }); }
  const problems = [];
  if (typeof b.battery_id !== "string" || !b.battery_id.trim()) problems.push("battery_id: required non-empty string");
  if (typeof b.certified !== "boolean") problems.push("certified: required boolean");
  const seedOk = b.seed && ((typeof b.seed.value === "string" && b.seed.value.trim() !== "") || typeof b.seed.value === "number");
  if (!seedOk) problems.push("seed.value: required non-empty string or number");
  if (!seedOk || (typeof b.seed.source !== "string" || !b.seed.source.trim())) problems.push("seed.source: required non-empty string (provenance)");
  if (!Array.isArray(b.prompts) || b.prompts.length === 0) problems.push("prompts: required non-empty array");
  else for (const p of b.prompts) {
    if (typeof p.id !== "string" || !p.id.trim()) { problems.push("prompts[].id: required non-empty string"); break; }
    if (typeof p.text !== "string" || !p.text) { problems.push("prompts[].text: required string"); break; }
  }
  if (b.certified === true) {
    if (!b.seed || typeof b.seed.cert !== "string" || !b.seed.cert.trim()) {
      problems.push("seed.cert: REQUIRED for certified:true batteries (moth-seal certification reference per house law)");
    }
  }
  if (problems.length) throw Object.assign(new Error(`battery invalid: ${problems.join("; ")}`), { code: "battery_invalid", problems });
  return {
    battery_id: b.battery_id, certified: b.certified,
    seed: { source: b.seed.source, cert: b.seed.cert ?? null, value: b.seed.value },
    prompts: b.prompts.map((p) => ({ id: p.id, text: p.text, max_tokens: Number.isFinite(p.max_tokens) ? p.max_tokens : 8000, temperature: Number.isFinite(p.temperature) ? p.temperature : 0 }))
  };
}

// ---------------------------------------------------------------- seat clients
async function ollamaChat(url, model, prompt, opts) {
  const body = {
    model, stream: false,
    messages: [{ role: "user", content: prompt.text }],
    options: { temperature: prompt.temperature, num_predict: prompt.max_tokens, ...(typeof opts.seed === "number" ? { seed: opts.seed } : {}) }
  };
  const res = await fetch(`${url}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(opts.timeoutMs ?? 600000) });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { text: j.message?.content ?? "", engine: `ollama:${model}`, timing: j.eval_count != null ? { eval_count: j.eval_count, eval_duration_ns: j.eval_duration, prompt_eval_count: j.prompt_eval_count } : null, raw: j };
}

async function llamaServerChat(url, prompt, opts) {
  const body = { stream: false, messages: [{ role: "user", content: prompt.text }], temperature: prompt.temperature, max_tokens: prompt.max_tokens, ...(typeof opts.seed === "number" ? { seed: opts.seed } : {}) };
  const res = await fetch(`${url}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(opts.timeoutMs ?? 600000) });
  if (!res.ok) throw new Error(`llama-server HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { text: j.choices?.[0]?.message?.content ?? "", engine: "llama-server", timing: j.usage ?? null, raw: j };
}

function llamaCliExec(binary, modelPath, prompt, opts) {
  const args = ["-m", modelPath, "-p", prompt.text, "-n", String(prompt.max_tokens), "--temp", String(prompt.temperature), "-no-cnv"];
  if (typeof opts.seed === "number") args.push("--seed", String(opts.seed));
  const r = spawnSync(binary, args, { encoding: "utf8", timeout: opts.timeoutMs ?? 600000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`llama-cli spawn failed: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`llama-cli exit ${r.status}: ${(r.stderr ?? "").slice(0, 200)}`);
  return { text: r.stdout ?? "", engine: "llama-cli", timing: null, raw: { stdout_bytes: (r.stdout ?? "").length } };
}

// ---------------------------------------------------------------- run evidence
function loadRunEvidence(path) {
  let j;
  try { j = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { throw Object.assign(new Error(`run evidence unreadable/invalid JSON: ${e.message}`), { code: "run_evidence_invalid" }); }
  const need = [["device", j.device], ["device.model", j.device?.model], ["device.driver", j.device?.driver],
    ["energy", j.energy], ["energy.joules", j.energy?.joules], ["energy.watt_hours", j.energy?.watt_hours],
    ["energy.source", j.energy?.source], ["energy.sampling_method", j.energy?.sampling_method],
    ["compute", j.compute], ["compute.gpu_seconds", j.compute?.gpu_seconds],
    ["cost", j.cost], ["cost.currency", j.cost?.currency], ["cost.amount", j.cost?.amount], ["cost.rate_source", j.cost?.rate_source]];
  const missing = need.filter(([k, v]) => v === undefined || v === null || v === "").map(([k]) => k);
  if (missing.length) throw Object.assign(new Error(`run evidence missing fields: ${missing.join(", ")}`), { code: "run_evidence_invalid" });
  if (typeof j.device.vram_gb !== "number" || !(j.device.vram_gb > 0)) throw Object.assign(new Error("run evidence device.vram_gb: required number > 0"), { code: "run_evidence_invalid" });
  return j;
}

// ---------------------------------------------------------------- void record
function makeVoidRecord({ opts, reason, detail, probes, wallSeconds, battery, validatorReasons }) {
  const probesCanonical = JSON.stringify(probes);
  return {
    schema: VOID_SCHEMA,
    record_id: `g1-void-${utcCompact()}-${process.pid}`,
    task_id: opts.taskId,
    agent: opts.agent,
    created_utc: nowUtc(),
    reason,
    detail,
    probe_verdicts: probes,
    wall_seconds_probe_chain: typeof wallSeconds === "number" ? Number(wallSeconds.toFixed(3)) : null,
    compute: { gpu_seconds: 0, kernel_count: 0, note: "no inference ran; gpu_seconds 0 is a statement of absence, not a measurement" },
    energy: { joules: null, watt_hours: null, source: null, note: "no compute ran — any number here would be fabricated; this record is the receipt OF the void, not a g7-watt-receipt@1" },
    battery: battery
      ? { path: opts.battery, battery_id: battery.battery_id, certified: battery.certified, prompts: battery.prompts.length }
      : { path: opts.battery, battery_id: null, certified: null, prompts: 0, note: "no battery consumed" },
    responses: { accepted: 0, note: validatorReasons ? "responses collected were NOT accepted (receipt refused); nothing is shipped" : "zero seat responses exist; nothing was generated" },
    validator_reasons: validatorReasons ?? null,
    gate: { rule: GATE_RULE_VERBATIM, verdict: "VOID" },
    binding: { harness_sha256: sha256Hex(readFileSync(fileURLToPath(import.meta.url))), probes_digest_sha256: sha256Hex(probesCanonical) },
    g7_relationship: "NOT a g7-watt-receipt@1 by design: a run with no seat has no device and no energy; filling device.vram_gb > 0 or an energy number would be fabrication. g7_validate.mjs is EXPECTED to refuse this record (selftest control). Gate law satisfied: no receipt → run VOID — and this record is the receipt of that VOID."
  };
}

// ---------------------------------------------------------------- main run flow
async function runHarness(opts, inj = {}) {
  const t0 = Date.now();
  const log = inj.log ?? ((...a) => console.log(...a));
  const outDir = resolve(opts.outDir);
  mkdirSync(outDir, { recursive: true });
  const failClosed = async (code, reason, detail, probes, battery, validatorReasons) => {
    const rec = makeVoidRecord({ opts, reason, detail, probes, wallSeconds: (Date.now() - t0) / 1000, battery, validatorReasons });
    const file = join(outDir, `${utcCompact()}-${reason}-${Math.random().toString(36).slice(2, 7)}.json`);
    writeFileSync(file, JSON.stringify(rec, null, 2) + "\n");
    log(`FAIL-CLOSED (exit ${code}): ${reason} — ${detail}`);
    log(`void record: ${file}`);
    return { exitCode: code, voidRecord: rec, voidRecordPath: file, written: [file] };
  };

  // -- probe chain (registered order: ollama HTTP -> llama.cpp) -------------------
  const probeOllamaFn = inj.probeOllama ?? probeOllama;
  const probeLlamaSrvFn = inj.probeLlamaServerHttp ?? probeLlamaServerHttp;
  const probeLlamaBinFn = inj.probeLlamaBinaries ?? probeLlamaBinaries;
  const ollama = await probeOllamaFn(opts.ollamaUrl);
  const llamaSrv = await probeLlamaSrvFn(opts.llamaServerUrl);
  const llamaBins = probeLlamaBinFn();
  const evidence = inj.probeEvidence ? inj.probeEvidence() : [...probeEvidenceStatic(), await realProbeNodeLlamaCpp(REPO_ROOT)];
  const probes = [ollama, llamaSrv, ...llamaBins, ...evidence];
  const seatKinds = [];

  if (ollama.result === "PRESENT") seatKinds.push({ kind: "ollama", models: ollama.models ?? [] });
  if (llamaSrv.result === "PRESENT") seatKinds.push({ kind: "llama-server" });
  const llamaCliBin = llamaBins.find((b) => b.name === "llama-bin:llama-cli");
  if (llamaCliBin && opts.modelPath) seatKinds.push({ kind: "llama-cli", binary: llamaCliBin.evidence.split(" — ")[0] });

  if (seatKinds.length === 0) {
    return failClosed(2, "no_seat",
      "probe chain exhausted: no ollama HTTP seat, no llama-server HTTP, no usable llama.cpp binary (+--model-path); see probe_verdicts",
      probes, null, null);
  }
  log(`seat probe: PRESENT via ${seatKinds.map((s) => s.kind).join(" + ")}`);

  // -- battery --------------------------------------------------------------------
  if (!opts.battery) {
    return failClosed(4, "battery_missing", "a seat is present but no --battery was supplied: the harness will not call a seat without its registered battery", probes, null, null);
  }
  let battery;
  try { battery = loadBattery(opts.battery); }
  catch (e) {
    return failClosed(2, "battery_invalid", e.message, probes, null, null);
  }
  log(`battery: ${battery.battery_id} (${battery.prompts.length} prompts, certified=${battery.certified})`);

  // -- run evidence (harness computes NO energy number of its own) -----------------
  let ev;
  try {
    if (!opts.runEvidence) throw Object.assign(new Error("no --run-evidence supplied: the harness cannot honestly build a watt-receipt without operator-supplied energy/device facts"), { code: "run_evidence_invalid" });
    ev = loadRunEvidence(opts.runEvidence);
  } catch (e) {
    return failClosed(3, "no_energy_evidence", e.message, probes, battery, null);
  }

  // -- seat selection + inference ---------------------------------------------------
  const seedVal = typeof battery.seed.value === "number" ? battery.seed.value : null;
  const seat = seatKinds[0];
  const callSeat = inj.callSeat ?? (async (prompt) => {
    if (seat.kind === "ollama") {
      const model = opts.model ?? (seat.models.length === 1 ? seat.models[0] : null);
      if (!model) throw new Error("ollama seat: --model required (or exactly one pulled model)");
      return ollamaChat(opts.ollamaUrl, model, prompt, { seed: seedVal });
    }
    if (seat.kind === "llama-server") return llamaServerChat(opts.llamaServerUrl, prompt, { seed: seedVal });
    return llamaCliExec(which("llama-cli"), opts.modelPath, prompt, { seed: seedVal });
  });

  const responses = [];
  try {
    for (const p of battery.prompts) {
      const started = Date.now();
      const r = await callSeat(p);
      responses.push({ prompt_id: p.id, max_tokens: p.max_tokens, temperature: p.temperature, wall_ms: Date.now() - started, engine: r.engine, timing: r.timing, text: r.text });
    }
  } catch (e) {
    return failClosed(2, "seat_call_failed", `inference failed mid-battery: ${e.message}`, probes, battery, null);
  }

  // -- receipt assembly (run facts only) --------------------------------------------
  const bundle = { battery: { battery_id: battery.battery_id, certified: battery.certified, seed: battery.seed }, prompts: battery.prompts.length, responses };
  const bundleStr = JSON.stringify(bundle, null, 2) + "\n";
  const stateDigest = sha256Hex(bundleStr);
  const verdict = battery.certified ? "PASS" : "VOID";
  const receipt = {
    schema: RECEIPT_SCHEMA,
    receipt_id: `g7-wr-G1-${utcCompact()}-${process.pid}`,
    task_id: opts.taskId,
    agent: opts.agent,
    device: ev.device,
    energy: ev.energy,
    compute: ev.compute,
    cost: ev.cost,
    determinism: {
      seed: battery.seed.value,
      state_digest: stateDigest,
      ...(battery.certified ? {} : { verdict_note: "battery uncertified — smoke/plumbing run; no verdict ships (house law: moth-seal certified seeds for real runs)" })
    },
    gate: { rule: GATE_RULE_VERBATIM, verdict }
  };

  // -- receipt-or-VOID: validate through g7_validate.mjs BEFORE accepting responses --
  const tmpReceipt = join(outDir, `.pending-${utcCompact()}-${process.pid}-receipt.json`);
  writeFileSync(tmpReceipt, JSON.stringify(receipt, null, 2) + "\n");
  const g7 = spawnSync(process.execPath, [G7_VALIDATE, tmpReceipt], { encoding: "utf8" });
  if (g7.status !== 0) {
    rmSync(tmpReceipt, { force: true });
    return failClosed(2, "receipt_refused",
      `g7_validate.mjs refused the run's own receipt (exit ${g7.status}): ${(g7.stderr ?? g7.stdout ?? "").trim().split("\n").slice(0, 6).join(" | ")}`,
      probes, battery, (g7.stderr ?? g7.stdout ?? "").trim().split("\n").slice(0, 12));
  }
  rmSync(tmpReceipt, { force: true });

  // -- accept: write responses bundle + receipt, byte-exact digest binding -----------
  const stamp = utcCompact();
  const responsesPath = join(outDir, `${stamp}-responses.json`);
  writeFileSync(responsesPath, bundleStr);
  const writtenReceiptPath = join(outDir, `${stamp}-receipt.json`);
  writeFileSync(writtenReceiptPath, JSON.stringify(receipt, null, 2) + "\n");
  log(`responses: ${responsesPath} (${responses.length}/${battery.prompts.length} accepted)`);
  log(`receipt:   ${writtenReceiptPath} (g7_validate exit 0; gate.verdict=${verdict})`);
  if (verdict === "VOID") log("verdict:   VOID — battery uncertified; this run ships NO verdict (plumbing only)");
  return { exitCode: 0, receipt, responses, responsesPath, receiptPath: writtenReceiptPath, written: [responsesPath, writtenReceiptPath], verdict };
}

// ---------------------------------------------------------------- selftest
// In-process controls. Injected seats are declared SYNTHETIC TEST DOUBLES; every number
// they touch stays inside a temp dir and never enters the repo. The two example-receipt
// controls read the committed g7 worked examples.
async function selftest() {
  const controls = [];
  const dir = mkdtempSync(join(tmpdir(), "g1-selftest-"));
  const saveDir = join(dir, "receipts");
  const baseOpts = (over = {}) => ({ ...parseArgs([]), outDir: saveDir, ...over });
  const absentProbes = () => [
    { name: "ollama-http", method: "selftest: injected absent", result: "ABSENT", evidence: "selftest double" },
    { name: "llama-server-http", method: "selftest: injected absent", result: "ABSENT", evidence: "selftest double" }
  ];
  const echoSeat = async (p) => ({ text: `SELFTEST-ECHO<${p.id}>:${p.text}`, engine: "selftest-echo-double", timing: { note: "synthetic test double, no timing claimed" }, raw: null });
  const evidenceFile = (over = {}) => {
    const p = join(dir, `ev-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(p, JSON.stringify({
      device: { model: "SELFTEST-SYNTHETIC-DEVICE (test double — not a real GPU)", vram_gb: 8, driver: "selftest/0.0" },
      energy: { joules: 3600, watt_hours: 1, source: "measured", sampling_method: "selftest synthetic — 1 Hz sampling note (test double)", instrument: "SELFTEST-NOT-AN-INSTRUMENT (test double)", derivation: null },
      compute: { gpu_seconds: 1, kernel_count: 0 },
      cost: { currency: "USD", amount: 0.0001, rate_source: "selftest synthetic rate (test double)" },
      ...over
    }, null, 2) + "\n");
    return p;
  };
  const batteryFile = (certified, extra = {}) => {
    const p = join(dir, `bat-${certified ? "cert" : "smoke"}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(p, JSON.stringify({
      battery_id: certified ? "selftest-certified-battery" : "selftest-smoke-battery",
      certified,
      seed: certified ? { source: "moth-seal (selftest reference — structure check only)", cert: "selftest-cert-ref-NOT-A-REAL-CERT", value: 424242 } : { source: "selftest literal", value: 1 },
      prompts: [{ id: "q1", text: "Say 'ok' and nothing else." }, { id: "q2", text: "State the two-reader rule in one sentence." }],
      ...extra
    }, null, 2) + "\n");
    return p;
  };

  // C1: no-seat fail-closed — exit 2, reason no_seat, VOID record, zero fabricated numbers
  {
    const r = await runHarness(baseOpts(), {
      probeOllama: async () => absentProbes()[0],
      probeLlamaServerHttp: async () => absentProbes()[1],
      probeLlamaBinaries: () => [{ name: "llama-bin:llama-server/llama-cli", method: "selftest injected", result: "ABSENT", evidence: "selftest double" }],
      probeEvidence: () => [{ name: "selftest-evidence", method: "injected", result: "ABSENT", evidence: "selftest double" }],
      cwd: REPO_ROOT
    });
    const rec = r.voidRecord;
    const ok = r.exitCode === 2 && rec && rec.reason === "no_seat" && rec.energy.joules === null && rec.compute.gpu_seconds === 0 && rec.gate.rule === GATE_RULE_VERBATIM && rec.gate.verdict === "VOID" && rec.device === undefined;
    controls.push([ok, "C1 no-seat fail-closed: exit 2 + reason=no_seat + energy null + gpu_seconds 0 + no device block + gate VOID"]);
  }
  // C2: void record structure + probe evidence rows present
  {
    const r = await runHarness(baseOpts(), {
      probeOllama: async () => absentProbes()[0],
      probeLlamaServerHttp: async () => absentProbes()[1],
      probeLlamaBinaries: () => [{ name: "llama-bin:llama-server/llama-cli", method: "selftest injected", result: "ABSENT", evidence: "selftest double" }],
      probeEvidence: () => [{ name: "selftest-evidence", method: "injected", result: "ABSENT", evidence: "selftest double" }],
      cwd: REPO_ROOT
    });
    const rec = r.voidRecord;
    const ok = rec.schema === VOID_SCHEMA && /^g1-void-\d{8}T\d{6}Z-\d+$/.test(rec.record_id) && Array.isArray(rec.probe_verdicts) && rec.probe_verdicts.every((p) => p.result === "ABSENT" && p.method && p.evidence) && typeof rec.binding.harness_sha256 === "string" && /^[0-9a-f]{64}$/.test(rec.binding.probes_digest_sha256);
    controls.push([ok, "C2 void-record structure: schema/record_id/probe rows/bindings well-formed"]);
  }
  // C3: g7_validate REFUSES the void record (it must not masquerade as a watt-receipt)
  {
    const rec = makeVoidRecord({ opts: baseOpts(), reason: "no_seat", detail: "selftest control artifact", probes: absentProbes(), wallSeconds: 0.001, battery: null, validatorReasons: null });
    const p = join(dir, "c3-void-record.json");
    writeFileSync(p, JSON.stringify(rec, null, 2) + "\n");
    const g7 = spawnSync(process.execPath, [G7_VALIDATE, p], { encoding: "utf8" });
    controls.push([g7.status === 1, "C3 g7_validate refuses the g1-void-record@1 (exit 1) — the void record cannot masquerade as a watt-receipt"]);
  }
  // C4: g7 wiring sanity — committed PASS example validates
  {
    const g7 = spawnSync(process.execPath, [G7_VALIDATE, join(REPO_ROOT, "scripts", "g7", "examples", "pass-measured.json")], { encoding: "utf8" });
    controls.push([g7.status === 0, "C4 g7 wiring: scripts/g7/examples/pass-measured.json validates exit 0"]);
  }
  // C5: g7 wiring sanity — committed VOID example is refused
  {
    const g7 = spawnSync(process.execPath, [G7_VALIDATE, join(REPO_ROOT, "scripts", "g7", "examples", "void-missing-energy.json")], { encoding: "utf8" });
    controls.push([g7.status === 1, "C5 g7 wiring: scripts/g7/examples/void-missing-energy.json refused exit 1"]);
  }
  // C6: uncertified battery -> run completes but receipt declares VOID (no verdict ships)
  {
    const r = await runHarness(baseOpts({ battery: batteryFile(false), runEvidence: evidenceFile() }), {
      probeOllama: async () => ({ name: "ollama-http", method: "selftest injected PRESENT", result: "PRESENT", evidence: "selftest double", models: ["selftest-model"] }),
      probeLlamaServerHttp: async () => absentProbes()[1],
      probeLlamaBinaries: () => [{ name: "llama-bin:llama-server/llama-cli", method: "selftest injected", result: "ABSENT", evidence: "selftest double" }],
      probeEvidence: () => [],
      callSeat: echoSeat, cwd: REPO_ROOT
    });
    const receipt = r.receipt;
    const responses = JSON.parse(readFileSync(r.responsesPath, "utf8"));
    const ok = r.exitCode === 0 && receipt && receipt.gate.verdict === "VOID" && responses.responses.length === 2 && responses.responses[0].text.startsWith("SELFTEST-ECHO<q1>");
    controls.push([ok, "C6 uncertified battery: run completes, receipt gate.verdict=VOID, no shipping verdict (responses are plumbing artifacts)"]);
  }
  // C7: certified battery + NO run evidence -> fail-closed exit 3, no responses written
  {
    const r = await runHarness(baseOpts({ battery: batteryFile(true) }), {
      probeOllama: async () => ({ name: "ollama-http", method: "selftest injected PRESENT", result: "PRESENT", evidence: "selftest double", models: ["selftest-model"] }),
      probeLlamaServerHttp: async () => absentProbes()[1],
      probeLlamaBinaries: () => [{ name: "llama-bin:llama-server/llama-cli", method: "selftest injected", result: "ABSENT", evidence: "selftest double" }],
      probeEvidence: () => [],
      callSeat: echoSeat, cwd: REPO_ROOT
    });
    const wroteNoResponses = !r.written.some((f) => f.endsWith("-responses.json"));
    const ok = r.exitCode === 3 && r.voidRecord.reason === "no_energy_evidence" && wroteNoResponses;
    controls.push([ok, "C7 no energy evidence: fail-closed exit 3, reason=no_energy_evidence, zero responses accepted"]);
  }
  // C8: full success path — certified battery + evidence -> receipt passes g7, digest binds
  {
    const r = await runHarness(baseOpts({ battery: batteryFile(true), runEvidence: evidenceFile() }), {
      probeOllama: async () => ({ name: "ollama-http", method: "selftest injected PRESENT", result: "PRESENT", evidence: "selftest double", models: ["selftest-model"] }),
      probeLlamaServerHttp: async () => absentProbes()[1],
      probeLlamaBinaries: () => [{ name: "llama-bin:llama-server/llama-cli", method: "selftest injected", result: "ABSENT", evidence: "selftest double" }],
      probeEvidence: () => [],
      callSeat: echoSeat, cwd: REPO_ROOT
    });
    let ok = r.exitCode === 0 && r.receipt && r.receipt.gate.verdict === "PASS";
    if (ok) {
      const g7 = spawnSync(process.execPath, [G7_VALIDATE, r.receiptPath], { encoding: "utf8" });
      ok = g7.status === 0;
    }
    if (ok) {
      const bundleBytes = readFileSync(r.responsesPath);
      ok = sha256Hex(bundleBytes) === r.receipt.determinism.state_digest;
    }
    controls.push([ok, "C8 success path: receipt accepted after g7_validate exit 0, state_digest binds the responses bundle byte-exactly"]);
  }

  rmSync(dir, { recursive: true, force: true });
  let pass = 0;
  for (const [ok, name] of controls) { if (ok) pass++; console.log(`${ok ? "ok" : "CONTROL-FAILURE"}  ${name}`); }
  console.log(`selftest: ${pass}/${controls.length} controls behaved as registered`);
  return pass === controls.length ? 0 : 1;
}

// ---------------------------------------------------------------- main
if (process.argv[2] === "--selftest" && process.argv.length === 3) {
  process.exit(await selftest());
}
let opts;
try { opts = parseArgs(process.argv.slice(2)); }
catch (e) {
  console.error(`usage error (exit 4): ${e.message}`);
  console.error("usage: node scripts/g1_seat_harness.mjs [--battery <file>] [--run-evidence <file>] [--out-dir receipts/g1] [--model <name>] [--model-path <gguf>] [--task-id <id>] [--agent <agent>] [--ollama-url <url>] [--llama-server-url <url>] | --selftest");
  process.exit(4);
}
try {
  const r = await runHarness(opts);
  process.exit(r.exitCode);
} catch (e) {
  console.error(`INTERNAL FAULT (exit 1 — never a verdict): ${e.stack ?? e.message}`);
  process.exit(1);
}
