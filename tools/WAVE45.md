# WAVE45 — tools/ receipts (lane 45-d concept-adopter)

All 45-d artifacts: zero dependencies, node:crypto only, no keys, offline only.
`tools/verify-fleet.mjs` untouched (additive imports only).

## 45-d · truncate-audit — POWER-YANK adoption (wave 44-c)

Commit `d6ebe65` (tool + self-tests + pre-registration), verdict in
`tools/wave45/45d-truncate-verdict.json`.

- **Tool**: `tools/truncate-audit.mjs` — ports the test PATTERN of quilt-rust
  `journal_power_yank.rs`: every byte offset 0..len-1 of every chain
  verify-fleet knows is truncated and run through the real verifier at two
  disclosed layers (L1 deployed pinned path; L2 chain-semantics layer with the
  sha pin neutralized). Law: no silent wrong state; truncated input never
  exits 0.
- **Pre-registration**: `tools/wave45/45d-truncate-claims.json`
  sha256 `d8e90d357f4e5ccaf09316ae7c0d596d76eccc72519a1be8f35697384dc40621`,
  mtime `2026-09-27T23:21:49Z` — committed BEFORE the exhaustive run (T1–T8,
  with failMeans + honest risks).
- **Result: PASS** (`ok: true`), ran 2026-09-27T23:22:38Z, node v24.21.0.
  Counts (L1 fail / L2 fail over every offset, control = full bytes):
  - qthe E-Q6 JSONL (9242 B): L1 9242/9242 fail (all sha-gate); L2 9241/9242
    fail, content-identical = [9241] (the trailing newline), zero SILENT.
  - pong birth-seal (1299 B): L1 1299/1299; L2 1298/1299, content-identical
    = [1298], zero SILENT.
  - rekor ECDSA entry (3242 B): L1 3242/3242; L2 3241/3242, content-identical
    = [3241], zero SILENT.
  - VC envelope (1904 B): L1 1904/1904; L2 1903/1904, content-identical =
    [1903], zero SILENT (disclosed: receipted via parse + deep-equal, the
    deployed reader pins exact bytes).
  - toy int (1816 B, no trailing newline): L1 1816/1816 AND L2 1816/1816 —
    EVERY truncation fails, count = len exactly (the known-good law).
  - toy float (1602 B): L1 1602/1602; L2 1602/1602.
  - field-edge delta property: int residual EXACTLY 0; float max residual
    5.55e-17 (bound 1e-12) — imbalance ≡ field edge Δ.
  - annotation-tail probe: PASS — the links pin is load-bearing (tip-only
    pinning would be silent under stone-v2 annotation semantics).
  - Self-tests: 13 (node --test), incl. the SILENT-WRONG-STATE detector
    actually firing under a dishonest prefix-blessing pin.

## 45-d · wal-conformance — wal-edl adoption (tessera seed)

Commit `5a33e49` (tool + self-tests + live probe receipt + pre-registration),
verdict in `tools/wave45/45d-conformance-verdict.json`.

- **Tool**: `tools/wal-conformance.mjs` — adopts the REPLAY SEMANTICS of
  SuperInstance/tessera `seeds/wal-edl/wal-edl.ts`: typed append-only WAL,
  chained checksum, recover-to-prefix replay with explicit structured damage
  reports. The reference was observed LIVE first
  (`tools/wave45/45d-waledl-probe-receipt.json`, probe s0–s5), then
  re-expressed from scratch — no shared code, no import of tessera.
- **Semantics chosen (documented)**: recover-to-prefix, READ-ONLY (goodBytes
  receipted, never truncated — wal-edl's WalWriter destructively truncates on
  open, disclosed). Default: any damage exits non-zero. `--torn-ok`: exit 0
  IFF the damage is a torn tail ONLY and the good prefix verified with the
  tear explicitly reported. Mid-chain corruption never exits 0.
- **Pre-registration**: `tools/wave45/45d-conformance-claims.json`
  sha256 `51923ff172229b68ca8349558bd15e9d0439583e868b9340d68c008efe09559c`,
  mtime `2026-09-27T23:45:15Z` — committed (5a33e49) BEFORE the full run.
- **Result: CONFORMANCE PASS** (exit 0). Chains:
  - qthe E-Q6 (jsonl, 9242 B, 15 rows): full ok (tip ab4ea196…, 15 links);
    torn tail -> prefix verifies (applied 14), wal-edl-shaped reason,
    recovery position receipted, `--torn-ok` exits 0; row_hash flips at
    ordinals 1/8/15 -> `checksum mismatch at seq N` exactly, applied N-1;
    structural `}` -> parse-break; deployed-path control ok.
  - pong birth-seal (document frame, 1299 B, 5 rows): full ok (tip
    c155fd01…); torn/corrupt bytes -> all-or-nothing parse (0 applied, NO
    prefix recoverable — framing disclosure); parse-safe hash flip caught by
    the row walk at the row's own (0-based) seq + the 1-based ordinal;
    deployed-path control ok.
  - toy stone chain (jsonl, 1816 B, 7 rows): same law; its serialization has
    NO trailing newline -> the final record is NON-DURABLE under wal-edl
    framing (torn tail even though the bytes parse); newline-terminated
    serialization replays clean. Receipted, not hidden.
- **Port vs live reference**: all six receipt scenarios match on class +
  applied counts (7 / 6 / 3@seq4 checksum / 2@seq3 chain-break / 4 parse /
  7 garbage-tail) with the same reason shapes.
- **Claims assessment (honest)**: C1 PASS; C2 PARTIAL (pong's seq field is
  0-based — the claim's "seq == row's own seq AND ordinal" cannot hold
  simultaneously; both values now receipted verbatim, relation disclosed);
  C3 PARTIAL (the "len-1 newline cut is not damage" clause held at the
  chain-content layer but was FALSIFIED at the WAL-durability layer for JSONL
  framing — the final record is non-durable without its newline; amended to a
  two-layer receipt: WAL durability vs chain content); C4 PASS.
- Self-tests: 7 (node --test) + truncate-audit's 13 still green.

## Exclusions (both tools)

`moth-42b-raw-bits` (raw quantum-job bitstream — no chain verifier consumes
it); for wal-conformance additionally the rekor ECDSA entry + VC envelope
(single signed documents, not multi-record WALs).
