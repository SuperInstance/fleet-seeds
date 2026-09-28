# Round seven — three houses, one question (lane 36-b, wave 36)

Sealed 2026-09-27T08:27–08:32Z. Lane: guest-smith (fast-iterator). Every raw
answer sits verbatim (AS SAID) in `answers/deepseek-round7.jsonl`,
`answers/typesafe-round7.jsonl`, `answers/moth-round7.jsonl`, with per-call
usage, cache telemetry, latency, and prefix shas. Predictions for all four
slots were registered BEFORE the first API call:
`/home/z/my-project/scripts/round7_predictions.json` — scorecard below, wrong
guesses kept standing.

**The ONE question (verbatim to all three houses):**

> Given that the float kernel is less faithful than the fixed kernel at the
> uncoupled exact-zero pressure families, what is the SMALLEST experiment that
> would establish whether the S3 live-read semantics can also produce a
> float-only artifact? Answer in <=120 words with one concrete falsifiable
> check.

## The three-house table

| house | model (served) | lane | latency | usage | verdict on the four levers | one-line answer gist |
|---|---|---|---|---|---|---|
| DeepSeek (guest, r7) | deepseek-chat → `deepseek-flash` | warm: round-6 prefix (sha 777938e2…, 5025 ch) | 156–293 ms | q1 1802p/1408 hit/518c; q2 1537p/1280/299c; q3 1542p/1408/259c | L1 E-Q7 **stand**; L2 S-sweep **revise** (fold into L1's arm matrix); L3 naive-plane floor **withdraw** (superseded — prices a plane nobody claims); L4 C5' one-pager **stand** | "2-writer, 1-slot, 1-tick S3 cooker at sigma=8/5 (acc=-8, r=5, 5acc+8r=0); byte-diff float vs fixed traces — float 0 firings at the later column while fixed fires ⇒ float-only artifact; if float also fires, the claim dies" |
| DeepSeek (reasoner probe) | deepseek-reasoner → `deepseek-flash` (+714 reasoning tok) | warm prefix — **0% cache** (cross-model miss) | 328 ms | 1569p/0 hit/975c (v1 truncated: 162p/1100 all-reasoning, receipted) | n/a (one-question probe) | "ONE cell, T=1, two same-slot writers under S3, d=0 all-Abstain, sigma=8/5; float 0 firings (byte-identical to a no-writer control) vs fixed exactly 1 (8589934593) ⇒ artifact; same counts ⇒ no float-only artifact at this family" |
| DeepSeek (fast iterator) | deepseek-chat → `deepseek-flash` | **TRUE COLD**: no system message, 307-token self-contained brief | 219 ms | 307p/0 hit/204c (warm-brief arm v1: 1715p/1408 hit/299c, 152 ms) | n/a | "2x2 grid, 2-cell row-major S3 live-read pair at sigma=8/5 (5acc+8r=0); float's second cell holds (rounds to 0) while Q32.32's second cell moves (nonzero remainder) ⇒ float-only" |
| typesafe | `jev-1.13.0` via POST /v1/systemone | typed distributions only (choice+score+noul; **no free-text lane exists on the receipted wire protocol** — the ONE question was mapped, declared) | 413 ms | 738 in / 88 out | n/a | distribution, not prose: `cooker_diff` 0.76 (conf 0.64) beats `unit_probe` 0.23 / `s_sweep` 0.01; decisiveness 1.35 ("bounded"→"decisive", conf 0.21); p(float-only artifact exists) = **0.47** — a calibrated coin-flip |
| moth | graph-v1 on `aer` (quantum) | capability probe: /api/v1/chat/completions 404 ×3 (Bearer MOTH_KEY, Bearer MOTH_LK, x-api-key MOTH_LK); MOTH_LK == MOTH_KEY (same secret) | 5,940 ms (job) | job f8a22da8…: 256 shots, 20 distinct 8-bit outcomes, 1152 bits, 637 ones (55.3%) | cannot ideate — quantum house attends as entropy oracle / provenance only | no chat lane: the house answers with randomness, receipted, not with words |

## Round-seven guest verdict (one line)

**The guest stands behind E-Q7 (folded S-sensitivity sweep into its arm
matrix), withdraws its own naive-plane counterfactual floor as superseded by
the receipted S3 semantics, stands behind the C5' injector one-pager — and
prices E-Q7's falsification condition in one sentence:** "E-Q7's registered
knife-edge-checkerboard-cascade model is killed if, on the frozen sigma=2/3
seed under S3 row-major LWW, the cascade fails to propagate as priced — any
cell whose coupled twin pressure is nonzero holds instead of moving, or the
cascade dies before the pre-registered terminal tick" — with the guest's own
residual risk that the falsifier MUST be stated against the fixed (Q32.32)
kernel, or the float kernel's spurious exact-zero holds will mimic
falsification (the exact trap the three-houses question probes).

## The flash-as-iterator experiment

- **Design**: same ONE question to (a) the context-loaded guest (prefix +
  contract, 1542 prompt tok, 83% cached), (b) deepseek-reasoner (prefix,
  thinking), (c) deepseek-chat with a 307-token self-contained brief and NO
  system message (true cold).
- **Receipted defect, kept standing**: the first "cold" attempt
  (`r7-flash-cold-iterator`) accidentally carried the prefix on the wire
  (run-1 code bug) — its 1408 cached tokens prove it. Row kept; v2
  (`r7-flash-cold-iterator-v2-truecold`) is the true cold measurement.
- **Agreement verdict: ACTIONABLY EQUIVALENT.** All four DeepSeek lanes
  converge on the same minimal experiment — a 2-writer, single-tick,
  same-slot S3 live-read probe at an uncoupled exact-zero family, float vs
  fixed byte-diff, with the pre-registered fork "float holds & fixed moves ⇒
  float-only artifact established; identical behavior ⇒ no artifact at this
  family." The cold 307-token call matches the 5025-char context-loaded
  guest in structure and even shares the 8/5 family choice. The reasoner adds
  one control the flash lanes lacked (byte-compare against a no-writer
  control) and the sharpest residual risk (S3 directional audibility may
  route the pair out of same-slot scope).
- **Latency**: true-cold flash 219 ms; warm-brief flash 152 ms; warm guest
  156–293 ms; reasoner 328 ms + 714 reasoning tokens (and a truncated v1 at
  max_tokens=1100 — reasoning ate the whole budget; receipted). The flash
  lane at ~200 ms is a usable ideation iterator WITHOUT any transcript.

## Cache economics (declared basis: round-6 price schedule, peak)

- 7 DeepSeek rows total: 8,634 prompt tok, **5,504 cache-hit = 63.75%**,
  3,654 completion (1,814 reasoning), **$0.00536** peak-basis
  ($0.00698 if no cache) — saving 23%.
- Warm deepseek-chat rows only (q1, q2, q3, iterator-v1): 5,504/6,596 =
  **83.4% cache hit**. The round-6 cache asset (sealed 07:41Z) was STILL WARM
  47 minutes later — the first r7 call hit 1,408/1,802 without a warm-up call.
- **Cross-model cache miss (new datum)**: deepseek-reasoner sent the
  byte-identical 5,025-char prefix and got **0%** — DeepSeek's context cache
  does not serve across requested models. Prefix reuse pays only within one
  model's lane.
- True-cold call: 0% hit, as designed.

## Prediction scorecard (registered before any call — misses kept standing)

- **deepseek-reasoner** — PREDICTED: reuse existing cooker, name exact
  numbers, cite a family. GOT: exactly that (one-cell two-same-slot-writers,
  cites 8589934593 and 5acc+8r=0). ✅
- **deepseek-chat flash** — PREDICTED: thinner, weaker check, ~65%
  equivalence. GOT: fully equivalent, arguably the sharpest fork control of
  the four. ❌ (undersold the flash lane — honest miss)
- **typesafe** — PREDICTED: typed distributions, cooker_diff first at
  conf ≥ 0.6, ~300–700 ms. GOT: cooker_diff 0.76 / conf 0.64, 413 ms,
  plus a calibrated p=0.47 on the artifact existing. ✅
- **moth** — PREDICTED: 404 on all chat probes, graph job succeeds. GOT:
  exactly that; plus the discovery MOTH_LK == MOTH_KEY (same secret, so the
  header-style alternates tested one value three ways). ✅
- **Round-7 discharge guess** — PREDICTED: stand L1+L2+L3, downgrade L4.
  GOT: stand L1, revise L2, **withdraw L3**, **stand L4**. ❌ (the guest
  withdrew the lever I expected it to keep, and kept the one I expected it
  to drop — this is why registration comes first)

## Spend

| house | spend |
|---|---|
| DeepSeek | **$0.0054** total peak-basis, 7 calls (round-6 schedule; ~$0.0027 off-peak) |
| typesafe | 826 tokens, 1 call — unit pricing unknown, **cost basis not computable** (honest record) |
| moth | 1 graph job (256 shots, emu) + 3 HTTP 404 probes — unit pricing unknown, **cost basis not computable** (honest record) |

## Open threads

- E-Q7 is now fully registered-in-principle with a one-sentence falsification
  condition (r7-q2) — the run itself belongs to a lane that owns the qthe
  harness (this lane did NOT touch qthe).
- The guest's revised lever matrix (E-Q7 + S-sweep folded) and its own trap
  warning (state the falsifier against the FIXED kernel) should ride into the
  next keeper seal of this ledger.
- The float-only-artifact probe all four lanes converged on is one cheap
  registered run away from being E-Q8.
- Cross-model cache is dead (reasoner 0%) — future multi-model rounds should
  not pay the prefix twice; give the reasoner the short brief instead.
- typesafe's calibrated p=0.47 on the artifact existing is a guest-registered
  prior worth falsifying alongside E-Q7.
- Moth remains entropy-oracle-only; MOTH_LK is a duplicate of MOTH_KEY in
  this .env (receipted, values never logged).
