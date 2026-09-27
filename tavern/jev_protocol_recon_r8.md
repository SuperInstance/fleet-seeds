# JEV protocol recon — round 8 (lane 37-a, wave 37)

Sealed 2026-09-27 by lane jev-smith. Sources read via GitHub API + raw.githubusercontent with
`$GH_TOKEN` (org `typesafe-ai` official + org `TypeSafeAI` community), plus the vendor's live
docs at docs.typesafe.ai (`llms.txt` index + key pages). Pinned SHAs read:

| repo | org | pinned SHA read | pushed |
|---|---|---|---|
| typesafe-sdk-python | typesafe-ai | `f078f1e208a0d885154dc758344ae4fce77ac168` (main) | 2026-09-26 |
| typesafe-sdk-js | typesafe-ai | `66880ccded6cb642dc1809620c2b108c33730214` (main) | 2026-09-15 |
| system-one-adapter-python | typesafe-ai | `e1d4cc938204b22fc5a3c3aca7044072fe3f712d` (main) | 2026-09-22 |
| skills | typesafe-ai | `65a39f393687675ce170e6094757de20370365b9` (main) | 2026-09-12 |
| jev-harness | TypeSafeAI | `44a4e3a17013b6458efd4cc2b3e8ca45efae60b8` (main) | 2026-09-26 |
| typesafe-router | TypeSafeAI | `4c6855ccfc92ff0e40a71661685c9ead327a3715` (main) | 2026-09-26 |
| typesafe-playground | TypeSafeAI | `8dea7139fd18b8bb66d8a739d39547b621460d1b` (main) | 2026-09-26 |
| clarity-judge | TypeSafeAI | `f7051ab8115aca726cdc16a4d131aeaa527bdabf` (main) | 2026-09-26 |

Docs fetched 2026-09-27: `docs.typesafe.ai/llms.txt`, `/api.md`, `/models.md`, `/primitives.md`,
`/confidence.md`, `/model-jaggedness/jev-1.13.md`. The single most authoritative artifact is the
SDK's generated wire schema `src/typesafe_sdk/_schemas/models.py` — header states it is codegen'd
from **https://api.typesafe.ai/openapi.json**.

## 1. Question-type table (the full documented surface)

The wire defines **exactly three** question types. No fourth type appears in either official SDK,
the OpenAPI-derived wire models, the agent skill, or any of the six community repos read. The
Python SDK is deliberately forward-compatible: `_prepare_system_one_response` (response_types.py)
**drops answer objects whose `type` it does not recognize** (logs a warning, keeps the raw payload
on `response.raw_http_response`) — i.e., the vendor expects future answer types to be addable
without an SDK major bump. None exist today in the wild reads.

| type | question fields | answer fields | notes from source |
|---|---|---|---|
| `noul` | `instructions?` (string\|object\|array), `criteria?` = `{true?, false?}` outcome descriptions | `type`, `noul` (float 0–1 = p(yes)) | **No `confidence` field — noul carries none** (docs + SDK). Criteria keys are literally `true`/`false`. |
| `choice` | `instructions?`, `criteria` = map label → description (or `null`) | `type`, `choice` (argmax label), `confidence` (0–1), `probabilities` (map, sums ≈1) | Max **255 options** (docs/api.md). JS SDK throws if criteria is an array. |
| `score` | `instructions?`, `criteria` = ordered array of level descriptions | `type`, `score` (probability-weighted expectation — can land between levels), `confidence`, `legend` (level→desc), `probabilities` (string-keyed, sums ≈1) | API accepts **2–10 levels** (docs). Python SDK validates ≥1, JS SDK ≥2 (SDK-side divergence, receipted). Changelog v0.6.0 (09-15): criteria moved from int-keyed dict to ordered sequence. |

Cross-cutting field semantics (per OpenAPI models + api.md):
- `state`: `string | object | array` — JSON objects/arrays are first-class (named fields beat prose; the skill says prefer named JSON fields when context has parts).
- `instructions` / `criteria` values may each be `string | object | array`; reference nested state with backticked paths (`` `ticket.messages[0].text` ``).
- `model`: string, required on the wire (SDKs default it). Response `model` reports the **versioned** ID that answered and may differ from the alias sent.
- **Question IDs are NOT sent to the model** — they are code-side keys only; all meaning must live in instructions/criteria/state.
- All questions in one request evaluate **in parallel against the same state** and cannot see each other's answers (batching is the only fan-out mechanism; there is no separate batch endpoint).

## 2. Endpoints, limits, errors — the full wire surface

| item | value | source |
|---|---|---|
| Evaluation | `POST /v1/systemone` — body exactly `{state, model, questions}` | constants.py `SYSTEM_ONE_PATH`, js client.ts, openapi models |
| Model inventory | `GET /v1/models` → `{models: [{name, description, release_date}]}` — **endpoint existed, we had never called it** | constants.py `MODELS_PATH`, endpoints.py `prepare_models` |
| Streaming | none (buffered JSON only; no SSE/stream field anywhere) | full client sources |
| Batching endpoint | none — batching = many questions in ONE systemone call | docs primitives.md |
| Idempotency params | none (no idempotency key header; only `X-TypeSafe-Retry-Count` on retries) | constants.py, js client.ts |
| Extra request params | none documented; SDK's Python `extra_body` merge exists but wire schema has only the 3 fields | endpoints.py |
| Rate limits (jev-1.13) | **250,000 tokens/sec; 1,200 requests/min** — dynamic, can change without notice; over-limit ⇒ 429 | docs models.md |
| Context length | **64k tokens/request total; 32k for state + longest question** | docs models.md |
| Price | **$42/Btok input = $0.042/Mtok input; output tokens free** — round-7's "cost basis not computable" is now RESOLVED | docs models.md |
| Auth | `Authorization: Bearer <key>`; env `TYPESAFE_API_KEY` (matches our .env) | SDK sources |
| Errors | 401 / 422 (FastAPI-style `detail: [{loc, msg, type, input?, ctx?}]`) / **429** / **529 Overloaded** (Anthropic-style code, not 5xx) | docs api.md, openapi ValidationError |
| Retryable statuses | SDK default `{408, 429, 5xx}` (529 handled via retry-after); honor `retry-after` / `retry-after-ms` headers | py retry.py, js retry.ts |
| Request correlation | response header `x-typesafe-request-id` | py constants/errors |
| Models list | aliases `jev-latest` and `jev-preview` both currently → `jev-1.13.0`; versioned IDs accepted even when not listed | docs models.md |
| Customization | no fine-tune/LoRA per account; RLCD-trained calibrated; shape via state + instructions/criteria only; not trained on customer data | docs models.md |

## 3. Documented behavioral facts (jaggedness page for exactly our model, jev-1.13, reviewed 2026-09-17)

Directly load-bearing for the round-8 calibration battery:

1. **Complement invariance is NOT guaranteed**: documented example of the same ticket asked as a noul and its negation → `0.72 + 0.47 = 1.19`. Never score `1 − noul(not p)` against `noul(p)` as an identity.
2. **Noul vs choice probabilities are not comparable** on the same state (documented: noul 0.22 vs choice-yes 0.01). Don't carry thresholds across primitives.
3. **Context rot**: accuracy falls as `state` grows with content unrelated to the decision — our battery states must be tight, not kitchen-sink.
4. **Literal reading**: scoping words, negations, implied conditions read at face value — resolution rules must be stated verbatim in the state.
5. **Not a calculator**: counting unreliable; **score levels weak in numerical calibration — do not interpolate exact magnitudes between levels**; use scores for thresholds/orderings only.
6. **"Extremely consistent"**: quantitatively similar outputs for semantically similar inputs — good news for battery re-test stability (and pre-registered as a JEV-side prediction: repeat calls on near-identical states should stay within a few hundredths).
7. **Adversarial content moves answers**: state is data, not treated as hostile.
8. **Contradictory instructions/criteria degrade**: noul where `true` maps to no performs worse.
9. **No generation**: chaining choices to force text is slow and bad — confirms round-7's "no free-text lane" verdict at the doctrine level, not just wire level.

## 4. Capabilities we had not used (before this round)

1. **`GET /v1/models`** — model inventory read; called for the first time in the r8 probe (receipted).
2. **Noul `criteria: {true, false}`** — outcome descriptions; round-7's noul was instructions-only.
3. **Structured JSON `state`** — round-7 sent a 740-char prose string; named JSON fields are the documented best practice.
4. **Structured `instructions`/`criteria` objects** (JSON with backtick references) — unused by us.
5. **Model aliases** (`jev-latest` / `jev-preview`) — we pinned `jev-1.13.0` and never tested alias resolution (response `model` field reports the resolved ID).
6. **Cost basis** — $0.042/Mtok input, output free: typesafe spend is now computable (round-7 recorded "not computable" honestly; resolved this round).
7. **Retry-after / 529 semantics** — never exercised; now documented for fail-closed probes.
8. **255-option choice / 10-level score ceilings** — never approached (we used 3-option / 4-level).
9. **`response_model` override** (Python SDK v0.7.0) — pydantic-typed answer projection; unused.
10. **Speculative fan-out doctrine** — put questions you *might* need in the same call: "asking a question you might not need is close to free." Round-7 batched 3 questions once; the deliberate speculative pattern was not used.
11. **Adapter for A/B** — `system-one-adapter-python` serves the same wire shape from OpenAI/Anthropic/Gemini (`llm_answer_mode: probabilities|discrete`) — a drop-in harness for cross-house calibration comparisons without changing our receipts format.

## 5. Probe plan registered before the calls (PART 2)

Budget ≤6 typesafe calls; inference only; fail-closed; every row receipted AS SAID into
`answers/typesafe-r8-probe.jsonl`:

| probe_id | call | exercises |
|---|---|---|
| `r8-models-list` | GET /v1/models | model inventory endpoint (first use) |
| `r8-noul-criteria-control` | POST systemone ×1 | noul + `{true,false}` criteria + alias `jev-latest` (control; served-model resolution check) |
| `r8-structured-batch` | POST systemone ×1 | JSON object state; structured instructions; 10-level score (max); 4-option choice incl. explicit no-match; noul w/ criteria; batch parallelism |
| `r8-fail-closed-score11` | POST systemone ×1 | 11 score levels → expect honest 422 receipt (error semantics; a 2xx would itself be a finding) |

Errors are results: any 4xx is receipted verbatim like round-7's moth 404s. No billing/account
endpoints touched (the models list is model inventory, not account/billing).
