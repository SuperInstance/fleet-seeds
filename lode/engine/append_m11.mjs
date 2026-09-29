// append_m11.mjs — keeper seal of mine M11 (the QRNG-drawn candidate c4 of
// engine run-4: Noam Brown on agent swarms, alignment & RSI, dwarkesh.com).
// The prediction text below is THE text whose sha256 seals it; resolution
// happens AFTER this append + validation (pre-registration order is the whole
// point). Append-only: validated with --against the prior copy.
// CORRECTION OF RECORD: first append attempt was rejected by lode_validate
// (M1 gate: nearest_prior must be an earlier mine ID). The unvalidated row was
// rolled back byte-exact from mines.jsonl.pre-m11 before this re-append — no
// sealed history was edited. Prose prior-notes moved into the claim field.
import { createHash } from 'node:crypto';
import { readFileSync, copyFileSync, appendFileSync } from 'node:fs';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const PREDICTION = 'quilt-jepa\'s round-8 agenda (the four items priced at the round-7 verdict: plasticity-advantage mechanism, GWIN lr-non-monotonicity, wd 2e-4 candidate re-registration, over-decay plasticity) will be tagged by the archive-coverage/eligibility instrument this lane registers alongside M8 as SEALED-MEASURABLE (a numeric pre-registered threshold is stated for the item) or UNSEALED (qualitative only). At round-8 resolution: at least 3 of the items tagged SEALED-MEASURABLE resolve to a definitive PASS/FAIL verdict in the round-8 verdict file, while items tagged UNSEALED defer or partially resolve at majority rate. The mine is REFUTED if the sealed-measurable items defer at the same or higher rate than the unsealed items (measurability would then NOT be the resolution-rate criterion, and RSI eligibility would have to live somewhere other than the seal).';

const row = {
  id: 'M11',
  ts: '2026-09-29T04:52:00Z',
  source: 'https://www.dwarkesh.com/p/noam-brown (Noam Brown interview, 2026-09-20; transcript receipted: lode/engine/receipts/2026-09-29-engine-run-4/review-c4-raw.html + review-c4-assessment.md)',
  claim: 'Measurability is the RSI-eligibility criterion: a capability domain yields recursive self-improvement gains exactly insofar as its improvement objective can be sealed — pre-registered, tamper-evident, objectively scoreable. Brown\'s own account: mathematics is RSI-able because "there\'s a very clear objective… there are certain metrics that you care about"; swarm coordination is the bottleneck because "10,000 humans are better at coordinating than 10,000 agents" (the objective is not sealed, so quality cannot compound); each RSI rung must be gated by a robust verification case ("Okay, alignment is working. Let\'s do the next RSI rung"). Chain-of-thought degradation is the failure mode where the measurement channel itself rots — the fleet\'s determinism chains (probe==run==twin bit-equality) are the standing countermeasure. The fleet\'s seal-gated lanes are the constructive instance of the criterion; RSI speedup expectations were priced modestly (exponential ~3x, not 100x) — matching the fleet\'s own experience that sealed loops compound slowly but honestly. Related mines: M3 (measurement-channel decay names the anti-hacking surface), M8 (bundle filler c1 = arXiv:2609.34924 stationarity dichotomy externally replicates archive-not-population at paper strength: 30 same-family workers fail 42% by majority vote; receipted at review-c1-assessment.md).',
  abstraction: 'You can only recursively improve what you can seal. Measurability (sealed, tamper-evident, scoreable objectives) is the domain-eligibility gate for RSI: measurable domains compound, unmeasurable ones stall at coordination.',
  prediction: PREDICTION,
  pred_sha256: sha256(PREDICTION),
  lane: 'quilt-jepa round-8 (cross-lane prediction, engine-born); instrument registered alongside M8\'s archive-coverage field',
  status: 'open',
  nearest_prior: 'M9',
  engine_run: {
    run: '2026-09-29-engine-run-4',
    candidates_sha256: '74d67ff18cd62d83eab645ca8f9a333768f47c04177b068729ac51f173032097',
    drawn_index: 3,
    drawn_candidate: 'c4',
    noul_prior_jev_1_13_0: 0.25,
    bundle: ['c4', 'c1'],
    edit_budget: 2,
    typesafe_usage: { input_tokens: 1611, output_tokens: 208, latency_ms: 420.889 },
    review_receipts: 'lode/engine/receipts/2026-09-29-engine-run-4/',
  },
  qrng_witness: {
    instrument: 'fleet-seeds/tools/moth-seal.mjs (certified comet-qrng-v1, submit-time commitment + bell witness)',
    engine: 'comet-qrng-v1',
    jobId: '95873136-ee3e-4d3c-aaa6-7711b17d40f2',
    raw_result_sha256: '79c88e702eee7f3a2bd6d74c6e4714acfd77150c1dbba5e95e63c8d1a070161b',
    purpose: 'anti-cherry-pick: the review target was drawn by certified randomness from the frozen candidate list (sha256 74d67ff1…), not by taste',
    receipt: 'lode/engine/receipts/2026-09-29-engine-run-4/qrng-seal.json',
  },
};

const f = 'mines.jsonl';
copyFileSync(f, f + '.pre-m11');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('M11 appended; pred_sha256', row.pred_sha256.slice(0, 16) + '…');
