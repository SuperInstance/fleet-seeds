# fleet-seeds — Knowledge Map
> The index of indexes. Everything deeper than this doc set, with one line each.

## In this repo

- `seedbox.mjs` — the intake mechanism: seed.md → charter-verbatim repo with
  CI + smoke + first commit; `--selftest` proves the whole lifecycle.
- `seeds/` — the seed corpus (seed1–4, seed-arch/grok/grok2/raw1/cuda/edu/
  essay/onboarding/story) + sealed chains: `preregister-67c/68a/68ar2/69d/71c/71d`
  (claims + `.seal.json` + `.verdict.json`), `m13-harness-68f.*` and
  `m13-llm-leg-70a.*` instrument seals/results/verdicts (r2, r3, r3.1).
- `seeds/readme.md` — "What Ports": the 63-line geometric seed text (seven
  paragraphs, one circle).
- `tools/` — the trust + instrument battery: `verify-fleet.mjs` (+ `lib/`
  stone-v1, rfc9162, vc-eddsa; `fixtures/`), `truncate-audit.mjs`,
  `wal-conformance.mjs`, `keyscan.mjs`, `preregister.mjs`, `moth-seal.mjs`,
  `mothbits.mjs`, `m13-*` (harness/child/llm-leg/procs), `qmr1-bridge.mjs`,
  and the `.test.mjs` batteries; `wave45/` + `wave46/` receipt dirs;
  `WAVE45.md`.
- `tools/zeroclaw/` — zeroclaw v0.8: `zeroclaw.py` (run/verify/cite),
  `journal.jsonl` (fnv1a-64 chain), `pincher-ledger.jsonl`, `reflexes/`,
  `deltas/`, `test/`, organ demo receipt (FB6).
- `lode/` — the discovery loop: `PROTOCOL.md`, `CROSSLINK.md`, `mines.jsonl`
  (M-numbered hypotheses, sealed predictions), `scores.jsonl` (Elo with
  reasons), `registry.jsonl` (fleet prediction registry), `lessons.jsonl`,
  `runs.jsonl`, pre-snapshot proof files, `engine/` (append_m10–m13,
  engine_run, systemone_client, per-run `receipts/`), `scripts/`
  (lode_score, lode_validate, lode_seed.py, registry appenders).
- `embassy/` — cross-agent diplomacy: round-34/36/37/39/43 letters, wave
  logs (36/37/39/44/45), `wave42-watch.md`, `battery/` (pong49 scorer +
  scorecard), `vc-envelope/` (JCS + VC sign/verify + KAT + receipts),
  `vc-oracle/`, `transparency/` (rekor submissions/attestations, CT reader),
  publish-queue discovery.
- `tavern/` — prediction tavern: `round7-three-houses.md` + summaries
  (r7–r11), `answers/*.jsonl` (keeper/deepseek/jev/moth seats), `challenges/`,
  `windows/`, `predictions/`, JEV calibration battery r8 + remap r9,
  `tavern_ledger.jsonl`, `build_ledger.mjs`, seal scripts, `jukebox.py`.
- `playtest/wave41…wave46/` — interop-web playtests, witness grammar,
  exact-twin audit, pairing schedule, moth-census, adoption receipts.
- `qthe-verify/` — repo-in-repo: independent QTHE rebuilder (verify.mjs,
  corpus/reference/tools, own README + package.json).
- `deltas/` — FB line specs: FB2 first synapse (zeroclaw×pincher reflex
  loop, LIVE), FB3/FB7 two ledgers, FB6 organ custody spec + shipped note,
  FB6-v2 checkpoint/rewind spec (zeroclaw v0.8), foundational math dim H⁰.
- `ledger/qmr1-store.jsonl` — HMAC-chained producer store (genesis sealed at
  round 71; the erised hardening move #1).
- `receipts/` — m13 harness + llm-leg run receipts; `g1/` battery artifacts.
- `scouts/` — stage-1 lode output: dated scout docs (horizon models, GPU
  agents, RSI frontier, wave66 synthesis, dungeon playtest, cicd canon,
  zeroclaw delta, fleet table read, geometry of seeds) + `receipts/` + `raw/`.
- `docs/` — `PREREGISTER.md` (the census + contract), `SEED-TOOLKIT.md` (ten
  geometric primitives, proven by ≥2 repos), `GPU-AGENT-PLAYBOOK.md`,
  `G1-SEAT-SPIKE.md`, `G7-WATT-RECEIPTS.md`, `M13-LLM-EXECUTOR-LEG.md`,
  `wave-63-run-construction.md`, `g1/` (battery-96 + predictions.json).
- `FLEET.md` + `graph.mmd` — generated map (17 repos, 27 edges).
- `PLANNING.md` — the long arc: mission, instruments inventory, roadmap,
  kill criteria, round log 45→83+.
- `.quilt/links.yml` + `quilt-links.mjs` — the cross-pollination edge schema
  and its generator.
- `research/` — externalisability audit (2026-09-29) + audit mines.

## Pre-existing docs (before wave-69)

- `README.md` — the one idea, protocol, mental model, stale Status section,
  cross-pollination block (generated).
- `FLEET.md` / `graph.mmd` — the quilt fold map (generated; do not hand-edit).
- `PLANNING.md` — the fleet's append-only long-arc plan (357 lines).
- `lode/PROTOCOL.md`, `lode/CROSSLINK.md` — the loop's laws and crosslinks.
- `tools/WAVE45.md` — tool-battery receipts (pre-registrations + verdicts).
- `docs/PREREGISTER.md` — the pre-registration census and ritual.
- `docs/SEED-TOOLKIT.md` — ten geometric primitives with proof table.
- `docs/GPU-AGENT-PLAYBOOK.md`, `G1-SEAT-SPIKE.md`, `G7-WATT-RECEIPTS.md`,
  `M13-LLM-EXECUTOR-LEG.md`, `wave-63-run-construction.md` — lane playbooks
  and instrument docs.
- `qthe-verify/README.md` — "verification you can check yourself, not trust".
- `embassy/wave*-embassy-log.md`, `embassy/wave42-watch.md` — per-wave
  diplomatic + incident logs (including the wave-45 spend table and the
  `.env` clobber incident).
- `deltas/*.md` — the FB delta specs (listed above).
- `research/externalisability-audit-2026-09-29.md` — can the fleet's methods
  survive outside the instance?

## In the fleet

- `exoj`, `quilt-fiction`, `quilt-raw`, `quilt-arch` (and others) — downstream
  children: spawned by this repo's seedbox; their charters are verbatim seeds
  from `seeds/` (exoj's `seed-grok2.md` lineage verified in journal 66-b).
- `jev-quilt` — upstream doctrine: Law 6 (Reader's Fold) defines the
  `.quilt/links.yml` schema this repo hosts and renders (`FLEET.md` edge:
  fleet-seeds consumes jev-quilt).
- `qthe` + `pong-quilt` — peers whose chains are in the verify battery;
  `qthe-verify/` is the standalone two-reader verifier for qthe.
- `tessera` — peer probed by wal-conformance (live probe matched 6/6).
- `quilt-forge` — upstream CI: the reusable workflow `forge.yml` calls.
- `rekor` (public transparency log) — external anchor for the fleet
  checkpoint (embassy/transparency/).
- `quilt-atlas` — sibling registry work: the seed-DNA census that motivated
  `docs/PREREGISTER.md` and the lode novelty gate.

## In the journal (SuperInstance/superinstance-lab → worklog.md, grep 'fleet-seeds')

- **Task 22** — built the intake lane (README protocol + seedbox.mjs);
  selftest green after fixing 2 bugs in-place (nested mkdir; existsSync import).
- **Task 23-d** — seedbox selftest PASS; spawned quilt-fiction; receipted the
  CWD-relative spawn incident and the absorbed prior scaffold; flagged the
  reputation-constants discrepancy for the E-F2 lane.
- **Task 24** — coordination + wave log touching the lane.
- **Tasks 48, 49** — wave seals referencing the repo.
- **Task 60-engine** — "the tokens arrive": engine legs begin (lode/engine).
- **Task 61** — keeper wave referencing the registry work.
- **Tasks 63, 63-f, 63-d-r** — wave-63 entries touching the repo (run
  construction era).
- **Tasks 64, 65, 66-b** — keeper waves; 66-b is the seed-DNA census wave
  that also verified seed-grok2 == exoj charter by direct comparison and
  dog-feded `seedbox.mjs --selftest` offline.
- **Task 68-a** — the push wave: fleet-seeds was +52 commits behind remote
  and was integrated/pushed.
- (Tool-lineage lanes 43-c, 45-d/45-e, 46-b, 67-c named in file headers:
  mothbits, verify-fleet adoption, truncate-audit/wal-conformance, moth-seal,
  preregister — their Task IDs live in the wave logs they cite.)

## Receipts of record

- `tools/wave45/45d-truncate-verdict.json` + `45d-conformance-verdict.json` —
  the exhaustive audit/conformance verdicts, claims committed before runs.
- `tools/wave46/VERDICT.md` + `46b-claims.json` + `receipts/` — moth-seal
  service adoption verdict.
- `tools/fixtures/` + `embassy/vc-envelope/{stone-checkpoint.vc.json,
  kat-b3-results.json, verify-receipt.json}` — the byte-exact fixtures the
  offline verifier trusts.
- `embassy/transparency/rekor-*.json` — live rekor submission results,
  inclusion folds, attestations (the fleet checkpoint is publicly anchored).
- `lode/mines.jsonl` + `lode/registry.jsonl` — the fleet's sealed predictions
  and their verdicts (the memory of what was predicted vs what happened).
- `seeds/preregister-*.verdict.json`, `seeds/m13-*.verdict.json` — sealed
  instrument verdict chains (claims → seal → results → verdict).
- `ledger/qmr1-store.jsonl` — the qmr1 producer store, HMAC-chained.
- `deltas/2026-10-03-fb2-first-synapse.md` — the live zeroclaw×pincher reflex
  loop receipt (journal 6 rows CHAIN OK, tip `6b81acbcd2222db7` at that time;
  8 rows at wave-69 verification).
- `playtest/wave45/moth-census/` — the 32-engine live census incl. the
  comet-qrng certification finding.

## How to search further

```bash
grep -rn "fleet-seeds" /home/z/my-project/worklog.md     # journal mentions (Task IDs above)
node tools/verify-fleet.mjs --offline --quiet            # quiet re-verify, JSON verdict via --out
grep -rn "E_" tools/*.mjs | head -30                     # the named fail-closed vocabulary
grep -c "" lode/mines.jsonl lode/registry.jsonl lode/scores.jsonl lode/lessons.jsonl   # ledger sizes
python3 tools/zeroclaw/zeroclaw.py verify                # zeroclaw chain tip
node tools/keyscan.mjs tree HEAD                         # whole-tree secret scan
rg -n "pred_sha256|supersedes|nearest_prior" lode/mines.jsonl | head   # the lode laws in data
```
