// append_m12.mjs — keeper-lane seal of mine M12 (the QRNG-drawn candidate c2 of
// engine run-7: Cline's single-prompt self-improvement campaign over its own
// coding-agent harness, cline.ghost.io 2026-07-30; PR 12465 = verification anchor).
// The prediction text below is THE text whose sha256 seals it; resolution
// happens AFTER this append + validation (pre-registration order is the whole
// point). Append-only: validated with --against the prior copy.
// First drawn-candidate SURVIVOR to mint since M11: run-5's draw collided with the
// ledger (receipted), run-6's draw was a pure instrument corpus (receipted) — run-7's
// draw carries a new falsifiable law (nearest_prior M11, novelty-gate compliant).
import { createHash } from 'node:crypto';
import { copyFileSync, appendFileSync } from 'node:fs';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const PREDICTION = 'Decompose the next fleet self-improvement-shaped campaign — a lane where an agent edits its own harness/tooling/queries under a sealed metric and a pre-registered budget (E6 re-registration is the first candidate) — edit by edit at resolution time: the majority of score-moving edits will be measurement/transport-class (retry/backoff, liveness, progress or stall detection, self-termination prevention, instrumentation correctness), not strategy-class (search order, proposal heuristics, prompt content). The mine is REFUTED if the first such campaign resolves with its score movement majority strategy-class. If no such campaign resolves by the end of wave 70, the mine folds NULL (untested, not confirmed — the registered honest outcome). External corroboration channel of record: the public cline/cline pull request 12465 diff, whose file-level classification (provider retry, loop detection, indexer liveness, reasoning-effort mapping, guidance tests) is receipted in lode/engine/receipts/2026-09-30-engine-run-7/review-c2-pr12465.json.';

const row = {
  id: 'M12',
  ts: new Date().toISOString(),
  source: 'https://cline.ghost.io/recursive-self-improvement-for-coding-agents/ (Cline, 2026-07-30; verification anchor: github.com/cline/cline/pull/12465 — API snapshot receipted at lode/engine/receipts/2026-09-30-engine-run-7/review-c2-pr12465.json; raw article fetched 42390 B sha256 4462c08ccffc4ce8774101241f77d3351738f54f758089356055122f43d7f88d, kept uncommitted per L9 keyscan-false-positive-class: review-c2-provenance.md)',
  claim: 'Gauge before game: within any sealable domain, first-campaign self-improvement gains concentrate in measurement/transport repair — availability (retry/backoff), liveness, progress/stall sensing, self-termination prevention, instrumentation correctness — not in the strategy layer. Source instance (Cline single-prompt Terminal-Bench 2.1 campaign, Kimi K3, 2026-07): all +10 recovered points (69/89 baseline at $79 to 79/89 confirmation at $49.8) came from four substrate repairs — rate-limit retry with exponential backoff (5 flips), output-aware loop detection (2), an async worker liveness fix (1), and tool guidance replacing broad pattern-kills that terminated the harness\'s own process (2) — while the one correctness/strategy edit (reasoning-effort mapping) moved zero score, and per-run cost fell ~37% because repaired transport stops wasting tokens on doomed retries and self-terminations (an external paper-strength instance of M4\'s cost discipline: repairs pay for themselves). The article\'s own headline ("the bottleneck isn\'t models but the humans using them") is a human-bottleneck reading; the mined law is the substrate reading their own data supports: near-zero human intervention, yet every score-moving edit repaired the measurement/transport channel. The mine does not rest on the vendor\'s self-reported numbers being true (n=1, unaudited; proof gists public) — it rests on the fleet\'s own next campaign, which is the falsifiable part. Delta vs M11 (nearest prior): M11 is the eligibility gate over DOMAINS (a domain yields RSI gains exactly insofar as its objective can be sealed); M12 is distributional WITHIN a sealable domain — it predicts what gets fixed FIRST. Side-receipts, not minted: the campaign\'s experiment-record file is an external instance of M10\'s history-conditioned proposer; its self-policing attribution guards are a folk instance of M3\'s anti-hacking hygiene; the human-reviewed harness PR as final backstop is M11\'s verification-case criterion verbatim.',
  abstraction: 'The engine improves its gauge before it improves its game. Substrate precedes strategy in the gain distribution of self-improvement: measurement/transport integrity (availability, liveness, progress sensing, self-harm prevention) is where the first marginal gains live — M11\'s measurability criterion made distributional within the domain.',
  prediction: PREDICTION,
  pred_sha256: sha256(PREDICTION),
  lane: 'fleet-seeds/lode/engine (this repo); adoption hooks: E6 re-registration decomposes its first campaign per this law at resolution; any harness-mutation lane adds a substrate-repair-first checklist (retry/backoff, liveness, stall sensing) before strategy tuning',
  status: 'open',
  nearest_prior: 'M11',
  engine_run: {
    run: '2026-09-30-engine-run-7',
    candidates_sha256: '46cee172bbdaa7d5c98ef25c35d7aba96e9b5f39858ddecd413c5e5510a1dd00',
    drawn_index: 1,
    drawn_candidate: 'c2',
    noul_prior_jev_1_13_0: 0.32,
    bundle: ['c2'],
    edit_budget: 1,
    typesafe_usage: { input_tokens: 825, output_tokens: 100, latency_ms: 243.123 },
    review_receipts: 'lode/engine/receipts/2026-09-30-engine-run-7/',
  },
  qrng_witness: {
    instrument: 'fleet-seeds/tools/moth-seal.mjs (certified comet-qrng-v1, submit-time commitment + bell witness)',
    engine: 'comet-qrng-v1',
    jobId: 'db1bb3f0-2bb7-4cd4-93b2-5b92019858c8',
    raw_result_sha256: '7c49d99993313164cd65a85f05414dc4d8136179db6461a445e39943c8815b77',
    purpose: 'anti-cherry-pick: the review target was drawn by certified randomness from the frozen candidate list (sha256 46cee172…), not by taste — the priors battery\'s own first-test pick was c3; the certified draw overrode it',
    receipt: 'lode/engine/receipts/2026-09-30-engine-run-7/qrng-seal.json',
  },
};

const f = 'mines.jsonl';
copyFileSync(f, f + '.pre-m12');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('M12 appended; pred_sha256', row.pred_sha256.slice(0, 16) + '…');
