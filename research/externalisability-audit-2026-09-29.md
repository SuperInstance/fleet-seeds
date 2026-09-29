# Externalisability audit — 10/10 sealed predictions, 0/10 externally decidable

A fail-closed gate plus the audit receipt that motivated it.

## What was run

Ten sealed mines from `lode/mines.jsonl` were stripped to their prediction text alone —
no repository, no fleet context, no identity, no substrate documentation — and handed to
an outside verifier on a different model lineage from the keeper's agents, under three
deliberately different framings.

| framing | question | YES | NO |
|---|---|---|---|
| `decide` | can you determine PASS/FAIL from this sentence alone? | **0** | **10** |
| `independence` | could a stranger who has never heard of this project decide it? | **0** | **10** |
| `adversary` | can this be made technically true while substantively empty? | **10** | **0** |

Thirty calls. Unanimous on all three.

## The finding is not what it looks like

Every one of the ten **does** state an explicit failure condition. The sealing discipline
is real. All ten `pred_sha256` values verify. The problem is narrower and worse:

> The fleet has falsifiers but not substance tests.

The pass conditions are presence-of-bookkeeping checks, and the adversaries named the
cheapest way to satisfy each one. Verbatim, three of ten:

- **M1** — "Create/patch three lane registration files to cite any mine id already in
  PLANNING.md, and append a boilerplate `nearest_prior: X; delta: Y` to every other
  registration so none lacks both. *Ritual — it checks citation/statement presence, not
  whether the cited mines, priors, or deltas are meaningful.*"
- **M4** — "Put an unlimited/zero-spend cap line in every header/verdict, PASS only
  no-ops or already-registered items, and auto-FAIL any new-constant attempt lacking a
  note. *Ritual — it verifies labels and vacuous bookkeeping.*"
- **M9** — "Make the wave-60 PLANNING queue empty (or redefine it to include only
  already-compliant items), so 'at least half' is vacuous and 'fewer than half' never
  triggers FAIL. *Ritual; it tests denominator/wording manipulation.*"

Note the shape of M9: the denominator is under the author's control, so the pass
condition can be made vacuous by shrinking the thing being counted. That is a
different failure from M1's, and it needs a different check.

## The gate

`scripts/lode_externalisability.mjs`. Deterministic, no model in the loop, fail-closed
(exit 2), `--self-test` with 5 legs. It audits four properties:

| check | law | catches |
|---|---|---|
| `E1_ANCHOR` | names a public artifact an outsider could fetch | "unanchored — only the fleet can decide this" |
| `E2_NO_VACUOUS_DENOMINATOR` | the author does not control the denominator | "at least half", "at least one", empty-set vacuity |
| `E3_NO_BOOKKEEPING_PASS` | the pass condition is not satisfiable by writing a field | "every registration carries a statement", "cites a mine id" |
| `E4_EXPLICIT_FAIL` | states a failure condition | the most basic defect |

It also re-verifies `pred_sha256` and reports seal integrity independently, because an
externalisability verdict on a broken seal would be meaningless.

## Result on the current mines

```
mines: 10   externally decidable: 2   verdict: NOT EXTERNALLY DECIDABLE
  [FAIL] M1   E3_NO_BOOKKEEPING_PASS                              seal:ok
  [FAIL] M2   E2_NO_VACUOUS_DENOMINATOR, E3_NO_BOOKKEEPING_PASS   seal:ok
  [ok  ] M3   -                                                   seal:ok
  [FAIL] M4   E1_ANCHOR, E3_NO_BOOKKEEPING_PASS                   seal:ok
  [FAIL] M5   E1_ANCHOR                                           seal:ok
  [FAIL] M6   E1_ANCHOR, E3_NO_BOOKKEEPING_PASS                   seal:ok
  [ok  ] M7   -                                                   seal:ok
  [FAIL] M8   E1_ANCHOR                                           seal:ok
  [FAIL] M9   E2_NO_VACUOUS_DENOMINATOR                           seal:ok
  [FAIL] M10  E1_ANCHOR, E2_NO_VACUOUS_DENOMINATOR, E4_EXPLICIT_FAIL  seal:ok
```

Exit code 2. All seals intact.

Two mines (M3, M7) pass because their pass conditions are substance claims about a
single named experiment with an explicit fail event. That is the shape to copy.

## What this is not

This is not a claim that the predictions are dishonest. Ten of ten were registered in
good faith, the loop is working, and the negative ledger and honest FAIL of record
(JEV-A11, −0.0825) are evidence of real discipline.

This is a claim about **reachability**. A prediction whose pass condition can be
satisfied by bookkeeping has a receipt but not a test, and the difference is invisible
from inside the fleet because everyone inside the fleet already knows what the
substance is.

## Suggested integration

Two options, both compatible with the existing `lode_validate.mjs`:

1. **Advisory.** Run the gate in CI and report; do not block registration.
2. **Blocking for new mines.** `lode_validate.mjs` gains an `--external` flag that also
   requires all four checks to pass before a new `mines.jsonl` line is accepted. Existing
   mines are grandfathered; the law applies from the next wave.

Recommendation: option 2 for new mines only, with the four checks reported on the
existing ten so the fleet can see the shape of the debt rather than infer it.

## The one-line version

`lode_validate.mjs` asks *is this well-formed*. This asks *can a stranger decide it*.
Both matter. Only the second one makes a receipt worth something to anyone outside.

## Provenance

- 30 DeepSeek-flash calls, temperature 0.7-0.9, model lineage independent of the keeper's
  agents. Raw outputs are the `blind_results.json` artifact this document was written from.
- Gate self-test: 5/5 legs correct, including a positive control that passes and a
  bookkeeping-satisfiable negative control that fails.
