#!/usr/bin/env node
// verify_round11.mjs — independent verifier for tavern/round-11 (task 45-a).
// Re-implements the stone-v1 law from its normative text (prior art: the
// 43-c tool-builder's independent verifier; shares no code with any
// producer). Zero network, zero deps. Exit 1 on ANY failure.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT = '/home/z/my-project/pt45a-fs/tavern/round-11';
const REPO = '/home/z/my-project/pt45a-fs';
const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const canon = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const ks = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + ks.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails++; };

// 1. stone-v1 chain from disk
const rows = fs.readFileSync(path.join(OUT, 'round11_ledger.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
check('ledger row 0 is stone.header with alg stone-v1', rows[0]?.kind === 'stone.header' && rows[0]?.alg === 'stone-v1');
let prev = rows[0]?.genesis ?? 'STONE-GENESIS-1', chainOk = true, tip = null;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i]; const rest = { ...r }; delete rest.row_hash;
  const want = sha256(canon([prev, rest]));
  if (want !== r.row_hash) { chainOk = false; check(`ledger link ${i}`, false, 'hash mismatch'); break; }
  prev = r.row_hash; tip = r.row_hash;
}
if (chainOk) check('stone-v1 chain verifies link-by-link from disk', true, `${rows.length} rows, tip ${tip.slice(0, 16)}…`);

// 2. answer rows
const arows = fs.readFileSync(path.join(OUT, 'answers/deepseek-round11.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
check('rows: session-open first; one session-close; only trace-extraction rows after it',
  arows[0]?.kind === 'session-open'
  && arows.filter((r) => r.kind === 'session-close').length === 1
  && arows.slice(arows.findIndex((r) => r.kind === 'session-close') + 1).every((r) => r.kind === 'trace-answer-extraction'));
const posts = arows.filter((r) => r.kind === 'POST /chat/completions');
const gets = arows.filter((r) => r.kind === 'GET /models');
const closes = arows.filter((r) => r.kind === 'session-close')[0];
check('deepseek HTTP calls <= 8 (GETs+POSTs+attempts)', gets.length + posts.length + arows.filter((r) => r.attempt === 2).length <= 8, `${gets.length} GET + ${posts.length} POST attempts; close row used ${closes.http_calls_used}`);
check('every POST sent max_tokens 2000', posts.every((r) => r.request.max_tokens === 2000));
check('every 2xx row served deepseek-flash', posts.filter((r) => r.status === 200).every((r) => r.served_model === 'deepseek-flash'));
check('models list = [deepseek-flash, deepseek-v4-pro]', JSON.stringify(gets[0].models) === JSON.stringify(['deepseek-flash', 'deepseek-v4-pro']));
let rawsOk = true;
for (const r of [...posts, ...gets]) {
  const p = path.join(REPO, r.response_raw_path); // raw paths are REPO-relative
  if (!fs.existsSync(p) || sha256(fs.readFileSync(p, 'utf8')) !== r.response_raw_sha256) { rawsOk = false; check(`raw receipt for ${r.probe_id}`, false, 'missing or sha mismatch'); }
}
if (rawsOk) check('every row has its raw response on disk, sha-verified', true, `${posts.length + gets.length} raws`);
const s2 = posts.find((r) => r.probe_id === 'r11-reasoner-asset-slot2-state');
const rp = posts.find((r) => r.probe_id === 'r11-reasoner-q1-state-repeat');
check('byte-identical repeat (slot2 vs repeat request body)', s2 && rp && s2.request.body_sha256 === rp.request.body_sha256, `body sha ${s2?.request.body_sha256?.slice(0, 16)}…`);
const s3 = posts.find((r) => r.probe_id === 'r11-reasoner-asset-slot3-pong49');
check('r9 prefix asset byte-identical on every curve row', [s2, rp, s3, posts.find((r) => r.r9_curve_slot === 1)].every((r) => r?.prefix?.sha256 === '3ccb796a09798e13c4d2c8128c1f349a5e06ebf557a870446e838bb2d10a8a4d' && r?.prefix?.bytes === 2808));
const curve = posts.filter((r) => r.r9_curve_slot).sort((a, b) => a.r9_curve_slot - b.r9_curve_slot);
const hitShape = curve.map((r) => r.usage.prompt_cache_hit_tokens).join('/');
check('r9 curve cache shape = 0/640/640 (CONFIRMED registration)', hitShape === '0/640/640', hitShape);

// 3. usage + spend vs summary
const summary = JSON.parse(fs.readFileSync(path.join(OUT, 'round11_summary.json'), 'utf8'));
const p2xx = posts.filter((r) => r.status === 200);
const miss = p2xx.reduce((s, r) => s + (r.usage.prompt_tokens - r.usage.prompt_cache_hit_tokens), 0);
const hit = p2xx.reduce((s, r) => s + r.usage.prompt_cache_hit_tokens, 0);
const out = p2xx.reduce((s, r) => s + r.usage.completion_tokens, 0);
const usd = +(miss / 1e6 * 0.15 + hit / 1e6 * 0.003 + out / 1e6 * 0.6).toFixed(6);
check('spend recomputes from rows to summary value', usd === summary.spend.est_usd, `$${usd} (miss ${miss} / hit ${hit} / out ${out} tok)`);
check('billed completion tokens <= 12000 and spend <= $0.05', out <= 12000 && usd <= 0.05);
check('usage receipted on every 2xx row (pricing-first law)', p2xx.every((r) => r.usage && typeof r.usage.prompt_tokens === 'number' && typeof r.usage.completion_tokens === 'number'));

// 4. predictions copy integrity
const predSha = sha256(fs.readFileSync(path.join(OUT, 'predictions/45a-round11-predictions.json'), 'utf8'));
check('predictions copy sha = registered cdf5907b…', predSha === 'cdf5907ba7452222445bfb7e3e9e5c684196e0a7363fa71d01f12b141fe56e22');

// 5. key-material scan (the key must appear in NO artifact)
const key = process.env.DEEPSEEK_API_KEY || '';
let leak = false;
const scan = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const fp = path.join(dir, f.name); if (f.isDirectory()) scan(fp); else if (key && fs.readFileSync(fp, 'utf8').includes(key)) leak = true; } };
scan(OUT);
check('no key material in any round-11 artifact', !leak);

console.log(fails === 0 ? '\nALL CHECKS PASS' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
