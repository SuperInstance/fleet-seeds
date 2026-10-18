# Seed: qthe ternary port race — a third doc-only port on the verify corpus

## The question

The git.pp fold family proved that a spec is complete when N independent
implementers, forbidden from reading each other, converge byte-for-byte.
qthe has two independent-ish implementations of the kernel's LAYER 0/LAYER 1
surface (the JS reference kernel; the C99 and Python crossimpl ports, plus a
stranger's spec-only rebuilder at SuperInstance/qthe-verify that already went
12/12 byte-identical). What it does not have is a port written under the
git.pp family's strictest discipline: **doc-only, from SPEC.md alone,
conformance-proved against a COMMITTED corpus, and sabotage-controlled**
(negctl: a suite that cannot fail is not evidence).

## The experiment

1. Port the kernel to Rust or Go from `SPEC.md` + the algorithm section of
   the qthe-verify README — do NOT read `qthe.mjs`, do NOT read the C or
   Python ports. Every question the spec cannot answer is a FINDING (file it;
   it is the spec's defect, not your permission to peek).
2. Extend the qthe-verify 12-case corpus with wormhole-ON sigma-sweep cases
   and at least one degenerate grid (1x1, 2x2) — the corpus is committed, so
   the extension is itself a receipt.
3. Race all implementations on the extended corpus: byte-identical trace
   hashes or divergences named per case.
4. Build the sabotage control for the new port's conformance suite before
   trusting any green: flip one trace byte in the corpus, require the suite
   to fail, restore, require green (the negctl pattern; qthe's
   `scripts/negctl_qthe.mjs` is a working example of the harness shape).

Decision rule (before the run): the port is conformant iff 100% of the
extended corpus is byte-identical AND the sabotage control detects every
planted defect. Any divergence is either a port bug or a spec finding —
both are wins, but they must be NAMED, never averaged away.

## Why this seed

qthe wants to be "small, priced, independently usable" — and the strongest
form of independently usable is independently REBUILDABLE. A third doc-only
port that converges byte-for-byte would let the README's determinism claim
carry three independent receipts plus the stranger's. If it does NOT
converge, the divergence is the most valuable artifact either repo can
produce (see the reading-room doctrine: disagreement is the output).

## Where the receipts go

New repo spawned from this seed (fleet-seeds seedbox), conformance corpus +
per-case receipts + the sabotage log; cross-link back to qthe and qthe-verify
via `.quilt/links.yml` (Reader's Fold — pointers, not verdicts).

---

## Amendment (pre-drop, ORCH-R14): the devil's advocate pass

Seed-2.0-mini (AS-SAID in `opinions_r14.jsonl`): "Only deploys one doc-only
port, failing git.pp's requirement of multiple independent implementers for
convergence." Verdict: fix-first. AMENDED — the scope is now honest: ONE more
doc-only port is ONE more independent receipt (the stranger's qthe-verify +
this = two outside receipts), NOT a convergence proof. Convergence is the
git.pp family's N-implementer bar; if this seed spawns, it should explicitly
invite further independent ports and carry a running convergence table
(stranger / this port / next) rather than claim the bar alone.
