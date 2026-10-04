# fleet-seeds — Engineering Notes

## Architecture

One repo, four cooperating subsystems, all stdlib-only, connected by ledgers
rather than APIs:

```
                        ┌───────────────────────────────────────────────┐
  ideas (seeds/*.md) ──▶│ seedbox.mjs                                   │
                        │ seed.md ─▶ <repo>/ (charter+CI+smoke+commit)  │
                        └───────────────────────────────────────────────┘
                                     │ spawns lanes fleet-wide
                                     ▼
  ┌────────────────────── trust layer (tools/) ────────────────────────┐
  │ verify-fleet.mjs ── qthe stone chain / pong birth seal / VC        │
  │                     envelope (2 readers+KAT+tamper) / rekor fold   │
  │ truncate-audit.mjs  every byte offset, fail closed, no silent state│
  │ wal-conformance.mjs recover-to-prefix / apply-nothing semantics    │
  │ keyscan.mjs         credential-class scanner (staged/tree/files)   │
  │ preregister.mjs     seal → verify → score (E_CLAIMS_MODIFIED)      │
  │ moth-seal.mjs       certified randomness (comet-qrng-v1); mothbits │
  │                     whitening = registered fallback                │
  └───────────────────────────────┬────────────────────────────────────┘
                                  │ verdicts, seeds, mines
                                  ▼
  ┌──────────────────── discovery loop (lode/) ────────────────────────┐
  │ scouts/ → extract → Elo (scores.jsonl) → register (mines.jsonl,    │
  │ pred_sha256) → lane (PLANNING.md queue) → fold (registry.jsonl)    │
  │ lessons.jsonl feeds lane briefs; engine/ runs the metered legs     │
  └────────────────────────────────────────────────────────────────────┘
                                  │ letters, checkpoints, reflexes
  ┌──────────────────── coordination layer ────────────────────────────┐
  │ embassy/ (round letters, VC envelope/oracle, rekor transparency)   │
  │ tavern/  (multi-house prediction rounds, calibration batteries)    │
  │ zeroclaw/ (receipt-chained assistant; pincher reflex loop)         │
  │ deltas/  (FB line: organ custody, checkpoint/rewind specs)         │
  │ ledger/qmr1-store.jsonl (HMAC-chained producer store)              │
  └────────────────────────────────────────────────────────────────────┘
                                  │
                        PLANNING.md (append-only round log)
                        FLEET.md / graph.mmd (generated map)
```

Data flow in one sentence: seeds become repos; repos produce receipt chains;
the trust layer re-verifies the chains independently; the lode converts scout
receipts into sealed, scored, priced bets; verdicts fold back into the
registry; PLANNING.md carries the arc; embassy/tavern/zeroclaw coordinate the
agents doing the work.

## Invariants

- **Append-only ledgers** — enforced by `lode/scripts/lode_validate.mjs`
  (schema + `pred_sha256` + duplicate-id + monotone ts; exit 2 fail-closed;
  `--against <old-copy>` proves byte-prefix append-only across commits).
  Same discipline in `registry.jsonl`, `lessons.jsonl`, `tavern_ledger.jsonl`,
  the zeroclaw journal (fnv1a-64 chain re-verified by `zeroclaw.py verify`),
  and `ledger/qmr1-store.jsonl` (HMAC id chain; producer refuses on mismatch).
- **Sealed-before-run** — `tools/preregister.mjs` binds metric+threshold
  verbatim; the scorer evaluates exactly what was sealed; vacuity is
  receipted (VACUOUS/PENDING), never silently passed; verdicts are pure
  functions of (claims, seal, results) with no wall-clock inside verdicts.
- **No silent wrong state** — `truncate-audit.mjs` proves every chain fails
  closed at every byte offset (verified: 9242/9242, 1299/1299, 3242/3242,
  1904/1904 offsets at adoption; `AUDIT PASS` re-confirmed in wave-69); the
  annotation-tail probe pins that tip-only pinning would be silent — the
  links pin is load-bearing.
- **Independent verification** — verify-fleet's verifiers share no code with
  the producers (own stone-v1, own RFC 9162 fold); every remote byte is a
  pinned SHA with byte-equality receipted against committed fixtures.
- **Certified-bit integrity** — moth-seal stream=direct draws only from
  certified bytes and fails closed on exhaustion (~584 bits/job ⇒ pool
  bound ≈ 37); graph-v1 raw is NOT a QRNG (top-20 truncation receipted) and
  only ever appears behind `--fallback` with the registered whitening recipe.
- **Kill criteria (PLANNING, non-negotiable)** — prediction-after-result ⇒
  VOID; verdict without raw receipts ⇒ VOID; metric redefinition mid-series ⇒
  VOID + correction receipt; un-whitened runs where required ⇒ quarantined;
  spend without per-call receipts ⇒ VOID.

## Failure modes & blast radius

- **Tampered ledger row** — validators refuse (`E_*`/exit 2); blast radius:
  that ledger's writes stop until resolved. Detection is the product.
- **Tampered sealed claims** — `E_CLAIMS_MODIFIED` at score time; blast
  radius: one registration; the ritual forces a new registration.
- **Chain truncation / corruption (power yank)** — truncate-audit shows every
  offset fails or verifies as an honest prefix (`--torn-ok` semantics receipted
  per chain); blast radius bounded to the torn tail; WAL semantics documented
  per frame (jsonl vs document) including the honest partials (pong `seq`
  0-based; len-1 newline cut non-durable at the JSONL framing layer).
- **Randomness shortage** — moth-seal stream=direct exits rather than
  inventing bits; blast radius: one run aborted, nothing poisoned.
- **Secret leak attempt** — keyscan exits 1 naming file/line/class without
  printing material; blast radius: a blocked push. Historic incidents (wave-45
  `.env` clobber, wave-68 old-key exposure in the monorepo) are receipted in
  the journal/embassy logs and drove the widened class scanner.
- **CI misconfiguration** — forge.yml probe-only guards against the receipted
  startup_failure class (missing required input); per-tool tests remain the
  real gate, run by lanes pre-push.
- **Live fetch drift** — verify-fleet live mode byte-compares fetched bytes
  to fixtures; a moved/changed origin fails loudly instead of silently
  re-verifying against mutated bytes.

## Performance & cost envelope

- All trust-layer tools are offline-capable and key-free: `verify-fleet
  --offline` exit 0 (measured, wave-69), `truncate-audit` exhaustive pass and
  `wal-conformance` PASS both run in seconds on laptop-class hardware
  (measured in this verification pass; exact wall-times not separately
  receipted — labelled estimate from the same runs).
- `node --test` over the three core tool batteries: 62 tests, ~2.6 s
  (node's own duration output: 2579 ms), measured wave-69.
- Metered costs live in the discovery/coordination layer and are receipted
  per call: the wave-45 embassy log records 20 calls ≈ $0.017 total across
  five lanes, with the honest starvation finding (reasoner seat: 0/96 claims
  answered at max_tokens 4000 — reasoning tokens consumed the budget). PLANNING's
  kill criteria cap lane spend at $0.05.
- moth-seal economics: ~584 certified bits per comet job (min-entropy-limited
  by design; requested 512 B delivered ~73 B) — a structural budget, not a
  performance bug.

## Operations

- **Local**: everything in USER-GUIDE; no services, no daemons. Node ≥ 18,
  Python 3 for zeroclaw, `gh` CLI only for zeroclaw `cite git:`.
- **CI**: single probe workflow (forge.yml, probe-only) — deliberately no
  runnable command declared; lanes run tool batteries locally before push.
- **Credentials model** — names only in tree: `MOTH_KEY` (comet-qrng bearer;
  or a file path via `MOTH_ENV`), zeroclaw's Minimax token from `/root/.env`
  (never printed), `.qmr1-secret` (HMAC key for the qmr1 store; created chmod
  600 on first run; gitignored). Values never committed; `keyscan.mjs staged`
  is the pre-push gate; the fleet's audit history (waves 67/68) is receipted
  in the journal, including the lessons that hardened `.gitignore` first and
  re-audited after any history rewrite.
- **Cross-repo ops**: `.quilt/links.yml` → `quilt-links.mjs` regenerates the
  README cross-pollination block and the whole-fleet map; qthe-verify/
  demonstrates the two-reader ideal as a standalone repo.

## Design decisions & why

1. **Scaffold at birth, not retrofits** (repo thesis, Tasks 22/23-d): CI +
   smoke + charter cost nothing before the first line of feature code and a
   great deal after. The seedbox exists because the alternative — good
   intentions per lane — measurably produced "a script with no receipt".
2. **One pre-registration primitive instead of seven hand-rolls**
   (`docs/PREREGISTER.md` census): the wave-66 seed-DNA census found the same
   contract implemented 7+ ways; distilling it made the honesty laws
   (no threshold surgery, receipted vacuity, pure-function verdicts,
   fail-closed tamper detection) uniform and testable.
3. **Verification shares nothing with production** (`tools/lib/` verifiers):
   waves 41/42 found real bugs precisely because independent readers
   disagreed with producers (stone PEM-string, rekor Ed25519ph, the fold
   variant mis-classification). Independence is the property that finds bugs.
4. **Fail-closed over forgiving, everywhere**: truncate-audit's law ("no
   silent wrong state"), lode's exit-2, moth-seal's exhaustion exit,
   qmr1-bridge's HMAC refusal. The fleet optimizes for never-lying, not
   never-failing.
5. **Elo over blind panels for mine triage** (lode stage 3): disclosed keeper
   judgment with written reasons, deterministic scorer — chosen honestly
   documented subjectivity over a pretense of blind objectivity, with the
   sealed predictions supplying the actual falsifiability.
6. **Probe-only CI with an honest no-op `test-cmd`**: after the receipted
   startup_failure (missing required workflow input), the repo declares "no
   runnable command yet" rather than shipping a fake green check — the
   receipts-first doctrine applied to CI itself.
