# Tavern round-12 — the blind prior, asked asset-free (+ the round-11 ledger fold)

Round-11 sealed two open threads; this lane closes both.

## 1. The LEDGER FOLD (r11 open thread, closed first)

`round11_ledger.jsonl` (6 rows, tip `db324fd0…`) is folded into the main
tavern ledger **append-only**:

- source rows 1-5 (the five `tavern.round` content rows) re-parented onto the
  pre-fold main tip `1c03b2eb…` — content deep-equal to their standalone
  sources modulo `row_hash` (stone-v1 law: `row_hash =
  sha256(canonicalJSON([prev, row-minus-row_hash]))`, genesis
  `STONE-GENESIS-1`);
- a `tavern.fold` receipt row carries the round-11 `stone.header` **verbatim**
  (embedded object, standalone hash `3ee287f1…` preserved), the source file
  sha, the source tip, the pre-fold tip, and the row mapping;
- main ledger 52 -> 58 rows, merged tip `1bf7f3d6…`; no existing row edited,
  reordered, or deleted; the standalone round-11 chain remains on disk
  untouched (`verify_round11.mjs` stays ALL CHECKS PASS 16/16);
- design registered BEFORE the fold build (predictions `ffb3d245…`,
  `fold_design_registered_before_fold_build`); builder-compatibility note in
  the receipt: `build_ledger.mjs`'s SECTION-B replay law accepts the fold
  unchanged once its `quilt-stone` import exists in some clone.

Tooling: `scripts/46d-round12-fold.mjs` (producer, fail-closed guards) +
`verify_round12.mjs` sections B1-B13 (independent verifier).

## 2. The ASSET-FREE blind prior (r11's designed contamination, fixed)

r11's blind slot was receipted designed-contaminated: the r9 prefix asset
itself carries E-Q8 ESTABLISHED, and the model noticed. Round-12 asks BOTH
seats the same prior question from NOTHING but the claim's definition:

- exact prompt texts registered verbatim pre-run (predictions
  `ffb3d245908894642f3ea74789df5160c5cf093a0a0ce8ef24a018733a8db192`, mtime
  2026-09-28T00:42:17Z, committed before any deepseek traffic — the verifier's
  D16 re-derives call-ts > registration-commit-date from git);
- mechanical asset-freeness re-checks (D9 forbidden substrings, D10 no long
  shared token with the r9 asset);
- the cache curve is the null signature of the design:
  `prompt_cache_hit_tokens 0/0/0/0`.

Send order: GET /models -> reasoner-blind -> chat-blind -> reasoner-reveal ->
chat-reveal (both blinds precede both reveals). Cap 6 calls, 5 spent,
max_tokens 2000 every POST, all rows off-peak, $0.003016.

## RESULT (sealed 2026-09-28T00:5xZ)

**Verdict one-liner:** the asset-free chat prior lands at **0.35** — exactly
the instrument's own sealed anchor — and moves **+0.58** to 0.93 on the
receipt state (reasoner thinking-voice draft 0.99, same as r11): the
calibration gap is caused by the receipts, not by the contaminated asset.

- P1 `gap_confirmed_one_seat_other_unmeasured` (chat gap confirms all three
  registered clauses; the reasoner blind trace starved at the cap — 6/6
  reasoner calls voiceless across r11+r12, the failure is now economics, not
  design).
- P2 `any_component_unmeasured_partial` per its registered rule, with the
  honest miss receipted: the measured reveal pair sits at 0.06 vs the 0.05
  band (r11's 0.02 did not fully replicate).
- P3 HOLDS on the harder surface (contract-only prohibition): zero noul
  violations in all 4 observed answers.
- P4 HOLDS: fold verifies end-to-end; r11 verifier stays 16/16.
- P5 under all caps; spend modal missed LOW a 4th straight round.
- Scorecard: 5 resolved, 3 modals hit, mean multiclass Brier 0.395.

## Layout (this lane owns ONLY tavern/round-12/ + the fold)

- `predictions/46d-round12-predictions.json` — pre-registered claims P1-P5,
  verbatim prompts, fold design (pre-run commit)
- `answers/deepseek-round12.jsonl` — one row per HTTP attempt + extraction
  rows, r11 row schema
- `raw/` — raw API response JSON per call, byte-exact as received
- `scripts/` — register / fold / run / seal (zero deps, deterministic seal)
- `fold_verdict_at_seal.json` — verifier receipt at seal time
- `round12_ledger.jsonl` — round-12's own stone-v1 chain (r11 convention:
  lane-local, verifies standalone; folding it into the main ledger is the
  next keeper's thread)
- `round12_summary.json` — scorecard, spend, honest surprises, verdict
- `verify_round12.mjs` — independent verifier: registration + fold + r11-green
  + run + lane ledger + key scan, one command, exit 1 on ANY failure
