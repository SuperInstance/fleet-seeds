// append_m13.mjs — keeper-lane seal of mine M13 (the QRNG-drawn candidate c2 of
// engine run-8: arXiv:2609.17523 "ScienceBuddy: Recursive-in-Recursive
// Self-Improvement for Interactive Scientific Agents", submitted 2026-09-15;
// code of record Gen-Verse/ScienceBuddy; run-7's frozen filler legally re-proposed
// and drawn by certified randomness — the priors' own first-test pick was c1,
// the draw overrode it, anti-cherry-pick observed LIVE 2nd consecutive run).
// The prediction text below is THE text whose sha256 seals it; resolution
// happens AFTER this append + validation (pre-registration order is the whole
// point). Append-only: validated with --against the prior copy.
// Second drawn-candidate SURVIVOR to mint: run-5 collision (receipted), run-6
// instrument corpus (receipted), run-7 → M12; run-8 carries the nested-loop law
// (nearest_prior M10, novelty-gate compliant).
import { createHash } from 'node:crypto';
import { copyFileSync, appendFileSync } from 'node:fs';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const PREDICTION = 'At the FIRST TWO fleet re-seals that re-run a previously-sealed, LLM-executed battery or registration UNCHANGED across an executor-version change (executor model swap or major model-version bump; deterministic instrument-only re-runs like the jepa determinism crown do NOT qualify — no executor layer changed), the inherited-procedure outcome will move OUTSIDE the registration\'s own noise band, and at least one of the two movements will OPPOSE the executor\'s overall quality delta (a nominally better executor degrading an inherited sealed procedure, or a nominally weaker one improving it). The mine is REFUTED if the first two qualifying re-seals both reproduce the inherited outcome within registered noise (then inherited verdicts are sound across executor changes and re-sealing ceremony is waste — also a useful answer). Operational consequence either way, registered in advance: until two qualifying re-seals resolve, no fleet verdict produced by an LLM executor may be inherited across an executor change without a re-seal note. If no qualifying re-seal resolves by the end of wave 70, the mine folds NULL (untested, not confirmed — the registered honest outcome). Candidate qualifying hooks already queued: E6 re-registration if it lands on a different executor model than the slice-1/2 campaign; the engine\'s own priors battery re-run across a typesafe jev version bump (jev-1.13.0 is the current engine-model of record); any lane re-running a sealed battery after the wave-63/64 deepseek re-roll. Observed anchor (external, vendor-reported, case-study grade): arXiv:2609.17523\'s own cycle-boundary numbers — the same harness-validation metric measured across a model update moved −10.0 points (44.4→34.4) and then +14.4 (46.7→61.1), the downward one under a model that went on to deliver the campaign\'s largest joint gains.';

const row = {
  id: 'M13',
  ts: new Date().toISOString(),
  source: 'https://arxiv.org/abs/2609.17523 (ScienceBuddy: Recursive-in-Recursive Self-Improvement for Interactive Scientific Agents, Xue/Zhong/Nan et al., submitted 2026-09-15, cs.AI; code of record github.com/Gen-Verse/ScienceBuddy; abs page 43374 B sha256 787cdfdfbe3e958a530bd4f590cc61104174d3fb2f519bced6ece5e79ad8ebe2 and full-text HTML 307130 B sha256 76308e8f460315b136d01eb20a720b2785d5580e1c1636c8d2e409b0d3adc202 fetched, kept uncommitted per L9 keyscan-false-positive-class: lode/engine/receipts/2026-10-02-engine-run-8/review/review-c2-provenance.md)',
  claim: 'Procedure value is executor-scoped: in a nested self-improvement stack, an update at one layer re-prices the other layer\'s accepted-and-sealed edits — in either direction, on double-digit scales, without regard to the updating layer\'s overall quality delta — so no inherited selection is a law; nested improvement loops must re-assess (re-seal) what they inherit after every cross-layer update. Source instance (ScienceBuddy RinR case studies, Qwen3.5-4B, LAB-Bench/Biomni-Eval1 families, three cycles of 10 harness-evolution steps + 20 GRPO updates): the same harness-validation metric measured across each model-update boundary moved 44.4→34.4 (−10.0) and 46.7→61.1 (+14.4) — the downward movement occurring under a model update that went on to deliver the campaign\'s largest joint gains (single-attempt test accuracy 42.2%→73.3%), i.e. the re-pricing sign does NOT track the executor\'s overall quality delta; separately, harness-only (+20 validation, model fixed) and model-only (+19.5 pass@4 coverage, harness fixed) gains each cleared ~20 points, with the harness inner loop\'s acceptance gate ("accepted only when they improve paired development evaluation") being M11\'s measurability criterion operating verbatim in a released system. The paper\'s own data therefore shows inherited procedure sets are version-conditional hypotheses, not laws — the paper says it in prose ("model updates change the effectiveness of inherited procedures"); the mine is the fleet-side falsifiable form. The mine does not rest on the vendor\'s case-study numbers being true (n=1 system, small panels, no ablation control) — it rests on the fleet\'s own first two qualifying re-seals, which is the falsifiable part. Delta vs M10 (nearest prior): M10 mandates an OPEN harness edit space with a regularized search trajectory — policy for how the search moves within one layer; M13 gives the mechanism that makes closure unsound — executor-layer updates re-price settled selections (−10.0/+14.4 observed across single model updates), so "done" edits revert to open hypotheses whenever the executor changes: M10 says keep the space open, M13 says why it never closes. Delta vs M11: M11 gates which DOMAINS admit RSI gains; M13 is about the stability over TIME of gains already sealed inside an eligible domain — even a perfectly sealed domain\'s verdicts are executor-scoped. Delta vs M12: M12 predicts which edit CLASS pays first within a campaign; M13 predicts that no edit\'s payment survives executor changes un-re-assessed — M12\'s substrate repairs are themselves subject to re-pricing at the next model update. Adjacent-but-distinct: M3 (hold-out cells) guards within-run selection abuse; lesson L14 is the copy-the-ARITHMETIC failure class, M13 is the copy-the-VERDICT failure class across executor versions. Side-receipts, not minted: the inner recursion\'s paired-development acceptance gate is M11 verbatim in practice; the retained-version ledger ("all harness and environment versions are retained") is M10\'s open-edit-space policy made concrete; the GEPA citation (M2\'s source, §1/§5, receipted verbatim in the review provenance) locates the paper in the reflective-evolution lineage; the rubrics-mined-from-collaboration workflow is a folk instance of M5\'s structured-ledger instinct.',
  abstraction: 'A sealed improvement is a hypothesis about the executor that sealed it. Cross-layer updates re-price inherited selections in either direction, so nested improvement loops must re-assess what they inherit: re-seal after every executor change, and treat edit-space closure as unsound — M10\'s open-edit-space policy given its mechanism, M11\'s measurability criterion extended from domains to the TIME-stability of sealed gains.',
  prediction: PREDICTION,
  pred_sha256: sha256(PREDICTION),
  lane: 'fleet-seeds/lode/engine (this repo); adoption hooks: E6 re-registration and any lane re-running a sealed LLM-executed battery across an executor change adds a re-seal note (inherited-verdict block) per this law; the engine\'s own priors battery across a jev version bump is the standing cross-version re-seal of record',
  status: 'open',
  nearest_prior: 'M10',
  engine_run: {
    run: '2026-10-02-engine-run-8',
    candidates_sha256: 'd6905603119c9120db60549b7d41314af239e1bfee8ff070d3af63fc0be57076',
    drawn_index: 1,
    drawn_candidate: 'c2',
    noul_prior_jev_1_13_0: 0.33,
    bundle: ['c2'],
    edit_budget: 1,
    typesafe_usage: { input_tokens: 723, output_tokens: 73, latency_ms: 245.43 },
    review_receipts: 'lode/engine/receipts/2026-10-02-engine-run-8/',
  },
  qrng_witness: {
    instrument: 'fleet-seeds/tools/moth-seal.mjs (certified comet-qrng-v1, submit-time commitment + bell witness)',
    engine: 'comet-qrng-v1',
    jobId: 'e5615c45-3d0d-454b-98ee-90031cf435dc',
    raw_result_sha256: 'f197fe0afaa48ab6a3ee4ff952d6e3bc8f7e428c7dc77d0ce7c26fc38cbb0fa2',
    purpose: 'anti-cherry-pick: the review target was drawn by certified randomness from the frozen candidate list (sha256 d6905603…), not by taste — the priors battery\'s own first-test pick was c1 (choice probability 0.81); the certified draw overrode it (2nd consecutive run where the draw overrode the priors\' pick)',
    receipt: 'lode/engine/receipts/2026-10-02-engine-run-8/qrng-seal.json',
  },
};

const f = 'mines.jsonl';
copyFileSync(f, f + '.pre-m13');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('M13 appended; pred_sha256', row.pred_sha256.slice(0, 16) + '…');
