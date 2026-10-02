# THE SEED TOOLKIT — ten geometric primitives for polyglot construction

*fleet-seeds charter, wave-66. Distilled by Scout C from slackwater-lattice,
quilt-verilog, quilt-i2i, quilt-llvm, Patchwork-experts (+ quilt core,
frozen-clock, organ toolkit). The principal's directive: think polyglot,
break any one language's conventions, find geometric truth — "the DNA of
life is a toolkit with variations; there are basic codes for functions and
the logic is geometric in nature." These ten are the base codes we could
actually prove exist in the fleet today.*

**How to read this:** a primitive is *proven* when ≥1 repo implements it and
≥1 independent repo re-uses or re-derives it. Each entry: the geometric
meaning, the minimal operation set, and its proof. Skinning with use-cases
(hardware, IR, images, ML patches, TTRPG scenes, fleet ops) is the
variation layer — never invent a new word for these again; port and map.

| # | primitive | geometric meaning | minimal ops | proven by |
|---|-----------|-------------------|-------------|-----------|
| 1 | **point** | an address in a discrete space | make, id, eq, hash | slackwater-lattice `EisensteinInteger` (ℤ[ω]); organ cell ids |
| 2 | **step** | the unit orbit — how addresses touch | `neighbors(p)`, `step(p,dir)` | lattice's six directions; quilt-verilog edge slots; murmuration k-nearest |
| 3 | **metric** | exact distance defined by its INVARIANT (dist==1 ⟺ step-membership), never by a formula | `dist(a,b)` | lattice v0.1.0→v0.1.1 bug is the counter-proof: the invariant, not the formula, is the spec (178/178 property suite) |
| 4 | **snap** | continuous → discrete projection | `snap(x)`, `snap_rotation` | lattice snap; llvm parse→fabric; Patchwork distill/freeze; constraint-theory-core exact snap |
| 5 | **occupancy** | custody of points — who holds what, with conservation | reserve, release, nearest_free, boundary | lattice `BuildPlacement`; llvm conservation law (delivered-or-ledger-entry) |
| 6 | **link** | wiring as data — an edge with payload | link, unlink, readback | quilt-verilog `qm_link {peer,weight}`; quilt core LINK; erised-sequencer scene nesting |
| 7 | **effect** | propagation along a link + local learning | effect(cell,payload), train(edge) | `qm_effect` Hebbian cofire; quilt core EFFECT; jev-net neurons |
| 8 | **tick** | non-deferrable global step (decay sweeps the fabric) | tick(fabric), fire-tests | `qm_tick` (SymbiYosys flood-proven); quilt-in-git post-commit; frozen-clock seq |
| 9 | **flatten** | state → bytes, byte-exact across substrates | serialize, verify-hash | QUF + FNV-1a-64 `0xe435d91d6d92a1d8` identical in 10 languages; organ manifests; quilt-nn `f64\|8\|<ieee>` preimages |
| 10 | **seed** | freeze a trajectory into a portable point that rehydrates in any host | freeze(history)→point, patch-in(point) | Patchwork-experts patch format; organ boot bundles; platonic-randomness dice (seed→rolls); cot-quilt organ exports |

## Composition laws (the grammar the primitives obey)

1. **Custody:** every point's occupancy has a receipt; conservation is
   checked, not assumed (occupancy × flatten).
2. **Time is ticks, not clocks:** position is index; wall-clock is forensic
   annotation only (frozen-clock P1–P5).
3. **Replay is the referee:** hash-valid ≠ true; the geometry (or the fold)
   adjudicates (slackwater-quilt two-court doctrine).
4. **Invariant over formula:** a metric is what it preserves, not how it's
   computed (lattice 0.1.1).
5. **Seeds rehydrate; they don't resurrect:** a seed boots a fresh lineage
   and carries its history as receipts — fork, don't blend (organ v2
   custody; jeviter lineage law).

## Anti-patterns observed (so we stop paying for them)

- Language-bound idioms leaking into the geometry (lattice's float-lerp
  `hex_line`; Verilog-only saturation width choices without a canonical
  reference).
- Status prose drifting from source (quilt-llvm checkboxes; agent-memory
  README vs description). Pins or it didn't happen.
- Consolidation that deletes (agent-memory) — demote, never remove.
- Canaries that cannot fail (the CRDT canary that never constructed a
  CRDT). Every pin needs a negative control.

## How a quilt uses this (one paragraph)

A quilt composes seeds into cells (point + link), runs them on ticks
(tick + effect), hardens what repeats into lookup tables (snap + flatten),
keeps the remainder as soft joints where smaller models plug in (seed +
effect), and flattens the whole fabric into bytes that any substrate —
silicon, IR, browser, scene, fleet — can rehydrate byte-exactly. The
wardroom's "greeter stays human" is law 5 applied to people: the last
joint stays soft on purpose.

## Addendum (wave 67-c) — primitive 8.5: **seal/gate**, now distilled as `preregister`

The wave-66 genetic code already named **seal/gate** among the eight fleet
primitives; the boilerplate census found it hand-rolled 7+ times
(qcells, jev-garden, quilt-bandit, erised-fleet-table, cog-lab, murmuration,
quilt-jepa). Wave 67-c distills the seven into ONE registry-hosted
primitive, `tools/preregister.mjs` (stdlib-only, zero network) —
contract: **(a)** a claims file (id, claim, metric, threshold, refusal
branch) written before the experiment; **(b)** a seal — sha256 over
canonical JSON of the claims + timestamp + tool version — committed and
pushed BEFORE any verification is possible (the jepa aee0335 gold standard);
**(c)** a verdict appended later beside the untouched claims; **(d)** any
post-hoc edit detectable by re-hashing, and the scorer refuses to score
modified claims (fail-closed). Honesty laws ride inside the tool: no
threshold surgery; vacuity is a named verdict (VACUOUS/PENDING) with the
reason receipted, never a silent pass; the verdict is a pure function of
(claims, seal, results). See `docs/PREREGISTER.md`; proven by 19 registry
tests + the wave's own dogfood seal (`seeds/preregister-67c.*`), scored
beside untouched claims per the contract.
