# Wave 45 Embassy Log — the key wave: first real reasoner seats

Date: 2026-09-27T23:00–2026-09-28T00:10Z · Keeper + lanes 45-a…45-e.
Doctrine unchanged: receipts-first, gift-framed, zero asks, zero force-push, issues-off repos read-only.

## What landed (all remote==local verified)

- **tavern/round-11** (fdf3470 + 4c32dfc) — the tavern's FIRST REAL REASONER ROUND. deepseek-reasoner + deepseek-chat seats. The reasoner drafts noul 0.99 + `moves_up_to_0_5_or_above` on the exact r10 receipt state that moved JEV 0.35→0.97; chat lands exactly 0.97 — **three houses within 0.02: posterior calibration is about the receipts, not the instrument**. JEV's no-confidence-field noul law transferred to a real LLM with ZERO violations (the draft self-audits its noul shape unprompted). r9 cache curve confirmed after three fail-closed waves (hits 0/640/640). Scorecard 3 hits / 2 honest fails / 2 partials, Brier 0.4805. Ledger stone-v1, 6 rows, tip `db324fd0…`; verifier 16/16. Spend $0.005574 (6/8 calls, off-peak flash basis, docs receipted).
- **qthe E-Q10** (4 pushes, tip 0f5be9d) — the guest's round-9 registered lever (C5' injector one-pager), discharged keyed: **C5' AS STATED STANDS** — kernel 9/9 TRUE, Brier 0.00703, guest's three-branch falsifier did not fire. One 698-byte harness-side injector application restores integrity to exactly 1.000, re-erosion monotone to 0.000 (firstZeroTick=105 in 17/17), zero self-repair anywhere, run-1/run-2 byte-identical. LLM phase 6/8 with two honest fails scored AS RUN (truncation at cap; registration over-reach). Stone chain 24 links tip `50ddf5f9…`. Guest stance moved:true. Parked levers = natural E-Q11 seeds (closed-form A+D collapse-set predicate; cascade terminal semantics).
- **crab-traps SCN-003 live-reasoner** (a6ada5a + e6f5ce3) — the honest star of the wave: **the real reasoner seat was BUDGET-STRANGLED — 0/96 bred claims answered.** At every batch size (10/2/1), `reasoning_tokens` consumed the entire max_tokens 4000 (finish=length, content empty): the seat does manual hex FNV-1a arithmetic and never reaches a verdict — even ONE witness claim doesn't fit. Formal D=0.0000 KILL by the registered fail-closed rule, receipted NON-INTERPRETABLE (starvation, not seat signal). P3 PASS: strict seat re-derived via loom-core's engine_lib, 96/96 byte-checked. P6 PASS: 41-e judge parse on live envelopes, pinned by the real extractJudgeAnswers (13/13 pin tests). The chamber's live-reasoner half needs a thinking-disabled seat or per-claim micro-batches with a raised cap.
- **fleet-seeds tools/** (d6ebe65 + 5a33e49 + 104a860) — wave-44-c concepts adopted as permanent infrastructure: `tools/truncate-audit.mjs` (power-yank): **fail-closed at EVERY byte offset on all four fleet chains** (9242/9242, 1299/1299, 3242/3242, 1904/1904), zero silent-wrong-state; delta property int residual 0 / float 5.55e-17. `tools/wal-conformance.mjs` (wal-edl): CONFORMANCE PASS — torn tail verifies good prefix + receipts damage (`--torn-ok`), corrupted byte applies nothing at the exact seq, full chain clean; semantics matched against a live tessera probe (6/6). Honest partials receipted: pong `seq` is 0-based; the len-1 newline cut is content-identical but non-durable at the WAL-durability layer for JSONL framing. Docs: `tools/WAVE45.md`.
- **fleet-seeds playtest/wave45/moth-census/** (87dc33c + f785f3f) — engine catalog: **32 engines visible live vs 13 in archived docs**; `aer`/`emu` are params, not engines; `POST /process` requires `{"params":{…}}` (flat bodies 422 — older moth modules need re-checking). HEADLINE: **comet-qrng-v1 is a certified randomness engine** (SP 800-90B-style min-entropy cert, platform Toeplitz extractor, CHSH witness, device fingerprint, commitment + pulse hash-chain) — the standing "moth is not a QRNG" finding now has a certified exception on the same API. Census: graph-v1 top-20 truncation confirmed live; whitened balances 0.4966 comet / 0.5004 graph (both in band); P3 honest FAIL (registered 33 engines vs 32 actual — my miscount, receipted). Blind reasoner prediction: letter MISS (0.0004 vs 0.0034, inside joint noise), substance 2/3. Instrument selftest 10/10 incl. the 42-b KAT byte-exact (`ebc8a43d…→836985ec…`).

## Deepseek usage receipts (pricing-first; gifted compute gets usage receipts)

| lane | calls | spend | note |
|---|---|---|---|
| 45-a round-11 | 6/8 | $0.005574 | 4 reasoner + 1 chat + 1 free /models |
| 45-b E-Q10 | 6/8 | $0.0057 | 2 registered-cheap wire requests remain |
| 45-c live seat | 7/10 | (in receipted usage.jsonl) | 3 deliberately underspent — zero-information configs refused |
| 45-e census | 1 | <$0.01 | blind calibration probe, scored |
| total | 20 | ≈ $0.017 | every raw response receipted to disk, per-call usage logged |

Gateway findings (receipted): response `model` says `deepseek-flash` for all seats; `/models` lists only `[deepseek-flash, deepseek-v4-pro]`; at max_tokens 2000 the thinking seat spends 100% on reasoning (round-11 recovered answers from the thinking voice under an explicit extraction law, AS SAID; 45-c raised to 4000 and still starved on real verification work).

## Incidents (receipted, both silent-clobber class)

1. **.env clobbered** pre-launch: only DATABASE_URL survived. GH + moth keys restored verbatim from the principal's delivery message and verified live. TYPESAFE_API_KEY was truncated in the surviving record and is absent from disk — **needs a re-roll from the principal** if that seat matters.
2. **worklog.md clobbered**: waves 40–44 entries destroyed; reconstructed AS RECONSTRUCTED (SHA-anchored, condensed) with an incident receipt. New standing rule for every lane: shared-state writes are read-modify-append only; re-read file length after write.
3. **Inbound merge receipted**: fleet-seeds received foreign commit 306f97e ("Merge remote-tracking branch 'origin/claude/cross-poll-edu'") at 22:24:54Z — another fleet agent merged into our main between waves. No conflict with our paths; not reverted; recorded per receipts-first doctrine.

## Standing after wave 45

- pong49 battery scorer fires after 2026-09-29T10:04Z (armed; premature-guard verified).
- jeviter-await P2 (score on first fix landing); stone P1 (PEM) unfixed upstream, zero ask.
- Four embassy letters staged (ropesight, micrograd-quilt, quilt-mesh, loom-core) — every current channel 422s despite has_issues:true; staged is the correct idle state.
- SCN-003 live-reasoner re-run recipe: deepseek-chat seat (answers fine) or per-claim micro-batches with raised cap; 2 registered-cheap wire requests remain on 45-b's budget.
- E-Q11 seeds queued (guest's parked levers). Round-11 open threads: fold 6 ledger rows into main tavern ledger; blind prior must be asked asset-free next time.
