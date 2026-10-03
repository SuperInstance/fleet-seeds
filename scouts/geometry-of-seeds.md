# The Geometry of Seeds — a cross-repo law synthesis

- **Task**: 66-e (research/archaeology lane, SuperInstance fleet) · **Date**: 2026-10-03
- **Agent**: general-purpose subagent, autonomous; research only, no product code
- **Method**: read READMEs, DESIGN/spec files, quest-logs, verdicts and receipts across 22 local repos (deep on ~14, skimmed the rest); extracted the shapes that recur *independent of language and domain*. Every claim carries a file receipt (repo + path). No line counts were harmed; the LAWS were read, not the LOC.
- **Relation to prior art**: this is the law-level companion to two existing artifacts — `fleet-seeds/docs/SEED-TOOLKIT.md` (wave 66: ten *structural* primitives — point, step, metric, snap, occupancy, link, effect, tick, flatten, seed) and `fleet-seeds/docs/PREREGISTER.md` (wave 67-c: the *seal/gate* primitive distilled from 7 hand-rolls). Where the toolkit catalogs the nouns of the genetic code, this document catalogs the *regulatory genes* — the organism-level laws that keep expressing themselves in new tissues. Its key finding is that **one more gene has already been deliberately consolidated (seal/gate → `tools/preregister.mjs`) and the rest have not** — the missing-organs list in §3 is the queue of genes awaiting their `preregister` moment.

---

## 0. Executive summary

Across ~35 named repos built in different languages for different domains (TTRPG engines, quantum simulators, MCP servers, Cloudflare Workers, stream iterators, MUD reefs, world models), **the same small set of shapes reappears**. Seven are settled here, each with an invariant every implementation shares and a variation axis along which implementations genuinely differ:

| # | axis (the gene) | the invariant (what makes it THAT shape) | carriers |
|---|---|---|---|
| 1 | **The Chain** — hash-chained receipt/ledger | append-only; canonical-JSON; every row re-derives from genesis; tamper fails closed *by name* | 10+ (§1.1) |
| 2 | **Rewind + sticky scars** | the past is a navigable dimension; wounds survive recovery | 6 (§1.2) |
| 3 | **Deadband / autopilot** | compiled habits run at zero thought until the world leaves the envelope; the breach teaches | 5 (§1.3) |
| 4 | **Composer / judge split** | generation and adjudication sit in different seats; the judge never co-signs | 8 (§1.4) |
| 5 | **Soft joints / lookup tables** | decide by table where proven, keep the last joint deliberately soft | 6 (§1.5) |
| 6 | **Organ / nesting** | systems contain systems; every crossing keeps balanced books | 6 (§1.6) |
| 7 | **Platonic randomness** | fate is deterministic *from provenance* — re-derivable forever, honest on re-spin | 7 (§1.7) |

The single most load-bearing observation: **axis 1 is not just one gene among seven — it is the genome's storage medium.** Every other law is *expressed as rows on a chain* (scars are sticky receipt kinds, breaches are sticky ops, rewinds are compensating host receipts, dice are functions of the tip). The DNA metaphor is literal here: the chain is the chromosome; the other six are genes the chromosome carries.

---

## 1. The seven axes, with receipts and variants

### 1.1 The Chain — the hash-chained receipt/ledger law

**Invariant**: append-only store; hash over canonical JSON; row *n* binds row *n−1*; the whole history re-derives from genesis; every failure mode has a stable grep-able name; verification is re-derivation, never trust.

| repo | receipt | variant | what varies |
|---|---|---|---|
| quilt-mcp-receipts | `DESIGN.md` §2–§5 (dialect `qmr1`: five fields, `id = SHA-256("qmr1:"+seq+":"+prev+":"+canonicalJSON(body))`, named `E_*` codes) | **the memory organ** — chain as fleet recall/commit/self-audit over MCP | signer = shared HMAC secret (v2 path: Ed25519 per-agent, landed as v3 in `receipts/69b-death-audit.md`) |
| quilt-jev-toolkit | `README.md` ORGAN BOOT v0 invariants I1–I5, fail-closed rules (`RECEIPT_HASH_MISMATCH`, `CUSTODY_GAP`, `REPLAY_DIVERGENCE`…) | **the custody organ** — chain as *proof of custody*: boot is a courtroom, `boot == replay` | what the chain certifies (state, not just history); checkpoint signatures make custody conditional |
| quilt-organ-workers | `README.md` §"THE canonical dialect" (`quilt.organ.manifest/v1`, receipt law `hash = sha256hex(canon({seq,op,prev}))`, L15 unification receipt `receipts/DIALECT-UNIFICATION.md`) | **the hosted dialect** — one registered schema string, server-derived content addresses, legacy dialect deprecated-but-accepted | who is the sealing authority (server, not client) |
| MicroMoth-quilt | `README.md` ("every gate a BIND cell…"), `tools/collapse_ledger.py`, `docs/CELL-MAPPING.md` | **domain transposition** — a quantum circuit *is* a ledger; collapse is an event, not a state | what one row means (a gate / a collapse event) |
| quilt-qcells | `README.md` + `verdict.md` (P1–P4 PASS; **4254/4254 single-byte tampers localized to the exact row**) | **the tamper-proving ground** — exhaustive negative control as the chain's credential | verification depth (exhaustive byte-level attack, not spot checks) |
| erised-sequencer | `engine.mjs` (sha256 beat chain; `README.md` law table S5: tamper refuses by name `RECEIPT_HASH_MISMATCH`) | **the narrative chain** — every beat of a story is a receipt | domain (fiction), plus dice bound into the same chain (§1.7) |
| jeviter | `README.md` ("Every silence is booked"; ledger fnv1a-64 pinned to canary `fnv1a64("café Δ 日本語") === 0x24a555471370b18d`) | **the silence ledger** — the chain records *absence* of events, so a quiet stream is auditable, not a hang | row = a non-event; hash width 64-bit with a cross-repo canary |
| crab-traps | `worker/src/edge-ledger.ts` header comment ("Chain rule (cell-ledger.md §4)… the relay is the sealing authority") | **the reflex arc** — per-cell chains on D1, double-entry edges (`before/after/imbalance`), limb never blocks, brain never listens | authority concentration (relay seals so producers can't guess canonicalization) |
| qthe / quilt-jepa | `qthe/SPEC.md` §"The fleet's additions" (stone-v1 chains); `quilt-jepa/README.md` ("receipts are stone chains… moth-seal minted seed") | **the experiment seal** — trace hashes of a run, sealed pre-registration | the chain wraps an experiment, not a system |
| fleet-seeds | `lode/registry.jsonl`, `lode/lessons.jsonl` (16+16 rows) — *named by* `quilt-mcp-receipts/DESIGN.md` §1 as the live **not-yet-chained** ancestor: "a rewritten line is detectable only by humans" | **the honest ancestor** — append-only culture before hash linkage | this is the *before* picture; the organ exists to add exactly the missing instrument |

**Variation axis** (what actually differs between implementations): hash width (sha256 vs fnv1a-64), signer (shared HMAC → per-agent Ed25519), what a row binds (an op, a state, a silence, a die, a collapse), who re-derives (client, server, hourly cron, stranger, exhaustive tamper harness), and which domain's *time* the chain total-orders. The invariant survives every substitution — which is the evidence it is one gene, not a habit.

### 1.2 Rewind + sticky scars — time as a dimension, wounds that survive recovery

**Invariant**: any past state is exactly recoverable (scrub/stateAt); going back does not erase what happened *to* the system; some markers are declared sticky and no cleanup can remove them.

| repo | receipt | variant |
|---|---|---|
| erised | `README.md` §Scars: "Rewind drops the round, but **the scar persists**"; `QUILT.md` maps `addScar()` to `BIND` | the original statement — character wounds as first-class state |
| erised-sequencer | `README.md` laws S4 ("rewind unwinds the future; scars survive"), S3 (`stateAt(k)` exact at every prefix), S7 (past replays identical, future re-rolls) | the mechanized statement — scars as ledger-pinned ops, rewind as pure fold |
| erised-fleet-table | `README.md` laws T3/T3b; `quest-log.md` insight 2 ("The scar law is fleet-operational, not narrative") | the fleet statement — scars proposed as `incident.scar` sticky receipt kind for *incidents* |
| erised-exocortex | `DESIGN.md` law 3 INTERRUPT: "Breaches are **sticky** (erised scar law: a breach teaches; the scar survives rewind)"; `README.md`: "canon repair is receipted as `scar` ops, never silent" | scars on *habits* — an ExoJ breach marks the autopilot, not just the scene |
| quilt-jev-toolkit | `README.md` ORGAN BOOT v1: rewind past a nest boundary emits one compensating `organ.rewind` host receipt; "the superseded credits stay in the host ledger, marked dead by the evidence list" | the accounting twin — a scar is a *dead credit that stays on the books*; double-entry applied backwards |
| quilt-qcells / MicroMoth-quilt | `quilt-qcells/README.md` ("FORGET is receipted tombstone semantics — the chain is never edited") | the extreme form — even *forgetting* must leave a scar |

**Variation axis**: what is sticky (a character's wound, a habit's breach, a revoked credit, a tombstone), whether rewind is destructive (organ form) or a pure view (bundle form), and who is forbidden to tidy the wound (the engine, the host ledger, the chain itself). The proposed-but-unbuilt `incident.scar` kind (`erised-fleet-table/quest-log.md`, hardening plan move #3) is the nearest missing organ — see §3.

### 1.3 Deadband / autopilot — compiled habits with surprise interrupts

**Invariant**: behavior that repeats with low variance is compiled into a mechanical artifact; inside its envelope it runs at zero thought; leaving the envelope is an *interrupt* that wakes full thought; the calibration comes from observed variance, and the artifact's history is receipted.

| repo | receipt | variant |
|---|---|---|
| erised-exocortex | `DESIGN.md` §"The three laws" (COMPILE / DEADBAND / INTERRUPT), divergence metric, compiler byte-stability, `README.md` token-migration table (self-maintenance 8111 → ~3700, reading tokens 0 → 4100) | **the canonical owner** — ExoJs: trigger + lookup policy + deadband `max = clamp(2·variance+margin, 0.15, 0.6)`; breach = teach; sticky |
| jev-quilt | `README.md` Law 2 ("change-below-floor → silent, the deadband"); Law 3 (decide in one pass, project elsewhere) | the hook-level gene — deadband as a subscription floor on deltas, not an autopilot |
| jeviter | `README.md` three laws ("No belief, no refusal / Every silence is booked / The threshold is alive" — mean + k·σ) + the **ratchet** ("a world oscillating at any fixed amplitude is silenced after exactly one admission — adversarial resonance impossible by construction") | **the inverted polarity** — the same boundary-belief shape aimed at *noise* instead of *novelty*: surprise is admitted exactly once per shape, floods self-shed |
| jev-garden | `README.md` (the weaver "compiles the accumulated exoj into versioned weave artifacts"; "the ExoJ law") | the learning loop — idle-time compilation of a judgment field into a versioned artifact |
| erised | `QUILT.md` §Dehooker Axiom ("Click Tick → the system runs → read the seam") | the operator version — the human's compiled habit is the big button |

**The work-product duality** (`erised-exocortex/README.md` §"The work-product duality") is the gene turned on the fleet itself: state-first, key-scan, remote==local verify are *compiled ExoJs of wave-running*; the DeepSeek key leak (`cot-quilt/SECURITY-INCIDENT.md`, commit `677484d`) was a deadband breach whose re-imagination (key-scan before AND after push) is sticky ever since — a process-level scar minted by the same law.

**Variation axis**: what gets compiled (a player's strategies, a cell's judgments, a lane's checklists), what the gate measures (weighted scene divergence vs stream gain vs change-floor), what a breach means (wake + re-imagine vs silence + book a receipt), and the polarity of surprise (asset to be absorbed — Kestrel's deliberately wide 0.6 deadband absorbing a real surprise at divergence 0.50, `erised-exocortex/README.md` — vs attack to be shed — jeviter's ratchet).

### 1.4 Composer / judge split — generation and adjudication in different seats

**Invariant**: the seat that produces never certifies its own output; the judge's criteria are fixed before or independent of the candidate; verdicts are receipted.

| repo | receipt | variant of judging |
|---|---|---|
| quilt-organ-workers | `README.md` §judge-relay ("compose with some models, test with others"; **score-first contract**: verdict must begin `SCORE: <n>/10`) | fan-out judging as transport; aggregation {mean, min, max, spread} |
| cot-quilt | `README.md` pipeline phases 2 SPLIT → 3 WIRE → 5 JUDGE (cheap models decompose; `deepseek-v4-pro` judges thoroughness + gaps; gaps fold back in as critique cells) | judge of *structure*; critique becomes the next generation's cells |
| erised-exocortex | `DESIGN.md`: GM composes (GLM-4.6), **Referee** is mechanical (typesafe System One, `noul/choice/score`); "payoffs are referee-scored… an instrument of the table, not ground truth" | mechanical referee — adjudication without a model at all |
| fleet-seeds tavern | `tavern/round-12/raw/r12-reasoner-blind-a1.json` + `-reveal-a1.json`; predictions sealed before rounds (`tavern/TAVERN.md`) | blind/reveal — the judge answers before seeing the key |
| jev-quilt | `README.md` §"What three frontier models said" (3/3 convergence table, misquote probes); `JEV_ORACLE_SPEC.md` 14-probe battery incl. adversarial misquote detection | the oracle chord — consensus across model families; inversion probes as negative controls |
| quilt-organ-workers (watcher) | `README.md`: the watcher "shares no code path with the loader" (`receipts/ORGAN-WATCHER.md` finding F1) | judging by *construction* — independence enforced architecturally |
| fleet-seeds lode | `scouts/wave63-scout-report.md` item 11: M12 sealed where the "QRNG draw **overrode** the priors' own pick (anti-cherry-pick observed live)" | the judge is the seal, not the lane — fate outranks the composer |
| qthe / crab-traps | `qthe/SPEC.md` (tavern as adversarial reviewer, cache-gamed); `crab-traps/worker/src/receipts/47b/47b-two-reader-receipt.json` | two-reader law — independent readers, compared verdicts |

**Variation axis**: who judges (same model in another seat / cheaper model / different model family / deterministic replay / mechanical referee / external notary), and what independence means (blind to the answer, blind to the reasoning, no shared code path, no shared secret, no shared species).

### 1.5 Soft joints / lookup tables — table-not-thought, and the last joint stays soft

**Invariant**: decisions that are proven get pinned as mechanical tables (byte-stable, tie-breaks named); exactly the residue that cannot be proven is left as a deliberately soft joint — and the soft joint is *named*, not ashamed of.

| repo | receipt | variant |
|---|---|---|
| erised-sequencer | `README.md` §"The thesis it encodes" (`presets/three-hearts.json`): "Decompose as far as you can; **the last joint stays soft, on purpose**" — the Keeper verifies everything and opens nothing, the Stranger proves nothing and opens the door | the thesis statement — the soft joint is the *human-shaped door* |
| erised-exocortex | `DESIGN.md`: ExoJ `policy` is an ordered first-match-wins lookup table ("MECHANICAL"); compiler tie-breaks "alphabetical-stable" — and Wren's breach came from exactly such a tie-break, which "the table chose to keep… rather than patch the law mid-campaign" | the table as autopilot body; tie-breaks owned in public |
| fleet-seeds | `docs/SEED-TOOLKIT.md` composition paragraph: "hardens what repeats into lookup tables (snap + flatten), keeps the remainder as soft joints where smaller models plug in" | the fleet-wide rule of thumb |
| jev-quilt | `README.md` Law 5 ("Viability is binary… the-tap doctrine: pure difference without viability collapses into dada noise") | a floor as a soft-joint guard: above the floor, judgment is graded, not gated |
| quilt-qcells | `README.md` ("byte-level encoding choices… pinned as canon C1–C6 with receipted rationale") | pinning *byte* joints — the softest choices made explicit on purpose |
| quilt-jev-toolkit | `README.md` ORGAN BOOT v0 ("Boot is the courtroom") | procedure as table — the claim is proven or refused by fixed steps, no judgment mid-boot |

**Variation axis**: where the joint sits (a human door, a default move, a viability floor, a byte encoding), and what the table is allowed to cover. The recurring honest admission — Kestrel's tie-break breach, the vacuous P3 clause (`erised-fleet-table/predictions.json`), JEV's "5 senses" 0.49 (`quilt-jev-toolkit/README.md` §"Why JEV is one signal") — is the gene's *expression* of humility: the table knows its own edge.

### 1.6 Organ / nesting — systems containing systems with balanced books

**Invariant**: a subsystem carries its own ledger across a boundary; the host records only pointer receipts; every crossing debits one side and credits the other; nothing nests silently.

| repo | receipt | variant |
|---|---|---|
| quilt-jev-toolkit | `README.md` ORGAN BOOT v0 I5 ("the organ keeps ITS OWN ledger across quilt boundaries; the host only receives pointer receipts") + v1 `verifyDoubleEntry` (`DOUBLE_ENTRY_UNBALANCED` refused, never auto-repaired) | the canonical custody law — nest, transact, rewind with compensating entries |
| quilt-organ-workers | `README.md` (boot-loader / judge-relay / watcher trio; canonical dialect `quilt.organ.manifest/v1`; backlog #2 "organ-boot-bridge — the quilt drop-in nesting primitive") | the hosted organs — bootable by any stranger, watched hourly |
| erised-fleet-table | `quest-log.md` §"The scenario of record": between two watcher heartbeats the organ store grew 3 → 5, both dialects verified clean — "No chain ever broke. Two honest laws diverged for an hour, and only the cron noticed." | the organ's *health* as the organ — the drift finding |
| erised-sequencer | `README.md` §"Upgrade path": "nest/unnest scenes as sub-organs with double-entry (campaign host ledger)" | the planned transposition — campaigns as organs |
| crab-traps | `worker/src/edge-ledger.ts` ("The ESP32 reflex arc pushes double-entry edges; D1 buffers them; the codespace cortex polls when it wakes. The limb never blocks, the brain never listens") | organ across hardware/software — limb and cortex as nested systems with an edge ledger between |
| quilt-atlas | `README.md` ("The living map of the SuperInstance account… regenerated by the same account it describes") | the fleet itself declared an organism — the map that is its own scout |

**Variation axis**: what nests (cells, scenes, campaigns, hardware limbs, lanes), what the balanced book counts (credits, edges, tokens), and who holds the watch (the host, an hourly cron, a stranger's `/verify`). The organ-watcher's indeterminate state (`driftDetected: null`) and the wave-63/64 dialect drift are the gene's known mutation rate, receipted rather than hidden.

### 1.7 Platonic randomness — deterministic fate re-derivable from provenance

**Invariant**: chance is never trusted as chance; every "random" outcome is a pure function of recorded provenance, re-derivable forever; when true entropy is wanted, it is *certified* and receipted.

| repo | receipt | variant |
|---|---|---|
| platonic-randomness | `README.md` ("Choosing a solid is choosing the rhythm…"); `NOVEL-APPLICATIONS.md` ("the fracturing of the RNG from a black box into a textured instrument") | the library form — seed-string → stream; solid = texture, not correctness |
| erised-sequencer | `engine.mjs` lines 14–15, 44–47: `seed = sha256(prev_tip\|seq\|solid\|n)`; comment "Vertex-count 'temperament' of each solid: fewer vertices = sharper fate" | fate cut *from the ledger itself* — and the texture promoted to temperament (a variation on the library's own "texture not correctness") |
| erised-fleet-table | `README.md` campaign ("first spin: d12 = 11 → ANCHOR… rewind… d12 = 6 → LEDGER"); `quest-log.md` insight 5 ("rewindable deliberation is itself the finding") | fate as a *deliberation instrument* — re-spinning under changed tips dealt a second hand nobody chose |
| erised-exocortex | `README.md` §"The earned surprises": the d4 "dealt the maximum four surprises"; the rewind gate "was priced at 1-8 and the dice said play on — receipted honestly" | fate as surprise scheduler for autopilot breaches |
| cot-quilt | `README.md` phase 0: "3×16 TRUE quantum bits from mothquantum coin-toss jobs… the deepseek endpoint ignores `seed` — so… each sample also gets a LENS persona to guarantee orthogonality" | certified entropy + compensating determinism when the provider won't hold the seed |
| quilt-jepa / fleet-seeds | `quilt-jepa/README.md` ("the seed is minted by the fleet's moth-seal service (labeled fallback when the certified path fails)"); `fleet-seeds/tools/moth-seal.mjs` + `tools/wave46/receipts/46b-seal-k*.json` | the seal ceremony — certified bits, labeled fallback, KAT-checked whitening (`tools/mothbits.mjs`) |
| qthe | `SPEC.md` L1 rule 6 ("same initial substrate + same tick count → byte-identical trace, always") | the zero-entropy pole — determinism as the law, randomness only as registered input |

**Variation axis**: where fate originates (string seed, ledger tip, certified hardware QRNG, labeled fallback), what the dice are *for* (texture, fairness, anti-cherry-pick, surprise scheduling, orthogonal sampling), and the honesty rule when entropy is real (certified path, fallback labeled, whitening KAT). The invariant — *re-derivable from provenance* — never breaks.

---

## 2. The master table (axes × repos)

Read: ● = the repo *owns* the law (canonical or fullest statement); ◐ = carries a working variant; ○ = cites/adopts it in docs only.

| repo | 1 Chain | 2 Rewind+scars | 3 Deadband | 4 Composer/Judge | 5 Soft joints | 6 Organ/nesting | 7 Platonic RNG |
|---|---|---|---|---|---|---|---|
| quilt-mcp-receipts | ● | ○ | | ◐ (server never co-signs) | ◐ (strictness on purpose) | ◐ (hostable organ) | |
| quilt-jev-toolkit | ● | ● | | ○ | ◐ (boot courtroom) | ● | |
| quilt-organ-workers | ● | ○ | | ● (judge-relay + watcher) | | ● | |
| erised | ○ | ● (original) | ○ (dehooker) | ◐ (DM vs cast) | ○ | | |
| erised-sequencer | ◐ | ● | | | ● (three-hearts) | ○ (planned) | ● |
| erised-fleet-table | ◐ | ● | ○ | ◐ (party roles) | ◐ | ◐ (drift finding) | ● |
| erised-exocortex | ◐ | ◐ | ● | ◐ (mechanical referee) | ◐ (ExoJ policy) | ○ | ◐ |
| jev-quilt | ◐ (bookkeeper) | ◐ (cells are scars) | ◐ (hook floor) | ◐ (oracle chord) | ◐ (viability floor) | ◐ (fleet as organism) | |
| jeviter | ◐ | | ◐ (ratchet) | | | | |
| jev-garden | ◐ (seal chain) | | ◐ (weaver) | ◐ (teacher escalation) | | ◐ (organism) | |
| MicroMoth-quilt | ◐ | ◐ (FORGET tombstone via qcells) | | | | | ◐ (seeded collapse) |
| quilt-qcells | ● (tamper-proof) | ◐ | | ◐ (oracle replay) | ◐ (canon C1–C6) | | ◐ |
| qthe | ◐ (stone-v1) | ◐ | | ◐ (tavern) | ◐ (layer split by honesty law) | | ◐ (determinism law) |
| quilt-jepa | ◐ (stone chains) | | | ◐ (registered verdict rules) | | | ◐ (moth-seal seed) |
| cot-quilt | ◐ (incremental receipts) | ◐ (resume per-sample) | | ● (decompose/judge) | | ◐ (cell graph export) | ◐ (quantum seeds) |
| crab-traps | ◐ (edge-ledger) | ◐ (lineage, append-only catches) | ◐ (cron breeding retires stale lures) | ◐ (lures are prompts judged by catches) | ◐ (failure as friendly stub) | ◐ (limb/cortex) | ◐ (lure fitness + splice) |
| fleet-seeds | ◐ (lode, pre-chain) | ◐ (staged-resume law) | ◐ (lane ExoJs) | ◐ (tavern, lode) | ● (SEED-TOOLKIT) | ◐ (the fleet's chassis) | ● (moth-seal, QRNG seals) |
| quilt-atlas | ◐ (receipted diffs) | ◐ (map only grows truer) | | | ◐ (families, honest residue) | ◐ (fleet as organism) | |
| breakthrough-prospector | ◐ (collapse receipts) | | | ◐ (pre-run interpretation pins) | | | ◐ (seeded receipts) |
| platonic-randomness | | | | | | | ● (library form) |
| jeviter | ◐ (silence ledger) | | ◐ | | | | |
| si-fleet | ○ (mirror copies) | | | | | | |

Depth note: "top 10 by relevance" were read in full (erised family ×4, platonic-randomness, quilt-mcp-receipts, quilt-organ-workers, quilt-jev-toolkit, qthe, fleet-seeds core + SEED-TOOLKIT/PREREGISTER, quilt-qcells, cot-quilt, jev-quilt); the remainder skimmed at README/spec level. Cells marked from skim may undercount carriage; none should overcount — every ● and ◐ above was checked against a file.

---

## 3. Missing organs — shapes with 2+ homes and no shared formal home

1. **The Scar Law has no formal home outside the erised family.** Four repos independently need it: erised-exocortex books breaches as sticky (`DESIGN.md` law 3), quilt-jev-toolkit keeps dead credits on the books after rewind (`README.md` v1), quilt-qcells makes even forgetting a tombstone (`README.md`), and erised-fleet-table's quest-log *proposes* `incident.scar` as a sticky receipt kind (hardening plan move #3) — **proposed, not built**. There is no cross-repo definition of what makes a marker sticky (body-kind registry? host-ledger immutability? external anchor?) and no shared vocabulary for the distinction fleet-table named: *corruption vs divergence* (quest-log insight 1). The wound is everywhere; the word for the wound is local.
2. **The Deadband Law is owned de facto by one repo and re-derived in two vocabularies.** erised-exocortex owns COMPILE/DEADBAND/INTERRUPT with a calibrated divergence metric; jeviter independently re-derives the shape as "the threshold is alive" with mean+k·σ and the ratchet; jev-quilt embeds a deadband as a hook floor (Law 2); jev-garden speaks "the ExoJ law" in borrowed vocabulary (`jev-garden/README.md` lines 5–22). Nobody has written the one "deadband law" document that says what all four share (a boundary belief that moves only on genuine surprise) and what legitimately differs (the metric, the polarity, the calibration source). The gene has at least four expressions and zero canonical genotype.
3. **The Composer/Judge doctrine is a scatter of local contracts.** The judge-relay's score-first contract, the tavern's blind/reveal protocol, the organ-watcher's shares-no-code-path independence (finding F1), cot-quilt's decompose-then-judge phase table, and the oracle chord's misquote probes are all instances of one doctrine — *the judge must be structurally incapable of co-signing the composer* — with no canonical statement anywhere. Notably, the BOARD's seven-lane convergence finding ("a well-formed, checkable, wrong artifact, and no instrument that can say so" — `scouts/wave63-scout-report.md` item 6) is itself a *judging* failure, and the fix it demands is this missing organ.
4. **The divergence detector (corruption's healthy twin) exists as a design, not a deployable.** Every chain re-derives and catches corruption fail-closed; only the organ-watcher looks for *divergence between honest states*, and only hourly, on its own heartbeat (`quest-log.md` §1). The receipt-anchor notary that would make silences evidentiary is designed twice (`quilt-organ-workers/README.md` backlog #4; quest-log move #2) and deployed zero times.
5. **The determinism crown has no written protocol.** Double-run byte-identity is claimed and tested in ≥6 repos (erised-sequencer S1, fleet-table T1/T8, quilt-qcells P4, qthe L1-6, quilt-jepa README, exocortex pins) — the fleet's most-repeated proof has no canonical name, threshold, or harness; it is folklore with perfect manners.

Worth naming: **pre-registration was exactly this shape until wave 67-c** — seven hand-rolls, one contract, now `tools/preregister.mjs` (`fleet-seeds/docs/PREREGISTER.md`). That consolidation is the existence proof that any organ on this list can be born the same way: census the hand-rolls, distill the irreducible contract, host one tool, dogfood it in the same wave.

---

## 4. If the DNA metaphor is load-bearing, what is the transcription machinery?

The metaphor holds up under inspection — same genes, different tissues, variation along stable axes. But DNA without transcription machinery is a library in a dead language. How does a law actually *move* between repos today? Five mechanisms, all observed, none deliberate end-to-end:

1. **Vendoring with pinned provenance (mitosis).** The strongest form: copy the organ, pin its identity, check the pin fail-closed at every run. Receipts: `erised-fleet-table/README.md` repo map ("engine.mjs — vendored erised-sequencer engine @ `42c6154` — unmodified"); `erised-exocortex/README.md` ("vendored unmodified @ `b8c0c3d8`"); `quilt-qcells/README.md` ("micromoth.py — vendored byte-identical oracle, sha256 `bbd10ac2…`, pin-checked at every run"); `quilt-organ-workers/scripts/validate-dialect.mjs` (fails closed if the toolkit peer checkout is missing).
2. **Re-derivation with citation (transcription + translation).** The gene is re-implemented in a new substrate while the source is credited. Receipt: erised-sequencer *did not* vendor platonic-randomness — `engine.mjs` re-derives `platonicRoll` with the seed bound to the ledger tip, and the README names the donor repo. The gene survives; the promoter changes; the expression is new (texture becomes "temperament").
3. **Canary hashes as genetic markers (the universal primer).** One byte-exact vector is pinned across substrates so any port can prove kinship: `fnv1a64("café Δ 日本語") === 0x24a555471370b18d` — jev-quilt's polyformalism canary (12 ports, `README.md` image 06), adopted verbatim by jeviter's ledger ("receipts cross-verify with jev-quilt's Bookkeeper, duke-lab's WASM port, and quilt-engine-ports' GDScript from byte one", `jeviter/README.md`), and generalized in SEED-TOOLKIT primitive 9 (flatten) via the QUF/FNV vector identical in 10 languages.
4. **Word migration (mRNA).** Vocabulary travels ahead of code: "ExoJ" migrates from erised-exocortex's DESIGN.md into jev-garden's README and out to a repo literally named `exoj` (`fleet-seeds/FLEET.md` graph); "stone standard", "deadband", "crown" drift fleet-wide. Cheap, fast, and uncontrolled — the drift can be a mutation or a meme, and nothing currently distinguishes them.
5. **Census → distill → host (the deliberate loop, proven once).** Wave 66's seed-DNA census (referenced from `fleet-seeds/docs/PREREGISTER.md`: "quilt-atlas 6df5d1d §3.3") found seal/gate hand-rolled 7+ times; wave 67-c distilled the seven into one registry-hosted primitive with 19 tests and a same-wave dogfood. Scout reports feed the same loop (`scouts/wave63-scout-report.md` §d "drop-into-cell candidates"; `breakthrough-prospector/README.md` abstraction cards: statement → instances → our-fleet instance → the gap → the experiment hook). And `crab-traps/docs/LINEAGE.md` shows the missing *bookkeeping* half: one repo, at least, writes down its own descent.

**The mutation risk is real and already receipted.** `si-fleet/jev-quilt/README.md` is a frozen copy of `jev-quilt/README.md` from an earlier revision: the copy claims "43 Python tests green / 7 Rust tests green", while upstream corrected the *law itself* — "suite status MEASURED not written: 81 passed, 3 skipped… **do not write counts, run the suites**". Hand-copying mutated a claim; the mutation became a lesson; the lesson is only visible because someone diffed. That is transcription error caught by luck, not by machinery.

**What a deliberate mechanism would look like** (and everything it needs already exists as a proven pattern elsewhere in the fleet):

- **One canonical home per law** — a `LAW.md` per axis in a single repo (the toolkit or fleet-seeds), stated as invariant + minimal contract + named fail-closed codes, exactly as qmr1's DESIGN.md §2 already does for the Chain, and exactly as PREREGISTER.md did for seal/gate.
- **A conformance harness per law** — the `scripts/validate-dialect.mjs` pattern (fixture + tampered controls + both-implementations-must-agree, 38/38) generalized from dialects to laws: a repo doesn't *cite* the scar law, it *passes* the scar harness.
- **A lineage manifest per repo** — the crab-traps `LINEAGE.md` pattern made uniform: which laws a repo carries, at which variant, with the donor pinned (vendored sha or re-derivation note). This is `.quilt/links.yml` (`fleet-seeds/README.md` §"quilt-links.mjs lives here" — "one file, one home, curled or copied where needed") extended from *code* provides/consumes to *law* provides/consumes, so the fleet map shows kinship, not just edges.
- **Mutation control by the fleet's own instruments** — canary vectors (mechanism 3) + the preregister seal (the one consolidated gene) + the two-reader law (mechanism 4's judge): a transcription that can't re-verify its donor fails closed, the way `quilt-qcells` refuses to run on a moved pin.

The closing inversion, in the fleet's own idiom: the fleet spent 66 waves building organisms that keep receipts — the remaining work is a *genome* that keeps receipts. The seven laws above are the chromosome map; the missing organs are the unsequenced regions; and `preregister.mjs` is the proof that sequencing them is a one-wave job once someone runs the census.

---

## 5. Honest scope

- This is a reading synthesis: every receipt is a real file path, but claims of the form "repo X *carries* law Y" rest on docs and tests as written, not on re-executing each harness. Where a verdict file exists (qcells P1–P4, sequencer 13/13 pins, fleet-table 9/9, exocortex 12/12), it was read and cited; nothing was re-run.
- Three suggested candidate axes were folded rather than kept: "platonic randomness" survived as axis 7; "composer/judge" and "organ/nesting" as 4 and 6; "soft joints" as 5. Nothing was dropped, but the boundaries between 1/2/6 (chain, rewind, nesting) are genuinely fuzzy at the toolkit, where all three are one custody story — the fuzziness is reported, not resolved.
- Repos read at skim depth (si-fleet, moth-research, craftmind-study, breakthrough-prospector, quilt-atlas) may carry additional variants not credited here; their ○/◐ marks are conservative.
- No secrets were read, echoed, or committed; `GITHUB_TOKEN` was not needed (all sources were local).

*Key-scan note: this file is documentation only; the staged set and committed tree were scanned against the fleet-standard credential-class regexes before push (see worklog, Task 66-e).*
