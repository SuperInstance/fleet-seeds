# Seed: tavern disagreement economics on a foreign corpus — does the batching law generalize?

## The question

The qthe tavern measured, on its own corpus, that asking all of one guest's
battery questions in ONE typed-question call instead of one call per question
costs 12.36x less at document-dominated state (7.41x compact) with ZERO
added answer noise (0/30 sampled questions batch-hostile; largest arm-to-arm
move 0.030 against a 0.043 noise floor; zero label flips). It also measured
the bound: the question map is not free (~147 marginal input tokens per
question), so the saving tracks state-chars-per-question, not the naive Nx.

Is that a TAVERN law or a CORPUS law? The falsifier ran on tavern traffic
(audit findings over a substrate repo). The question this seed plants: does
"batching adds no noise" survive on a corpus with a different shape —
specifically the git.pp reading-room's discriminating-probe corpus, where
each probe exists BECAUSE two defensible readings diverge on it?

## The experiment (paired arms, decision rules BEFORE the run)

Corpus: the reading-room probes (records chosen so independent readings
disagree) plus a matched set of probes all current readers AGREE on (the
harness already reports both — do not hide the agreement side).

Arms x repeats: every probe's questions asked (a) all-in-one-call per reader,
(b) one-call-per-question, 5 repeats each, seeded draw order receipted.

Measurements: per-question answer distribution per arm; arm-to-arm mean
shift vs the single-call noise floor (the 2*std_S rule from the tavern's
falsifier); label flips; token economics (the question-map cost on THIS
corpus — does the ~147 tok/question bound reproduce?).

Decision rules:

1. If any reader's probe answers shift beyond their own single-call noise
   floor under batching on >= 20% of sampled questions, batching is
   corpus-conditional — the reading-room must batch with a receipted caveat,
   and the tavern's law narrows to "audit-finding-shaped traffic".
2. If zero probes are batch-hostile across all readers, the law generalizes
   one corpus further — still not a universal, and the receipt must say so.
3. Either way, the DISAGREEMENT structure is the prize: does batching
   preserve the discriminating-probe property (readers still diverge on the
   same probes, agree on the same probes)? If batching collapses divergence,
   the reading-room method itself is batch-sensitive — that would be the
   headline finding.

## Why this seed

The reading-room exists to measure how much of a spec is underdetermined;
the tavern exists to price judgment under budget. This seed crosses them:
the tavern's economics instrument applied to the reading-room's semantic
instrument. Both repos keep their own verdicts (Reader's Fold) — this is a
third lane borrowing both, honestly.

## Where the receipts go

New repo spawned from this seed; raw rows AS-SAID per call (the tavern's
append+flush jsonl law), the falsifier verdict with the noise-floor
arithmetic shown, spend receipted per call. Zero secrets in any file.

---

## Amendment (pre-drop, ORCH-R14): the devil's advocate pass

Seed-2.0-mini (AS-SAID in `opinions_r14.jsonl`): "Uses same readers for both
arms, introducing memory bias across batch/single test conditions."
Verdict: fix-first. AMENDED — two receipts: (a) API calls carry NO memory
between invocations, so within-model cross-arm drift is exactly what the
2*std single-call noise floor measures (the tavern's r13 falsifier design);
(b) the STRONGER variant is receipted as an optional arm: independent blind
reader pools per condition (different model families per arm) — costlier,
and then arm-to-arm differences confound seat with batching, so it prices a
different question (seat-vs-batch interaction) and must be labeled as such,
never pooled with the within-model arms.
