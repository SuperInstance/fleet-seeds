# Contributions study — who is pushing to SuperInstance (2026-09-28, lane 56-d)

Lane: 56-d (STUDY + TRIAGE). Question: *what is everyone contributing to the account, who is "everyone", and what should a next lane advance?* Keeper recon context (2026-09-28T21:1xZ, receipted in worklog 56-pre) is extended here with a full author census over the ~25 most recently pushed repos, per-repo reads, a prioritized advance-target list, and a deep triage of AI-Writings #38 (§5 — outcome: comment + evidence-close, NOT a merge; the merge is a provable no-op).

---

## 1. Method + API receipt

- Census frame: `GET /user/repos?sort=pushed&direction=desc&per_page=40&affiliation=owner` (HTTP 200), take the **top 26 by pushed_at** (cutoff = quilt-codespace-lab 16:39Z; #27-30 duke-lab / quilt-tools / tidepool noted but below cutoff). Raw: `scouts/raw/2026-09-28-contribs/repos.json`.
- Per repo: `GET /repos/SuperInstance/<repo>/commits?per_page=10`, ~1.1 s pacing. Raw payloads kept locally (not committed — bulky); **committed receipt is the sha-pinned compact digest** `scouts/raw/2026-09-28-contribs/census-commits-digest.json` (per repo: last ≤10 commits as {sha8, date, identity, msg-first-line}), plus `census_summary.json` (bucket rollups) and the small issue/PR/contents receipts.
- Classification buckets: `fleet` (our lanes: `fleet@superinstance.dev`, sandbox identity `Z User <z@container>`, `quilt-atlas bot <agents@superinstance.local>`, `SuperInstance DocBot <docbot@superinstance.ai>`), `casey` (principal: any "Casey DiGennaro" identity incl. `193104091+SuperInstance@users.noreply.github.com`, `casey@superinstance.dev`, `casey.digennaro@gmail.com`), `claude-agent` (`Claude <noreply@anthropic.com>`, GitHub login `claude`), `mavis` (`Mavis <superinstance@anthropic.com>`, `Mavis Agent <Mavis@agent>`, `mavis-bot <mavis@superinstance.dev>`), `dependabot`, `github-actions`, `other:CCC` (`CCC <ccc@fleet.local>` — UNIDENTIFIED), `other:kimi1` (`kimi1 <kimi1@cocapn.local>` — stranger).
- **Zero Search-API calls this lane** (all endpoints are core REST) — the 30 req/min search pacing rule never engaged; all calls paced ≥1 s anyway.

API call ledger (lane 56-d, api.github.com):

| # | calls | endpoint(s) | result |
|---|-------|-------------|--------|
| 1 | 1 | `GET /user` (token identity check) | 200 SuperInstance |
| 2 | 1 | `GET /user/repos?sort=pushed` | 200 (40 repos) |
| 3 | 26 | `GET /repos/.../commits?per_page=10` — **first batch** | **26× 401 — receipted failure**: token was sourced but not exported, so the child process saw no credential. Re-run only after `export`. |
| 4 | 26 | same, re-run | 26× 200 |
| 5 | 4 | AI-Writings `issues/38`, `branches`, `compare/main...canon-md`, `pulls?state=all` | 200 ×4 |
| 6 | 5 | AI-Writings `contents/CANON.md?ref=main`, `?ref=canon-md`, `issues/38/comments`, `commits/2dd73f47`, `commits/6fd1a351` | 200 ×5 |
| 7 | 8 | `fleet-canon` (repo), PuddnHead `/contents/`, qthe-verify `/contents/`, quilt `issues?open`, pong-quilt `issues/49`, SmartCRDT `issues?open`, cellforge `pulls?all`, cns-substrate `pulls?all` | 404 ×1 (fleet-canon does not exist on the account), 200 ×7 |
| 8 | 4 | duke-lab `contents/CANON.md`, quilt-live-canon (repo), PuddnHead `contents/thought1.md`, MicroMoth-quilt `issues?open` | 200 ×4 |
| — | **75** | subtotal through §5 analysis | includes the 26 honest 401s |
| 9 | 2 | AI-Writings: POST `issues/38/comments`, PATCH `issues/38` (state=closed, completed) | §5 |

**Total: 77 requests, of which 26 were wasted 401s (a process-hygiene lesson: `source .env` alone does NOT pass credentials to child processes — `export` or `set -a` is required).**

---

## 2. Census table (top 26 by pushed_at, 2026-09-28 ~21:2xZ)

Buckets are commit counts among the last ≤10 commits per repo. F = fleet, C = casey (principal), CL = claude-agent, M = mavis, D = dependabot, GH = github-actions, CCC = other:CCC, K = other:kimi1.

| repo | pushed (Z) | F | C | CL | M | D | GH | CCC | K | open iss. | what it is (one line) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MicroMoth-quilt | 21:21:32 | – | 6 | – | – | – | – | 4 | – | 2 | MicroQiskit fork + quilt receipts; keeper merged 5 fleet exp-receipt PRs today |
| AI-Writings | 21:21:05 | – | – | 8 | – | – | 2 | – | – | 1 | 2,786+ AI-authored pieces; claude agent running a play→find→fix loop |
| quilt-gpu-lab | 21:18:38 | 10 | – | – | – | – | – | – | – | 0 | fleet standing ML loop on REAL RTX 4050/WSL2 (X9 FALLS, D1 KILL, D2 KEEP) |
| PuddnHead | 21:12:53 | – | 3 | – | – | – | – | – | – | 0 | principal web-uploads of "thought" essays; no README |
| quilt-cloudflare | 21:11:13 | – | 5 | 2 | – | 2 | – | 1 | – | 0 | systemone proxy on Workers; claude added rate-component (M4); TS 6→7 major already merged |
| pong-quilt | 20:54:30 | – | 10 | – | – | – | – | – | – | 1 | keeper running R53→R57 coev rounds; #49 = erised-mirror gift issue |
| cellforge | 20:53:29 | 1 | 1 | – | 8 | – | – | – | – | 0 | Mavis-authored predictive-memory engine; our gift PR #1 merged by keeper |
| cns-substrate | 20:53:15 | 1 | 2 | – | – | – | – | – | – | 0 | cns-bridge substrate edition; our gift PR #1 merged by keeper |
| fleet-seeds | 20:07:50 | 10 | – | – | – | – | – | – | – | 0 | the fleet's seed/worklog repo (this doc's home) |
| mavis-essay-scout | 20:06:27 | – | 4 | – | – | – | – | – | – | 0 | mavis POC committed by hand by principal ("… POC, 2026-09-28") |
| quilt-jepa | 20:06:15 | 5 | – | – | – | – | – | – | – | 0 | latent-grid JEPA world model; round-5 11/11 |
| mavis-pincher-pages | 20:02:53 | – | 7 | – | – | – | – | – | – | 0 | mavis POC #2 (pages variant), principal-committed |
| mavis-pincher | 19:59:32 | – | 7 | – | – | – | – | – | – | 0 | mavis POC (wrangler/TS pincher service), principal-committed |
| qthe-verify | 19:42:26 | – | 1 | – | – | – | – | – | – | 0 | **empty shell: LICENSE only** — the real verifier lives in fleet-seeds/qthe-verify/ |
| jev-garden | 19:41:48 | 10 | – | – | – | – | – | – | – | 0 | living JEV training system; P-A9 serve law PASS |
| quilt-atlas | 19:30:15 | 8 | – | – | – | – | – | – | – | 0 | atlas regen bot (scheduled) + fleet audits; 4848-link true count |
| SmartCRDT | 18:58:52 | 3 | 1 | – | 4 | 2 | – | – | – | 3 | CRDT + federated-learning; gift-53 shamir-repair merged; 3 dependabot opens |
| pincher | 18:54:19 | 8 | 2 | – | – | – | – | – | – | 0 | dormant Rust repo, principal opened "glyph reflexes" proposal (#11) today |
| qthe | 18:10:50 | 10 | – | – | – | – | – | – | – | 0 | 8-bit ternary hyper-embeddings; e_q12 10/10, hermetic CRAB chain |
| quilt-research-canons | 18:05:20 | – | 1 | – | 5 | – | – | – | 1 | 0 | mavis-bot's ideation/research canon; kimi1 (stranger) 1 commit |
| glyphspace | 17:46:24 | – | 2 | – | – | – | – | – | – | 0 | NEW proposal: spatial reasoning over glyph grids |
| glyphcast | 17:46:21 | – | 2 | – | – | – | – | – | – | 0 | NEW proposal: glyph next-frame prediction (FAIL-first pins) |
| quilt | 17:38:27 | 2 | 5 | – | – | 2 | – | 1 | – | 2 | the doctrine hub; SYNERGY-1..8 open; TS major + key-scan PRs merged |
| coev | 17:37:35 | 3 | 2 | – | – | – | – | – | – | 0 | adversarial coevolution engine v0.1.0; both fleet gift PRs merged |
| fleet-hooks | 17:28:01 | 1 | – | – | – | – | – | – | – | 0 | fail-closed credential key-scan pre-commit (adopted into quilt #32) |
| quilt-codespace-lab | 16:39:48 | 9 | – | – | – | – | – | – | – | 0 | E-CS52-1 sealed PASS (attempt 8): consume @superinstance/qthe in a codespace worker |

**Identity totals across the sample (313 commit rows):** fleet **81** · casey **61** · mavis **17** · claude-agent **10** · dependabot **6** · other:CCC **6** · github-actions **2** · other:kimi1 **1**.

## 3. Identity map (who's who on the wire)

1. **Casey Digennaro (principal human)** — 61 commits. Commits under the `SuperInstance` login with the `193104091+` noreply email; also `Casey DiGennaro <casey@superinstance.dev>` (cns-substrate) and `superinstance <casey.digennaro@gmail.com>` (pincher). Role in the sample: **merger-in-chief** (merged every fleet gift PR presented today: cellforge #1, cns-substrate #1, SmartCRDT #75, coev #1+#2, MicroMoth-quilt #11-#14, quilt #30/#31/#32) **and** hands-on author (PuddnHead web-uploads, mavis-* POC scaffolds, glyphspace/glyphcast proposals, pong R53-R57 rounds, pincher glyph-reflexes proposal).
2. **Fleet lanes (us)** — 81 commits under four wire identities: `fleet@superinstance.dev` (gift PRs + quilt-gpu-lab loop + coev/fleet-hooks), `Z User <z@container>` (sandbox pushes: fleet-seeds, qthe, quilt-jepa, jev-garden, quilt-codespace-lab), `quilt-atlas bot` (scheduled regens), `SuperInstance DocBot` (pincher docs). Work kinds: standing experiment loops (gpu-lab, jepa, garden, qthe), gift PRs (all merged today), CI/infra seeds, audits.
3. **Mavis** — 17 commits, three identities: `Mavis <superinstance@anthropic.com>` (cellforge: versioned releases v0.3.0→v0.4.1, causal-consistency verdict on rewind), `Mavis Agent <Mavis@agent>` (SmartCRDT CI bumps), `mavis-bot <mavis@superinstance.dev>` (quilt-research-canons: round-1/2 ideation, fleet-state-report). Note the *anthropic.com* address: mavis is an Anthropic-hosted agent persona inside the principal's orbit, and its repos are hand-scaffolded by the principal.
4. **Claude (GitHub login `claude`, noreply@anthropic.com)** — 10 commits, and the hottest writer on the account: AI-Writings commits minutes apart 21:09→21:21 (S17 weakest-leaf audit → located a KV non-atomic budget race → close play→find→fix loop → systemize THE-WEAKEST-CLAIM-METHOD), plus quilt-cloudflare rate-component (M4) + honest threat model.
5. **dependabot** — 6 commits: TS **6.0.3→7.0.2 major** already landed on quilt-cloudflare (#15) and quilt (#31), plus patch/minor groups; 3 more dev-dep bumps open as SmartCRDT #71/#72/#74.
6. **CCC `<ccc@fleet.local>` — UNIDENTIFIED** — 6 commits on MicroMoth-quilt (4), quilt-cloudflare (1), quilt (1). A `fleet.local`-domained identity that is not any documented fleet lane identity. Needs principal confirmation (could be a sibling agent lane's git config).
7. **kimi1 `<kimi1@cocapn.local>` — stranger** — 1 commit on quilt-research-canons (round-2 ideation). Second external-agent identity on the account after the erised-mirror strand's issue-gift behavior on pong-quilt #49.
8. **github-actions[bot]** — 2 (AI-Writings automation).
