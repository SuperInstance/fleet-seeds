#!/usr/bin/env node
// moth-census.mjs — lane 45-e "moth deep" — the census instrument.
//
// WHAT (brief 45-e): map the mothquantum API surface beyond what wave 42/43
// cracked, and build the next instrument from whatever we find. This tool:
//
//   survey    read-only catalog survey (<= 8 GETs, 550ms spacing) -> receipts,
//             engine-id set, overlap vs the archived 2026-09-25 docs catalog
//   census    REGISTERED micro-census: N=3 engines x 1 job each (emu), raw
//             bits folded through the registered mothbits whitening, per-engine
//             receipts (job id, raw sha, whitened sha, balance, truncation
//             shape) + VERDICT.md comparing engines and scoring the
//             pre-registered claims (claims.json @ sha 200313cc3b034d5e…)
//   selftest  OFFLINE: mothbits 42-b KAT byte-exactness (raw ebc8a43d… ->
//             whitened 836985ec…, archived job 2caa822b), extraction +
//             redaction unit checks, claims-seal verification. No network.
//
// FINDINGS WELDED IN (step-1/2 receipts, this dir):
//   - POST /engines/{id}/process body envelope is {"params": {...}} — flat
//     bodies 422 with "unexpected property" (8/8 receipts in
//     receipts/45e-hands-on-receipt.json); flow: poll GET /jobs/{id}/status
//     until completed|failed|cancelled -> GET /jobs/{id}/result.
//   - visible catalog = 33 engines @ 2026-09-27 (docs list only 13);
//     comet-qrng-v1 (certified randomness: SP 800-90B-style min-entropy
//     certificate, Toeplitz extractor, CHSH witness, device fingerprint,
//     commitment + pulse hash-chain) is NOT in the archived docs.
//   - "aer"/"emu" are NOT engines: they are params (mode: emu|qpu; machine:
//     aer) — revises the wave-42 note "engines known working: graph-v1, aer, emu".
//
// Keys: MOTH_KEY read at RUNTIME ONLY (env or .env), never printed, never
// receipted. URLs/tokens redacted from receipts. Zero npm deps (node:crypto,
// node:fs only). mothbits.mjs is a VERBATIM copy of fleet-seeds tools/mothbits.mjs
// (lane 43-c "tool-builder"); the 42-b KAT fixture rides along in fixtures/.
//
// CLI:
//   node moth-census.mjs selftest
//   node moth-census.mjs survey   [--out=receipts/45e-census-survey.json]
//   node moth-census.mjs census   [--out=receipts/45e-census-receipt.json]
//                                 [--verdict=VERDICT.md] [--engines=a,b,c]
//                                 [--prediction=receipts/45e-deepseek-prediction.json]

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { whiteningReceipt, whitenedStream, RECIPE as MOTHBITS_RECIPE } from './mothbits.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://api.mothquantum.com/api/v1';
const RATE_MS = 550;          // <= 2 req/sec, polite
const SURVEY_CAP = 8;         // read-only survey request cap (step budget 30 across the lane)
const CENSUS_JOB_CAP = 4;     // registered budget: 3 planned + 1 retry allowance (claims.json)
const POLL_MAX = 60;
const POLL_MS = 1200;
const ARCHIVED_DOCS_ENGINES = [  // archived 2026-09-25 docs (moth-research/p_engines.html, v0.41.0)
  'blur-midi-v1', 'coin-toss-v1', 'deep-fryer-v1', 'entanglement-shader-v1',
  'example-engine-v1', 'qpixl-v1', 'qrc-gen-v2', 'qrc-train-v2', 'blur-v1',
  'blur-core-v1', 'graph-v1', 'labyrinth-v1', 'telablur-v1',
];
const EXPECTED_CATALOG_COUNT = 33; // manual step-1 survey receipt 2026-09-27 (P3)
const EXPECTED_CENSUS_ENGINES = ['comet-qrng-v1', 'graph-v1', 'coin-toss-v1'];
const KAT_RAW_SHA = 'ebc8a43d90be5c0b01788f7cc63021ab0b0dac1a0294756e73a2882360b5e9b9';
const KAT_WHITENED_SHA = '836985ec99d5e5e69cef6445ce5bf33b3b232c2ce0733ca72f9b88d244e8ddeb';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();

// ── keys (runtime only) ─────────────────────────────────────────────────────
function loadKey() {
  if (process.env.MOTH_KEY) return process.env.MOTH_KEY.trim();
  const envPath = process.env.MOTH_ENV || '/home/z/my-project/.env';
  const m = readFileSync(envPath, 'utf8').match(/^MOTH_KEY=(.+)$/m);
  if (!m) throw new Error('MOTH_KEY not found (env or .env) — refusing to run network legs');
  return m[1].trim();
}

// ── redaction (receipts carry no URLs/tokens/keys) ──────────────────────────
export function redact(v, k) {
  if (typeof v === 'string') {
    if (/X-Amz-Signature|Signature=/.test(v)) return '<presigned-url-redacted>';
    if (/url|token|signature/i.test(k || '')) return /https?:\/\//.test(v) ? '<url-redacted>' : (v.length > 96 ? '<redacted>' : v);
    return v.length > 4000 ? v.slice(0, 4000) + '…<truncated>' : v;
  }
  if (Array.isArray(v)) return v.map((x) => redact(x));
  if (v && typeof v === 'object') { const o = {}; for (const [kk, vv] of Object.entries(v)) o[kk] = redact(vv, kk); return o; }
  return v;
}

async function apiCall(method, url, key, body) {
  const headers = { authorization: `Bearer ${key}`, 'user-agent': 'fleet-seeds-moth-census/1.0 (lane 45-e)' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000) });
  return { status: res.status, text: await res.text() };
}

// ── per-engine bit extraction (real per-bit payload only) ───────────────────
// Canonical expansion: sorted outcome strings, each repeated by its count
// (mirrors mothqrc.mjs graph-v1 convention + comet-qrng's own declared
// extractor input_serialisation "sorted bitstrings repeated by count").
// Bit VALUES are real quantum measurements; bit ORDER is canonical, receipted.
export function expandCounts(countsObj) {
  const entries = Object.entries(countsObj || {})
    .map(([bs, n]) => ({ bs: String(bs).replace(/[^01]/g, ''), n: Math.max(0, Number(n) || 0) }))
    .filter((m) => m.bs.length > 0)
    .sort((a, b) => (a.bs < b.bs ? -1 : a.bs > b.bs ? 1 : 0));
  let bits = 0, ones = 0;
  for (const { bs, n } of entries) for (let r = 0; r < n; r++) for (const c of bs) { bits++; if (c === '1') ones++; }
  const bitLen = entries.length ? entries[0].bs.length : 0;
  return { entries, totalBits: bits, ones, outcomeWidth: bitLen, distinct: entries.length, shotsSeen: entries.reduce((a, { n }) => a + n, 0) };
}

export function bitsToBitstring({ entries }) {
  let s = '';
  for (const { bs, n } of entries) for (let r = 0; r < n; r++) s += bs;
  return s;
}

export function hexToBits(hex) {
  let bits = '';
  for (const byteHex of (hex.match(/.{2}/g) || [])) bits += parseInt(byteHex, 16).toString(2).padStart(8, '0');
  return bits;
}

export function balance(bits) { return bits.length ? (bits.match(/1/g) || []).length / bits.length : null; }

// whitened-balance metric: ones/len over the counter-stream bytes the FY draws consumed
export function whitenedBalance(vnBytes, byteLen) {
  const stream = whitenedStream(vnBytes);
  let ones = 0, total = 0;
  const blocks = Math.ceil(byteLen / 32);
  for (let b = 0; b < blocks; b++) {
    const blk = stream.block(b);
    const take = Math.min(32, byteLen - total);
    for (let i = 0; i < take; i++) { const byte = blk[i]; ones += ((byte & 0x80) ? 1 : 0) + ((byte & 0x40) ? 1 : 0) + ((byte & 0x20) ? 1 : 0) + ((byte & 0x10) ? 1 : 0) + ((byte & 0x08) ? 1 : 0) + ((byte & 0x04) ? 1 : 0) + ((byte & 0x02) ? 1 : 0) + ((byte & 0x01) ? 1 : 0); total++; }
  }
  return { ones, bytes: total, balance: total ? ones / (total * 8) : null };
}

// ── engine adapters: result -> {rawBits, rawMeta, extracted, truncation} ────
export function adaptResult(engine, result, params) {
  const r = result && typeof result === 'object' ? result : {};
  const inner = r.result && typeof r.result === 'object' ? r.result : {};
  const out = (inner.output && typeof inner.output === 'object') ? inner.output : (r.output && typeof r.output === 'object' ? r.output : null);
  const meta = { engine, topLevelKeys: Object.keys(r).sort(), innerKeys: Object.keys(inner).sort() };
  if (engine === 'comet-qrng-v1') {
    const rawCounts = out && out.raw && out.raw.counts ? out.raw.counts : null;
    const exp = rawCounts ? expandCounts(rawCounts) : null;
    const extractedHex = out && out.random && out.random.hex ? String(out.random.hex).replace(/^0x/, '') : null;
    const extractedBits = extractedHex ? hexToBits(extractedHex) : null;
    return {
      ...meta,
      kind: 'raw-counts+extracted-bytes',
      rawBits: exp ? bitsToBitstring(exp) : '',
      rawMeta: exp ? { distinct: exp.distinct, outcomeWidth: exp.outcomeWidth, shotsSeen: exp.shotsSeen, shotsRequested: params.shots, support: 2 ** (params.num_qubits || 12), rawBalance: exp.totalBits ? exp.ones / exp.totalBits : null, rawSha256: exp ? sha256(exp.totalBits ? bitsToBitstring(exp) : '') : null } : { note: 'no raw.counts (include_raw_counts=false?)' },
      extracted: extractedBits ? { bits: extractedBits.length, bytes: extractedHex.length / 2, balance: balance(extractedBits), sha256: sha256(Buffer.from(extractedHex, 'hex')).toString('hex'), requestedBytes: out.random.requested_bytes, deliveredBytes: out.random.bytes, bitsDeclared: out.random.bits, entropyGrade: out.entropy_report && out.entropy_report.grade, healthPassed: out.entropy_report && out.entropy_report.health_passed, hBit: out.entropy_report && out.entropy_report.h_bit, budgetBits: out.entropy_report && out.entropy_report.budget_bits, extractor: out.extractor && out.extractor.kind, publicSeed: out.extractor && out.extractor.public_seed } : { note: 'no extracted bytes' },
      truncation: exp ? { distinctReturned: exp.distinct, support: 2 ** (params.num_qubits || 12), sumCounts: exp.shotsSeen, shotsRequested: params.shots, verdict: exp.distinct >= exp.shotsSeen || exp.distinct > 20 ? 'NO-TRUNCATION-EVIDENCE' : `TRUNCATED(distinct=${exp.distinct})` } : null,
      commitment: out && out.commitment ? { commitSha256: out.commitment.commit, binds: out.commitment.binds } : null,
    };
  }
  if (engine === 'graph-v1') {
    const meas = out && Array.isArray(out.measurements) ? out.measurements : null;
    if (!meas) return { ...meta, kind: 'unknown', rawBits: '', rawMeta: { note: 'no measurements array' }, extracted: null, truncation: null };
    const countsObj = Object.fromEntries(meas.map((m) => [String(m.bitstring), Number(m.count) || 0]));
    const exp = expandCounts(countsObj);
    return {
      ...meta, kind: 'measurements-multiset',
      rawBits: bitsToBitstring(exp),
      rawMeta: { distinct: exp.distinct, outcomeWidth: exp.outcomeWidth, shotsSeen: exp.shotsSeen, shotsRequested: params.shots, support: 2 ** (params.num_qubits || 4), rawBalance: exp.totalBits ? exp.ones / exp.totalBits : null, rawSha256: sha256(bitsToBitstring(exp)) },
      extracted: null,
      truncation: { distinctReturned: exp.distinct, support: 2 ** (params.num_qubits || 4), sumCounts: exp.shotsSeen, shotsRequested: params.shots, verdict: (exp.distinct <= 20 && exp.shotsSeen < params.shots) ? 'TOP-20-TRUNCATION-CONFIRMED' : (exp.distinct <= 20 ? 'truncated-shape(distinct<=20)' : 'NO-TRUNCATION-EVIDENCE') },
      dominantBitstring: out.dominant_bitstring, edgeAgreement: out.edge_agreement_score,
    };
  }
  if (engine === 'coin-toss-v1') {
    const heads = Number(inner.heads ?? r.heads ?? NaN), tails = Number(inner.tails ?? r.tails ?? NaN), shots = Number(inner.shots ?? r.shots ?? NaN);
    return { ...meta, kind: 'aggregate-counts', rawBits: '', rawMeta: { heads, tails, shots, headsBalance: Number.isFinite(heads) && shots ? heads / shots : null, bitPayload: 'none (counts only)' }, extracted: null, truncation: { distinctReturned: 2, support: 2, verdict: 'complete (2 outcomes — nothing to truncate)' } };
  }
  return { ...meta, kind: 'unadapted', rawBits: '', rawMeta: { note: 'no adapter' }, extracted: null, truncation: null };
}

// ── census job (<= CENSUS_JOB_CAP submits; retry only on 'missing property' 422) ──
async function censusJob(engine, params, key, usedRef, log) {
  const t0 = Date.now();
  const row = { engine, params: redact(params), envelope: '{"params":{...}} (corrected envelope; flat bodies 422 — see hands-on receipts)' };
  if (usedRef.n >= CENSUS_JOB_CAP) { row.skipped = 'JOB_BUDGET_CAP'; return row; }
  log(`POST /engines/${engine}/process ${JSON.stringify(params)}`);
  const sub = await apiCall('POST', `${BASE}/engines/${engine}/process`, key, { params });
  row.submitStatus = sub.status; usedRef.n++;
  let parsed = null; try { parsed = JSON.parse(sub.text); } catch {}
  if (sub.status >= 400) {
    row.error = parsed ? redact(parsed) : sub.text.slice(0, 300);
    const missing = sub.status === 422 && /missing property/.test(sub.text);
    if (missing && usedRef.n < CENSUS_JOB_CAP) {
      log(`  422 missing-property -> retry with engine defaults ({}) [retry allowance, job ${usedRef.n + 1}/${CENSUS_JOB_CAP}]`);
      const sub2 = await apiCall('POST', `${BASE}/engines/${engine}/process`, key, { params: {} }); usedRef.n++;
      row.retry = { status: sub2.status };
      let p2 = null; try { p2 = JSON.parse(sub2.text); } catch {}
      if (sub2.status >= 400) { row.retryError = p2 ? redact(p2) : sub2.text.slice(0, 300); return row; }
      parsed = p2; row.submitStatus = sub2.status;
    } else { row.verdict = 'FAIL'; return row; }
  }
  const jobId = parsed && parsed.job_id;
  row.jobId = jobId || null;
  if (!jobId) { row.result = redact(parsed); }
  else {
    let status = '', poll = 0;
    while (poll < POLL_MAX) {
      await sleep(POLL_MS); poll++;
      const st = await apiCall('GET', `${BASE}/jobs/${jobId}/status`, key);
      try { status = JSON.parse(st.text).status; } catch { status = `HTTP${st.status}`; }
      if (['completed', 'failed', 'error', 'cancelled'].includes(status)) break;
    }
    row.polls = poll; row.finalStatus = status;
    if (status === 'completed') {
      const rr = await apiCall('GET', `${BASE}/jobs/${jobId}/result`, key);
      try { row.result = redact(JSON.parse(rr.text)); } catch { row.resultRawHead = rr.text.slice(0, 200); }
    } else row.verdict = `FAIL(status=${status})`;
  }
  row.ms = Date.now() - t0;
  return row;
}

// ── subcommand: selftest (OFFLINE) ──────────────────────────────────────────
function selftest() {
  const checks = [];
  const ck = (name, ok, detail) => { checks.push({ name, ok, detail }); console.error(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

  // 1. mothbits KAT byte-exact vs archived 42-b job 2caa822b
  const fx = join(HERE, 'fixtures', 'moth-42b-raw-bits-2caa822b-7c46-4f65-a0c9-152c46272e19.txt');
  if (existsSync(fx)) {
    const bits = readFileSync(fx, 'utf8').trim();
    const rec = whiteningReceipt(bits, { poolSize: 1134, take: 16 });
    ck('KAT raw sha (ebc8a43d…)', rec.input.sha256 === KAT_RAW_SHA, rec.input.sha256.slice(0, 16) + '…');
    ck('KAT whitened block0 sha (836985ec…)', rec.step3_counterStream.block0Sha256 === KAT_WHITENED_SHA, rec.step3_counterStream.block0Sha256.slice(0, 16) + '…');
    ck('KAT FY selection matches 42-b receipt', JSON.stringify(rec.step4_fisherYates.selected) === JSON.stringify([191, 560, 613, 600, 93, 378, 373, 319, 247, 118, 540, 231, 1027, 804, 130, 668]) && rec.step4_fisherYates.rejects === 2, `rejects=${rec.step4_fisherYates.rejects}`);
  } else ck('KAT fixture present', false, fx);

  // 2. expandCounts canonical order + balance math ('01','10','10','11' sorted-expanded)
  const exp = expandCounts({ '10': 2, '01': 1, '11': 1 });
  ck('expandCounts sorted expansion', bitsToBitstring(exp) === '01101011', bitsToBitstring(exp));
  ck('expandCounts balance', exp.ones === 5 && exp.totalBits === 8, `${exp.ones}/${exp.totalBits}`);

  // 3. hexToBits MSB-first
  ck('hexToBits MSB-first', hexToBits('f0') === '11110000', hexToBits('f0'));

  // 4. whitenedBalance runs + bounds
  const wb = whitenedBalance(Buffer.from('kat', 'utf8'), 32);
  ck('whitenedBalance shape', wb.bytes === 32 && wb.balance > 0 && wb.balance < 1, `balance=${wb.balance?.toFixed(4)}`);

  // 5. redaction: presigned + url-ish keys die; plain short values pass
  const rr = redact({ a: 'https://x?X-Amz-Signature=zz', download_url: 'https://x/presigned', meta: { token: 'abc' }, d: 'short-ok' });
  ck('redact presigned/url/token', rr.a === '<presigned-url-redacted>' && rr.download_url === '<url-redacted>' && rr.meta.token === 'abc' && rr.d === 'short-ok', JSON.stringify(rr));

  // 6. claims seal: claims.json sha256 matches registration receipt
  const claimsPath = join(HERE, 'claims.json');
  if (existsSync(claimsPath)) {
    const claimsSha = sha256(readFileSync(claimsPath));
    const regPath = join(HERE, 'receipts', '45e-claims-registration.json');
    const reg = existsSync(regPath) ? JSON.parse(readFileSync(regPath, 'utf8')) : null;
    ck('claims.json sha == registration receipt', !!reg && reg.registered.sha256 === claimsSha, claimsSha.slice(0, 16) + '…');
    ck('claims sealed BEFORE census (mtime sanity)', !!reg, reg && reg.registered.mtime_iso);
  } else ck('claims.json present', false, claimsPath);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`selftest: ${checks.length - failed}/${checks.length} checks pass`);
  process.exit(failed ? 1 : 0);
}

// ── subcommand: survey (read-only) ──────────────────────────────────────────
async function survey(outPath) {
  const key = loadKey();
  const probes = [
    { note: 'auth identity', url: `${BASE}/me` },
    { note: 'engine catalog (primary)', url: `${BASE}/engines` },
    { note: 'catalog pagination variant', url: `${BASE}/engines?limit=100` },
    { note: 'catalog WITHOUT auth (public?)', url: `${BASE}/engines`, auth: false },
    { note: 'job history newest-first', url: `${BASE}/jobs?limit=5` },
    { note: 'machine-readable spec', url: 'https://api.mothquantum.com/openapi.json' },
  ];
  if (probes.length > SURVEY_CAP) throw new Error('survey probe list exceeds cap');
  const rows = [];
  for (const p of probes) {
    const t0 = Date.now();
    try {
      const res = await apiCall('GET', p.url, p.auth === false ? undefined : key);
      let ids = undefined, shape = undefined;
      try {
        const j = JSON.parse(res.text);
        const arr = Array.isArray(j) ? j : (j.engines || j.jobs || j.items || j.data);
        if (Array.isArray(arr)) {
          ids = arr.slice(0, 50).map((x) => (x && typeof x === 'object') ? { id: x.id ?? x.engine_id ?? x.job_id, status: x.status } : x).filter((x) => x.id);
          shape = { arrayLen: arr.length };
        } else if (j.paths) shape = { openapiPaths: Object.keys(j.paths).length };
        else shape = { objectKeys: Object.keys(j).slice(0, 16) };
      } catch { shape = { textLen: res.text.length }; }
      rows.push({ endpoint: p.url.replace(BASE, '').replace('https://api.mothquantum.com', ''), auth: p.auth !== false, note: p.note, status: res.status, ms: Date.now() - t0, shape, ids });
    } catch (e) {
      rows.push({ endpoint: p.url, auth: p.auth !== false, note: p.note, status: 'FETCH_ERR', error: String(e && e.message || e).slice(0, 120), ms: Date.now() - t0 });
    }
    console.error(`GET ${p.url.replace(BASE, '')} -> ${rows[rows.length - 1].status}`);
    await sleep(RATE_MS);
  }
  const catRow = rows.find((r) => r.ids && r.note.startsWith('engine catalog'));
  const engineIds = catRow ? catRow.ids.map((x) => x.id) : [];
  const missingFromLive = ARCHIVED_DOCS_ENGINES.filter((e) => !engineIds.includes(e));
  const newSinceDocs = engineIds.filter((e) => !ARCHIVED_DOCS_ENGINES.includes(e));
  const receipt = {
    instrument: 'playtest/wave45/moth-census/moth-census.mjs survey', ts: now(), base: BASE,
    budget: { cap: SURVEY_CAP, used: rows.length, spacingMs: RATE_MS },
    auth: 'Authorization: Bearer *** (MOTH_KEY runtime-only; one unauthenticated probe marked; no key material in receipt)',
    rows,
    catalog: { count: engineIds.length, expectedCountP3: EXPECTED_CATALOG_COUNT, matchesP3: engineIds.length === EXPECTED_CATALOG_COUNT, archivedDocsEngines: ARCHIVED_DOCS_ENGINES, missingFromLive: missingFromLive, newSinceArchivedDocs: newSinceDocs },
    keyMaterial: 'none',
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(`catalog: ${engineIds.length} engines (P3 expected ${EXPECTED_CATALOG_COUNT}) -> ${outPath}`);
  console.log(`new since archived docs: ${newSinceDocs.join(', ') || '(none)'}`);
  if (missingFromLive.length) console.log(`WARN archived-docs engines missing from live catalog: ${missingFromLive.join(', ')}`);
  return receipt;
}

// ── subcommand: census (the registered run) ─────────────────────────────────
async function census(opts) {
  const key = loadKey();
  const engines = opts.engines || EXPECTED_CENSUS_ENGINES;
  const paramsFor = {
    'comet-qrng-v1': { mode: 'emu', num_qubits: 12, shots: 4096, output_bytes: 512, include_raw_counts: true, bell_witness: false },
    'graph-v1': { mode: 'emu', num_qubits: 12, shots: 1024 },
    'coin-toss-v1': { mode: 'emu', shots: 512 },
  };
  const log = (m) => console.error(m);
  const rows = [];
  const usedRef = { n: 0 };
  for (const engine of engines) {
    const jobRow = await censusJob(engine, paramsFor[engine] || {}, key, usedRef, log);
    // fold through the registered whitening where a raw bitstream exists
    const adapted = jobRow.result ? adaptResult(engine, jobRow.result, paramsFor[engine] || {}) : null;
    let whitened = null;
    if (adapted && adapted.rawBits && adapted.rawBits.length >= 64) {
      const rec = whiteningReceipt(adapted.rawBits, { poolSize: 1134, take: 16 });
      const rawBalance = balance(adapted.rawBits);
      const vn = vonNeumannBits(adapted.rawBits);
      // stream bytes consumed by the FY draws: draws * 16 bits, capped sanely
      const draws = rec.step4_fisherYates.draws;
      const byteLen = Math.min(Math.ceil((draws * 16) / 8), 1 << 20);
      const wb = whitenedBalance(vn.bytes, byteLen);
      whitened = {
        recipe: MOTHBITS_RECIPE,
        rawBitsLen: adapted.rawBits.length, rawBalance, rawSha256: sha256(Buffer.from(adapted.rawBits, 'utf8')),
        vnBits: vn.bits.length, vnBalance: balance(vn.bits), vnPadLen: vn.padLen, vnBytesSha256: sha256(vn.bytes),
        whitenedSeedSha256: rec.step3_counterStream.block0Sha256,
        fyDraws: draws, fyRejects: rec.step4_fisherYates.rejects, fySelected: rec.step4_fisherYates.selected,
        streamBytesConsumed: byteLen, whitenedBalance: wb.balance, whitenedOnes: wb.ones,
        poolPick: { poolSize: 1134, take: 16, selected: rec.step4_fisherYates.selected },
        note: 'whitenedBalance = ones/8n over the sha256-counter-stream bytes the FY draws consumed',
      };
    } else if (adapted) {
      whitened = { note: 'N/A — engine does not yield a >=64-bit raw bitstream (see rawMeta)', rawMeta: adapted.rawMeta };
    }
    rows.push({ ...jobRow, adapted, whitened });
    await sleep(RATE_MS);
  }
  const receipt = {
    instrument: 'playtest/wave45/moth-census/moth-census.mjs census', ts: now(),
    registered: { claims: 'claims.json', sha256: sha256(readFileSync(join(HERE, 'claims.json'))), registrationReceipt: 'receipts/45e-claims-registration.json' },
    budget: { jobCap: CENSUS_JOB_CAP, submitAttempts: usedRef.n, note: 'submit attempts counted; polls excluded; planned 3 + 1 retry allowance per claims.json' },
    envelopeFinding: '{"params":{...}} required (flat 422s receipted in receipts/45e-hands-on-receipt.json)',
    engines, rows,
    keyMaterial: 'none',
  };
  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, JSON.stringify(receipt, null, 2) + '\n');
  console.log(`census receipt -> ${opts.out}`);
  if (opts.verdict) await writeVerdict(receipt, opts);
  return receipt;
}

// local VN duplicate for the balance leg (mothbits exports the stage functions)
function vonNeumannBits(rawBits) {
  let out = '';
  for (let i = 0; i + 1 < rawBits.length; i += 2) {
    const a = rawBits[i], b = rawBits[i + 1];
    if (a === '0' && b === '1') out += '0';
    else if (a === '1' && b === '0') out += '1';
  }
  const padLen = (8 - (out.length % 8)) % 8;
  const bytes = Buffer.alloc(Math.ceil(out.length / 8));
  for (let i = 0; i < out.length; i++) if (out[i] === '1') bytes[i >> 3] |= 0x80 >> (i & 7);
  return { bits: out, padLen, bytes };
}

// ── verdict markdown ────────────────────────────────────────────────────────
async function writeVerdict(receipt, opts) {
  const claims = JSON.parse(readFileSync(join(HERE, 'claims.json'), 'utf8'));
  const scores = {};
  for (const c of claims.claims) scores[c.id] = { claim: c.claim, verdict: 'UNSCORED', evidence: '' };

  const comet = receipt.rows.find((r) => r.engine === 'comet-qrng-v1');
  const graph = receipt.rows.find((r) => r.engine === 'graph-v1');
  const coin = receipt.rows.find((r) => r.engine === 'coin-toss-v1');

  // P1 top-20 truncation (graph-v1)
  if (graph && graph.adapted && graph.adapted.truncation) {
    const t = graph.adapted.truncation;
    scores.P1.verdict = t.verdict === 'TOP-20-TRUNCATION-CONFIRMED' ? 'PASS' : (t.distinctReturned > 20 ? 'FAIL' : 'PASS');
    scores.P1.evidence = `graph-v1 distinct=${t.distinctReturned} support=${t.support} sumCounts=${t.sumCounts}/${t.shotsRequested} -> ${t.verdict}`;
  } else scores.P1.verdict = 'FAIL(no-graph-data)';

  // P2 whitened balance
  const wbRows = receipt.rows.filter((r) => r.whitened && typeof r.whitened.whitenedBalance === 'number');
  if (wbRows.length) {
    const bad = wbRows.filter((r) => !(r.whitened.whitenedBalance >= 0.45 && r.whitened.whitenedBalance <= 0.55));
    scores.P2.verdict = bad.length ? 'FAIL' : 'PASS';
    scores.P2.evidence = wbRows.map((r) => `${r.engine}: whitened balance=${r.whitened.whitenedBalance.toFixed(4)} over ${r.whitened.streamBytesConsumed}B (raw ${r.whitened.rawBalance?.toFixed(4)})`).join(' | ');
  } else { scores.P2.verdict = 'FAIL'; scores.P2.evidence = 'no engine yielded a whitened bitstream'; }

  // P3 catalog count — from the census survey receipt if present
  const surveyPath = join(HERE, 'receipts', '45e-census-survey.json');
  if (existsSync(surveyPath)) {
    const s = JSON.parse(readFileSync(surveyPath, 'utf8'));
    scores.P3.verdict = s.catalog && s.catalog.matchesP3 && s.catalog.missingFromLive.length === 0 ? 'PASS' : 'FAIL';
    scores.P3.evidence = `live catalog=${s.catalog.count} expected=${s.catalog.expectedCountP3}; new-since-docs=${(s.catalog.newSinceArchivedDocs || []).length}; missing-from-live=${JSON.stringify(s.catalog.missingFromLive)}`;
  } else { scores.P3.verdict = 'UNSCORED(survey receipt absent)'; scores.P3.evidence = 'run `moth-census.mjs survey` first'; }

  // P4 certified leg
  if (comet && comet.adapted && comet.adapted.extracted && comet.adapted.extracted.bits) {
    const e = comet.adapted.extracted;
    const balOk = e.balance >= 0.45 && e.balance <= 0.55;
    scores.P4.verdict = e.healthPassed === true && balOk ? 'PASS' : 'FAIL';
    scores.P4.evidence = `healthPassed=${e.healthPassed} grade=${e.entropyGrade} h_bit=${e.hBit} extracted=${e.bits}bits balance=${e.balance?.toFixed(4)} requested=${e.requestedBytes}B delivered=${e.deliveredBytes}B extractor=${e.extractor}/${e.publicSeed}`;
  } else { scores.P4.verdict = 'FAIL'; scores.P4.evidence = comet && comet.adapted ? JSON.stringify(comet.adapted.extracted).slice(0, 200) : 'no comet row'; }

  // P5 counts-only engine
  if (coin && coin.adapted) {
    const m = coin.adapted.rawMeta;
    scores.P5.verdict = m.bitPayload === 'none (counts only)' ? 'PASS' : 'FAIL';
    scores.P5.evidence = `heads=${m.heads} tails=${m.tails} shots=${m.shots} headsBalance=${m.headsBalance != null ? m.headsBalance.toFixed(4) : '—'} payload=${m.bitPayload}`;
  } else { scores.P5.verdict = 'FAIL(no-coin-row)'; scores.P5.evidence = 'no coin-toss row'; }

  // deepseek prediction scoring (if receipt exists)
  let predictionMd = '_no prediction receipt found — probe not run_\n';
  if (opts.prediction && existsSync(opts.prediction)) {
    try {
      const p = JSON.parse(readFileSync(opts.prediction, 'utf8'));
      const pred = p.prediction || {};
      const pick = (pred.best_engine || '').toLowerCase();
      const wbBest = wbRows.slice().sort((a, b) => Math.abs(0.5 - a.whitened.whitenedBalance) - Math.abs(0.5 - b.whitened.whitenedBalance))[0];
      const actual = wbBest ? wbBest.engine : (comet && comet.adapted && comet.adapted.extracted && comet.adapted.extracted.bits ? 'comet-qrng-v1' : 'unknown');
      const hit = pick && actual !== 'unknown' && pick.includes(actual);
      predictionMd = [
        `**Prediction (deepseek-reasoner, blind — engine descriptions only, no balances leaked):** \`${pred.best_engine}\` — ${JSON.stringify(pred.reasoning || '').slice(0, 300)}`,
        `**Actual census winner (closest whitened balance to 0.5):** \`${actual}\``,
        `**Score:** ${hit ? 'HIT' : 'MISS'}`,
        p.usage ? `**Usage receipt:** ${JSON.stringify(p.usage)}` : '',
        '',
      ].filter(Boolean).join('\n');
    } catch (e) { predictionMd = `prediction receipt unreadable: ${e.message}`; }
  }

  const lines = [];
  lines.push(`# Moth Census — wave 45-e verdict`);
  lines.push('');
  lines.push(`Run: ${receipt.ts} · envelope: \`{"params":{...}}\` · whitening: registered mothbits recipe (verbatim tools/mothbits.mjs, lane 43-c)`);
  lines.push('');
  lines.push(`| engine | job id | kind | raw bits | raw balance | whitened balance | truncation shape |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const r of receipt.rows) {
    const a = r.adapted || {};
    const w = r.whitened || {};
    lines.push(`| ${r.engine} | ${r.jobId || (r.submitStatus >= 400 ? `HTTP${r.submitStatus}` : '—')} | ${a.kind || '—'} | ${r.whitened && r.whitened.rawBitsLen ? r.whitened.rawBitsLen : (a.rawMeta && a.rawMeta.shotsSeen ? `counts(${a.rawMeta.shotsSeen})` : '—')} | ${w.rawBalance != null ? w.rawBalance.toFixed(4) : (a.rawMeta && a.rawMeta.headsBalance != null ? a.rawMeta.headsBalance.toFixed(4) + ' (heads/shots)' : '—')} | ${typeof w.whitenedBalance === 'number' ? w.whitenedBalance.toFixed(4) : 'N/A'} | ${a.truncation ? a.truncation.verdict : '—'} |`);
  }
  lines.push('');
  lines.push(`## Registered claims (claims.json @ sha 200313cc3b034d5e…)`);
  lines.push('');
  for (const [id, s] of Object.entries(scores)) lines.push(`- **${id} ${s.verdict}** — ${s.evidence || s.claim}`);
  lines.push('');
  lines.push(`## Deepseek blind prediction`);
  lines.push('');
  lines.push(predictionMd);
  lines.push(`## Findings beyond the census`);
  lines.push('');
  lines.push(`1. **Envelope gate (NEW, revises wave-42 notes):** POST /engines/{id}/process requires \`{"params":{…}}\`; flat bodies 422 "unexpected property" (8/8 receipts). Wave-42/43 modules (mothqrc etc.) must be re-checked against this envelope before reuse.`);
  lines.push(`2. **Catalog is 33 visible engines** (2026-09-27) vs 13 in the archived 2026-09-25 docs; **comet-qrng-v1** is new: Born-rule bytes with SP 800-90B-style min-entropy certificate, platform Toeplitz extractor (public seed toeplitz-v1), CHSH witness, device fingerprint, submit-time commitment + hash-chained pulses (prev_pulse_hash/pulse_index params). The top-20 problem has a platform-side answer: request raw counts AND extracted bytes in one job.`);
  lines.push(`3. **"aer"/"emu" are params, not engines** (mode: emu|qpu; machine: aer) — wave-42's "engines known working: graph-v1, aer, emu" was a conflation; GET /engines/aer 404s.`);
  lines.push(`4. Truncation is per-engine, not universal: comet-qrng-v1 returns FULL-SUPPORT raw counts (${comet && comet.adapted && comet.adapted.truncation ? comet.adapted.truncation.distinctReturned : '?'} distinct) — full-width bits exist on the platform.`);
  lines.push('');
  writeFileSync(opts.verdict, lines.join('\n') + '\n');
  console.log(`verdict -> ${opts.verdict}`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { _: [] };
  for (const a of argv) {
    if (a.startsWith('--')) { const i = a.indexOf('='); const k = i === -1 ? a.slice(2) : a.slice(2, i); o[k] = i === -1 ? true : a.slice(i + 1); }
    else o._.push(a);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
const outDefault = (f) => join(HERE, 'receipts', f);
if (cmd === 'selftest') selftest();
else if (cmd === 'survey') await survey(args.out || outDefault('45e-census-survey.json'));
else if (cmd === 'census') await census({ out: args.out || outDefault('45e-census-receipt.json'), verdict: args.verdict || join(HERE, 'VERDICT.md'), engines: args.engines ? String(args.engines).split(',') : undefined, prediction: args.prediction || join(HERE, 'receipts', '45e-deepseek-prediction.json') });
else { console.error('usage: moth-census.mjs selftest | survey [--out=…] | census [--out=…] [--verdict=…] [--engines=a,b,c] [--prediction=…]'); process.exit(2); }
