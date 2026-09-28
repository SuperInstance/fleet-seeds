# wave45/moth-census — lane 45-e "moth deep"

Maps the mothquantum API surface beyond what wave 42/43 cracked, and runs the
registered micro-census instrument built from the findings.

## Layout

- `moth-census.mjs` — the instrument (zero-dep CLI): `selftest` (offline, KAT),
  `survey` (read-only catalog), `census` (N=3 engines x 1 job, whitening fold,
  verdict). `node moth-census.mjs` for usage.
- `mothbits.mjs` — VERBATIM copy of fleet-seeds `tools/mothbits.mjs`
  (lane 43-c "tool-builder"). The registered whitening recipe: von Neumann
  debias -> MSB-first byte pack -> SHA-256 counter stream -> Fisher-Yates
  (pool 1134, take 16). Copied with attribution; fixtures/ carries the 42-b
  KAT raw bits (archived job 2caa822b) so the selftest proves byte-exactness
  (raw `ebc8a43d…` -> whitened `836985ec…`) without network or foreign paths.
- `claims.json` — pre-registered claims, sha256+mtime sealed in
  `receipts/45e-claims-registration.json` BEFORE any census process job.
- `receipts/` — survey receipts, hands-on receipts (honest FAILs included),
  claims registration, census receipt, deepseek prediction receipt.
- `VERDICT.md` — emitted by the census run: per-engine table, claim scoring,
  deepseek blind-prediction scoring.

## Findings welded into the instrument

1. `POST /api/v1/engines/{id}/process` requires envelope `{"params": {…}}`;
   flat bodies 422 `unexpected property` (8/8 receipts).
2. Visible catalog = 33 engines (2026-09-27) vs 13 in the archived
   2026-09-25 docs; `comet-qrng-v1` (certified randomness: min-entropy
   certificate + Toeplitz extractor + CHSH witness + commitment/pulse
   hash-chain) is new since the docs snapshot.
3. `aer`/`emu` are PARAMS (`mode: emu|qpu`, `machine: aer`), not engines
   (revises the wave-42 note "engines known working: graph-v1, aer, emu").
4. Truncation is per-engine, not universal (graph-v1 top-20 vs comet-qrng-v1
   full-support raw counts).

Keys: `MOTH_KEY` / `DEEPSEEK_API_KEY` read at runtime only, never printed,
never committed; receipts redact URLs/tokens.
