#!/usr/bin/env node
// moth-seal.mjs — lane 46-b "certified sampling service" — registered random
// seeds with certification receipts, replacing raw-graph+whitening as the
// DEFAULT seed source for any lane's pre-registration.
//
// PROVENANCE (wave 45-e census, receipts in playtest/wave45/moth-census/):
//   comet-qrng-v1 is the platform's CERTIFIED randomness engine: Born-rule raw
//   counts + SP 800-90B-style min-entropy certificate (h_bit, budget_bits,
//   health gate), built-in Toeplitz extractor (public seed toeplitz-v1), CHSH
//   bell witness, device fingerprint, submit-time commitment + pulse
//   hash-chain. The extracted bytes are ALREADY conditioned by the platform —
//   moth-seal consumes them DIRECTLY (no re-whitening). Requested 512B
//   delivered ~73B: yield is min-entropy-limited by design (~584 bits/job).
//   graph-v1 is NOT a QRNG raw: top-20-truncated counts (45-e P1 CONFIRMED) —
//   it is only ever used here behind --fallback, with the registered 42-b
//   whitening recipe (tools/mothbits.mjs, lane 43-c, KAT byte-exact).
//
// ENVELOPE GATE (45-e): POST /api/v1/engines/{id}/process REQUIRES
// {"params":{…}} — flat bodies 422. Flow: submit -> poll /jobs/{id}/status ->
// GET /jobs/{id}/result. Auth: Authorization: Bearer $MOTH_KEY (runtime-only).
//
// STREAM POLICY (the certified-bit budget problem, receipted honestly):
//   one comet job delivers ~584 certified bits; a full Fisher-Yates over a
//   pool of size N consumes 16 bits per draw (>= 16*(N-1) bits, rejection
//   sampled, same draw discipline as mothbits STEP 4).
//   * --stream=direct (DEFAULT): draws come ONLY from the certified bytes;
//     exhaustion mid-shuffle -> FAIL-CLOSED exit (no extension, no invention).
//     Feasible pool bound: N <= ~37 at 584 delivered bits.
//   * --stream=prf: the certified bytes are the SEED of the registered
//     SHA-256 counter stream (mothbits STEP 3 semantics verbatim:
//     block_c = SHA256(u32be(c) || seed_bytes), consumed MSB-first). The
//     permutation's entropy is bounded by the certified budget — the receipt
//     carries effectiveEntropyBits = min(budget_bits, consumed) and the
//     extension is declared EXPLICITLY, never silently.
//
// FAIL-CLOSED EVERYWHERE: missing/invalid cert field -> exit 1; truncated /
// non-JSON response -> exit 1; job failed or poll timeout -> exit 1; certified
// bits exhausted (direct) -> exit 1; no seed reuse (same jobId or same
// certified-bytes sha256 across receipts is a collision -> the run-level guard
// assertDistinctSeals throws). No silent degradation: fallback happens ONLY
// behind the explicit --fallback flag and the receipt then says "FALLBACK".
//
// CLI:
//   node tools/moth-seal.mjs --n=16 --pool=1134 --label=<registration-name> \
//        [--stream=direct|prf] [--fallback] [--out=<path>] [--save-raw=<path>] [--quiet]
//   --n      take (how many indices the consumer registered)
//   --pool   pool size N (Fisher-Yates over [0,N))
//   --label  the consumer registration this seal is bound to (required)
// Exit codes: 0 sealed · 1 fail-closed (cert/transport/budget) · 2 usage.
// Keys: MOTH_KEY runtime-only (env or /home/z/my-project/.env); never printed,
// never written to any receipt. Zero npm dependencies; node:crypto only.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

import { fisherYatesSelect, whiteningReceipt, RECIPE as WHITENING_RECIPE } from './mothbits.mjs';

export const SEAL_VERSION = '1';
export const BASE_URL = 'https://api.mothquantum.com/api/v1';
export const ENGINE_CERTIFIED = 'comet-qrng-v1';
export const ENGINE_FALLBACK = 'graph-v1';
export const KAT_REFERENCE =
  'tools/fixtures/moth-42b-raw-bits-2caa822b-7c46-4f65-a0c9-152c46272e19.txt (42-b sealed KAT, byte-exact, lane 43-c)';
// Proven shapes (45-e hands-on2 + census receipts — both completed live):
export const COMET_PARAMS = { mode: 'emu', num_qubits: 12, shots: 4096, output_bytes: 512, include_raw_counts: true, bell_witness: true };
export const GRAPH_PARAMS = { mode: 'emu', num_qubits: 12, shots: 1024 };
export const RECEIPT_REQUIRED_KEYS = [
  'instrument', 'sealVersion', 'schema', 'ts', 'label', 'mode',
  'seedUseDeclaration', 'job', 'certifiedBits', 'cert', 'rawResultSha256', 'chosen', 'keysUsed', 'note',
];

const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class SealError extends Error {}   // any fail-closed condition (exit 1)
export class CertError extends SealError {} // certification payload missing/invalid

// ── streams ──────────────────────────────────────────────────────────────────
// 16-bit draws, MSB-first — same consumption discipline as mothbits STEP 3/4.

export function certifiedStream(bytesBuf) {
  const totalBits = bytesBuf.length * 8;
  let bytePos = 0, bitPos = 0, consumed = 0;
  return {
    kind: 'certified-direct',
    totalBits,
    consumedBits: () => consumed,
    next16() {
      if (consumed + 16 > totalBits) {
        throw new SealError(
          `moth-seal: FAIL-CLOSED — certified bits exhausted mid-shuffle (consumed ${consumed}/${totalBits}); ` +
          `no PRF extension without --stream=prf (receipted) and no smaller pool was chosen`
        );
      }
      let v = 0;
      for (let k = 0; k < 16; k++) {
        const bit = (bytesBuf[bytePos] >> (7 - bitPos)) & 1;
        v = v * 2 + bit;
        if (++bitPos === 8) { bitPos = 0; bytePos++; }
      }
      consumed += 16;
      return v;
    },
  };
}

// Registered mothbits STEP 3 semantics verbatim, seeded by the CERTIFIED bytes.
export function prfExtendedStream(seedBytes) {
  const blocks = [];
  const block = (c) => {
    if (!blocks[c]) {
      const head = Buffer.alloc(4);
      head.writeUInt32BE(c, 0);
      blocks[c] = createHash('sha256').update(Buffer.concat([head, seedBytes])).digest();
    }
    return blocks[c];
  };
  let bytePos = 0, bitPos = 0, consumed = 0;
  return {
    kind: 'prf-extension(mothbits-STEP3)',
    block,
    consumedBits: () => consumed,
    next16() {
      let v = 0;
      for (let k = 0; k < 16; k++) {
        const b = block(bytePos >> 5); // 32 bytes = 256 bits per block
        const bit = (b[bytePos & 31] >> (7 - bitPos)) & 1;
        v = v * 2 + bit;
        if (++bitPos === 8) { bitPos = 0; bytePos++; }
      }
      consumed += 16;
      return v;
    },
  };
}

// ── certification verification (fail-closed) ────────────────────────────────
// Required: min-entropy certificate (entropy_report health/h_bit/budget),
// platform Toeplitz extractor receipt, device fingerprint, submit-time
// commitment, pulse hash-chain receipt, and the extracted bytes themselves.

export function verifyCertFields(output) {
  const missing = [];
  const er = output && output.entropy_report;
  if (!er || typeof er !== 'object') missing.push('entropy_report');
  else {
    if (er.health_passed !== true) missing.push('entropy_report.health_passed===true');
    if (typeof er.h_bit !== 'number' || !(er.h_bit > 0)) missing.push('entropy_report.h_bit>0');
    if (typeof er.budget_bits !== 'number' || !(er.budget_bits > 0)) missing.push('entropy_report.budget_bits>0');
  }
  if (!output || !output.extractor || output.extractor.kind !== 'toeplitz') missing.push('extractor.kind===toeplitz');
  const df = output && output.device_fingerprint;
  if (!df || typeof df !== 'object' || !Array.isArray(df.p1) || df.p1.length === 0) missing.push('device_fingerprint{p1}');
  const cm = output && output.commitment;
  if (!cm || !/^[0-9a-f]{64}$/.test(String(cm.commit || '')) || !Array.isArray(cm.binds) || cm.binds.length === 0) {
    missing.push('commitment{commit:64hex,binds}');
  }
  const pu = output && output.pulse;
  if (!pu || !/^[0-9a-f]{64}$/.test(String(pu.pulse_hash || ''))) missing.push('pulse.pulse_hash:64hex');
  const rnd = output && output.random;
  if (!rnd || typeof rnd.hex !== 'string' || rnd.hex.length < 2 || rnd.hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(rnd.hex)) {
    missing.push('random.hex(even-length hex, non-empty)');
  } else if (!(Number(rnd.bits) > 0)) missing.push('random.bits>0');
  if (missing.length) {
    throw new CertError(`moth-seal: FAIL-CLOSED — certification payload incomplete/invalid: ${missing.join('; ')}`);
  }
  return true;
}

export function extractOutput(result) {
  const r = result && typeof result === 'object' ? result : {};
  const inner = r.result && typeof r.result === 'object' ? r.result : {};
  const out = inner.output && typeof inner.output === 'object' ? inner.output : r.output && typeof r.output === 'object' ? r.output : null;
  if (!out) throw new CertError('moth-seal: FAIL-CLOSED — no output object in job result (truncated response?)');
  return out;
}

// ── transport (fetchImpl injectable for offline tests) ──────────────────────

export async function apiCall(impl, method, url, key, body) {
  const headers = { authorization: `Bearer ${key}`, 'user-agent': 'fleet-seeds-moth-seal/1.0 (lane 46-b)' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await impl(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000) });
  return { status: res.status, text: await res.text() };
}

export async function runEngineJob({ engine, params, key, baseUrl = BASE_URL, fetchImpl = fetch, pollIntervalMs = 1500, maxPolls = 80, log = () => {} }) {
  log(`POST /engines/${engine}/process {"params":${JSON.stringify(params)}}`);
  const sub = await apiCall(fetchImpl, 'POST', `${baseUrl}/engines/${engine}/process`, key, { params });
  if (sub.status >= 400) throw new SealError(`moth-seal: FAIL-CLOSED — ${engine} submit HTTP ${sub.status}: ${sub.text.slice(0, 300)}`);
  let parsed;
  try { parsed = JSON.parse(sub.text); } catch { throw new SealError('moth-seal: FAIL-CLOSED — submit response not JSON (truncated?)'); }
  const jobId = parsed && parsed.job_id;
  if (!jobId) throw new SealError('moth-seal: FAIL-CLOSED — no job_id in submit response');
  let status = '', polls = 0;
  while (polls < maxPolls) {
    await sleep(pollIntervalMs); polls++;
    const st = await apiCall(fetchImpl, 'GET', `${baseUrl}/jobs/${jobId}/status`, key);
    try { status = JSON.parse(st.text).status; } catch { status = `HTTP${st.status}`; }
    if (['completed', 'failed', 'error', 'cancelled'].includes(status)) break;
  }
  if (status !== 'completed') throw new SealError(`moth-seal: FAIL-CLOSED — job ${jobId} final status '${status}' after ${polls} polls`);
  const r = await apiCall(fetchImpl, 'GET', `${baseUrl}/jobs/${jobId}/result`, key);
  if (r.status >= 400) throw new SealError(`moth-seal: FAIL-CLOSED — result HTTP ${r.status} for job ${jobId}`);
  let result;
  try { result = JSON.parse(r.text); } catch { throw new SealError('moth-seal: FAIL-CLOSED — result not JSON (truncated response)'); }
  log(`job ${jobId} completed after ${polls} poll(s)`);
  return { engine, jobId, status, polls, result, resultText: r.text };
}

// ── receipt schema (our own construction bug guard) ─────────────────────────

export function verifyReceiptSchema(receipt) {
  const missing = RECEIPT_REQUIRED_KEYS.filter((k) => !(k in receipt));
  if (missing.length) throw new SealError(`moth-seal: internal receipt schema violation — missing ${missing.join(', ')}`);
  if (receipt.mode === 'FALLBACK' && !(receipt.fallback && receipt.fallback.whitening && receipt.fallback.katReference)) {
    throw new SealError('moth-seal: internal receipt schema violation — FALLBACK receipt lacks whitening/KAT reference');
  }
  if (receipt.mode === 'certified' && !(receipt.cert && receipt.cert.entropyReport && receipt.cert.commitment && receipt.cert.deviceFingerprint && receipt.cert.pulse)) {
    throw new SealError('moth-seal: internal receipt schema violation — certified receipt lacks verbatim cert fields');
  }
  const c = receipt.chosen;
  if (!c || !Number.isInteger(c.poolSize) || !Number.isInteger(c.take) || !Array.isArray(c.selected) || c.selected.length !== c.take) {
    throw new SealError('moth-seal: internal receipt schema violation — chosen{poolSize,take,selected[]} malformed');
  }
  const inRange = c.selected.every((x) => Number.isInteger(x) && x >= 0 && x < c.poolSize);
  if (!inRange || new Set(c.selected).size !== c.selected.length) {
    throw new SealError('moth-seal: internal receipt schema violation — selected indices out of [0,pool) or not distinct');
  }
  if (!receipt.seedUseDeclaration || receipt.seedUseDeclaration.singleUse !== true) {
    throw new SealError('moth-seal: internal receipt schema violation — seed-use declaration missing/singleUse!=true');
  }
  return true;
}

// Run-level no-seed-reuse guard: across seals, jobIds AND certified byte
// streams must all be distinct (same job replayed or same bytes re-delivered
// would be silent seed reuse -> fail-closed).
export function assertDistinctSeals(receipts) {
  const jobIds = new Set(), hexes = new Set();
  for (const r of receipts) {
    const j = r.job && r.job.jobId;
    const h = r.certifiedBits && r.certifiedBits.hexSha256;
    if (!j || !h) throw new SealError('moth-seal: assertDistinctSeals — receipt lacks jobId/certifiedBits.hexSha256');
    if (jobIds.has(j)) throw new SealError(`moth-seal: FAIL-CLOSED — seed reuse: jobId ${j} appears twice`);
    if (hexes.has(h)) throw new SealError(`moth-seal: FAIL-CLOSED — seed reuse: identical certified-bytes sha256 across jobIds (${j})`);
    jobIds.add(j); hexes.add(h);
  }
  return { sealsChecked: receipts.length, jobIdsDistinct: jobIds.size, byteStreamsDistinct: hexes.size };
}

// ── the seal ─────────────────────────────────────────────────────────────────

export async function seal(opts) {
  const {
    poolSize, take, label,
    mode = 'certified',                 // 'certified' | 'fallback'
    stream = 'direct',                  // 'direct' | 'prf' (certified mode only)
    key, baseUrl = BASE_URL, fetchImpl = fetch, log = () => {},
    pollIntervalMs = 1500, maxPolls = 80,
    cometParams = COMET_PARAMS, fallbackParams = GRAPH_PARAMS,
    note = '',
  } = opts;

  if (!Number.isInteger(poolSize) || poolSize < 2) throw new SealError('moth-seal: --pool must be an integer >= 2');
  if (!Number.isInteger(take) || take < 1 || take > poolSize) throw new SealError('moth-seal: --n (take) must be an integer, 1 <= take <= pool');
  if (!label || typeof label !== 'string') throw new SealError('moth-seal: --label is required (the consumer registration this seal binds to)');
  if (!key) throw new SealError('moth-seal: FAIL-CLOSED — no MOTH_KEY (env/.env); refusing to run keyless');
  if (mode !== 'certified' && mode !== 'fallback') throw new SealError('moth-seal: mode must be certified|fallback');
  if (mode === 'fallback' && stream !== 'direct') throw new SealError('moth-seal: fallback mode always uses the registered whitening stream (drop --stream)');

  const ts = new Date().toISOString();
  const seedUseDeclaration = {
    consumer: label,
    poolSize, take,
    stream: mode === 'fallback' ? 'whitening(mothbits-registered-recipe)' : stream,
    declaredAt: ts,
    singleUse: true,
    binding:
      'this seal binds seed material (jobId + seed-material sha256) to the ONE draw described by chosen{} for the consumer above; ' +
      're-deriving another permutation from the same material is a protocol violation, detectable by comparing receipts ' +
      '(same jobId or same seed-material sha256 twice = reuse)',
  };

  if (mode === 'certified') {
    const job = await runEngineJob({ engine: ENGINE_CERTIFIED, params: cometParams, key, baseUrl, fetchImpl, log, pollIntervalMs, maxPolls });
    const output = extractOutput(job.result);
    verifyCertFields(output); // CertError -> fail-closed, bits never used
    const hex = String(output.random.hex).replace(/^0x/, '');
    const bytes = Buffer.from(hex, 'hex');
    let ones = 0;
    for (const b of bytes) { let x = b; while (x) { ones += x & 1; x >>= 1; } }
    const balance = ones / (bytes.length * 8);
    const requiredBits = 16 * (poolSize - 1);
    if (stream === 'direct' && bytes.length * 8 < requiredBits) {
      throw new SealError(
        `moth-seal: FAIL-CLOSED — pool ${poolSize} needs >= ${requiredBits} bits, job delivered ${bytes.length * 8} ` +
        `(min-entropy-limited yield). Use --stream=prf (receipted extension) or a smaller pool.`
      );
    }
    const streamObj = stream === 'prf' ? prfExtendedStream(bytes) : certifiedStream(bytes);
    const fy = fisherYatesSelect(poolSize, streamObj, take);
    const consumed = streamObj.consumedBits();
    const budgetBits = Number(output.entropy_report.budget_bits);
    const receipt = {
      instrument: 'fleet-seeds/tools/moth-seal.mjs',
      sealVersion: SEAL_VERSION,
      schema: 'moth-seal/receipt-v1',
      ts, label,
      mode: 'certified',
      seedUseDeclaration,
      job: { engine: ENGINE_CERTIFIED, jobId: job.jobId, finalStatus: job.status, polls: job.polls, params: cometParams },
      certifiedBits: {
        requestedBytes: output.random.requested_bytes,
        deliveredBytes: Number(output.random.bytes) || bytes.length,
        bits: bytes.length * 8,
        hexSha256: sha256Hex(bytes),
        balance: Number(balance.toFixed(6)),
        declaredBits: Number(output.random.bits),
        hBit: output.entropy_report.h_bit,
        grade: output.entropy_report.grade,
        healthPassed: output.entropy_report.health_passed,
        budgetBits,
        effectiveEntropyBits: Number(Math.min(budgetBits, consumed).toFixed(2)),
        stream: streamObj.kind,
        consumedBits: consumed,
        requiredBits,
        extractor: { kind: output.extractor.kind, publicSeed: output.extractor.public_seed, inputBits: output.extractor.input_bits, outputBits: output.extractor.output_bits, epsilonLog2: output.extractor.epsilon_log2 },
      },
      cert: {
        entropyReport: output.entropy_report,
        extractor: output.extractor,
        deviceFingerprint: output.device_fingerprint,
        commitment: output.commitment,
        pulse: output.pulse,
        ...(output.bell_witness ? { bellWitness: output.bell_witness } : {}),
      },
      rawResultSha256: sha256Hex(Buffer.from(job.resultText, 'utf8')),
      chosen: { poolSize, take, selected: fy.selected, draws: fy.draws, rejects: fy.rejects, shuffleOrderHead: fy.order.slice(0, Math.max(take, 8)) },
      keysUsed: 'MOTH_KEY runtime-only (never printed, never receipted)',
      note,
    };
    verifyReceiptSchema(receipt);
    return { receipt, rawResult: job.result };
  }

  // FALLBACK — graph-v1 (top-20-truncated, NOT a QRNG raw) + registered
  // whitening recipe (mothbits verbatim). The receipt says FALLBACK, always.
  const job = await runEngineJob({ engine: ENGINE_FALLBACK, params: fallbackParams, key, baseUrl, fetchImpl, log, pollIntervalMs, maxPolls });
  const output = extractOutput(job.result);
  const meas = output && Array.isArray(output.measurements) ? output.measurements : null;
  if (!meas || meas.length === 0) throw new CertError('moth-seal: FAIL-CLOSED — fallback graph-v1 result has no measurements array');
  // canonical expansion: sorted bitstrings repeated by count (45-e convention)
  const entries = meas
    .map((m) => ({ bs: String(m.bitstring || '').replace(/[^01]/g, ''), n: Math.max(0, Number(m.count) || 0) }))
    .filter((m) => m.bs.length > 0)
    .sort((a, b) => (a.bs < b.bs ? -1 : a.bs > b.bs ? 1 : 0));
  let rawBits = '';
  for (const { bs, n } of entries) for (let r = 0; r < n; r++) rawBits += bs;
  const rawSha = sha256Hex(Buffer.from(rawBits, 'utf8'));
  const wr = whiteningReceipt(rawBits, { poolSize, take });
  const receipt = {
    instrument: 'fleet-seeds/tools/moth-seal.mjs',
    sealVersion: SEAL_VERSION,
    schema: 'moth-seal/receipt-v1',
    ts, label,
    mode: 'FALLBACK',
    seedUseDeclaration: { ...seedUseDeclaration, note: 'FALLBACK PATH — source is graph-v1 (top-20-truncated, NOT a certified QRNG raw) + registered whitening; not certified randomness' },
    job: { engine: ENGINE_FALLBACK, jobId: job.jobId, finalStatus: job.status, polls: job.polls, params: fallbackParams },
    certifiedBits: null,
    cert: null,
    fallback: {
      reason: 'explicit --fallback flag (comet unavailable or operator-degraded mode)',
      engine: ENGINE_FALLBACK,
      sourceVerdict: `graph-v1 top-20 truncation confirmed in wave-45 census (P1); distinct=${entries.length}, shotsSeen=${entries.reduce((a, { n }) => a + n, 0)}/${fallbackParams.shots}`,
      rawBits: { len: rawBits.length, sha256: rawSha, distinct: entries.length, outcomeWidth: entries.length ? entries[0].bs.length : 0 },
      whitening: wr,
      katReference: KAT_REFERENCE,
    },
    rawResultSha256: sha256Hex(Buffer.from(job.resultText, 'utf8')),
    chosen: { poolSize, take, selected: wr.step4_fisherYates.selected, draws: wr.step4_fisherYates.draws, rejects: wr.step4_fisherYates.rejects, shuffleOrderHead: null },
    keysUsed: 'MOTH_KEY runtime-only (never printed, never receipted)',
    note,
  };
  verifyReceiptSchema(receipt);
  return { receipt, rawResult: job.result };
}

// ── redaction for raw-result side files ──────────────────────────────────────

export function redact(v, k) {
  if (typeof v === 'string') {
    if (/X-Amz-Signature|Signature=/.test(v)) return '<presigned-url-redacted>';
    if (/url|token|signature|secret/i.test(k || '')) return /https?:\/\//.test(v) ? '<url-redacted>' : v.length > 96 ? '<redacted>' : v;
    return v.length > 8000 ? v.slice(0, 8000) + '…<truncated>' : v;
  }
  if (Array.isArray(v)) return v.map((x) => redact(x));
  if (v && typeof v === 'object') { const o = {}; for (const [kk, vv] of Object.entries(v)) o[kk] = redact(vv, kk); return o; }
  return v;
}

// ── key loading (runtime-only) ───────────────────────────────────────────────

export function loadMothKey() {
  if (process.env.MOTH_KEY) return process.env.MOTH_KEY.trim();
  const envPath = process.env.MOTH_ENV || '/home/z/my-project/.env';
  try {
    const m = readFileSync(envPath, 'utf8').match(/^MOTH_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* fallthrough */ }
  return null;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const o = { n: null, pool: null, label: null, stream: 'direct', fallback: false, out: null, saveRaw: null, quiet: false };
  for (const a of argv) {
    if (a === '--fallback') o.fallback = true;
    else if (a === '--quiet') o.quiet = true;
    else if (a.startsWith('--n=')) o.n = Number(a.slice(4));
    else if (a.startsWith('--pool=')) o.pool = Number(a.slice(7));
    else if (a.startsWith('--label=')) o.label = a.slice(8);
    else if (a.startsWith('--stream=')) o.stream = a.slice(9);
    else if (a.startsWith('--out=')) o.out = a.slice(6);
    else if (a.startsWith('--save-raw=')) o.saveRaw = a.slice(11);
    else throw new SealError(`unknown argument '${a}'`);
  }
  if (!Number.isInteger(o.n) || !Number.isInteger(o.pool)) throw new SealError('--n and --pool are required integers');
  if (!o.label) throw new SealError('--label is required');
  if (o.stream !== 'direct' && o.stream !== 'prf') throw new SealError('--stream must be direct|prf');
  return o;
}

if (process.argv[1] && process.argv[1].endsWith('moth-seal.mjs')) {
  const main = async () => {
    let o;
    try { o = parseArgs(process.argv.slice(2)); } catch (e) {
      console.error(`moth-seal: ${e.message}`);
      console.error('usage: node tools/moth-seal.mjs --n=16 --pool=1134 --label=<registration-name> [--stream=direct|prf] [--fallback] [--out=path] [--save-raw=path] [--quiet]');
      process.exit(2);
    }
    try {
      const key = loadMothKey();
      const { receipt, rawResult } = await seal({
        poolSize: o.pool, take: o.n, label: o.label,
        mode: o.fallback ? 'fallback' : 'certified', stream: o.stream,
        key, log: o.quiet ? () => {} : (m) => console.error(`[moth-seal] ${m}`),
      });
      if (o.saveRaw) {
        writeFileSync(o.saveRaw, JSON.stringify({ jobId: receipt.job.jobId, engine: receipt.job.engine, rawResult: redact(rawResult) }, null, 2) + '\n');
        if (!o.quiet) console.error(`[moth-seal] raw result (redacted) -> ${o.saveRaw}`);
      }
      const out = JSON.stringify(receipt, null, 2) + '\n';
      if (o.out) { writeFileSync(o.out, out); if (!o.quiet) console.error(`[moth-seal] receipt -> ${o.out}`); }
      else process.stdout.write(out);
      const sel = receipt.chosen.selected.join(',');
      console.error(`[moth-seal] SEALED mode=${receipt.mode} label=${receipt.label} pool=${o.pool} take=${o.n} selected=[${sel}]`);
      process.exit(0);
    } catch (e) {
      console.error(`moth-seal: ${e.message}`);
      process.exit(1);
    }
  };
  main();
}
