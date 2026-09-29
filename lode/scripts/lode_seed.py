#!/usr/bin/env python3
"""lode_seed.py — regenerate the four lode ledgers byte-identically (stranger-verifiable).
mines.jsonl  : M1..M9 from the RSI frontier study (scouts/2026-09-29-rsi-frontier.md §4),
               each prediction sealed with sha256 of its exact text.
registry.jsonl: the fleet's pre-registered prediction sets of record (from git/worklog truth).
scores.jsonl : the wave-59 Elo triage tournament (disclosed keeper judgment, reasons attached).
lessons.jsonl: structured lesson objects seeded from receipted wave-56..58 failure classes (M2).
Run from repo root:  python3 lode/scripts/lode_seed.py
"""
import hashlib
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")  # the lode/ directory
TS = "2026-09-29T02:20:00Z"  # sealed seed timestamp (wave-59 scout)


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


MINES = [
    dict(id="M1", source="Simple Baselines are Competitive with Code Evolution (openreview.net, receipt q05); ShinkaEvolve novelty rejection (Sakana AI)",
         claim="Novelty gate at registration: every new pre-registration must cite its nearest prior registry entry and the delta, or it is rejected before spend.",
         abstraction="novelty-rejection + simple-baseline discipline applied to experiment triage, not program evolution",
         prediction="Through wave 62, at least three lane pre-registrations cite mine ids in PLANNING.md queue items, and every registration lacking a mine citation carries a nearest_prior + delta statement; a registration missing both is the FAIL event. Measured against PLANNING.md Round 60-62 refinements and the lanes' registration files.",
         lane="governance", status="open"),
    dict(id="M2", source="GEPA (arXiv:2507.19457) reflective lessons; prime-agent Continual Harness (evidence-backed durable state)",
         claim="Worklog lessons become structured objects (claim, evidence link, failure class); lane briefs cite the top-3 relevant lessons.",
         abstraction="language as the learning medium: lessons are the gradient, and they must be addressable to be reusable",
         prediction="After lessons.jsonl exists, every wave-60+ lane dispatch brief cites at least one lesson id, and no failure class recurs in a lane whose brief cited the matching lesson through wave 62; a cited-class recurrence is the FAIL event.",
         lane="fleet-seeds/dispatch", status="open"),
    dict(id="M3", source="weco AIDE-squared (arXiv:2609.26457): public/private score split, private score decides survival",
         claim="Every dose/ablation registration reserves one hold-out cell (depth, dose, or pace combination) sealed pre-run, excluded from all fitting and bracket-setting, reported separately in the verdict.",
         abstraction="the anti-hacking engine is a score the optimizer cannot see; make the fleet's analog precise",
         prediction="quilt-jepa round-8 (or the next dose/ablation round) registers one held-out cell sealed pre-run and reports it separately; the cell either confirms the interpolated law bit-exactly (PASS) or diverges (FAIL), and either outcome is folded into the registry. The FAIL event is a registered round whose hold-out cell is absent from the registration.",
         lane="quilt-jepa", status="open"),
    dict(id="M4", source="weco AIDE-squared: fixed cost budget doubles as selection pressure, forcing algorithmic invention over brute force",
         claim="Per-lane budget caps become pre-registered constraints in every registration header, not just policy.",
         abstraction="cost-constraint as selection pressure; the independent theoretical justification of the pricing-first law",
         prediction="From wave 60 every lane registration header carries a pre-registered budget cap and its verdict states spend against it; through wave 62 all PASS verdicts use only zero-new-constant or existing-registered-piece mechanisms, and any PASS introducing a new constant without a registered pricing note is the FAIL event.",
         lane="all-lanes/governance", status="open"),
    dict(id="M5", source="prime-agent RLM: prompt-as-a-variable, context as programmable variables (github.com/PrimeIntellect-ai/prime-agent)",
         claim="Lane dispatch briefs become structured variable ledgers (facts, pins, seals, failure-class sections) instead of prose.",
         abstraction="context as variables: briefs the lane can address mechanically instead of re-read",
         prediction="Wave-60+ dispatch briefs are structured variable ledgers; lane deaths plus mid-lane resume events fall to at most 1 per wave through wave 62 from the wave-55..58 baseline of 3 recorded events (55-a death, round-6 lane death, 58-a deadline resume); exceeding 1 in any wave is the FAIL event.",
         lane="dispatch", status="open"),
    dict(id="M6", source="Absolute Zero (arXiv:2505.03335): proposer-solver self-play under verifiable rewards",
         claim="playtest-lane proposes adversarial tasks from a target repo's own tracker/CI history and gifts the harness; the repo's CI verifies.",
         abstraction="self-play task generation turns verification capacity into new signal — the fleet's gift engine",
         prediction="Within waves 60-61 the playtest lane opens one self-play-synthesized adversarial task harness as a gift PR with receipts; PASS if the PR is opened, FAIL if no such PR exists by the end of wave 61.",
         lane="playtest-lane", status="open"),
    dict(id="M7", source="weco AIDE-squared sec 2.4: a later mutation silently broke a correctly-implemented anti-hacking layer (caught only by post-hoc lineage tracing)",
         claim="Every seal that modifies a mechanism re-runs that mechanism's predecessor regression in the same wave; lode applies the same rule to itself (tamper self-tests before any scripts/ push).",
         abstraction="mutation fragility is a first-class failure mode of self-improving systems",
         prediction="Every mechanism-modifying seal carries its predecessor-regression receipt and zero silent mechanism-loss events occur through wave 62; a mechanism change without its regression receipt is the FAIL event.",
         lane="governance", status="open"),
    dict(id="M8", source="weco AIDE-squared sec 2.5: island populations with migration REJECTED under fixed budget; AlphaEvolve/DGM archive is the residue that survives",
         claim="Keep the diverse archive of laws (dose grids, the A-chain, GWIN grid) addressable in the registry; do NOT spawn parallel populations under fixed budget.",
         abstraction="archive, not population: quality-diversity over artifacts, not parallel spend",
         prediction="quilt-jepa round-8/9 registers archive-coverage (count of distinct depth-x-dose-x-pace cells with sealed results) alongside verdicts and reports its relation to next-round gate robustness; the FAIL event is a registered round verdict lacking the coverage measurement once the field exists.",
         lane="quilt-jepa", status="open"),
    dict(id="M9", source="weco 4 Levels of RSI (L0-L3 ladder); Metan (arXiv:2609.11873) autonomy rungs incl. recursive meta-improvement",
         claim="The fleet is at improvement-execution autonomy with sealed verification; the next rung is improvement-strategy autonomy — wave queues majority-mined from this registry.",
         abstraction="autonomy has rungs; naming the rung is the honest unit of progress",
         prediction="At least half of the wave-60 PLANNING queue items cite a mine id from this registry; fewer than half is the FAIL event. Measured against PLANNING.md Round 59/60 refinement diffs.",
         lane="governance", status="open"),
]

REGISTRY = [
    dict(set_id="JEPA-R4", repo="SuperInstance/quilt-jepa", commit="b2c24ba", predictions=8, verdict="PASS", verdict_commit="b2c24ba", registration_ref="registration-v4.json seal 29e74d16", brier=None),
    dict(set_id="JEPA-R5", repo="SuperInstance/quilt-jepa", commit="95ae21e", predictions=11, verdict="PASS", verdict_commit="95ae21e", registration_ref="registration-v5.json seal d5b27af1", brier=None),
    dict(set_id="JEPA-R6", repo="SuperInstance/quilt-jepa", commit="c5712f1", predictions=14, verdict="PASS", verdict_commit="72c6ce6", registration_ref="registration-v6 sealed pre-run", brier=None),
    dict(set_id="JEPA-R7", repo="SuperInstance/quilt-jepa", commit="5d1235e", predictions=18, verdict="PASS", verdict_commit="5624bc6", registration_ref="registration sealed pre-run (5d1235e), results 0b8130f", brier=None),
    dict(set_id="JEV-A9", repo="SuperInstance/jev-garden", commit="b45caf8", predictions=4, verdict="PASS", verdict_commit="b45caf8", registration_ref="seal v14 (append-only seal_history)", brier=None),
    dict(set_id="JEV-A10", repo="SuperInstance/jev-garden", commit="fce983c", predictions=4, verdict="PASS", verdict_commit="e92d00d", registration_ref="seal v16", brier=None),
    dict(set_id="JEV-A11", repo="SuperInstance/jev-garden", commit="75fd8cf", predictions=4, verdict="FAIL", verdict_commit="9351cd5", registration_ref="seals v17/v18 — honest production FAIL of record (-0.0825, fallback-class localized)", brier=None),
    dict(set_id="JEV-A12", repo="SuperInstance/jev-garden", commit="7109ea8", predictions=4, verdict="PASS", verdict_commit="b4589fd", registration_ref="seal v19 registration pre-run; verdict seal v20", brier=None),
    dict(set_id="G1-SEAT-SPIKE", repo="SuperInstance/fleet-seeds", commit="8839d13", predictions=10, verdict="PENDING", verdict_commit="8839d13", registration_ref="10 predictions sealed pre-hardware (fb98ca29); 8-evidence VOID record for runtime seats", brier=None),
    dict(set_id="PONG49-BATTERY", repo="SuperInstance/fleet-seeds", commit="7608d9a", predictions=4, verdict="ARMED", verdict_commit="7608d9a", registration_ref="embassy/battery/pong49_scorer.mjs; fires at the FIRST seal after 2026-09-29T10:04Z (holds #1-#5 receipted)", brier=None),
]

PAIRS = [
    ("M2", "M1", "lessons are consumed by every future lane brief immediately; the gate only fires at registration time"),
    ("M2", "M5", "lesson objects are the reusable core; brief restructuring is one consumer of them"),
    ("M1", "M4", "the novelty gate structurally blocks wasted spend before registration; the budget header is declarative"),
    ("M3", "M6", "held-out cells harden the science chain we already run; the self-play gift engine is speculative upside"),
    ("M7", "M9", "the tripwire prevents a concrete observed failure class (AIDE-squared's silently-broken layer); rung vocabulary is documentation"),
    ("M3", "M8", "hold-out cells create new information; archive-coverage only correlates existing information"),
    ("M5", "M9", "structured briefs attack the measured death mode (dispatch deadline deaths, stale tracking); vocabulary does not"),
    ("M1", "M7", "the gate prevents duplicates before spend; the tripwire catches losses after"),
    ("M6", "M8", "self-play can create new gift surface; the coverage metric is passive"),
    ("M4", "M8", "the budget law converts pricing-first from policy into a testable constraint; coverage is descriptive"),
    ("M2", "M3", "immediate universal consumption beats a deep-but-narrow science lever this wave"),
    ("M6", "M9", "a new gift surface beats vocabulary"),
    ("M5", "M4", "briefs-as-variables targets observed failure classes; the budget header is prophylactic"),
    ("M1", "M9", "the gate beats vocabulary"),
]

LESSONS = [
    dict(cls="dispatch-deadline-death", claim="A lane that dies mid-run is recovered from its own disk artifacts + transcript, not restarted; resume-first applies mid-lane, not just lane-shaped holes.", evidence="wave-55 55-a resumed by transcript; round-6 c5712f1 sealed pre-run, runner completed post-death (72c6ce6); 58-a resumed after dispatch deadline", status="standing"),
    dict(cls="stale-tracking", claim="Verify remote state tokenless (fetch + rev-parse) BEFORE lane start; local 'ahead' markers can be stale tracking fiction.", evidence="wave-57 pre-wave repair: jev-garden '[ahead 2]' stale; A10 pushes verified on remote", status="standing"),
    dict(cls="detached-process-reap", claim="The sandbox silently reaps detached processes (kill, not OOM): stage executions to disk and resume; never attach claim arithmetic to a detached tail.", evidence="quilt-jepa round-7 process receipts; no claim arithmetic touched", status="standing"),
    dict(cls="schema-verification-gap", claim="Inbound CI adoption verification must check the CALLED workflow's input schema, not just the caller's shape.", evidence="forge-adopt-v0 STARTUP_FAILURE (0 jobs) — quilt-forge@v0 requires test-cmd; fixed 2119fdf; run success", status="standing"),
    dict(cls="receipt-class-drift", claim="Carve stamp-class strips BEFORE the run of record; nondeterministic stamp classes must be identified pre-seal, not discovered post-hoc.", evidence="A11 P-A11d audit taught; A12 v20 re-run measured-bytes identical after strip", status="standing"),
    dict(cls="peer-pin-collision", claim="Check peer ranges before dependency bumps; a peer <X.Y pin makes the bump un-installable no matter what the lock says.", evidence="quilt RED at TS7 merge: @typescript-eslint peer <6.1.0 vs typescript 7.0.2; issue #33 with receipts", status="standing"),
    dict(cls="timing-law", claim="A windowed instrument fires at the FIRST seal after window close, never before: early fire = violation; honest hold receipts are recorded every seal while open.", evidence="pong49 holds #1-#5 receipted; scorer armed; fire due first seal after 2026-09-29T10:04Z", status="standing"),
]


def main():
    os.makedirs(ROOT, exist_ok=True)
    # mines with nearest_prior=null on seed (the gate applies to mines added after this seed)
    mines = [dict(id=m["id"], ts=TS, source=m["source"], claim=m["claim"], abstraction=m["abstraction"],
                  prediction=m["prediction"], pred_sha256=sha(m["prediction"]), lane=m["lane"],
                  status=m["status"], nearest_prior=None, superseded_by=None) for m in MINES]
    write("mines.jsonl", mines)
    write("registry.jsonl", [dict(r, ts=TS) for r in REGISTRY])
    write("scores.jsonl", [dict(ts=TS, a=a, b=b, winner=a, reason=r, judge="keeper (main Super Z, wave-59 scout) — disclosed, not blind") for a, b, r in PAIRS])
    write("lessons.jsonl", [dict(id=f"L{i+1}", ts=TS, **l) for i, l in enumerate(LESSONS)])
    print("seeded: mines=9 registry=%d scores=%d lessons=%d" % (len(REGISTRY), len(PAIRS), len(LESSONS)))


def write(name, objs):
    path = os.path.join(ROOT, name)
    with open(path, "w", encoding="utf-8") as f:
        for o in objs:
            f.write(json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "\n")
    print("wrote", path, len(objs), "lines")


if __name__ == "__main__":
    main()
