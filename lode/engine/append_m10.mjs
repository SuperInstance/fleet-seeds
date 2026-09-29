// append_m10.mjs — keeper seal of mine M10 (the QRNG-drawn candidate c1 of
// engine run-2, google-research/rrsi). The prediction text below is THE text
// whose sha256 seals it; resolution happens AFTER this append + validation
// (pre-registration order is the whole point). Append-only: validated with
// --against the prior copy.
import { createHash } from 'node:crypto';
import { readFileSync, copyFileSync, appendFileSync } from 'node:fs';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const PREDICTION = 'Reading RRSI\'s paper (arXiv:2609.24972) at resolution time will show BOTH: (a) a selection-side rule that binds added inference cost to measured gain (an external, paper-strength instance of mine M4\'s pre-registered budget-cap law); AND (b) at least one reported result where regularized out-of-distribution harness gain is strictly positive while remaining strictly below the matching in-distribution gain (regularization narrows the overfit soil gap; it does not close it — the A6 soil-law instance). The mine is REFUTED if either (a) or (b) is absent from the paper\'s own method/results presentation (arxiv abstract page text and/or the paper body linked from it) at resolution time; a refutation is the finding that pricing-first-style cost accounting or soil realism does NOT survive Google-scale RSI practice.';

const row = {
  id: 'M10',
  ts: '2026-09-29T03:40:00Z',
  source: 'https://github.com/google-research/rrsi (paper: arXiv:2609.24972, project: regularized-rsi.com)',
  claim: 'Regularized RSI: keep the harness edit space open and regularize the search TRAJECTORY through it — proposal side (annealed bundled-edit budget, proposer conditioned on full edit history so falsified hypotheses are not redrawn, stalled-run redirection to unexercised components) + selection side (critic screening for suite-specific logic, noise-adjusted floor, cost rule: added inference tokens must be paid for by measured gain, pruning of stale components). The cost rule is the pricing-first law arriving independently at Google Research; the git-worktree-per-candidate accept/fast-forward loop is RSI native to git pipelines.',
  abstraction: 'Constrain HOW the search moves, not WHAT the harness may contain. Overfit is a soil property (fixed evolve set memorizes); regularization (budgets, noise floors, cost accounting, history-conditioning) is the cure family — our A6/A11/A12 chain and M4 caps are instances; RRSI is the same law at fleet scale.',
  prediction: PREDICTION,
  pred_sha256: sha256(PREDICTION),
  lane: 'fleet-seeds/lode/engine (this repo); adoption hook: jev-garden A13 registration (wave-60 queue item 4) cites M10 alongside M4',
  status: 'open',
  nearest_prior: 'M4',
  engine_run: {
    run: '2026-09-29-engine-run-2',
    candidates_sha256: '5ca6737662b3a8f3d4dd393d6acb2496d876ee650c4b0a9b2ec861b831a0c5eb',
    drawn_index: 0,
    drawn_candidate: 'c1',
    noul_prior_jev_1_13_0: 0.39,
    typesafe_usage: { input_tokens: 1692, output_tokens: 266, latency_ms: 271.962 },
    review_receipts: 'lode/engine/receipts/2026-09-29-engine-run-2/',
  },
  qrng_witness: {
    instrument: 'fleet-seeds/tools/moth-seal.mjs (certified comet-qrng-v1, submit-time commitment + bell witness)',
    engine: 'comet-qrng-v1',
    jobId: '3b2d3cb2-ff0d-45bf-97e2-26a5a7db5bb6',
    raw_result_sha256: '68a3f8c3368c7553b96a99ec0b18a756d156d60ca11bd025995278329f50b81b',
    purpose: 'anti-cherry-pick: the review target was drawn by certified randomness from the frozen candidate list (sha256 5ca67376…), not by taste',
    receipt: 'lode/engine/receipts/2026-09-29-engine-run-2/qrng-seal.json',
  },
};

const f = 'mines.jsonl';
copyFileSync(f, f + '.pre-m10');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('M10 appended; pred_sha256', row.pred_sha256.slice(0, 16) + '…');
