# Playtest: crab-traps (self) @ 6536563

Lane 41-b "pong-playtester", self-playtest arm: our own repo, our own suite, our own sealed verdict — plus the known self-finding task: confirm or refute that the SCN-003 judge extracts scores by deep-scanning for any number in [0,1] instead of a name-keyed parse. RESEARCH ONLY — zero foreign writes, zero pushes. Companion report: `pong-quilt.md` (same lane).

## Setup

- Clone present: `/home/z/my-project/download/pt-crab-traps` (clone of the local `/home/z/my-project/download/crab-traps`), HEAD **6536563** ("scn-003 (40-d): offline arms run, verdict SURVIVE, live fail-closed skip"), working tree clean at start and after all runs.
- Runtime: node v24.21.0, vitest v2.1.9, run from `worker/` via the repo's own `npm test` (`npm run build && vitest run`).
- Env keys: not needed — everything run is the offline/deterministic half; no LLM, no network, no keys touched.

## What works (receipts)

**1. The worker test suite — exactly the expected tally.**

```
Test Files  21 passed | 1 skipped (22)
     Tests  444 passed | 2 skipped (446)
```

**444 passed | 2 skipped** — matches the brief's expectation digit-for-digit. (Build step ran clean first; total wall time a few minutes.)

**2. SCN-003 offline verdict path re-run in isolation, sealed numbers reproduce.**

```
npx vitest run src/arena-scenarios-003-offline.test.ts
 ✓ src/arena-scenarios-003-offline.test.ts (13 tests) 135ms
 Test Files  1 passed (1)  |  Tests  13 passed (13)
```

The test re-measures both deterministic arms and asserts equality against the committed `arena-scenarios-003-offline-verdict.json`. Sealed values confirmed present in the artifact and reproduced by measurement:

- `T_unsigned = 2500` (`arm_A_unsigned.T_unsigned`)
- `T_signed_by_weighting = {"h1": 588, "h100": 86}` (the 588 = B2_extend_head(h=1) hash_calls; the 86 = B2_extend_head(h=100) hash_calls; B1 lazy-mutate caught at edge 19; B3 mid-chain variants 820/91 hash calls)
- `D_by_weighting = {"h1": 0.7648, "h100": 0.9656}` — both clear the 0.20 line
- `verdict`: "SURVIVE — the economy-of-honesty hypothesis holds in the registered offline arms … the pre-registered kill does not fire", consistent with the measured D values under the registered rule (the test checks consistency, not outcome — a KILL would pass equally honestly)
- `live_game_skip_receipt`: `skipped:true, fail_closed:true`, missing keys listed by name, "zero live calls attempted; $0 spent" — the armed live driver (`arena-scenarios-003-live.test.ts`) stays `describe.skip` (see P1 scope below).

## Findings

Severity key: CRITICAL = forgery/laundering possible; MAJOR = false verdicts or broken documented flows; MINOR = real gap, bounded impact; NIT = polish.

**P1 — CONFIRMED (with one nuance in our favor): the SCN-003 judge's score extraction falls back to a whole-envelope deep scan for any number in [0,1] instead of a strict name-keyed parse — `worker/src/arena-scenarios-003-live.test.ts`.**

The exact code, by line (HEAD 6536563):

- **:604** — `const answersRoot = (raw as any)?.answers ?? raw ?? {};` — the typed answers dict **if present**, else the fallback root is the **entire raw response envelope** (which carries `usage`, `model`, echoes, whatever the runtime adds — arbitrary number-bearing fields).
- **:605-:626** — `scanNum`: a recursive deep-scan over the whole value — numbers accepted iff in [0,1]; **strings accepted via `parseFloat` with no anchoring** (`"0.5x"` → 0.5, `"0.99 (uncertain)"` → 0.99); arrays and object values traversed depth-first; returns the **first** hit.
- **:651-:654** — the per-question loop: `const sub = answersRoot?.[q] ?? null; extracted[q] = sub !== null ? scanNum(sub) : scanNum(answersRoot);` for `p_unsigned_pass` / `p_signed_pass` — so there **is** a name-keyed attempt first (that's the nuance), but when the key is missing the fallback scans the entire envelope and will happily fill both p-slots **with the same first-found unrelated number** (e.g. a 0…1 value inside `usage` or any echoed field).
- **:655-:658** — same pattern for the choice question `more_dangerous` with `scanToken` (:628-:649, accepts only exact `"unsigned"`/`"signed"` strings, but again scans the whole envelope as fallback).
- **:592-:594** — the code comments admit it: *"per-question extraction from the typed envelope's answers dict, with a whole-envelope deep scan as fallback"*.

The file's own ethos — "an extraction gap is an honest hole, not lost evidence" — is only half-honored: `raw` is receipted either way (receipt.raw, :597), but `extracted[q]` is **not labeled** keyed-vs-fallback, so a scanned value is indistinguishable from a keyed one in the judge receipts.

**Scope mitigation (checked, matters for severity):** the live driver is `describe.skip` and the sealed verdict's `live_game_skip_receipt` shows the live game has **never run** (fail-closed on missing keys, $0 spent). So the defect is latent — armed-but-dormant — but the first live SCN-003 run is the registered next step, and its headline numbers (p_unsigned_pass/p_signed_pass) are exactly what this code would produce. If the answers dict is absent or mis-shaped on that run, the chamber's economy-of-honesty verdict could be computed from a stray number in the response envelope. Severity: **MAJOR-latent** (false-verdict risk in the documented next flow, mitigated only by the skip).

**Fix shape (gift to ourselves):** strict, typed, name-keyed parse only —
1. Require `raw.answers` to exist and be an object; if absent → extraction fails to `null` with a **labeled hole** in the judge receipt (raw already kept for audit).
2. `noul` questions: accept only `typeof sub === "number" && sub >= 0 && sub <= 1` at the top level of `answers[q]` — no recursion, no parseFloat of strings, no cross-envelope scan.
3. `choice`: accept only exact token equality against `unsigned`/`signed` at the top level of `answers.more_dangerous`.
4. Record `extracted_source: "keyed" | "hole"` per question in the judge receipts so keyed vs scanned (vs absent) is always distinguishable — the receipt-only fallback becomes an audit trail, never an input.
5. Add a pin in the offline test (no keys needed): assert the extraction helper refuses a keyless envelope (returns labeled holes) — the FAIL-first mirror of what P1 does today.

**P2 — MINOR: `scanNum`'s `parseFloat` laxity is independently exploitable even on the keyed path** (:610-:613): a model returning `"p_unsigned_pass": "0.9 (estimate)"` yields 0.9 with the trailing caveat silently dropped; `"50%"` yields 50 → rejected only by the range check, not by parse discipline. Subsumed by the P1 fix (typed parse), but worth pinning separately in the helper's tests.

## Suggestions (gift-framed)

- The extraction helper is ~50 lines inside a test file; lifting it into a small pure module (`judge-extract.ts`) with the strict parse + the no-keys pin would let both the offline pin and the (future) live driver test the exact same code — same move as the repo's one-dialect stone exporter.
- When the live run is armed, the fail-closed gate could also assert `answers` dict presence on the first response before spending further rounds — cheap tripwire that turns P1 from a silent-corruption risk into a labeled first-round hole.

## Lessons for crab-traps (self)

- **Same disease pong just showed us**: pong's verifier false-negatived a valid signature by swallowing an unexpected error class (see `pong-quilt.md` P3); our judge would fabricate a plausible score by scanning past a missing key. Both are "the parser keeps going when the shape is wrong." The shared lesson: **shape failure → labeled hole, never a best-effort value.**
- The fail-closed skip receipt ($0, keys named, driver stays skip) is exactly why this defect stayed latent — the gate did its job. Keep the same gate discipline for the first live run; add the P1 fix **before** arming, since the skip protects us only until then.
- The sealed-verdict pattern (registration commit c2696e4 → deterministic re-measure → artifact asserted by test) reproduced perfectly on an independent re-run — this is the immune system that pong's prose-count rot (three stacked README count lines) lacked. Worth defending loudly in docs.

## Honest limits

- I confirmed the judge code path by reading + line-citing the armed driver and reasoning over the envelope shapes; I did not execute the judge path against a live or recorded model response (none exists — the live run has never happened, by design). The deep-scan behavior for the fallback branch is deterministic from the code as written (:604-:654), not speculation, but the "same number fills both p-slots" scenario is unexercised until a real envelope exists.
- The 2 skipped suite tests are the by-design skips (live/armed files); not itemized beyond that.
- No pushes, no fixes applied — HEAD left at 6536563, working tree clean; the fix shape above is a proposal for our own next lane, not a patch.
