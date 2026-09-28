# verdict — 46-e witness grammar rollout (the fleet's first CROSS-CHAIN witness receipts)

**VERDICT: PASS — 5/5 pre-registered claims (P4 under a receipted amendment), 8/8 rollup targets verified, wave-46 rollup chain = 8 receipts, tip `6e4cdb8f2ca27607f74068b4640258c0c363957fb55248ea8a2f357740451407`, wave-44 `verify.mjs` CLI exit 0, 7/7 negative controls fail closed, reproducibility byte-identical modulo ts.**

Run history, receipted honestly: three LIVE rollup runs were executed (run_at `2026-09-28T00:42:54.612Z` → tip `b2442e09…`; repro inside the first self-test `00:44:59.976Z` → tip `3a03db7c…`; and the SEALING run `2026-09-28T00:48:42.400Z` → tip `6e4cdb8f…` whose receipts are the committed ones — the working-tree receipts of the first run were overwritten by a `--offline` replay smoke test before sealing, which is exactly why the sealing run was re-executed and re-witnessed). All three runs verified 8/8 and are mutually byte-identical modulo ts + ts-derived parents (N8 re-established against the sealing run: 8/8 controls). The `--offline` replay of the committed fetched bytes exits 0.

Pre-registered claims: `claims.json` (sha256 `cfaf425b42ac2824b91c9190a0d89d34be9158657815399e12e0513d4ca0118a`, mtime `2026-09-28T00:36:49.008Z`, sealed in `receipts/46e-claims-registration.json`) — committed+pushed (a2c7399) BEFORE the official run. Pin values inside were resolved by disclosed pre-run reconnaissance probes; the official run re-fetched every remote byte at the pinned URLs and matched all of them.

## What this is

The wave-44 witness grammar (strict sha256 parent-chain receipts + verify CLI, 17/17) rolled across every chain the fleet owns. One witness receipt PER chain, parent-chained into ONE wave-46 chain; verifying that chain with the UNMODIFIED wave-44 grammar IS the cross-chain rollup. Reuse, not fork: the grammar is imported from `playtest/wave44/witness-grammar/witness.mjs` and the stone walking from `tools/lib/stone-v1.mjs` (43-c); this lane only adds the pin table, the walker adapters, and the rollup builder.

## The wave-46 chain (receipts/rollup-chain.jsonl — 8 receipts)

| # | target | source | verified |
|---|--------|--------|----------|
| 0 | wave44_kat — wave-44 grammar KAT chain (row 1 = GENESIS anchor; `output_sha256` = the KAT tip `e4226c88…`) | FIXTURE | 5 receipts, tip `e4226c88…` |
| 1 | qthe_e_q10 — `receipts/e_q10_chain.jsonl` @ qthe `0f5be9d6652d…` | LIVE | 24 links, tip `50ddf5f9226d…` |
| 2 | qthe_e_q6 — `receipts/e_q6_chain.jsonl` @ qthe `905bb2f57ba3…` | LIVE | 15 links, tip `ab4ea196…`; live bytes byte-equal the committed fixture |
| 3 | pong_birth_seal — `checkpoints/stone-v1.json` @ pong-quilt `1da41be2…` | LIVE | 5 links, tip `c155fd01…`; byte-equal fixture; post-R42-site era pin per tools/verify-fleet.mjs |
| 4 | tavern_round11 — `tavern/round-11/round11_ledger.jsonl` | FIXTURE | 6 rows, tip `db324fd0…`; bytes sha `bdf3be06…` + git blob `913eea42…` both match pins |
| 5 | crabtraps_45c — `worker/src/arena-scenarios-003-live-reasoner-results.json` @ crab-traps `e6f5ce33…` | LIVE | pre-registration binding intact: embedded `pre_registration.sha256` == fetched predictions bytes == `76bf7251…` |
| 6 | crabtraps_44a — `worker/src/arena-scenarios-003-gan-results.json` @ crab-traps `fed1e9850…` | LIVE | binding intact: `76e5ef05…` matches embedded + pinned |
| 7 | fleetseeds_fixtures — `tools/fixtures/` manifest (4 files) | FIXTURE | all 4 files match pinned sha256s (qthe e_q6 `3340b082…`, pong `6e958f67…`, rekor `4545f918…`, moth-42b raw bits `ebc8a43d…`) |

GENESIS note: wave-44 `verifyChain` requires receipt 0's parent to be the literal `"GENESIS"` (64-hex parents fail), so the KAT tip cannot sit in the parent field; row 1 anchors the wave-44 tip BY CONTENT (`output_sha256 = e4226c88…`). Stone-v1 chains were NOT forced into the witness grammar — stone walkers verify them in their own row-hash format and the witness receipts are ABOUT them.

## Claims vs results

- **P1 — all 8 targets verify at pinned tips/digests: PASS.** Every walker ok=true with exactly the pre-registered tips, link counts, byte shas, and pre-registration bindings (run receipt: `receipts/run-receipt.json`, `all_ok: true`, `chains_verified: 8`, mode `live`, run_at `2026-09-28T00:48:42.400Z`).
- **P2 — the wave-46 rollup chain verifies with the unmodified wave-44 grammar: PASS.** `node ../../wave44/witness-grammar/verify.mjs receipts/rollup-chain.jsonl --expect-tip=$(cat receipts/rollup-chain.tip)` → exit 0, `ok=true`, 8 receipts; rollup.mjs also re-verifies in-process via the imported grammar. The builder exits 0 IFF all targets verify AND the chain verifies.
- **P3 — every negative control fails closed: PASS (7/7, plus reproducibility as N8).**
  - N1 tampered chain byte (stone.header → headem in saved e_q10 bytes) → walker `ok=false` ("row 0 is not a stone.header")
  - N2 wrong pinned tip on good bytes → `ok=false` ("expected tip ffff… got 50ddf5f9…")
  - N3 tampered fixture byte → manifest sha mismatch caught
  - N4 tampered artifact byte → artifact bytes-sha ≠ pin caught (`5a728fa7… != 6d7db23e…`)
  - N5 tampered byte inside a wave-46 receipt → CLI exit 1, parent link broken located
  - N6 tampered LAST receipt → chain-internal links pass, only the PIN catches it → CLI exit 1 "tip mismatch" (documented wave-44 semantics: tail tamper-evidence requires an external pin — which `rollup-chain.tip` + the run receipt provide)
  - N7 deleted middle receipt → CLI exit 1, break located at the skip
- **P4 — rollup tip reproducible modulo ts: PASS under a RECEIPTED AMENDMENT (45-d precedent: the fleet was right, my claim letter was under-specified).** As first written, P4 said "byte-identical after normalizing every ts field". Two executions honestly FAILED before the amendment: (1) the brief's own claim template embeds the wall-clock time in the CLAIM TEXT ("… by walker W at time S") as well as the ts field; (2) parent ids are sha256s of receipts, hence ts-DERIVED — no field-only normalization can make two runs byte-identical. Amended definition (implemented in `self-test.mjs`): normalize the emission timestamp wherever it appears (ts field + claim-text ` at <ts>`), then RECOMPUTE the parent links over the normalized receipts and compare. Result: sealing chain == independent live re-run byte-identical under that normalization (`fieldOnlyIdentical=false` receipted in `self-test-receipt.json`). Consequence stated plainly: the ROLLUP TIP is run-specific (ts changes it); the pinned tip `6e4cdb8f…` belongs to the sealing run, and the ts-normalized chain is the reproducible object.
- **P5 — honest e_q9 accounting: PASS.** No `receipts/e_q9_chain.jsonl` exists at pinned qthe `905bb2f5…` (chains there: e_q1/e_q2/e_q5/e_q6) nor at tip `0f5be9d6…` (adds e_q7/e_q8/e_q10); E-Q9 exists only as experiment outputs + `situations/eq9_verdict.md`. The brief's "e_q9 chain @ pinned 905bb2f5… per tools/fixtures" resolves to the e_q6 chain that fixture actually pins. Evidence receipted in `receipts/46e-eq9-absence-receipt.json` (GitHub tree listings at both pins); NO e_q9 receipt was fabricated in the wave-46 chain.

## Honest limits

- `ts` is wall-clock from the generator and is NOT monotonicity-enforced (inherited wave-44 limit); receipts are reproducible only modulo ts + ts-derived parents (P4 amendment).
- Tamper-evidence for the chain tail requires the pinned tip (`receipts/rollup-chain.tip` + the tip inside `run-receipt.json`) — inherent to hash chains, documented at 44-b and honored here.
- The FIXTURE targets (wave-44 KAT, tavern ledger, fixtures) are verified against the fleet-seeds checkout at run time; they are pinned by bytes sha256 + git blob hash inside the receipts, so any later drift is detectable against THIS run's receipt.
- crab-traps artifacts are not chains: their receipts witness content + PRE-REGISTRATION BINDING (the strongest integrity claim available for a verdict document), with a deterministic verdict-digest as `output_sha256` (defined in `walkers.mjs`, timestamps excluded).
- Network receipts: 7 pinned-URL GETs (2 qthe chains, 1 pong chain, 4 crab-traps files) + 2 GitHub API tree probes (P5 evidence). Fetched bytes are committed under `receipts/fetched/` so the whole rollup replays offline (`node rollup.mjs --offline`, labeled replay-fixture).

## Files (all under playtest/wave46/witness-rollout/ — this lane's only write path)

- `claims.json` + `receipts/46e-claims-registration.json` — pre-registration (pushed before the run)
- `walkers.mjs` — pin table + walker adapters (imports wave-44 grammar + 43-c stone verifier; zero re-implementation)
- `rollup.mjs` — the cross-chain rollup builder (LIVE fetch at pinned shas / `--offline` replay; fail-closed: any target failure emits NO chain)
- `self-test.mjs` — N1..N7 negatives + N8 reproducibility, tampered copies in os.tmpdir() only
- `receipts/rollup-chain.jsonl` + `receipts/rollup-chain.tip` — THE wave-46 cross-chain witness chain (8 receipts, tip `b2442e09…`)
- `receipts/run-receipt.json`, `receipts/self-test-receipt.json`, `receipts/46e-eq9-absence-receipt.json`, `receipts/fetched/**` — run evidence
- `verdict.md` — this file

## Re-verify

```
node playtest/wave46/witness-rollout/rollup.mjs            # full live rollup (exit 0)
node playtest/wave46/witness-rollout/self-test.mjs         # negatives + repro (exit 0)
node playtest/wave44/witness-grammar/verify.mjs \
     playtest/wave46/witness-rollout/receipts/rollup-chain.jsonl \
     --expect-tip=6e4cdb8f2ca27607f74068b4640258c0c363957fb55248ea8a2f357740451407   # exit 0
node playtest/wave44/witness-grammar/test.mjs              # the grammar itself still 17/17
```

Zero keys used, printed, or committed (the lane used no LLM spend and no key material; GH token used only for API tree probes + push, never written). Zero writes outside `playtest/wave46/`.
