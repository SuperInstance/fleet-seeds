# Run Construction — Wave 63 Field Manual

**What this document is.** Wave 63 ran six parallel lanes across the SuperInstance fleet, three
of them through multiple agent deaths and resumes. This is the extracted methodology: how we
now construct development runs through the quilt's own machinery, written so a zero-shot agent
can pick it up without archaeology. It is not about the results (those live in the repos and in
`lode/registry.jsonl`); it is about **how to build the next run better**.

---

## 0. The wave in one table

| Lane | Repo @ head | What it proved |
|---|---|---|
| 63-a (+63-a-r) | cot-quilt @ 0f360b97 | DeepSeek CoT → cellular graph pipeline, live: 49 cells / 104 edges, dual decomposers, adversarial judges, seed-stability 45.8% |
| 63-b (+r, +r2) | quilt-jepa @ e52a1fb2 | Round-9 sealed 22/25: saturation curve FLAT (cure bought once, held); dose-ordering DEPTH-FRAGILE; dip law WINDOW-BOUND; determinism crown 9 rounds deep |
| 63-c | quilt-jev-toolkit @ ecaf2e40 | Organ snapshot/boot v0: 23/23 tests, every tamper case fail-closed, nesting = pure double-entry |
| 63-d (+63-d-r) | breakthrough-prospector @ f0034fdd | E6 slice-2 FAIL honest-negative: single-keyword mutation space INERT; E6 program CLOSED; false-PASS gate bug caught & voided |
| 63-e | quilt-organ-workers @ 2caa24d7 | Two Cloudflare workers LIVE: organ-boot-loader (content-addressed, fail-closed PUT, /verify) + judge-relay (fan-out judging as a service) |
| 63-f | fleet-seeds @ 4f43fff7 | Scout: 200 repos censused, 59 new in 48h, 12 outside repos, 8 papers, TOP-5 snowball queue |

---

## 1. Ten run-construction laws that earned their keep this wave

### Law 1 — Open every wave with a receipted channel-health probe.
Wave 63's first act was probing all 8 API endpoints ($0, minutes of work). It un-blocked the
E6 re-registration (comet-qrng-v1 recovered: bell S=2.8193, full cert payload), priced groq as
region-blocked before any lane wasted calls on it, and gave the fleet its first look at the
re-rolled deepseek channel. **A run that starts without a channel receipt is running blind.**

### Law 2 — Pre-registration-first, pushed before measurement.
Both measuring lanes (63-b, 63-d) sealed their predictions/registrations and pushed them to
GitHub BEFORE any draw. This is not ceremony: it is what made 63-d's false-PASS catch possible.
When the inherited gate line fired `PASS` promoting an arm, the registration was the source of
truth that exposed it (`M >= 0.05×baseline` instead of the registered `1.05×`). The voided
receipt was preserved verbatim, the runner repaired, measurement invariance proven. **The
registration is the single source of truth; re-derive every gate from it, never copy from the
prior runner (L14).**

### Law 3 — Composer/judge separation, mechanically enforced.
Compose with some models, test with OTHERS — never let a model grade its own exam:
- **Composers (63-a):** deepseek-v4-pro (CoT trace) + deepseek-flash ×3 seeds + typesafe
  jev-1.13.0 (independent second decomposer — cross-review converged 29/29, which is itself a
  signal: independent-decomposer agreement = high-confidence cells).
- **Judges:** Hermes-3-405B adversarial (find missing/faulty nodes; its one missing mechanism
  was folded back as critique cell C01) + typesafe noul probability questions (p_complete 0.71,
  p_implementable 0.15, p_faulty 0.27).
- **Serverless form (63-e):** the judge-relay worker makes this pattern callable from any lane
  without local model access: `POST /judge {candidate, rubric, judges:[...]}` → per-judge
  verdicts + aggregate. The pattern is now infrastructure, not a lane discipline.

### Law 4 — Multi-seed with contamination detection, not just averaging.
The t=0.7 seed burned 16,384 tokens on hidden reasoning, returned empty content, and the
no-context repair hallucinated 22 garbage nodes (24% of the graph). The signature was visible
(empty content + token explosion). Cure: a `--redo-seed` flag that re-calls one seed without
disturbing the others; every healthy stage re-entered cached. **Seed-stability is the
confidence map: nodes surviving all seeds are cells; seed-dependent nodes are volatile.**
Overall stability 45.8% — that number is itself a finding about the prompt, not the model.

### Law 5 — Phase-state caching makes resume-first cheap.
63-a-r remediated a dead lane's run with **4 new provider calls out of 23**, because every
healthy stage re-entered cached. Design runs as a DAG of cacheable stages keyed by
content-hash: any completed prefix is reusable by any future incarnation. The staged-resume
law (L13) only works when the stages are shaped for it.

### Law 6 — Repair prompts must carry the source document.
A JSON repair call WITHOUT the verbatim source CoT hallucinated 24% of the graph. The repaired
pipeline carries the full source in every repair call. **Never ask a model to fix output it
cannot see.**

### Law 7 — Honest failure rows cost nothing and explain everything.
FAIL rows, operator notes, burned-attempt state preserved verbatim: when the next incarnation
audited, it was a reading exercise, not archaeology. The round-9 verdict's resume chain note
("the commit message says three stages, the file has four, sha matches the committed bytes;
disclosed here rather than rewritten") is the pattern — disclose the discrepancy, never
rewrite history.

### Law 8 — Fail-closed beats fail-open, everywhere, always.
Every tamper case in organ boot v0 fails closed with a NAMED error
(`STATE_HASH_MISMATCH`, `RECEIPT_HASH_MISMATCH`, `CHAIN_GAP`, `REPLAY_DIVERGENCE`,
`CUSTODY_GAP`, `SCHEMA_DRIFT`, `DOUBLE_ENTRY_STATE_MISMATCH`) — and the strongest one,
`REPLAY_DIVERGENCE`, catches a fully self-consistent forged chain that re-hashes cleanly.
Replay-equals-state is the assertion that hashing alone cannot give you. On the API side:
QRNG caps registered in JOBS not seals (a degraded channel consumes jobs while issuing zero
seals — seals-accounting silently under-counts degradation).

### Law 9 — The chatbot isn't the agent; the state left behind is.
Four subagent deaths this wave, zero work lost, because state was committed to git before
every return: mid-run staging committed as resume receipts, verdicts on disk, ledgers
append-only. A lane that dies with uncommitted work is a lane that ran for nothing. **Commit
at every stage boundary, push at every seal.**

### Law 10 — Cross-lane dog-fooding is the compound interest.
One wave wove the tools into each other:
- Lane 63-a's CoT question WAS lane 63-c's subject (organ rewind) — the LLM decomposition of
  the question was then judged against lane 63-c's implementation (coverage table: COVERED 3 /
  PARTIAL 9 / UNCOVERED 10 — the uncovered center of mass, rewind family + write-side
  transactions, is literally organ-boot v1's demand signal).
- Lane 63-a's export was uploaded to lane 63-e's live worker and returned `bootable: true` —
  the pipeline's output now has a distribution organ.
- The fleet's own ledgers (worklog, `lode/registry.jsonl`, `lessons.jsonl`) are themselves a
  receipt chain — the double-entry book the principal asks about is not hypothetical; the
  fleet has been running on one. The organ protocol generalizes it to bootable form.

---

## 2. How to construct the next development run (checklist)

1. **Probe channels first** (all in use, $0, receipt to `scripts/probe*.log`).
2. **Write the reverse-actualized spec** if the run opens new protocol surface: imagine the
   perfect end-state in present tense, derive backward to minimal invariants (63-c's
   `REVERSE-ACTUALIZED-SPEC.md` is the template).
3. **Register before measuring**: seal predictions/registration, PUSH, then run. Any gate
   arithmetic is re-derived from the registration at write time.
4. **Separate composers from judges**; prefer judges of a different family than composers.
5. **Shape stages for caching and resume**: content-keyed, side-effect-free until the
   receipt-of-record write; commit staging before returning.
6. **Carry sources in repair prompts.** Log every call (model, seed, tokens, latency) to an
   append-only `ledger.jsonl`.
7. **Fail closed with named errors**; caps in the unit that actually degrades (JOBS not seals).
8. **Dog-food across lanes**: every run should consume or produce something another lane's
   tool can use (a graph for the boot-loader, a protocol for the judge-relay, a coverage
   table for the next instrument version).
9. **Close by folding**: registry row (append-only), lessons, PLANNING queue, scout deltas.
10. **Document for zero-shots**: every README section answers "what is this, what do I run,
    what should I expect" in that order.

---

## 3. What the tools did for our own work this wave

The principal's question — *how do we use the tools we are developing in our own work?* — was
answered operationally, not rhetorically: the fleet's discovery loop policed itself (run-5's
exclusion-law violation was caught, cured, regression-proven in wave 62; this wave the
pattern caught an inherited gate bug inside one lane), the organ protocol became the fleet's
own state-management path (snapshot → verify → boot in a fresh host → continue → re-snapshot
is now a tested 5-command flow), and the workers turned two lane disciplines (organ
distribution, judge fan-out) into always-on infrastructure that the next wave can call
instead of re-implement.

## 4. Wave-64 run-construction improvements (queued)

1. **Manifest dialect unification** (`quilt.organ.manifest/v1` vs `quilt.organ.v1`) — one
   registered schema + shared fixture, both implementations validate against it (L15).
2. **organ-watcher worker** — cron re-verification of every stored organ's chain; fleet
   health feed at `GET /status`.
3. **judge-gauntlet caching** — verdict cache keyed `sha256(rubric+candidate)`: repeat
   gauntlets across lanes cost zero tokens.
4. **Dose re-registration with depth-ladder** — the CURE9 reversal (0.5507 < 0.5980 despite
   larger |Wc|) as the priced question: measure |Wc|-room ordering across a depth ladder,
   not a single shared depth.
5. **MCP receipt chain** (scout snowball #1) — expose the fleet's receipt/WAL chains as a
   signed append-only MCP organ; memory is the scarcest shared organ.
6. **CF token rotation** — wave-63's 63-e lane echoed the Cloudflare token to local output
   via `bash -x` (never in tracked files or pushed trees; zero-exposure on GitHub) — request
   principal rotation at next convenience.
