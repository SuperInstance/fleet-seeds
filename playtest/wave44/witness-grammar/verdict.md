# verdict — 44-b witness grammar (mavis adoption, hardened)

**VERDICT: PASS 3/3 claims — 17/17 checks (4 KAT positives, 10 negative controls, 3 determinism), zero escapes.**
Pre-registered claims: `claims.json` (sha256 `79bb896161e30d64afd571518d105716fb1f5ff6ad84439291a4af47e12f15f3`, mtime epoch 1790545621) — registered BEFORE any test run.

## Instrument adopted + hardened

SuperInstance/mavis-substrate-walker (pinned commit
`808f0d3ec8eaaba656412188e8337479e5d0b42a`) — STITCH/WITNESS/PROMOTE. The
wave-43-b isomorphism verdict said our fleet lacks (a) enforced parent-chained
witnesses and (b) an explicit verify command. This deliverable ships both:

- **Hardening vs mavis**: mavis's `WitnessChain` anchors each witness to the
  last THREE witnesses (rolling window, FNV1a-64). Ours anchors each receipt
  to the **single strict parent = full sha256 of the previous receipt's
  canonical form** (first receipt: `"GENESIS"`), so ANY tamper, skip, or
  reorder anywhere in the chain breaks verification — fail-closed by
  construction. sha256 replaces FNV1a-64 to match the fleet's rekor/VC
  transparency instruments.
- **Grammar** (exactly the task's five fields, no more):
  `{ claim, inputs_sha256, output_sha256, parent, ts }`;
  `id = sha256(canonical JSON)` (sorted keys, tight separators — same shape
  as mavis `hash_witness` and quilt tape `_canon`); chain = JSONL;
  `tip = id(last receipt)` — what an external pin anchors to.

## Files

- `witness.mjs` — grammar lib: canon/id, field validation, `verifyChain`
  (recomputes every id, checks every parent link, duplicate-id rejection,
  empty-chain fail-closed, optional `expectTip` pin).
- `verify.mjs` — CLI: `node verify.mjs <chain.jsonl> [--expect-tip=<hex>]`;
  one JSON verdict line; **exit 0 iff all good**.
- `gen_chain.mjs` — emits the committed KAT chain from REAL wave artifacts.
- `kat/chain.jsonl` + `kat/chain.tip` — committed sample chain, 5 receipts,
  tip `e4226c8846a9528253a4f193e21099abb87b275859edd7290556f8b3c7cdc69c`.
  The receipts' `inputs_sha256`/`output_sha256` are the true sha256s of this
  wave's sibling artifacts (claims -> results, harness -> gradients, module ->
  results), so the KAT witnesses the 44-b adoption itself — the grammar is
  immediately IN USE, not demonstrated on toy data.

## Claims vs results

- **P1 — KAT verifies: PASS.** `node verify.mjs kat/chain.jsonl
  --expect-tip=$(cat kat/chain.tip)` exits 0, `ok=true`, 5 receipts, and the
  tip equals an independent last-receipt hash recomputation in the test
  process (not via verify.mjs).
- **P2 — negatives all FAIL: PASS (10/10).** Every control exits non-zero
  with `ok=false` and a locating error: (a) tampered claim byte; (b) wrong
  parent on a middle receipt; (c) skipped (deleted) middle receipt; (d)
  reordered receipts; (e) tampered ts byte; (f) forged first receipt with a
  64-hex parent instead of GENESIS; plus (g) empty chain (fail-closed);
  (h) corrupt JSON line; (i) wrong expected tip; (j) tampered LAST receipt —
  the case chain-internal links cannot see, caught only by the pinned tip
  (documented semantics: tip tamper-evidence REQUIRES an external pin).
- **P3 — determinism: PASS.** The same receipt object hashed in two separate
  node processes yields the identical sha256 id; a single-receipt GENESIS
  chain verifies; the same receipt with a mutated claim fails against the
  original id pinned as tip.

## Honest limits

- Tamper-evidence for the LAST receipt requires a pinned expected tip
  (`--expect-tip` or the committed `chain.tip`); unpinned, an attacker who
  rewrites the entire tail consistently produces a valid-looking chain. This
  is inherent to hash chains (mavis has the same property) — pins are the fix,
  and `verify.mjs` supports them natively.
- No signatures: the grammar authenticates CONTENT CHAINING, not authorship.
  Signing (Ed25519 per receipt, or per tip) is the natural next layer and
  intentionally out of scope here (stdlib `node:crypto` could do it; the
  fleet's rekor lane already owns the variant subtleties).
- `ts` is taken from the generator's clock and is NOT monotonicity-enforced
  (a chain with regressed timestamps still verifies; enforce ordering in the
  embedder if your use needs it).

## Use

```
node verify.mjs kat/chain.jsonl --expect-tip=$(cat kat/chain.tip)   # exit 0
node test.mjs                                                        # 17 checks
node gen_chain.mjs                                                   # regenerate (ts changes -> new ids)
```
