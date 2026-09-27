# playtest/wave44 — lane 44-b: instrument adoption

Wave-43's ADOPT list items 2, 3, 5, executed as hands-on fleet instruments.
All three are stdlib-only, pre-registered (claims files written and hashed
BEFORE any run), and pass with receipts. Zero foreign writes; source repos
imported READ-ONLY at pinned commits (their working trees receipted clean).

| instrument | adopts | pinned source | verdict |
|------------|--------|---------------|---------|
| `exact-twin/` | micrograd-quilt exact rational twins + stochastic auditor as an affordable-exactness audit for qthe-style graphs | `82c295f1555062d80d7ff087aeb83667675062a3` | **PASS 4/4** — max drift 3.2e-16 fwd / 2.0e-16 grad; exact paths agree Fraction-exact; 74/74 injected 1-ulp corruptions flagged; tape replay bitwise |
| `pairing/` | ropesight `plainCourseTokens` as a zero-coordinator fair-rotation pairing schedule | `d8b1bb40fd9f797ab96b5b544bf05302fcefcdee` | **PASS 4/4** — N=6: 30/30 ordered pairs exactly 10 meetings (ratio 1.0) vs RR 6/30; maxWait 9; rows byte-equal to the clone; uniformity holds at every tested stage N=3..8 |
| `witness-grammar/` | mavis STITCH/WITNESS/PROMOTE as the fleet receipt grammar, HARDENED to a single strict sha256 parent chain + explicit verify | `808f0d3ec8eaaba656412188e8337479e5d0b42a` | **PASS 3/3** — 17/17 checks: KAT (real artifact hashes) verifies; all 10 negative controls fail closed; determinism holds |

Layout per instrument: `claims.json` (pre-registered, sha256+mtime receipted
in each verdict) -> experiment code -> `results.json` (machine receipts) ->
`verdict.md` (claims-vs-results + honest limits).

Run everything:

```
python3 exact-twin/audit.py <micrograd-quilt clone>     # or MQT_EQ_PATH env
node pairing/run.mjs                                    # RS_PATH env for cross-check clone
node witness-grammar/test.mjs                           # KAT + negatives, end-to-end
node witness-grammar/verify.mjs witness-grammar/kat/chain.jsonl \
     --expect-tip=$(cat witness-grammar/kat/chain.tip)  # exit 0
```

Cross-instrument note: the witness KAT chain's receipts carry the true
sha256s of the exact-twin and pairing artifacts — the adopted grammar is
already witnessing the other two adopted instruments.
