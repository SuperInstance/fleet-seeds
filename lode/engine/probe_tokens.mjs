// lode/engine/probe_tokens.mjs — wave-60 lane: live probe of the two freshly
// rolled keys (mothquantum moth_…, typesafe.ai apikey_2217…), receipts committed.
//
// Probe = a REAL use, not a ping: (1) typesafe gets a 1-question noul battery
// about the RSI frontier (the answer is filed with the lode scout corpus —
// nothing wasted); (2) mothquantum gets a certified comet-qrng-v1 seal via the
// PROVEN fleet instrument tools/moth-seal.mjs (n=1, pool=9 — one index drawn
// for the candidate-review order; the seal receipt doubles as the QRNG witness
// shape). Any failure is recorded as an honest FAIL receipt; exit 0 either way
// (a probe's job is to observe, not to gate).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'receipts', '2026-09-29-token-probe');
mkdirSync(OUT, { recursive: true });

function writeReceipt(name, obj) {
  writeFileSync(join(OUT, name), JSON.stringify(obj, null, 1) + '\n');
  console.log(`receipt: ${name}`);
}

// ---------- probe 1: typesafe.ai systemone ----------
const t = { kind: 'typesafe-probe', ts_utc: new Date().toISOString(), ok: false };
try {
  const { systemone } = await import('./systemone_client.mjs');
  const r = await systemone({
    state: { battery: 'lode-w56-token-probe', topic: 'RSI frontier — one-line sanity state; full scout corpus follows in the engine run' },
    questions: {
      p_weco_l1_stable: {
        type: 'noul',
        instructions: 'p = probability that weco AIDE-squared\'s claimed L1 (net-positive recursive self-improvement) survives independent replication within 6 months, given the simple-baselines counter-paper pressure.'
      }
    },
  });
  t.ok = true;
  t.model = r.model;
  t.usage = r.usage;
  t.latency_ms = r.latency_ms;
  t.answers = r.answers;
  writeReceipt('typesafe-probe.json', t);
  appendFileSync(join(OUT, 'usage.jsonl'), JSON.stringify({
    kind: 'usage-receipt', at_utc: new Date().toISOString(), service: 'typesafe.ai/v1/systemone',
    model: r.model, usage: r.usage, latency_ms: r.latency_ms, purpose: 'lode-w56-token-probe',
  }) + '\n');
} catch (e) {
  t.ok = false;
  t.error = String(e.message || e).replace(/apikey_[A-Za-z0-9_]+/g, 'REDACTED').slice(0, 400);
  t.http = e.http ?? null;
  writeReceipt('typesafe-probe.json', t);
}

// ---------- probe 2: mothquantum comet-qrng-v1 via the fleet instrument ----------
const m = { kind: 'mothquantum-probe', ts_utc: new Date().toISOString(), ok: false };
try {
  const key = process.env.MOTHQUANTUM_TOKEN || process.env.MOTH_KEY;
  if (!key) throw new Error('no mothquantum token in env (fail-closed)');
  const sealPath = join(OUT, 'moth-seal-probe.json');
  execFileSync('node', [
    join(HERE, '..', '..', 'tools', 'moth-seal.mjs'),
    '--n=1', '--pool=9', '--label=lode-w56-token-probe',
    `--out=${sealPath}`, '--quiet',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOTH_KEY: key },
    timeout: 120000,
  });
  if (!existsSync(sealPath)) throw new Error('moth-seal ran but wrote no receipt');
  const seal = JSON.parse(readFileSync(sealPath, 'utf8'));
  m.ok = true;
  m.job_id = seal.job?.job_id ?? seal.job?.id ?? null;
  m.certified_bits = seal.certifiedBits ?? null;
  m.cert_min_entropy = seal.cert?.h_bit ?? seal.cert?.min_entropy ?? null;
  m.raw_result_sha256 = seal.rawResultSha256 ?? createHash('sha256').update(JSON.stringify(seal)).digest('hex');
  m.chosen = seal.chosen ?? null;
  m.note = 'full certified receipt at engine/receipts/2026-09-29-token-probe/moth-seal-probe.json';
  console.log(`moth seal OK job=${m.job_id} bits=${m.certified_bits} chosen=${JSON.stringify(m.chosen)}`);
  writeReceipt('moth-seal-probe-meta.json', m);
} catch (e) {
  m.ok = false;
  m.error = String(e.message || e).replace(/moth_[A-Za-z0-9]+/g, 'REDACTED').slice(0, 400);
  writeReceipt('moth-seal-probe-meta.json', m);
}
writeReceipt('probe-summary.json', { typesafe: t.ok, mothquantum: m.ok, ts_utc: m.ts_utc });
console.log(`PROBE SUMMARY: typesafe=${t.ok ? 'LIVE' : 'FAIL'} mothquantum=${m.ok ? 'LIVE' : 'FAIL'}`);
