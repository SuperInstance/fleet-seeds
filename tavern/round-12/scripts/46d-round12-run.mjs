#!/usr/bin/env node
// 46d-round12-run.mjs — Tap Tavern ROUND TWELVE: the blind prior, asked
// asset-free (task 46-d lane). Zero deps. Node >= 18.
//
// LAW THIS RUN:
//  * predictions file registered BEFORE any api.deepseek.com traffic
//    (sha ffb3d245908894642f3ea74789df5160c5cf093a0a0ce8ef24a018733a8db192,
//     mtime 2026-09-28T00:42:17Z, committed 1c736253…/rebased lineage — the
//     verifier's D16 re-checks call-ts > registration-commit-date)
//  * this script reads the prompts FROM the registration file and assembles
//    request bodies byte-exactly per its assembly_law — any drift fail-closes
//  * ASSET-FREENESS: the blind prompts carry the claim's definition ONLY
//    (no r9 asset, no receipts, no prior answers) — mechanically re-checked
//    by verify_round12.mjs D9/D10
//  * hard budget: <= 6 HTTP calls total (planned 5: 1 GET + 4 POSTs, 1
//    reserve retry); max_tokens = 2000 on every POST
//  * send order: GET /models -> BOTH blind calls -> BOTH reveal calls
//  * every raw response body saved byte-exact to raw/; every HTTP attempt
//    appended as its own row to answers/deepseek-round12.jsonl
//  * keys: DEEPSEEK_API_KEY read from env only; never printed, never written
//    to any file; Authorization headers never logged
//  * retry law: ONE retry per call on transient failure (network/429/5xx)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const REPO = '/home/z/my-project/pt45a-fs';
const OUT = path.join(REPO, 'tavern/round-12');
const RAW = path.join(OUT, 'raw');
const ROWS = path.join(OUT, 'answers/deepseek-round12.jsonl');
const REG_SHA = 'ffb3d245908894642f3ea74789df5160c5cf093a0a0ce8ef24a018733a8db192';
const REG_MTIME = '2026-09-28T00:42:17Z';

const API = 'https://api.deepseek.com';
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error('DEEPSEEK_API_KEY ABSENT — fail-closed, no call, no spend'); process.exit(1); }

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const CALL_CAP = 6;
let httpCalls = 0;

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.dirname(ROWS), { recursive: true });

// ---- registration is the single source of truth for the prompts -------------
const regPath = path.join(OUT, 'predictions/46d-round12-predictions.json');
if (sha256(fs.readFileSync(regPath, 'utf8')) !== REG_SHA) { console.error('REGISTRATION SHA DRIFT — fail-closed'); process.exit(1); }
const P = JSON.parse(fs.readFileSync(regPath, 'utf8')).registered_prompts_verbatim;
const mkUser = (qid, reveal) => (reveal
  ? `${P.REVEAL_FRAME}\n\nSTATE (byte-exact from the round-ten record):\n${P.R10_STATE_VERBATIM}\n\n${P.REVEAL_QUESTIONS}\n\n${P.CONTRACT.replace('<the question_id given above>', qid)}`
  : `${P.BLIND_TEXT}\n\n${P.CONTRACT.replace('<the question_id given above>', qid)}`);
const msgsFor = (probe) => probe.includes('chat')
  ? [{ role: 'system', content: P.HOUSE_LINE }, { role: 'user', content: mkUser(probe, probe.includes('reveal')) }]
  : [{ role: 'user', content: mkUser(probe, probe.includes('reveal')) }];

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

async function deepseekCall({ probe_id, model, messages, temperature = undefined }) {
  const body = { model, messages, max_tokens: 2000, stream: false };
  if (temperature !== undefined) body.temperature = temperature; // chat only, last key (verifier mirrors this)
  const bodyStr = JSON.stringify(body);
  let failed = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (httpCalls >= CALL_CAP) { appendRow({ ts: nowIso(), kind: 'budget-stop', probe_id, why: `call cap ${CALL_CAP} reached before attempt ${attempt}` }); return null; }
    httpCalls++;
    const t0 = Date.now();
    let status = 0, rawText = '', netErr = null;
    try {
      const resp = await fetch(API + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: bodyStr,
        signal: AbortSignal.timeout(300000),
      });
      status = resp.status;
      rawText = await resp.text();
    } catch (e) { netErr = String(e?.message || e); }
    const latency = Date.now() - t0;
    const rawPath = path.join(RAW, `${probe_id}-a${attempt}.json`);
    fs.writeFileSync(rawPath, rawText);
    let json = null; try { json = JSON.parse(rawText); } catch {}
    const row = {
      ts: nowIso(), kind: 'POST /chat/completions', probe_id, attempt,
      model_requested: model,
      prefix: { mode: 'asset-free', note: 'no prefix asset — registered prompt only (asset-freeness receipted in predictions ffb3d245…)' },
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
    const transient = netErr || status === 429 || status >= 500;
    if (transient && attempt === 1) { failed = { attempt, status, netErr }; continue; }
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
  const rawPath = path.join(RAW, 'r12-models-list.json');
  fs.writeFileSync(rawPath, rawText);
  let json = null; try { json = JSON.parse(rawText); } catch {}
  appendRow({
    ts: nowIso(), kind: 'GET /models', probe_id: 'r12-models-list', status,
    latency_ms: Date.now() - t0, live: true, network_error: netErr,
    response_raw_path: path.relative(REPO, rawPath), response_raw_sha256: sha256(rawText),
    models: json?.data?.map((m) => m.id) ?? null, http_calls_used: httpCalls,
    why: 'per-round wire-state receipt (r11 convention) — what names does the wire list this round?',
  });
  return json;
}

// ---- run order: GET /models, both BLIND calls, both REVEAL calls ------------
appendRow({
  ts: nowIso(), kind: 'session-open', probe_id: 'r12-open',
  task: '46-d tavern round-12 (the blind prior, asked asset-free + the r11 ledger fold)', lane: 'tavern-round12',
  predictions_sha256: REG_SHA, predictions_mtime_utc: `${REG_MTIME} (before any deepseek traffic)`,
  registered_before_any_deepseek_traffic: true,
  asset_freeness: 'blind prompts = registered BLIND_TEXT + CONTRACT only; no r9 asset (sha 3ccb796a… deliberately absent), no receipts, no prior answers; mechanically re-checked by verify_round12.mjs D9/D10',
  reveal_state: { source: 'tavern/answers/jev-round10.jsonl probe r10-q1-eq9-posterior request.body.state', sha256: sha256(P.R10_STATE_VERBATIM), chars: P.R10_STATE_VERBATIM.length, embedded_verbatim_in_registration: true },
  main_ledger_folded_tip: '1bf7f3d64947c5755c375dda896c0481506746ced46846a868e352bd9d380d16',
  call_cap: CALL_CAP, max_tokens_per_call: 2000,
});

await modelsGet();
const plan = [
  { probe_id: 'r12-reasoner-blind', model: 'deepseek-reasoner', messages: msgsFor('r12-reasoner-blind') },
  { probe_id: 'r12-chat-blind', model: 'deepseek-chat', temperature: 0.3, messages: msgsFor('r12-chat-blind') },
  { probe_id: 'r12-reasoner-reveal', model: 'deepseek-reasoner', messages: msgsFor('r12-reasoner-reveal') },
  { probe_id: 'r12-chat-reveal', model: 'deepseek-chat', temperature: 0.3, messages: msgsFor('r12-chat-reveal') },
];
const results = {};
for (const p of plan) {
  if (httpCalls >= CALL_CAP) break;
  const out = await deepseekCall(p);
  results[p.probe_id] = out ? { status: out.row?.status, served: out.row?.served_model, usage: out.row?.usage } : 'BUDGET-STOP';
}
appendRow({ ts: nowIso(), kind: 'session-close', probe_id: 'r12-close', http_calls_used: httpCalls, cap: CALL_CAP, results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v === 'BUDGET-STOP' ? v : { status: v.status, served_model: v.served, usage: v.usage }])) });
console.log('HTTP calls used:', httpCalls, '/', CALL_CAP);
for (const [k, v] of Object.entries(results)) {
  if (v === 'BUDGET-STOP') { console.log(k, '-> BUDGET-STOP'); continue; }
  console.log(k, '-> status', v.status, '| served', v.served, '| finish', v.usage ? '' : '?', '| usage', JSON.stringify(v.usage));
}
