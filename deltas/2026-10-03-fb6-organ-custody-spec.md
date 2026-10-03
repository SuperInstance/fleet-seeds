# FB6 spec: zeroclaw journal under organ custody (quilt-jev-toolkit)

Date: 2026-10-03 · Status: SPEC — build is the top open queue item
Lane: quilt-jev-toolkit · Precedent: `src/organ/chronoOps.js` (§9 chrono boot)

## The gap FB5/FB7 left

`zeroclaw.py audit` re-derives trust in-channel, but every channel is
zeroclaw-shaped or fleet-shaped: notary (ours), GitHub (ours), journal (the
file itself). FB6 puts the journal in a custody courtroom that is NOT ours:
the organ boot protocol — nothing trusted, everything re-proven — with JEV as
the outside canary on the custody claim.

## Design (smallest first build, one evening)

**`src/organ/zeroclawOps.mjs`** — the zeroclaw journal boots as an organ.

Mapping (simpler than chrono — every journal row is a write; no read/write
op split, no seal/signature layer on zeroclaw's side yet):

- `receipts` = journal rows verbatim. zeroclaw rows are already the receipt
  chain: canonical JSON, `row_hash = fnv1a64(canon(row minus row_hash))`,
  `prev_hash` linkage, genesis-anchored.
- `cells` = one cell `journal` (kind "value") holding the tip summary
  `{ rows, tip, orders: [...] }`.
- `replay` = recompute every row_hash from canonical fields, re-link
  prev_hash from GENESIS. State = the tip's recomputed hash.
- `bootZeroclaw({ journal: <path-or-rows> })` → organ with
  `custody = { kind: "zeroclaw-journal", rows, tip, verifiedRange }`.

Fail-closed (adapter-local codes, thrown as OrganBootError — never
partially boots): `ZC_SCHEMA_DRIFT` (row missing canonical fields),
`ZC_ROW_HASH_MISMATCH` (field tamper), `ZC_CHAIN_BROKEN` (prev_hash wrong),
`ZC_REPLAY_DIVERGENCE` (recomputed tip != carried state),
`ZC_STATE_MISMATCH` (tip summary doesn't match replay).

JEV canary (the "outside organ" half): after snapshot, `canon_gate` the
manifest — noul("does this manifest claim a coherent chain-of-custody?") —
recorded as a **witness receipt** (§9 discipline: reads/witnesses are no-op
receipts, never state). The canary can't pass the boot (replay is the only
court), but a canary REFUSAL is a receipted red flag on the bundle.

Live interop test (mirrors `chrono-interop.test.mjs`): build a journal with
zeroclaw.py itself (canned order, scratch dirs via ZC_JOURNAL/ZC_DELTAS),
boot it here, assert hash-equal against zeroclaw's own `verify`. Skip-if-
absent — the toolkit stays standalone. Target ~12 new tests (v0 mapping +
fail-closed tamper cases + canary receipt + interop).

## Size calibration (from the chrono precedent)

chronoOps.js 390 lines + 515-line interop test. Zeroclaw adapter is smaller:
no op-mapping table, no seal verify, no flow pairing. Estimate 150–250 lines
adapter + ~300 lines test. Genuinely one evening.

## Done-means

1. `npm test` green with the new section (54 + N).
2. A live zeroclaw journal (the real 8-row one) snapshots, boots, and a
   one-field tamper refuses with ZC_ROW_HASH_MISMATCH.
3. The demo receipt committed: `examples/receipts/zeroclaw-organ-demo.json`.
4. fleet-seeds journal re-shipped with the bundle receipt alongside.

## Relation to the standing arc

- N1 grammar: the journal rows already speak it (cite envelopes, hashes).
- N2 organism: this is the custody half of organism-hood — a state that can
  be snapshotted, booted elsewhere, and challenged by an outside organ.
- N3 story: a journal that boots in a third quilt, hash-equal, is a story
  that survives being retold by strangers.
