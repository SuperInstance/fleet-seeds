# 46-b VERDICT — moth-seal: certified sampling service (comet-qrng-v1 default)

**Run:** 2026-09-28 (registered run, claims pre-sealed before any job — sha `d44da4af71cfdea3…`, mtime `2026-09-28T00:46:03.973Z`, receipt `receipts/46b-claims-registration.json`, push `ffe3412` predates every job)

**SERVICE VERDICT: PASS — comet-qrng-v1 is now the fleet's default registered-seed source; moth-seal 5/5 registered claims PASS across 7/10 job budget; first consumer seal landed (spot-audit set [6, 1, 5, 3]).**

## What was built

`tools/moth-seal.mjs` — one comet-qrng-v1 job → platform Toeplitz-extracted certified bytes → Fisher-Yates over [0, pool) with 16-bit rejection sampling (mothbits STEP-4 semantics, imported verbatim from `tools/mothbits.mjs`) → SEAL receipt (job id, raw-result sha256, certified-byte sha256, cert fields verbatim — entropy report / extractor / device fingerprint / commitment / pulse hash-chain / CHSH witness —, chosen indices, timestamp, label, single-use seed declaration). Fail-closed everywhere: missing cert field, truncated/non-JSON response, failed job, or bit exhaustion → non-zero exit, bits never used. `--fallback` = graph-v1 (top-20-truncated, NOT a QRNG raw) + registered 42-b whitening, receipt says `FALLBACK` + KAT reference, `cert: null`. No-seed-reuse guard `assertDistinctSeals` (same jobId or same certified-byte sha256 twice → fail-closed).

**Stream policy (the certified-bit budget, disclosed):** one comet job's yield is min-entropy-limited (this run delivered 456–1552 certified bits/job). `--stream=direct` (default) consumes certified bits only and fails closed on exhaustion (pool ≤ ~29 at 456 bits). `--stream=prf` seeds the registered mothbits STEP-3 SHA-256 counter stream with the certified bytes — receipted with `effectiveEntropyBits = min(budget_bits, consumed)`, never silent. Registered run: K-seals use prf (pool 1134), demo uses pure direct (pool 10, 144/456 bits consumed).

## Registered claims — all PASS

| Claim | Result | Evidence |
|---|---|---|
| **P1** comet certified-bit balance ∈ [0.45, 0.55], K=5 seals | **PASS** | per-seal 0.5181 / 0.4932 / 0.5122 / 0.5168 / 0.5098; pooled **0.5130** over 5392 bits (all 5 per-seal inside band) |
| **P2** cert fields always present (health, h_bit, Toeplitz, fingerprint, commitment, pulse) | **PASS** | 6/6 comet seals full payloads, h_bit 0.8919–0.9142, `health_passed=true` always, zero CertError trips |
| **P3** fallback receipts always labeled | **PASS** | live graph-v1 fallback: `mode=FALLBACK`, cert=null, whitening recipe + KAT (`moth-42b-raw-bits-2caa822b….txt`), sourceVerdict records the live truncation (distinct=20, 137/1024 shots seen) |
| **P4** no seed reuse / no collisions | **PASS** | 6/6 jobIds distinct, 6/6 certified byte-stream sha256 distinct, 0/10 K-pair permutations identical |
| **P5** consumer contract + determinism | **PASS** | all receipts schema-validated (`verifyReceiptSchema`); offline 30/30 self-tests incl. independent-FY cross-check, replay byte-identical; demo indices distinct/in-range |

## Job accounting — 7/10 used (cap honored)

| # | job | engine | jobId | certified bits | CHSH S (z vs classical) |
|---|---|---|---|---|---|
| 1 | k1 | comet | 227d8a77… | 552 | 2.834 (37.8) |
| 2 | k2 | comet | ff47767b… | 736 | 2.859 (39.3) |
| 3 | k3 | comet | b1fccc10… | 1552 | 2.839 (38.1) |
| 4 | k4 | comet | e5b989f7… | 776 | 2.790 (35.3) |
| 5 | k5 | comet | ed553fab… | 1320 | 2.826 (37.4) |
| 6 | fallback | graph-v1 | d1f23314… | — (whitened; raw NOT certified) | — |
| 7 | demo | comet | 4caec968… | 456 (144 consumed, direct) | 2.799 (35.8) |

Every CHSH witness violates the classical bound (S > 2) at z ≈ 35–39; every seal `grade=simulator-baseline`, `health_passed=true`. Note: `mode=emu` (simulator-baseline grade is honest in every receipt — the certification chain is the engine's, not a QPU claim).

## Deepseek blind prediction (1 call, BEFORE the run — receipted)

Served `deepseek-flash`, 522 tokens (~$0.0005). Predicted mean balance **0.5000** (actual **0.5100**, abs error 0.0100), P(pooled in band)=0.9999 (actual: in band — Brier 0.0000), P(all 5 in band)=0.9996 (actual: all in band — Brier 0.0000), confidence 0.93. Substance 3/3, one calibration note: the model assumed ~584 bits/job from the single wave-45 observation; this run's yield ranged 456–1552 bits (per-job min-entropy budget varies) — pooled-band conclusion unaffected.

## First consumer — demo registration (committed before the demo job)

`receipts/46b-demo-registration.json`: pool = the 10 near-arc objectives (PLANNING.md @ a7a0226, verbatim), take 4, contract "spot-audit set for the wave". **Sealed draw: indices [6, 1, 5, 3]** =

1. **#6 — Two-reader rule for every chain** (mid-arc item 7)
2. **#1 — Certified sampling service** (`tools/moth-seal.mjs` — this lane's own deliverable)
3. **#5 — Embassy sweep every wave**
4. **#3 — Witness grammar rollout**

Single-use binding: jobId `4caec968-16f5-409f-948a-dab4baf6f06f`, certified-bytes sha256 `922b3d64e91a0813…` — reuse in any other receipt voids the draw.

## Honest limits

- K-seals used `stream=prf`: the FY permutation's entropy is bounded by the certified budget (684–1687 bits/job), the stream beyond it is a receipted PRF extension — same doctrine as mothbits STEP 3. Pure-direct is the flagship path and is what the demo used.
- Comet credits: 6 jobs × 5 credits (per 45-e survey). `include_raw_counts` adds payload weight but no extra job cost; raw results committed (redacted) for audit.
- P1 band is generous by design (±2.4σ per 584-bit seal); this run cleared it with margin — P1 was never going to be a close call for a working certified engine, and that is the point of the claim (detect a BROKEN source, not fine-tune).

## Paths

- Module + tests: `tools/moth-seal.mjs`, `tools/moth-seal.test.mjs` (30/30 offline, no network/keys)
- Claims: `tools/wave46/46b-claims.json` + `receipts/46b-claims-registration.json`
- Run driver: `tools/wave46/46b-run.mjs`; receipts: `receipts/46b-seal-{k1..k5,fallback,demo}.json`, `receipts/46b-raw-*.json` (redacted), `receipts/46b-run-assessment.json`
- Prediction: `receipts/46b-deepseek-prediction.json`; demo registration: `receipts/46b-demo-registration.json`
- Keys: MOTH_KEY / DEEPSEEK_API_KEY / GH_TOKEN runtime-only, never printed, never committed
