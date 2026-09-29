# lode — the discovery loop

Named for the mother lode: breakthroughs are found by a loop that converts scouting into sealed, falsifiable, priced bets — and folds the verdicts back. Every PLANNING refinement from wave 60 onward cites the mines it consumed (or rejects them, with reasons). The outer loop now has an evaluation of its own.

## The loop (six stages, each with a law)

1. **scout** — fetch sources with raw receipts committed (`scouts/receipts/<date>-<topic>/`). No claim without a receipt file.
2. **extract** — distill the deeper abstraction (not the surface story) into the scout doc; each abstraction names its fleet analog if one exists.
3. **score** — mines are triaged by a pairwise Elo tournament (`scripts/lode_score.mjs`) recorded in `scores.jsonl`. Every pair judgment carries a written reason and is disclosed as keeper judgment (not blind); the scorer itself is deterministic and stranger-verifiable.
4. **register** — a mine becomes a fleet experiment only when its falsifiable prediction is sealed (sha256 of the exact prediction text in `mines.jsonl`) and the target lane's registration cites the mine id. `scripts/lode_validate.mjs` enforces schema + hash + append-only, fail-closed (exit 2), with tamper self-tests.
5. **lane** — top-Elo, priced mines enter the next wave queue in PLANNING.md; each queue item cites its mine id.
6. **fold** — verdicts update `registry.jsonl` (the fleet experiment registry — every pre-registered prediction set across our repos, its verdict commit, and status). Append-only; the registry is the fleet's memory of what was predicted and what happened.

## Files

| file | law |
|---|---|
| `mines.jsonl` | mined hypotheses; `pred_sha256` = sha256 of the exact `prediction` string; append-only |
| `scores.jsonl` | Elo tournament records; pairs reference mine ids; append-only |
| `registry.jsonl` | every pre-registered prediction set of record across the fleet; verdict + commit; append-only |
| `lessons.jsonl` | structured lesson objects (M2): claim, evidence link, failure class; briefs cite them |

## Fail-closed rules

- Any `pred_sha256` mismatch, duplicate id, schema violation, or non-monotone ts → **exit 2**, nothing partial.
- Append-only is checked across commits: `lode_validate.mjs --against <old-copy>` proves the old file is a byte-prefix of the new one.
- A mine is never edited after sealing; it is superseded by a new line with `supersedes: <id>`.
- Novelty gate (M1): a registration whose mine does not state `nearest_prior` and the delta from it is rejected at stage 4.
- Self-tests must pass before any push that touches `scripts/` (the M7 tripwire applies to lode itself).

## What this is not

- Not a leaderboard of truth. The Elo ranks bets-when-funded, not facts; the registry records what happened.
- Not blind judging. Elo input is disclosed keeper judgment with reasons — the honest part is the disclosure plus the sealed predictions the ranking feeds.
- Not a place for results. Verdicts live in the lanes' own receipt chains; the registry only indexes them.
