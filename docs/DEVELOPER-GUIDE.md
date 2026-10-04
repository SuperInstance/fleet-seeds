# fleet-seeds — Developer Guide

## Code layout

| Path | What it is |
|---|---|
| `seedbox.mjs` | The intake mechanism (108 lines): `spawn(seed, slug)` emits README (charter verbatim + doctrine), package.json, CI workflow, real `smoke.mjs`, `.gitignore`, `outputs/`, first commit; `--selftest` runs the whole lifecycle and cleans up. |
| `seeds/` | Seed files (`seed1..4`, `seed-arch`, `seed-grok/grok2`, `seed-cuda`, `seed-edu`, `seed-essay`, `seed-onboarding`, `seed-raw1`, `seed-story`, `readme.md`) plus the sealed preregistration chains (`preregister-*.json` + `.seal.json` + `.verdict.json`, `m13-*` instrument seals/results/verdicts). |
| `tools/verify-fleet.mjs` | One command, every chain: qthe stone chain, pong birth seal, VC envelope (both readers + KAT + tamper controls), rekor ECDSA inclusion (own RFC 9162 fold). Pinned SHA fetches; `lib/` holds `stone-v1.mjs`, `rfc9162.mjs`, `vc-eddsa.mjs`. |
| `tools/truncate-audit.mjs` | Power-yank audit: every byte offset of every chain, two layers, no silent wrong state. |
| `tools/wal-conformance.mjs` | wal-edl conformance: recover-to-prefix / apply-nothing semantics, matched against a live tessera probe. |
| `tools/preregister.mjs` | The fleet pre-registration primitive (seal / verify / score; `E_CLAIMS_MODIFIED` fail-closed). Doctrine: `docs/PREREGISTER.md`. |
| `tools/moth-seal.mjs` | Certified sampling service (comet-qrng-v1): min-entropy-certified bits, stream=direct (fail-closed) or prf; `tools/mothbits.mjs` is the registered whitening fallback (KAT byte-exact). |
| `tools/keyscan.mjs` | Widened class-of-secret scanner (staged/tree/files; never prints material). |
| `tools/m13-*` | The M13 instrument family: harness, child, llm-leg (+ redo/run3/run31 drivers), procs (mjs/py) — the sealed LLM-executor instrument with `.instrument-seal*.json` chains in `seeds/`. |
| `tools/zeroclaw/` | zeroclaw v0.8 (Python, stdlib): assistant loop on hash-chained fnv1a-64 receipts; `run`/`verify`/`cite` subcommands; `reflexes/`, `deltas/`, `test/`, journal + pincher ledger. |
| `tools/qmr1-bridge.mjs` | The qmr1 ledger producer (`ledger/qmr1-store.jsonl`); HMAC-signed rows; refuses on chain mismatch. Requires `.qmr1-secret` (gitignored). |
| `tools/wave45/`, `tools/wave46/` | Wave receipts: conformance/truncate claims+verdicts, moth-seal claims + `VERDICT.md` + run script. |
| `tools/WAVE45.md` | The receipts doc for the tool battery (pre-registrations committed before runs). |
| `lode/` | The discovery loop: `PROTOCOL.md` (six stages, fail-closed laws), `mines.jsonl`, `scores.jsonl`, `registry.jsonl`, `lessons.jsonl`, `runs.jsonl`, `CROSSLINK.md`, `engine/` (append_m10–m13, engine_run, systemone_client + `receipts/`), `scripts/` (lode_score, lode_validate, lode_seed.py, registry appenders). |
| `embassy/` | Cross-agent letters and signing: `round-34/36/37/39/43/` letters, wave logs (36/37/39/44/45), `wave42-watch.md`, `battery/` (pong49 scorer), `vc-envelope/` (JCS + VC signing/verify + KAT), `vc-oracle/`, `transparency/` (rekor submissions + attestations), publish-queue discovery. |
| `tavern/` | Prediction tavern: multi-house rounds (`round7-three-houses.md`, round summaries), `answers/*.jsonl` (keeper/deepseek/jev/moth seats), `challenges/`, `windows/`, `predictions/`, JEV calibration batteries (r8/r9), `tavern_ledger.jsonl`, seal scripts. |
| `playtest/` | wave41…wave46 playtest dirs (interop web, witness grammar, exact-twin, moth-census, adoption receipts). |
| `qthe-verify/` | Repo-in-repo: independent QTHE rebuilder (own `package.json`, `verify.mjs`, corpus/reference/tools). |
| `deltas/` | The FB delta line: first synapse (FB2), two ledgers (FB3/FB7), organ custody (FB6), checkpoint/rewind spec (FB6-v2), foundational math. |
| `ledger/` | `qmr1-store.jsonl` — the qmr1 producer store (genesis row sealed at round 71). |
| `receipts/` | m13 harness/llm-leg run receipts; `g1/` battery artifacts. |
| `scouts/` | Scout docs + raw receipt dirs (`receipts/`, `raw/`) — stage-1 output of the lode loop. |
| `docs/` | `PREREGISTER.md`, `SEED-TOOLKIT.md` (ten geometric primitives), `GPU-AGENT-PLAYBOOK.md`, `G1-SEAT-SPIKE.md`, `G7-WATT-RECEIPTS.md`, `M13-LLM-EXECUTOR-LEG.md`, `wave-63-run-construction.md`, `g1/` (battery + predictions). |
| `FLEET.md`, `graph.mmd` | Generated fleet map (regenerate: `node quilt-links.mjs --graph`). |
| `PLANNING.md` | The living long-arc plan (357 lines, append-only round log). |
| `.quilt/links.yml` | The cross-pollination edge list rendered into README/FLEET.md. |

## Core concepts

- **Seed / seedbox / charter** — a seed file is a question; the seedbox makes
  it a repo whose first commit IS the question (charter verbatim, never
  edited); the spawned doctrine (five laws) is embedded in every README the
  box writes.
- **Pre-registration (the irreducible contract)** — claims file (id, claim,
  metric, threshold, refusal branch) → sealed (sha256 + sealedAt + tool
  version) → verdict appended beside untouched claims → any post-hoc edit
  detectable by re-hash and refused (`E_CLAIMS_MODIFIED`).
- **Chain verification from first principles** — verify-fleet shares nothing
  with producers: own stone-v1 verifier, own RFC 9162 fold, both VC reader
  flows, pinned-SHA fetches with byte-equality against committed fixtures.
- **Fail-closed posture** — the house rule across tools: truncate-audit (no
  silent wrong state), lode_validate (exit 2 on any violation), moth-seal
  stream=direct (exhaustion = exit, never invented bits), preregister
  (tampered claims = error), qmr1-bridge (HMAC mismatch = refuse to write).
- **The lode loop** — scout → extract → score → register → lane → fold; each
  stage has a law; the registry is the fleet's memory of predictions vs
  verdicts.
- **Receipt discipline** — every claim rides a receipt; spend gets per-call
  usage receipts (embassy logs); incidents are receipted where they happened.

## How to extend

### Spawn a new experiment repo (the primary flow)

1. Write the seed: one question, paired-arm shape, falsifiable. Put it in
   `seeds/seed-<name>.md`.
2. From the directory that should contain the repo:
   `node seedbox.mjs seeds/seed-<name>.md <repo-slug>`.
3. Open the lane in the spawned repo: turn the question into one experiment
   with named arms, receipt the decision rules (use `tools/preregister.mjs`
   seal), run, write `outputs/`, verify the chain, commit.
4. If the repo joins the fleet map, add its edges to `.quilt/links.yml` and
   regenerate: `node quilt-links.mjs` (this repo runs
   `node quilt-links.mjs --graph <dir>` for the whole-fleet map).

### Add a tool to `tools/` (the house pattern)

1. Stdlib only (`node:crypto`, `node:fs`, …) — zero npm dependencies, zero
   network unless the tool's job is fetching, and then only pinned-SHA URLs.
2. Put the contract in the header comment: what it proves, its modes, its
   fail-closed behaviour. Copy the shape of `tools/preregister.mjs` (named
   error class + JSON error lines) or `tools/verify-fleet.mjs` (pinned bytes
   + receipted verdicts).
3. Add `tools/<name>.test.mjs` with `node:test`; include tamper/fail-closed
   cases (see `tools/moth-seal.test.mjs` for the KAT pattern).
4. If the tool performs an exhaustive run for a wave, pre-register it: write
   `tools/wave<N>/<n>-claims.json` (sha256 + mtime), commit BEFORE the run,
   then commit the verdict alongside (the `tools/WAVE45.md` pattern).

### Add a mine to the lode

1. Stage 1–2 first: scout doc in `scouts/` with raw receipts under
   `scouts/receipts/<date>-<topic>/`; the abstraction names its fleet analog.
2. Append (never edit) a row to `lode/mines.jsonl`: `id` (next M-number),
   `ts` (monotone), `source`, `claim`, `abstraction`, `prediction`,
   `pred_sha256` = sha256 of the exact prediction string, `nearest_prior` +
   delta (the M1 novelty gate), pricing.
3. Validate: `node lode/scripts/lode_validate.mjs` — exit 2 on any schema,
   hash, duplicate-id, or monotonicity violation.
4. Score via `lode_score.mjs` (each pairwise judgment needs a written reason
   and is disclosed as keeper judgment); register the sealed prediction;
   lane it in PLANNING.md citing the mine id; fold the verdict into
   `registry.jsonl` when it lands.

### Wire a new chain into verify-fleet

Follow the header of `tools/verify-fleet.mjs`: add the chain's pinned origin
(a pinned SHA URL and/or local `--<name>-dir` override), a verifier built on
`tools/lib/` primitives (never the producer's code), byte-equality fixtures
under `tools/fixtures/`, and extend `truncate-audit.mjs`'s chain list in the
same change so the new chain is born audited. Then add cross-verifier tests:
the mid-arc goal is two-reader rule compliance (each chain verified by
tooling in ≥2 repos).

### Extend zeroclaw

`tools/zeroclaw/zeroclaw.py` is single-file by design (stdlib only). New
reflexes go in `reflexes/` per the spec (`zeroclaw-reflex-spec/v1`); the FB6
organ custody and FB6-v2 checkpoint/rewind behaviour are specified in
`deltas/2026-10-03-fb6-organ-custody-spec.md` and
`deltas/2026-10-04-fb6v2-checkpoint-rewind-spec.md` — read the delta before
touching the journal/rewind code, and keep every exchange a receipt row
(`row_hash = fnv1a64(canonical_json(row incl prev_hash))`).

## Testing

There is no root test runner. The verified batteries (62 tests across these
three, all green in wave-69):

```bash
node --test tools/preregister.test.mjs tools/moth-seal.test.mjs tools/truncate-audit.test.mjs
```

The other batteries follow the same pattern: `tools/verify-fleet.test.mjs`,
`tools/wal-conformance.test.mjs`, `tools/mothbits.test.mjs`,
`tools/m13-harness.test.mjs`, `tools/m13-llm-leg.test.mjs`, `test/qmr1-bridge.test.mjs`,
`tools/zeroclaw/test/`. "Green" means: every fail-closed case refuses, every
KAT is byte-exact, and every chain tip matches its pinned value. The live
end-to-end proof for the tool battery is `node tools/verify-fleet.mjs` exit 0
(offline mode was verified in wave-69; live mode requires network reachability
to the pinned URLs and nothing else).

CI (`.github/workflows/forge.yml`) is `probe-only: true` with an honest no-op
`test-cmd` — the schema-required input killed the called workflow once
(startup_failure receipted 2026-09-29 in the YAML comment), so the repo
declares no runnable command rather than a fake one. Per-tool tests are the
contract, run by lanes before any push that touches `scripts/` (the M7
tripwire applies to lode itself).

## Conventions

- **Append-only ledgers.** `mines.jsonl`, `scores.jsonl`, `registry.jsonl`,
  `lessons.jsonl`, `tavern_ledger.jsonl`, `ledger/qmr1-store.jsonl`, zeroclaw
  journal: rows are never edited; supersession is a new row (`supersedes:`).
  Pre-snapshot files (`*.pre-m11`, `*.pre-l12`, `*.pre-pong49`) prove
  append-only across commits (`lode_validate.mjs --against <old-copy>`).
- **Named fail-closed errors.** `E_CLAIMS_MODIFIED`, `E_BAD_SIGNATURE`, exit-2
  validators — errors have names and non-zero exits, never warnings.
- **Spend receipts.** Any metered API use logs per-call usage (see the
  embassy wave-45 spend table); budget cap per lane was $0.05 in the PLANNING
  kill criteria.
- **Naming.** Seeds `seed-<topic>.md`; waves are directories `playtest/wave<N>`,
  receipts `tools/wave<N>/`; mine ids `M<n>`; prediction sets keep their lane
  ids (`JEPA-R4`, `qmr1`). Commit subjects are short imperatives naming the
  artifact ("tools/keyscan.mjs — the widened class-of-secret scanner").
- **Secrets**: env var NAMES only (`MOTH_KEY`, `MOTH_ENV`); zeroclaw reads its
  token from `/root/.env` and never prints it; `.qmr1-secret` is created
  chmod 600 on first run and NEVER committed; `.env*` gitignored. `keyscan.mjs`
  is the pre-push gate.

## Gotchas for editors

- **Never rewrite a ledger line** — the pre-snapshot files and the validators
  make it detectable; supersede instead.
- **Never edit a sealed claims file** — `E_CLAIMS_MODIFIED`; write a new
  registration citing the old one.
- **`seedbox.mjs` templates are load-bearing across the fleet.** The CHARTER,
  CI, and SMOKE strings are the exact bytes every spawned repo (exoj included)
  carries; changing them changes every future repo's first commit. The
  smoke's final `SMOKE OK (n/n checks)` count line is the contract CI enforces.
- **`quilt-links.mjs` output blocks are generated.** The README's
  `QUILT:LINKS` block and `FLEET.md` say "Do not edit by hand"; edit
  `.quilt/links.yml` and regenerate.
- **PLANNING.md is append-only history** — add `## Round N` blocks; never
  delete or reorder prior rounds (the wave-45 worklog-clobber incident is the
  standing cautionary tale).
- **README Status staleness** — the README's "Waiting on seed files" section
  predates the seeds' arrival; if you touch the README, fix or annotate it
  rather than propagating the stale claim.
- **qthe-verify is a repo-in-repo** with its own `package.json` and README;
  don't fold it into the root toolbox patterns.
