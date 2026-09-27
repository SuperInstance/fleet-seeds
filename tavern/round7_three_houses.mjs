// tavern/round7_three_houses.mjs — lane 36-b: TAVERN ROUND SEVEN + competitive
// ideation across THREE HOUSES. The guest (deepseek-chat, the round-6 flash
// lane) discharges its own four registered levers under the round-6 prefix
// (byte-verified cache asset, sha 777938e2…); the SAME one question goes to
// deepseek-reasoner (thinking), deepseek-chat COLD (fast-iterator experiment),
// typesafe SystemOne (typed distributions), and MOTH (quantum — capability
// probe; a quantum house cannot ideate, that is an honest record).
//
// Laws inherited from situations/deepseek_guest_r6.mjs: ONE immutable prefix,
// outputs sealed AS SAID (content_raw verbatim, parse repairs declared),
// native cache telemetry on every row, honest failures receipted, append+
// flush per row, resume-safe by call_id. Keys runtime-only from env; every
// written file is self-scanned for key material before the first byte lands.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadKey, probeBase, graphJob } from '../../quilt-dba/dba/mothqrc.mjs';
import { loadTypesafeKey } from '../../quilt-dba/dba/jev_live.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANSWERS = path.join(HERE, 'answers');
fs.mkdirSync(ANSWERS, { recursive: true });
const DS_FILE = path.join(ANSWERS, 'deepseek-round7.jsonl');
const TS_FILE = path.join(ANSWERS, 'typesafe-round7.jsonl');
const MOTH_FILE = path.join(ANSWERS, 'moth-round7.jsonl');
const SUM_FILE = path.join(HERE, 'round7_summary.json');

// ── THE ASSET: round-6 system prefix, extracted read-only from the qthe
// receipted script and VERIFIED against the sealed sha (fail-closed on drift).
const QTHE_SRC = fs.readFileSync(
  '/home/z/my-project/download/qthe/situations/deepseek_guest_r6.mjs', 'utf8');
const MARK = 'SYSTEM_PREFIX = `';
const a0 = QTHE_SRC.indexOf(MARK) + MARK.length;
const a1 = QTHE_SRC.indexOf('`;', a0);
if (a0 < MARK.length || a1 === -1) { console.error('FATAL: prefix not found in qthe r6 script'); process.exit(1); }
const SYSTEM_PREFIX = QTHE_SRC.slice(a0, a1);
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const PREFIX_SHA = sha(SYSTEM_PREFIX);
const SEALED_PREFIX_SHA = '777938e243d34ef4667c1d52a89ee3fe30e41529804746c7b71deccbc0866e39';
if (PREFIX_SHA !== SEALED_PREFIX_SHA) {
  console.error('FATAL: round-6 prefix drifted from the sealed cache asset (' + PREFIX_SHA.slice(0, 16) + ')');
  process.exit(1);
}
console.log('prefix verified byte-identical to the sealed cache asset:', PREFIX_SHA.slice(0, 16), '…', SYSTEM_PREFIX.length, 'chars');

// ── the ONE question (verbatim across all houses) ────────────────────────────
const ONE_Q = 'Given that the float kernel is less faithful than the fixed kernel at the uncoupled exact-zero pressure families, what is the SMALLEST experiment that would establish whether the S3 live-read semantics can also produce a float-only artifact? Answer in <=120 words with one concrete falsifiable check.';

// the four levers exactly as the guest registered them in round six
const LEVERS = `L1 E-Q7: knife-edge-checkerboard-cascade under S3 row-major LWW, seeded at sigma=2/3 (C4 lever; reuses the EQ6-D1 harness + qthe_fixed).
L2 S-sensitivity sweep: S=2^32 vs 2^48 vs rational (p,q) sigma on the uncoupled exact-zero families (5acc+8r=0 at 8/5; 10acc+7r=0 at 7/10; 3acc+2r=0 at 2/3) and the (2/3, acc=-2) boundary.
L3 Naive-plane counterfactual floor: run the 64x1 all-Abstain d=0, T=64, 4096-write cooker against a deliberately naive no-live-read/simultaneous-write plane to price your surviving R3 claim.
L4 C5' injector-semantics one-pager: spec decision (injector identity, cost, source) priced before any run; never retrofitted onto dead C5.`;

const CALLS = [
  {
    call_id: 'r7-q1-lever-discharge', model: 'deepseek-chat', temperature: 0.3, max_tokens: 1000,
    user: `question_id: r7-q1-lever-discharge. Round seven: discharge your OWN four registered levers. For EACH, say stand / withdraw / revise with one line of why (you may fold levers together if one subsumes another). Then name the ONE cheapest decisive next run.\n\n${LEVERS}\n\nOutput contract — ONE strict JSON object, no markdown fences:\n{"question_id": "r7-q1-lever-discharge", "lever_stances": [{"lever": "L1..L4", "stance": "stand|withdraw|revise", "note": "<= 25 words"}], "verdict": "<= 3 sentences", "cheapest_next": "one line", "residual_risks": [] (0-2)}`,
  },
  {
    call_id: 'r7-q2-eq7-falsifier', model: 'deepseek-chat', temperature: 0.3, max_tokens: 300,
    user: `question_id: r7-q2-eq7-falsifier. State E-Q7's falsification condition in EXACTLY ONE sentence: the single pre-registered observation that would kill E-Q7's registered model (the knife-edge-checkerboard-cascade under S3 row-major LWW seeded at sigma=2/3). Output contract — ONE strict JSON object, no markdown fences:\n{"question_id": "r7-q2-eq7-falsifier", "falsification_condition": "EXACTLY ONE sentence", "residual_risks": [] (0-2)}`,
  },
  {
    call_id: 'r7-q3-float-artifact', model: 'deepseek-chat', temperature: 0.3, max_tokens: 600,
    user: `question_id: r7-q3-float-artifact. ${ONE_Q}\n\nOutput contract — ONE strict JSON object, no markdown fences:\n{"question_id": "r7-q3-float-artifact", "answer": "<= 120 words", "falsifiable_check": "one concrete check", "residual_risks": [] (0-2)}`,
  },
  {
    // v1 (r7-reasoner-float-artifact) TRUNCATED: all 1100 max_tokens consumed by
    // reasoning, empty content — receipted as-is, retry with raised budget and
    // the round-6 prefix attached (per the registered design; also tests
    // cross-model cache reuse). retry_id distinct; the failed row stands.
    call_id: 'r7-reasoner-float-artifact-retry', model: 'deepseek-reasoner', max_tokens: 2800,
    inline_fallback: true,
    user: `question_id: r7-reasoner-float-artifact. ${ONE_Q}\n\nOutput contract — ONE strict JSON object, no markdown fences:\n{"question_id": "r7-reasoner-float-artifact", "answer": "<= 120 words", "falsifiable_check": "one concrete check", "residual_risks": [] (0-2)}`,
  },
  {
    call_id: 'r7-flash-cold-iterator', model: 'deepseek-chat', temperature: 0.3, max_tokens: 600,
    cold: false, // WIRE DEFECT RECEIPTED: run-1 code attached the prefix anyway —
    // usage proves it (1408 cached). Kept as the warm-brief arm; v2 below is the true cold.
    user: `You are auditing a deterministic cellular substrate. Receipts: (1) the kernel's write order is S3 live-read row-major LWW (read-current-then-write-self per cell, row-major order), deterministic across reruns. (2) Sigma is now Q32.32 fixed-point (S=2^32). (3) At UNCOUPLED exact-zero pressure families for rational sigma (5acc+8r=0 at 8/5; 10acc+7r=0 at 7/10; 3acc+2r=0 at 2/3) the FLOAT kernel's double rounding collapses its sigma's true nonzero pressure to exactly 0 (cell holds) while the FIXED kernel keeps the honest remainder and moves — the float kernel is the LESS faithful plane there.\n\nquestion_id: r7-flash-cold-iterator. ${ONE_Q}\n\nOutput contract — ONE strict JSON object, no markdown fences:\n{"question_id": "r7-flash-cold-iterator", "answer": "<= 120 words", "falsifiable_check": "one concrete check", "residual_risks": [] (0-2)}`,
  },
  {
    // THE true cold fast-iterator measurement: no system message on the wire at
    // all — self-contained brief + the ONE question. v1's prefix leak is
    // receipted above; this row is the cache-0 datum for the experiment.
    call_id: 'r7-flash-cold-iterator-v2-truecold', model: 'deepseek-chat', temperature: 0.3, max_tokens: 600,
    cold: true,
    user: `You are auditing a deterministic cellular substrate. Receipts: (1) the kernel's write order is S3 live-read row-major LWW (read-current-then-write-self per cell, row-major order), deterministic across reruns. (2) Sigma is now Q32.32 fixed-point (S=2^32). (3) At UNCOUPLED exact-zero pressure families for rational sigma (5acc+8r=0 at 8/5; 10acc+7r=0 at 7/10; 3acc+2r=0 at 2/3) the FLOAT kernel's double rounding collapses its sigma's true nonzero pressure to exactly 0 (cell holds) while the FIXED kernel keeps the honest remainder and moves — the float kernel is the LESS faithful plane there.\n\nquestion_id: r7-flash-cold-iterator. ${ONE_Q}\n\nOutput contract — ONE strict JSON object, no markdown fences:\n{"question_id": "r7-flash-cold-iterator", "answer": "<= 120 words", "falsifiable_check": "one concrete check", "residual_risks": [] (0-2)}`,
  },
];

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const PRICES = {
  served_note: 'round-6 receipted basis; deepseek-chat served by deepseek-flash',
  source: 'https://api-docs.deepseek.com/quick_start/pricing fetched 2026-09-27 (round-6 declared basis)',
  off_peak: { input_cache_hit_per_1m: 0.003, input_cache_miss_per_1m: 0.15, output_per_1m: 0.6 },
  peak: { input_cache_hit_per_1m: 0.006, input_cache_miss_per_1m: 0.30, output_per_1m: 1.20 },
};
const usd = (u, p) => {
  const hit = ((u.prompt_cache_hit_tokens || 0) / 1e6) * p.input_cache_hit_per_1m;
  const miss = ((u.prompt_cache_miss_tokens || 0) / 1e6) * p.input_cache_miss_per_1m;
  const out = ((u.completion_tokens || 0) / 1e6) * p.output_per_1m;
  return { hit, miss, out, total: hit + miss + out };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const appendRow = (file, obj) => fs.appendFileSync(file, JSON.stringify(obj) + '\n', 'utf8');

function firstBalancedObject(t) {
  const a = t.indexOf('{');
  if (a === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = a; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { text: t.slice(a, i + 1), repaired: false }; }
  }
  if (!inStr && depth > 0) return { text: t.slice(a) + '}'.repeat(depth), repaired: true };
  return null;
}
function extractJson(raw) {
  const t = raw.trim();
  try { return { obj: JSON.parse(t), method: 'direct' }; } catch { /* fall through */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return { obj: JSON.parse(fence[1].trim()), method: 'fence-strip' }; } catch { /* fall through */ } }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a !== -1 && b > a) { try { return { obj: JSON.parse(t.slice(a, b + 1)), method: 'brace-extract' }; } catch { /* fall through */ } }
  const fbo = firstBalancedObject(t);
  if (fbo) { try { return { obj: JSON.parse(fbo.text), method: fbo.repaired ? 'brace-close' : 'first-object' }; } catch { /* fall through */ } }
  return { obj: null, method: 'failed' };
}

async function callDeepseek(model, userMsg, { temperature = null, max_tokens = 600, system = SYSTEM_PREFIX } = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY missing from env');
  const messages = [{ role: 'user', content: userMsg }];
  // round-6 wire shape: system = the byte-identical cache asset; system=null
  // means a genuinely cold call (fast-iterator v2) — nothing on the wire but
  // the user turn
  if (system !== null) messages.unshift({ role: 'system', content: system });
  const body = { model, messages, max_tokens, stream: false };
  if (temperature !== null) body.temperature = temperature;
  const t0 = Date.now();
  const res = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const ms = Date.now() - t0;
  if (!res.ok) throw new Error(`http_${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { j: await res.json(), ms };
}

function loadDone(file) {
  if (!fs.existsSync(file)) return new Set();
  const done = new Set();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (r.call_id) done.add(r.call_id); } catch { /* torn tail */ }
  }
  return done;
}

// ── self-scan: no key material may enter any written file ────────────────────
const SECRETS = ['DEEPSEEK_API_KEY', 'TYPESAFE_KEY', 'TYPESAFE_API_KEY', 'MOTH_KEY', 'MOTH_LK', 'GH_TOKEN']
  .map((k) => process.env[k]).filter((v) => v && v.length >= 8);
function scan(text) {
  const s = String(text);
  if (s.includes('Bearer ')) return 'bearer-pattern';
  for (const k of SECRETS) if (s.includes(k)) return 'key-material';
  return null;
}
function scannedAppend(file, obj) {
  const line = JSON.stringify(obj);
  const bad = scan(line);
  if (bad) { console.error('SELF-SCAN BLOCKED (' + bad + ') — aborting before write'); process.exit(2); }
  appendRow(file, obj);
}

// ══════════════════════════ 1. DEEPSEEK (guest + reasoner + iterator) ═══════
async function deepseekPhase() {
  const done = loadDone(DS_FILE);
  const totals = { calls: 0, prompt_tokens: 0, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 0, completion_tokens: 0, reasoning_tokens: 0, ms_total: 0 };
  for (const c of CALLS) {
    if (done.has(c.call_id)) { console.log('skip (done):', c.call_id); continue; }
    // prompt-sha convention matches round 6: sha(SYSTEM_PREFIX + user) for warm
    // calls (the wire shape IS system=prefix + user, byte-identical to r6);
    // sha(user) alone for cold calls (no system message on the wire)
    const promptSha = c.cold ? sha(c.user) : sha(SYSTEM_PREFIX + c.user);
    console.log('call', c.call_id, '(' + c.model + (c.cold ? ', COLD no-prefix' : ', warm prefix') + ') …');
    let res = null;
    try {
      try {
        res = await callDeepseek(c.model, c.user, { temperature: c.temperature ?? null, max_tokens: c.max_tokens, system: c.cold ? null : SYSTEM_PREFIX });
      } catch (e1) {
        if (c.inline_fallback && /^http_4/.test(String(e1.message || e1))) {
          console.log('  system-message attempt failed (' + String(e1.message).slice(0, 60) + ') — inline-fallback: prefix inlined into user turn');
          res = await callDeepseek(c.model, SYSTEM_PREFIX + '\n\n' + c.user, { max_tokens: c.max_tokens });
          res.inlined = true;
        } else throw e1;
      }
      const { j, ms } = res;
      const u = j.usage || {};
      const raw = j.choices?.[0]?.message?.content ?? '';
      const ex = extractJson(raw);
      const row = {
        wave: '36-b', round: 7, call_id: c.call_id, sealed_at: now(),
        model: { requested: c.model, served: j.model, system_fingerprint: j.system_fingerprint ?? null },
        prefix: c.cold ? { mode: 'cold-minimal', note: 'fast-iterator experiment: no transcript prefix' }
                       : { mode: 'round-6-prefix', sha256: PREFIX_SHA, chars: SYSTEM_PREFIX.length, inlined: !!res.inlined },
        retry_of: c.call_id.endsWith('-retry') ? 'r7-reasoner-float-artifact (truncated: reasoning consumed the whole max_tokens budget, content empty)' : undefined,
        prompt_sha256: promptSha, temperature: c.temperature ?? null, max_tokens: c.max_tokens,
        latency_ms: ms,
        usage: u,
        reasoning_tokens: j.choices?.[0]?.message?.reasoning_content ? (u.completion_tokens_details?.reasoning_tokens ?? null) : null,
        content_raw: raw,
        content_parsed: ex.obj, parse_method: ex.method,
        question_id: ex.obj?.question_id ?? c.call_id,
      };
      scannedAppend(DS_FILE, row);
      totals.calls++; totals.prompt_tokens += u.prompt_tokens || 0;
      totals.prompt_cache_hit_tokens += u.prompt_cache_hit_tokens || 0;
      totals.prompt_cache_miss_tokens += u.prompt_cache_miss_tokens || 0;
      totals.completion_tokens += u.completion_tokens || 0;
      totals.reasoning_tokens += u.completion_tokens_details?.reasoning_tokens || 0;
      totals.ms_total += ms;
      console.log('  sealed:', c.call_id, '| served:', j.model, '| ms:', ms,
        '| cache hit:', u.prompt_cache_hit_tokens ?? '?', '/', u.prompt_tokens ?? '?',
        '| completion:', u.completion_tokens ?? '?', '| parse:', ex.method);
    } catch (e) {
      scannedAppend(DS_FILE, { wave: '36-b', round: 7, call_id: c.call_id, sealed_at: now(), error: String(e.message || e).slice(0, 200), prefix_sha256: c.cold ? null : PREFIX_SHA });
      console.log('  DEAD:', c.call_id, e.message);
    }
    await sleep(700);
  }
  return totals;
}

// ══════════════════════════ 2. TYPESAFE (typed distributions) ═══════════════
async function typesafePhase() {
  // resume-safe: the probe already sealed this round — do not re-spend
  if (fs.existsSync(TS_FILE) && fs.readFileSync(TS_FILE, 'utf8').trim()) {
    console.log('[typesafe] already sealed this round — skip (resume-safe)');
    return null;
  }
  const key = loadTypesafeKey();
  if (!key) { scannedAppend(TS_FILE, { house: 'typesafe', live: false, why: 'no TYPESAFE_KEY in env', sealed_at: now() }); return null; }
  const state = 'Tavern round seven, competitive ideation across houses. Receipts served: a deterministic substrate kernel\'s write order is S3 live-read row-major LWW (read-current-then-write-self per cell, row-major), deterministic across reruns. Sigma is now Q32.32 fixed-point (S=2^32). At uncoupled exact-zero pressure families for rational sigma (5acc+8r=0 at 8/5; 10acc+7r=0 at 7/10; 3acc+2r=0 at 2/3) the FLOAT kernel\'s double rounding collapses its sigma\'s true nonzero pressure to exactly 0 (cell holds) while the FIXED kernel keeps the honest remainder and moves — the float kernel is the LESS faithful plane there. Open: whether the S3 live-read semantics can also produce a FLOAT-ONLY artifact (behavior existing only because sigma is a double).';
  const questions = {
    smallest_experiment: {
      type: 'choice',
      instructions: 'Which is the SMALLEST experiment that would establish whether the S3 live-read semantics can produce a float-only artifact?',
      criteria: {
        cooker_diff: 'Run the existing 64x1 cooker (T=64, 4096 writes) once with the float kernel and once with the fixed kernel at sigma=2/3; byte-diff per-tick state traces — any divergence is the artifact',
        unit_probe: 'Unit probe: instrument the float kernel to log its effective sigma after double rounding at the exact-zero families — drift from the exact rational anywhere is the artifact',
        s_sweep: 'Sweep S=2^32 vs 2^48 vs rational (p,q) sigma across all 23 family cases and diff the planes',
      },
    },
    decisiveness: {
      type: 'score',
      instructions: 'How decisive would your chosen smallest experiment be, if run as described?',
      criteria: ['suggestive', 'bounded', 'decisive', 'canonical'],
    },
    float_artifact_prior: {
      type: 'noul',
      instructions: 'p = your probability that the S3 live-read semantics CAN produce a float-only artifact, given the receipts above',
    },
  };
  const t0 = Date.now();
  try {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'jev-1.13.0', state, questions }),
      signal: AbortSignal.timeout(30_000),
    });
    const ms = Date.now() - t0;
    if (!res.ok) throw new Error(`systemone HTTP ${res.status}`);
    const data = await res.json();
    const ans = data.answers || {};
    const row = {
      house: 'typesafe', guest: 'systemone-jev-1.13.0', sealed_at: now(), live: true,
      question_shape: 'typed distributions (no free-text lane on the receipted wire protocol); the ONE question mapped to choice+score+noul, declared',
      state_chars: state.length,
      answers: ans, usage: data.usage || null, latency_ms: ms, model: data.model || 'jev-1.13.0',
      honesty: 'the guest answered in typed distributions; sealed AS SAID',
    };
    scannedAppend(TS_FILE, row);
    console.log('[typesafe] answered in', ms, 'ms:', JSON.stringify({
      choice: ans.smallest_experiment?.choice, score: ans.decisiveness?.score, noul: ans.float_artifact_prior?.noul,
    }));
    return row;
  } catch (e) {
    const row = { house: 'typesafe', guest: 'systemone-jev-1.13.0', sealed_at: now(), live: false, fail_closed: true, why: String(e.message || e).slice(0, 200), latency_ms: Date.now() - t0 };
    scannedAppend(TS_FILE, row);
    console.log('[typesafe] fail-closed:', row.why);
    return row;
  }
}

// ══════════════════════════ 3. MOTH (capability probe) ══════════════════════
async function mothPhase() {
  // resume-safe: the probe already sealed this round — do not re-spend
  if (fs.existsSync(MOTH_FILE) && fs.readFileSync(MOTH_FILE, 'utf8').trim()) {
    console.log('[moth] already sealed this round — skip (resume-safe)');
    return null;
  }
  const key = loadKey();
  const lk = process.env.MOTH_LK || null;
  const rows = [];
  // probe 1: is there ANY chat/completions lane? Bearer MOTH_KEY, then the
  // declared alternates (MOTH_LK as Bearer, then x-api-key) — receipted attempts.
  const chatProbe = async (k, headerStyle) => {
    const headers = headerStyle === 'x-api-key'
      ? { 'x-api-key': k, 'Content-Type': 'application/json' }
      : { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' };
    const t0 = Date.now();
    try {
      const res = await fetch('https://api.mothquantum.com/api/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ model: 'moth-chat', max_tokens: 200, messages: [{ role: 'user', content: ONE_Q }] }),
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      return { style: headerStyle, key: k === key ? 'MOTH_KEY' : 'MOTH_LK', status: res.status, ms: Date.now() - t0, body_head: text.slice(0, 160) };
    } catch (e) {
      return { style: headerStyle, key: k === key ? 'MOTH_KEY' : 'MOTH_LK', status: 0, ms: Date.now() - t0, error: String(e.message || e).slice(0, 120) };
    }
  };
  let chat = null;
  if (key) { chat = await chatProbe(key, 'bearer'); rows.push({ probe: 'chat-completions', ...chat }); }
  if ((!chat || chat.status === 401 || chat.status === 403 || chat.status === 404) && lk) {
    const r2 = await chatProbe(lk, 'bearer'); rows.push({ probe: 'chat-completions', ...r2 });
    if (r2.status !== 200) { const r3 = await chatProbe(lk, 'x-api-key'); rows.push({ probe: 'chat-completions', ...r3 }); if (r3.status === 200) chat = r3; }
    else chat = r2;
  }
  const chatLane = chat && chat.status === 200;
  // probe 2: the known-good quantum lane (attendance provenance, 256 shots)
  let graph = null;
  try {
    const pb = await probeBase(key);
    if (!pb.ok) graph = { ok: false, why: pb.why };
    else {
      const j = await graphJob(pb.base, key, { shots: 256, seq: 0 });
      graph = { ok: j.ok, why: j.why, job_id: j.job_id, engine: j.engine, backend: j.backend, shots: j.shots, latency_ms: j.latency_ms, distinct_outcomes: j.distinct_outcomes, bits_len: j.bits_len, ones: j.ones, note: 'quantum house cannot ideate prose — attends as entropy oracle / provenance only (receipted expectation)' };
    }
  } catch (e) { graph = { ok: false, why: String(e.message || e).slice(0, 160) }; }
  const row = { house: 'moth', sealed_at: now(), chat_lane_live: !!chatLane, chat_probes: rows, graph_job: graph, honesty: 'capability probe AS MEASURED; a fail here is an honest record, not a hidden failure' };
  scannedAppend(MOTH_FILE, row);
  console.log('[moth] chat lane live:', chatLane, '| graph job ok:', graph.ok, graph.why ? '(' + graph.why + ')' : '');
  return row;
}

// ══════════════════════════ main ═════════════════════════════════════════════
const summary = { wave: '36-b', round: 7, sealed_at: now(), prefix: { sha256: PREFIX_SHA, chars: SYSTEM_PREFIX.length, sealed_asset: SEALED_PREFIX_SHA } };
summary.deepseek = await deepseekPhase();
summary.typesafe = await typesafePhase();
summary.moth = await mothPhase();
if (summary.deepseek?.prompt_tokens) {
  const utcHour = new Date().getUTCHours();
  const basis = utcHour >= 6 && utcHour < 10 ? 'peak' : 'off_peak';
  summary.deepseek.cache_hit_ratio = summary.deepseek.prompt_cache_hit_tokens / summary.deepseek.prompt_tokens;
  summary.deepseek.price_basis_declared = basis;
  summary.deepseek.usd = usd(summary.deepseek, PRICES[basis]);
  summary.deepseek.usd_if_no_cache = (summary.deepseek.prompt_tokens / 1e6) * PRICES[basis].input_cache_miss_per_1m + (summary.deepseek.completion_tokens / 1e6) * PRICES[basis].output_per_1m;
}
fs.writeFileSync(SUM_FILE, JSON.stringify(summary, null, 1));
console.log('summary:', JSON.stringify(summary, null, 1));
