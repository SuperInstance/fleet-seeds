# concepts (43-b) — back-catalog mining: the never-read repos, hands-on

Task ID: 43-b · Agent: concept-miner (lane) · Wave 43 · 2026-09-27
Scope: RESEARCH + EXPERIMENT on the SuperInstance back catalog never deeply read. Hands-on > desk-read. Zero foreign writes, zero LLM spend, zero key reads. Node v24.21.0 + Python 3.12.8 only.

---

## Method + budget discipline

- **Clones (8, at the budget cap):** `download/pt43b-quilt-mesh` @ e7a3b4b, `pt43b-ropesight` @ d8b1bb4, `pt43b-loom-core` @ bf7860f, `pt43b-mavis-substrate-walker` @ 808f0d3, `pt43b-quilt-blueprint` @ a7b27c0, `pt43b-quilt-silicon` @ 83b2e4b, `pt43b-quilt-rips` @ 1e9911c, `pt43b-quilt-cell-harness` @ b41966d.
- **Desk-only (API triage, no clone):** elephant, quilt-esp32, quilt-learn, ability-transfer, quilt-i2i, micrograd-quilt (two files fetched for a hands-on probe — no clone).
- **Prediction-first:** all micro-experiment claims registered in `43b-predictions.json` (sha256 `5a977cbf972c65c7…`, mtime 2026-09-27T21:02Z) BEFORE any experiment run; every receipt file mtimes ≥ that. Honest FAIL kept as a result.
- **Receipts:** `receipts/43b-exp1-result.json` (bazaar), `receipts/43b-exp2-result.json` (mesh convergence), `receipts/43b-exp3-result.json` (ropesight fairness), `receipts/43b-exp4-loom12gens.txt` (loom 12 gens). Experiment scripts: `scripts/43b-mesh-converge.mjs`, `scripts/43b-ropesight-fair.mjs`.

## Registered micro-experiments — verdicts

| Exp | Claim | Verdict |
|---|---|---|
| exp1 bazaar | P-M1 chain verifies + deterministic seal across runs | **PASS** (seal `0x6cee228aa60e3d64` twice; only diff = wall-clock date field) |
| exp1 bazaar | P-M2 trade moves bloodline coverage 2→3, solo capped 2 | **PASS** (both minds 2→3; solo control 2) |
| exp1 bazaar | P-M3 woven fraction ∈ [0.2, 0.8] | **PASS** (3/7 = 0.43; immune system caught all 4 mimics, struct=0) |
| exp2 mesh | P-X1 3 peers converge ≤30 rounds, median ≤10 | **PASS** on the sound minimal instantiation (per-author VV): 20/20 converged, median 2, max 2 |
| exp2 mesh | P-X2 zero lost updates (event union at every peer) | **PASS** (idempotent (author,lamport) dedupe held in all 20 sims) |
| exp2 mesh | P-X3 every peer Lamport ≥ max event lamport | **PASS** (20/20) |
| exp3 ropesight | P-R1 method 30/30 ordered pairs vs RR 6/30 | **PASS** (exactly 30 vs exactly 6; 5.0× coverage) |
| exp3 ropesight | P-R2 method pair-meeting max/min ≤ 2.0 | **PASS**, stronger: **exactly uniform 10/10** per pair |
| exp3 ropesight | P-R3 methods don't beat RR on turn fairness | **PASS as framed** — tie (lead deviation 0.8333 both at M=37); methods buy pair diversity, not lead fairness |
| exp3 ropesight | P-R4 method gaps ≤120 rows; RR pairs meet exactly every 6 rows | **FAIL (honest)** — method clause held (max gap 9 ≤ 120) but my pre-run model of RR was wrong: RR's 6 fixed pairs meet 50/60 rows (internal gap ≤ 1), not every 6. Real result: RR = near-constant companions (50 meetings, zero diversity), method = all 30 pairs evenly (10 each, max wait 9) |
| exp4 loom | P-L1 exit 0, chain VERIFIED, crowned elites 100% born-correct | **PASS** (chain 108 links VERIFIED; crowns pass the forge by construction) |
| exp4 loom | P-L2 all distinct families crowned by gen ≤ 4 | **PASS** — stronger: all 4 crowns at **gen 1** (DRIFT.md's temporal saturation reproduced on a fresh run) |
| exp4 loom | P-L3 mimics ≥ 60 of ~96 candidates | **PASS** (mimic=92/96 = 96%) |

**12 PASS / 1 honest FAIL across 4 experiments.** The FAIL falsified my RR adjacency model and sharpened the finding, which is what registration is for.

---

## Per-repo mining (8 cloned + 6 desk)

### quilt-mesh @ e7a3b4b — ⚠️ repo has two identities; only one runs
- **Concept:** (a) the GitHub-description identity: *broker-less CRDT mesh for quilt cells — Lamport clocks, rooms, (author,lamport) dedupe, version-vector anti-entropy* — lives as a **256-line Rust design sketch** (`src/lib.rs`, honest about being a sketch; no cargo in sandbox, and deps are commented out anyway). (b) the code that actually runs is the **Poly-GAN bazaar** (mesh/ extracted from loom-core): two doctrinal minds breed solo, trade crowned logic, receiver-side immune system (dedupe bar) weaves only what is exact AND novel to it.
- **What ran:** `mesh/crosswalk.mjs` exit 0 (ASCII agreement byte-exact, unicode boundary DIVERGE documented per-row, receipt seal `0x4edcab78da9a87ea`); `mesh/bazaar.mjs` exit 0 ×2, 3/7 woven, coverage 2→3, seal `0x6cee228aa60e3d64` deterministic; `doctrine_drift.mjs` exit 0 (18 rows, tip `71d5c4ac`, foundry entropy NARROWS to H=0 in second half of every target). `npm test` **BROKEN** — points at nonexistent `test/smoke.mjs` (package.json absorbed loom-core's shape during extraction; one-line upstream fix).
- **Hands-on experiment (exp2):** I ported their Rust protocol semantics to JS and gossiped 12 events across 3 peers × 3 rooms × 20 deterministic sims, zero coordinator. **Three findings that ARE the concept:** (1) *the sketch as written never writes `versions[peer]`* (only self in `set()`), so `pending_for()` always full-dumps — sound but 1.58× wire; (2) *the natural delta reading (scalar per-peer acked clock) is UNSOUND*: 0/20 sims converge, permanent divergence, because lamports interleave across authors — a scalar ack skips third-author events forever; (3) the sound minimal repair is **per-author delivery tracking** — the dedupe key (author, lamport) already *is* a version vector; with it: 20/20 converge in ≤2 rounds, zero lost updates, clocks causal. Bonus probe: the sketch's `Conflict` case (same lamport, different authors, same cell) never fired in 20 sims (0 ties at max) — value resolution stays an open desk-level gap.
- **Verdict: MATTERS-FOR-US (as design)** — the answer to "could crab-traps arena cells sync peer-to-peer with zero coordinator?" is **yes in ≤2 gossip rounds at 3 peers**, IF anti-entropy granularity is per-author. Adoption cost: LOW for the concept (one module), MEDIUM for production (needs value-resolution tie-break + peer discovery).
- **Adoption sketch:** arena cells as `(room=arena|tavern|embassy, cell, event{author,lamport,value})`; keeper demoted from coordinator to just another peer; tavern letters become `set()` events witnessed by the mesh instead of GitHub-comment writes.

### ropesight @ d8b1bb4 — the sleeper hit of the wave
- **Concept:** change-ringing as fleet coordination: a method = fixed list of adjacent-transposition changes; every lane holds its OWN frozen copy of the public token list + own position + own stroke counter and **never reads the global row**; one shared pulse (synchrony) is the only channel; the tower records arrivals, never instructs. Charter-of-record = the seed, and "every experiment must carry its decision rules as receipts dated BEFORE the run" — our own discipline, independently derived.
- **What ran:** `smoke.mjs` 3/3; `experiments/e_rs1_rope.mjs` exit 0 — R1 PASS (Plain Bob periods 6/40/60/84/112 all as expected, maxMove ≤ 1), R2 PASS (cover uniform: every bell occupies every position exactly 2(n−1) times per course), R3 MIXED with **honest negatives** (own-rope anomaly fires on far moves only — near deviations are rope-silent to their owner; two conspiring deviators are fully silent 155/900 samples), R5 PASS (byte-identical determinism ×20, local==global 18/18 runs), receipt chain 10 links tip `0x5977ae836fb7efec`.
- **Hands-on experiment (exp3):** method schedule (Plain Bob Minor 60-row course via THEIR algebra) vs 60-row cyclic round-robin as arena lane-assignment schedules, n=6. **The method schedule covers all 30 ordered "who-follows-whom" pairs with EXACTLY 10 meetings each (max/min ratio 1.0, max wait between meetings 9 rows); round-robin covers exactly 6 pairs forever (50 meetings each).** Turn-fairness (lead-position) TIES with round-robin at M=37. My P-R4 RR model was honestly falsified (see verdicts table).
- **Verdict: MATTERS-FOR-US** — a method is a **zero-coordinator lane-rotation policy that guarantees universal, perfectly-balanced pairwise encounters with bounded wait**, from a per-lane static token list. That is a fair-rotation policy for arena turn/pair assignment no round-robin can express (RR cannot diversify pairs at all).
- **Adoption sketch:** crab-traps scenario pairings and tavern seat rotations as `plainCourseTokens(name)` walks (their file is dependency-free ESM, drop-in); a "bob" call = a registered mid-run rule change — maps exactly onto a scenario mid-run perturbation with the rule change public BEFORE ringing (their law: calls baked into the lane's token copy in advance).

### loom-core @ bf7860f — the Divergent Logic Foundry, standalone
- **Concept:** GAN over logic itself: breeder (3 voices: mech templates / sysone / systwo) vs forge (adversarial probe vector grown from scar tissue, twin-mining where elites disagree, rare-answer mining), selection = MAP-Elites on composite novelty, every generation booked into an fnv-1a-64 witness chain. Product = **an archive of maximally-divergent, proven-correct implementations** of one pure-function contract; every dot of disagreement between elites marks a boundary of understanding.
- **What ran:** `npm test` 6/6 (born-correct sweep, sheet reflexes, chain verify 18 links, archive books elites); `bin/loom.mjs run examples/witness-fnv.mjs --gens 12 --seed 7` exit 0 (receipt file): 96 candidates, **mimic=92 (96%)**, crowns=4 all **gen 1**, families=3, witness chain **VERIFIED (108 links)**, all crowned elites born-correct.
- **Verdict: MATTERS-FOR-US (adopt first)** — see "adopt first" below. Cross-check: quilt-mesh's DRIFT.md quantifies the saturation law (all 10 targets crown in the first half, late-half entropy 0) — my fresh 12-gen run reproduces it (all crowns gen 1). Adoption must therefore budget generations (or add sysone/systwo voices) rather than assume more gens = more novelty.
- **Adoption sketch:** `defineContract` around (a) crab-traps judge extractors and lure-detection predicates — the forge's adversarial probes are exactly the hardening the naive verifiers lack; (b) qthe kernels — the archive of divergent-but-equivalent implementations doubles as a differential-testing oracle for E-Q-class questions; (c) the bred lures plug directly into SCN-003's registered live-GAN half.

### mavis-substrate-walker @ 808f0d3 — the smallest protocol that could be the fleet's receipt grammar
- **Concept:** substrate-agnostic walker with exactly three primitives: **STITCH** (load substrate + save back + witness the act), **WITNESS** (record observation, receipt, chain to parents), **PROMOTE** (graduate receipts to a canonical tier). Doctrine line worth keeping whole: *"The walker is performative, not representational — there is no model of a walked substrate, only the act of walking, captured in witnesses."*
- **What ran:** venv + `pip install -e .`, quickstart reproduced **exactly as advertised**: `walk-dict '{"a":1,"b":2,"c":3}'` → 6 witnesses, 1 finding, chain OK True, last hash `bb7329737e516240`; `run_tests.py` **15/15 passed (0 failed)**. Zero deps beyond stdlib.
- **Isomorphism check (desk, the registered concept-to-test):** tavern→embassy→seal ≅ STITCH→WITNESS→PROMOTE. Tavern round = STITCH (load the substrate of prior rounds/receipts, run, save back); embassy letter = WITNESS (observation receipted, chained to parents = quoted prior receipts); keeper seal/push = PROMOTE (graduate the thread to canonical tier). The isomorphism is real **but ours lacks their two load-bearing details**: (1) every step witnessed with parent-chaining (our letters cite, but there is no enforced parent chain), and (2) an explicit `verify` command over the chain. Formalizing buys: one receipt grammar + one verify command uniform across qthe / crab-traps / fleet-seeds, and promotion becomes a checkable state change instead of a social one.
- **Verdict: MATTERS-FOR-US (cheap, structural)** — adoption cost: LOW (stdlib-only, 3 primitives, existing stone-v1-shaped chains already carry the hashes).

### micrograd-quilt (desk + two-file hands-on probe, no clone)
- **Concept:** karpathy's micrograd kept byte-for-byte, plus: every `Value` carries a hidden **exact rational twin** (`fractions.Fraction` of the float = its exact binary expansion); float is the fast path, the twin is the exact shadow; an auditor samples ~1/√N of live nodes per pass (sink always promoted) so drift auditing costs O(√N) instead of O(N).
- **Hands-on receipt (engine.py + auditor.py fetched via API, both parse, both load):** `with mode("exact")`: twin(0.5) = `Fraction(1,2)`; mul/add/tanh chain resolves to exact `Fraction(-897729486907431, 9007199254740992)` matching float to <1e-15; backward produces an exact rational gradient (`grad_twin(a)` = 48-digit exact Fraction). The twin machinery is real and works as the README says.
- **Verdict: MATTERS-FOR-US (qthe directly)** — this is the same law qthe's exact-arithmetic chains live under, with two things we don't have: the **√N stochastic audit budget** (exactness you can afford at census scale) and the **promote-the-sink rule** (the output node is always checked exactly). Adoption sketch: an E-Q "audit mode" that shadows a chain with Fraction twins on a sampled subset + always the sink, registering drift-per-op statistics as a companion to the fixed-kernel work.

### quilt-blueprint @ a7b27c0 — compile-time CRDT law + the refuse-to-generate test
- **Concept:** GraphQL-shaped schema in → byte-exact fixed-offset memory layouts + monotonic join operators out, no runtime. `@join(max)` on a `seq` field = semilattice-safe by construction; `@join(xor)` flagged FINGERPRINT CLASS ONLY (flag, never content); varlen lives outside the fixed block. Born from a verdict that separated the real "已落地" ideas from costume jewelry — and the tests "assert what we REFUSE to generate."
- **What ran:** `tests/test_blueprint.mjs` **67/67 green**; `tests/test_wal_export.mjs` 16/16 green, 2 skipped (quilt-doctor absent — clean skip with reason).
- **Verdict: WATCH (one idea to steal now)** — the **refuse-to-generate test class** (pin what the compiler must never emit) is directly adoptable in fleet-seeds VC envelope work and qthe codegen; the fixed-offset + monotonic-join discipline is the right shape for any byte-exact wire format we ever pin.

### quilt-silicon @ 83b2e4b — the SIMT mapping, receipted
- **Concept:** instance→SM, shape→warp (1 thread = 1 token), ledger=warp reduction, gate=warp ballot, journal=coalesced write. "Sampling changes the LOG, never the EXECUTION."
- **What ran:** `smoke.mjs` 3/3; `experiments/smoke_silicon.mjs` **43/43** — including checkpoint replay bit-equals continuous run (8+8 == 16 across all regs × 32 lanes × 2 warps) and the log/execution separation pin.
- **Verdict: WATCH** — the journal-sampling law (sample the log, never the execution) is the pattern our own runners should copy when outputs get big.

### quilt-rips @ 1e9911c — heavy science behind a 5-opcode receipt cell
- **Concept:** GUDHI persistence pipeline wrapped as BIND/LINK/EFFECT/VIEW/TICK quilt cell with hash-chained receipts — "the barcode is already shaped like a ledger; we just seal it."
- **What ran:** fresh venv, gudhi+numpy+pytest installed, **9/9 tests passed (0.40s)**.
- **Verdict: WATCH (pattern, not tool)** — the *seal-the-heavy-dependency-behind-5-opcodes* pattern is the reusable idea: any GUDHI/AstroPy-class library becomes fleet-usable when its outputs are stone-shaped and replayable.

### quilt-cell-harness @ b41966d — evocative architecture, thinnest runnable core
- **Concept:** cell as engine-with-compartments (LLM one substrate among many), PTO surface, genetic weights as negative-space constraints, routing-by-resonance, crystallization of hot temporary compartments, `defuse()` reveals the network only after the run.
- **What ran:** `python3 cell.py` demo exit 0 (crystallization trace + canary `148024d4fff68471`); no test suite exists (0 test functions).
- **Verdict: WATCH (concept only)** — PTO and `defuse()` are worth stealing as vocabulary for our cell design docs; nothing here to run in anger yet.

### Desk-only notes (no clone — README/API triage)
- **elephant** (Python, 46MB): subjective JEPA vs zeitgeist — rooms as fields with per-model vibe dials. NOT-OUR-TOOL today (needs models/data); revisit if arena ambience ever becomes a registered variable.
- **quilt-esp32** (no_std Rust, desk-only per lane law — no cargo in sandbox): quilt on a $3 chip, hardware-verified blink 2026-08-26, 2/2 badge, browser-simulated board. WATCH — the `.qm` compiled rule table driving hardware with no cloud is the fleet's smallest viable vessel.
- **quilt-learn** (JS, desk): L1 gradient proof 8.17e-10, twin equivalence 1.67e-16, 35-row witness chain, one MOTH harvest per run — the learning-sheet trinity overlaps loom-core's L3; clone priority lost to the cap. WATCH.
- **ability-transfer** (C, desk): documented multi-model ISA-design debate artifact (The Forge → FLUX ISA v3). NOT-OUR-TOOL — a process receipt, not a system.
- **quilt-i2i** (Erlang/Forth/Prolog, desk): "each language's constraints make a different cell" — the doctrine is the concept; erlang absent from sandbox so the cells are unrunnable here. WATCH (doctrine note only).

---

## Top-5 novel concepts that matter (ranked)

| # | Concept | Source | Evidence this wave | Where it lands for us |
|---|---|---|---|---|
| 1 | **Method schedules as coordination policy**: adjacent-transposition permutations give universal, exactly-balanced pairwise coverage with bounded wait, executable by lanes holding only a static token list + own position | ropesight | 30/30 pairs × exactly 10 meetings vs RR's 6 pairs; local==global byte-identical 18/18; deviation taxonomy with honest blind spots | crab-traps arena pairing/turn policy; tavern seat rotation; any "everyone works with everyone, fairly, with no coordinator" schedule |
| 2 | **Born-correct archive: adversarial breeding of maximally-divergent correct implementations** (GAN over logic; forge scar tissue = probe coverage; MAP-Elites archive = the product) | loom-core (+ mesh DRIFT saturation law) | 6/6 smoke, 12-gen run: 96 cands, 92 mimics, all crowns gen 1, chain VERIFIED 108 links | crab-traps naive verifiers hardened by bred lures (SCN-003 live half); qthe differential oracle; forge probes as a registered metric |
| 3 | **Exact-twin shadow + √N stochastic audit**: float fast path, Fraction twin = exact binary expansion, sink always promoted exactly | micrograd-quilt | hands-on: exact Fractions through mul/add/tanh + exact rational gradient; both files load standalone | qthe exact-arithmetic chains: affordable exactness audit at census scale (E-Q companion instrument) |
| 4 | **Peer-to-peer cell sync without a broker — with the granularity law**: rooms + Lamport + (author,lamport) dedupe converge in ≤2 gossip rounds at 3 peers, but ONLY if anti-entropy tracks per-author (scalar ack = permanent divergence, 0/20) | quilt-mesh (Rust sketch) + my ported battery | 20/20 converged (sound variant), zero lost updates, causal clocks; faithful full-dump 20/20 at 1.58× wire; scalar variant honest FAIL | crab-traps arena cells sync peer-to-peer; tavern letters as mesh events; keeper demoted from coordinator to peer |
| 5 | **STITCH/WITNESS/PROMOTE as the fleet's receipt grammar**: performative walking, parent-chained witnesses, tier promotion as a checkable state change | mavis-substrate-walker | 15/15 tests, quickstart exact (6 witnesses, chain OK) | fleet-seeds: uniform witness-chain shape + `verify` across qthe/crab-traps/tavern/embassy; our tavern→embassy→seal pipeline formalized (isomorphism confirmed, two load-bearing details missing on our side) |

Runners-up: refuse-to-generate tests + compile-time semilattice joins (quilt-blueprint, 67/67); sample-the-log-never-the-execution (quilt-silicon, 43/43); seal-the-heavy-dep-behind-5-opcodes (quilt-rips, 9/9).

## Adopt first, and why

**loom-core's forge against crab-traps' naive verifiers — bred lures before hand-written B1/B2/B3 extensions.** Reasons: (1) it is the only adoption that turns a registered fleet plan (SCN-003's live-GAN half) into an armed one with zero new infrastructure — the foundry runs offline, deterministic, zero keys; (2) the forge's probe vector is *accumulated adversarial pressure*, which is precisely what hand-written lure families cannot be (they encode what we already imagined); (3) the archive's disagreement dots give crab-traps a *registered boundary map* — every place two born-correct verifiers disagree is a place a judge extraction can be silently wrong (cf. 41-e's strict-parse finding: the deep-scan fallback existed exactly where no twin disagreed loudly enough). Second adopt: ropesight's `plainCourseTokens` as the arena's pairing schedule (one dependency-free file, the fairness law is now measured, and P-R4's honest FAIL tells us exactly which property to claim: pair diversity with bounded wait, NOT lead-count fairness). Third: mavis's parent-chained witness grammar for fleet-seeds receipts, so embassy letters become verify-chained WITNESS rows instead of prose.

## Honest limits

- quilt-mesh's CRDT identity is a Rust sketch — my convergence numbers are for a faithful JS port of their semantics (their harness-claims, my harness), not their compiled code; no cargo in sandbox per lane law.
- micrograd-quilt hands-on = two fetched files + inline probes (no clone): engine twin machinery verified live; the auditor's full row-dump pipeline was NOT exercised end-to-end (their internal row format un-reversed in budget).
- clone cap (8) left elephant/quilt-learn/ability-transfer/quilt-i2i/quilt-esp32 desk-only; quilt-learn's v2 receipts are README-claimed, not reproduced here.
- exp2's conflict-gap probe observed 0 same-lamport ties in 20 sims — the sketch's value-resolution gap remains desk-level, not measured.
- All engine/ vendored code in quilt-mesh is SuperInstance/quilt (Apache-2.0) per NOTICE; nothing here implies foreign writes — zero pushes to any repo except fleet-seeds `playtest/wave43/` below.
