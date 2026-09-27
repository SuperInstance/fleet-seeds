# Tavern round-11 — the reasoner takes the seat

First tavern round where a real reasoner answers. Every prior reasoner seat
(r8 SEED-38-A, r9 asset slots 1-3, r10 deepseek houses) was receipted ABSENT
fail-closed — the DEEPSEEK_API_KEY arrived this wave, and this lane spent it.

## Registration (pre-run, before ANY api.deepseek.com traffic)

- `predictions/45a-round11-predictions.json` — sha256
  `cdf5907ba7452222445bfb7e3e9e5c684196e0a7363fa71d01f12b141fe56e22`,
  mtime 2026-09-27T23:05:26Z (file mtime = the receipt, r10 convention).
  Canonical copy: `/home/z/my-project/scripts/45a-round11-predictions.json`.
- 7 numbered predictions (P1-P7) + the r9-sealed reasoner cache-curve
  registration carried forward (asset byte-verified
  `3ccb796a…` = qthe/situations/r9_prefix_asset.txt, 2808 bytes).
- Zero deepseek calls before this file existed. GitHub API reads (pong #49
  ground truth) and one public pricing-docs GET are receipted inside it.

## Design in one paragraph

The r9-registered reasoner experiment RUNS at last: three deepseek-reasoner
calls over ONE byte-identical prefix (the reasoner's own round-nine asset),
distinct user texts per slot — blind prior, then the byte-exact round-ten
E-Q9 state that moved the typesafe instrument JEV from 0.35 to 0.97, then a
pong49 battery — with `prompt_cache_hit_tokens` receipted per call. Around
the curve: a byte-identical repeat of the state slot (repeat-stability vs
JEV's 0.00 delta), and a deepseek-chat second seat on the same state
(Flash-as-iterator agreement, r9 definition). Noul discipline — JEV's
no-confidence-field law, 22/22 wire rows r8-r10 — is mapped onto a
strict-JSON contract and tested for real: does it survive a reasoning LLM?

## Layout (this lane owns ONLY tavern/round-11/)

- `predictions/` — pre-registered claims (pre-run commit)
- `answers/deepseek-round11.jsonl` — one row per HTTP attempt, r7/r10 row
  schema: requested/served model, prompt/response hashes, raw content,
  parse-repair steps, full usage (incl. cache + reasoning tokens), latency
- `raw/` — raw API response JSON per call, byte-exact as received
- `round11_ledger.jsonl` — round-11's own stone-v1 chain (stone law:
  row_hash = SHA-256(canonicalJSON([prev, row-without-row_hash])),
  genesis STONE-GENESIS-1) — kept lane-local because the main ledger's
  builder (tavern/build_ledger.mjs) is another lane's file and its
  quilt-stone import does not exist in this clone; the keeper can fold
  these rows into the main ledger verbatim (they verify standalone)
- `round11_summary.json` — scorecard, spend, honest surprises, verdict
- `verify_round11.mjs` — independent verifier: chain + rows + raws re-check
