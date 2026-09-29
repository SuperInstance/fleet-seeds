// lode/engine/engine_run.mjs — the armed discovery loop, run 1 (wave-60 lane).
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
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { systemone } from './systemone_client.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN = process.env.LODE_RUN || '2026-09-29-engine-run-2';
// run-1 = committed honest FAIL (choice `criteria` sent as array → 422; arxiv 429).
// run-2 fixes the wire shape; run-1 receipts stay on disk verbatim.
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

// HN algolia — two queries, recent first
for (const q of ['recursive self-improvement agent', 'self-evolving LLM agent']) {
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
  let res = await fetch(u, { headers: { 'User-Agent': 'lode-engine/1' } });
  if (res.status === 429) { await new Promise(r => setTimeout(r, 4000)); res = await fetch(u, { headers: { 'User-Agent': 'lode-engine/1' } }); }
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1];
    const pick = (tag) => (e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim().replace(/\s+/g, ' ') ?? '';
    return { title: pick('title'), published: pick('published'), summary: pick('summary').slice(0, 400), id: (e.match(/<id>(.*?)<\/id>/) || [])[1] };
  });
  scouts.push({ source: 'arxiv', status: res.status, n: entries.length, entries });
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
        ref: it.url || it.id || `https://github.com/${it.full_name}`,
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
const candidates = [...seen.values()].slice(0, 9);
const candJson = JSON.stringify(candidates, null, 1);
const candSha = sha256(candJson);
writeFileSync(join(OUT, 'candidates.json'), candJson + '\n');
log(`candidates: ${candidates.length} (frozen sha256 ${candSha.slice(0, 16)}…)`);

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
    instructions: 'Which ONE candidate would you test FIRST in a seal-gated fleet (cheapest credible path to a falsifiable receipt)?',
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
if (candidates.length > 0) {
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
} else {
  witness.error = 'no candidates extracted; nothing to draw';
}
writeFileSync(join(OUT, 'witness.json'), JSON.stringify(witness, null, 1) + '\n');

// ---------- summary ----------
const summary = {
  run: RUN,
  scout_ok: scouts.filter(s => s.status === 200).length,
  candidates: candidates.length,
  candidates_sha256: candSha,
  priors_ok: priors.ok,
  priors_model: priors.model ?? null,
  usage: priors.usage ?? null,
  qrng_ok: witness.ok,
  drawn: witness.drawn_candidate ?? null,
  next: 'keeper reviews the DRAWN candidate only; if it survives, mines.jsonl gains a row with pred_sha256 + qrng witness; lode_validate must pass before push',
};
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
log('SUMMARY:', JSON.stringify(summary));
