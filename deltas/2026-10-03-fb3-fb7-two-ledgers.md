# FB3 + FB7: two ledgers, one loop — and verify-any-receipt

Date: 2026-10-03 (day 2 of the FB2 build wave)

## What shipped since `deltas/2026-10-03-fb2-first-synapse.md`

- **quilt-pincher PR #19** (merged 2026-10-03T06:0?Z): serve-side stats ledger —
  `--ledger <path>` appends one JSONL row per invocation (hashes ONLY: ts, kind,
  exit_code, spec_id, latency_ms, trigger_sha256, context_sha256, specs_loaded —
  never payload content; the receipt chain stays on zeroclaw's side).
  `--stats <path>` summarizes hits/misses/vetoed/errors/mean latency.
  4 FAIL-first pins: hashed-only hit row, exit-4 miss is traffic too,
  append-only across invocations, --stats matches. Also folds serveOnce's
  double spec-load into one pass.
- **quilt-pincher PR #18-fix** (same PR): un-nested the origin_row pin from
  inside the FAST-tier test — node 20/22 CI runners finished the parent before
  the nested child and cancelled it. Green-on-fast-runners was luck, not
  structure; the pins worked as CI.
- **zeroclaw v0.7** (`AGENT = zeroclaw-v0.7`): forwards `--ledger` to serve when
  `ZC_PINCHER_LEDGER` is set; NEW `audit <row-prefix>` — verify-any-receipt:
  recomputes row_hash from canonical fields, checks prev_hash linkage,
  re-seals the output file, verifies EVERY cite in its own channel
  (notary /status, GitHub commits API, journal, sha256 seal).
  `ZC_DELTAS` env override added for hermetic pins.
  Pin file grew 18 → 24 (FB7: 5 audit pins + 1 FB3-wiring pin).

## Live receipts (journal now 8 rows, tip `d4e2194d8fd102e2`)

```
REFLEX HIT rows 015d04d11410 / d4e2194d8fd1 (0 tokens, pincher latency 5ms)
pincher-ledger.jsonl: 2 rows (2 hits / 0 misses) — the loop's traffic side

$ zeroclaw.py audit d4e2194d8fd1
  HASH OK        row_hash recomputed match
  CHAIN OK       prev_hash -> 015d04d114106267…
  SEAL OK        2026-10-03-fleet-seeds-last3-scout-delta.md hashes to recorded output_sha256
  CITE OK        git:e9363fa… -> VERIFIED repo=SuperInstance/fleet-seeds commit=e9363fa49548
  CITE OK        tip:b92d3cd2… -> MATCH lane=erised-ft1 day=2026-10-02 integrity=ok
  CITE OK        row:a9c357ec… -> VERIFIED row a9c357eca616d889 (the origin row)
  verdict: AUDIT PASS
```

## Law of the day

Two ledgers, one loop. zeroclaw's journal carries the chain (what was produced,
linked, sealed); pincher's ledger carries the traffic (what was asked, hit,
missed, how fast). Neither alone is the loop; together the crossing is
receipted from both sides. FB7's `audit` is the organ that can re-derive trust
in any single row without trusting the journal file itself — recompute, reseal,
re-verify every channel.

## Bug tax (kept honest, again)

1. FB5 pins shipped broken layout (`89df730`) — pins not run in shipped layout.
   Fleet-seeds has no CI; pins are now ALWAYS run in the shipped layout before
   commit. This note's commit re-ran them: 24/24 green.
2. origin_row nested inside FAST-tier pin (#18) — structure bug invisible on
   fast runners; CI (node 20/22) caught it. Fixed inside PR #19.

## Next

- FB6: journal under organ custody (quilt-jev-toolkit) — receipts attested by
  an outside organ, not only self-recomputed.
- FB8 candidate: reflex TTL/decay — specs carry `earned_at`; serve can refuse
  stale reflexes (organ decides freshness, not just exactness).
- N2: reflexes shared across agents via a git-warded spec repo.
