// tavern/seal_round6.mjs — KEEPER SEAL for tavern round six: the DeepSeek
// guest rows (round-5 backlog 10 rows sealed AS SAID in answers/, round-6 4
// rows sealed AS SAID in qthe situations/guest_rows_r6.jsonl) become ledger
// rows. Append-only: verifies the existing chain from disk FIRST, refuses on
// any break; every new row cites the verbatim artifact (AS SAID law) — the
// ledger row carries the guest's verdict verbatim + refs to the sealed file,
// call ids, prefix shas, and cache telemetry. Never rewrites existing rows.
import { readFileSync, writeFileSync } from 'node:fs';

const QTHE = '/home/z/my-project/download/qthe';

async function stone_() {
  // tavern has no _stone_link of its own; resolve THE STONE read-only
  const cands = ['../../quilt-stone/stone.mjs', '/home/z/my-project/download/quilt-stone/stone.mjs'];
  for (const c of cands) {
    try { const m = await import(c.startsWith('/') ? 'file://' + c : new URL(c, import.meta.url).href);
      if (typeof m.sealChain === 'function') return { stone: m, path: c }; } catch { /* next */ }
  }
  throw new Error('THE STONE unresolved');
}

const { stone } = await stone_();
const LEDGER = new URL('./tavern_ledger.jsonl', import.meta.url).pathname;

// 1. verify existing chain FROM DISK — refuse-if-broken
const disk = readFileSync(LEDGER, 'utf8').split('\n').filter((s) => s.trim()).map((l) => JSON.parse(l));
const pre = stone.verifyChain(disk, undefined, { alg: 'stone-v1' });
if (!pre.ok) { console.error('EXISTING CHAIN BROKEN — refuse', pre); process.exit(1); }
console.log('existing ledger ok:', pre.links, 'rows, tip', pre.tip.slice(0, 12));

// 2. round-5 backlog: answers/deepseek-round5.jsonl (10 rows, sealed AS SAID)
const r5econ = JSON.parse(readFileSync(QTHE + '/situations/cache_economics.json', 'utf8'));
const r5rows = readFileSync(new URL('./answers/deepseek-round5.jsonl', import.meta.url).pathname, 'utf8')
  .split('\n').filter((s) => s.trim()).map((l) => JSON.parse(l));
const r5ledger = r5rows.map((r) => ({
  kind: 'tavern.round', round: 5, voice: r.voice || 'deepseek (live guest, cache-gamed)',
  lane: 'qthe/situations/deepseek_guest.mjs (sealed to ledger at round six — backlog honest note: these rows were sealed AS SAID in wave 33-c but missed the ledger then)',
  message: r.content?.finding ?? JSON.stringify(r.content).slice(0, 2000),
  refs: ['tavern/answers/deepseek-round5.jsonl (verbatim, AS SAID)', 'qthe:situations/guest_rows.jsonl call ' + (r.question_id || ''), 'prefix sha256 ' + r5econ.cache_asset?.prefix_sha256?.slice(0, 16), 'cache ' + r5econ.cache_hit_ratio],
}));

// 3. round six: qthe situations/guest_rows_r6.jsonl (4 rows)
const r6econ = JSON.parse(readFileSync(QTHE + '/situations/cache_economics_r6.json', 'utf8'));
const r6rows = readFileSync(QTHE + '/situations/guest_rows_r6.jsonl', 'utf8')
  .split('\n').filter((s) => s.trim()).map((l) => JSON.parse(l)).filter((r) => r.content_parsed);
const r6ledger = r6rows.map((r) => ({
  kind: 'tavern.round', round: 6, voice: 'deepseek (live guest, cache-gamed, round six)',
  lane: 'qthe/situations/deepseek_guest_r6.mjs',
  message: (r.content_parsed.verdict || '') + (r.content_parsed.key_points?.length ? ' KEY POINTS: ' + r.content_parsed.key_points.join(' | ') : ''),
  refs: ['qthe:situations/guest_rows_r6.jsonl (verbatim, AS SAID) call ' + r.call_id, 'prefix sha256 ' + r.prefix_sha256?.slice(0, 16), 'cache hit ' + r.usage?.prompt_cache_hit_tokens + '/' + r.usage?.prompt_tokens, 'served ' + r.model?.served],
}));

const add = [...r5ledger, ...r6ledger];
console.log('appending', add.length, 'guest rows (r5 backlog', r5ledger.length, '+ r6', r6ledger.length, ')');

// 4. seal + verify + write (append-only: existing rows untouched)
const all = disk.map((r) => { const { row_hash, prev_hash, seq, ...payload } = r; return payload; }).concat(add);
stone.sealChain(all, undefined, { alg: 'stone-v1' });
const post = stone.verifyChain(all, undefined, { alg: 'stone-v1' });
if (!post.ok) { console.error('POST-SEAL CHAIN BROKEN — refuse to write', post); process.exit(1); }
// prefix must be row-for-row identical to what was on disk
for (let i = 0; i < disk.length; i++) {
  if (all[i].row_hash !== disk[i].row_hash) { console.error('PREFIX MUTATED at', i, '— refuse'); process.exit(1); }
}
writeFileSync(LEDGER, all.map((r) => JSON.stringify(r)).join('\n') + '\n');
const vfy = stone.verifyChainFile(LEDGER);
console.log('ledger now:', vfy.links, 'rows, verifyFromDisk', vfy.ok, 'tip', vfy.tip.slice(0, 16));
