# Dungeon-family playtest — external lane, 2026-10-02T22:23Z

## What ran (receipts in quilt-dungeons scores.jsonl, hash-chained)

`quilt-dungeons` @ `cc23a4e` (+ correction `6369ccb`):

- Suite: **20/20 pass** incl. the Determinism Law (npm test, 3.78s).
- External-lane matrix: `hunter` seeds 1-3, `greedy-loot` seeds 1-5, `survivor`
  seeds 1-5 → **13 records** appended to the score ledger.
- Gym's own verifier: `verifyScores(scores.jsonl)` → `{ok: true, count: 37}`
  (24 original + 13 external; prev-links AND canonicalJSON hash re-derivation).
- Determinism re-run: `hunter` seed 1 twice → both trajHash `f869bbdc2dff0e9d…`
  — byte-identical.

## Standings (score / turns / won)

| script | s1 | s2 | s3 | s4 | s5 |
|---|---|---|---|---|---|
| hunter | 30/200 | **51/200** | 20/200 | — | — |
| greedy-loot | 30/200 | 5.7/23 | 20/200 | 5.1/29 | −3.1/31 |
| survivor | 30/200 | 20/200 | 20/200 | −2.1/21 | 18/200 |

Findings: hunter's aggression pays on seed 2 (51, best of matrix); greedy-loot
dies fast on hostile seeds (2, 4, 5 all <35 turns, two negative); survivor is
consistent but never excels. **No baseline won in 200 turns** — the gym's win
condition stands open for the ML-zoo learners.

## Anomaly: dungeon-ml-zoo is an empty repo

Ground truth via `git ls-remote` (GitHub API `size` field is stale/broken for
this whole family — reads 0 even for quilt-dungeons which provably has
content; do not trust it):

- `dungeon-jev` 2 refs ✓, `dungeon-micromoth` 2 refs ✓, `dungeon-syncopation`
  2 refs ✓, `quilt-dungeons` 2 refs ✓
- **`dungeon-ml-zoo`: 0 refs — the five learners + tournament never landed**
  (or were deleted post-push; API pushed_at 21:48:24Z, default branch main,
  zero commits).

The fleet's own vendored-pending-merge pattern in dungeon-jev anticipated
missing siblings at lane start — but at read time only ml-zoo is missing. If a
lane intended it to exist, this is the anomaly to chase; the playtest above
used the repo-local baselines instead.

## Receipts

- quilt-dungeons: `cc23a4e` (scores), `6369ccb` (count correction — my first
  commit message overcounted appends 13-vs-10 inside the 37-chain; a homebrew
  verifier of mine also false-flagged genesis prev=0x0 — the gym verifier is
  the authority and passes 37/37).
- Corrections culture: the wrong numbers lived <4 minutes and are receipted
  beside the fix.
