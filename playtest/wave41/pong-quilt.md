# Playtest: pong-quilt @ 1da41be23eff100f4d11df0e187311e12ad704f9

Lane 41-b "pong-playtester" (resumed after a context-deadline cutoff), wave 41, quilt/murmur-protocol. RESEARCH + PLAYTEST ONLY — zero foreign writes, zero pushes, zero comments posted; this report is the deliverable. Every claim carries a command + output excerpt. Sibling reports: `quilt-stone.md` (41-a), `jev-stack.md`, `ports-and-moth.md`.

## Setup

- Clone already present from the prior attempt: `/home/z/my-project/download/pt-pong-quilt`, HEAD **1da41be23eff100f4d11df0e187311e12ad704f9** ("Merge pull request #58 from SuperInstance/r42-site"), working tree clean at start. Same commit 41-a used, so our receipts cross-check.
- Runtime: **node v24.21.0** (the fleet's stated major; README's own receipts were made on v22 — see Honest limits).
- Verifier checkout: `/home/z/my-project/download/quilt-stone` @ **36253a7** (main), used via pong's own `loadStone()` seam (`QUILT_STONE_DIR`).
- Env keys: none needed — no live/network flows exercised; nothing sourced, nothing printed.

## What works (receipts)

**1. The suite, run per README's canonical command** (`node --test tests/*.test.js && node --test tools/test-qa.js`):

```
tests/:  ℹ tests 223 | ℹ pass 214 | ℹ fail 2 | ℹ skipped 7
tools/test-qa.js: ℹ tests 8 | ℹ pass 8 | ℹ fail 0
```

So **216/223 passing + 8/8 qa; 2 red pins** (both are docs-integrity pins firing on real rot — see P1). Everything else — honesty, seam, coev, wal-session, stone-*, site-glue — is green on this runtime.

**2. Birth-seal chain walk at current main, with their own verifiers.** The canonical checkpoints are sealed at birth into `checkpoints/stone-v1.json` (header + 4 `{file, md5}` LINK rows).

```
WALX.verifyStoneV1(seal)            -> {"ok":true,"links":5,"tip":"c155fd016b364335c076cc18772b835672581230c2fd377fd8ac9f2849d296c7"}
QUILT_STONE_DIR=… stone.verifyChain -> {"ok":true,"firstBadIndex":null,"links":5,"tip":"c155fd01…"}   (quilt-stone's OWN stone.mjs, live)
same verifier over the 6-row signed variant (41-a's staple copy) -> {"ok":true,"links":6,"tip":"c155fd01…"} — the 6th row is the stone.sign annotation; per the stone-v2 rule it is skipped in chaining, so the body tip does not move.
```

Verdict: **ok:true, tip c155fd016b364335…** — *not* the `ffe8abd8…` this lane's brief expected. That is documented lineage, not tampering: the R41 fitness-weights change rewrites maxSpeed embedded in level1/level2, R42 re-embedded the artifacts, and pong's own claim row (`core.js` `artifact-maxspeed-lineage`, proofTest `tests/artifact-maxspeed-lineage.test.js`, which passes) states exactly this: *"the R41 receipt's 'md5 set byte-frozen' claim was falsified at the file level … populations byte-identical"*. The brief's tip is the pre-R42 value; flagging so the next brief carries c155fd01.

**3. Adversarial pass — field-flip: caught at the exact row.** Flipped one payload md5 (`bad[2].args.md5 = deadbeef…`) in a copy:

```
mirror verifyStoneV1: {"ok":false,"at":2,"why":"hash mismatch","links":2}
live  stone.verifyChain: {"ok":false,"firstBadIndex":2,"at":2,"why":"hash mismatch","links":5,…}
```

Both verifiers name row 2 and refuse. (Row-structure attacks — swap/dup/replay — are 41-a's §A/§B matrix, 11/11 + 4/4 caught; not re-run here.)

**4. Replay — byte-identical re-birth.** Full `QUILT_STONE_DIR=… node tools/prerun.js` (the real evolution, 2×260 generations, ~minutes):

```
level0: gen 0   best fitness 5767 (frames 4567, hits 12, speed x2.83)
level1: gen 60  best fitness 8700 (frames 6000, hits 27, speed x3.50)
level2: gen 260 best fitness 8800 (frames 6000, hits 28, speed x3.48)
md5 curve.json 63617065…  level0.js 8a49b0f6…  level1.js cf08b000…  level2.js c8ba57db…
stone: sealed 4 checkpoint rows -> checkpoints/stone-v1.json; mirror ok; live stone.mjs verifyChain: ok (links 5)
```

- `git status --short checkpoints/` afterwards: **empty** — every replayed byte (including the regenerated seal) equals committed main. Byte-reproducibility holds at current main (next frozen round after PLAYLOG's seventeen).
- curve/level0 md5s match PLAYLOG's frozen canonical set; level1/level2 md5s are the documented post-R42 maxSpeed lineage.
- The run then printed: `stone: SIGN/REFUSED verifyTipSignature rejects the staple {"ok":false,"why":"signature invalid for this tip and key",…}` and left **no** `stone-v1.signed.json` — the verify-before-write gate bricked the staple and wrote nothing (fail-first held). See P3: the signature was actually valid; the verifier is what false-negatives.

**5. Headless drive.** `tools/test-qa.js` — README:136's headless harness that drives the shipped glue expressions — **8/8**, including a one-frame live() drive (45 MOTH writes + C1 generation + a death) and ledger-eviction accounting. Combined with the full prerun replay above, the game/core/QA loop is exercised headlessly end-to-end; no browser session attempted (Honest limits).

## Findings

Severity key: CRITICAL = forgery/laundering possible; MAJOR = false verdicts or broken documented flows; MINOR = real gap, bounded impact; NIT = polish.

**P1 — MAJOR: the suite is RED at main — two docs-integrity pins fire on genuine rot (and one README block contradicts itself three times).**
`node --test tests/*.test.js` → 2 failures:
- `tests/canonical-index.test.js:50` — `duplicated index rows: R41, R42, R41` in PLAYLOG.md's canonical index. The R41 row was re-added on top of the restored one (cf. commit 56f9e73 "restore R41 receipt (lost in #55 merge)"). The history index — the repo's memory — now lists R41 twice.
- `tests/readme-count.test.js:78` — `README claims 216 tests in tests/ but the suite runs 215`. Worse: README lines 81-83 carry **three stacked count lines** — "(224 tests total: 216 in tests/…)", "(215 tests total: 207 in tests/…)", "(212 tests total: 204 in tests/…)" — each claiming "counts verified by running". A count-patch war left all three in; none matches the live 223+8.
Impact: "suite green" is a shipped claim and the README's re-verify command is the repo's front door. The pins did exactly their job (they fired, with the rotter's name on them); main just hasn't answered the door. One-line docs fixes both.

**P2 — MINOR (docs-vs-artifact honesty): README's headline checkpoint table is stale after the R41/R42 re-evolution — the trained-level rows are swapped.**
README lines 57-59 claim L1 8,800 (28 hits, ×3.40) and L2 8,700 (27 hits, ×3.40), echoing PLAYLOG's old "note L1 > L2, honestly" (PLAYLOG:2036,2131). The actual canonical artifacts — replayed byte-identically here — are **L1 8,700 / 27 hits / ×3.50 (3.497)** and **L2 8,800 / 28 hits / ×3.48 (3.476)**: the hit-weight change inverted the L1/L2 relationship, and the prose ("Checkpoints were re-evolved under the new weights (numbers below)") kept the pre-R41 numbers. A repo whose brand is "the drawn paddle IS the registered hitbox" should not have a table whose numbers are the old weights'.

**P3 — MAJOR (cross-repo; independently confirms 41-a's quilt-stone P1 from the consumer side): the birth-seal SIGN lane is bricked on node v24.21.0 — `verifyTipSignature` false-negatives a VALID signature when the verifying key is a PEM string, which is exactly what pong's prerun passes.**
- Repro (this lane, fresh): signed the current 5-row birth seal with a producer key via `stone.signTip`, then `stone.verifyTipSignature(signed, pubPemString)` → `{"ok":false,"why":"signature invalid for this tip and key"}`. The produced sig is **byte-identical** to the staple in `playtest-wave41/stone-v1.signed.json`, and direct node crypto `verify(null, msg, PUB_KeyObject, sig)` → **true** on the same runtime.
- Root cause (quilt-stone stone.mjs `edVerify`, ~stone.mjs:433-439): it tries `verify(null, msg, sig, pub)` (swapped) and retries the correct order only on `ERR_INVALID_ARG_TYPE`. On node v24.21.0 with a **PEM string** in the key slot, the swapped call throws `ERR_OSSL_UNSUPPORTED` (decoder routines::unsupported) instead — not caught — so `verifyTipSignature`'s `catch { good=false }` swallows a decoder error and reports "signature invalid". With a **KeyObject** the swapped call throws `ERR_INVALID_ARG_TYPE`, the fallback runs, and verification succeeds (which is why 41-a's producer.mjs verified ok:true via its KeyObject path while "the pong path" refused — producer.mjs:15-16 explicitly labels both).
- Blast radius on pong: `tools/prerun.js`'s R39 sign pilot passes `publicKeyPem` (a PEM string) → on node v24 every birth-seal run with a sign-capable checkout exits SIGN/REFUSED after writing the unsigned seal. No bad staple ever ships (verify-before-write holds — the refusal is loud, labeled, and wrote nothing), but the documented R39 pilot flow is unrunnable on the fleet's stated runtime. Fix shapes: widen `edVerify`'s discriminator to include `ERR_OSSL_UNSUPPORTED` (or try both orders unconditionally / verify over a KeyObject upstream), or in prerun.js pass a KeyObject to `verifyTipSignature`.

**P4 — NIT (brief hygiene, no defect): the mission brief's expected tip is stale.** Current main's birth-seal tip is `c155fd016b364335…` (links 5; the 6-row signed variant reports links 6 with the annotation row skipped per the v2 rule — tip unchanged). The `ffe8abd8…` in the brief is the pre-R42 value; pong's own artifact-maxspeed-lineage receipt documents the transition. Update the brief so future lanes don't misread the mismatch as tampering.

## Suggestions (gift-framed)

- The three stacked README count lines want to become **one line generated from the live count** (or deleted in favor of the pin's own output) — the R19 pin already does the verification; let the prose quote it rather than restate it.
- The swapped L1/L2 table is a free honesty-upgrade: correcting it turns a latent "gotcha" into another receipt of the R41 weights story (the inversion is *interesting* — under hit×100 the deeper population wins).
- For the sign pilot: one-line upstream fix in quilt-stone's `edVerify` (accept `ERR_OSSL_UNSUPPORTED` as the retry discriminator) unbricks every consumer on node v24; a KeyObject hand-off in prerun.js is the zero-upstream-change alternative. Happy path already proven: the KeyObject route verifies ok:true on the identical bytes.

## Lessons for crab-traps

- **Numbers in prose rot even when a run-verified pin exists** — pong has a pin built precisely to kill count-rot, and the README still carries three dead counts. Crab's pattern of sealing numbers in a verdict JSON and having the test assert artifact==measured (SCN-003 style) is the stronger immune system; keep prose quoting artifacts, never restating them.
- **Verify-before-write saved pong from shipping a self-inconsistent receipt** (a staple whose own verify fails). Crab's seal-mode ("a re-seal is a no-op unless something changed — the diff IS the receipt") is the same instinct; keep the FAIL-first brick on every new live path, including judge/LLM extraction.
- **A verifier that swallows an unexpected exception class turns a decoder error into a "forgery" verdict** — the inverse failure of the thing crab's economy-of-honesty chamber studies. When crab arms live judges (see `self-crab-traps.md` P1), fail toward *labeled hole*, never toward a fabricated number or a false CAUGHT.
- Cross-lane receipts compose: 41-a found the edVerify bug from the verifier side; this lane hit it from the consumer side and reproduced the exact refusal line in prerun. Two independent repros of one root cause — that's how a fleet finds truth fast.

## Honest limits

- No interactive browser session; the headless drive is `tools/test-qa.js` (8/8) plus the full prerun training replay through the same core. The site's `/api/replay` worker path was not driven over HTTP.
- Runtime is node v24.21.0, not the README's stated v22; the two red pins are deterministic docs assertions (not runtime-sensitive), but the 215-vs-216 count was not re-derived under v22.
- The 7 skipped tests were not itemized (suite-level skips are pinned by pong's own honesty tests); the 2 failures were not fixed — read-only lane, fixes belong to pong's keepers.
- The birth-seal walk used pong's vendored mirror + quilt-stone's live `verifyChain` @ 36253a7; I did not re-audit stone.mjs itself (that is 41-a's report, and my P3 confirms its key finding independently).
- Full SHA of quilt-stone's auditor-experience main and pong HEAD cross-checked against 41-a's report — identical checkouts, no drift during the wave.
