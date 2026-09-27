# Moth Census — wave 45-e verdict

Run: 2026-09-27T23:20:15.628Z · envelope: `{"params":{...}}` · whitening: registered mothbits recipe (verbatim tools/mothbits.mjs, lane 43-c)

| engine | job id | kind | raw bits | raw balance | whitened balance | truncation shape |
|---|---|---|---|---|---|---|
| comet-qrng-v1 | f21f71d8-6de5-4d1d-968b-2968bc5cb01d | raw-counts+extracted-bytes | 49152 | 0.5013 | 0.4966 | NO-TRUNCATION-EVIDENCE |
| graph-v1 | 4ffb0c15-acd1-4fca-a1a8-f078a7f3d419 | measurements-multiset | 1272 | 0.5259 | 0.5004 | TOP-20-TRUNCATION-CONFIRMED |
| coin-toss-v1 | 3a685695-c39e-4e6c-b65e-26e1f52048ea | aggregate-counts | — | 0.4551 (heads/shots) | N/A | complete (2 outcomes — nothing to truncate) |

## Registered claims (claims.json @ sha 200313cc3b034d5e…)

- **P1 PASS** — graph-v1 distinct=20 support=4096 sumCounts=106/1024 -> TOP-20-TRUNCATION-CONFIRMED
- **P2 PASS** — comet-qrng-v1: whitened balance=0.4966 over 2276B (raw 0.5013) | graph-v1: whitened balance=0.5004 over 2280B (raw 0.5259)
- **P3 FAIL** — live catalog=32 expected=33; new-since-docs=20; missing-from-live=["example-engine-v1"]
- **P4 PASS** — healthPassed=true grade=simulator-baseline h_bit=0.897580243512343 extracted=736bits balance=0.4918 requested=512B delivered=92B extractor=toeplitz/toeplitz-v1
- **P5 PASS** — heads=233 tails=279 shots=512 headsBalance=0.4551 payload=none (counts only)

## Deepseek blind prediction

**Prediction (deepseek-reasoner, blind — engine descriptions only, no balances leaked):** `comet-qrng-v1` — "comet-qrng-v1 has certified high-entropy raw bits; von Neumann + SHA-256 whitening yields near-0.5 balance. graph-v1's top-20 truncation biases its count-expanded stream and may survive partial debiasing. coin-toss-v1 returns no bit payload, so its balance is undefined/N-A."
**Actual census winner (closest whitened balance to 0.5):** `graph-v1` (comet 0.4966, graph 0.5004)
**Score:** MISS. letter-MISS; nuance: |0.5-w| = 0.0004 (graph-v1) vs 0.0034 (comet-qrng-v1), sigma≈0.0037 per engine — the letter-MISS is inside joint noise (statistical tie). Substance score: top20_truncation_engine=graph-v1 -> HIT (matches P1 PASS); predicted graph whitened balance 0.375 vs actual 0.5004 (whitening erased the raw truncation bias).
**Usage receipt (successful run):** {"prompt_tokens":555,"completion_tokens":145,"total_tokens":700,"prompt_tokens_details":{"cached_tokens":0},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":555} — HONEST LEDGER: this successful run was attempt #3 overall. Run#1 (reasoner@1000tok) and Run#2 (reasoner@1000 + reasoner@2000) each ended with completion_tokens fully consumed by reasoning_tokens and ZERO final content — instrument-FAILs receipted in the wave-45-e worklog (total deepseek usage across 3 runs: 4814 tokens, ~<$0.01). This file receipts the successful run only.
## Findings beyond the census

1. **Envelope gate (NEW, revises wave-42 notes):** POST /engines/{id}/process requires `{"params":{…}}`; flat bodies 422 "unexpected property" (8/8 receipts). Wave-42/43 modules (mothqrc etc.) must be re-checked against this envelope before reuse.
2. **Catalog is 32 visible engines** (stable across the 23:01Z and 23:19Z surveys, 2026-09-27) vs 13 in the archived 2026-09-25 docs; **comet-qrng-v1** is new: Born-rule bytes with SP 800-90B-style min-entropy certificate, platform Toeplitz extractor (public seed toeplitz-v1), CHSH witness, device fingerprint, submit-time commitment + hash-chained pulses (prev_pulse_hash/pulse_index params). The top-20 problem has a platform-side answer: request raw counts AND extracted bytes in one job. P3 registered the count as 33 — a transcription miscount by the lane (both receipts say 32); scored FAIL honestly, the stable-count finding stands. Docs drift: example-engine-v1 is documented but 404s live.
3. **"aer"/"emu" are params, not engines** (mode: emu|qpu; machine: aer) — wave-42's "engines known working: graph-v1, aer, emu" was a conflation; GET /engines/aer 404s.
4. Truncation is per-engine, not universal: comet-qrng-v1 returns FULL-SUPPORT raw counts (2548 distinct) — full-width bits exist on the platform.

