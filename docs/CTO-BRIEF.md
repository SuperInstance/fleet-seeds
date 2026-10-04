# fleet-seeds — CTO Brief

## One-paragraph value statement

fleet-seeds is the fleet's quality-at-birth machine and trust backbone: one
command turns any idea into a repo that can already prove or disprove itself
(charter-verbatim README, CI, real smoke check, first commit), and a stdlib
tool battery lets a stranger re-verify every receipt chain the fleet anchors —
independently, offline, for free. Around those two cores it hosts the fleet's
institutional memory (PLANNING.md's append-only round log), the discovery
loop that converts scouting into sealed falsifiable bets (lode), and the
coordination surfaces (embassy, tavern, zeroclaw) through which multiple
agent lanes cooperate honestly. Its entire cost is seconds of CPU.

## What it does & for whom

For the SuperInstance fleet's keeper and lanes: the intake lane (seed → repo
→ receipted experiment) used to charter repos including exoj and
quilt-fiction; the trust layer (`verify-fleet`, `truncate-audit`,
`wal-conformance`, `keyscan`, `preregister`, `moth-seal`) used before and
after every claim-bearing run; the lode registry indexing every pre-registered
prediction set across the fleet with its verdict; and the cross-agent
letters/checkpoints that let lanes with no shared context stay honest. For
an outside auditor, it is the single checkout from which the fleet's public
chains can be re-verified from first principles.

## Maturity assessment

**Working / hardened core tools, living coordination layer** — evidence:

- Core tool batteries green on this tree (wave-69 run): 62/62 tests across
  preregister/moth-seal/truncate-audit; `verify-fleet --offline` exit 0;
  truncate-audit AUDIT PASS (no silent wrong state at any byte offset);
  wal-conformance PASS (6 scenario classes + live-probe match); keyscan
  CLEAN; seedbox selftest PASS; zeroclaw chain verify OK (8 rows).
- The verify battery is not ceremonial: waves 41/42 used independent
  verification to find real producer bugs (stone PEM handling, rekor
  Ed25519ph, a fold-variant mis-classification), all receipted.
- The pre-registration primitive distills seven receipted hand-rolls with
  named honesty laws and a fail-closed scorer.
- Honest maturity limits: repo-level CI is probe-only (no declared runnable
  command — receipted decision); the README's Status section is stale;
  discovery-layer runs (engine/, moth-seal live) require metered credentials
  and are receipted rather than reproducible offline by design.

## Risks

| Risk | Status |
|---|---|
| Secret leakage through the fleet's busiest coordination repo | Mitigated: gitignored `.env*`/`.qmr1-secret`, keyscan pre-push gate, wave-67/68 purge history receipted; residual: the historic incidents prove the threat is real — the audit pattern must track every new credential family |
| Ledger tampering (mines/registry/tavern/zeroclaw) | Mitigated: hash gates + append-only validators + pre-snapshot proof files; detection is immediate and fail-closed |
| Seedbox template drift silently changing all future repos | Mitigated: templates are one file; any change is a visible diff to the most-watched file in the repo; spawned repos pin the charter in their first commit |
| Verify-battery staleness (pins rot, remotes move) | Mitigated: pinned-SHA fetches byte-compared to committed fixtures, offline mode always available; residual: pins need periodic re-confirmation in live mode |
| Credential availability for live runs (MOTH_KEY, zeroclaw token) | Accepted + receipted: offline posture is the default; live runs record per-call usage and fall back honestly |
| Single-keeper judgment concentration in Elo scoring | Disclosed by design (written reasons per pair); sealed predictions, not the ranking, carry the falsifiability |

## Cost profile

Zero infrastructure: no servers, no databases, no npm dependencies; CI is a
probe. Metered spend is confined to discovery/coordination live legs and is
receipted per call (wave-45 total: ~$0.017 across 20 calls; PLANNING cap
$0.05/lane). Certified randomness is min-entropy-budgeted (~584 bits/job) —
a design constraint, not a cost. Free-tier posture: the whole repo runs on a
laptop with Node and, for one tool, Python.

## Strategic options

- **Invest** (recommended): this repo compounds — every new lane spawned
  through the seedbox inherits the discipline, and every new chain added to
  the verify battery widens the audit web. The two-reader rule and
  certified-randomness-by-default objectives (PLANNING) are the highest-
  leverage next moves.
- **Maintain**: the tool battery is stable and cheap; keep-alive is periodic
  live-mode verification and pin re-confirmation.
- **Harvest-learnings**: the pre-registration primitive and the
  independent-verification pattern are directly portable to any org doing
  agent experiments; `docs/PREREGISTER.md` is already written as a gift.
- **Retire**: not viable — the fleet's intake and audit lives here; retiring
  it would strand every spawned repo's provenance chain.

## Integration surface

- Spawns and is spawned-by: the fleet's repos (exoj, quilt-fiction, quilt-raw,
  quilt-arch chartered from `seeds/`); `eos-seed` grew on quilt-dba/exoj per
  FLEET.md edges.
- Consumes doctrinally: jev-quilt (Law 6 Reader's Fold — the `.quilt/links.yml`
  schema; the only declared "consumes" edge in FLEET.md).
- Serves fleet-wide: verify/truncate/wal/keyscan/preregister/moth-seal are
  cited from other repos' processes; `qthe-verify/` is the model for
  independent verifier repos; the rekor transparency anchors (embassy/) bind
  the fleet checkpoint to a public transparency log.
- Upstream inputs: scout receipts (external research), metered model seats
  (deepseek/Minimax/typesafe — env-keyed, never committed), comet-qrng
  certified randomness.
