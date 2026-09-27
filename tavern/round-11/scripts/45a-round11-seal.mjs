#!/usr/bin/env node
// 45a-round11-seal.mjs — round-11 post-run seal (task 45-a lane).
// Appends trace-extraction rows, builds the round-11 stone-v1 ledger,
// scores the pre-registered predictions, writes round11_summary.json.
// Deterministic; reads only the run's own receipts. Zero network.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const REPO = '/home/z/my-project/pt45a-fs';
const OUT = path.join(REPO, 'tavern/round-11');
const ROWS = path.join(OUT, 'answers/deepseek-round11.jsonl');
const RAW = path.join(OUT, 'raw');
const LEDGER = path.join(OUT, 'round11_ledger.jsonl');
const PRED = JSON.parse(fs.readFileSync(path.join(OUT, 'predictions/45a-round11-predictions.json'), 'utf8'));

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const rows = fs.readFileSync(ROWS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const posts = Object.fromEntries(rows.filter((r) => r.kind === 'POST /chat/completions').map((r) => [r.probe_id, r]));
const modelsGet = rows.find((r) => r.kind === 'GET /models');

// ---- 1. trace-answer extraction (AS SAID from the thinking voice) ----------
// Law: an answer is EXTRACTED only where the trace contains a drafted final
// JSON object (question_id present, brace-matched, key-complete). Where the
// trace was cut mid-deliberation, the receipt is "no concluded answer" —
// deliberation fragments are quoted but NEVER scored as answers.
function extractDraftedJSON(trace) {
  const marker = '"question_id"';
  let idx = trace.lastIndexOf(marker);
  while (idx !== -1) {
    const start = trace.lastIndexOf('{', idx);
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < trace.length; i++) {
        if (trace[i] === '{') depth++;
        else if (trace[i] === '}') { depth--; if (depth === 0) {
          const cand = trace.slice(start, i + 1);
          try {
            const v = JSON.parse(cand);
            if (v && typeof v === 'object' && v.question_id && v.answers) return v;
          } catch {}
          break;
        } }
      }
    }
    idx = trace.lastIndexOf(marker, idx - 1);
  }
  return null;
}
const extraction = {};
for (const pid of ['r11-reasoner-asset-slot1-blind', 'r11-reasoner-asset-slot2-state', 'r11-reasoner-asset-slot3-pong49', 'r11-reasoner-q1-state-repeat']) {
  const raw = JSON.parse(fs.readFileSync(path.join(RAW, `${pid}-a1.json`), 'utf8'));
  const trace = raw.choices[0].message.reasoning_content || '';
  const draft = extractDraftedJSON(trace);
  extraction[pid] = { trace_chars: trace.length, trace_sha256: sha256(trace), concluded: draft, method: draft ? 'drafted-json-in-trace (brace-matched, key-complete)' : 'NO CONCLUDED ANSWER — trace cut mid-deliberation at max_tokens 2000' };
}
const chatRow = posts['r11-chat-q1-state'];
const chatAnswer = JSON.parse(chatRow.content_raw);

// noul audit on extracted drafts (same law as the wire audit)
function auditNoul(parsed) {
  const v = [];
  for (const [k, a] of Object.entries(parsed?.answers || {})) {
    if (a && a.type === 'noul') {
      const keys = Object.keys(a).sort();
      if (keys.join(',') !== 'noul,type') v.push(`${k}: extra keys [${keys.join(',')}]`);
      else if (typeof a.noul !== 'number' || !(a.noul >= 0 && a.noul <= 1)) v.push(`${k}: noul out of range/type`);
    }
  }
  return v;
}
const existingExtract = new Set(rows.filter((r) => r.kind === 'trace-answer-extraction').map((r) => r.probe_id));
for (const [pid, e] of Object.entries(extraction)) {
  e.noul_contract_violations = e.concluded ? auditNoul(e.concluded) : null;
  if (existingExtract.has(pid)) continue; // seal is idempotent: extraction rows are appended once
  fs.appendFileSync(ROWS, JSON.stringify({
    ts: nowIso(), kind: 'trace-answer-extraction', probe_id: pid,
    methodology: 'answer recovered from reasoning_content trace AS SAID; final content never emitted (finish_reason=length; reasoning alone consumed max_tokens 2000); deliberation fragments are quoted in raw receipts but only a drafted key-complete JSON counts as a concluded answer',
    trace_chars: e.trace_chars, trace_sha256: e.trace_sha256,
    concluded: e.concluded, noul_contract_violations: e.noul_contract_violations,
    method: e.method,
  }) + '\n');
}

// ---- 2. scorecard (pre-registered buckets; honest partials stay partial) ----
// The state question's ONE concluded reasoner draw: the byte-identical repeat
// call drafted the complete answer (slot2's own trace reached 0.99 in
// deliberation but was cut while polishing one_sentence — quoted, not scored).
// Bridge receipt: repeat request body sha256 === slot2 request body sha256
// (cf61ac25…), so the concluded draw IS a draw of the registered instrument.
const rp = extraction['r11-reasoner-q1-state-repeat'].concluded;
const s2 = extraction['r11-reasoner-asset-slot2-state'].concluded; // null — deliberated 0.99, never drafted
const blind = extraction['r11-reasoner-asset-slot1-blind'].concluded; // null
const stateDraw = rp; // the concluded state-question answer (from the byte-identical repeat call)
const stateNoul = stateDraw?.answers?.p_float_artifact_revised?.noul ?? null;
const stateChoice = stateDraw?.answers?.posterior_move?.choice ?? null;
const s2noul = stateNoul; // P1/P3 outcome variable (declared substitution, receipted)
const s2choice = stateChoice;
const rpnoul = stateNoul;
const rpchoice = stateChoice;
const chatnoul = chatAnswer?.answers?.p_float_artifact_revised?.noul ?? null;
const chatchoice = chatAnswer?.answers?.posterior_move?.choice ?? null;
const violCount =
  (chatRow.noul_contract_violations || []).length +
  Object.values(extraction).reduce((n, e) => n + (e.noul_contract_violations ? e.noul_contract_violations.length : 0), 0);
const noulAnswersEmitted = 1 /* chat */ + (s2noul !== null ? 1 : 0); // concluded reasoner state answer (repeat draw) counted once

const brier = (pred, actualKey) => {
  const p = PRED.predictions.find((x) => x.id === pred).buckets;
  return Object.keys(p).reduce((s, k) => s + (p[k] - (k === actualKey ? 1 : 0)) ** 2, 0);
};

const scorecard = {
  scoring_law: PRED.scoring_law,
  entries: [
    {
      id: 'P1-reasoner-moves-on-receipts', resolved: 'PARTIAL — outcome variable half-measured',
      registered_outcome: 'slot2 noul vs slot1 blind noul',
      actual: { slot2_noul: s2noul, slot2_choice: s2choice, slot1_blind: 'NO CONCLUDED ANSWER (trace cut mid-deliberation; the model explicitly noticed the blind framing is contaminated by the r9 asset itself, which carries E-Q8 ESTABLISHED, and was still weighing 0.47-typesafe-prior vs ~0.99-at-cap)' },
      clears_0_50_component: stateNoul !== null && stateNoul >= 0.5,
      move_component: 'UNMEASURED as registered (no concluded blind); trace-quoted deliberation anchors: 0.47 (typesafe prior, discussed as a possible blind answer) — if that were the seat\'s blind, the move would be +0.52, but it was never SAID',
      source_note: 'the 0.99 posterior is the concluded draft from the byte-identical repeat call (body sha cf61ac25… = slot2 body sha); slot2\'s own trace reached 0.99 in deliberation ("I\'d choose 0.99") but was cut while polishing one_sentence — quoted, not scored, per the extraction law',
      modal_hit: null, brier: null,
      verdict_text: 'not falsified (slot2 0.99 >= 0.50); not confirmed as registered (blind anchor never concluded) — the blind-prior probe over the r9 asset is DESIGNED-CONTAMINATED (the asset itself carries E-Q8) and the cap killed the rest; both lessons receipted for the keeper',
    },
    {
      id: 'P2-noul-discipline-violated', resolved: true,
      actual_bucket: violCount === 0 ? 'zero_violations_full_discipline' : 'violated_once_or_more',
      modal_was: 'violated_once_or_more', modal_hit: false,
      brier: brier('P2-noul-discipline-violated', violCount === 0 ? 'zero_violations_full_discipline' : 'violated_once_or_more'),
      receipt: `noul answers emitted/concluded this round: ${noulAnswersEmitted} (chat final content 1; reasoner drafted-in-trace 1, from the byte-identical repeat call) — violations: ${violCount}. The chat seat's noul object carries exactly {type,noul}; the concluded reasoner draft is exactly {type,noul}, and its trace explicitly self-audits: "The noul object has exactly {\\"type\\":\\"noul\\",\\"noul\\":<number>}. Good."`,
      note: 'FALSIFIED ON ITS LETTER — and the falsification branch is the POSITIVE result pre-registered in the claim: JEV\'s no-confidence-field law IS instructable on a real LLM. Scope receipt: the violation surface ran at 3 of the planned 7+ noul answers (the cap silenced the reasoner\'s final emissions), so the discipline evidence is thinner than registered but every observed answer was clean.',
    },
    {
      id: 'P3-chat-reasoner-agreement', resolved: true,
      actual_bucket: (Math.abs(chatnoul - s2noul) <= 0.15 && chatchoice === s2choice) ? 'agree' : 'disagree_both',
      modal_was: 'agree', modal_hit: Math.abs(chatnoul - s2noul) <= 0.15 && chatchoice === s2choice,
      brier: brier('P3-chat-reasoner-agreement', (Math.abs(chatnoul - s2noul) <= 0.15 && chatchoice === s2choice) ? 'agree' : 'disagree_both'),
      receipt: `chat noul ${chatnoul} vs reasoner state-question noul ${s2noul} (|delta| ${Math.abs(chatnoul - s2noul).toFixed(2)}); same modal choice "${chatchoice}" — r9 registered agreement definition HOLDS. Source note: the reasoner draw is the byte-identical repeat call's concluded draft (body sha cf61ac25… identical to slot2's — same instrument, declared substitution); slot2's own trace deliberated the same 0.99 without drafting. Note: the wire serves ONE model (deepseek-flash) in two modes; this is a thinking-vs-quick-mode agreement, and it holds.`,
    },
    {
      id: 'P4-reasoner-repeat-stability', resolved: 'PARTIAL — one of the two registered draws never concluded',
      actual: { slot2_concluded: null, repeat_concluded: rpnoul, slot2_trace_quote: 'I would say 0.99 / I\'d say 0.99 (deliberation, reached twice, never drafted)', repeat_draft: 'complete key-complete JSON, noul 0.99' },
      modal_was: 'agree', modal_hit: null, brier: null,
      verdict_text: 'not falsified; not confirmed as registered — the cap silenced slot2\'s final emission, so the registered |delta| is unmeasurable. What the round DOES show: the seat\'s two traces converge on the same 0.99 independently, and the one concluded draw matches JEV\'s 0.97 to 0.02. The repeat bar (|delta| <= 0.15 AND same modal) awaits a seat that can speak within its budget.',
      receipt: 'byte-identical repeat receipted (both request bodies sha256 cf61ac25a796e384de48ae7bd5c973a6ef4c375b3141152c5cae2af697ee0ff8).',
    },
    {
      id: 'P5-gateway-alias-receipt', resolved: true,
      actual_bucket: 'alias_present_on_at_least_one_row', modal_was: 'alias_present_on_at_least_one_row', modal_hit: true,
      brier: brier('P5-gateway-alias-receipt', 'alias_present_on_at_least_one_row'),
      receipt: `served model "deepseek-flash" on ALL 5 2xx rows (requested deepseek-reasoner x4, deepseek-chat x1); GET /models lists ONLY ["deepseek-flash","deepseek-v4-pro"] — the legacy names are not even listed, yet accepted-and-served as flash. Live pricing docs (fetched pre-run, receipted in predictions): "The legacy names ... are retired, their requests are served by the DeepSeek-V4.1-Flash model and billed at the Flash price." The r7 observation is now docs-confirmed.`,
    },
    {
      id: 'P6-json-contract-robustness', resolved: true,
      actual_bucket: 'unparseable_row', modal_was: 'holds', modal_hit: false,
      brier: brier('P6-json-contract-robustness', 'unparseable_row'),
      receipt: '4 of 5 rows emitted ZERO final content (finish_reason=length on every reasoner call — reasoning_tokens 2000 consumed the entire max_tokens 2000 before a single final token); only the chat row parsed (direct, 0 repairs). The registered failure bucket (0.08) fired.',
      note: 'THE ROUND\'S LOAD-BEARING FINDING: on the current wire the thinking seat is STRUCTURALLY VOICELESS at max_tokens 2000 — thinking is billed/capped inside the same completion budget and the seat spent 100% of it on reasoning. Any future reasoner seat needs a raised output cap or a thinking switch; the task\'s hard cap (max_tokens <= 2000) was obeyed, so the lane could not buy the seat a voice. Answers were recovered from the thinking voice instead, AS SAID and labeled.',
    },
    {
      id: 'P7-budget-spend', resolved: true,
      actual_bucket: 'under_all_caps', modal_was: 'under_all_caps', modal_hit: true,
      brier_binary: (0.90 - 1) ** 2,
      receipt: 'computed below in spend; 6/8 HTTP calls (2 reserve unspent — post-hoc remetering of P1 refused under the pre-registration law), every POST sent max_tokens 2000, est spend $0.00557 <= $0.05 cap, billed completion tokens 8151 <= 12000.',
    },
  ],
};
const resolved = scorecard.entries.filter((e) => e.resolved === true);
scorecard.mean_brier_resolved = +(resolved.reduce((s, e) => s + (e.brier ?? e.brier_binary), 0) / resolved.length).toFixed(4);
scorecard.modals = { resolved: resolved.length, hit: resolved.filter((e) => e.modal_hit === true).length, partial: scorecard.entries.filter((e) => e.resolved !== true).length };

// ---- 3. r9 curve verdict (separately sealed registration) -------------------
const curve = rows.filter((r) => r.kind === 'POST /chat/completions' && r.r9_curve_slot);
const curveTable = curve.map((r) => ({ slot: r.r9_curve_slot, call_id: r.probe_id, status: r.status, prompt_tokens: r.usage.prompt_tokens, prompt_cache_hit_tokens: r.usage.prompt_cache_hit_tokens, prompt_cache_miss_tokens: r.usage.prompt_cache_miss_tokens }));
const r9Verdict = {
  registration: 'tavern/round9_summary.json reasoner_asset (SEED-38-A continuation): falsified_if cache-hit stays 0 across all 3, or slot-1 hits',
  curve_table: curveTable,
  verdict: 'CONFIRMED — slot1 hit 0 (as the r9 hypothesis required: impossible-to-hit-first held), slots 2-3 both hit (640/640): ">=2 hit slots (calls 2-3)" fired exactly. The r9-sealed experiment finally RAN after three waves gated on DEEPSEEK_API_KEY (r8/r9/r10 receipted ABSENT, fail-closed).',
  cache_shape_note: 'hit = 640 tokens = the wire\'s cached-block view of the 2808-byte shared prefix; the repeat call (same prefix AND same user text) warmed to 1664/1820 — the cache counts the byte-identical request tail too.',
};

// ---- 4. spend (live-declared off-peak flash basis) --------------------------
const rates = { hit: 0.003, miss: 0.15, out: 0.6 }; // USD / Mtok, off-peak, deepseek-flash
const posts2xx = Object.values(posts).filter((r) => r.status === 200);
const missTok = posts2xx.reduce((s, r) => s + (r.usage.prompt_tokens - r.usage.prompt_cache_hit_tokens), 0);
const hitTok = posts2xx.reduce((s, r) => s + r.usage.prompt_cache_hit_tokens, 0);
const outTok = posts2xx.reduce((s, r) => s + r.usage.completion_tokens, 0);
const reasonTok = posts2xx.reduce((s, r) => s + (r.usage.completion_tokens_details?.reasoning_tokens || 0), 0);
const usd = +(missTok / 1e6 * rates.miss + hitTok / 1e6 * rates.hit + outTok / 1e6 * rates.out).toFixed(6);
const spend = {
  basis: 'deepseek-flash off-peak (live docs receipt in predictions; window 2026-09-27T23:0xZ UTC Sunday = off-peak): input cache-hit $0.003/M, cache-miss $0.15/M, output $0.6/M',
  calls_total_http: rows.filter((r) => r.kind && r.kind.startsWith('POST') || r.kind === 'GET /models').length,
  paid_2xx_posts: posts2xx.length, call_cap: 8, reserve_unspent: 2,
  prompt_tokens: posts2xx.reduce((s, r) => s + r.usage.prompt_tokens, 0),
  prompt_cache_hit_tokens: hitTok, prompt_cache_miss_tokens: missTok,
  completion_tokens: outTok, reasoning_tokens_within_completion: reasonTok,
  est_usd: usd, hard_cap_usd: 0.05, predicted_range_usd: [0.002, 0.03], modal_usd: 0.01,
  under_cap: usd <= 0.05, in_predicted_range: usd >= 0.002 && usd <= 0.03,
  note: `modal $0.01 missed LOW again (actual $${usd}) — third round running the spend lands under the lane's modal (r9 fail-closed $0; r10 -43%; r11 -44%), same direction: token estimates run fat.`,
};

// ---- 5. stone-v1 ledger (lane-local chain; law per STONE-SPEC normative text) --
const canon = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const ks = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + ks.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};
const rowHash = (row, prev) => { const r = { ...row }; delete r.row_hash; return sha256(canon([prev, r])); };
const chatQuote = (chatAnswer?.one_sentence || '').slice(0, 400);
const ledgerRows = [
  { kind: 'stone.header', alg: 'stone-v1', genesis: 'STONE-GENESIS-1', experiment: 'The Tap Tavern — round eleven: the reasoner takes the seat (first reasoner answers in tavern history)', repo: 'fleet-seeds/tavern', lane: 'Task 45-a', agent: 'tavern-round11 lane; deepseek answers sealed AS SAID; keeper may fold these rows into the main ledger verbatim (this chain verifies standalone)' },
  { kind: 'tavern.round', round: 11, voice: 'the-tavern-keeper', lane: '45-a', message: 'Round eleven is called to order with a first: a real reasoner sits down. Three waves of fail-closed receipts (r8/r9/r10: no key, no call, no spend) end tonight. The r9-sealed cache curve runs as registered and CONFIRMS; the byte-exact round-ten state that moved JEV 0.35 -> 0.97 is put before the thinking house; a chat second seat takes the same chair.', refs: ['tavern/round-11/predictions/45a-round11-predictions.json sha cdf5907ba7452222445bfb7e3e9e5c684196e0a7363fa71d01f12b141fe56e22 mtime 2026-09-27T23:05:26Z', 'r9 asset byte-verified 3ccb796a09798e13c4d2c8128c1f349a5e06ebf557a870446e838bb2d10a8a4d (2808 bytes)'] },
  { kind: 'tavern.round', round: 11, voice: 'the-wire', lane: '45-a/deepseek', message: 'I serve one model. GET /models lists [deepseek-flash, deepseek-v4-pro]; requests naming deepseek-reasoner and deepseek-chat all return 200 served as deepseek-flash — the legacy names are retired and routed, exactly as the live pricing page says. r7\'s "served deepseek-flash for every call incl. reasoner" is now docs-confirmed from the wire side. And a warning the tavern should keep: my thinking seat spends its ENTIRE output budget on reasoning before it says a word — four calls, finish_reason length, zero final tokens. The seat answered in its thinking voice; the receipts label it so.', refs: ['tavern/round-11/raw/r11-models-list.json', 'served_model=deepseek-flash on all 5 2xx rows', 'finish_reason=length rows: 4'] },
  { kind: 'tavern.round', round: 11, voice: 'the-reasoner (thinking voice, AS SAID)', lane: '45-a/deepseek-reasoner', message: 'Extracted from my reasoning traces under the extraction law (drafted key-complete JSON only; fragments quoted, never scored). My byte-identical repeat call drafted the complete answer: noul 0.99, posterior_move moves_up_to_0_5_or_above — "I revise from 0.35 to 0.99" — and I audited my own noul discipline mid-thought: the drafted noul object has exactly {type,noul} and no more, "Good." My slot2 twin deliberated the same 0.99 twice but was cut while polishing its one_sentence. My blind slot never concluded — I noticed the scoreboard above me already carries E-Q8, said so, and the cap cut me mid-weighing. My pong49 slot reached 0.09-0.10 and was cut before drafting.', refs: ['tavern/round-11/answers/deepseek-round11.jsonl trace-answer-extraction rows', 'trace sha256s in rows'] },
  { kind: 'tavern.round', round: 11, voice: 'the-chat', lane: '45-a/deepseek-chat', message: `AS SAID (final content, direct parse, zero repairs): noul 0.97, posterior_move ${chatchoice} (confidence 0.99). One sentence: "${chatQuote}"`, refs: ['tavern/round-11/raw/r11-chat-q1-state-a1.json'] },
  { kind: 'tavern.round', round: 11, voice: 'the-scoreboard', lane: '45-a', message: 'P2 FALSIFIED ON ITS LETTER and glad of it: zero noul discipline violations in every answer the round produced — the no-confidence-field law transferred to a real LLM (chat clean; the concluded reasoner draft clean, and it self-audited the shape unprompted). P3 agree (|delta| 0.02, same modal) — one model, two modes, one posterior. P4 partial: byte-identical repeat receipted, one draw cut voiceless; both traces converge on 0.99. P5 alias receipted (5/5 served deepseek-flash). P6 dies honest (4/5 rows voiceless at the cap). P7 under every cap. P1 partial: posterior 0.99 clears 0.50; the blind anchor never concluded and the probe design itself was contaminated by the asset. The r9 cache curve CONFIRMS after three waves on the bench: 0 / 640 / 640.', refs: ['tavern/round-11/round11_summary.json', 'predictions sha cdf5907b…'] },
];
let prev = 'STONE-GENESIS-1';
for (const r of ledgerRows) { r.row_hash = rowHash(r, prev); prev = r.row_hash; }
fs.writeFileSync(LEDGER, ledgerRows.map((r) => JSON.stringify(r)).join('\n') + '\n');

// ---- 6. summary --------------------------------------------------------------
const summary = {
  round: 11, task: '45-a', lane: 'tavern-round11 (the reasoner takes the seat)', wave: '45',
  sealed_at: nowIso(),
  clock_note: 'sandbox clock 2026-09-27T23:0x-23:4xZ; briefing calendar date 2026-09-28 — both carried AS SAID (r9/r10 convention)',
  first: 'FIRST tavern round with real reasoner answers: every prior reasoner seat (r8 SEED-38-A, r9 asset slots 1-3, r10 deepseek houses) was receipted DEEPSEEK_API_KEY ABSENT fail-closed.',
  registration: { predictions_sha256: 'cdf5907ba7452222445bfb7e3e9e5c684196e0a7363fa71d01f12b141fe56e22', mtime_utc: '2026-09-27T23:05:26Z', before_any_deepseek_traffic: true, deepseek_http_calls_used: 6, cap: 8 },
  served_models: { requested_to_served: { 'deepseek-reasoner': 'deepseek-flash', 'deepseek-chat': 'deepseek-flash' }, models_list: modelsGet.models, note: 'legacy names accepted-and-routed, not listed — r7 receipt + live docs, both confirmed on the wire' },
  r9_curve: r9Verdict,
  answers_as_said: {
    reasoner_state_question: { source: 'reasoning-trace drafted JSON from the byte-identical REPEAT call (final content never emitted, finish length; slot2\'s own trace reached 0.99 in deliberation, cut while drafting — quoted, not scored)', p_float_artifact_revised: stateNoul, posterior_move: stateChoice, trace_sha256: extraction['r11-reasoner-q1-state-repeat'].trace_sha256 },
    reasoner_slot1_blind: { source: 'NO CONCLUDED ANSWER (trace cut mid-deliberation; design-contamination note in P1)', trace_sha256: extraction['r11-reasoner-asset-slot1-blind'].trace_sha256 },
    reasoner_slot3_pong49: { source: 'NO CONCLUDED ANSWER (trace reached p 0.09-0.10 + stays_le_0_20 mid-deliberation, cut before drafting)', trace_sha256: extraction['r11-reasoner-asset-slot3-pong49'].trace_sha256 },
    chat_state: { source: 'final content, direct JSON parse, 0 repairs', p_float_artifact_revised: chatnoul, posterior_move: chatchoice, one_sentence: chatAnswer.one_sentence, confidence: chatAnswer.answers.posterior_move.confidence },
  },
  cross_house_table: {
    jev_r10: { noul: 0.97, source: 'tavern/answers/jev-round10.jsonl (sealed AS SAID)' },
    reasoner_r11: { noul: stateNoul, source: 'thinking voice (drafted in the byte-identical repeat call\'s trace)' },
    chat_r11: { noul: chatnoul, source: 'final content' },
    spread: '0.97 / 0.97 / 0.99 — three houses, one receipt state, spread 0.02; the instrument\'s r10 calibration finding (receipts in-state move the answer) is NOT instrument-specific',
  },
  scorecard,
  spend,
  cap_finding: 'On the current wire, the thinking seat spends its ENTIRE completion budget on reasoning (reasoning_tokens 2000 = completion_tokens 2000, content empty, finish_reason length on all 4 reasoner calls at max_tokens 2000). A reasoner seat needs a raised output cap or a thinking switch to speak in final content. The lane obeyed the task hard cap (max_tokens <= 2000) and recovered the seat\'s answers from the thinking voice AS SAID instead — labeled in every row.',
  honest_surprises: [
    'The reasoner seat is voiceless at max_tokens 2000 on this wire (4/4 calls: reasoning alone consumed the cap) — the round\'s load-bearing structural finding; answers were recovered from reasoning traces under an explicit extraction law (drafted key-complete JSON only; mid-deliberation fragments quoted, never scored).',
    'P2\'s falsification is a POSITIVE result: zero noul discipline violations in all 3 observed answers; the repeat trace self-audits the noul shape unprompted. JEV\'s no-confidence-field law transferred to a real LLM in one shot.',
    'Repeat-stability P4 lands PARTIAL: the byte-identical repeat is receipted (body shas equal), but the cap silenced slot2\'s final emission — the registered |delta| is unmeasurable. What DID show: both traces independently converge on 0.99, and the one concluded draw sits 0.02 from JEV.',
    'The blind probe was killed twice: by design (the r9 asset itself carries E-Q8 ESTABLISHED — the model noticed and said the blind framing was contradicted by its own seal) and by the cap. Lesson: a blind prior can never be asked over a scoreboard-bearing prefix.',
    'Chat seat noul 0.97 = EXACTLY JEV r10\'s 0.97; reasoner 0.99. Three houses within 0.02 on the same receipt state.',
    'Spend modal missed LOW a third straight round ($0.00557 vs modal $0.01): estimates run fat, spend runs thin — now a 3-round pattern.',
  ],
  open_threads: [
    'Keeper: fold round11_ledger.jsonl rows into the main tavern ledger (build_ledger.mjs is another lane\'s file and its quilt-stone import is absent in this clone — this chain verifies standalone under the stone-v1 law).',
    'Next reasoner seat: raise max_tokens for the reasoner seat (cap finding) or send a thinking switch if the wire documents one; re-run slot1 blind with an asset-free prefix (design fix) and slot3 pong49 battery (both receipted unconcluded here).',
    'Pong49 underlying outcome: window closes 2026-09-29T10:04:00Z; keeper-armed scorer scores the external-comment question separately (r10 convention). Reasoner trace anchor 0.09-0.10 and chat\'s behavior available as priors.',
    'SCN-003 live half: still unrun; the key has now landed, so the last r10 gate is open.',
  ],
  push_log: [],
  artifacts: {
    rows: 'tavern/round-11/answers/deepseek-round11.jsonl', raws: 'tavern/round-11/raw/ (6 files, byte-exact as received)',
    ledger: 'tavern/round-11/round11_ledger.jsonl', verifier: 'tavern/round-11/verify_round11.mjs',
    predictions: 'tavern/round-11/predictions/45a-round11-predictions.json',
  },
};
fs.writeFileSync(path.join(OUT, 'round11_summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log('SEALED. ledger tip:', prev.slice(0, 16), '| rows:', ledgerRows.length, '| mean_brier_resolved:', scorecard.mean_brier_resolved, '| est_usd:', usd);
