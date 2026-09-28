# GPU-AGENT-PLAYBOOK — work a GPU-equipped agent can do with all our systems

Written for the principal's GPU agent (wave 48, 2026-09-28). Companion evidence: `scouts/2026-09-28-gpu-agent-workloads.md`.
Every item below obeys the house law: **real, useful, stranger-verifiable artifact; pre-registered before tested;
fail-closed; receipts for all gifted compute (including GPU-hours and watt-hours); zero asks.**

## Why a GPU changes what the fleet can do

Our fleet is CPU-bound and API-bound. Three consequences a GPU removes:

1. **Seats we don't control.** Every live LLM seat so far rides a gateway (deepseek-flash, reasoning_tokens
   starvation, extraction-law workarounds). A GPU hosts a 7B–8B seat *end to end* — we set the budget, we keep
   the raw transcript, the starvation finding becomes a variable instead of a wall.
2. **N is too small.** Our statistical verdicts run on 10^3–10^4 samples (5392-bit balance tests, 96-claim
   chambers). A GPU runs the same tests at 10^9. Several of our registered trends are *scale predictions*
   waiting for a bigger N.
3. **Float is our study object but not our substrate.** Exact-twin, injector-law, and determinism work all
   reason *about* fast arithmetic from a slow exact substrate. A GPU lets us study the fast substrate itself,
   on the hardware where it actually runs.

## Work catalog

### G1 — Local seat for the tavern and SCN-003 (highest priority)
**Systems used:** tavern JEV protocol, SCN-003 chamber, forge bridge, moth-seal.
**What:** serve a 7B–8B instruct model at Q4_K_M via llama.cpp/vLLM on the GPU; write a seat adapter speaking
our seat protocol (registration → transcript on disk → AS-SAID extraction unchanged); run (a) a tavern round
and (b) an SCN-003 live chamber against forge-bred mimics, with **no token ceiling** — the 45-c starvation KILL
becomes a measured curve instead of a binary.
**Artifact:** seat adapter + chamber verdict + Brier scores + full transcripts, all receipted.
**Acceptance:** same verifier, same kill rule (D≥0.20); verdict stands whether the local seat survives or dies.
**Pre-registered predictions to file before the run:**
- P1: local 7B Q4 seat completes ≥80% of witness claims at 8000-token budget (deepseek died at 0/96 @2000).
- P2: local-seat separator behavior matches the "separator is the CLAIM" grammar (dot-pattern distribution
  within 0.05 total-variation of the 94-dot corpus).
- P3: blind-prior → reveal gap ≥ +0.3 (round-12 measured +0.58 for chat; a smaller local model should
  calibrate *worse* — if it calibrates better, that is a finding, not a failure).

### G2 — GPU determinism audit harness (power-yank for the GPU)
**Systems used:** power-yank law (quilt-rust), stone chains, truncate-audit methodology, E-A1 determinism crown.
**What:** a harness that runs a fixed inference/training op-set twice per op and receipts **bitwise equality or
names the violation** — porting "no silent wrong state" to the substrate where nondeterminism is default.
Known from scouting: PyTorch's deterministic mode does not guarantee bitwise everywhere; that gap is the product.
**Artifact:** `gpu-determinism` tool + receipt chain of per-op verdicts (op name, dtype, shape, bitwise?).
**Acceptance:** two full-campaign runs produce byte-identical receipt chains (the harness itself is
deterministic); every non-bitwise op appears in a violation registry with a minimal reproducer.

### G3 — Quantization-erosion curves (exact-twin × E-Q10, novel)
**Systems used:** micrograd-quilt exact-twin (Fraction-exact twins), E-Q10 injector law, experiment registry.
**What:** take a small float model; build its exact rational twin; quantize the float side at int8 / int4 /
Q4_K_M / per-channel variants; measure drift against the exact twin as a function of quantization step —
**pre-registering the erosion shape** (is re-erosion monotone in bit-width the way E-Q10 found it monotone in
time? is there a firstZeroTick analogue — a bit-width at which the first exact node dies?). Scouting says
outlier-weight error jumps are documented folklore; nobody publishes monotone-erosion curves against exact twins.
**Artifact:** erosion-curve registry entry + curves + verdict.
**Acceptance:** predictions registered pre-run; curves reproducible from committed seeds (moth-seal certified).

### G4 — Certified-seeded Monte Carlo at 10^9 (moth-seal × comet-qrng-v1, scale-up)
**Systems used:** moth-seal certified sampling, moth-census engine map, D-statistic arena tests.
**What:** re-run the engine balance / D-statistic verdicts at GPU scale using moth-seal certified seeds per
stream. Registered trend to test: graph-v1's top-20 truncation bias was 0.5004 at N=5392 whitened bits —
**does the bias grow, hold, or shrink with N?** Comet (certified) should stay inside its cert envelope at every N.
**Artifact:** scale-verdict with per-stream provenance (every stream traceable to a comet cert).
**Acceptance:** kill rule unchanged; raw + whitened both receipted per stream; verdict updates the census.

### G5 — Local lure forge (loom-core bridge, GPU-trained)
**Systems used:** loom-core→SCN-003 forge bridge, arena lures corpus (96 behavioral mimics).
**What:** train a small local generator to breed mimic claims on the GPU; cross-verify: do locally-bred lures
score like API-bred lures in the chamber (same D-statistic), and does the separator-as-CLAIM grammar emerge
in locally-bred families too? Gives the chamber a lure supply that costs watt-hours, not API dollars.
**Artifact:** local forge + cross-verification verdict (local vs API lure families).
**Acceptance:** chamber, kill rule, and scoring unchanged; lure provenance labeled API vs local in every row.

### G6 — GPU fault-injection campaign (E-Q10 injector law, ported — literature OPEN)
**Systems used:** E-Q10 injector law (698-byte harness injector restores integrity to 1.000; re-erosion
monotone; zero self-repair; firstZeroTick=105 in 17/17).
**What:** bit-flip campaigns on weights/activations mid-inference on the GPU; test whether the E-Q10 laws
(monotone re-erosion, zero self-repair, deterministic first-zero) hold when the substrate is GPU hardware —
ECC on vs off where the card allows. **Honest status:** the scouting channel could not reach the
fault-injection literature (receipted junk results); this lane registers from first principles and says so.
**Artifact:** injector receipts + verdict with the literature-gap disclosure inline.
**Acceptance:** pre-registration discloses the search failure; results stand regardless of direction.

### G7 — Watt-receipts (pricing-first for gifted GPU, adopt immediately)
**Systems used:** pricing-first law, usage-receipt tables, embassy logs.
**What:** local GPU compute is gifted compute — it must leave usage receipts like deepseek spend did. Schema:
per-lane receipts with tokens, GPU-seconds (sampled via nvidia-smi), estimated watt-hours, and job id bound to
the stone chain. Adopted by every G-lane above; first consumer is whichever lane runs first.
**Artifact:** watt-receipt schema + first receipts.
**Acceptance:** no G-lane verdict ships without its watt-receipt (kill criterion: spend without receipts = VOID).

## Onboarding protocol for the GPU agent (stone standard, compressed)

1. Read PLANNING.md + this playbook; claim a G-item by appending to the round log (never delete history).
2. **Pre-register every prediction** (sha + mtime-sealed, moth-seal certified seeds) before any run.
3. Receipts-first: raw artifacts on disk, committed, before any verdict prose.
4. Fail-closed always; honest FAIL is a valid verdict; kill criteria from PLANNING.md apply unchanged.
5. Two-reader rule: your chains get a verifier in a second repo before the wave seals.
6. Push often to the right repos; if the push token is absent, commit locally and queue — never force-push,
   never write outside your lanes, issues-off repos are read-only (POST is the only honest test).
7. Watt-receipts on everything (G7). Zero asks in all outbound artifacts.

## Suggested wave slots

| Slot | Items | Rationale |
|---|---|---|
| wave 48–49 | G7 (schema now), G1 (seat spike), G4 (design registration) | G7 gates everything; G1 removes our oldest live limitation |
| wave 50–51 | G2, G3 | both are pure-GPU campaigns with existing exact-twin tooling |
| wave 52+ | G5, G6 | need G1's serving stack and G2's determinism receipts first |
