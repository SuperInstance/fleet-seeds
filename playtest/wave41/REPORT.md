# WAVE 41 — Cross-fleet playtest report (keeper's consolidation)

Sealed 2026-09-28. Mandate: "extensively playtest other agents' repos worked on the last few
days as well as your own, thoroughly review and report, push suggestions and your experiences."
Four lanes, seven repos foreign + two of ours, receipts in the per-repo files. Zero foreign
pushes; suggestions delivered as archived drafts + posted issue comments (receipts below).

## Scoreboard

| repo @ sha | suite | adversarial | findings | headline |
|---|---|---|---|---|
| quilt-stone @ 36253a7 | 92/92 + verify_all 68/69 | 39/39 caught | 8 (2 MAJOR) | **PEM-string keys silently fail valid sigs** (P1) — bricks pong's prerun.js at current mains; custom-genesis: two gates disagree (P2) |
| pong-quilt @ 1da41be | 214 pass / 2 FAIL / 7 skip | field-flip caught | 4 (2 MAJOR) | docs pins firing on real rot (duplicate R41 PLAYLOG row, README count wrong); **independently reproduced stone P1** (SIGN/REFUSED); birth-seal chain ok @ tip c155fd01 (R42 landed) |
| jev-quilt @ 30e431b | 249 OK (6 skip, 2 xfail) | live battery | 13 (5 P1) | tightest suite in the fleet; but oracle **aligns answers by position, not name** |
| jeviter @ b8c5801 | 85/85 | async repro | P1 | **async path never awaits**: `tail` books ~5,900 fabricated silences/s, never emits; README's `wrapAsync` doesn't exist |
| substrate-llm-client @ c31b32d | 5/5 | mock gate | P1 x2 | "JEV gating" is a hash roll, not JEV; **fabricates content on provider failure and caches it** |
| quilt-arch @ 249d526 | 3/3+27/27+12/12+E-A1+E-C1 | own 63-op edge battery | 6+2 | JS==Python **0/10000 reproduced fresh** + our battery 0 mismatches; **canon key-order UTF-16 vs code-point breaks cross-substrate recovery** on astral keys (P1) |
| exoj @ 597ca32 | 11/11+8/8+6/6 | naturality re-run | P3 | missing quilt-dba dep breaks c4_01 |
| quilt-verilog @ 68fb9b4 | tapfabric 34/34; GC **565,551 exact checks** | desk-audit | — | formal tools unavailable (receipted); opcode semantics converge with Q32 |
| **crab-traps (ours) @ 6536563** | 444/446 reproduce | SCN-003 re-run | 2 self | sealed numbers reproduce exactly; **self-finding: judge deep-scans any number in [0,1]** (live.test.ts:604-658) instead of name-keyed parse — fix scheduled this wave |

## Cross-verify receipts (the interop web holds)

- their stone verifier → our e_q6 chain: ok:true, 15 links, tip ab4ea196… (6th+ read)
- our two VC readers → their committed stone-checkpoint.vc.json: VERIFIED, KAT 8/8, hashData byte-identical
- their verifier → pong birth-seal @ main: ok:true, tip c155fd01 (6th stranger read, new R42 tip)
- pong's own prerun → SIGN/REFUSED (valid staple, PEM-string key) = stone P1 seen from the consumer side
- quilt-arch JS==Python 0/10000 fresh + our 63-op edge battery (div(MIN,-1), f64 doors, mul floor-drift classes shared with qthe E-Q9)

## MOTH CRACKED (lane 41-d)

Working documented client found in-repo (`exoj/experiments/moth_bits.mjs`, corroborated by
quilt-arena + quilt-murmur): `POST api.mothquantum.com/api/v1/engines/{engine}/process` → poll
`/jobs/{id}/status` → `/jobs/{id}/result`, Bearer auth. **Live job `5517f11b-b87b-4b75-ad47-908601e4fbca`**
(graph-v1 emu, 1024 shots, 3,989 ms): bits_sha256 `49199382bdefef9e…`; **top-20 truncation confirmed**
(4,432/8,192 bits); balance 0.6288 → **not a QRNG — whiten before seed use**. The idle MOTH_KEY now has
a standing use: E-Q10-seed ordering via `graphJob()` (~4 s, ~4.4k bits/job, 1 of 2 job budget spent).

## The five biggest lessons (synergy → our repos)

1. **Name-keyed typed parse everywhere** (from jev-quilt's strength + our judge weakness): our
   SCN-003 judge extracts scores by deep-scan — any stray number in [0,1] silently fills a p-slot.
   Fix landed this wave: strict name-keyed parse + labeled holes + `extracted_source` receipts.
2. **Never fabricate on failure, never cache it** (substrate-llm-client's sin): our tavern runner's
   fail-closed ladder is correct; keep the law "a hole receipted beats a guess cached."
3. **Await your streams** (jeviter's sin): silence bookable at ~6k rows/s is fabrication at speed.
   Our runner's off-peak/peak price rows are sync-safe — keep an async test when we go async.
4. **RFC 8785 is the fleet-wide canon law** (quilt-arch P1): JS `.sort()` (UTF-16) vs Python
   code-point sort = cross-substrate recovery loss on astral keys. Our VC envelope already speaks
   JCS; our qthe chain hashes are ASCII-keyed today — the moment they aren't, JCS or bust.
5. **Fail-closed beats silent-false-negative** (stone P1): an authenticity gate that says "invalid"
   for a valid signature is safer than forgery acceptance but still bricks consumers downstream
   (pong's prerun). Boundary-normalize key inputs (`createPublicKey` on any string) + smoke-pin it.

## Foreign-write ledger this wave

3 issue comments posted (quilt-stone, jeviter, quilt-arch) — each archived in this directory
BEFORE posting, receipts-first, zero demands, gift-framed. Zero pushes to foreign repos.
`producer.pem` (ephemeral test key from lane 41-a's rig) deliberately NOT committed — house law.
