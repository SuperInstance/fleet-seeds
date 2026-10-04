# fleet-seeds — Agent Onboarding
> Zero-shot entry point. Clone → competent in ~10 minutes.

## Identity (2 sentences)

fleet-seeds is the fleet's **intake lane**: `seedbox.mjs` turns a seed
markdown file into a fully scaffolded, charter-versioned, CI-wired experiment
repo in one command, so rigor is applied at birth when it is cheapest. The
repo is also the fleet's registry home — it hosts the cross-chain verification
battery (`tools/verify-fleet.mjs`), the pre-registration primitive
(`tools/preregister.mjs`), the certified-sampling service (`tools/moth-seal.mjs`),
the lode discovery loop (`lode/`), the cross-agent embassy (`embassy/`), and
the fleet's long-arc plan (`PLANNING.md`) and map (`FLEET.md`).

## Why it exists (the fleet problem it solves)

The fleet's hardest-won lesson is that *starting* is where quality dies: a
question with no scaffold becomes a script with no receipt, becomes a claim
with no number. Chartered in wave-22/23 (Task IDs 22, 23-d), the seedbox makes
the starting state rigorous by default — CI on the first commit, a real smoke
check before any feature code, the seed itself versioned verbatim as the
charter of record. Since then the repo accreted the fleet's shared
infrastructure: waves 43–46 added the verify/audit/randomness tool battery;
wave 59+ added the lode mining loop (scout → extract → score → register →
lane → fold); wave 67 distilled seven hand-rolled pre-registration schemes
into one primitive; recent waves added zeroclaw (a reflex-engine assistant on
hash-chained receipts) and the deltas/ organ-custody line.

## Verify it works (exact commands)

All commands below were executed against this tree during wave-69 and pass.
Node ≥ 18; Python 3 only for zeroclaw. **No npm dependencies, no root
package.json — the repo is a battery of standalone stdlib tools.**

```bash
node seedbox.mjs --selftest            # spawns a demo repo, runs its smoke, cleans up → PASS
node --test tools/preregister.test.mjs tools/moth-seal.test.mjs tools/truncate-audit.test.mjs
                                       # 62 tests, 14 suites → 0 fail
node tools/verify-fleet.mjs --offline  # exit 0: all four fleet chains + VC envelope verify from committed fixtures
node tools/truncate-audit.mjs          # every chain fails closed at every byte offset → AUDIT PASS
node tools/wal-conformance.mjs         # recover-to-prefix / apply-nothing semantics → PASS
node tools/keyscan.mjs staged          # secret-class scanner → CLEAN (exit 0)
python3 tools/zeroclaw/zeroclaw.py verify   # zeroclaw receipt chain → CHAIN OK, prints tip
```

Things that CANNOT run without credentials you will not have — the docs say
so and the code fails closed:

```bash
# tools/moth-seal.mjs needs MOTH_KEY (comet-qrng-v1, network); reads env or the
# MOTH_ENV path. Live runs are receipted in playtest/wave45/ and tools/wave46/.
node tools/moth-seal.mjs --help        # usage works offline; a real seal does not
# tools/qmr1-bridge.mjs (lode producer) needs the local .qmr1-secret (chmod 600,
# gitignored, NEVER committed); run bare it refuses with E_BAD_SIGNATURE (observed).
# zeroclaw 'run' needs its token from /root/.env; 'cite git:<sha>' shells out to
# the gh CLI (absent in this container — FileNotFoundError observed).
# node tools/verify-fleet.mjs (LIVE mode, no flag) fetches PINNED raw URLs over
# the network; offline mode (--offline) is the credential-free contract, and even
# live mode uses no keys (pinned SHA URLs; the rekor log key check is an honest
# offline skip — see the tool header).
```

## Reading order (paths, not vibes)

1. `README.md` — the one idea (seed → repo → receipted experiment), the
   protocol, and the quilt cross-pollination block. Note its "Status" section
   is stale (written before the seeds arrived; `seeds/` is now full).
2. `seedbox.mjs` — 108 lines; the entire intake mechanism. Read `CHARTER`:
   the lane doctrine every spawned repo inherits.
3. `PLANNING.md` — the long arc: mission, instruments inventory, objectives
   roadmap, kill criteria, and the round-by-round log (Rounds 45–83+).
   This is the fleet's memory of *why*.
4. `lode/PROTOCOL.md` — the discovery loop with its fail-closed laws.
5. `docs/PREREGISTER.md` + `tools/preregister.mjs` — the fleet's one
   pre-registration primitive and the census of the seven hand-rolls it
   distills.
6. `tools/verify-fleet.mjs` header — what "a stranger can independently
   re-verify everything" means operationally (pinned SHAs, own rekor fold).
7. `FLEET.md` — the generated fleet map (17 repos, 27 edges).

## The things that will bite you (gotchas)

- **No root package.json, and repo-level CI is a probe.** `.github/workflows/forge.yml`
  runs `probe-only: true` with an honest no-op `test-cmd` (the missing required
  input killed the workflow once — receipted in the YAML comment). Per-tool
  self-tests are the real verification contract; there is no `npm test` here.
- **`seedbox.mjs` spawns CWD-relative.** Run it from the directory where you
  want the repo, or your repo lands elsewhere (this exact incident is
  receipted in journal Task 23-d: quilt-fiction spawned under the wrong parent).
- **`seedbox.mjs` refuses to overwrite** an existing directory — pick another
  slug (the error is deliberate).
- **`--selftest` makes a real git commit** in a temp dir it then deletes; run
  it anywhere, but know it shells out to `git init`/`git commit` with a pinned
  identity (`fleet-seedbox <fleet@seedbox>`).
- **The lode ledgers are append-only with hash gates.** `mines.jsonl` rows
  carry `pred_sha256`; `scripts/lode_validate.mjs` exits 2 on any schema/hash/
  monotonicity violation; a mine is never edited, only superseded
  (`supersedes: <id>`).
- **`tools/qmr1-bridge.mjs` is a producer, not a viewer** — it appends to
  `ledger/qmr1-store.jsonl` and refuses the write unless the chain verifies
  against the local secret. Do not run it casually.
- **zeroclaw citation tokens are channel-typed.** Bare 64-hex is REFUSED
  (three hash families share that surface); use `git:`/`tip:`/`seal:`/`fp:`/
  `row:` forms. `cite git:` requires the `gh` CLI.
- **The README Status section is stale** ("waiting on seed files") — the seeds
  arrived and spawned repos (exoj, quilt-fiction, quilt-raw, quilt-arch, …);
  trust `seeds/` and the journal over that section.
- **Embassy logs discuss keys and spend.** They record *incidents* (e.g. the
  wave-45 `.env` clobber) and per-call usage receipts; no key material lives
  in the tree — `.qmr1-secret` and `.env*` are gitignored (verified with
  `git check-ignore`).

## Where deeper knowledge lives

- Knowledge map: [docs/KNOWLEDGE-MAP.md](./KNOWLEDGE-MAP.md)
- Fleet journal: SuperInstance/superinstance-lab → worklog.md (grep
  'fleet-seeds'; Task IDs 22, 23-d, 24, 48, 49, 60-engine, 61, 63-f, 63-d-r,
  63, 64, 65, 66-b, 68-a touch this repo).
- `tools/WAVE45.md` — the wave-45 tool receipts (pre-registrations committed
  before the exhaustive runs).
- `playtest/wave41…wave46/` — the interop-web and tool-adoption playtests.
- `lode/lessons.jsonl` — structured lesson objects (claim, evidence, failure
  class) that lane briefs cite.
- `seeds/readme.md` — "What Ports": the 63-line geometric seed-philosophy text.

## Current frontier (what is open right now)

- **FB-line deltas**: the recent `deltas/` docs (FB2 first synapse, FB6 organ
  custody, FB6-v2 checkpoint/rewind — zeroclaw v0.8 shipped at commit 3931efb)
  define the open reflex-organ work: the pincher↔zeroclaw loop is live and
  the next moves are specified in the delta files themselves.
- **Live-seat chambers**: the round-45 finding that the deepseek-reasoner seat
  starves on bred claims (0/96, reasoning-token starvation, receipted as
  NON-INTERPRETABLE) still needs a thinking-disabled seat or per-claim
  micro-batches (PLANNING near-arc item 1).
- **Two-reader rule** (PLANNING mid-arc item 7): every chain verified by
  tooling in ≥2 repos — partially done (qthe-verify is the exemplar), not
  yet universal.
- **Certified randomness as default fleet-wide** (long-arc item 12):
  `moth-seal.mjs` exists and is receipted, but lanes still fall back to
  mothbits whitening more often than the long arc wants.
