// lode/engine/engine_run.mjs — the armed discovery loop.
// run-1 (wave-60): committed honest FAIL (choice criteria array → 422; arxiv 429).
// run-2 (wave-60): wire shape fixed; GREEN; drew c1 (rrsi) → sealed M10.
// run-3 (wave-61, THIS FILE): M10 proposal-side upgrades adopted from the mine
//   we sealed — cited: M10-RRSI-PAPER (arXiv:2609.24972) + M4 (budget caps):
//   (a) HISTORY-CONDITIONED PROPOSER — the mine ledger is the proposer's memory:
//       candidates matching an existing mine's github slug / arxiv id, or a
//       previously QRNG-drawn candidate, are excluded before the freeze (falsified
//       and reviewed hypotheses are not redrawn).
//   (b) ANNEALED BUNDLED-EDIT BUDGET — deep-review bundle size B = max(1,
//       ceil(B0·ANNEAL^t)) with B0=3, ANNEAL=0.7, t = number of completed engine
//       runs. The bundle LEAD is the QRNG draw (anti-cherry-pick preserved); the
//       fill is the deterministic noul-prior order. Search narrows as evidence
//       accumulates, exactly as RRSI anneals its edit budget.
//   (c) ARXIV BACKOFF — 0s/4s/8s/16s retry ladder on 429, honest receipt if all
//       attempts fail (no silent source dropping).
// run-3 receipted an honest partial: stages scout/history/extract/budget GREEN
//   (history-conditioning excluded c1→M10 and c7→drawn@run-1; arxiv backoff got
//   200/20), stages priors/qrng fail-closed on unexported env (channel closed —
//   correct behavior). ALSO receipted: the budget count had a SELF-INCLUSION bug
//   (t counted the run's own receipt dir). Fixed below by excluding RUN; run-3
//   receipts stay on disk verbatim. Numbers coincided (t=2 and t=3 both give B=2)
//   but the formula receipt was wrong — this note is the correction of record.
// run-7 (wave-67 lane 67-h, THIS FILE): two changes, both receipted in-file + in the run receipt.
//   (a) CURATED-CORPUS AWARENESS (wave-63 queue item 2, M8-adjacent, own receipt): the run-6
//       keeper review measured the awesome-rsi catalog as COMPLEMENTARY to the freshness
//       channels (zero ledger overlap across 176 links), so its links join the proposer's
//       memory: a candidate duplicating a catalog entry is a collision with a KNOWN RESOURCE
//       and is excluded before the freeze (matched: "catalog:<marker>", source+ref receipted).
//       Source of record: receipts/2026-09-29-engine-run-6/review-c1-awesome-rsi-raw.md.
//   (b) POOL=1 DRAW GUARD: a single-element pool has nothing to randomize — selection is
//       forced, the anti-cherry-pick draw is vacuously honest, and the certified comet job
//       is NOT spent (moth-seal is registered fail-closed for pool<2; a seal on one element
//       buys zero entropy). witness.note carries the receipt when this branch fires.
// run-7 honest catch #2 (found during the run-7 review, fixed here post-run; run-7
//   receipts stay verbatim — c3's frozen card carries the defective ref): HN cards with
//   no external URL fell through the ref fallback chain to `https://github.com/undefined`
//   (it.url and it.id are both undefined for HN hits, and the github branch interpolated
//   an undefined full_name). Fixed: HN hits fall back to their story URL
//   news.ycombinator.com/item?id=<objectID>. Harmless to matching (the slug matcher only
//   ever matched real slugs), but the ref is provenance and was garbage.
//
// Design (doctrine receipted in-file):
//   1. SCOUT — public sources only (HN algolia, arxiv, GitHub search), raw
//      receipts committed. Deterministic ordering; no claim without a receipt.
//   2. EXTRACT — DETERMINISTIC candidate cards (keyword+recency heuristics over
//      the corpus). The LLM never extracts freeform: the systemone wire is an
//      answer wire (noul/choice), so the machine proposes via corpus, the LLM
//      supplies receipted PRIORS, the keeper seals. (LLM proposes, keeper
//      disposes — adapted to the wire we actually have.)
//   3. PRIORS — one typesafe battery: per-candidate noul p_frontier_signal +
//      one choice question (which candidate to test first). Full usage receipts.
//   4. ANTI-CHERRY-PICK — candidates frozen + sha256'd BEFORE a certified
//      comet-qrng-v1 draw (tools/moth-seal.mjs) selects which ONE candidate
//      receives deep keeper review this wave. Selection pressure is honest:
//      the review target is chosen by certified randomness, not taste.
//   5. No mine is sealed here. Sealing (mines.jsonl append + lode_validate) is
//      the keeper's act AFTER review, with pred_sha256 + qrng witness fields.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { systemone } from './systemone_client.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN = process.env.LODE_RUN || '2026-09-29-engine-run-3';
const OUT = join(HERE, 'receipts', RUN);
mkdirSync(join(OUT, 'scout'), { recursive: true });

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const log = (...a) => console.log(...a);

// ---------- 1. SCOUT ----------
const scouts = [];

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'lode-engine/1 (fleet scout)', ...(opts.headers || {}) } });
  const ms = res.headers.get('x-ratelimit-remaining');
  const j = await res.json().catch(() => null);
  return { status: res.status, rate_remaining: ms, body: j };
}

// HN algolia — three queries, recent first (broadened wave-61)
for (const q of ['recursive self-improvement agent', 'self-evolving LLM agent', 'AI research agent']) {
  try {
    const u = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=25`;
    const r = await fetchJSON(u);
    const hits = (r.body?.hits || []).map(h => ({ title: h.title, url: h.url, points: h.points, created_at: h.created_at, objectID: h.objectID }));
    scouts.push({ source: 'hn-algolia', query: q, status: r.status, n: hits.length, hits });
  } catch (e) { scouts.push({ source: 'hn-algolia', query: q, status: 0, error: String(e.message || e).slice(0, 200) }); }
}

// arxiv — atom XML, regex extract (one polite retry on 429 — arxiv rate-limits)
try {
  const u = 'http://export.arxiv.org/api/query?search_query=' + encodeURIComponent('all:"self-improvement" AND cat:cs.LG') + '&sortBy=submittedDate&sortOrder=descending&max_results=20';
  let res = null; const arxiv_attempts = [];
  for (const wait of [0, 4000, 8000, 16000]) { // (c) backoff ladder, M10 run-3
    if (wait) await new Promise(r => setTimeout(r, wait));
    res = await fetch(u, { headers: { 'User-Agent': 'lode-engine/1' } });
    arxiv_attempts.push(res.status);
    if (res.status !== 429) break;
  }
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1];
    const pick = (tag) => (e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim().replace(/\s+/g, ' ') ?? '';
    return { title: pick('title'), published: pick('published'), summary: pick('summary').slice(0, 400), id: (e.match(/<id>(.*?)<\/id>/) || [])[1] };
  });
  scouts.push({ source: 'arxiv', status: res.status, attempts: arxiv_attempts, n: entries.length, entries });
} catch (e) { scouts.push({ source: 'arxiv', status: 0, error: String(e.message || e).slice(0, 200) }); }

// GitHub search — authenticated (GITHUB_TOKEN), created recently, sorted by stars
try {
  const tok = process.env.GITHUB_TOKEN;
  const u = 'https://api.github.com/search/repositories?q=' + encodeURIComponent('self-improving agent created:>2026-07-01') + '&sort=stars&order=desc&per_page=20';
  const r = await fetchJSON(u, { headers: tok ? { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' } : {} });
  const repos = (r.body?.items || []).map(x => ({ full_name: x.full_name, stars: x.stargazers_count, created: x.created_at, pushed: x.pushed_at, desc: (x.description || '').slice(0, 220) }));
  scouts.push({ source: 'github-search', status: r.status, total: r.body?.total_count ?? null, rate_remaining: r.rate_remaining, n: repos.length, repos });
} catch (e) { scouts.push({ source: 'github-search', status: 0, error: String(e.message || e).slice(0, 200) }); }

writeFileSync(join(OUT, 'scout', 'raw.json'), JSON.stringify(scouts, null, 1) + '\n');
log(`scout receipts written: ${scouts.map(s => `${s.source}:${s.status}/${s.n ?? 0}`).join(' ')}`);

// ---------- 1.5 HISTORY (M10: the proposer is conditioned on the mine ledger) ----------
// Falsified / already-mined / previously-reviewed candidates are not re-proposed.
const history = { kind: 'history-conditioning', law: 'M10 proposal side (arXiv:2609.24972): proposer conditioned on full edit history so falsified hypotheses are not redrawn', mined_markers: [], previously_drawn: [], excluded: [], error: null };
const minedMarkers = [];
try {
  for (const line of readFileSync(join(HERE, '..', 'mines.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = JSON.parse(line);
    const blob = `${m.source || ''} ${m.claim || ''}`.toLowerCase();
    const slugs = [...blob.matchAll(/github\.com\/([a-z0-9_.-]+\/[a-z0-9_.-]+)/g)].map(x => x[1]);
    // wave-62 fix (run-5 collision receipted): mine BOTH marker channels — colon
    // form ("arXiv:2609.26457") AND URL form ("arxiv.org/abs/2609.26457") — and
    // store BARE ids so matching is channel-independent (run-5: M3's colon-form
    // marker never matched the HN card's URL ref, so an already-mined paper was
    // legally redrawn and QRNG-drawn; receipts verbatim in run-5 history.json).
    const arxivs = [...new Set([
      ...[...blob.matchAll(/arxiv[:\s]*([0-9]{4}\.[0-9]{4,5})/g)].map(x => x[1]),
      ...[...blob.matchAll(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})/g)].map(x => x[1]),
    ])];
    minedMarkers.push({ id: m.id, slugs, arxivs });
  }
  history.mined_markers = minedMarkers;
} catch (e) { history.error = String(e.message || e).slice(0, 200); }
// ---------- 1.6 CURATED CORPUS (wave-63 queue item 2, M8-adjacent; run-7 receipt) ----------
// Round-62 refinement: "a run candidate duplicating an awesome-rsi catalog entry is
// colliding with a KNOWN resource — the exclusion law treats curation-channel hits as
// first-class priors (own receipt)." The run-6 review measured ZERO ledger overlap, i.e.
// the curation channel carries knowledge the mine ledger does not have; its links become
// part of the proposer's memory exactly like mined markers and previously-drawn cards.
const curated = { kind: 'curated-corpus-conditioning', law: 'wave-63 queue item 2 (M8-adjacent): a candidate duplicating a curated catalog entry collides with a KNOWN resource; curation-channel hits are first-class priors in the exclusion law', source: 'receipts/2026-09-29-engine-run-6/review-c1-awesome-rsi-raw.md (run-6 keeper review, committed verbatim)', arxivs: [], slugs: [], error: null };
try {
  const cat = readFileSync(join(HERE, 'receipts', '2026-09-29-engine-run-6', 'review-c1-awesome-rsi-raw.md'), 'utf8').toLowerCase();
  curated.arxivs = [...new Set([...cat.matchAll(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?/g)].map(x => x[1]))];
  curated.slugs = [...new Set([...cat.matchAll(/github\.com\/([a-z0-9_.-]+\/[a-z0-9_.-]+)/g)].map(x => x[1].replace(/[.\-]+$/, '')))];
} catch (e) { curated.error = String(e.message || e).slice(0, 200); }
log(`curated corpus: ${curated.arxivs.length} arxiv ids + ${curated.slugs.length} github slugs loaded${curated.error ? ` (ERROR: ${curated.error})` : ''}`);

const engReceipts = join(HERE, 'receipts');
for (const d of (existsSync(engReceipts) ? readdirSync(engReceipts) : [])) {
  if (!/engine-run-\d+$/.test(d)) continue;
  try {
    const w = JSON.parse(readFileSync(join(engReceipts, d, 'witness.json'), 'utf8'));
    if (w.ok && w.drawn_candidate) {
      const cands = JSON.parse(readFileSync(join(engReceipts, d, 'candidates.json'), 'utf8'));
      const hit = cands.find(c => c.id === w.drawn_candidate);
      if (hit) history.previously_drawn.push({ run: d, id: hit.id, title: hit.title, ref: hit.ref });
    }
  } catch { /* a receipt dir without witness/candidates is not history */ }
}
const normTitle = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// wave-62 fix: card-side arxiv ids are extracted from BOTH channels (colon form
// and abs/pdf URL form, version suffix stripped) and compared as bare ids.
const cardArxivIds = (blob) => new Set([
  ...[...blob.matchAll(/arxiv[:\s]*([0-9]{4}\.[0-9]{4,5})/g)].map(x => x[1]),
  ...[...blob.matchAll(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?/g)].map(x => x[1]),
]);
const minedMatch = (c) => {
  const blob = `${c.title} ${c.ref}`.toLowerCase();
  const cardArxivs = cardArxivIds(blob);
  for (const mk of minedMarkers) {
    if (mk.slugs.some(s => blob.includes(s))) return mk.id;
    if (mk.arxivs.some(a => cardArxivs.has(a))) return mk.id;
  }
  // run-7 (wave-63 queue item 2): curated-corpus hits are first-class priors — a
  // duplicate of a catalog entry collides with a KNOWN RESOURCE, not a discovery.
  if (!curated.error) {
    const cs = curated.slugs.find(s => blob.includes(s));
    if (cs) return `catalog:${cs}`;
    const ca = curated.arxivs.find(a => cardArxivs.has(a));
    if (ca) return `catalog:${ca}`;
  }
  for (const pd of history.previously_drawn) if (normTitle(pd.title) === normTitle(c.title)) return `drawn@${pd.run}`;
  return null;
};
writeFileSync(join(OUT, 'history.json'), JSON.stringify(history, null, 1) + '\n');
log(`history: ${minedMarkers.length} mines read, ${history.previously_drawn.length} previously drawn`);

// ---------- 2. EXTRACT (deterministic candidate cards) ----------
const KEYS = ['self-improv', 'self-evolv', 'recursive', 'meta-learn', 'harness', 'outer loop', 'reward hacking', 'reward-hacking', 'verifier', 'playbook', 'skill librar', 'curriculum', 'map-elites', 'archive'];
const cands = [];
for (const s of scouts) {
  const items = s.hits || s.entries || s.repos || [];
  for (const it of items) {
    const blob = JSON.stringify(it).toLowerCase();
    const score = KEYS.reduce((a, k) => a + (blob.includes(k) ? 1 : 0), 0);
    if (score >= 2) {
      cands.push({
        id: `c${cands.length + 1}`,
        source: s.source,
        title: (it.title || it.full_name || '').slice(0, 140),
        ref: it.url || it.id || (it.objectID ? `https://news.ycombinator.com/item?id=${it.objectID}` : `https://github.com/${it.full_name}`), // run-7 fix: HN no-URL cards got github.com/undefined
        stars: it.stars ?? it.points ?? null,
        date: it.created || it.published || it.created_at || null,
        key_score: score,
        gist: (it.desc || it.summary || '').slice(0, 240),
      });
    }
  }
}
// dedup by normalized title, keep highest key_score
const seen = new Map();
for (const c of cands.sort((a, b) => b.key_score - a.key_score)) {
  const k = c.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
  if (k && !seen.has(k)) seen.set(k, c);
}
const pre = [...seen.values()].slice(0, 9);
// history-conditioning filter (M10): drop already-mined / previously-drawn, re-id sequentially
const candidates = [];
for (const c of pre) {
  const m = minedMatch(c);
  if (m) { history.excluded.push({ id: c.id, title: c.title, source: c.source, ref: c.ref, matched: m }); continue; } // wave-62: ref+source receipted (audit quality)
  candidates.push({ ...c, id: `c${candidates.length + 1}` });
}
history.curated = curated; // run-7: curated-corpus conditioning receipted in history.json
writeFileSync(join(OUT, 'history.json'), JSON.stringify(history, null, 1) + '\n');
log(`history-conditioning: ${pre.length - candidates.length} excluded (${history.excluded.map(x => `${x.id}→${x.matched}`).join(', ') || 'none'})`);
const candJson = JSON.stringify(candidates, null, 1);
const candSha = sha256(candJson);
writeFileSync(join(OUT, 'candidates.json'), candJson + '\n');
log(`candidates: ${candidates.length} (frozen sha256 ${candSha.slice(0, 16)}…)`);

// ---------- 2.5 ANNEALED BUNDLED-EDIT BUDGET (M10 proposal side) ----------
const priorRuns = (existsSync(engReceipts) ? readdirSync(engReceipts) : []).filter(d => d !== RUN && /engine-run-\d+$/.test(d)).length; // self excluded (run-3 bug fix, receipted in header)
const B0 = 3, ANNEAL = 0.7;
const editBudget = Math.max(1, Math.ceil(B0 * Math.pow(ANNEAL, priorRuns)));
const budgetReceipt = { kind: 'annealed-bundled-edit-budget', law: 'M10 (arXiv:2609.24972): proposal-side edit budget, annealed across runs', B0, anneal: ANNEAL, prior_runs: priorRuns, budget: editBudget, formula: `max(1, ceil(${B0} * ${ANNEAL}^${priorRuns})) = ${editBudget}` };
writeFileSync(join(OUT, 'budget.json'), JSON.stringify(budgetReceipt, null, 1) + '\n');
log(`bundled-edit budget: ${editBudget} (t=${priorRuns})`);

// ---------- 3. PRIORS (typesafe battery) ----------
const priors = { kind: 'typesafe-priors', ts_utc: new Date().toISOString(), ok: false };
try {
  const corpus = candidates.map(c => `- [${c.id}] (${c.source}${c.stars != null ? `, ${c.stars}` : ''}) ${c.title} :: ${c.gist}`).join('\n');
  const q = {};
  for (const c of candidates) {
    q[`p_signal_${c.id}`] = {
      type: 'noul',
      instructions: `p = probability that candidate [${c.id}] encodes a genuinely transferable self-improvement abstraction (not noise/launch hype), for a fleet whose lanes are seal-gated (pre-registered predictions, append-only ledgers). Candidate: ${c.title} — ${c.gist}`
    };
  }
  q['first_test'] = {
    type: 'choice',
    instructions: `Which ONE candidate would you test FIRST in a seal-gated fleet (cheapest credible path to a falsifiable receipt)? The annealed bundled-edit budget for this run is B=${editBudget}: the QRNG-drawn lead plus B-1 highest-prior candidates will form the review bundle.`,
    criteria: Object.fromEntries(candidates.map(c => [c.id, `${c.title} — ${c.gist}`])),
  };
  const r = await systemone({
    state: { battery: `lode-w56-engine-${RUN}`, corpus_digest_sha256: candSha, candidates: candidates.length, corpus },
    questions: q,
  });
  priors.ok = true;
  priors.model = r.model;
  priors.usage = r.usage;
  priors.latency_ms = r.latency_ms;
  priors.answers = r.answers;
  writeFileSync(join(OUT, 'priors.json'), JSON.stringify(priors, null, 1) + '\n');
  const fs = await import('node:fs');
  fs.appendFileSync(join(OUT, 'usage.jsonl'), JSON.stringify({
    kind: 'usage-receipt', at_utc: priors.ts_utc, service: 'typesafe.ai/v1/systemone',
    model: r.model, usage: r.usage, latency_ms: r.latency_ms, purpose: `lode-${RUN}-priors`, candidates: candidates.length, questions: Object.keys(q).length,
  }) + '\n');
  log(`priors: model=${r.model} usage=${JSON.stringify(r.usage)} latency=${r.latency_ms}ms`);
} catch (e) {
  priors.ok = false;
  priors.error = String(e.message || e).replace(/apikey_[A-Za-z0-9_]+/g, 'REDACTED').slice(0, 400);
  writeFileSync(join(OUT, 'priors.json'), JSON.stringify(priors, null, 1) + '\n');
  log('priors FAILED (honest):', priors.error);
}

// ---------- 4. ANTI-CHERRY-PICK QRNG DRAW ----------
const witness = { kind: 'qrng-witness', ts_utc: new Date().toISOString(), ok: false, candidates_sha256: candSha };
if (candidates.length === 1) {
  // run-7 pool=1 draw guard (receipted in header): nothing to randomize, the comet job
  // is not spent. moth-seal is registered fail-closed for pool<2; drawing from one
  // element is a forced selection and cannot be cherry-picked.
  witness.ok = true;
  witness.drawn_index = 0;
  witness.drawn_candidate = candidates[0].id;
  witness.note = 'pool=1: deterministic forced selection (nothing to choose among; anti-cherry-pick vacuously holds); certified QRNG job NOT consumed — a seal on a single-element pool is moth-seal fail-closed by registration and would buy zero entropy';
  log(`pool=1: deterministic draw of ${witness.drawn_candidate} (no QRNG job spent)`);
}
if (candidates.length > 1) {
  try {
    const key = process.env.MOTHQUANTUM_TOKEN || process.env.MOTH_KEY;
    if (!key) throw new Error('no mothquantum token (fail-closed)');
    const sealPath = join(OUT, 'qrng-seal.json');
    execFileSync('node', [
      join(HERE, '..', '..', 'tools', 'moth-seal.mjs'),
      `--n=1`, `--pool=${candidates.length}`, `--label=lode-${RUN}-review-order`,
      `--out=${sealPath}`, '--quiet',
    ], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MOTH_KEY: key }, timeout: 120000 });
    const seal = JSON.parse((await import('node:fs')).readFileSync(sealPath, 'utf8'));
    const sel = seal.chosen?.selected?.[0];
    witness.ok = true;
    witness.drawn_index = sel;
    witness.drawn_candidate = candidates[sel]?.id ?? null;
    witness.raw_result_sha256 = seal.rawResultSha256 ?? null;
    witness.job = seal.job ?? null;
    witness.note = 'certified comet-qrng-v1 Fisher-Yates over the frozen candidate list; the drawn candidate receives deep keeper review this wave (anti-cherry-pick). Full certified receipt: qrng-seal.json';
    log(`QRNG drew candidate #${sel} (${witness.drawn_candidate})`);
  } catch (e) {
    witness.ok = false;
    witness.error = String(e.message || e).replace(/moth_[A-Za-z0-9]+/g, 'REDACTED').slice(0, 400);
    log('QRNG witness FAILED (honest):', witness.error);
  }
} else if (candidates.length === 0) {
  witness.error = 'no candidates extracted; nothing to draw';
}
writeFileSync(join(OUT, 'witness.json'), JSON.stringify(witness, null, 1) + '\n');

// ---------- 5. BUNDLE (lead = QRNG draw; fill = deterministic noul order) ----------
let bundle = { kind: 'review-bundle', ok: false, budget: editBudget };
if (witness.ok && priors.ok && candidates.length > 0) {
  const noul = (id) => priors.answers?.[`p_signal_${id}`]?.noul ?? 0;
  const lead = witness.drawn_candidate;
  const fill = candidates.filter(c => c.id !== lead)
    .sort((a, b) => noul(b.id) - noul(a.id))
    .slice(0, Math.max(0, editBudget - 1))
    .map(c => ({ id: c.id, noul: noul(c.id), title: c.title }));
  bundle = {
    kind: 'review-bundle', ok: true, budget: editBudget,
    lead, lead_note: 'chosen by certified QRNG (anti-cherry-pick)',
    members: [{ id: lead, noul: noul(lead), title: candidates.find(c => c.id === lead)?.title }, ...fill],
    fill_rule: 'deterministic: descending typesafe noul prior, receipted in priors.json',
  };
} else {
  bundle.error = witness.ok ? (priors.ok ? 'no candidates' : 'priors failed') : 'qrng failed';
}
writeFileSync(join(OUT, 'bundle.json'), JSON.stringify(bundle, null, 1) + '\n');
if (bundle.ok) log(`bundle: [${bundle.members.map(m => m.id).join(', ')}] (lead ${bundle.lead} by QRNG, budget ${editBudget})`);

// ---------- 6. RUNS LEDGER (append-only memory for the next run's history conditioning) ----------
try {
  appendFileSync(join(HERE, '..', 'runs.jsonl'), JSON.stringify({
    run: RUN, ts_utc: new Date().toISOString(),
    candidates: candidates.length, candidates_sha256: candSha,
    history_excluded: history.excluded.length,
    curated_excluded: history.excluded.filter(x => String(x.matched).startsWith('catalog:')).length, // run-7
    budget: editBudget,
    priors_ok: priors.ok, usage: priors.usage ?? null,
    qrng_ok: witness.ok, drawn: witness.drawn_candidate ?? null,
    bundle: bundle.ok ? bundle.members.map(m => m.id) : null,
  }) + '\n');
  log('runs.jsonl appended');
} catch (e) { log('runs.jsonl append FAILED (honest):', String(e.message || e).slice(0, 200)); }

// ---------- summary ----------
const summary = {
  run: RUN,
  scout_ok: scouts.filter(s => s.status === 200).length,
  history_excluded: history.excluded.length,
  curated_excluded: history.excluded.filter(x => String(x.matched).startsWith('catalog:')).length, // run-7: curated-corpus awareness
  candidates: candidates.length,
  candidates_sha256: candSha,
  edit_budget: editBudget,
  priors_ok: priors.ok,
  priors_model: priors.model ?? null,
  usage: priors.usage ?? null,
  qrng_ok: witness.ok,
  drawn: witness.drawn_candidate ?? null,
  bundle: bundle.ok ? bundle.members.map(m => m.id) : null,
  next: 'keeper reviews the DRAWN candidate (bundle lead) deeply; if it survives, mines.jsonl gains a row with pred_sha256 + qrng witness; lode_validate must pass before push; bundle fillers stay frozen candidates for future runs (budget-annealed, not discarded)',
};
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
log('SUMMARY:', JSON.stringify(summary));
