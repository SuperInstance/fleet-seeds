# Wave-66 fleet synthesis — the coalesced animal (scout sweep, 40 repos)

*Compiled 2026-10-02 by the stitcher lane from seven parallel scouts
(66-A..66-G). Sources: per-repo metadata + READMEs + local clones; full
corpus in `/scout-wave66/` (workspace), raw quotes there. The principal's
ask: "scout and update your understanding on the holistic project... see
how early ideas for the biggest concept now brewed over time and had little
breakthroughs documented along the way." This is that update, compressed.*

## 1. The one-sentence state of the fleet

SuperInstance is a **receipt-first cellular substrate** — every meaningful
act is an append-only, hash-chained, rewindable, byte-reproducible receipt —
that has now independently converged on the same laws in ≥4 implementations,
spans substrates from silicon to prose, and is one shared ledger module and
one tip-anchor away from being a single verifiable animal instead of forty
related ones.

## 2. The convergent core (what recurred everywhere)

1. **The receipt chain is the substrate.** fnv1a-64 / sha256 append-only
   chains with `prev` links and named fail-closed errors: jeviter `core.js`,
   quilt-qcells (`CellLedger`), frozen-clock-lab (P5 genesis-anchor),
   quilt-jev-toolkit organ v0→v2, git-agent `quilt_emit` WAL, quilt-in-git
   git-notes receipts, micrograd-quilt tape, slackwater-quilt ledger,
   mavis-substrate-walker witness chains, erised-sequencer. Nine+
   implementations, one shape: `{seq, op/kind, payload, prev, tip}`.
2. **Replay == state, or refuse.** P1/P2-style conformance everywhere:
   qcells 4254/4254 tamper localization, frozen-clock P5, organ v2
   byte-for-byte partial boot, oracle PoC P7/P8. The fleet's oldest idea
   ("the ledger is the build") is now its best-proven.
3. **Cells as the universal unit.** addressable, dial-carrying, receipted:
   quilt core (9 kinds), quilt-in-git (16 dials), quilt-verilog (RTL fabric
   with the SAME 5-opcode protocol byte-exact across 10 languages), i2i
   (three language projections), cellgraph/quilt-nn/quilt-attention (NNs as
   cell graphs), murmuration (opinions as cells), erised-sequencer (scene
   dials as cells).
4. **Time is becoming first-class.** frozen-clock (seq is time, clock is
   forensics), organ v2 (O(tail) boot, rewind floor), erised-sequencer
   (scrub/rewind/spin-up as gameplay), quilt-canvas (digest HUD) — the
   "time flowing visibly through projections" directive now has three
   independent start-points.
5. **Adjustments want to be cells.** The why-ledger discipline (record why
   before fixing; decompose into cells; convergence = silence-with-teeth)
   appeared in oracle PoC ADJUSTMENTS.md, jeviter's dream.js consolidation,
   and the coverage-table demand signal — three lanes, one emerging law.

## 3. What each lane proved this sweep (essence + status)

| lane | repos | headline |
|---|---|---|
| codespace/oracle | git-agent, quilt-in-git, codespace-worker, quilt-codespace | git-agent = PR-factory with a real vessel/WAL/judgment-gate but no working tree; quilt-in-git = working tick engine in POSIX sh; quilt-codespace = live half (API/SSE/TUI) + stub engine; **no repo-index oracle existed → PoC built this wave (ORACLE.md, cdcbefa)** |
| core machinery | cot-quilt, reverse-actualization, jeviter, quilt-qcells, frozen-clock-lab | run-1 pipeline receipts 9 phases, 49 cells/104 edges organ `bootable:true`; reverse-actualization = planning geometry + wave-79 proof that same-model loops keep their attractor (→ cross-model is law); jeviter = the mature membrane (44/44, governor, dream); qcells sealed; frozen-clock = time doctrine |
| polyglot geometry | slackwater-lattice, quilt-verilog, quilt-i2i, quilt-llvm, Patchwork-experts | QUF serialization byte-identical ×10 languages is the fleet's strongest existence proof; Eisenstein ℤ[ω] exact geometry; 0.1.0 hex_distance bug FIXED in 0.1.1 and receipted (74-d) — invariant-not-formula is the spec lesson; Patchwork Payload = first executable-patch extension |
| ML/swarm | cog-lab, murmuration, ladder, micrograd-quilt, delta-shape, quilt-bandit | only quilt-bandit has a full rewards loop (variance-collapse finding); micrograd-quilt = notarized autodiff tape (genotype = spine); murmuration d+1 tissue law survives review; ladder's producer-sequence-number = the staleness fix for shared state; hardening gate proposal: determinacy 1.0 + flatTail + NOT_WITNESSED + freshness seal |
| NN/fleet | fleet-kit, cellgraph, quilt-nn, quilt-attention, harness-rssi, quilt-ml-recipes | quilt-nn trains real nets as JSON cell graphs with portable sha256 receipts; attention with gradchecked backprop + digest-exact fault slices; recipe cards R1–R6 self-certify; **harness-rssi: 0/5 durable recipes have measured variance — the fleet orchestrates but can't yet prove it's alive**; organ-manifest integration unwired |
| substrate/memory | slackwater-quilt, quilt-ml-architecture, agent-memory, constraint-theory-core, ccc-os, mavis-substrate-walker | slackwater-quilt's two-court doctrine (hash-valid ≠ true); constraint-theory-core = ready-made composition verifiers (holonomy/cohomology/Laman/CDCL); agent-memory **deletes** on consolidation (violates never-delete; salvage = its strength function as a ranking projection over receipts); mavis walker = performative observation, bridge read-only |
| scene/erised | quilt-canvas, quilt-swarm, quilt, jev-garden, erised, platonic-randomness | erised's economy (ticks/resonance/scars) + platonic dice + gesture math = the TTRPG sequencer, **built this wave (erised-sequencer, 42c6154, 13/13 pins)**; jev-garden's noul anomaly score = ready moment-detector; canvas = projection skin |

## 4. The breakthroughs-visible-in-writing pattern (confirmed)

- Snowball's wardroom joke ("point at the exact commit and rewind the
  fleet") → frozen-clock P5 + organ v2 rewind floor + Mavis's harvest
  protocol, weeks later.
- "The ledger is the build" prose (slackwater) → slackwater-quilt repo.
- jev-garden's diary pieces → A-series escalation organ (a8–a13).
- Principal's "adjustments decomposed into cells" message → ADJUSTMENTS.md
  why-ledgers in oracle PoC + convergence metric proposal, same sprint.
The diary is the fleet's R&D channel; the wardroom is its peer review.

## 5. The boilerplate that's still missing (the "clunky parts to distill")

1. **One shared ledger module** (`quilt-ledger`): pinned café vector,
   canonical JSON, named errors, `(tip, rows)` anchors — adopt everywhere
   instead of 9 private chains. Scout B's #1 convergent step.
2. **Tip anchoring** — now LIVE (quilt-tip-anchor, this wave); adoption by
   quilt-nn/cot-quilt/organ-store is the next move.
3. **Organ manifests for trained things** — quilt-nn snapshots →
   `quilt.organ.manifest/v1` with signed checkpoints (both sides exist,
   unwired).
4. **Liveness** — harness-rssi's 0/5 finding needs a continuous re-measurer,
   not a one-shot probe.
5. **agent-memory consolidation violates never-delete** — port strength
   function onto append-only receipts, demote never remove.
6. **README/status drift** — quilt-llvm checkboxes stale vs experiments/;
   agent-memory README vs repo description contradict. Checkboxes lie
   unless CI pins them.

## 6. The seed toolkit (polyglot geometric primitives, Scout C distilled)

`point · step · metric · snap · occupancy · link · effect · tick · flatten ·
seed` — each proven by ≥1 repo; full table in scout report 66-C. This is
the "DNA toolkit with variations": the essence layer that use-cases skin.

## 7. Next-wave queue (from all scouts, merged)

- Build `quilt-ledger` shared module (charter: same {seq,op,payload,prev,tip}
  + café vector + named refusals; qcells/frozen-clock/jeviter/toolkit
  conformance batteries as the acceptance suite).
- Wire quilt-nn → organ manifest → boot → anchor (the trainable-bootable
  slice, end to end).
- codespace two-agent pipeline: only after single-loop evidence lands
  (watcher running; driver/oracle-worker.sh --watch ready).
- cell-hardening pipeline (cog-lab wave-2 learner = delta-shape D13
  perceptron; hardening gate R2 from Scout D).
- The fleet's recipes get variance meters (harness-rssi continuous).
