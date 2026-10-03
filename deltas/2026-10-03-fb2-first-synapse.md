# FB2: The First Synapse — zeroclaw × pincher reflex loop, LIVE

**Date:** 2026-10-03 (12:32–12:47 CST) · **Author:** zeroclaw v0.6 × quilt-pincher v0.1 (FB2)
**Status:** SHIPPED. quilt-pincher PRs #17 + #18 merged; zeroclaw v0.6 on fleet-seeds main.

## What exists now that did not exist this morning

A closed, receipted reflex loop spanning two ledgers:

```
pinch (standing order, context gathered, sha'd)
  → zeroclaw asks pincher serve: earned reflex for (order, prompt, context-sha)?
    → HIT:  serve the stored delta payload in ~20ms, 0 tokens, cites ride through
    → MISS: honest LLM run (~4.2k MiniMax tokens) → delta → journal row
            → zeroclaw FILES the earned reflex (zeroclaw-reflex-spec/v1)
            → next identical (order, context) is served, not bought
```

Both sides receipt every crossing on their own hash-chained ledgers. The spec
directory on disk IS the shared format — no wire protocol was invented.

## The receipts (live, in-channel)

zeroclaw journal, 6 rows, CHAIN OK, tip `6b81acbcd2222db7`:

| row | model | tokens | note |
|---|---|---|---|
| 3d0e52b8b056327d | canned | 0 | genesis (v0.5) |
| a96f34f56cc03f6b | MiniMax-M2.7 | 4203 | first real LLM delta (v0.5) |
| a9c357eca616d889 | MiniMax-M2.7 | 4203 | v0.6 LLM run + filed reflex `zc-bccc628b7e1ef737` |
| f99cea70ced490da | pincher-reflex | 0 | FIRST live hit (origin_row None — bug, below) |
| dd04d5a5cff9… | pincher-reflex | 0 | hit, origin_row `a9c357eca616d889` ✓ |
| 6b81acbcd2222db7 | pincher-reflex | 0 | hit, origin_row ✓ |

- Output sha identical across the reflex boundary: `98e558b0a9f33323…` (LLM row
  == every served row). The reflex serves the SAME bytes the LLM produced.
- Hit-row cites: `[git:e9363fa…, tip:b92d3cd2…, row:a9c357ec…]` — grammar N1
  chaining through the loop: the reflex row cites the LLM row that earned it.
- pincher side: PR #17 `e2843007` (spec adapter + serve CLI + 5 pins),
  PR #18 `f5053ba` (origin_row payload fix). CI: spine canary
  `51b6d1e1261a99fa…` unchanged, node 20/22/24 matrix green.

## The cache-integrity law (pinned, not hoped)

Discovery during FB2: HDC recall is FUZZY. A one-hex context drift still
cosines ≥ the 0.80 hit threshold. The law — *a drifted context must be an
honest miss, never a stale hit* — is therefore enforced at the serve layer:
`--context-sha256` pre-filters specs by EXACT match before any embedding.
Pinned by pin 4 (drifted sha → exit 4, no junk written) and zeroclaw pin
"one-hex context change readdresses". The fuzzy engine behavior itself is
documented-by-design, not hidden.

## Bug tax (honest accounting)

1. **origin_row dropped** — spec field lived at top level; adapter forwarded
   only `spec.payload`. Caught by the live demo's own journal
   (`origin_row: None` in row f99cea70). Fixed PR #18 + roundtrip pin.
2. **FB5 pins path bug** — pins were green locally, then shipped broken in
   fleet-seeds `89df730`: the test referenced `test/zeroclaw.py` instead of
   `../zeroclaw.py` (moved into a test/ subdir without re-running). Caught
   today when the FB2 pin run failed. Lesson re-learned: **re-run pins after
   ANY layout change**; green is a property of (code + pins + layout + env),
   not of code alone. fleet-seeds has no CI — the pins ARE the CI, so they
   must actually run.
3. **Pin stub escaped newline** — a `\n` inside a non-raw Python triple-quote
   became a literal newline in the JS stub → syntax error → honest None. The
   pin caught it (RED), which is what pins are for.
4. Earlier: 8 junk Minimax rows (~44k tokens) from canned-order KeyError —
   journal rebuilt pre-push; canonical chain re-verified.

## Next (FB3-FB7 per the thesis)

- **FB3:** reflex TTL/decay + serve-side `stats` (hit/miss/token-saved ledger
  on the pincher side too — two ledgers, one loop).
- **FB6:** zeroclaw journal under organ custody (quilt-jev-toolkit).
- **FB7:** verify-any-receipt CLI — one envelope, three channels.
- N2 (one organism): reflexes shared across agents via a git-warded spec repo.

*the first synapse fires. the organism can now save what it spends.*
