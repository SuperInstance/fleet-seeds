# PREREGISTER — the fleet's one pre-registration primitive

*wave 67-c. Distills the pre-registration/seal boilerplate that the wave-66
seed-DNA census (quilt-atlas 6df5d1d §3.3) found hand-rolled 7+ times across
the fleet. Hosted by the fleet's registry: `tools/preregister.mjs` — one
file, stdlib-only, zero network, zero keys.*

## The census: seven hand-rolls, one contract

| # | repo / artifact | what it contributed |
|---|-----------------|---------------------|
| 1 | **quilt-qcells** `registration.json` | claims `{id, claim, status:PENDING}` registered before any conformance run; `seals` bind sha256+mtime+size of the exact code version under test; stale seal ⇒ the run refuses (fail-closed); remedy is re-register + re-run |
| 2 | **jev-garden** `registration.json` | "pre-registration seal": sha256 of `docs/PREDICTIONS.md` + `sealed_at_iso`; experiments verify the seal at startup, mismatch ⇒ exit 2; `seal_history` is an **append-only chain of 22 versions** (addenda registered pre-run, verdicts appended beside untouched text) |
| 3 | **quilt-bandit** README + TEST-RECEIPT | the "10-seed pre-registered ensemble"; claims sealed verbatim — **HELD or FAILED, no threshold surgery**; the verdict-of-record table sits in the README beside the pre-registered claim text |
| 4 | **erised-fleet-table** `predictions.json` | `writtenBeforeFirstRun: true`; predictions `{id, claim, falsifiedIf}`; `results[]` appended later beside untouched claims; P3's scar clause was **vacuously satisfied and receipted honestly**, not silently passed |
| 5 | **cog-lab** `RULES.md` | "rules as receipts dated before the run that produces the numbers — if a number below was produced before this file existed, distrust it"; R3 pre-registers the expected crack; R4: **std == 0 ⇒ INCONCLUSIVE, never PASSED** |
| 6 | **murmuration** README + docs/ITERATIONS | the vacuity law: *"a relational claim over a constant measurement is vacuously true"* — any claim resting on `std == 0` is scored INCONCLUSIVE, never PASSED; it refused three of the author's own numbers |
| 7 | **quilt-jepa** `registration-v10.json` | **the gold standard**: 28 claims `{id, text, verdict_rule}` + 5 pre-registered predictions, self-referential seal (`self_sha256_masked`, fixed mtime, `sealed_by`), **sealed and pushed pre-run in commit aee0335 (2026-10-02T01:18Z) — then scored from the receipt only** |

## The irreducible contract (what all seven share)

1. **A claims file** — every claim carries `id`, `claim`, `metric`,
   `threshold`, and the **refusal branch** (what would falsify it, written
   pre-run — jepa's `verdict_rule`, erised's `falsifiedIf`, bandit's sealed
   bar, cog-lab's "expected crack").
2. **Sealed BEFORE the experiment** — a hash over the claims content plus a
   timestamp and tool version, recorded in a seal file (qcells/jev-garden
   sha256+mtime+size; jepa's masked self-hash). Not "written before",
   *hash-bound before*: intent is not custody, a hash is.
3. **Verdict appended LATER beside the untouched claims** — results are a
   separate append (erised `results[]`, jev-garden `seal_history` verdict
   addenda, bandit's verdict-of-record table). Claims are never edited after
   the run; new knowledge is a new addendum, not a rewrite.
4. **Any post-hoc edit is detectable by re-hashing** — and the scoring step
   **refuses to score modified claims** (jev-garden exit 2 at startup,
   qcells refusing stale seals). Fail-closed, by name.

## The ritual (jepa aee0335 is the gold standard)

The seal only proves *intent* if the world can see it before the outcome
exists. The push is the timestamp the fleet can prove:

```
1. write claims BEFORE the experiment                  (contract a)
2. node tools/preregister.mjs seal --claims=claims.json --out=seal.json
3. git add claims.json seal.json && git commit && git push   ← BEFORE any
   verification is possible; verify the push landed (ls-remote)
4. run the experiment
5. node tools/preregister.mjs score --claims=… --seal=… --results=… --out=verdict.json
6. git commit the verdict beside the untouched claims   (contract c)
```

jepa ran exactly this in wave 64: `registration-v10.json` sealed, pushed in
aee0335 at 01:18Z, the depth-ladder round ran afterwards, and the verdicts
were scored from the receipt only — nobody could accuse the round of
adjusting the bar after seeing the numbers, because the bar was on the
remote before the run.

## CLI

```
preregister seal   --claims=<path> --out=<path> [--prev-seal=<path>] [--note=<text>]
preregister verify --claims=<path> --seal=<path>
preregister score  --claims=<path> --seal=<path> --results=<path> --out=<path>
```

- `seal` writes `{tool:"preregister@1", sealedAt, claimsHash, claimsPath,
  prevSeal?, note?}`. The hash is **sha256 over canonical JSON** (recursive
  key-sort, no whitespace) of the *parsed* claims document — reformatting or
  reordering keys does not break the seal; changing any value does.
  `--prev-seal` chains addenda (the jev-garden `seal_history` pattern).
- `verify` re-derives the hash: PASS (exit 0) or refuses by name (exit 1):
  `E_CLAIMS_MODIFIED` (claims touched post-hoc) / `E_SEAL_MALFORMED`.
- `score` **first verifies** (fail-closed — scoring tampered claims is
  E_CLAIMS_MODIFIED, never a warning; this is the whole point), then scores
  each claim's metric against its sealed threshold
  (`eq|neq|gt|gte|lt|lte|range|expr` — expressions use a tiny recursive-descent
  evaluator, `eval` is never called) and writes a verdict per claim:
  - **PASS** — measured satisfies the sealed comparator;
  - **FAIL** — measured violates it (an honest finding; still exit 0 — a
    FAIL is a receipt, not a tool error);
  - **VACUOUS** — the clause did not discriminate this run: the results
    declare `{"vacuous":true,"reason":…}`, the claim's pre-registered
    `vacuousIf` murmuration clause holds, or the measured value is null.
    Explicit, with the reason carried in the receipt — never a silent pass;
  - **PENDING** — the metric is absent from results: not checkable this
    wave. The honest state for predictions whose experiment hasn't run.
- Exit codes: `0` ok/verdicts-scored · `1` fail-closed (named error) ·
  `2` usage. Errors: `E_CLAIMS_MALFORMED`, `E_CLAIMS_MODIFIED`,
  `E_SEAL_MALFORMED`, `E_RESULTS_MALFORMED`, `E_MEASURED_NOT_COMPARABLE`,
  `E_EXPR_BAD`.

## Honesty laws encoded (do not weaken them downstream)

- **No threshold surgery** (bandit): the scorer evaluates exactly what was
  sealed; the threshold travels inside the hash.
- **Vacuity is receipted, not passed** (murmuration, erised P3, cog-lab R4):
  a vacuously-satisfied clause is a named verdict with a reason, never PASS.
- **The verdict is a pure function** of (claims, seal, results): byte-identical
  inputs give byte-identical verdicts; there is no wall-clock inside
  `verdict.json` — the commit that carries the verdict is its timestamp
  (composition law 2: time is ticks, not clocks).
- **Zero network**: the git push of the seal is the human/agent ritual; the
  tool never touches git or the network itself.

## Porting

Single file, `node:crypto` + `node:fs` only, no intra-repo imports. The
canonical-JSON dialect is byte-compatible with the fleet's stone custody
class (`tools/lib/stone-v1.mjs`) — hashes here agree with hashes there on
the same values. Tests: `node --test tools/preregister.test.mjs` (19 tests:
roundtrip, key-order independence, tamper fail-closed, four verdicts,
murmuration clause, determinism, comparator matrix, expr error names,
stone-v1 dialect cross-check).

Live dogfood: `seeds/preregister-67c.json` (+ `.seal.json`, `.results.json`,
`.verdict.json`) — three real wave-67 predictions sealed and pushed before
any verification, scored beside untouched claims.
