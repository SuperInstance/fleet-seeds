# PLANNING — the long arc (living document, refined between rounds)

Owner: keeper (main Super Z) · Cadence: refined after EVERY wave (append a `## Round N refinement` block; never delete history).
Test of any objective: does it produce a **real, useful, stranger-verifiable artifact** (tool, receipt chain, registered experiment verdict) within a wave or two — and does the stone standard survive it?

---

## Mission (unchanged)

An honest, self-verifying fleet: every claim pre-registered before it is tested, every artifact stranger-verifiable (JCS RFC 8785 + W3C VC 2.0 + stone chains + transparency-log anchors), every failure preserved verbatim, every gift framed with zero asks, pricing-first for all gifted compute.

## Instruments inventory (what exists, where)

| Instrument | Location | What it proves |
|---|---|---|
| verify-fleet (4 chains + rekor fold) | fleet-seeds tools/ | the interop web is intact, one command, exit 0 |
| truncate-audit (power-yank) | fleet-seeds tools/ | every chain fails closed at every byte offset |
| wal-conformance (wal-edl) | fleet-seeds tools/ | chains speak recover-to-prefix / apply-nothing semantics |
| mothbits whitening | fleet-seeds tools/ | raw bits → whitened registered randomness (KAT byte-exact) |
| moth-census | fleet-seeds playtest/wave45/moth-census/ | maps the live moth engine surface (32 engines) |
| witness-grammar (mavis adoption) | fleet-seeds playtest/wave44/witness-grammar/ | parent-chained receipt grammar + verify CLI |
| exact-twin audit (micrograd-quilt) | fleet-seeds playtest/wave44/exact-twin/ | float artifacts have exact rational twins |
| pairing schedule (ropesight) | fleet-seeds playtest/wave44/pairing/ | fair-rotation pairing, ratio-1.0 coverage |
| forge bridge (loom-core→SCN-003) | crab-traps worker/scripts/ | bred adversarial lures for verifier chambers |
| pong49 scorer | fleet-seeds embassy/battery/ | registered battery scoring w/ premature-guard |
| VC envelope + rekor anchor | fleet-seeds embassy/ + live rekor entry | signed fleet checkpoint, transparency-anchored |

## Objectives roadmap

### Near arc (waves 46–50) — "make the live seats real"
1. **SCN-003 live-reasoner verdict, take 2** — deepseek-chat seat (answers fine at 2000 tokens; round-11 proof) vs forge-bred mimics; the first REAL live-GAN chamber D-score. Kill criterion: if the chat seat also starves, chamber stays synthetic-only and we receipt why.
2. **Certified sampling service** — `tools/moth-seal.mjs`: registered random seeds with comet-qrng-v1 certification receipts (min-entropy cert + device fingerprint + commitment) for ANY lane's pre-registration; retire raw-graph+whitening to fallback status. First registered consumer: E-Q11 or round-12.
3. **E-Q11** — the guest's parked levers in order: (a) closed-form A+D collapse-set predicate, (b) cascade terminal semantics. Guest-owned numbering; discharge like E-Q10.
4. **Witness grammar rollout** — wire playtest/wave44/witness-grammar/verify.mjs against every existing chain we own (qthe stone chains, tavern ledgers, crab-traps receipts): one more cross-check layer, receipts committed.
5. **Tavern round-12** — fold round-11's 6 rows into the main tavern ledger; blind prior asked ASSET-FREE (round-11's was designed-contaminated by the r9 asset); continue posterior dynamics with reasoner + chat seats.
6. **Embassy sweep every wave** — pong#49, moth-runner#2, jeviter#16 replies; inbound merges receipted; pong49 scorer fires after 2026-09-29T10:04Z.

### Mid arc (waves ~51–60) — "hardening + gifts that land"
7. **Two-reader rule for every chain** — each of our chains verified by tooling living in ≥2 different repos (kill single-repo verification monoculture).
8. **Tombstone gift for superinstance-advisor** — reference implementation fixing the FORGET("witness") no-tombstone audit hole; staged letter (repo issues-off).
9. **jeviter P2** — score jeviter-await on first fix landing (standing).
10. **Rekor anchoring cadence** — anchor one fleet checkpoint per arc into rekor (ECDSA path); consider the staged upstream Ed25519ph issue when a channel exists.
11. **Experiment registry** — one indexed place (registry.json, stone-chained) listing every pre-registered prediction set across repos with verdicts + Brier scores; stranger-auditable in one fetch.

### Long arc (waves ~60+) — "the fleet runs itself honestly"
12. Certified-randomness becomes the DEFAULT seed source fleet-wide; unwhitened runs are the exception requiring justification.
13. Every new fleet repo born with: witness grammar + truncate-audit + verify-fleet hooks from commit one.
14. Cross-agent chamber: other agents' verifiers face our forge-bred lures (gift-framed), ours face theirs — shared boundary maps.

## Kill criteria (honesty rails — non-negotiable)

- Any prediction registered after its result → registry entry VOID.
- Any verdict without raw receipts on disk/repo → VOID.
- Any metric that silently changes definition mid-series → VOID + correction receipt.
- Whitening skipped where required → result quarantined (raw+whitened both receipted).
- Spend without per-call usage receipts → VOID. Budget cap per lane: $0.05.

## Round log (refinements appended below)

### Round 45 (baseline)
Five lanes landed: round-11 (noul law transfers to real LLMs, 3 houses within 0.02), E-Q10 (C5' stands, kernel 9/9), SCN-003 live-reasoner (honest starvation KILL — token economics, not signal), truncate-audit + wal-conformance (fleet verifier hardened), moth census (32 engines; comet-qrng-v1 certified QRNG discovered). Incidents receipted: .env + worklog silent clobbers (append-only rule adopted), TYPESAFE key lost, inbound cross-poll merge (306f97e) recorded.
**Refinement into 46:** near-arc items 1–5 become wave-46 lanes; certified sampling (item 2) pulled EARLIER than planned — comet-qrng-v1 makes registered seeds strictly stronger than whitened raw bits, and every later item consumes it.

### Round 46 refinement
Near-arc items 1–5 ALL landed in one wave: (1) SCN-003 live chat seat D=0.9787 SURVIVE (96/96 answered; within 0.0005 of synthetic — "the separator is the CLAIM" confirmed with a real LLM); (2) moth-seal certified sampling service 5/5 (comet-qrng-v1 default; CHSH-certified bits; first consumer seal [6,1,5,3]); (3) E-Q11 DISCHARGED 8/8 (Brier Q1..Q8 0.009775) — **the 90.67% is a proven set**; the independent reasoner's derivation (Q9, AS SAID) recovered only the dyadic subset — the A-class is genuinely non-obvious; (4) witness rollout 8/8 chains, rollup tip 6e4cdb8f…; (5) round-12 + ledger fold — blind prior 0.35 vs receipted 0.97 now MEASURED.
**Refinements into 47:** (a) mid-arc item 7 (two-reader rule) starts now — every new chain gets a second-repo verifier; (b) E-Q12 = cascade terminal semantics (guest's second parked lever) + A-class under k≠1 coupled families; (c) round-13 continues posterior dynamics with the certified-seed registration flow end-to-end (moth-seal → pre-registration → run → witness receipt); (d) SC to watch: pong49 window closes 2026-09-29T10:04Z — scorer fires at the next seal after that; (e) infra: lane dispatch flakiness is high (3/5 deadlines this wave; all had pushed pre-death) — the resume-first rule (check disk/remote before re-running) is now standing law for the keeper.

### Round 47 refinement
Two lanes, both killed by dispatch flakiness and both finished by the keeper (resume-first law held): (1) **E-Q12 DISCHARGED 10/10** (Brier P1..P10 0.00167) — the float-collapse set is NOT k-invariant under odd scaling: 3,546 flips sealed (LOST 2,462 / GAINED 1,084), fixed plane exactly k-invariant, powers of two invisible, per-k closed form D_k exact for all k, 7/10 dies at the 9-scaled tuning; cascade half re-parked with committed-byte receipt. (2) **Two-reader rule installment 1**: 8/8 chains independently verified from crab-traps by a walker written from the stone-v1 law (zero shared code).
**Refinements into 48:** (a) E-Q13 = flip-registry structure (2,462/1,084 asymmetry vs binade map) OR cascade remnant formulation — guest's pricing decides; (b) round-13 end-to-end on certified seeds (moth-seal -> registration -> run -> witness receipt); (c) two-reader installment 2: qthe-side reader for crab-traps' own chains (bidirectional); (d) advisor tombstone gift build; (e) pong49 scorer fires at the first seal after 2026-09-29T10:04Z — wave 48 or 49 depending on timing; (f) infra: dispatch flakiness is now ~50% — lanes must push registration FIRST (they do), and the keeper plans smaller waves until it clears.

### Round 48 refinement
**GPU arc adopted (principal directive):** the principal asked what an agent with a GPU could do with all our systems. Scout report + 7 web searches receipted (`scouts/2026-09-28-gpu-agent-workloads.md`, raw JSON in `scouts/raw/`); work catalog landed as `docs/GPU-AGENT-PLAYBOOK.md` — seven items G1–G7: G1 local JEV/arena seat (no token ceiling — attacks the 45-c starvation limitation directly), G2 GPU determinism audit harness (power-yank ported; PyTorch bitwise gaps are the product), G3 quantization-erosion curves vs exact twins (exact-twin × E-Q10; novel — nobody publishes monotone re-erosion in bit-width), G4 certified-seeded Monte Carlo at 10^9 (graph-v1 truncation-bias-vs-N is a registered scale prediction), G5 local lure forge, G6 E-Q10 injector law on GPU hardware (literature channel receipted JUNK — first-principles registration with disclosure), G7 watt-receipts (pricing-first now covers GPU-hours/watt-hours; adopted immediately as a gating requirement). Wave slots: 48–49 G7+G1+G4-design; 50–51 G2+G3; 52+ G5+G6.
**Infrastructure receipt (incident #3, environment regression):** this sandbox rolled back to a Task-24-era snapshot — local worklog.md truncated to 611 lines (tail = Task 24), .env reduced to DATABASE_URL again, all local clones gone. Remote is the source of truth and is AHEAD of the last local record: waves 46–47 had already landed and pushed (fleet-seeds 0179997, crab-traps 37c34bb incl. 46-a live CHAT seat D=0.9787 SURVIVE, qthe 0c36dd2 incl. E-Q11 8/8 and E-Q12 10/10). Recovery: fresh clones; MOTH_KEY survived on disk (scripts/quilt-lab/moth_key.env); DEEPSEEK key restored from session record; **GitHub push token is NOT recoverable from this snapshot — all wave-48 commits queue locally until the principal re-rolls the fleet token.** Pong49 window (closes 2026-09-29T10:04Z) not yet open at seal time.
**Wave-48 lanes:** 48-a (keeper) GPU playbook + scout + this refinement; 48-b dispatched — two-reader installment 2, qthe-side reader for crab-traps' own chains (per 47-refinement (c)); E-Q13 awaits guest pricing; advisor tombstone gift (d) next wave; round-13 certified-seed flow (b) next wave.

### Round 50 (2026-09-28) — the living JEV: jev-garden
Principal directive: build the ultimate JEV model training system, quilt-native — grows as it's used, idle-compiles its exoj into tools for the next inferencing; "kinda both" vector-embedding and torch; beyond the pincher reflex. Lanes: deep research (50-a), build (50-b keeper), codespace idle-compute (50-c).
**Landed:** SuperInstance/jev-garden @ c2faea6 (and rolling): ExoJ-compatible rhizome (ledger policy, observations are the only collapses), three-substrate bake-off (qthe 8-bit ternary / hashed-features SGD torch-free / rhizome retrieval), idle weaver with PROMOTE/REVIEW/DISCARD gate (jeviter lifecycle), systemone-wire local judge with teacher escalation (typesafe jev-latest, usage-receipted), qcells adapter on the REAL 16-ledger soil. Sealed pre-registration with 3 dated addenda; fail-closed seals (sha+size+mtime-to-second; cross-language ns precision receipted).
**Verdicts of record:** P-G1 PASS (hash 96.14 > field 89.58; beats bigram +3.09pp), P-G2/G2b/G2c FAIL ×3 (ensemble/memory-prior refuted on saturated soil — the honest crown of the wave), P-G3 PASS (compile 636ms, serve 0.056ms), P-G4 PASS (AUC 0.9294), P-G4b PASS (AUC 0.9539; JEV judges semantics, chain judges structure — delegation doctrine), P-G5 PASS (JS⟷Python byte-identical weave, integer micro-units + epoch quantisation), P-G6 PASS (teacher noul 0.70, usage receipted). Pipeline lesson: the Python twin caught a cross-ledger context leak before it shipped (the twin earned its keep).
**Refinement into 51:** (1) P-G2d hard-world registration — memory-priors should pay where the head is weak (mask channels, novel-family shards); (2) weave-2 carries the rhizome sense-table (serve reads rhizome prior from the weave, closing the kinda-both loop at serve time); (3) codespace idle-compile as a recurring lane (repo-scoped create endpoint — user-scoped 422s, schema tightened since wave 49, receipted); (4) quilt-jepa round-2 design laws feed the salience channel (surprise → Δ deformation); (5) garden serves qcells: next-ledger drift judgments as the first customer deployment.

### Round 51 (2026-09-28) — the hardness law (two substrates, one finding)
Principal: "continue." Incident #5 receipted (.env bare again; append-only restore, all 4 credentials live-verified; typesafe teacher seat re-probed — jev-latest responded noul 0.69 vs wave-50's 0.70 on the IDENTICAL probe: one-tick jitter at the PASS threshold, boundary-case receipted, thresholds on hosted judges need tolerance bands).
**Landed:**
(1) quilt-jepa round 2 (waves 49-b's three design laws, finally executed): registration-v2 sealed pre-run (seal-tool v1 bug receipted — TO_BE_SEALED placeholder silently no-oped the mask; first run VOID, tool fixed, receipt regenerated byte-identical, tip 985f32278e75…). Verdict 3/6 (R2 EMA 1.08e-4, R4 determinism incl. regeneration==restoration, R5 mesh 1.97e-8; R1/R3/R6 FAIL). Post-verdict diagnostics overturned the round-1 diagnosis: the failure is at the OPTIMIZER layer, beneath world/detector/corruption — gradients divided by N=1024 pre-clip (effective step ~1/500 intended), entry loss is world-independent (2.9% delta, init-mismatch driven), corr(pred,tgt)=-0.26 makes even ZEROING top-impact cells loss-neutral (jump 0.95). Round-3 laws registered in verdict-v2.md: L1 optimizer-first sanity gate, L2 world-probe difficulty meter, L3 corruption gated on learned prediction structure.
(2) jev-garden P-G2d (wave-50's queued fix): 4 ladder-echo ledgers built by the real qcells machinery (686 rows, chain-verified, construction receipt BEFORE registration — no outcome peeking), P-G2d registered under seal v6, executed under v6: **PASS** — hardness gate HELD (head 73.47% < 0.90), ens3 86.88% = head + 13.41pp over 343 rows, λ*=0 everywhere (optimal blend was ALL fresh watched-memory). Wave-50 arc closed: archived priors never transfer (G2/G2b), fresh memory is worthless on easy soil (G2c), fresh memory on hard soil is the organism (G2d).
**The unified law (both substrates, same day):** hardness is the gating variable for every emergence claim; it must be measured by PREDICTION accuracy on held-out structure, never by loss floors or entry statistics; and a starved optimizer is misdiagnosable as a world property.
**Refinement into 52:** (1) quilt-jepa L1 optimizer repair (per-latent gradient normalization) as PRECONDITION, then re-register R1/R3/R6 on the repaired core; (2) hardness-aware grow() in the garden — deform harder where the head is weaker (P-G2d's shift family as the standing hard-world test set); (3) weave-2 sense-table carries the rhizome prior at serve time (P-G5 twin discipline); (4) G7 watt-receipt schema + G1 local-LLM seat spike (GPU playbook slots 50-51); (5) pong49 scorer fires at the first seal after 2026-09-29T10:04Z — wave 52 opener; (6) E-Q13 + round-13 certified-seed flow still await guest pricing.
