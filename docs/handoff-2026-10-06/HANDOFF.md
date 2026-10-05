# FLEET HANDOFF — 2026-10-06 (~03:30 CST)

**Issued by:** main session (OpenClaw host `iZt4n0faw77uvkphcb06ecZ`, Aliyun)
**Trigger:** Casey directive 2026-10-06 02:44 CST — *"I revoked moth and typesafe… stop all the crons and continuous work and push everything to repos with full expansive documentation so that the agents following up can continue full speed."*

This document is the distillation of the canonical operating queue at `memory/snowball-queue.md` (workspace) plus live-verified state from GitHub. When the two disagree, believe this file's timestamps and re-verify.

---

## 1. Credentials state (verified live 2026-10-06 ~02:50 CST)

| Credential | State | Notes |
|---|---|---|
| `MOTHQUANTUM_TOKEN` (`/root/.env`) | **REVOKED — DEAD** | Casey revoked 10-06. Emu/simulator lanes unaffected; hardware (IonQ rung-3) gated anyway. Re-verify with fresh key before citing MothQuantum as live. |
| `TYPESAFE` (`/root/.env`) | **REVOKED — DEAD** | Casey revoked 10-06. Blocks ALL live JEV R6 batteries until a fresh key is dropped. |
| `CF_TOKEN` | LIVE (200 at verify endpoint) | Cloudflare account 049ff5e8…; workers `quilt-tip-notary` + `organ-watcher` both live. |
| `MINIMAX_TOKEN` | LIVE (200 `/v1/models`) | MiniMax-M3, M2.7 available. |
| `GITHUB` PAT + `gh` CLI | LIVE | SuperInstance authenticated, push works. |
| PyPI `__token__` (`~/.pypirc`, mode 600) | LIVE | One clean `[pypi]` section. Remember: host pip is mirror-pinned and lags; use `-i https://pypi.org/simple` to verify fresh uploads. |
| fleet-witness Ed25519 keypair (`~/.config/fleet-witness/key.pem`, 0600) | IN PLACE | Pubkey committed to `SuperInstance/fleet-witness-checkpoints` as `KEYS/openclaw-main.pub`. |

`/root/.env` still physically contains the two dead tokens (annotated in `TOOLS.md`). Follow-up agents: do not burn time probing them.

---

## 2. Cron fleet — ALL 12 DISABLED (recoverable)

All disabled 2026-10-06 ~02:47 CST via `openclaw cron disable`. Job definitions persist in `~/.openclaw/cron/jobs.json` with `"enabled": false`. **Re-enable individually:** `openclaw cron enable <id>` — or recreate from the table. Verify with `openclaw cron list`.

| Name | ID | Schedule | Purpose |
|---|---|---|---|
| snowball-report | `27cd7b1d-184d-4b70-94b5-6614626524a6` | `11,56 * * * *` | Queue worker: takes top item of `memory/snowball-queue.md`, builds, pushes, reports to kimi-claw |
| edge-watch | `d593bd83-1ab9-4af0-a3c3-3c67127162a1` | `23 */3 * * *` | Org pulse (5,168 repos) + frontier scan; writes `/tmp/edge-watch-latest.md`; maintains queue NEXT section |
| pong-quilt-playloop | `5672c91d-2df4-4eb9-a13d-26956beb622b` | `37 */4 * * *` | Round-based builder/play-tester on pong-quilt (R92–R96 shipped by this) |
| executor-tick | `03002bfd-a1a3-4d8a-b499-1455c9b46d5f` | `53 */4 * * *` | Executor lane tick |
| night-wheel | `9b0de7cf-2e5f-4f1d-8294-0292841df01b` | `3 20–04 * * *` | Night harvest loop |
| night-watch-2247 | `08656751-c021-4365-985e-a6f77e031abe` | `47 22 * * *` | tmux/scout-lane health + `/tmp/discovery` harvest |
| night-watch-0153 | `09c67b6c-897d-4405-a65e-bd7917806afa` | `53 1 * * *` | Same, second slot |
| night-watch-0441 | `384549ae-b4f8-4c49-8dd5-9d85f3e72e2d` | `41 4 * * *` | Same, third slot |
| pulse-papers | `b5cbea1e-7184-455c-a6cf-f7d923da78ce` | `35 7 * * *` | Morning paper pulse → `/tmp/discovery/pulse-papers-*` |
| morning-brief-0737 | `022ef6a6-3415-43c8-9dae-02c5d5cf28ae` | `37 7 * * *` | Morning brief to Casey |
| pulse-repos | `a7e09d77-2bf9-4317-9a9c-131aacceefbd` | `35 15 * * *` | Afternoon repo pulse |
| pulse-analogues | `ba8f6f54-5220-490c-8b66-9a05763fd617` | `35 23 * * *` | Evening analogues pulse |

**Known cron-context limitation:** crons cannot direct-send to "Casey" (Kimi gateway needs a chat UUID, fails since 09-29). They note messages in their summaries instead.

---

## 3. The merge queue — open PRs (verified 2026-10-06 ~03:00 CST)

### Fleet lanes (all carry committed PRISTINE-audit receipts unless noted)

| Repo | PR | What | Merge note |
|---|---|---|---|
| pong-quilt | #114 | R92 abstaining-judge label (classifyJudge) + draw #28 | **Stacked family — merge in order #114→#118.** Each re-lands to main in one merge per the R73/R74 precedent; #118 (R96, newest) carries the full stack tip. If merging only one, merge #118. |
| pong-quilt | #115 | R93 build-site --check dry-run + draw #29 | ↑ |
| pong-quilt | #116 | R94 --check adoption gate + draw #30 | ↑ |
| pong-quilt | #117 | R95 README --check-first pin + draw #31 | ↑ |
| pong-quilt | #118 | R96 receipt-audit --doc mode + draw #32 | ↑ newest; suite 413 reg / 405 pass / 8 skips |
| MicroMoth-quilt | ~~#43~~ #45 | IonQ rung-1 sim pre-flight | **#43 CLOSED and #45 CLOSED during flush** — content already on main via #44 (rung-2 carried the stacked rung-1 branch; `tools/rung1_preflight.py` + `rung2_preflight.py` live on main @0069aa91). Nothing left to merge. |
| quilt-tools | #50 | Referral-graph edge #29 flip PENDING→VERIFIED (exoj→pincher, receipt quilt-pincher#20) | Independent. Lands graph at **25 VERIFIED / 7 PENDING**. |
| quilt-tools | #51 | Discovery blind-spot guard: hints for 5 unhinted PENDING edges + Pin 13 | Independent (docs+seed+pins). |
| quilt-tools | #52 | Frontier design receipt: Proof-of-Execution Memory (arXiv 2608.16032), KS1–4 verified live, §6 + §7 receipts committed | Independent, docs-only. On merge becomes a graph external-prior node. |
| fleet-witness | #7 | L3 witness quorum client-side mechanism (policy loader + cosig verify + conflict classes + persist-before-cosign), 75/75, pristine receipt committed | Independent. L3 witness *service* (daemons) remains design-gated — needs extraction #4 + two always-on hosts. |
| fleet-witness | #8 | truncate-demo: standalone live-narrated sales artifact (all 3 attack classes caught), 59/59, pristine receipt committed | Independent. |
| doubt-ledger | #16 | adjudication-client: record → discharge entry (wave-4 candidate-3 BUILD) | Casey-side wave-4 family — review together with #18/#19/#20. |
| doubt-ledger | #18 | receiptd collision hedge — cite/differentiate + wave-4 lane re-rank | ↑ consistency reviewed against #16 in #19 |
| doubt-ledger | #19 | adjudication-client × receiptd hedge consistency review | ↑ docs-only |
| doubt-ledger | #20 | bone-registry reuse metric adoption note | ↑ docs-only |
| constraint-theory-math | #2 | dim H⁰ = dim Fix(Hol) ≤ 9 — cycles never add dimension (corrects the 9+9·β₁ bound) | Independent math lane. |
| quilt-jev-toolkit | #1 | FB6: zeroclaw journal boots as an organ (custody courtroom + byte-exact replay) | Independent. |
| quilt-in-git | #12 | adsr: envelope patch tool (Tier-0 abstraction-ladder brick) | Independent. |

### Casey-side / housekeeping (not fleet build lanes)
- Dependabot batches: SmartCRDT #77–80, quilt-swarm #31–35, quilt-cloudflare #18/#19, quilt #36/#37.

**Already merged 2026-10-05 18:46–18:47Z** (don't re-look for these): jev-quilt #50, #51, #52, #53 (all four R6 live batteries, run-3 through run-6), MicroMoth-quilt #44 (IonQ rung-2).

---

## 4. Lane-by-lane state

### 4.1 pong-quilt (playtest rounds) — ACTIVE, cron stopped mid-flight
- **Shipped through Round 96** (PR #118). Suite: 413 registered / 405 pass / 0 fail / 8 skips; live site checks 9/9 for five consecutive rounds.
- **R97 spec** (derived from R96's carried items — R97 had not been formally specced when crons stopped): (1) pulse-identity note in EXPERIMENTS.md (9th carrying), (2) judge-lane liveness [ops] (6th), (3) deploy-cadence lag WARN [ops] (5th), (4) prerun seal-state print — last --check-gate slice, (5) next [S] item from the R96 receipts. Re-derive from `docs/` receipts at round start.
- **Invariants the next builder MUST respect:** post-R50 canonical spine line is byte-exact (d(spine)/d(version) = 0); v1 draws ledger-appended with distribution regen + r76 TALLY-MATCH moved exactly once per round; site re-sealed BEFORE suite counts; FAIL-first pins on every build; receipt-audit must stay green (108+ claims); never push main (Casey-gated).
- **Ops notes:** judge lane dark 10 straight rounds (JEV 401 — Typesafe now revoked, so it stays dark until a new key + worker credential rotation); deploy lag was 99 commits at R96, named-not-a-finding; site `dist` seal can fire STALE-DIST on a stale workspace checkout — rebuild with `node tools/build-site.mjs` and reseal.

### 4.2 jev-quilt (R6 probe doctrine) — ALL WORK MERGED, decisions parked
- **Merged:** run-2 through run-6 live batteries (receipts 009–015), F4 event-fabrication offline probe layer (`tools/event_registry.py`), run-1 era pins. Everything record-only per doctrine 006 — **no thresholds or probes were ever applied to the gate.**
- **Findings waiting on Casey (all with live measurements in `docs/R6_RUN*_PROBES.md`):**
  - **F1 — substance gate:** ornate zero-fact affirmation ACCEPTs at 0.82–0.85 with substance 0.05–0.06. Five measurements, best-reproduced open finding. Proposed fix (substance gate) pending since 09-25.
  - **G1 — verdict mode lottery:** byte-identical inputs flip verdicts within one 90-second window (ACCEPT 3/REJECT 1/DISCUSS 1 on graft; ×6 zero-fact produced REJECT then ACCEPT ×5). Generalized beyond graft inputs. Single-shot verdicts uninformative; top-ranked structural fix = dedicated foreign-root probe.
  - **F4 — event fabrication:** convocation anchor fully WOKE (misq 0.87) on bytes that scored 0.03 thrice; felt-ness unstable 3 consecutive runs. Layer 2 (JEV noul + `max(misquote, event_fabrication)`) designed, NOT applied — Casey-gated.
- **Blocked:** any run-7+ battery needs a fresh `TYPESAFE_API_KEY`. With the key revoked, this lane is documentation-only.

### 4.3 MicroMoth-quilt (quantum cell-mapping) — SIM LANES COMPLETE
- **CELL-MAPPING fully merged** (#33–#42): FORGET shot-erasure, cell_receipts JSONL artifact driver, simulate() injected-RNG seam, seeded plumbing adoption (byte-identical, concurrency-pinned), VIEW cells. Suite 352/352 at merge.
- **IonQ ladder:** rung-1 (forbidden-sum discriminator 0.49815, ~500σ teeth) + rung-2 (sin² bridge exact at π; additivity 0.7494 vs 0.75; cancellation exact 0.0) **both on main** via #44. **Rung-3 (4–7q wsum/decoherence) is the spend rung — hardware-gated on IonQ credits + EFFECT/HARDWARE doctrine; do not attempt without Casey's go.**
- No API key needed for anything here (simulator-native).

### 4.4 quilt-tools (referral graph) — bookkeeping current, 3 PRs open
- Graph at **32 edges / 24 VERIFIED / 8 PENDING** (25/7 after #50 merges). View: 25 repos; fleet-murmur top at 12.3%, cot-jev-doctrine entered at 4.1%.
- Pins: 198/198 offline + 201/201 --live on current heads. Weight law: VERIFIED only when a merged PR in the TARGET repo cites the technique — never self-upgrade.
- Discovery scan status: 5 PENDING edges now hinted (#51); last sweep 0 committable candidates.
- External priors pinned in-graph: PoEM 2608.16032 (#52), DEI 2605.27130, ECT 2608.23623 (worth adding next pass), V-model 2609.31937 (worth adding), TMA-NM (write-time origin binding necessary — cite-not-build).

### 4.5 fleet-witness (witnessing study) — mechanisms built, service design-gated
- **Live:** L0 truncation/rollback/forgery detection; L2 anchor channel (checkpoints repo, `src/anchor.js`, live anchor receipted); operator notes; canonical signer seam (checkpoint.js v0.1).
- **In PRs:** L3 quorum mechanism (#7), truncate-demo sales artifact (#8).
- **Not built by design:** L3 witness *service* (daemons) — gated on extraction #4 + two always-on hosts. Nous v5.67: mechanism, not a witness network.
- Pin command for receipts: `node test/run.js` (there is NO package.json test script — `node --test test/` fails by command choice, recorded in receipts 012/pr7/pr8).

### 4.6 doubt-ledger — wave-4 docs family open (#16/#18/#19/#20)
- Adjudication-client build + receiptd hedge + consistency review + bone-registry adoption note. The qmr1 receipt-export work shipped earlier (wave-3 PR #4 merged, `tests/pins_qmr1.py` on `poc` branch — note default branch is `poc`, not `main`).

### 4.7 Smaller lanes
- **cot-quilt:** #1 JEV-doctrine adoption MERGED 10-04 — first inbound edge (jq-r6-probes→cot-jev-doctrine, edge #33 VERIFIED, in quilt-tools#49 merged).
- **constraint-theory-math:** #2 open (H⁰ dimension bound correction).
- **quilt-jev-toolkit:** #1 open (FB6 zeroclaw organ).
- **quilt-in-git:** #12 open (adsr envelope tool).
- **Extraction lane (coev):** extraction #1 shipped 09-28 (coev v0.1.0 public). #2 paced-seam shipped 09-28. INVENTORY.md ranks #3 quantum-audio honesty channel, #4 receipt/WAL generic subset (deferred — fleet formats stabilizing).
- **api-lab:** blocked-pending-Casey (z-lab env-var creds).

---

## 5. Decisions parked for Casey (explicit)

1. **F1 substance gate** — apply or not (5 live measurements back it).
2. **G1 structural fix** — foreign-root probe / voting scheme (mode-lottery evidence).
3. **F4 Layer 2** — JEV noul + max() integration (designed, receipt 010 hook booked).
4. **IonQ rung-3** — hardware credits spend (rungs 1–2 sim preflights PASS).
5. **spec-prereg repo** — empty repo created 10-04 for the micrograd-quilt spec-prereg extraction; push on Casey's word only (WATCH-ONLY until then).
6. **zero-msg-test synergy** — its harness Event ledger is a natural quilt-stone consumer; a plugin sealing wake-cycle decision chains would mint a VERIFIED edge into Casey's most-active lane. Cite-not-build until he opens it.
7. **Evolver repo** (born 10-05) — JEV-consumer prompt-evolution loop, watch-only, zero collision.
8. **Dependabot batches** — 12 PRs across SmartCRDT/quilt-swarm/quilt-cloudflare/quilt.
9. **Cron restart** — all 12 disabled by directive. Whether/when to re-enable is Casey's call (table in §2).

---

## 6. Frontier pins (external priors, cite-not-build unless noted)

| Item | ID | Why it matters |
|---|---|---|
| ECT — Evidence-Carrying Termination | arXiv 2608.23623 | Typed termination certs bound to receipt ledger + closed replay; 0/288 unsafe vs 252/288 critic. Strongest academic mirror of the receipts/witness lanes. |
| Verification as Architectural Layer | arXiv 2609.31937 (09-2026) | Deterministic controller enforces verdicts; memory written only by verification outcomes. Freshest verification-architecture paper. |
| PoEM — Proof-of-Execution Memory | arXiv 2608.16032 | HMAC-chained ledger of steps that actually executed. Org self-pinned via quilt-tools#52 (KS1–4 verified live). |
| TMA-NM (Louck, Jun 2026) | — | TLA+ machine-checked proof that **write-time origin binding is necessary** (68% laundering ASR otherwise). Formally validates fleet WAL doctrine. |
| DEI | arXiv 2605.27130 | Distributed Red Queen MAP-Elites w/ async champion gossip — extends DRQ pin; closest external mirror of breeding lanes. |
| SMSR | arXiv 2606.12703 | HMAC-signed provenance at memory-write; adjacent to fleet-witness signed notes. |
| MemGuard | arXiv 2608.21867 | Verifier-signal-persisted memory governance; cite-not-build. |
| OpenEvolve | arXiv 2604.12601 | Prompt-evolution commoditized externally (same shape as Evolver repo). |

Moat status (from edge-watch): receipts **enforcement gates** still have zero competitors; memory-architecture field consolidating (tidepool moat = witness semantics, holds); QD+LLM breeding commoditizing (moat = seeded bit-repro + receipts).

---

## 7. This host's local-only state (nothing else is lost)

- **Workspace repo** = `SuperInstance/micrograd-quilt`. Branch `fresh-audit-adoption` @ **bc7cab2 pushed tonight** (was 2 commits stranded: fresh-audit wrapper + pulse report + the key-revocation TOOLS.md commit). The workspace working tree is dirty with submodule pointers and cell env typechanges — **do not commit that noise**; the branch is the clean record. Wrapper: `scripts/fresh-audit-pr.sh` (selftest 3/3).
- **`/tmp` clones:** every committed byte is on GitHub (verified via `gh api repos/.../commits/<sha>`). Sole exception: `/tmp/dl/ledger/qmr1.py` — a superseded Oct-2 draft of the qmr1 export whose final form shipped as wave-3 PR #4 (`tests/pins_qmr1.py` on `poc`). Documented as discarded, not pushed.
- **`/tmp/discovery/`** harvest files: summaries already folded into `memory/2026-09-27.md`; raw files are re-derivable from the pulse crons if ever needed.
- **tmux:** only 2 unnamed idle bash shells (born Oct 3). The four scout lanes (s2b, s3-lens-hunter, s4-anychip, s6-quilt-gaps) died Sep 27 with the reboot; kickoff/launch files never persisted — nothing to relaunch, wave-2/wave-4 deliverable maps are complete.
- **AI-Writings is ~3.6GB — do NOT clone on this host** (OOM SIGKILL at depth 1); use the contents API.

---

## 8. Resume playbook (follow-up agents: start here)

1. **Merge the queue** (§3). pong-quilt family in order #114→#118 (or just #118); everything else independent. After merges, re-run `npm run check` + graph pins in quilt-tools to confirm counts.
2. **Work Casey's parked decisions** (§5) — F1/G1/F4 carry live measurements and are the highest-value unblockables; they need a fresh Typesafe key first.
3. **Next builds when queue re-opens:** pong R97 (spec in §4.1); MicroMoth rung-3 only on Casey's hardware go; extraction #3 (quantum-audio honesty channel); C1 scaling study, RSI deep-read, arcade-modular-refactor (all >15min epics, already ranked in the queue file); referral-graph external-prior nodes (§6).
4. **If re-enabling crons:** `openclaw cron enable <id>` from §2. Re-enabling snowball-report + edge-watch restores the autonomous loop; the playloop resumes rounds. Expect the cron-send-to-Casey limitation (messages noted, not sent).
5. **Standing rules** (from the queue file, still binding): Casey-gated merges; branch-or-it-didn't-happen; weight law; fresh-audit on every PR (pristine depth-1 clone, never the author's tree — R85 phantom-RED class); record-only doctrine for JEV findings (006); sub-15min chunks (arcade rule).

## 9. Key files map

| Path | What |
|---|---|
| `memory/snowball-queue.md` (this workspace) | Canonical queue — full done-log, NEXT section, rules |
| `memory/2026-09-27.md` | Harvest log (pulse papers/repos/analogues summaries) |
| `TOOLS.md` (this workspace) | Environment facts + credential states (updated for revocations) |
| `/tmp/edge-watch-latest.md` | Last full frontier scan (regenerate via edge-watch cron) |
| `scripts/fresh-audit-pr.sh` | Canonical pristine-audit wrapper (selftest 3/3) |
| Per-repo `docs/receipts/` | PRISTINE-audit receipts (jev-quilt 010–015, fleet-witness pr7/pr8/012, MicroMoth PRISTINE-AUDIT-RUNG*) |
| `SuperInstance/quilt-tools experiments/REFERRAL_GRAPH.md` | Referral graph seed + receipts |
