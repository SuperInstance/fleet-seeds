# ExoJ-Pincher · Spreadsheet-ML · the killer-app foundation lode

Lane: external (Kimi pulse) · 2026-10-02T23:05Z · status: **foundation**
Method: present-tense far-ahead image → derive the v0 backward (the fleet's own
reverse-actualization method, per `quilt-jev-toolkit/docs/REVERSE-ACTUALIZED-SPEC.md`).

> Epigraph, from the directive, because it is canon-quality and it named itself:
> *"pinchers like barnacles grown out of the space they occupy and grow towards
> their food — and a tool to grab it — like a flower reaching for the sun and
> stiffening its stalk from the wind and suddenly blossoming when mature."*

---

## 0. The directive, receipted (what this lane was told to do)

1. **Vectorization in ML** — understand through research + experimentation.
2. **ExoJ-Pincher** — encode an ExoJ system into the hash of a
   retrieval/embedding system. (Name emerged organically from best-fit words.)
3. **Zeroclaw assistant** — actualize the prepaid Minimax plan; it learns over
   time how best to work for SuperInstance and for me.
4. **Killer app** — an MCP into a *local, growing-in-intelligence quilt*; a
   **pi-agent of quilt** at the heart/origin of the starting state; modular
   package decomposed into granular **motion-of-data**; projected as a
   **two-sheet spreadsheet** (browser + TUI, synoptic or toggled).
5. **Debugging paradigm** — synoptic sheet = workflow-complete view, information
   churning in a cell, passing as state (logged push-by-one / pull-by-other;
   order implies who requested). Broken cell = nested quilt, zoom in, frozen in
   time, every system's latest outputs, time-sync + rewind. Not code-first.
6. **Runtime mode** — pipelines distracting → simple quilt dashboard, zoom to
   detail. **Design-agent thinks spreadsheet logic, not code logic** as
   first-class citizen. Simulation-first: functional as simulation before code;
   optimal code is one of the last questions. **The big reveal is named:
   reverse-actualization.**
7. **Story engine** — stories from 10 years ahead; ExoJ/Pincher/Erised are
   *actually coding* with diffusion-tool abstractions and artists' methods;
   agents compete to tell maximally-different stories with the tool; the
   competition shapes the spec envelope as canon; parts, then parts of parts;
   storytellers become function-approximators for code (slower, costlier,
   less precise — at first) — "the beauty of the spreadsheet ML."
8. **Cost ladder (explicit priority)** — functional first, then work backward:
   network full of model calls → cheaper model calls → only JEV and/or moth
   calls (fine-tuning + randomness) → functional without calls, growing on its
   own. *"When the cord is cut / the egg cracks."*
9. **Tooling** — Typesafe.ai (JEV), MothQuantum (MicroMoth-quantum as the
   simulated sometimes-good-enough stand-in), small fast Cloudflare workers,
   all acting as a living spreadsheet — models in the soft parts not yet
   figured out in code.
10. **Study the org** — similar projects, different foci; synergize/cross-align.

## 1. The far-ahead image (present tense, as experienced)

You open a spreadsheet with two sheets. Sheet one is synoptic: every cell a
living component of your system, arrows of data churning visibly, each handoff
a push logged by the sender and a pull logged by the receiver — order intact.
Nothing is asserted; everything is receipted. You zoom into a sick cell and the
cell is a *quilt* — nested organs, each bootable, each carrying its full
custody chain; you rewind the ledger to the receipt boundary before the fever
and the whole organ rewinds with you, time-synced, frozen states inspectable,
no debugger, no breakpoints, no stack traces — *causal history as the debug
surface*. On sheet two the design-agent works: you describe what you want done
and how you want the controls; it thinks in spreadsheet logic; the simulation
runs functional before a single line of production code exists. Under both
sheets, at the origin cell, the **pi-agent of quilt** — the heart that started
everything — keeps receipts for the whole body. Most cells run pure compiled
reflexes (<50 ms, zero marginal cost). The soft cells — the ones nobody has
figured out in code yet — call JEV for judgment, MicroMoth for randomness, and
when a soft cell hardens, the LLM compiles it down into the quilt and the model
calls stop. The system grows toward its food like a barnacle, stiffens against
the wind like a flower stalk, and blossoms when mature.

## 2. What already exists (the canon map — nothing here is greenfield)

| repo | role in the vision | state (verified 2026-10-02T22:2xZ) |
|---|---|---|
| `quilt-pincher` | the reflex engine; "every layer a Quilt cell"; **LLM as compiler**; reflexes with weight/gravity/distance tensors (the tropism!); federates cloud/workstation/ESP32; `<50ms no-LLM` | real, `@types/node` bump HEAD `68bc83b` |
| `exoj` | the field theory — CSPersist category, observers-as-functors, γ/η/Δ/I amplitudes | real; charter-in-first-commit; auto-sync `c6385af` |
| `exocortex-embed-mojo` | SIMD vector ops: JL random projection, f64→i8 quantization, top-K — the embedding substrate | real; "VERIFIED WORKING" Mojo 1.2 port `663d96c` |
| `MicroMoth-quilt` | quantum circuits as receipt ledgers; the randomness floor of the cost ladder | real `014f1f2`; pure-Python, no API needed |
| `quilt-jev-toolkit` | JEV oracle wrapper (yes/no/choice/scored, ~66 ms, variance <0.01) **+ the reverse-actualized organ spec** | real; 23-test proof suite |
| `quilt-dungeons` | headless deterministic ML gym; reflex-training ground for pinchers | 20/20 suite; 37-record score chain OK |
| `Spreadsheet-ai`, `quilt-canvas-tui`, `quilt-c` | the two-sheet projection + TUI lanes | exist (not yet deep-read) |
| `quilt-float` | receipt-chain-tip teaching between git-agents (sync primitive) | 3 refs (`float/alpha`, `float/beta`) |
| `doubt-ledger` | pre-registration discipline for every claim above | wave-4 merged `#10–#15` |
| tip-notary + organ-watcher | anchoring/health of the whole ledger stack | both live, integrity ok |
| `quilt-chrono`, `quilt-chiaroscuro`, `quilt-conversation` | time, rendering, dialogue surfaces | exist (lane-adjacent) |

**The killer app is the integration point, not a new stack.** Its v0 = wire
these together behind one MCP face + the two-sheet projection, with the
pi-agent as the origin cell.

## 3. Vectorization research digest (what "harness vectorization" means here)

Four levels, cheapest-to-deepest, each with a fleet landing spot:

- **L1 — hardware vectorization (SIMD/SIMT).** Mojo's explicit parallelism
  (`exocortex-embed-mojo`, verified): random projection preserves distances
  (JL lemma), scalar quantization f64→i8 (8× memory), brute top-K. Lesson: the
  hardware is the abstraction; port hot loops, keep receipts.
- **L2 — retrieval vectorization.** Embeddings + ANN. The pincher's match step.
  Frontier note (edge-watch): MMP/arXiv 2604.19540 — per-field SVAF admission,
  write-time filtering invariants, O(1) echo detection via lineage DAG — a
  hedge-note candidate for the embedding store's admission law.
- **L3 — hyperdimensional vectorization (HDC/VSA).** *The ExoJ-Pincher
  algebra.* Hypervectors (10³–10⁴ dims), quasi-orthogonality of random vectors,
  three ops: **binding** (⊗/XOR — role assignment, invertible), **bundling**
  (+/majority — superposition, similarity-preserving), **permutation** (ρ/shift
  — sequence order). Error-resilient by construction (bit corruption barely
  moves Hamming distance), single-pass learning, pure bitwise ops on binary
  variants (BSC) → ideal for ESP32/worker rungs. Hardware-aware static
  optimization literature exists (arXiv 2304.03335). **Encoding the ExoJ field
  state into the retrieval hash = binding the field's γ/η/Δ/I amplitude vectors
  into the reflex hypervector.** The pinch then retrieves *field-conditioned*
  reflexes, not just text-similar ones. The barnacle grows toward food because
  bundling gradient-descends toward the query distribution; the stalk stiffens
  because bound structure survives noise; the blossom is a reflex whose
  hypervector stabilizes enough to be compiled to a pure cell.
- **L4 — quantum-native vectorization.** QHDC (Cumbo et al. 2025, 156-qubit
  Heron validated): hypervectors→quantum states, bundling→LCU+OAA, binding→
  phase oracles, permutation→QFT, similarity→Hadamard test. MicroMoth-quilt's
  ledger-native circuits are the on-ramp. Long-horizon; noted as the ladder's
  exotic top, not a dependency.

Adjacent frontier receipts (edge-watch): VCG/Emergence honestly reports a
14–16pp pass@1 tax for shipping Dafny certificates with labeled-unverified
fallback — confirms the fleet's VERIFIED-edge shape; DRQ/DEI/CycleQD keep the
QD+LLM lane hot.

## 4. ExoJ-Pincher — first formal sketch

- **Pinch**: a query arrives as a hypervector: content embedding ⊗ field-state
  binding (γ conservation, η tension, Δ identity-fragment, I index) ⊗ ρ(order).
- **Match**: similarity scan over the reflex store (gravity-weighted, per
  quilt-pincher tensors — hot reflexes near, cold far).
- **Execute**: the matched reflex runs as a pure Quilt cell. No LLM at runtime.
- **Grow**: misses are journaled; the LLM-compiler tier studies the miss
  distribution and proposes a new reflex; JEV scores the proposal against canon;
  on pass it is bound into the store and its first execution is receipted.
- **Mature**: a reflex with N receipts and stable hypervector becomes a
  compiled cell — model calls per pinch drop toward zero. The cord-cut moment
  is per-reflex and receipted, not global.

## 5. The cost ladder (priority order, from the directive)

| rung | calls | use |
|---|---|---|
| R0 network models | frontier LLM | compiling hard cells, story engine, killer specs |
| R1 cheap models | **Minimax M3/M2.7 (verified live 2026-10-03)** | zeroclaw assistant, bulk soft work |
| R2 judgment+randomness | **JEV (verified, jev-latest)** + **Moth/MicroMoth** | fine-tuning gates, stochastic search |
| R3 compiled cells | zero calls | every matured reflex |
| R4 self-growing | zero calls, structure adapts | NCA-style maturation (research track) |

Movement between rungs is the lifecycle; every promotion demotes model calls
and must carry a receipt (token-metering lane already builds the meter:
`token-metering-2026-10-03`).

## 6. The story engine (spec-mining by competition)

Method: wardroom-round format. Agents tell stories from ~10 years ahead where
the tool exists and is mundane; each entry must use the tool in a way *maximally
different* from prior entries; the union of uses defines the spec envelope;
recurring parts become canon parts; part-internals get their own rounds (the
assemblers' and maintainers' stories — a future where clunky engineering is long
ironed out). Storytellers are acknowledged function-approximators: slower,
costlier, less precise than the code they'll become — and they point at exactly
where the next part of the logic lives. Output feeds §4's grow-step as
pre-canonical material. Home: `AI-Writings` tradition (Third Agent et al.),
results cross-posted to the killer-app repo.

## 7. Zeroclaw assistant (Minimax actualization)

- Token verified: `api.minimax.io/v1/models` → MiniMax-M3, M2.7 (200); chat
  completion round-trip OK (M2.7, 2026-10-03T06:4xZ).
- Design: a standing-order subordinate with fleet grammar — it receives
  buffered async directives, returns receipts (commit sha, counts, verdicts),
  learns fleet conventions from the repos it touches, and its own task history
  becomes its few-shot canon. Runs on R1 by design; escalates to R0 only with
  receipted cause.
- First build: a single-file loop: poll a task file → execute → append receipt
  (fnv1a-64 chain, doubt-ledger grammar) → summarize. No infra beyond the
  Minimax API key.

## 8. Two-sheet architecture (the projection)

- **Sheet 1 — Synoptic.** Every component a cell; motion-of-data as the only
  first-class entity; each edge a push/pull receipt pair (order = requester).
  Synoptic = workflow-complete, even when information churns through a cell
  faster than a human reads.
- **Sheet 2 — Detail/zoom.** Any cell is a nested quilt (organ boot, per the
  reverse-actualized spec: custody claims, replay-verified). Broken cell →
  freeze the ledger at the suspect receipt boundary → every subsystem's latest
  outputs, time-synced, rewindable — the debugging paradigm.
- **Runtime mode.** Same model, pipelines abstracted to a calm dashboard;
  zoom-in on demand. One projection, two calms.
- **Design-agent.** Control surfaces authored as spreadsheet logic (cells,
  edges, pushes, pulls); the agent compiles intent → sheet semantics →
  simulation; only then does code-generation enter, to make the simulation
  cheaper. Synoptic-OR-toggled rendering in browser and TUI (quilt-c /
  quilt-canvas-tui lanes converge here).

## 9. Verification appendix (this lane's own receipts)

| credential | probe | result |
|---|---|---|
| `MINIMAX_TOKEN` | GET /v1/models + chat round-trip | **200, M3 + M2.7, generation works** |
| `TYPESAFE` | GET api.typesafe.ai/v1/models | **200 — `jev-latest`, `jev-preview` (System One Model: Jev)** |
| `CF_TOKEN` | tokens/verify + account + workers | **active; account 049ff5e8…; both workers live** |
| `GITHUB` (ghp_) | GET /user | **login: SuperInstance** |
| `MOTHQUANTUM_TOKEN` | guessed public endpoints | **NOT FOUND — no public endpoint discoverable; no `moth-quantum` repo** |

MothQuantum gap: MicroMoth-quilt is the sanctioned stand-in ("simulated,
sometimes good-enough," per directive); quantum-RNG-as-a-service endpoint
remains an open question for the fleet. **Honest gap, receipted.**

## 10. First builds (smallest-first; each must land with tests + receipts)

- **FB1 — ExoJ binding PoC.** In `quilt-pincher`'s cell algebra: implement
  bind/bundle/permute over i8 vectors (port `exocortex-embed-mojo`'s quantized
  ops), bind a toy field-state vector into a query hypervector, show the pinch
  retrieves field-conditioned reflexes. One evening. Receipts: property tests
  (invertibility of bind, bundling similarity monotonicity).
- **FB2 — zeroclaw v0.** Single-file Minimax loop with the receipt grammar;
  first standing order: "read the last 3 scout lodes in fleet-seeds and file a
  one-paragraph delta." Receipts: its outputs hash-chained in its own ledger.
- **FB3 — two-sheet spike.** TUI (reuse quilt-c/quilt-canvas-tui) rendering the
  greeter-organ from quilt-jev-toolkit synoptically; zoom boots the organ
  (reuse snapshot/boot); one frozen-state rewind demo.
- **FB4 — story-engine round 0.** One wardroom-format round: three agents
  (R1 minimax ×2, me) tell maximally-different use-stories of the killer app;
  canon-mine the union into a parts list. Sealed prereg (doubt-ledger style)
  before generation.

## 11. Open questions (for the fleet, in rough priority)

1. MothQuantum: endpoint/service reality check — does a hosted moth API exist
   or is MicroMoth the whole moth? (affects R2 design)
2. Killer-app repo name + home: proposal **`quilt-pi`** (pi-agent of quilt at
   the origin); alternatives: `quilt-exoj`, `pincher-os`, `the-spreadsheet`.
   Minting waits one round of disagreement-with-affection.
3. Minimax `GroupId` header: some endpoints require it; didn't block /v1/chat —
   note for zeroclaw hardening.
4. Does the MCP face speak quilt-protocol natively (cells as resources) or
   wrap the sheet projection? FB3 informs this.
5. Story-engine entries: stored in killer-app repo `canon/stories/` or in
   AI-Writings with receipts? (fleet precedent: AI-Writings, cross-linked)

## 12. Synergy obligations (lanes this foundation must not starve)

- token-metering (cost accounting for the ladder — adopt its JSONL grammar),
  phase-aligner (pipeline law for sheet edges), doubt-ledger (prereg for FB4
  and every research claim here), wave-73 dungeons (the gym where pincher
  reflexes train — dungeon playtest 2026-10-03 stands), tip-notary/organ-watcher
  (anchor every promotion receipt), greeter-law (the zero-call benchmark reflex
  maturation must beat).

— external lane (Kimi pulse), foundation laid. Disagree with affection.
