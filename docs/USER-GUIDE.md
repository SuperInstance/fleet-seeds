# fleet-seeds — User Guide

## What you get

fleet-seeds is two things in one repo. First, the **seedbox**: an intake
machine that converts a seed markdown file (an idea with a question) into a
rigorous experiment repo — charter README, package.json, GitHub Actions CI, a
real smoke check, and a first git commit — in one command, so every fleet repo
is born with its spine. Second, the fleet's **shared registry and toolbox**:
the command that re-verifies every public receipt chain the fleet anchors
(`verify-fleet.mjs`), the one pre-registration primitive distilled from seven
hand-rolled schemes (`preregister.mjs`), a certified-randomness sealing
service (`moth-seal.mjs`), the lode discovery loop (mines, Elo scoring,
registry), the cross-agent embassy letters, the tavern prediction rounds, the
zeroclaw reflex assistant, and the fleet's living plan (`PLANNING.md`) and map
(`FLEET.md`).

## Install

```bash
git clone https://github.com/SuperInstance/fleet-seeds
cd fleet-seeds
node --version        # >= 18; nothing to install (stdlib only)
python3 --version     # only needed for tools/zeroclaw/
```

There is no `npm install`, no root package.json, no build. Each tool is a
standalone file (or directory) that runs on Node's standard library.

## First success in 5 minutes

Spawn a repo from a seed and watch it self-verify:

```bash
printf '# my seed\n\nDoes X beat Y under paired arms?\n' > /tmp/my-seed.md
node seedbox.mjs /tmp/my-seed.md my-experiment
cd my-experiment && node smoke.mjs && git log --oneline
# SMOKE OK (3/3 checks)
# <sha> seed: charter committed verbatim — the question is the first receipt
```

Your new repo already has: the seed embedded verbatim as "charter of record",
the five-law lane doctrine, `package.json` (smoke script), `.github/workflows/smoke.yml`
(CI on every push), a real `smoke.mjs`, `outputs/`, and one commit. Then run
the fleet's trust command from the parent repo:

```bash
cd .. && node tools/verify-fleet.mjs --offline; echo "exit=$?"
# ...  exit=0   (all four chains + VC envelope verify from committed fixtures)
```

## Everyday usage

### 1. Spawn a repo per seed (the intake lane)

```bash
node seedbox.mjs seeds/seed-arch.md quilt-arch    # from this directory; CWD-relative!
node seedbox.mjs --selftest                        # full lifecycle test, cleans up after itself
```

The spawned repo's README contains the seed verbatim plus the doctrine:
paired arms, decision rules before the run, counterfactual measurement,
honest negatives, replayable smoke.

### 2. Verify the fleet's chains (one command)

```bash
node tools/verify-fleet.mjs --offline          # CI posture: committed fixtures only
node tools/verify-fleet.mjs                    # live: fetches PINNED raw URLs (no keys needed)
node tools/verify-fleet.mjs --out=/tmp/v.json  # also write the JSON verdict
node tools/verify-fleet.mjs --qthe-dir=/path/to/qthe   # local clone instead of pinned fetch
```

Exit 0 iff ALL chains verify: the qthe stone chain, the pong-quilt birth
seal, the VC envelope (both reader flows + KAT + tamper controls), and the
rekor inclusion proof folded with the tool's own RFC 9162 implementation.

### 3. Pre-register a prediction set (the one primitive)

```bash
node tools/preregister.mjs help     # the ritual: claims BEFORE the experiment
node tools/preregister.mjs seal <claims.json>       # sha256-seal the claims
node tools/preregister.mjs verify <claims.json> <seal.json>
node tools/preregister.mjs score <claims.json> <seal.json> <results.json>
```

The scorer is a pure function of (claims, seal, results); any post-hoc edit
of claims fails with `E_CLAIMS_MODIFIED`; vacuous claims score VACUOUS, never
PASS. Full doctrine: `docs/PREREGISTER.md`.

### 4. Seal registered randomness for an experiment

```bash
node tools/moth-seal.mjs --n=16 --pool=1134 --label=my-registration   # DEFAULT stream=direct
node tools/moth-seal.mjs --n=16 --pool=1134 --label=my-registration --stream=prf
```

Without `MOTH_KEY` (env or the `MOTH_ENV` file) both fail closed with
`FAIL-CLOSED — no MOTH_KEY … refusing to run keyless` (observed in wave-69);
a real seal also requires network access to the comet-qrng engine. Existing
certification receipts live in `playtest/wave45/` and `tools/wave46/`.

### 5. Mine the lode (discovery loop)

```bash
node lode/scripts/lode_validate.mjs            # fail-closed schema/hash/append-only check (exit 2 on violation)
node lode/scripts/lode_score.mjs               # the Elo tournament over mines
```

Read `lode/PROTOCOL.md` for the six stages and their laws; `lode/mines.jsonl`
(hypotheses with sealed `pred_sha256`), `scores.jsonl` (pairwise judgments
with written reasons), `registry.jsonl` (every fleet prediction set + verdict),
and `lessons.jsonl` (structured lessons) are the loop's state.

### 6. Audit for secrets before pushing

```bash
node tools/keyscan.mjs staged         # scan git diff --cached (pre-commit hook pattern)
node tools/keyscan.mjs tree HEAD      # scan the whole tree at a ref
node tools/keyscan.mjs files f1 f2    # explicit files
```

Exit 0 = clean (or allowlisted doc-class hits, printed for eyeballing); exit 1
= credential-class hits — do not push. It never prints the secret material.

### 7. Run the zeroclaw reflex assistant

```bash
python3 tools/zeroclaw/zeroclaw.py verify          # recompute the receipt chain, print tip
python3 tools/zeroclaw/zeroclaw.py cite tip:<sha>  # verify one citation in its own channel
```

`run` needs the Minimax token (read from `/root/.env`, never printed);
`cite git:<sha>` needs the `gh` CLI installed.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `seedbox.mjs` created the repo in an unexpected place | Spawn is CWD-relative (journal Task 23-d incident) | `cd` to the intended parent first |
| `seedbox.mjs: <dir> already exists — pick another slug` | Refusal to overwrite (by design) | Choose a new slug or remove the old dir yourself |
| `verify-fleet.mjs` live mode can't fetch | Offline environment or moved raw URL | Use `--offline` (fixtures are committed); all pins are receipted in the tool header |
| `preregister.mjs score` errors `E_CLAIMS_MODIFIED` | Claims file changed after sealing | This is the tool working; re-run from the sealed original or write a NEW registration |
| `moth-seal.mjs` exits on stream exhaustion | `--stream=direct` fail-closed: pool too big for ~584 certified bits | Use `--stream=prf`, or shrink the pool (feasible bound ≈ N ≤ 37) |
| `qmr1-bridge.mjs` refuses with `E_BAD_SIGNATURE` | Missing/mismatched `.qmr1-secret`, or a forged/altered ledger row | Restore the local secret (never committed); if the ledger is genuinely tampered, that is an incident, not a tool bug |
| `zeroclaw.py cite git:…` throws `FileNotFoundError: 'gh'` | The `gh` CLI is not installed | Install gh, or cite via `tip:`/`seal:`/`row:` forms which verify locally |
| `keyscan.mjs` exit 1 | Credential-class match (e.g. `gsk_…`, `sk-…`) | Do not push; remove the secret, rotate the key, re-scan |
| A test run errors on `node --test tools/` (directory mode) | Directory-mode test invocation broken on node ≥ 22 | List the `.test.mjs` files explicitly (see Onboarding commands) |

## FAQ

**What exactly is a "seed"?** A markdown file holding one question and enough
context to test it. It becomes the spawned repo's *charter of record*, quoted
verbatim in the first commit and never edited afterward — so "why does this
repo exist" is always answerable from the repo itself. Real examples:
`seeds/seed-grok2.md` (became exoj), `seeds/seed4.md` (became quilt-fiction).

**Why is there no `npm test` at the repo root?** fleet-seeds is a toolbox, not
a package: each tool carries its own `*.test.mjs` battery (62 tests across the
core tools), and repo-level CI is an honest probe (`forge.yml` declares no
runnable command yet — receipted in the YAML itself). Run the batteries with
explicit `node --test tools/<tool>.test.mjs` invocations.

**Is `verify-fleet.mjs` live mode safe to run without keys?** Yes — it uses no
credentials at all. Every network fetch is a pinned-SHA raw URL whose bytes
are compared to committed fixtures, and the one check that needs a key
(rekor log key pinning) is deliberately skipped offline with an honest
receipt. The tool's philosophy: a stranger re-verifies everything from first
principles, sharing nothing with the producers.

**What is the lode?** The fleet's discovery loop: scout sources (raw receipts
committed), extract the deeper abstraction, score mines by pairwise Elo
(disclosed keeper judgment with reasons), register only falsifiable sealed
predictions, lane the top bets into the next wave, and fold verdicts back
into `registry.jsonl`. It is not a leaderboard of truth — the registry records
what was predicted and what happened.

**Can I add a new tool here?** Yes — that is what the repo is for. Follow the
house pattern: stdlib-only, zero dependencies, a `*.test.mjs` battery, a
header comment stating what it proves and its fail-closed behaviour, and
(preferably) a pre-registration in `tools/wave<N>/` for any exhaustive run.
See `tools/WAVE45.md` for the discipline in action.

**Where do the embassy letters go?** `embassy/round-<N>/letters/` holds
cross-agent letters between lanes (rounds 34–45 plus wave logs); `embassy/`
also hosts the VC envelope/oracle signing machinery and the rekor
transparency anchors (`embassy/transparency/`).
