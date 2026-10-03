# FB6 shipped: the journal boots as an organ — and it caught a zeroclaw contract bug

Date: 2026-10-03T06:45Z · Lane: quilt-jev-toolkit + zeroclaw

## What shipped

1. **quilt-jev-toolkit PR #1** (`fb6-zeroclaw-organ`, commit a69ce49): the
   zeroclaw journal boots as an organ. `src/organ/zeroclawOps.mjs`:
   - `pyCanon` reproduces Python `json.dumps(sort_keys, separators,
     ensure_ascii=True)` byte-exactly (escape order: specials first, THEN
     non-ASCII as `\uXXXX` — the first draft escaped in the wrong order and
     double-escaped its own escapes); `fnv1a64` hashes the UTF-8 encoding.
     Byte-compat pinned against zeroclaw.py with a unicode probe:
     `0bb7ff71394cd3eb` on both sides.
   - Genesis anchor normalizes BOTH historical representations: v0/v0.5 rows
     carry `prev_hash: null`; run() today writes `"genesis"`. Anything else
     on row 0 = unowned history, refused (v0 law, no checkpoint support).
   - Fail-closed: ZC_SCHEMA_DRIFT / ZC_ROW_HASH_MISMATCH / ZC_CHAIN_BROKEN /
     ZC_REPLAY_DIVERGENCE / ZC_STATE_MISMATCH — never partially boots.
   - JEV canary rides as a WITNESS receipt (§9 discipline: witnesses flag,
     replay decides) — `custody.canary` names it honestly.
   - 10 pins, suite 74 tests green. Fixtures are VERBATIM shipped journal
     rows captured programmatically — see the lesson below.

2. **zeroclaw v0.7.1** (this dir): the build caught a real cross-command
   contract gap — `verify()` expected `prev_hash: None` at row 0 while
   `run()` writes `"genesis"`, so verify() rejected run()'s OWN fresh
   journals while audit() accepted them. verify() now accepts both
   representations (the FB6 adapter's normalization law, ported home).
   24/24 pins green after the fix.

## The lesson, receipted

The first FB6 pin draft used hand-transcribed fixture rows that LOOKED right
(real ts shapes, plausible hashes). They recomputed wrong — the pins failed
on the fixture, not the adapter. Fabricated evidence that merely resembles
truth is worse than no evidence: the corrected pins carry rows captured
programmatically from the shipped journal, and pin 10 boots the full real
8-row journal (tip d4e2194d8fd102e2).

## Live demo receipt (toolkit examples/zeroclaw-organ-demo.mjs)

```
BOOT OK organ: fleet-zeroclaw@7093d4d777ef0247
custody: {"kind":"zeroclaw-journal","rows":8,"tip":"d4e2194d8fd102e2",
          "verifiedRange":{"start":0,"end":7},"canary":null}
BUNDLE RE-PROOF OK: true   (snapshot → re-boot from carried receipts,
                            manifestHash equal)
TAMPER REFUSED: ZC_ROW_HASH_MISMATCH: row 3 stored f99cea70ced490da,
                recomputes to 6c13643fa3ed2
SWAP REFUSED:   ZC_CHAIN_BROKEN: row 1 prev a96f34f56cc03f6b != row 0
                hash 3d0e52b8b056327d
```

The journal now has a custody claim a stranger can re-prove: boot is a
courtroom, not a file read. N2 organism-hood: a state that can be snapshotted,
booted elsewhere, and challenged by an outside organ.

## Next

- FB6 follow-ons (from the spec): partial custody via v2 checkpoints once
  the journal crosses ~1k rows; the rewind family on journals.
- FB8: reflex TTL/decay (earned_at + stale-refusal at serve).
- N2: git-warded spec repo — reflexes shared across agents.
