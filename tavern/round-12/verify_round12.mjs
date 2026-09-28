#!/usr/bin/env node
// verify_round12.mjs — independent verifier for tavern/round-12 (task 46-d):
// the LEDGER FOLD of round-11's rows into the main tavern ledger + the
// round-12 blind-prior run.
//
// Law: reimplements the stone-v1 chain law from its normative text
// (row_hash = sha256(canonicalJSON([prev, row-minus-row_hash])), genesis
// STONE-GENESIS-1) — shares no code with any producer (43-c / r11 verifier
// convention). Repo-relative paths. Zero network, zero deps. Exit 1 on ANY
// failure.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(REPO, 'tavern/round-12');
const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const canon = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const ks = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + ks.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};
const rowHash = (row, prev) => { const r = { ...row }; delete r.row_hash; return sha256(canon([prev, r])); };
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails++; };
const jl = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const REG_SHA = 'ffb3d245908894642f3ea74789df5160c5cf093a0a0ce8ef24a018733a8db192';
const REG_MTIME = '2026-09-28T00:42:17Z';
const SRC_SHA = 'bdf3be0641f51b4241d3846b16744e2623bfb4ec24f5374f931d7618d1d19bf5';
const SRC_TIP = 'db324fd05d0a4373b4f8ec8fc395039065e1b54494ba546425fd3e76054dc1b5';
const MAIN_TIP_AT_REG = '1c03b2eb7a2b15e0a6ffec536c0d5c60c3e2586806ca6caaced65f90016f11cb';

// =========== A. registration (pre-run receipts) ==============================
const regPath = path.join(OUT, 'predictions/46d-round12-predictions.json');
check('A1 registration file sha = registered ffb3d245…', sha256(fs.readFileSync(regPath, 'utf8')) === REG_SHA);
const regMtime = fs.statSync(regPath).mtime.toISOString().replace(/\.\d{3}Z$/, 'Z');
check('A2 registration mtime unchanged since registration', regMtime === REG_MTIME, regMtime);
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
check('A3 registration carries 5 numbered predictions P1-P5', JSON.stringify(reg.predictions.map((p) => p.id)) === JSON.stringify(['P1-asset-free-calibration-gap', 'P2-seat-agreement-0.05', 'P3-noul-discipline-holds', 'P4-ledger-fold-verifies', 'P5-budget-spend']));
check('A4 registration declares zero deepseek traffic before it', reg.registered_before_any_deepseek_traffic === true);

// =========== B. the ledger fold ==============================================
const srcRows = jl(path.join(REPO, 'tavern/round-11/round11_ledger.jsonl'));
check('B1 round-11 source sha = registered bdf3be06…', sha256(fs.readFileSync(path.join(REPO, 'tavern/round-11/round11_ledger.jsonl'), 'utf8')) === SRC_SHA);
{
  let prev = srcRows[0]?.genesis ?? 'STONE-GENESIS-1', ok = true;
  for (const r of srcRows) { if (rowHash(r, prev) !== r.row_hash) { ok = false; break; } prev = r.row_hash; }
  check('B2 round-11 chain verifies standalone (untouched)', ok && prev === SRC_TIP, `tip ${prev.slice(0, 16)}…`);
}
const mainRows = jl(path.join(REPO, 'tavern/tavern_ledger.jsonl'));
check('B3 main ledger grew 52 -> 58 rows (append-only count)', mainRows.length === 58, `${mainRows.length} rows`);
{
  let prev = mainRows[0]?.genesis ?? 'STONE-GENESIS-1', ok = true, tip = null;
  for (let i = 0; i < mainRows.length; i++) { if (rowHash(mainRows[i], prev) !== mainRows[i].row_hash) { ok = false; check(`B4 main chain link ${i}`, false, 'hash mismatch'); break; } prev = mainRows[i].row_hash; tip = prev; }
  if (ok) check('B4 main ledger chain verifies link-by-link from disk', true, `${mainRows.length} rows, tip ${tip.slice(0, 16)}…`);
}
const receipt = mainRows.at(-1);
check('B5 last row is the fold receipt', receipt?.kind === 'tavern.fold' && receipt?.round === 11 && receipt?.voice === 'the-fold');
check('B6 receipt embeds source header verbatim (incl. its standalone row_hash)', canon(receipt?.source_header) === canon(srcRows[0]), `header ${receipt?.source_header?.row_hash?.slice(0, 8)}…`);
check('B7 receipt records source tip + pre-fold main tip + registration sha', receipt?.source_tip === SRC_TIP && receipt?.pre_fold_main_tip === MAIN_TIP_AT_REG && receipt?.registration_sha256 === REG_SHA);
check('B8 receipt source_sha256 = on-disk source sha = registered', receipt?.source_sha256 === SRC_SHA);
const foldRows = mainRows.slice(52, 57);
{
  let okContent = true, okMap = true, okLinks = true;
  receipt?.mapping?.forEach((m, i) => {
    const srcR = srcRows[m.source_ordinal], foldR = foldRows[i];
    const a = { ...srcR }; delete a.row_hash;
    const b = { ...foldR }; delete b.row_hash;
    if (canon(a) !== canon(b)) okContent = false;
    if (m.source_row_hash !== srcR.row_hash || m.folded_row_hash !== foldR.row_hash) okMap = false;
  });
  check('B9 folded rows content-deep-equal to standalone sources (modulo row_hash)', okContent && receipt?.mapping?.length === 5, '5 content rows');
  check('B10 mapping table consistent (source hash <-> folded hash)', okMap);
  // re-parent proof: first folded row hashes against the pre-fold tip
  check('B11 first folded row re-parented onto registered pre-fold tip', rowHash(foldRows[0], MAIN_TIP_AT_REG) === foldRows[0].row_hash);
  const midOk = foldRows.slice(1).every((r, i) => rowHash(r, foldRows[i].row_hash) === r.row_hash);
  const tailOk = rowHash(receipt, foldRows.at(-1).row_hash) === receipt.row_hash;
  check('B12 fold links chain correctly (rows 53-57 + receipt)', midOk && tailOk);
}
check('B13 no pre-existing row carries a fold kind (append-only shape)', mainRows.slice(0, 52).every((r) => r.kind !== 'tavern.fold'));

// =========== C. round-11 verifier stays green ================================
{
  const keyed = !!process.env.DEEPSEEK_API_KEY;
  let out = '', code = 0;
  try { out = execFileSync('node', [path.join(REPO, 'tavern/round-11/verify_round11.mjs')], { cwd: REPO, encoding: 'utf8', env: process.env }); }
  catch (e) { code = e.status ?? 1; out = e.stdout ?? String(e); }
  check('C1 verify_round11.mjs exits 0 with ALL CHECKS PASS (16/16)', code === 0 && out.includes('ALL CHECKS PASS'));
  check('C2 r11 key-material scan ran with the key present', keyed || process.env.R12_ALLOW_KEYLESS_SCAN === '1', keyed ? 'keyed scan' : 'KEYLESS — scan trivially passed (set DEEPSEEK_API_KEY or R12_ALLOW_KEYLESS_SCAN=1)');
}

// =========== D. the round-12 run (checks active once artifacts exist) ========
const rowsPath = path.join(OUT, 'answers/deepseek-round12.jsonl');
if (!fs.existsSync(rowsPath)) {
  console.log('SKIP D — no round-12 run artifacts yet (pre-run push: registration + fold only)');
} else {
  const rows = jl(rowsPath);
  const posts = rows.filter((r) => r.kind === 'POST /chat/completions');
  const gets = rows.filter((r) => r.kind === 'GET /models');
  check('D1 session-open first; exactly one session-close', rows[0]?.kind === 'session-open' && rows.filter((r) => r.kind === 'session-close').length === 1);
  check('D2 deepseek HTTP calls <= 6 (GETs+POST attempts)', gets.length + posts.length <= 6, `${gets.length} GET + ${posts.length} POST rows`);
  check('D3 every POST sent max_tokens 2000', posts.every((r) => r.request.max_tokens === 2000));
  check('D4 every 2xx row served a model string (receipted per row)', posts.filter((r) => r.status === 200).every((r) => typeof r.served_model === 'string' && r.served_model.length > 0));
  check('D5 every row has its raw response on disk, sha-verified', [...posts, ...gets].every((r) => { const p = path.join(REPO, r.response_raw_path); return fs.existsSync(p) && sha256(fs.readFileSync(p, 'utf8')) === r.response_raw_sha256; }));
  check('D6 usage receipted on every 2xx row (pricing-first law)', posts.filter((r) => r.status === 200).every((r) => r.usage && typeof r.usage.prompt_tokens === 'number' && typeof r.usage.completion_tokens === 'number'));

  // prompt fidelity: bodies rebuilt from the registration must match the sent bodies
  const P = reg.registered_prompts_verbatim;
  const mkUser = (qid, reveal) => (reveal
    ? `${P.REVEAL_FRAME}\n\nSTATE (byte-exact from the round-ten record):\n${P.R10_STATE_VERBATIM}\n\n${P.REVEAL_QUESTIONS}\n\n${P.CONTRACT.replace('<the question_id given above>', qid)}`
    : `${P.BLIND_TEXT}\n\n${P.CONTRACT.replace('<the question_id given above>', qid)}`);
  const expectMsgs = (probe) => probe.includes('chat')
    ? [{ role: 'system', content: P.HOUSE_LINE }, { role: 'user', content: mkUser(probe, probe.includes('reveal')) }]
    : [{ role: 'user', content: mkUser(probe, probe.includes('reveal')) }];
  let promptOk = true, promptDetail = '';
  for (const r of posts) {
    const msgs = expectMsgs(r.probe_id);
    // mirror the runner's body construction EXACTLY (key order included):
    // { model, messages, max_tokens: 2000, stream: false } + temperature last, chat only
    const body = { model: r.request.model, messages: msgs, max_tokens: 2000, stream: false };
    if (r.request.model === 'deepseek-chat') body.temperature = 0.3;
    if (sha256(JSON.stringify(body)) !== r.request.body_sha256) { promptOk = false; promptDetail = `${r.probe_id} body drift`; }
  }
  check('D7 every sent request body rebuilds byte-exact from the registered prompts', promptOk, promptDetail);
  check('D8 blind prompts precede reveal prompts (send-order law)', (() => { const o = posts.map((r) => r.probe_id); return o.indexOf('r12-reasoner-blind') < o.indexOf('r12-reasoner-reveal') && o.indexOf('r12-chat-blind') < o.indexOf('r12-chat-reveal') && Math.max(o.indexOf('r12-reasoner-blind'), o.indexOf('r12-chat-blind')) < Math.min(o.indexOf('r12-reasoner-reveal'), o.indexOf('r12-chat-reveal')); })());

  // asset-freeness mechanical re-check
  const forbidden = ['E-Q8', 'E-Q9', 'eq8_established', 'eq9_census', '466,932', 'Brier', '3ccb796a', 'b46effd4', '0.35', '0.47', '0.97', '0.99', 'qthe', 'JEV', 'jev', 'ROUND NINE', 'ROUND ELEVEN', 'round-11', 'round-10', 'r9_prefix_asset', 'census', 'kernel runs'];
  const blindHit = forbidden.filter((s) => P.BLIND_TEXT.includes(s));
  check('D9 registered BLIND_TEXT carries no receipt/asset/answer substrings', blindHit.length === 0, blindHit.join(','));
  const assetPath = '/home/z/my-project/pt45b-q/situations/r9_prefix_asset.txt';
  if (fs.existsSync(assetPath)) {
    const asset = fs.readFileSync(assetPath, 'utf8');
    const shared = forbidden.length >= 0 && P.BLIND_TEXT.split(/\s+/).filter((w) => w.length > 12 && asset.includes(w)).slice(0, 3);
    check('D10 BLIND_TEXT shares no long token (>12 chars) with the r9 asset', shared.length === 0, shared.join(','));
  } else check('D10 BLIND_TEXT vs r9 asset token scan', false, 'asset file not found for cross-check');

  // summary + scorecard consistency
  const sumPath = path.join(OUT, 'round12_summary.json');
  if (fs.existsSync(sumPath)) {
    const sum = JSON.parse(fs.readFileSync(sumPath, 'utf8'));
    const p2xx = posts.filter((r) => r.status === 200);
    const miss = p2xx.reduce((s, r) => s + (r.usage.prompt_tokens - r.usage.prompt_cache_hit_tokens), 0);
    const hit = p2xx.reduce((s, r) => s + r.usage.prompt_cache_hit_tokens, 0);
    const outTok = p2xx.reduce((s, r) => s + r.usage.completion_tokens, 0);
    const usdOff = +(miss / 1e6 * 0.15 + hit / 1e6 * 0.003 + outTok / 1e6 * 0.6).toFixed(6);
    const usdPeak = +(miss / 1e6 * 0.3 + hit / 1e6 * 0.006 + outTok / 1e6 * 1.2).toFixed(6);
    const worst = Math.max(usdOff, usdPeak);
    check('D11 spend recomputes from rows (off-peak basis receipted)', usdOff === sum.spend.est_usd_offpeak, `$${usdOff} (miss ${miss} / hit ${hit} / out ${outTok} tok)`);
    check('D12 spend <= $0.05 even at worst-case peak basis', worst <= 0.05, `worst $${worst}`);
    check('D13 billed completion tokens <= 8000 and calls within cap', outTok <= 8000 && gets.length + posts.length <= 6);
    check('D14 scorecard resolves all 5 numbered predictions', Array.isArray(sum.scorecard?.entries) && sum.scorecard.entries.length === 5);
    // extracted-draft rows referenced in the scorecard must exist
    const ext = rows.filter((r) => r.kind === 'trace-answer-extraction');
    check('D15 trace-extraction rows sha-pinned to their raws', ext.every((r) => { const raw = JSON.parse(fs.readFileSync(path.join(REPO, rows.find((x) => x.probe_id === r.probe_id && x.kind === 'POST /chat/completions')?.response_raw_path), 'utf8')); return sha256(raw.choices?.[0]?.message?.reasoning_content || '') === r.trace_sha256; }));
  } else console.log('SKIP D11-D15 — round12_summary.json not yet written');
}

// =========== E. round-12 lane-local ledger (once sealed) =====================
const ledPath = path.join(OUT, 'round12_ledger.jsonl');
if (!fs.existsSync(ledPath)) {
  console.log('SKIP E — round12_ledger.jsonl not yet written');
} else {
  const led = jl(ledPath);
  check('E1 round-12 ledger row 0 is stone.header alg stone-v1', led[0]?.kind === 'stone.header' && led[0]?.alg === 'stone-v1');
  let prev = led[0]?.genesis ?? 'STONE-GENESIS-1', ok = true, tip = null;
  for (const r of led) { if (rowHash(r, prev) !== r.row_hash) { ok = false; break; } prev = r.row_hash; tip = prev; }
  check('E2 round-12 chain verifies link-by-link', ok, ok ? `${led.length} rows, tip ${tip.slice(0, 16)}…` : 'chain break');
}

// =========== F. key-material scan (the key must appear in NO artifact) =======
{
  const key = process.env.DEEPSEEK_API_KEY || '';
  let leak = false;
  const scan = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const fp = path.join(dir, f.name); if (f.isDirectory()) scan(fp); else if (key && fs.readFileSync(fp, 'utf8').includes(key)) leak = true; } };
  scan(OUT);
  check('F1 no key material in any round-12 artifact', !leak, key ? 'keyed scan' : 'KEYLESS — trivially passed');
}

console.log(fails === 0 ? '\nALL CHECKS PASS' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
