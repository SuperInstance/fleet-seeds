# concepts-44c — wave 44 novel-concept scan (lane 44-c)

Agent: lane 44-c · 2026-09-27T21:37–22:15Z · research-only, zero foreign writes, zero LLM spend, keys never printed.
Scope: the never-studied + freshly-pushed repos. Wave-43-b repos (quilt-mesh, ropesight, loom-core, mavis, blueprint, silicon, rips, cell-harness + desk: elephant, esp32, learn, ability-transfer, i2i, micrograd-quilt) NOT re-studied beyond delta mentions.

Predictions registered BEFORE hands-on: `pt44c-scan/44c-predictions.json` sha256 `cc515c6100c3bd7b6fd08fcb98676032d06f1d0561e12ef1f46fa3541cbec7ee`, mtime 2026-09-27T21:41:22Z (README/API triage done first; no clone/build/run before registration).

---

## Per-repo findings

### 1. eos-seed — RUNNABLE (cargo installed user-space for this lane: rustup minimal, cargo 1.98.1)
**What it is.** Brand-new (created 21:00:58Z, pushed 21:32:22Z): "bootstrap seed of the Epigenetic Operating System" — a 1,156-line Rust workspace. Memory-mapped append-only f32 fabric (`quilt_storage::fabric`, 64-byte-aligned header, zero-copy appends); 2-bit packed ternary gate (4 states/byte: 00 muted, 01 positive, 10 blocked, 11 reserved — `exoj_kernel::ternary`); integer-only scoring (f32 quantized by `bits >> 24` bit-shift, sign-preserved — no FP multiplies on the hot path); gradient-free **coordinate stepper** (flash {-1,0,+1} per cell in fixed order, commit argmin of total error, tie-keeps-current hysteresis); `inverse_physics.rs` derives targets from the log's own structure (per-sign median snapped to the quantizer's reachable set) — "no human labeling"; `docs/LEDGER.md` books the first calibration dead-end. No backprop anywhere; determinism = xorshift64* seed 2718 + fixed walk order.

**What I ran.** `cargo test --workspace --release`: 14/14 green (5+5+4 across the three crates). `cargo run --release` twice: **outputs byte-identical** (both runs sha256 `7d7261a00a9b4b171b4cdb8e952ba73be9669f1b40a52a659a5e38184f3c38b4`; final error 64969, gate +67 −89 0-100). Determinism claim CONFIRMED hands-on.

**Honest deltas found.** README says "12 tests" — the tree has 14 (HEAD commit says "14 tests green"); README's demo transcript quotes the older sonar-log demo (18219→15810) while HEAD's demo is the 256-dim moving-object bootstrap loop. Repo is moving faster than its README — exactly the drift quilt-verilog's README guards against with its machine-emitted `SUITE SUMMARY` line.

**Novel concept.** *"The quantizer IS the loss landscape."* In an integer-only loop, targets below one quantizer step make all-muted optimal and hysteresis freezes you there (their booked LEDGER lesson: ±64 targets unreachable at >>24 scale → recalibrate to ±256). Plus: gradient-free coordinate descent with tie-hysteresis is a receipts-friendly trainer — every step reproducible, whole-run byte-identical.

**Adoption sketch (qthe ternary embeddings).** Adopt the law, not the code: any qthe ternary-embedding experiment must assert its targets are inside the quantizer's reachable set (a cheap pre-run floor, same spirit as 42-b's PRE-RUN registration); and where determinism receipts matter, prefer the integer stepper over float training. The reserved `11` state is a clean extension seam for a 4th semantic.

### 2. cargo-line-tycoon — RUNNABLE (plain node, no npm install needed)
**What it is.** Quilt-native tycoon game + classroom on an 11-opcode algebra (5 cell-graph: BIND/LINK/EFFECT/VIEW/TICK + 6 observation: ATTEST/DELEGATE/CONTEST/MERGER/REVOKE/WITHDRAW), polyformal across TS/Rust/Python/C99 with an FNV-1a-64 canary (`0x024a555471370b18d` from `"café Δ 日本語"`), 5 cultural locales as separate pedagogical instances, memory-sandbox defense (Leong 2605.08442) + prev_hash provenance chain (FluctlightDB 2608.12365).

**What I ran.** All 8 stress suites with plain node. As-is: 01 fnv 29/29 ✓, 02 signal 11/11 ✓, 03 poisoning 8/8 ✓, 04 advisory exit 0 ✓, 06 conscription 16 features ≥5% quorum ✓, 08 provenance "BEAT FluctlightDB's 18%" ✓ — but **05 CRASHED (ENOENT)** and 07 scored **21/22**: both hardcode the author's machine path `/workspace/research/cargo-line-tycoon/...` (also in tests/sim/*.js and 09_levi_benchmark.py, the latter cross-coupling to `superinstance-advisor/data`). After patching the path LOCALLY (my clone only): 05 → 4/4 locale divergence ✓ (same observation → same cell address `0x9e33b861179ac47c` across all 4 locales) and 07 → **22/22 memory-sandbox ✓** (Python port rejects the same 6 Leong patterns). So: logic sound, tests not hermetic.

**Independent checks.** (a) My own node FNV-1a-64 over the UTF-8 bytes of `"café Δ 日本語"` (18 bytes) = `0x24a555471370b18d` == claimed canary (leading zero is display padding) — the polyformal canary is genuine canonical FNV-1a. (b) The provenance test's 100% top-1 claim reproduced in-run.

**Novel concept.** **Two-layer defense: storage (prev_hash witness-log) + execution (Memory Sandbox `safe_envelope` — "payload.text never reaches LLM agents directly"; "the substrate is verbatim, not a sanitizer")** — a direct VC-envelope analog with 22 passing tests behind it. Also the locale-divergence pin: same observation must hash to the same cell address in every pedagogy.

**Adoption sketch.** Memory Sandbox patterns × authority classes are a ready-made negative-control battery for our VC envelope readers (envelope = safe_envelope, disclosure classes = authority classes); the observation→cell-address locale-invariance pin is a good fleet-identity test for qthe. Upstream gift (staged, not posted): one-line `__dirname` path fix.

### 3. quilt-gpu-lab — DESK-ONLY (needs RTX 4050 / WSL2 nvidia-smi; repo read, guard policy verified by reading)
**What it is.** A standing ML experiment loop as a repo: `QUEUE.md` checkboxes (runner claims first unchecked), `RESULTS.md` append-only with honest verdicts **KEEP / KILL / INCONCLUSIVE / ABORTED**, `guard.py` watchdog (preflight: ≥1 GB free VRAM, ≤80 °C; in-flight: 5 s polling + 30-min hard wall), cron-driven ~2 h, "no TTY, failures recorded as data."

**What I read.** E1 KEEP (heldout gap +1.283 on real frames), E2 INCONCLUSIVE → E2b revision → **KILL** (hand-crafted flow+beat L0 dead on real frames — "learned L0 is the path"), E3 KEEP (rooms survive unseen windows, d_mu 0.664), E4 **INCONCLUSIVE ("reported KEEP by threshold, downgraded on review")** — verdict governance above the metric, receipts kept both ways.

**Novel concept.** **The experiment loop IS the repo** — queue-as-agenda, results-as-story, guard-as-conscience, verdict-governance (a human/agent review may downgrade what the threshold says).

**Adoption sketch.** Wrap moth/qthe sweep lanes in this harness (generalize guard: disk floor, wall-clock, rate limits; keep the append-only RESULTS ledger with all four verdicts). Cheap, doctrine-compatible, zero new science.

### 4. tessera — DESK-ONLY (design-phase docs) + **seed RUNNABLE via API-fetched files**
**What it is.** "A video studio where the footage is text" — charter from 2026-09-27, inherits chiaroscuro's renderer. IDEATION.md is exceptionally sharp: "never add a feature that makes a frame less text"; motion-as-diff ("grep the edit"); Git-for-video (quilt = working tree, director's cut = branch, merge conflict = two cells claim one slot); whitespace-as-decision; park-and-hold as resting state. Council structure (skeptic/aesthete/scientist/theorist + outsiders) is a multi-persona design-review grammar.

**What I ran (the `seeds/wal-edl` seed, fetched via Contents API).** `node --experimental-strip-types test.ts` → **ALL TESTS PASSED**, 20-delta canon hash `30192ea2661650fb`; post-crash replay → identical hash. My own edge probes on the 350-line zero-dep WAL: torn tail (truncated 5 bytes) → replay applies 4, `torn=true`, `recover()` truncates to `goodBytes`, re-replay = good prefix; corrupted byte mid-file → **"chain break at seq 1", applied 0** (fail-closed, folds nothing past a broken hash).

**Novel concept.** **Timeline = fold(WAL); EDL is pure derived data; crash-safety = replay** — typed deltas (SPLICE/HOLD/PARK/TRIM/REORDER) over a chained `prev/sum` record log with canonical JSON + GENESIS. This is the cleanest minimal reference implementation of the stone-receipt pattern in the fleet, runnable on stock node.

**Adoption sketch.** Keep `wal-edl.ts` as the teaching/reference grammar for stone chains (our chains get a 350-line executable spec); its typed-delta vocabulary maps 1:1 onto playlog ops (BIND/EFFECT ≈ SPLICE/REORDER, forget ≈ PARK).

### 5. quilt-verilog — PARTIALLY RUNNABLE (Python lanes ran; RTL/formal/synth desk-only, no iverilog/oss-cad-suite)
**What it is.** The cell fabric in pure Verilog-2005: 5+1 opcodes (BIND/LINK/EFFECT/VIEW/TICK + ACK/NAK response channel), run-to-completion FSM per cell, **non-deferrable tick** (pending tick suppresses ingress until serviced — proven under permanent flood), QUF flat binary state format ("the GGUF of cellular silicon"), 6 SymbiYosys proofs (2 real RTL defects found by formal, both regression-guarded), iCE40/ECP5 synth results, honest limitations section (no on-hardware test, BMC-bounded, shrunk formal params, model-grade rounds ladder).

**What I ran.** `python3 tools/quf.py selftest` (stdlib-only): **PASS — 576 bytes, sha256 `5b2a236ba5e38bca9ad96783c4252a12f36517f98a9164a249f0db115f221392`, round-trip byte-exact** — reproduces the README's receipt exactly. `make sim` equivalent (`python3 -m unittest discover -s sim/tools`): **34/34 OK** — reproduces the behavioral lane claim. RTL `make test` (23/23) and formal/synth NOT reproduced this session (no oss-cad-suite) — desk note, not a defect.

**Novel concepts.** (a) **"State is a file"**: complete fabric state travels in one flat QUF binary that a testbench, soft core, or FPGA loads identically, with optional `quf.sha256` integrity anchors over (name,size,data). (b) The tick-cannot-be-starved ingress contract, formally proven — a liveness guarantee our event loops rarely state. (c) Machine-emitted `SUITE SUMMARY` counts (counts can't drift stale).

**Adoption sketch.** QUF's "state file + integrity anchor + golden hex KAT" is the right shape for qthe/fleet checkpoint artifacts (compare: our VC checkpoint already does this for one artifact — QUF does it for a *runtime*); adopt the machine-emitted summary line into our test suites (eos-seed's stale count shows why).

### 6. quilt-rust — RUNNABLE (cargo; workspace builds in minutes) — **the sleeper hit of the wave**
**What it is.** NOT the tiny 5-opcode README (badly stale: README says 6/6 tests; actual workspace is far larger): "a spreadsheet where every cell is a live, addressable capability. The grid is the runtime." Workspace: packages core/mcp/cli/tui/web + crates `field-edge-bridge`, `federated-tinyml`, `live-canon`, `quilt-cabi`, `quilt-core-wasm`, `quilt-wire`, `quilt-polyformalism`.

**What I ran.** `cargo test -p quilt-core`: **95 passed** (71+14+6+3+1) + `field-edge-bridge`: **13 passed** (11+2). Then the named crash-safety suite: `cargo test -p quilt-core --release --test journal_power_yank` → **3/3 ok in 0.27 s**, including `power_yank_truncation_matrix` (truncates a journal at **every byte offset** and replays each prefix) and recovery-truncates-to-exactly-the-good-prefix.

**Novel concepts.**
- **`journal.rs` — the black-box recorder doctrine:** length-prefixed CRC32 frames + SHA-256 frame chain + per-payload ledger seals = three independent verification layers; design target is a boat 60 mi offshore losing power mid-write: "**no case produces a silent wrong state**"; contract pinned by the exhaustive power-yank test.
- **`field-edge-bridge` — one vector, two vocabularies:** "the ledger's `imbalance` and the elephant's field-edge are two projections of **one directed edge Δ = after − before**," proven to 1e-12 against `compat/golden.json`; bridge identities exposed as checkable residuals; `record_with` seals field-state before/after into the hash-chained cell ledger.

**Adoption sketch.** (1) Port the **power-yank exhaustive-truncation test pattern** to our receipt chains (qthe stone, fleet-seeds witness logs, VC checkpoints) — it is the strongest chain-integrity guarantee I have seen anywhere in the fleet, and our `tools/verify-fleet.mjs` fixtures are the natural host. (2) Adopt field-edge-bridge semantics wherever moth/qthe drift measurements must become sealed ledger entries (drift = one directed edge, measured and sealed, not a free-text note).

### 7. chiaroscuro — DESK-ONLY (webcam hardware; `?mock=1` + Playwright tools noted)
Four real-time webcam-to-text renderers, five engines (glyph/braille/pixel/shape-match/halftone), 45+ dials, honest ledger ("the first Mirror was the most pleasant to look at"; "resolution of *meaning* ≠ resolution of *tone*"), provenance preserved (v1 kept byte-for-byte). Novel: **export-renderer = the decision procedure frozen three ways** (.html/.json/.py with settings as boot state) — "what you tuned wasn't a filter preset, it was the decision procedure." Adoption sketch: our verifier/arena configs could ship the same way — a config that IS a runnable verifier, not a description of one. tessera is its designated heir.

### 8. AI-Writings — DESK-ONLY, skim only (3.6 GB content repo; 10k+ pieces, 19+ models; pushed 21:36:24Z)
Creative canon ("totem forest"), radio-theater audio, multi-LLM sound fiction. Nothing runnable for our lanes; noted as the corpus behind advisor's embeddings and live-canon.

### 9. superinstance-advisor — RUNNABLE (stdlib cell probe)
**What it is.** "An advisor that IS a cell": 8 primitives, 5+1 opcodes, a2a-protocol-backed Murmur bus, merkle-rooted witness log, live Cloudflare heartbeat (`cell-heartbeat.superinstance.dev`, 5-min cron), cells 5001/5002 admitted to live canon.

**What I ran (stdlib only — cell.py needs no deps).** Built a Cell, bind/link/effect/tick, then **independently re-verified the witness chain**. First attempt FAILED (root mismatch at every link) — reading `_witness` closely: `root_i = sha256(dumps(log[:i] + [entry_i_without_root]))` — the root excludes itself. Correct replay: **chain verified True (4/4 links)**. Two findings: (a) it is not a merkle tree — it's a **rolling snapshot hash** (verify link i by replaying the entire prefix; O(n²) to verify all); (b) **`FORGET("witness")` resets the chain with no tombstone** — post-wipe first entry has `prev_root: None`; a wipe is invisible to later verification. Audit hole by design-as-built.

**Also noted.** Latest commit (990c39b, 13:32Z) adds `taps_creative_break.py` using `ssl._create_unverified_context()` (their comment: CDN SAN-list verify bug workaround) — security-relevant shortcut, disclosed in their code, flagged here.

**Adoption sketch.** The rolling-root chain is cheap and self-verifying but our chains should (1) name the mechanism honestly (rolling root ≠ merkle root — terminology matters in receipted systems), and (2) make forget a **tombstone entry**, never a reset. Both are one-afternoon fixes in our own grammar.

### 10. plato-portal — RUNNABLE (venv; README quickstart)
**What it is.** Python SDK for persistent multi-agent systems: markdown-file agent memory (SOUL.md/USER.md/MEMORY.md/diary), in-memory Fleet, thread-safe LRU agent cache, optional DeepInfra. "tabula plena: start abundant, prune to clarity." Honest README (roadmap vs current split explicitly labeled; "A PLATO tile is not an ActiveLog event" — anti-inference note between data models).

**What I ran.** Fresh venv, `pip install -e .`: pytest errored on `--cov` addopts (pytest-cov not in base extras) → with README's own `.[dev]`: **47/47 passed**, BUT the run **exits 1: coverage gate 62.09% < `--cov-fail-under=80`**. Behavior probes: memory persists as markdown under `memory_dir/{agent}/MEMORY.md|SOUL.md|USER.md|diary/`, recall hits, LRU identity `a1 is a2` holds.

**Novel concept.** Modest tech, but the README is itself a receipt artifact: explicit current-vs-aspirational separation and an explicit "do not infer a bridge between these two formats" warning — good doctrine for our own repo hygiene.

**Finding (P-minor).** Coverage gate set to 80% while the suite delivers 62.09% — the README quickstart as written exits 1. Either gate to the real number or mark aspirational (their own doctrine says READMEs never oversell).

---

## Predictions vs results (registered pre-run: sha cc515c61… @ 21:41:22Z)

| # | Claim (registered) | p | Result | Outcome | Brier |
|---|---|---|---|---|---|
| P1 | tycoon: 8 stress suites GREEN under plain node, counts as README | 0.72 | **FAIL as-run** — 6/8 green; 05 crash + 07 21/22, both from hardcoded `/workspace/research/...` author paths; after local path patch ALL green (29/29, 11/11, 8/8, 4/4, 16-quorum, 22/22, 100%) | 0 | 0.5184 |
| P2 | independent FNV-1a-64("café Δ 日本語") == 0x024a555471370b18d | 0.80 | **PASS** — `0x24a555471370b18d`, exact | 1 | 0.0400 |
| P3 | quf.py selftest reproduces 5b2a236b… (576 B, round-trip) | 0.70 | **PASS** — byte-exact, stdlib-only | 1 | 0.0900 |
| P4 | independent cell serialization + FNV == 0xe435d91d6d92a1d8 | 0.62 | **PASS** — type byte = 1 disambiguated by match; reproducible from README prose alone | 1 | 0.1444 |
| P5 | eos-seed: tests 12/12 as README AND double-run byte-identical | 0.55 | **FAIL on letter** — 14/14 pass (README count stale), determinism clause CONFIRMED (runs sha-identical `7d7261a0…`) | 0 | 0.3025 |
| P6 | plato: install+pytest green; memory persists; LRU identity | 0.80 | **FAIL on letter** — 47/47 pass but quickstart exits 1 (coverage 62.09% < 80 gate); both behavior clauses hold | 0 | 0.6400 |

Mean resolved Brier **0.28922** (3 PASS / 3 FAIL). All three FAILs are findings, not noise: (1) tests not hermetic (author-machine paths), (2) hand-edited README counts lag fast-moving code (verilog's machine-emitted `SUITE SUMMARY` is the cure), (3) a coverage gate set above what the suite delivers. The wave's cross-cutting lesson: **this fleet's claims are honest but its CI-config and README-counts are its weakest receipts.**

---

## Ranked top-3 novel concepts that matter

| # | Concept | Where | One-line adoption sketch |
|---|---|---|---|
| 1 | **Power-yank journal contract + field-edge-bridge** ("no silent wrong state" under every-byte-offset truncation; ledger imbalance ≡ field edge Δ = after − before, one vector two vocabularies, 1e-12 golden proof) | quilt-rust `packages/core/src/journal.rs`, `crates/field-edge-bridge` | Port the exhaustive-truncation test pattern into `tools/verify-fleet.mjs` fixtures for qthe-stone/fleet-seeds/VC chains, and adopt Δ-projection semantics wherever moth/qthe drift becomes a sealed ledger entry. |
| 2 | **"The quantizer IS the loss landscape"** — integer-only ternary gate, gradient-free coordinate descent, tie-hysteresis, byte-identical determinism (verified live) | eos-seed `exoj_kernel`, `docs/LEDGER.md` | Add a pre-run "targets inside quantizer's reachable set" floor to qthe ternary-embedding registrations; prefer the deterministic integer stepper where receipts matter more than convergence speed. |
| 3 | **wal-edl: timeline = fold(typed append-only WAL)** — chain-break fail-closed, torn-write recovery to the good prefix, all in 350 zero-dep lines (edge-probed live: corrupt byte → "chain break at seq 1", applied 0) | tessera `seeds/wal-edl/wal-edl.ts` | Adopt as the executable reference grammar for stone receipt-chains (and mirror its typed-delta vocabulary in playlog ops); it is the minimal runnable spec our chains have lacked. |

Runner-up: quilt-gpu-lab's **experiment-loop-as-repo** (QUEUE/RESULTS/guard, verdict governance incl. "reported KEEP by threshold, downgraded on review") — the cheapest immediate upgrade for moth/qthe lane harnesses.

## Fleet pushes, last ~2 h (GET-only, API)

Since 2026-09-27T21:30Z:
- **AI-Writings** 21:36:24Z (content, 3.6 GB repo)
- **eos-seed** 21:32:22Z (the "bootstrap loop live" commit studied above)

Notable inside the 2 h window (20:05–22:05Z):
- **pong-quilt** 21:16:13Z, then **two commits AFTER our task started**: b767404 21:42:35Z + 629bfd8 22:01:20Z ("R49 main-repair: #62 merge result red on one pin…" / "…one root cause healed both red") — the house is live-repairing merge rot hours after our #49 letter; scorer-relevant only via #49 (still the priced window).
- **cargo-line-tycoon** 21:14:30Z ("P1 make-it-fun + P1 the graphics leap" merge) — the tree I tested.
- **quilt-gpu-lab** 21:13:16Z (E4 INCONCLUSIVE + E2b KILL commits).
- **fleet-seeds** 21:26:59Z and **21:58/21:59Z** — the latter is **lane 44-b landing** ("exact-twin audit + pairing schedule + witness grammar — wave-43 ADOPT items"); zero overlap with this lane's dirs (playtest/wave44 vs my scan dir + download/).
- **qthe** 20:17:49Z (our 42-b seal, no new movement).

## Honest limits

- **Not run (desk-only, hardware/deps):** quilt-verilog RTL testbench + formal + synth (no oss-cad-suite/iverilog — README counts 23/23, 6/6, synth numbers taken as desk receipts); quilt-gpu-lab experiments (no GPU); chiaroscuro live doors (no webcam; Playwright harness not installed); AI-Writings (3.6 GB content, skim per task); tessera design docs (no code beyond seeds); superinstance-advisor's numpy/npz canon path and live-canon network calls (stdlib cell probe only).
- **eos-seed determinism** verified for the current bootstrap demo (2 runs, byte-identical); I did not fuzz cross-machine determinism (broker sizes worker ring from host cores — could vary run *speed*, not output, per fixed-order design; unverified).
- **superinstance-advisor chain verdict** depends on the root-excludes-itself replay convention read from `_witness` source; no independent spec doc exists.
- **cargo-line-tycoon 08 provenance** reproduced as their test reports it (100% top-1 vs their own harness); I did not re-implement the FluctlightDB baseline.
- **Coverage of advisor/taps SSL-bypass**: noted, not exploited or further tested; network calls avoided entirely.
- Predictions scored by strict letter per house law; mean Brier 0.28922, no post-hoc edits.

## Artifacts
- Predictions (sealed pre-run): `/home/z/my-project/pt44c-scan/44c-predictions.json` (+ `.sha256`)
- Local clones (read-only experiments, zero pushes): `/home/z/my-project/pt44c-scan/pt44c-{eos-seed,cargo-line-tycoon,quilt-verilog,plato-portal,quilt-gpu-lab,superinstance-advisor,quilt-rust}` + `/home/z/my-project/pt44c-scan/tessera-waledl/`
- Run receipts: eos double-run sha `7d7261a0…` ×2; quf selftest `5b2a236b…`; canary `0x24a555471370b18d`; cell hash `0xe435d91d6d92a1d8`; waledl canon `30192ea2661650fb`, lastSum `b0c811d6…`; probe outputs in transcript above.
- Report: this file (canonical: `/home/z/my-project/download/playtest-wave44/concepts-44c.md`; backup: `/home/z/my-project/pt44c-scan/concepts-44c.md`).
