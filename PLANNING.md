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
