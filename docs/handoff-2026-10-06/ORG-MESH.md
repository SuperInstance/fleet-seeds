# ORG MESH — how the SuperInstance collection fits together

> Supplement to `HANDOFF.md` (same directory). That file is *state*; this
> file is *understanding* — the doctrine spine, the repo clusters, how they
> exchange work, and where the whole organism is pointed. Written at fleet
> handoff 2026-10-06, when the OpenClaw main instance was stood down and the
> fleet's momentum was deliberately converted into seeds for per-repo child
> agents.

## 1. The doctrine spine (one law, five mechanisms)

Everything on the account is the same idea at different scales:

**The honesty law: no receipt, no claim.** A claim without a receipt is
noise; a receipt is a pinned, re-executable record of what actually happened.

Five mechanisms carry the law:

1. **The five-opcode algebra** — BIND / LINK / EFFECT / VIEW / TICK (+ adopted
   FORGET / PROOF / WORLD / TIME). The fleet's universal act: a WAL row
   (fleet-witness), a quantum gate (MicroMoth), a git commit (quilt-in-git),
   a quilt cell record (jev-quilt), a pong tick are *the same operation* in
   different materials.
2. **fnv1a-64 hash-chaining** — cheap, deterministic, portable receipts; the
   fleet canary `fnv1a64("café Δ 日本語") = 0x024a555471370b18d` pinned
   byte-exact across 12 language ports.
3. **The referral graph + weight law** (quilt-tools) — the org's connective
   tissue. Edges: grown-on > consumes > related. VERIFIED only when a merged
   PR in the *target* repo cites the technique. Never self-upgraded.
4. **fresh-audit** — audit the pushed head in a pristine depth-1 clone, never
   the author's tree. Every open fleet PR carries a committed receipt.
5. **Record-only measurement** (jev-quilt doctrine 006) — measure gates and
   oracles; never apply findings without an explicit owner decision. Findings
   are data, not policy.

Adjacent doctrines: *consume-don't-rival* (adopt neighbors' dialects rather
than building competitors), *fail-closed* (refuse with a named reason beats
silent success), *scars kept* (ERRATA and strikethrough over deletion).

## 2. The clusters

### A. Core substrate — the quilt itself
`quilt` (reactive spreadsheet engine) · `quilt-studio` · `twist-engine`
(commensuration instruments) · `tidepool` (helper-thread memory ocean) ·
`quilt-in-git` (**git-native substrate**: dials as files, ticks as commits,
hooks as runtime; witness streams; Tier-0 tool ladder) · `jev-quilt`
(cellular decision substrate + the JEV measurement program).
*Mesh role:* these repos define what a "cell" and a "receipt" are. Everyone
else consumes the definitions.

### B. Judge & canon layer
`jev-quilt` (also cluster A — the probes live here) · `quilt-jev-toolkit`
(JEV reference client + organ custody: snapshot/boot/rewind, Ed25519
attribution, fail-closed boot-as-courtroom) · `jeviter` · `cot-quilt` (first
doctrine adopter; graph edge #33 VERIFIED).
*Mesh role:* decides what counts as canon. Currently half-dark (Typesafe key
revoked 2026-10-06); the offline custody protocol is fully live.

### C. Receipts, witnessing & doubt
`fleet-witness` (WAL completeness: RFC 6962 checkpoints, L1/L2 live, L3
quorum mechanism in PR #7) · `fleet-witness-checkpoints` (private anchor
repo) · `quilt-tools` (tool garden + referral graph + fresh-audit home) ·
`quilt-mcp-receipts` / qmr dialects (cross-repo receipt exchange; §8
attribution) · `quilt-stone` (canonical verifier) · `doubt-ledger` (the
introspection half: *what stopped being checked*, discharge-with-reason,
coverage queries).
*Mesh role:* the immune system. fleet-witness answers "did the ledger
survive deletion?"; doubt-ledger answers "what is trust letting through?";
quilt-tools answers "who actually built on whom?"

### D. Quantum lane
`MicroMoth-quilt` (feature-poor quantum framework + circuit-as-ledger;
IonQ rungs 1–2 sim preflights on main; rung-3 hardware-gated).
*Mesh role:* the sharpest test of the honesty law (an unseeded histogram is
an unverifiable claim) and the frontier scout for hardware quantum.

### E. Play & demonstration
`pong-quilt` (ML you can watch think; the round-based builder/playtester loop
is the fleet's most copied method) · `quilt-arcade` · `cargo-line-tycoon` ·
`exoj` · `eos-seed` · `tessera` · `chiaroscuro` · `qthe`.
*Mesh role:* where doctrine becomes visible. pong-quilt's receipts-first
pedagogy is the account's public face.

### F. Mathematics & compilation
`constraint-theory-math` (INT8 soundness, sheaf cohomology, GL(9) holonomy;
proven/conjectured/debunked labeled) · `intent-directed-compilation`
(AVX-512 consumer of the INT8 theorem).
*Mesh role:* the proof trail under the engineering; the conjectured
Consistency–Holonomy Correspondence would unify clusters A and C.

### G. Ops, meta & canon
`fleet-seeds` (this repo — docs, deltas, lodes, graph) · `micrograd-quilt`
(the workspace repo: fresh-audit wrapper, snowball queue, handoff docs) ·
`coev` (standalone extraction template) · `AI-Writings` (~3.6GB fiction
canon; add via contents API only, never clone on the Aliyun host) ·
`SmartCRDT`, `quilt-swarm`, `quilt-cloudflare` (Casey-side infra lanes) ·
`zero-msg-test`, `lobster-live`, `Evolver` (Casey's newest vessels —
watch-only).

## 3. How work flows between clusters

- **Adoption flow:** a technique born in cluster A/E gets cited by a merged
  PR in a target repo → quilt-tools books the edge VERIFIED → other repos
  consume it with a receipt (e.g. fresh-audit: born in quilt-tools#45, now
  run on every fleet PR).
- **Identity flow:** Ed25519 semantics are shared byte-for-byte between
  quilt-jev-toolkit organ v3 and quilt-mcp-receipts qmr2 §8 (sigKeyFp =
  sha256 of SPKI PEM). A signed checkpoint and a signed receipt row verify
  with the same law.
- **Dialect flow:** exports ride stable dialects (qmr1/qmr2) with kill
  switches on byte-drift; doubt-ledger exports rows qmr2's verifier accepts
  without building a rival keyring.
- **Measurement flow:** jev-quilt measures the judge → findings parked as
  Casey decisions → clusters B/E consume the verdicts only within measured
  trust bounds.

## 4. Parked cross-cluster decisions (Casey-owned, evidence attached)

1. **F1 substance gate** (jev-quilt) — 5 live measurements.
2. **G1 structural fix** (jev-quilt) — mode-lottery evidence.
3. **F4 Layer 2** (jev-quilt) — designed, hook booked.
4. **IonQ rung-3 hardware** (cluster D) — rungs 1–2 PASS.
5. **spec-prereg extraction** (empty repo exists; push on Casey's word).
6. **L3 witness service** (cluster C) — gated on extraction #4 + two hosts.
7. **stone-v1 consumer** into zero-msg-test (cluster G synergy).
8. **Dependabot batches** (SmartCRDT, quilt-swarm, quilt-cloudflare, quilt).

## 5. Where the organism is pointed

The vision in one paragraph: **an account where every claim is a receipt,
every receipt is anchored, every anchor is witnessed, every witness is
measured, and the whole thing is legible to a stranger with a fresh clone.**
The immediate trajectory (post-handoff):

- **Per-repo child agents** cultivate each repo against its ONBOARDING seed
  doc (9 seed PRs opened 2026-10-06), escalating cross-repo work through the
  referral graph and the parked-decisions list.
- **The mesh thickens** along the designed-not-built joints: organ registry
  under fleet-witness checkpoints; adjudication-client bridging doubt-ledger
  to external resolution; consistency-proof serving; the interval-sheaf
  completion in constraint-theory-math.
- **The moat** (from the frontier scans): receipts *enforcement gates* have
  zero competitors in the open literature (ECT 2608.23623 is the closest,
  still academic); memory-architecture is consolidating (witness semantics
  are the durable edge); breeding+LLM is commoditizing (the fleet's edge is
  seeded bit-repro + receipts, not the algorithm).

## 6. Standing rules for every child agent

1. Never push main on fleet repos — Casey merges. Branch-or-it-didn't-happen.
2. fresh-audit your pushed head; commit the receipt on-branch.
3. Weight law for graph edges; consume-don't-rival for neighbors.
4. Record-only for judge findings; no self-upgrades.
5. FAIL-first pins on every build; name the wound, never hide it.
6. Sub-15-minute chunks (arcade rule); push often.
