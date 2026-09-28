#!/usr/bin/env node
// 46b-run.mjs — lane 46-b — registered run driver for the moth-seal service.
//
// PRE-RUN GATE (fail-closed): recompute sha256 of tools/wave46/46b-claims.json
// and require it to equal the value sealed in receipts/46b-claims-registration.json
// (registered BEFORE any job was spent, push ffe3412). Any mismatch aborts the
// run with zero jobs spent.
//
// JOB BUDGET (registered cap 10): 6x comet-qrng-v1 + 1x graph-v1 = 7 total.
//   K1..K5  comet  n=16 pool=1134 stream=prf   -> P1 balance, P2 cert fields, P4 collisions
//   FB      graph  n=16 pool=1134 (--fallback)  -> P3 fallback labeling (live degraded path)
//   DEMO    comet  n=4  pool=10  stream=direct  -> first consumer: 4-of-10 near-arc spot-audit set
//
// Every seal's receipt is written verbatim to receipts/; the full (redacted)
// raw API result is written beside it for audit. Exit 0 iff every registered
// check passes; honest FAILs are receipted either way. Keys runtime-only.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { seal, assertDistinctSeals, verifyReceiptSchema, loadMothKey, redact } from '../moth-seal.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RE = join(HERE, 'receipts');
const sha256File = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── pre-run gate ─────────────────────────────────────────────────────────────
const claimsSha = sha256File(join(HERE, '46b-claims.json'));
const reg = JSON.parse(readFileSync(join(RE, '46b-claims-registration.json'), 'utf8'));
if (reg.sha256 !== claimsSha) {
  console.error(`46b-run: ABORT — claims.json sha256 ${claimsSha.slice(0, 16)}… != sealed ${reg.sha256.slice(0, 16)}… (post-registration edit suspected); zero jobs spent`);
  process.exit(1);
}
console.error(`46b-run: claims gate OK (sha ${claimsSha.slice(0, 16)}…, sealed ${reg.sealedAt})`);

const key = loadMothKey();
if (!key) { console.error('46b-run: ABORT — no MOTH_KEY'); process.exit(1); }

const log = (m) => console.error(`  ${m}`);
const jobsUsed = { n: 0, cap: 10, rows: [] };
const receipts = {};

async function spend(jobName, opts) {
  if (jobsUsed.n >= jobsUsed.cap) throw new Error(`job cap ${jobsUsed.cap} reached — refusing to spend`);
  jobsUsed.n++;
  console.error(`[job ${jobsUsed.n}/${jobsUsed.cap}] ${jobName}`);
  const t0 = Date.now();
  const { receipt, rawResult } = await seal({ ...opts, key, log });
  const ms = Date.now() - t0;
  verifyReceiptSchema(receipt);
  writeFileSync(join(RE, `46b-seal-${jobName}.json`), JSON.stringify(receipt, null, 2) + '\n');
  writeFileSync(join(RE, `46b-raw-${jobName}.json`), JSON.stringify({ jobId: receipt.job.jobId, engine: receipt.job.engine, mode: receipt.mode, rawResult: redact(rawResult) }, null, 2) + '\n');
  receipts[jobName] = receipt;
  jobsUsed.rows.push({ jobName, engine: receipt.job.engine, mode: receipt.mode, jobId: receipt.job.jobId, polls: receipt.job.polls, ms, selected: receipt.chosen.selected });
  console.error(`  -> ${receipt.mode} jobId=${receipt.job.jobId} selected=[${receipt.chosen.selected.join(',')}] (${ms}ms)`);
  await sleep(550);
  return receipt;
}

const balanceOf = (hex) => {
  let ones = 0, bytes = Buffer.from(hex, 'hex');
  for (const b of bytes) { let x = b; while (x) { ones += x & 1; x >>= 1; } }
  return { ones, bits: bytes.length * 8, balance: ones / (bytes.length * 8) };
};

// ═══ K1..K5 — certified seals, same N (n=16, pool=1134, prf) ═══
const K = [];
for (const k of ['k1', 'k2', 'k3', 'k4', 'k5']) {
  K.push(await spend(k, { poolSize: 1134, take: 16, label: `46b-seal-${k}`, mode: 'certified', stream: 'prf' }));
}

// ═══ FB — live fallback exercise ═══
const FB = await spend('fallback', { poolSize: 1134, take: 16, label: '46b-fallback-live', mode: 'fallback' });

// ═══ DEMO — first consumer: 4 of 10 near-arc objectives ═══
const DEMO = await spend('demo', { poolSize: 10, take: 4, label: 'wave46-near-arc-spot-audit', mode: 'certified', stream: 'direct' });

// ═══ registered checks ═══
// balances recomputed from the raw side-files (the receipts carry hexSha256 only)
const rawHex = {};
for (const k of ['k1', 'k2', 'k3', 'k4', 'k5', 'demo']) {
  const raw = JSON.parse(readFileSync(join(RE, `46b-raw-${k}.json`), 'utf8'));
  rawHex[k] = String(raw.rawResult.result.output.random.hex).replace(/^0x/, '');
}
const balances = Object.fromEntries(Object.entries(rawHex).map(([k, hex]) => [k, balanceOf(hex)]));
const pooledOnes = Object.values(balances).reduce((a, b) => a + b.ones, 0);
const pooledBits = Object.values(balances).reduce((a, b) => a + b.bits, 0);
const pooledBalance = pooledOnes / pooledBits;
const perSealBalances = ['k1', 'k2', 'k3', 'k4', 'k5'].map((k) => balances[k].balance);
const inBand = (x) => x >= 0.45 && x <= 0.55;

// P4: collisions
let distinct = { sealsok: false };
try { distinct = assertDistinctSeals([...K, DEMO]); } catch (e) { distinct = { sealsok: false, error: e.message }; }
const selKeys = K.map((r) => r.chosen.selected.join(','));
const permPairs = [];
for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) permPairs.push({ pair: `${i + 1}-${j + 1}`, identical: selKeys[i] === selKeys[j] });

// P3: fallback labeling
const fbOk = FB.mode === 'FALLBACK' && FB.cert === null && FB.certifiedBits === null && !!FB.fallback.katReference && /FALLBACK PATH/.test(FB.seedUseDeclaration.note);

// P5: demo consumer contract
const demoOk = DEMO.chosen.selected.length === 4 && new Set(DEMO.chosen.selected).size === 4 && DEMO.chosen.selected.every((x) => x >= 0 && x < 10) && DEMO.mode === 'certified';

// deepseek blind-prediction scoring (prediction receipt predates all jobs)
let dsScore = null;
try {
  const ds = JSON.parse(readFileSync(join(RE, '46b-deepseek-prediction.json'), 'utf8'));
  const p = ds.prediction;
  const oPooled = inBand(pooledBalance) ? 1 : 0;
  const oAll5 = perSealBalances.every(inBand) ? 1 : 0;
  const meanBal = perSealBalances.reduce((a, b) => a + b, 0) / 5;
  dsScore = {
    predictionTs: ds.ts, servedModel: ds.servedModel, usage: ds.usage,
    predicted: { mean_balance_point: p.mean_balance_point, p_pooled_in_band: p.p_pooled_in_band, p_all5_in_band: p.p_all5_in_band, confidence: p.confidence },
    actual: { meanBalance: Number(meanBal.toFixed(4)), pooledInBand: !!oPooled, all5InBand: !!oAll5 },
    brier_pooled: Number((Math.pow(p.p_pooled_in_band - oPooled, 2)).toFixed(6)),
    brier_all5: Number((Math.pow(p.p_all5_in_band - oAll5, 2)).toFixed(6)),
    absError_point: Number(Math.abs(p.mean_balance_point - meanBal).toFixed(4)),
  };
} catch (e) { dsScore = { error: `scoring failed: ${e.message}` }; }

const assessment = {
  instrument: 'fleet-seeds/tools/moth-seal.mjs',
  runId: '46b-registered-run',
  ts: new Date().toISOString(),
  claimsGate: { claimsSha256: claimsSha, sealedSha256: reg.sha256, match: true, sealedAt: reg.sealedAt },
  jobsUsed: jobsUsed.n, jobCap: jobsUsed.cap, jobRows: jobsUsed.rows,
  P1: {
    perSealBalances: Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5'].map((k) => [k, Number(balances[k].balance.toFixed(4))])),
    pooledBalance: Number(pooledBalance.toFixed(4)), pooledBits, pooledOnes,
    band: '[0.45,0.55]',
    perSealAllInBand: perSealBalances.every(inBand),
    pooledInBand: inBand(pooledBalance),
    verdict: inBand(pooledBalance) ? (perSealBalances.every(inBand) ? 'PASS' : 'PARTIAL (pooled in band, >=1 per-seal outside)') : 'FAIL',
  },
  P2: {
    seals: [...K, DEMO].map((r) => ({ label: r.label, jobId: r.job.jobId, healthPassed: r.certifiedBits.healthPassed, hBit: r.certifiedBits.hBit, extractor: r.certifiedBits.extractor.kind, commitmentBinds: r.cert.commitment.binds.length, pulseHashLen: String(r.cert.pulse.pulse_hash).length, deviceFpP1: r.cert.deviceFingerprint.p1.length })),
    certErrorTripped: false,
    verdict: [...K, DEMO].every((r) => r.certifiedBits.healthPassed === true && r.certifiedBits.extractor.kind === 'toeplitz' && String(r.cert.pulse.pulse_hash).length === 64) ? 'PASS (all 6 comet seals carried full certification payloads; zero CertError trips)' : 'FAIL',
  },
  P3: {
    fallbackLabeled: fbOk,
    katReference: FB.fallback.katReference,
    sourceVerdict: FB.fallback.sourceVerdict,
    verdict: fbOk ? 'PASS' : 'FAIL',
  },
  P4: {
    ...distinct,
    permutationPairs: permPairs,
    identicalPairs: permPairs.filter((p) => p.identical).length,
    verdict: distinct.jobIdsDistinct === 6 && distinct.byteStreamsDistinct === 6 && permPairs.every((p) => !p.identical) ? 'PASS' : 'FAIL',
  },
  P5: {
    demo: { label: DEMO.label, selected: DEMO.chosen.selected, poolSize: 10, take: 4, mode: DEMO.mode, jobId: DEMO.job.jobId, hexSha256: DEMO.certifiedBits.hexSha256, stream: DEMO.certifiedBits.stream, consumedBits: DEMO.certifiedBits.consumedBits, deliveredBits: DEMO.certifiedBits.bits },
    schemaValidatedAll: true,
    verdict: demoOk ? 'PASS' : 'FAIL',
  },
  deepseekBlindPredictionScore: dsScore,
  rawDisclosure: 'full redacted raw API results committed per seal (46b-raw-*.json); redaction covers presigned URLs/tokens only — counts and cert payloads intact',
};
writeFileSync(join(RE, '46b-run-assessment.json'), JSON.stringify(assessment, null, 2) + '\n');

console.error('\n=== 46b assessment ===');
for (const p of ['P1', 'P2', 'P3', 'P4', 'P5']) console.error(`${p}: ${assessment[p].verdict}`);
console.error(`jobs used: ${jobsUsed.n}/${jobsUsed.cap}`);
console.error(`demo spot-audit set: [${DEMO.chosen.selected.join(', ')}] of the 10 near-arc objectives`);
const allPass = ['P1', 'P2', 'P3', 'P4', 'P5'].every((p) => assessment[p].verdict.startsWith('PASS'));
process.exit(allPass ? 0 : 1);
