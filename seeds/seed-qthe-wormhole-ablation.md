# Seed: qthe wormhole-table ablation — the mechanism's missing falsifier

## The question

The qthe kernel's one genuinely novel mechanism is the compiled 64-slot
wormhole table: during a tick, an Abstain cell reads slot `d` (its own
amplitude indexes the table) and, if that slot holds a different (x, y) with
nonzero resonance, adds `resonance * sigma` to its pressure; then it
unconditionally writes its own (x, y) and `resonance = |acc| + 1` into slot
`d`. Non-local twin resonance, one table, zero traversal.

C2 is receipted LIVES at the demo level (8/8 ON-arm delivered pairs vs 0/20
OFF). But "wormholes ON beats wormholes OFF on this one geometry" is not the
same as "the table's STRUCTURE does work". The missing falsifier is the
middle arm: a SHUFFLED table. Same slot count, same write law, same
resonance arithmetic — only the slot-to-twin assignment permuted (a fixed
seeded permutation, receipted before the run).

## The experiment (paired arms, decision rules BEFORE the run)

Arms (identical seeds, identical tick counts, wormhole plumbing identical —
only the slot assignment differs):

- A. compiled table (the kernel as sealed)
- B. shuffled table (seeded permutation of the 64 slot->twin map)
- C. wormholes OFF (the existing negative control)

Measurements per arm, per seed: twin-delivery rate, first-delivery tick,
cascade counts, byte-plane trace divergence vs arm A at fixed checkpoints,
sigma swept over the existing E-Q2 grid (0.5, 1, log2(3), 2, 2/3, 4).

Decision rules (write them into the receipt before the first run):

1. If B is statistically indistinguishable from A on delivery at every sigma
   (the shuffled arm wins as often as the compiled one, within the sealed
   noise floor), then the TABLE STRUCTURE is not load-bearing — C2 narrows to
   "any non-local channel beats none", and the compiled-table story is
   decoration. That is a real result; publish it as such.
2. If B is indistinguishable from C, the channel itself is fragile to slot
   assignment — also a real result, and the kernel's docs must say so.
3. Only if A beats B beyond the noise floor does "the compiled table does
   work" survive as a mechanism claim (and it should then be priced: how much
   work, at which sigma).

## Why this seed

The repo's honesty law prices mechanisms, not vibes, and this is the repo's
named novelty running unperturbed through 17 sealed experiments. One evening
of compute; the harnesses already exist (the E-Q1/E-Q2 paired-arm runners).

## Where the receipts go

`experiments/outputs/` + a stone-v1 chain per house style; register the chain
in `scripts/chain_registry.mjs` in the sealing commit; the negative control
arm C must be re-run in the same process as A and B (not cited from E-Q1) so
all three arms share the environment byte-for-byte.

---

## Amendment (pre-drop, ORCH-R14): the devil's advocate pass

Seed-2.0-mini (AS-SAID in `opinions_r14.jsonl`, $0.0001): "Uses only one
fixed seeded permutation for arm B, which may coincidentally retain [the]
compiled table's functional slot-twin links." Verdict: fix-first. AMENDED:
arm B now runs **8 independent cryptographically seeded permutations**
(permutation seeds receipted before the run; per-permutation delivery rates
reported; the compiled-table verdict rule now requires A to beat ALL EIGHT
beyond the pooled noise floor). A single lucky permutation can no longer
fake either outcome.
