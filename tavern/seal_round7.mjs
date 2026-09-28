// tavern/seal_round7.mjs — KEEPER SEAL for tavern round seven: three houses,
// one question (lane 36-b's competitive-ideation round). DeepSeek guest rows
// (7, sealed AS SAID in answers/deepseek-round7.jsonl) + typesafe row (typed
// distribution, mapping declared) + moth row (chat lane honest-404, quantum
// house attends as entropy oracle) become ledger rows. Append-only: verifies
// the existing chain from disk FIRST, refuses on any break; every new row
// cites the verbatim artifact (AS SAID law). Never rewrites existing rows.
import { readFileSync } from 'node:fs';

async function stone_() {
  const cands = ['/home/z/my-project/download/quilt-stone/stone.mjs', '../../quilt-stone/stone.mjs'];
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

const rows = [];
const readRows = (p) => readFileSync(new URL(p, import.meta.url).pathname, 'utf8')
  .split('\n').filter((s) => s.trim()).map((l) => JSON.parse(l));

// 2. deepseek guest round seven: 7 rows (incl. 2 receipted defects kept standing)
const dsRows = readRows('./answers/deepseek-round7.jsonl');
for (const r of dsRows) {
  const v = r.content_parsed || {};
  const message = v.verdict
    ? v.verdict + (v.key_points?.length ? ' KEY POINTS: ' + v.key_points.join(' | ') : '')
    : (r.content_raw || '').slice(0, 1200);
  rows.push({
    kind: 'tavern.round', round: 7,
    voice: 'deepseek (live guest, cache-gamed, round seven — served ' + (r.model?.served || '?') + ')',
    lane: 'fleet-seeds/tavern/round7_three_houses.mjs (lane 36-b)',
    message,
    defect: r.parse_method === 'truncated' ? 'reasoner v1 truncated — reasoning ate max_tokens; kept standing' : undefined,
    refs: [
      'tavern/answers/deepseek-round7.jsonl (verbatim, AS SAID) call ' + r.call_id,
      'prefix ' + (r.prefix?.mode || '') + ' sha256 ' + (r.prefix?.sha256 || r.prompt_sha256 || '').slice(0, 16),
      'cache hit ' + (r.usage?.prompt_cache_hit_tokens ?? 0) + '/' + (r.usage?.prompt_tokens ?? 0),
      'served ' + (r.model?.served || '?') + ' in ' + r.latency_ms + 'ms',
    ],
  });
}

// 3. typesafe: typed distributions, no free-text lane (mapping declared)
const ts = readRows('./answers/typesafe-round7.jsonl')[0];
if (ts) {
  const a = ts.answers || {};
  rows.push({
    kind: 'tavern.round', round: 7, voice: 'typesafe (systemone-jev-1.13.0, typed distributions only — no free-text lane exists on the receipted wire protocol; mapping declared)',
    lane: 'fleet-seeds/tavern/round7_three_houses.mjs (lane 36-b)',
    message: 'typed answer, not prose: ' + JSON.stringify(a).slice(0, 900) + ' — decisiveness ' + (ts.answers?.decisiveness ?? 'n/a'),
    refs: ['tavern/answers/typesafe-round7.jsonl (verbatim, AS SAID)', 'usage ' + JSON.stringify(ts.usage || {}).slice(0, 120), 'honesty: ' + (ts.honesty || 'declared')],
  });
}

// 4. moth: chat lane does not exist (404 x3 receipted); quantum house = entropy oracle
const mo = readRows('./answers/moth-round7.jsonl')[0];
if (mo) {
  const g = mo.graph_job || {};
  rows.push({
    kind: 'tavern.round', round: 7, voice: 'moth (graph-v1 on aer, quantum — chat lane ABSENT, 3 probes honest-404; house cannot ideate, attends as entropy oracle / provenance only)',
    lane: 'fleet-seeds/tavern/round7_three_houses.mjs (lane 36-b)',
    message: 'capability probe: chat 404 x3 (bearer + alt headers); live graph job ' + (g.job_id || '?').slice(0, 16) + ' = ' + (g.shots || '?') + ' shots, ' + (g.distinct_outcomes || '?') + ' distinct outcomes, ' + (g.bits || '?') + ' bits, ' + (g.ones || '?') + ' ones — the house answers with randomness, receipted, not with words; MOTH_LK==MOTH_KEY receipted',
    refs: ['tavern/answers/moth-round7.jsonl (verbatim, AS SAID)', 'job ' + (g.job_id || '?')],
  });
}

// 5. round-7 keeper note: E-Q7 ran the SAME wave (keeper completed dead lane 36-a) — C4 FALSIFIED
rows.push({
  kind: 'tavern.round', round: 7, voice: 'keeper (wave 36 seal)',
  lane: 'qthe/experiments/e_q7_checkerboard_cascade.mjs (lane 36-a died on the context deadline mid-wave; keeper completed per the wave-32/34 recovery pattern)',
  message: 'The guest stood behind E-Q7 at round seven; E-Q7 ran the same wave and C4 is FALSIFIED under the guest\'s own sealed rule (parityLive 5/64 ticks, terminal parity-dependence false in both phases; cascade regime held in all four arms incl. wormhole-OFF while substrate-wide inversion = 0; OFF-nu 0 firings vs ON-nu 991 — the lane\'s own sign-impotence expectation died with it, P3 conditional FIRED). Scoreboard: C1 OPEN, C2 LIVES, C3 DIES, C4 DIES by the guest\'s own lever, C5 DIES; C5\' one-pager and the R2 channel-crossing audit remain open. Chain 36 links verified from disk, tip befa0c333c1649324f642fdc720c45787ff159b52f61e232960e6146108f3e68.',
  refs: ['qthe@55ddced experiments E-Q7 RUN COMPLETE (keeper-completed)', 'qthe:receipts/e_q7_chain.jsonl (verified from disk)', 'fleet-seeds/tavern/round7-three-houses.md'],
});

// 6. seal append-only
const out = disk.concat(rows);
const sealed = stone.sealChain(out, undefined, { alg: 'stone-v1' });
const sealedRows = sealed.rows || sealed;
const post = stone.verifyChain(sealedRows, undefined, { alg: 'stone-v1' });
if (!post.ok) { console.error('POST-SEAL VERIFY FAILED — refuse to write', post); process.exit(1); }
const { writeFileSync } = await import('node:fs');
writeFileSync(LEDGER, sealedRows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log('sealed:', post.links, 'rows, new tip', post.tip.slice(0, 16));
