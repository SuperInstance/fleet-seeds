# JEV remap — round 9, the jev-preview question (lane 40-b, jev-cartographer, wave 40)

Sealed 2026-09-27 (sandbox clock; briefing calendar date 2026-09-28 — both carried AS SAID).
Dedicated clone `fleet-seeds-lane40b`; no qthe writes; no other paths touched.

Predictions were registered BEFORE any wire traffic:
`/home/z/my-project/scripts/40b-jev-remap-predictions.json` (mtime 2026-09-27T17:03:08Z,
sha256 `40b91aa4…76db6`). First /v1/models call: 17:06:43Z. Receipts per line:
`tavern/jev_remap_r9_rows.jsonl` (8 rows: open, models-list, 2 battery, 1 mislabeled probe,
corrected probe, 2 close rows). **4 paid POST attempts (3× 200 billable, 1× 400 unbilled),
budget 4/10.**

## 0. The headline

**`jev-preview` is `jev-1.13.0` — the same served model as `jev-latest`.** Both battery calls
resolved to `model: "jev-1.13.0"`, and the docs fetched this round say it outright:
*"jev-preview currently points to the same model as jev-latest. There is no preview build
available right now."* (docs.typesafe.ai/models.md, fetched 2026-09-27). The round's
"two models" premise holds on the catalog (both listed, both release 2026-09-10T18:3x) but the
preview is an **alias identity, not a second instrument**. The remap therefore delivers two new
wire facts instead: (a) the preview alias wire-verified for the first time (r8 never requested
it), and (b) the **first direct measurement of JEV's repeat variance on our own battery** —
two same-weights calls on byte-identical state differ by ≤0.04 on every field, exactly inside
the vendor's "extremely consistent / within a few hundredths" claim.

## 1. Surface table — r8 vs r9 per model

Wire shape unchanged (live `api.typesafe.ai/openapi.json` fetched this round: exactly
`NoulQuestion` / `ChoiceQuestion` / `ScoreQuestion`; `questions` = named map; response
`{model, answers, usage}`; `NoulAnswer` required = `{type, noul}` — **still no confidence on
noul at the schema level and on every wire row**).

| aspect | r8 (2026-09-27, jev-1.13.0) | r9 jev-latest | r9 jev-preview |
|---|---|---|---|
| served `model` (response) | jev-1.13.0 (latest alias; versioned pinned) | **jev-1.13.0** | **jev-1.13.0** (alias wire-tested first time) |
| question types on wire | noul / choice / score | same | same |
| noul confidence field | structurally absent | absent (4/4 rows) | absent (4/4 rows) |
| battery `p_eq8_artifact` | 0.39 | 0.35 | 0.35 |
| battery `p_scn001_survives` | 0.27 | 0.27 | 0.28 |
| battery `p_pong49_external_comment` | 0.15 | 0.13 | 0.14 (question still OPEN) |
| battery `p_guest_stands_c5` | 0.28 | 0.23 | 0.24 |
| choice `guest_c5_stance` | stand 0.53, conf 0.29 | stand 0.58, conf 0.37 | stand 0.59, conf 0.40 |
| score `guest_surviving_standing` | 0.51, conf 0.49 | 0.52, conf 0.48 | 0.55, conf 0.45 |
| usage (battery call) | 1324 in / 151 out | 1113 in / 151 out | 1113 in / 151 out |
| latency (battery call) | 425 ms | 210 ms | 204 ms |
| 11-level score probe | 400 `{"detail":"Too many score levels. Must have at most 10 levels."}` | not re-run | **400, byte-same detail string** (corrected probe) |
| models list | 2 aliases, rel 2026-09-10 | byte-equivalent list (same names/descriptions/timestamps) | — |

Comparability method: the r8 battery's state text (1985 chars) and six questions were replayed
**byte-identically** — state sha256 `d33f1717…2f0458` re-verified against the r8 receipt before
the calls (`state_matches_r8_receipt: true` in the open row). The r8 surface-probe state texts
(control noul, structured batch) are NOT recoverable (probe scripts lost in the sandbox
recycle; only their state SHAs survive) — declared in the predictions file, mitigated by using
the battery call, whose text IS receipted verbatim, as the shared surface probe: it exercises
all three types on both models in one call.

## 2. E-Q8 float-artifact probe vs the prior

The verbatim r8 question ("p = your probability that E-Q8, WHEN RUN, establishes the
float-only artifact per the pre-registered fork in `eq8`") was held frozen — including its
"The run has NOT happened yet" clause — so the probes stay blind priors on a private experiment
(the models have no channel to E-Q8's outcome).

| instrument | p(float artifact est.) | vs established TRUE → Brier |
|---|---|---|
| r7 typesafe prior (noul) | 0.47 | — |
| r8 battery (jev-1.13.0) | 0.39 | 0.3721 |
| r9 jev-latest | 0.35 | 0.4225 |
| r9 jev-preview | 0.35 | 0.4225 |
| lane 37-a prior (for reference) | 0.66 | 0.1156 |

**Verdict: the float-artifact-skeptical prior REPRODUCES (0.35, within 0.04 of r8's 0.39) — and
it is still wrong-side-of-the-receipt.** E-Q8 is ESTABLISHED (float HOLDS via
3·double(2/3)=2.0 exact-zero tie-snap vs fixed 3·2863311531=2S+1→+1 move; qthe 4b1fea4, both
families, tick 1, |dd|=1, zero UNEXPLAINED). The instrument moved −0.04 on identical state —
i.e., repeat noise, not learning. On the artifact question JEV's calibration got marginally
WORSE (0.3721 → 0.4225). The r8 lesson stands: where the tavern's receipts already point, JEV
underconfides; its value is adversarial-structure reads (its SCN-001 0.27 was its best call and
the r9 runs reproduce 0.27/0.28 on the dead claim too).

Confidence-ish field behavior: none on noul (as r8, as schema); choice/score confidences are
the noisiest fields across identical calls (choice conf 0.29 → 0.37/0.40 on the same question —
the largest single-field delta of the whole remap; do not threshold on repeat-call confidence).

## 3. Battery-prior deltas and re-pricing

Brier over the 3 resolved battery questions, r9 numbers (hindsight-frozen state, same rule):
- jev-latest: (1−0.35)² + (0.27−0)² + (1−0.23)² = 0.4225 + 0.0729 + 0.5929 → mean **0.3628**
- jev-preview: 0.4225 + 0.0784 + 0.5776 → mean **0.3595**
- r8 run: 0.3211; lane 37-a: 0.1327 (unchanged, untouched)

Reading: same instrument, second run, aggregate moved −0.04/+0.04 per question and the mean got
slightly worse — inside repeat variance. `p_pong49_external_comment` remains unresolved
(window closes 2026-09-29T10:04:00Z; r8 0.15 → r9 0.13/0.14; keeper scores it when the window
closes). The r8 structural contradiction (choice-stand 0.53 vs noul-stand 0.28) also reproduces
(0.58/0.59 vs 0.23/0.24) — the vendor-documented invariant break is stable across runs, so the
guest's "self-contradicting instrument" pricing ages well.

## 4. Docs / pricing re-check (P3: UNCHANGED, hit)

Fetched 2026-09-27, all cited URLs live: `docs.typesafe.ai/llms.txt`, `/models.md`,
`/primitives.md`, `/primitives/score.md`, plus `api.typesafe.ai/openapi.json`.
- Price **$42/Btok = $0.042/Mtok input; output free** — identical to r8 (models.md line-level
  match; OpenAPI Usage description: "Output tokens are currently free of charge").
- Rate limits **250,000 tok/s / 1,200 req/min**, dynamic warning, 429 semantics — identical.
- Context **64k/request; 32k state + longest question** — identical.
- Alias table: `jev-latest` → `jev-1.13.0`, `jev-preview` → `jev-1.13.0` + the explicit
  no-preview-build warning — identical to r8's alias read, now wire-confirmed by us.
- No separate pricing page exists; models.md is the pricing surface (as in r8).

## 5. Honest surprises (all receipted, none editorialized)

1. **My first fail-closed probe was mislabeled.** `r9-fail-closed-score11-preview` actually
   carried 5 criteria (I misread the battery's 4-level score as a 10-level template and
   appended one). The row stands AS SAID with its full request body as proof; a corrected
   genuine-11-level probe was run and returned the exact r8 400 detail-string — so the 10-level
   ceiling HOLDS and the r8 registered expectation is confirmed on the preview alias. Same bug
   class as r8's batch-v1 (criteria-length misread); twice is a pattern — battery templates get
   re-derived, not eyeballed.
2. **OpenAPI schema is looser than the server.** Live `ScoreQuestion.criteria` says
   `minItems: 1` with NO max, yet 11 levels → 400 detail-string. The schema is not the contract
   for limits; semantic limits stay 400-not-422 (r8 finding, re-confirmed).
3. **Same state + same questions billed 1113 input tokens vs r8's 1324 (−16%).** The state text
   is provably byte-identical (sha match); the question-object bytes may differ from r8's lost
   request, so this is suggestive, not proven — a usage-accounting or tokenizer-side delta worth
   one clean A/B next round.
4. **"Preview" ≠ second model.** The genuinely new wire facts were alias identity + repeat
   variance (≤0.04), not a better-calibrated instrument. Anyone expecting a smarter preview
   should pin `jev-1.13.0` and price answers, not names.
5. **Choice confidence is the noisiest field** (±0.11 across identical calls); noul values are
   the stablest (≤0.05). Thresholding doctrine: gate on noul/probabilities, never on confidence
   repeats.

## 6. Prediction scorecard (registered pre-wire, scored against receipts)

| id | modal | p | outcome | hit? |
|---|---|---|---|---|
| P1 structural-same (3 types, no noul conf) | STRUCTURAL_SAME | 0.85 | same, wire + schema | **HIT** |
| P2 preview p_eq8 ∈ [0.29,0.49] | WITHIN_0.10_OF_0.39 | 0.60 | 0.35 | **HIT** |
| P3 docs/pricing unmoved | UNCHANGED | 0.80 | unchanged (cited above) | **HIT** |
| P4 preview agrees with latest (±0.15 noul / same modal / ±0.25 score) | AGREE | 0.70 | deltas 0.00–0.01 noul, 0.03 score, same modal | **HIT** |
| P5 spend $0.00010–0.00050 (modal 0.00018) | — | — | $0.000108 (2576 in-tok; 400 unbilled) | **HIT on range, modal miss (−39%)** |
| P6 preview serves jev-1.13.0 | same served ID | 0.60 | jev-1.13.0 both | **HIT** |

6/6 modals, 5/6 with number-hits (P5 landed at the bottom edge of its range). Small sample,
same-instrument round; the scorecard's honest value is that all six were written before the
first packet left.

## 7. Spend receipt

4/10 paid-call budget used. Billable: 2576 input tokens (3× 200-POSTs), 321 output tokens
(free), **$0.000108** at the re-verified $0.042/Mtok basis. The 400 probe returned no usage and
is receipted as unbilled (assumption, not a vendor statement). GET /v1/models: 0 tokens.
No retries were needed; zero unreceipted failures; zero keys printed or committed.

## 8. Open threads for the next JEV round

- Score the pending pong49 question when the window closes (2026-09-29T10:04:00Z) — r9 rows
  already carry the instrument's fresh 0.13/0.14 read.
- One clean usage A/B (identical bytes, alias vs alias, twice) to settle the 1113-vs-1324
  token-accounting delta.
- The r8 surface-probe texts are unrecoverable; if a future round re-runs them, first re-derive
  them from the r8 receipts' SHAs as a checksum target, not from memory.
- When a real preview build ships (`model` field diverges from `jev-latest`), re-run this exact
  battery-verbatim remap — the runner (`scripts/40b-jev-remap-run.mjs`) is alias-parameterized
  and resume-ready for that day.
