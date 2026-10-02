# M13 LLM-EXECUTOR LEG — wave 70-a (task 70-a, lane a)

**Mine:** M13 (lode/mines.jsonl row 13, pred_sha256 b5b1b021…): *"procedure value is executor-scoped; nested loops must re-seal what they inherit."*
**The NULL this lane folds:** the 68-f run's receipt (`receipts/m13-harness-run-1.jsonl`, `m13RegistryStatus`) records that M13's **LLM-executor scope** is *untested — folds NULL by wave-70*. The 68-f harness resolved the deterministic-executor scope (node/python: sealed-deterministic procedures re-sealed byte-identical — the falsification direction) but could not test what happens when the executor is **an LLM**.

## 1. Design: an LLM executor is an LLM asked to EXECUTE the SPEC

An **LLM executor** is an LLM asked to execute a sealed procedure's **SPEC — not its code**: the executor receives the documented input→output law plus the sealed prefix **as bytes** and must produce the output. This is exactly the nested-loop inheritance shape M13 warns about (an inherited procedure carried across an executor boundary), with the executor swapped from a deterministic runtime to a model.

**Re-seal question:** do TWO DIFFERENT LLM executors produce byte-identical outputs for a deterministic procedure?

**Registered gradient prediction** (sealed pre-run in `seeds/m13-llm-leg-70a.json`): LLM executors **diverge** on free-form generation (executor-scoped at byte level) but may **agree** on constrained-output procedures (structured/enum outputs where the law pins the answer); hand-execution of an arithmetic law is expected to **diverge or fail** (models are bad executors of arithmetic laws). *That gradient IS the finding* — it reduces M13's LLM-executor scope from a binary ("procedure value is/isn't executor-scoped") to a lawful function of output-space constraint.

**The LLM-leg re-seal rule (the class comparator):** the 68-f rule ("byte-identical output AND same verdict") is for code executors. For LLM legs the harness carries an **outcome-class comparator**: *same outcome class = agreement for class-sealed procedures; byte-sealed stays the law for code executors.* Byte comparison remains EXACT content equality with **no normalization** — executor noise IS the finding. Legal-shape parsing (first balanced object, exact key set, sealed enum) and the free-form rubric (refusal/store-credit/manager signals, priority `deny+store-credit > manager-review > deny-only > other`, where `other` never agrees — with anything, including another `other`) are pre-registered in `tools/fixtures/m13-llm-leg-specs.json` (`comparatorRubric`).

## 2. The three procedures (escalating constraint)

| leg | class | constraint | predicted |
|---|---|---|---|
| `freeform-refund-denial` | free-form | one-paragraph denial for the milk-no-receipt case; surface form free | byte divergence, class agreement |
| `constrained-policy-outcome` | constrained | exactly one JSON object `{outcome: full-refund\|store-credit\|manager-review}` per the frozen policy | class agreement (the law pins the answer) |
| `computation-fnv-checksum` | computation | hand-execute FNV-1a-32 over `M13-LLM-LEG-70A:milk-no-receipt` per the fully specified law | divergence or failure |

The sealed prefix rides in every prompt: the fleet's own `milk-no-receipt-within-7` case (facts inherited from the LIVEFREEZE-1 frozen table) plus the written policy quoted verbatim. Ground truth for the checksum (`88A64422`) is computed by the **68-f-certified sealed module** (`tools/m13-procs.mjs`, procsHash re-verified against `seeds/m13-harness-68f.instrument-seal.json` at lane open, FNV KATs `811C9DC5`/`E40C292C`, independent python3 reference) — the reference executor is itself under a previous lane's refuse-stale seal.

Both executors receive **byte-identical prompt bytes** (single user message, temperature 0, per-leg max_tokens). Executors: **X = deepinfra `openai/gpt-oss-20b`**, **Y = typesafe `jev-1.13.0`** (chat/completions), with the named fallback **kimi `moonshot-v1-8k`** (the mission's "groq fallback" slot; groq was receipted region-blocked at wave 63).

## 3. Instrument, seals, budget

- **Runner:** `tools/m13-llm-leg.mjs` (m13-llm-leg@1) — clients, comparator, receipt writer, `seal/verify/run` CLI. Zero shell-out, zero npm deps.
- **Two seals ride together (the 68-f ritual):** (1) `tools/preregister.mjs` seals the 4 predictions (`seeds/m13-llm-leg-70a.seal.json`, claimsHash `sha256:3ef79c3f…`); (2) the instrument carries its own refuse-stale seal (`seeds/m13-llm-leg-70a.instrument-seal.json`) over **specs + runner + ground-truth module**, verified fail-closed at run time (`E_SPECS_MODIFIED` / `E_RUNNER_MODIFIED` / `E_GROUNDTRUTH_MODIFIED`).
- **Calibration:** `node --test tools/m13-llm-leg.test.mjs` — 12/12 zero-network KATs (classifier, constrained parser, checksum parse, byte law, prompt-assembly byte-identity, seal round-trip + tamper refusals). Full tools suite 139/139.
- **Pre-registration push:** commit `9ab0cc4`, ls-remote verified remote==local BEFORE any external call.
- **Budget law (sealed pre-run):** hard cap 10 external calls = 6 core (3 procedures × 2 executors) + 2 stability diagnostics + ≤2 repair; one receipt row per attempt **including failures**; a leg that cannot complete scores honestly (never a pass).

## 4. Run outcome (receipts: `receipts/m13-llm-leg-1.jsonl`)

**The budget cap held; the pair experiment did not execute.** 10/10 external calls consumed, 8 of them channel failures:

- **typesafe `jev-1.13.0` /v1/chat/completions — DEAD (HTTP 404)** on all 3 attempts: the endpoint probed alive at wave 63 is gone. (The typesafe `/v1/systemone` typed-QA channel was alive at 00:30Z today per `lode/engine/receipts/2026-10-02-channel-probe/`, but it cannot produce free-form prose.)
- **kimi `moonshot-v1-8k` (named fallback) — DEAD (HTTP 429)** on all 3 attempts: account suspended, insufficient balance. (Provider-echoed account identifiers in the error bodies are masked pre-commit, disclosed in the `redaction-note` receipt row.)
- **deepinfra computation leg — the gpt-oss-20b reasoning-exhaustion trap** (2 attempts, HTTP 200 but empty final content at max_tokens 4096): the model spent the entire token budget in the hidden analysis channel hand-executing 28 FNV rounds and never emitted the final channel. Receipt rows 7–8. Receipt-gap disclosed: usage was not captured on the error path.

**Score:** `seeds/m13-llm-leg-70a.verdict.json` — **PENDING ×4** (P1–P4), the honest "clause unexercised this wave" state. Note: the sealed refusal branches promised VACUOUS for incomplete legs; the scorer returned PENDING because the vacuous markers sit at the metrics' *parent* objects while the claims walk dotted child paths — the preregister tool's ancestor-vacuous lookup gap (second instance of the 69-d dotted-path quirk; upstream note filed). Claims and results are UNTOUCHED; nothing was edited to force a different verdict.

**Real executor artifacts (the X half of the pair, receipted):** gpt-oss-20b at temperature 0 produced (a) a policy-conformant 341-byte denial classified `deny+store-credit` by the pre-registered comparator (row n=1), and (b) a byte-legal `{"outcome":"store-credit"}` for the constrained leg (row n=4) — matching the frozen fleet law (no receipt + within-7 → store credit). A follow-up lane needs only the 3 Y-half calls against a live second executor.

**Channel map for the next lane (zero calls spent on this):** X = deepinfra gpt-oss-20b works (add `reasoning_effort=low` — or a shorter input/larger max_tokens — for any computation leg); Y candidates: a SECOND deepinfra model (e.g. `Qwen/Qwen3.8-27B`, same proven channel — still a different executor stack) or a re-probed typesafe systemone. The claims seal is untouched and reusable only with the Y swap receipted as an instrument revision (executor identity is design, not sealed claim text).

## 5. Registry status

M13's LLM-executor scope remains **untested — attempted, receipted, channels degraded** (PENDING ×4 beside untouched sealed claims). The deterministic scope stands as resolved by 68-f. The keeper folds the wave-70 registry note on these receipts: the honest registered outcome ("untested, not confirmed") now carries a complete channel map, a sealed-and-verified instrument, and two real executor artifacts — the next lane's marginal cost is 3–6 healthy calls.

## r2 addendum (70-a-r2 finisher lane, 2026-10-02T19:xxZ)

Run 1 (dead lane 70-a) ended PENDING x4: typesafe 404 dead, kimi 429 suspended, gpt-oss-20b reasoning-exhaustion on the computation spec — 10/10 budget, 2 ok / 8 failed, receipted in receipts/m13-llm-leg-1.jsonl. Instrument revision r2 (receipted in specs-r2 + seal-r2, claims seal 3ef79c3f untouched): Y -> deepinfra Qwen/Qwen3.5-27B per the run-1 repair recipe (groq re-probed 403 Forbidden, still region-blocked), computation.maxTokens 4096->16384. Run 2 (receipts/m13-llm-leg-2.jsonl, 8 calls: 3 ok / 5 failed) was killed by the lane watchdog mid computation-Y; results re-derived OFFLINE by tools/m13-llm-leg-redo.mjs using the sealed runner's own comparator exports (runnerHash asserted). Scored with tools/preregister.mjs after a receipted scorer fix (op 'expr' claims were permanently PENDING — the metric field IS the expression; third instance of the 69-d dotted-path quirk; suites 31/31 green). Verdict (verdict-r2): **P2 PASS** — freeform byte-diverges (X 335 B, Y 526 B) yet class-agrees (both deny+store-credit) — the class-comparator re-seals the free end exactly as predicted. P1/P3/P4 PENDING (legs incomplete: Qwen thinking-mode exhausts maxTokens 400 even on the trivial constrained leg; gpt-oss-20b emits NO final channel content on the arithmetic spec at 4096 AND 16384 — the computation trap is structural, not budget size). Cross-run receipt: constrained-X byte-identical across lanes (sha 9840ad2c); freeform-X NOT (335 vs 341 B, temperature-0 LLM prose is not cross-run byte-stable — executor noise IS the finding). preregister-69a.* untracked files left untouched (dead 69-a lane's sealed claims, not this leg's).
