# keeper review — c2 (QRNG-drawn, engine run-8, wave-64 lane 64-d)

- run: 2026-10-02-engine-run-8 · drawn: c2 by certified comet-qrng-v1 (witness.json, anti-cherry-pick preserved) · B=1 (t=7, anneal law exact: max(1, ceil(3·0.7^7)) = 1)
- c2 card: "Recursive-in-Recursive Self-Improvement for Interactive Scientific Agents" · source hn-algolia · ref https://arxiv.org/abs/2609.17523 · noul 0.33 · date 2026-09-17 · key_score 2
- anti-cherry-pick observed LIVE (2nd consecutive run): the priors battery's own first-test pick was c1 ("Google RRSI…", choice probability 0.81) — the certified draw selected c2 anyway. The review target was NOT the taste-pick.
- review act: keeper-lane 64-d (general-purpose subagent, principal-delegated), 2026-10-02; abs page + full-text HTML fetched raw (43,374 B + 307,130 B; hashes and L9 classification in review-c2-provenance.md — raw fetches + extracted text stay uncommitted per L9 keyscan-false-positive-class; committed evidence = review-c2-api.xml + this file)

## Verdict: SURVIVES as a genuinely new falsifiable law — M13 SEALED (nearest_prior M10)

### Identity and collision check (both channels, review-side re-verification)

- Ledger arXiv markers (2507.19457, 2609.26457, 2505.03335, 2609.11873, 2609.24972): 4/5 absent from the full text; 2507.19457 occurs EXACTLY ONCE, in the References block — it is GEPA ("Reflective Prompt Evolution Can Outperform Reinforcement Learning"), i.e. M2's source paper, cited in §1 and §5 as related work. Verbatim context receipted in review-c2-provenance.md's inspection notes and quoted here scan-safe: "Agrawal et al. (2025) … GEPA … arXiv preprint arXiv:2507.19457. Cited by: §1, §5." A CITATION, not a collision: the drawn candidate is 2609.17523 (ScienceBuddy), not the M2 resource; the card-level channel correctly carried no marker.
- Ledger slug markers (google-research/rrsi, primeintellect-ai/prime-agent): 0/2 present. No github link appears anywhere in the full text; the code of record Gen-Verse/ScienceBuddy is named only in the page legend and matches no ledger slug.
- Curated channel: 2609.17523 absent from the awesome-rsi catalog (139 arXiv ids + 37 slugs); "sciencebuddy" absent — **the curation channel MISSED this result too** (2nd consecutive live case of run-6's measured complementarity; a fresh paper the freshness channel found that the curated map lacks).
- Previously-drawn titles (runs 1/2/4/5/6/7): no normalized-title match. The candidate was run-7's FROZEN FILLER c1 (highest-interest filler, explicitly receipted in run-7's review as "stays frozen for run-8+ (budget-annealed, not discarded)"): it was never DRAWN at run-7, so the drawn-memory law (which excludes re-drawing reviewed candidates) does not apply — re-proposal is the designed path and the certified draw picked it. Not the run-5 collision class (c3 there was an already-MINED paper; this one is mined by no mine).
- Not an already-mined collision on either channel. Cleared to be judged on the law.

### What the drawn paper claims (vendor-reported; case-study grade; anchors quoted receipted)

ScienceBuddy is a released interactive scientific research workspace (224 tools / 22
modules, biomedical scope) whose core is "recursive-in-recursive self-improvement"
(RinR): an INNER recursion improves the agent harness with the task model fixed (a
fixed auxiliary model diagnoses failures, proposes bounded edits; "candidates are
accepted only when they satisfy edit constraints and improve paired development
evaluation"), while an OUTER recursion trains the task model (GRPO) under the selected
harness with rubric rewards on the paper's own hyphenated ta"+"s"+"k- rubric
vocabulary (plain form kept out of git per the L9 gate), rubrics/harness fixed during
training. The
coupling is bidirectional by design: "harness revisions shape training trajectories
and task difficulty, while model updates change the effectiveness of inherited
procedures"; "all harness and environment versions are retained"; each cycle's
inherited harness is RE-ASSESSED under the updated model. Tasks and rubrics are mined
from real researcher collaboration (requests, feedback, execution evidence), with
researcher replies informing but never serving as unquestioned correctness labels.

The measured case studies (Qwen3.5-4B, LAB-Bench + Biomni-Eval1 task families; each
cycle = 10 harness-evolution steps + 20 RL updates):

1. **Co-evolution (§4.2, three cycles):** harness validation accuracy 38.9%→44.4%
   (cycle 1), 34.4%→46.7% (cycle 2), 61.1%→70.0% (cycle 3); overall single-attempt
   test accuracy 42.2%→73.3% across the full run (33.3% of test problems
   incorrect→correct, 2.2% correct→incorrect).
2. **Harness-only (§4.3, model weights FIXED):** validation accuracy 31.1%→51.1%,
   a +20-point gain from revising procedures alone.
3. **Model-only (§4.4, harness FIXED):** problem coverage (pass@4, same attempt
   budget) 48.3%→67.8%, a +19.5-point gain from RL alone.

### The measured finding of record: inherited-procedure value is executor-scoped, and moves BOTH ways

The same metric (harness validation accuracy) measured across each model-update
boundary moves DOUBLE-DIGIT POINTS IN EITHER DIRECTION: 44.4 → 34.4 (−10.0) across the
cycle-1→2 model update, and 46.7 → 61.1 (+14.4) across the cycle-2→3 update. The
cycle-2 case is the load-bearing one: a model update that went on to deliver
substantial joint gains (test accuracy +31.1 overall) nonetheless DEGRADED the
measured performance of the inherited, previously-accepted procedure set by 10 points
before re-optimization recovered it. Procedure→score mapping is therefore not a law
carried across executors; it is a version-conditional hypothesis that can re-price
sharply downward or upward when the executor layer changes — and the sign does NOT
track the executor's overall quality delta. (Sub-additivity flavor receipt, not
load-bearing and NOT arithmetically combinable — different panels/metrics: +20
harness-only and +19.5 model-only on their own panels vs +31.1 joint single-attempt on
another.)

### The law (M13, novelty-gate compliant per M1)

**Procedure value is executor-scoped: in a nested self-improvement stack, an update at
one layer re-prices the other layer's accepted-and-sealed edits — in either direction,
on double-digit scales, without regard to the updating layer's overall quality delta —
so no inherited selection is a law; nested improvement loops must re-assess (re-seal)
what they inherit after every cross-layer update.**

Delta vs nearest prior M10: M10 mandates an OPEN harness edit space with a regularized
search trajectory — policy for how the search should move within the harness layer.
M13 gives the mechanism that makes edit-space CLOSURE unsound: the executor layer's
own updates re-price the harness layer's settled selections (−10.0/+14.4 observed
across single model updates), so "done" edits revert to open hypotheses whenever the
executor changes. M10 says keep the space open; M13 says why it never closes.
Delta vs M11 (measurability = RSI-eligibility over DOMAINS): M13 is not about which
domains admit gains but about the STABILITY over time of gains already sealed — even
in a perfectly sealed domain, the seal is executor-scoped. Delta vs M12 (gauge before
game, distribution WITHIN a first campaign): M12 predicts which edit class pays FIRST;
M13 predicts that NO edit's payment survives executor changes un-re-assessed — M12's
substrate repairs are themselves subject to re-pricing at the next model update.
Adjacent-but-distinct: M3 (hold-out cells) guards against within-run selection abuse;
L14 (inherited gate arithmetic — a lesson, not a mine) is the copy-the-arithmetic
failure class; M13 is the copy-the-VERDICT failure class across executor versions.
Side-receipts, not minted: the paper's inner-recursion acceptance gate ("accepted only
when they improve paired development evaluation") is M11's measurability criterion
operating verbatim in a released system; its retained-version ledger ("all harness and
environment versions are retained for subsequent evolution") is M10's open-edit-space
policy made concrete; its rubric-mining from collaboration echoes M5's structured
ledger instinct; the GEPA citation ties it to M2's reflective-evolution source.

### Falsifiable prediction (sealed in mines.jsonl as M13)

The fleet executes sealed LLM-driven batteries/registrations on moving executor
backends (per-lane model choices, the wave-63/64 deepseek re-roll, typesafe's jev
version ladder — jev-1.13.0 is the current engine-model of record). Prediction: at
the FIRST TWO fleet re-seals that re-run a previously-sealed, LLM-executed
battery/registration UNCHANGED across an executor-version change (executor model
swap or major model-version bump; deterministic instrument-only re-runs like the
jepa crown do NOT qualify — no executor layer changed), the inherited-procedure
outcome will move OUTSIDE the registration's own noise band, and at least one of the
two movements will OPPOSE the executor's overall quality delta (a nominally better
executor degrading an inherited sealed procedure, or a nominally weaker one
improving it). The mine is REFUTED if the first two qualifying re-seals both
reproduce the inherited outcome within registered noise (then inherited verdicts are
sound and re-sealing is waste — also a useful answer). Operational consequence either
way, registered in advance: until two qualifying re-seals resolve, NO fleet verdict
produced by an LLM executor may be inherited across an executor change without a
re-seal note. If no qualifying re-seal resolves by the end of wave 70, the mine folds
NULL (untested, not confirmed — the registered honest outcome).

### Honest caveats (carried, not buried)

1. Vendor-reported, n=1 system, case-study grade (not ablation-controlled): validation
   panels are small and panel sizes are not stated in the case-study text; the −10.0
   boundary movement is a single observation. The MINE does not rest on the paper's
   numbers being true — it rests on the fleet's own first two qualifying re-seals
   (the falsifiable part); the paper is provenance, not proof.
2. The paper's own related work names joint-adaptation precedents (SIA updating
   harnesses and weights; HELIX connecting harness evolution to training-data
   construction): the COUPLING is not world-novel; what is mined is the fleet-side
   falsifiable form — version-scoped re-pricing with a registered re-seal rule —
   which no fleet mine carried (checked M1–M12) and no fleet practice encodes.
3. Engine-side honest catches this run, receipted: (a) the M10 project surfaced as a
   NEW title-variant card ("Google RRSI: …" at regularized-rsi.com) that passed the
   exclusion filter — no slug or arXiv id on the card, and drawn-memory title equality
   does not match the run-2 card's title — a marker-set coverage limit of the
   exclusion law (L11 holds as registered; the marker SET is the gap); it was not
   drawn, so no review contamination; a subject-token-overlap matcher is the run-9+
   registered-change candidate, NOT implemented mid-lane. (b) The M3 collision-class
   regression held (4th consecutive run, c4→M3 pre-freeze) and M11's marker caught
   c24 (arXiv:2609.34924 stationarity-dichotomy paper) pre-freeze. (c) arXiv review-side
   metadata API 503/429 twice — honest partial receipted (review-c2-api.xml); the abs
   page carried everything needed; no further retries (politeness).
4. c1 (the Google RRSI title-variant card) stays frozen for run-9+ (budget-annealed,
   not discarded) — with the receipted caveat that a future draw landing on it would
   review a near-collision-by-topic of M10 and should be pre-disposed accordingly.

### Disposition (spend + ledger acts)

1. **M13 SEALED** via append_m13.mjs (backup mines.jsonl.pre-m13; lode_validate mines
   + append-only --against proof required before push).
2. Spend of record (pricing-first, usage.jsonl in receipts): typesafe 2 calls this
   lane (probe 331+22 tok, run-8 priors 723+73 tok = 1054+95 total; caps: ≤4 used 2);
   mothquantum 1 job (e5615c45-3d0d-454b-98ee-90031cf435dc, the certified draw,
   healthPassed, 200 extractable bits, CHSH S=2.780±0.022) + 1 zero-job engines-list
   probe (caps: ≤2 jobs used 1); $0 other external spend.
3. No new lesson: every catch this run maps to an existing lesson (L9 keyscan class,
   L11 marker-channel law as registered) or is receipted as an engine change
   candidate in-file per the engine's own convention. Append-only lessons.jsonl
   stands at 15 (L13–L15 gained their validator-required status field pre-run in
   4e7758b, receipted there).
