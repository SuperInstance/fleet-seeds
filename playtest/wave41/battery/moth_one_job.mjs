// moth_one_job.mjs — lane 41-d MOTH recon: run ONE tiny real job through the
// DOCUMENTED in-repo client (pt-exoj/experiments/moth_bits.mjs, graph-v1,
// provenance quilt-dba E-D3 / quilt-murmur moth.mjs).
// KEY DOCTRINE: key is loaded at runtime by the foreign module; NEVER logged,
// printed, or written. Output receipts job_id, backend, latency, shape, and a
// sha256 of the canonical bits — no key material, no raw response dump.
import { createHash } from 'node:crypto';
import { loadKey, graphJob, MAX_JOBS, MAX_BITS } from '/home/z/my-project/download/pt-exoj/experiments/moth_bits.mjs';

const key = loadKey();
if (!key) { console.log(JSON.stringify({ verdict: 'NO_KEY', why: 'MOTH_KEY absent — fail-closed, zero jobs' })); process.exit(0); }
// print only non-sensitive key metadata
console.log(JSON.stringify({ keyLoaded: true, keyLen: key.length, keyPrefix: key.slice(0, 5) }));

const t0 = new Date().toISOString();
const job = await graphJob(key, { shots: 1024, seq: 0 });
const bitsHash = job.bits && job.bits.length
  ? createHash('sha256').update(job.bits).digest('hex')
  : null;
const receipt = {
  verdict: job.ok ? 'JOB_OK' : 'JOB_FAILED',
  budget: { maxJobs: MAX_JOBS, maxBits: MAX_BITS, jobsUsedThisLane: 1 },
  submitted_at: job.submitted_at, completed_at: job.completed_at,
  job_id: job.job_id, engine: job.engine, mode: job.mode, shots: job.shots,
  backend: job.backend, latency_ms: job.latency_ms,
  result_shape: job.result_shape, distinct_outcomes: job.distinct_outcomes,
  measurements_top: Array.isArray(job.measurements)
    ? job.measurements.slice(0, 3).map((m) => ({ bitstring: m.bitstring, count: m.count }))
    : null,
  bits_len: job.bits_len, ones: job.ones,
  balance: job.bits_len ? (job.ones / job.bits_len).toFixed(4) : null,
  bits_sha256: bitsHash,
  why: job.why,
  startedAt: t0, endedAt: new Date().toISOString(),
};
console.log(JSON.stringify(receipt, null, 2));
