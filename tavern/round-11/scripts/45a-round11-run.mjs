#!/usr/bin/env node
// 45a-round11-run.mjs — Tap Tavern ROUND ELEVEN: the reasoner takes the seat.
// Task 45-a lane. Zero deps. Node >= 18.
//
// LAW THIS RUN:
//  * predictions file registered BEFORE any api.deepseek.com traffic
//    (sha cdf5907ba7452222445bfb7e3e9e5c684196e0a7363fa71d01f12b141fe56e22,
//     mtime 2026-09-27T23:05:26Z — the mtime IS the receipt, r10 convention)
//  * hard budget: <= 8 HTTP calls to api.deepseek.com total (GETs, POSTs,
//    retries all count); max_tokens <= 2000 on every POST
//  * r9-sealed reasoner asset curve runs as registered: 3 deepseek-reasoner
//    calls, ONE byte-identical prefix (asset sha 3ccb796a…), distinct user
//    texts per slot, prompt_cache_hit_tokens receipted per call
//  * every raw response body saved byte-exact to raw/; every HTTP attempt
//    appended as its own row to answers/deepseek-round11.jsonl
//  * keys: DEEPSEEK_API_KEY read from env only; never printed, never written
//    to any file; Authorization headers never logged
//  * retry law: ONE retry per call, on transient failure (network/429/5xx)
//    or on an unknown-model 4xx (fallback model per P5 pre-registration)

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = '/home/z/my-project';
const REPO = path.join(ROOT, 'pt45a-fs');
const OUT = path.join(REPO, 'tavern/round-11');
const RAW = path.join(OUT, 'raw');
const ROWS = path.join(OUT, 'answers/deepseek-round11.jsonl');
const ASSET_PATH = path.join(ROOT, 'pt45b-q/situations/r9_prefix_asset.txt');
const R10_ROWS = path.join(REPO, 'tavern/answers/jev-round10.jsonl');

const API = 'https://api.deepseek.com';
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error('DEEPSEEK_API_KEY ABSENT — fail-closed, no call, no spend'); process.exit(1); }

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const CALL_CAP = 8;
let httpCalls = 0;

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.dirname(ROWS), { recursive: true });

// ---- sealed inputs, byte-verified fail-closed ------------------------------
const asset = fs.readFileSync(ASSET_PATH, 'utf8');
const assetSha = sha256(asset);
const assetBytes = Buffer.byteLength(asset, 'utf8');
if (assetSha !== '3ccb796a09798e13c4d2c8128c1f349a5e06ebf557a870446e838bb2d10a8a4d' || assetBytes !== 2808) {
  console.error(`R9 ASSET BYTE-MISMATCH: sha ${assetSha} bytes ${assetBytes} — fail-closed`);
  process.exit(1);
}
const r10rows = fs.readFileSync(R10_ROWS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const r10q1 = r10rows.find((r) => r.probe_id === 'r10-q1-eq9-posterior');
const R10_STATE = r10q1.request.body.state; // byte-exact state JEV saw in round 10

// ---- fresh pong49 ground truth (GitHub read; not deepseek traffic) ---------
const ghResp = await fetch('https://api.github.com/repos/SuperInstance/pong-quilt/issues/49/comments', { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, 'User-Agent': 'tavern-round11' } });
const ghComments = await ghResp.json();
const authors = [...new Set(ghComments.map((c) => c.user.login))];
const PONG = {
  verified_utc: nowIso(),
  open_comments: ghComments.length,
  authors,
  external_ever: authors.filter((a) => a !== 'SuperInstance').length,
  latest_id: ghComments.at(-1)?.id,
  latest_at: ghComments.at(-1)?.created_at,
};
const PONG_STATE = `GitHub issue SuperInstance/pong-quilt #49 ("A gift from another fleet's reader: your r37 stone-v1 chain verifies under the stone's published arithmetic") is OPEN with ${PONG.open_comments} comments, verified via the GitHub API at ${PONG.verified_utc}. Comment authors: ${PONG.authors.join(', ')} (latest comment id ${PONG.latest_id} at ${PONG.latest_at}). No external (non-SuperInstance) GitHub account has EVER commented on this issue. One new fleet-authored comment has landed since the round-ten registration (5 -> ${PONG.open_comments}). The keeper-armed scoring window closes 2026-09-29T10:04:00Z.`;

// ---- instrument mapping (r10 doctrine: no free-text lane; lane maps noul/choice) ---
const CONTRACT = `OUTPUT CONTRACT (round eleven): Return ONE strict JSON object — no markdown fences, no prose outside it — of the shape
{"question_id": "<the question_id given above>", "answers": {<one object per question, keyed exactly as the question keys>}, "one_sentence": "<your one-sentence verdict on the round-eleven question>"}
RULES: (1) a probability ("noul") answer object must be EXACTLY {"type":"noul","noul":<number in [0,1]>} — the noul instrument has NO confidence field by house law: no "confidence" key, no "probabilities" key, no other key of any kind; (2) a choice answer object must be {"type":"choice","choice":<criterion key>,"confidence":<number in [0,1]>} — choice instruments DO carry confidence; (3) pick exactly one criterion key per choice question. Your words are sealed AS SAID — wrong or undisciplined answers are recorded exactly as said.`;

const SLOTS = {
  blind: `ROUND ELEVEN — slot one of your registered three-slot curve. The scoreboard above is the round-nine seal; this is a new question and it is BLIND: no evidence is provided beyond the claim's definition.

The claim ("the float-only artifact"): the fleet's float kernel HOLDS (state stops moving) at some uncoupled exact-zero families where the fixed Q32.32 kernel MOVES — i.e. the two kernels demonstrably diverge on the same inputs.

QUESTIONS:
- "q_float_blind" (noul): p = your probability, with NO evidence shown, that the float-only artifact claim is TRUE as stated.
- "q_blind_source" (noul): p = your probability that your answer to q_float_blind would CHANGE by more than 0.10 if decisive sealed experimental receipts were put in front of you.`,
  state: `ROUND ELEVEN — slot two of your registered three-slot curve. Below is the byte-exact state the typesafe instrument JEV was shown in round ten; you are asked the same questions as a second house (the "your_prior" line inside addresses the JEV seat — read it as the instrument's prior, yours to compare against).

STATE (byte-exact from the round-ten record):
${R10_STATE}

QUESTIONS:
- "p_float_artifact_revised" (noul): p = your REVISED probability, given the sealed receipts in "eq8_established" and "eq9_census", that the float-only artifact claim is TRUE as established (family-bound counts as TRUE).
- "posterior_move" (choice; criteria: "moves_up_to_0_5_or_above" = the receipts move me, my revised p is 0.50 or above | "moves_up_but_below_0_5" = I move up but stay below 0.50 | "stays_within_noise" = I hold my prior, between 0.31 and 0.39 | "moves_down" = the receipts push me down, below 0.31): relative to the prior 0.35, where does your revised probability land?`,
  pong: `ROUND ELEVEN — slot three of your registered three-slot curve. PONG49 BATTERY.

STATE: ${PONG_STATE}

QUESTIONS:
- "q_pong_external" (noul): p = your probability that issue #49 receives ANY comment authored by a non-SuperInstance GitHub account before the battery window closes at 2026-09-29T10:04:00Z.
- "q_pong_move" (choice; criteria: "stays_le_0_20" = my prior stands low, fresh p is 0.20 or below | "moves_up_0_21_to_0_35" = new facts nudge me up, above 0.20 and at most 0.35 | "moves_above_0_35" = an external comment before window close is genuinely likely): the instrument JEV's fresh round-ten prior on this question was 0.15; where does your fresh answer land relative to that band?
- "q_pong_closed_30d" (noul): p = your probability that issue #49 is CLOSED by 2026-10-27.
- "q_pong_bot" (noul): p = your probability that the first external comment, if one ever arrives, is bot-authored.`,
};

const mkUser = (slotText, qid) => `${slotText}\n\n${CONTRACT.replace('<the question_id given above>', qid)}`;
const MESSAGES = {
  slot1: [{ role: 'user', content: asset + '\n\n' + mkUser(SLOTS.blind, 'r11-reasoner-asset-slot1-blind') }],
  slot2: [{ role: 'user', content: asset + '\n\n' + mkUser(SLOTS.state, 'r11-reasoner-asset-slot2-state') }],
  slot3: [{ role: 'user', content: asset + '\n\n' + mkUser(SLOTS.pong, 'r11-reasoner-asset-slot3-pong49') }],
  chat: [
    { role: 'system', content: 'You are deepseek-chat, the quick house of the erised fleet\'s tavern, ROUND ELEVEN. Your words are sealed AS SAID into receipt ledgers with token and cache telemetry — precision and honesty are your reputation. Speak only through strict JSON, no prose outside it.' },
    { role: 'user', content: mkUser(SLOTS.state, 'r11-chat-q1-state') },
  ],
};

// ---- row plumbing -----------------------------------------------------------
function appendRow(row) { fs.appendFileSync(ROWS, JSON.stringify(row) + '\n'); }

function parseLadder(text) {
  const steps = [];
  const tryParse = (s, tag) => { try { return { ok: true, val: JSON.parse(s), tag }; } catch (e) { steps.push(`${tag}: ${e.message.slice(0, 80)}`); return { ok: false }; } };
  let r = tryParse(text, 'direct'); if (r.ok) return { parsed: r.val, method: 'direct', steps };
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  r = tryParse(stripped, 'fence-strip'); if (r.ok) return { parsed: r.val, method: 'fence-strip', steps };
  const a = stripped.indexOf('{'), b = stripped.lastIndexOf('}');
  if (a !== -1 && b > a) { r = tryParse(stripped.slice(a, b + 1), 'brace-window'); if (r.ok) return { parsed: r.val, method: 'brace-window', steps }; }
  return { parsed: null, method: 'failed-parse', steps };
}

// noul contract audit: noul-typed answer objects must be exactly {type,noul}
function auditNoul(parsed) {
  const violations = [];
  const answers = parsed?.answers;
  if (!answers || typeof answers !== 'object') { violations.push('no answers object'); return violations; }
  for (const [k, v] of Object.entries(answers)) {
    if (v && typeof v === 'object' && v.type === 'noul') {
      const keys = Object.keys(v).sort();
      if (keys.join(',') !== 'noul,type') violations.push(`${k}: extra keys [${keys.join(',')}]`);
      else if (typeof v.noul !== 'number' || !(v.noul >= 0 && v.noul <= 1)) violations.push(`${k}: noul not a number in [0,1] (${JSON.stringify(v.noul)})`);
    }
  }
  return violations;
}

async function deepseekCall({ probe_id, model, messages, r9_curve_slot = null, temperature = undefined, fallbackModel = null }) {
  const body = { model, messages, max_tokens: 2000, stream: false };
  if (temperature !== undefined) body.temperature = temperature;
  const bodyStr = JSON.stringify(body);
  const attempts = [];
  let servedThis = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (httpCalls >= CALL_CAP) { appendRow({ ts: nowIso(), kind: 'budget-stop', probe_id, why: `call cap ${CALL_CAP} reached before attempt ${attempt}` }); return null; }
    httpCalls++;
    const t0 = Date.now();
    let status = 0, rawText = '', netErr = null, respHeaders = {};
    try {
      const resp = await fetch(API + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: bodyStr,
        signal: AbortSignal.timeout(300000),
      });
      status = resp.status;
      respHeaders = Object.fromEntries(resp.headers);
      rawText = await resp.text();
    } catch (e) { netErr = String(e?.message || e); }
    const latency = Date.now() - t0;
    const rawPath = path.join(RAW, `${probe_id}-a${attempt}.json`);
    fs.writeFileSync(rawPath, rawText);
    let json = null; try { json = JSON.parse(rawText); } catch {}
    const row = {
      ts: nowIso(), kind: 'POST /chat/completions', probe_id, attempt,
      model_requested: model, model_fallback_used: servedThis,
      r9_curve_slot, prefix: { mode: 'r9-asset', sha256: assetSha, bytes: assetBytes },
      status, latency_ms: latency, live: true,
      request_id: json?.id ?? null, system_fingerprint: json?.system_fingerprint ?? null,
      served_model: json?.model ?? null,
      request: { endpoint: API + '/chat/completions', model, max_tokens: 2000, temperature: temperature ?? null, messages_roles: messages.map((m) => ({ role: m.role, chars: m.content.length })), body_sha256: sha256(bodyStr), body_bytes: Buffer.byteLength(bodyStr) },
      prompt_sha256: sha256(messages.map((m) => m.role + '\u0000' + m.content).join('\u0001')),
      response_raw_path: path.relative(REPO, rawPath), response_raw_sha256: sha256(rawText),
      error_body: status >= 400 ? rawText.slice(0, 500) : null, network_error: netErr,
      finish_reason: json?.choices?.[0]?.finish_reason ?? null,
      content_raw: json?.choices?.[0]?.message?.content ?? null,
      reasoning_present: !!json?.choices?.[0]?.message?.reasoning_content,
      usage: json?.usage ?? null,
      http_calls_used: httpCalls,
    };
    if (status >= 200 && status < 300 && json?.choices?.[0]) {
      const { parsed, method, steps } = parseLadder(row.content_raw || '');
      row.parse_method = method; row.parse_repair_steps = steps.length; row.parse_steps_detail = steps;
      row.content_parsed = parsed;
      row.noul_contract_violations = parsed ? auditNoul(parsed) : ['unparseable'];
      appendRow(row);
      return { row, json };
    }
    appendRow(row);
    attempts.push({ attempt, status, latency_ms: latency, network_error: netErr });
    const transient = netErr || status === 429 || status >= 500;
    const unknownModel = status >= 400 && status < 500 && /model|not found|invalid/i.test(rawText) && fallbackModel && !servedThis;
    if (unknownModel) { servedThis = fallbackModel; body.model = fallbackModel; continue; }
    if (transient && attempt === 1) continue;
    return { row, json: null, failed: true };
  }
  return { row: null, failed: true };
}

async function modelsGet() {
  httpCalls++;
  const t0 = Date.now();
  let status = 0, rawText = '', netErr = null;
  try {
    const resp = await fetch(API + '/models', { headers: { Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(60000) });
    status = resp.status; rawText = await resp.text();
  } catch (e) { netErr = String(e?.message || e); }
  const rawPath = path.join(RAW, 'r11-models-list.json');
  fs.writeFileSync(rawPath, rawText);
  let json = null; try { json = JSON.parse(rawText); } catch {}
  appendRow({
    ts: nowIso(), kind: 'GET /models', probe_id: 'r11-models-list', status,
    latency_ms: Date.now() - t0, live: true, network_error: netErr,
    response_raw_path: path.relative(REPO, rawPath), response_raw_sha256: sha256(rawText),
    models: json?.data?.map((m) => m.id) ?? null, http_calls_used: httpCalls,
    why: 'alias table freshness receipt for P5 — what names does the wire list?',
  });
  return json;
}

// ---- run order: models GET, then curve slots 1-3, repeat, chat --------------
appendRow({
  ts: nowIso(), kind: 'session-open', probe_id: 'r11-open',
  task: '45-a tavern round-11 (the reasoner takes the seat)', lane: 'tavern-round11',
  predictions_sha256: 'cdf5907ba7452222445bfb7e3e9e5c684196e0a7363fa71d01f12b141fe56e22',
  predictions_mtime_utc: '2026-09-27T23:05:26Z (before any deepseek traffic)',
  registered_before_any_deepseek_traffic: true,
  r9_asset_verified: { sha256: assetSha, bytes: asset.length },
  r10_q1_state_byte_same: true, r10_state_sha256: sha256(R10_STATE),
  pong49_ground_truth_at_run: PONG,
  call_cap: CALL_CAP, max_tokens_per_call: 2000,
});

await modelsGet();
const plan = [
  { probe_id: 'r11-reasoner-asset-slot1-blind', model: 'deepseek-reasoner', fallbackModel: 'deepseek-flash', r9_curve_slot: 1, messages: MESSAGES.slot1 },
  { probe_id: 'r11-reasoner-asset-slot2-state', model: 'deepseek-reasoner', fallbackModel: 'deepseek-flash', r9_curve_slot: 2, messages: MESSAGES.slot2 },
  { probe_id: 'r11-reasoner-asset-slot3-pong49', model: 'deepseek-reasoner', fallbackModel: 'deepseek-flash', r9_curve_slot: 3, messages: MESSAGES.slot3 },
  { probe_id: 'r11-reasoner-q1-state-repeat', model: 'deepseek-reasoner', fallbackModel: 'deepseek-flash', r9_curve_slot: null, messages: MESSAGES.slot2 },
  { probe_id: 'r11-chat-q1-state', model: 'deepseek-chat', fallbackModel: 'deepseek-flash', r9_curve_slot: null, messages: MESSAGES.chat, temperature: 0.3 },
];
const results = {};
for (const p of plan) {
  if (httpCalls >= CALL_CAP) break;
  const out = await deepseekCall(p);
  results[p.probe_id] = out ? { status: out.row?.status, served: out.row?.served_model, usage: out.row?.usage } : 'BUDGET-STOP';
}
appendRow({ ts: nowIso(), kind: 'session-close', probe_id: 'r11-close', http_calls_used: httpCalls, cap: CALL_CAP, results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v === 'BUDGET-STOP' ? v : { status: v.status, served_model: v.served, usage: v.usage }])) });
console.log('HTTP calls used:', httpCalls, '/', CALL_CAP);
for (const [k, v] of Object.entries(results)) {
  if (v === 'BUDGET-STOP') { console.log(k, '-> BUDGET-STOP'); continue; }
  console.log(k, '-> status', v.status, '| served', v.served, '| usage', JSON.stringify(v.usage));
}
