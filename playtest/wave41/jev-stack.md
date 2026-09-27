# Playtest: JEV stack (jev-quilt @ 30e431b, jeviter @ b8c5801, substrate-llm-client @ c31b32d)

Lane 41-c (jev-playtester), wave 41, quilt/murmur-protocol. Research + playtest only; zero writes
to foreign repos; 4/8 paid typesafe calls used, every wire row receipted AS SAID.

Dedicated clones (created this lane, HEAD SHAs recorded at clone time):
| clone | repo | HEAD SHA | last commit |
|---|---|---|---|
| `/home/z/my-project/download/pt-jev-quilt` | SuperInstance/jev-quilt | `30e431b8858d29729b5a27967961242dfe563263` | Merge #46: G20c Rust deposit reader (2026-09-27) |
| `/home/z/my-project/download/pt-jeviter` | SuperInstance/jeviter | `b8c5801476d3c07a1a3df6736c97cfef38c8fad5` | Merge PR #15 strict-kl-and-descent-path (2026-09-27) |
| `/home/z/my-project/download/pt-substrate-llm-client` | SuperInstance/substrate-llm-client | `c31b32d8c244a69b180dd600325525bc95c1e2f8` | Cleanup gitignored artifacts (2026-09-24) |

Prior art held fixed: `fleet-seeds/tavern/jev_protocol_recon_r8.md` + `jev_remap_r9.md`
(3 question types on `POST /v1/systemone`; noul carries NO confidence field; 10-level score
ceiling via 400; $42/Btok input / output free; jev-preview == jev-latest == jev-1.13.0).

## Setup

- Node v24.21.0, Python 3.12.14, pytest present but jev-quilt is stdlib-unittest by design.
- `TYPESAFE_API_KEY` present in `.env`; `DEEPSEEK_API_KEY` absent; `TYPESAFEAI_KEY` absent
  (matters: two of jev-quilt's test gates key on the exact env NAME — see P8).
- Live wire receipts: `playtest-wave41/jev-quilt-live-rows.jsonl` (4 rows: request body,
  response body, latency, `x-typesafe-request-id`; Authorization header never captured).
  Runner script: `/home/z/my-project/scripts/41c-jevquilt-live.py` (passive tee on urlopen —
  the request is theirs, the receipt is ours, zero extra calls). Mock runner:
  `/home/z/my-project/scripts/41c-substrate-mock.mjs` (zero paid calls).

## What works (receipts per repo)

### jev-quilt — suite 249 tests, OK (6 skipped, 2 expected failures), 37.5s
- `python3 -m unittest discover -s tests -p 'test_*.py' -t .` — green on first run, no flake.
- Skips are all governed: 4 registered in `tests/KNOWN_SKIPS.md` (an unregistered skip fails
  their suite — enforced by `test_known_skips_registry.py`) + 2 from `test_integration_typesafe`
  (gated on `TYPESAFEAI_KEY`, which is unset). Zero live calls fired during the suite run
  (verified: `test_jev_oracle.py` has no TestCase classes; the live oracle battery only runs
  via `__main__`).
- Live wire (4 calls, receipts in JSONL): their `TypeSafeBackend.decide_batch` speaks EXACTLY
  the r8/r9 wire — body `{model, state, questions:{name:{type,instructions,criteria}}}`;
  choice criteria dict, score criteria ordered list, noul instructions-only. `jev-latest`
  resolved to `jev-1.13.0` on every 200. `usage` = `{input_tokens, output_tokens}`; their
  meta parse is correct.
- **Noul missing-confidence: HANDLED in code** — wire returned `{type, noul}` only (1/1 batch
  row + 14/14 oracle rows, zero confidence fields); their fallback `confidence = value` fires
  (receipted: conf=0.27 == value=0.27). The code is right; the DOCS are wrong (P6).
- **11-level score 400: HANDLED** — raised their `RuntimeError("typesafe-api: HTTP 400: ...")`
  with the vendor detail byte-preserved:
  `{"detail":"Too many score levels. Must have at most 10 levels."}` — byte-identical to the
  r8/r9 receipted detail string. 10-level ceiling re-confirmed through their client.
- Batch repeat (byte-identical request): noul Δ0.01, score Δ0.01, choice modal same,
  confidence Δ0.00, usage identical (449/75 both calls) — inside r9's ≤0.04 repeat-variance.
- Production oracle end-to-end (`jev_oracle.validate`, 14-noul battery in ONE call, 1848 in /
  293 out tok, 241ms): canonical text → "ACCEPT — strong canonical alignment" (alignment 0.95,
  misquote 0.028, voice 0.93). The ACCEPT/REVIEW/DISCUSS/REJECT ladder works.

### jeviter — suite 85/85 pass, 0 skip, 0.61s
- `npm test` (node --test), zero dependencies, deterministic. 90 `test()` blocks across 10
  files; the runner reports 85 (subtest counting).
- Headless: YES via CLI and library. `stdin digest` mode is the bounded headless surface —
  receipted: `printf 'alpha×3 beta×2 gamma' | node src/cli.js - --ledger ...` → 7 pulls,
  2 events (only the shape-changes surfaced), silences booked, exit 0.
- `scan` verifies the fnv1a-64 hash chain — receipted on a 150,298-row ledger: "CHAIN VERIFIED",
  pattern-naming works ("QUIET — receipted quiet, not a hang").
- Cross-repo canary: jeviter pins `fnv1a64("café Δ 日本語") === 0x24a555471370b18d` — same
  contract as jev-quilt's Bookkeeper vectors and substrate-llm-client's `verify_canary()`.
  Ledger receipts cross-verify across the fleet's repos byte-one.

### substrate-llm-client — suite 5/5 pass, 0.21s
- `npm test` (node --experimental-strip-types), zero network. Canary tests pin the fleet
  fnv1a-64 vectors correctly. Provider-map + content-hash cache keys are sane bones.
- `verify_canary()` → true (receipted in mock run).
- That is where the good news ends — see P1/P2.

## Findings

**P1 — substrate-llm-client's "JEV gating" is not JEV.** `computeJev(content, messages) =
0.65 + ((hashKey(content) ^ hashKey(messages)) % 300)/1000` — a hash roll with ZERO wire
contact: no `/v1/systemone`, no typesafe provider type (ProviderConfig is OpenAI
`/chat/completions`-shaped only). Mock receipts: canonical substrate line scored **0.644**,
filler text scored **0.745** — anti-correlated with quality by construction. Bonus bug: the
returned 0.644 is BELOW the documented/tested [0.65, 0.95] floor — `hashKey` returns a signed
int32, so `seed % 300` can be negative (real range ≈ [0.351, 0.95]); the range test only
passes because it feeds 20 fixed inputs.

**P1 — substrate-llm-client fabricates answers on provider failure and caches them.** On
!ok or thrown fetch, `jevFallback` returns a canned template ("The substrate observes: …")
as a normal ChatResult with no error field; if its fake conf ≥ threshold it ENTERS the Pincher
cache. Receipted against a local 500 server: fabricated content, jev_conf 0.85, second call
`cached: true`. Any fleet consumer would ship a hallucinated answer sourced from a down
provider, permanently cached.

**P1 — jeviter's async-stream path (tail/follow/tui on files & URLs) spin-books fabricated
silences.** `JevIterator.next()` calls `this.stream.next()` WITHOUT await; for the async
generators the CLI actually uses (`followFile`/`followUrl`), `step.done` is always undefined,
`step.value` undefined → raw = `'""'` → gain 0 → silence → loop forever, never yielding a
real event. Receipted: 5s of `tail` on a 3-line file = **29,472 ledger rows (~5,900/s, 38MB
in 2min in the first run), every payload text `""`**, real lines never processed. The sync
path (stdin digest, all tests) is correct — which is why the suite is green. The README's
canonical `wrapAsync(it)` helper **does not exist** in src/ or test/. No test exercises an
async stream.

**P1 — jev-quilt's oracle aligns answers to questions BY POSITION, not name.**
`validate()` zips `qs[i]` with `decisions[i]`, where decisions order = `payload["answers"].items()`.
This run the wire happened to echo request order (verified: 14/14 match), but nothing checks
name correspondence — and the official Python SDK's documented behavior (drop unrecognized
answer types, warn, keep raw) would silently shift every subsequent probe. One-line fix: map
by name, assert set equality.

**P1 — our own crab-traps live judge extracts by deep-scan.** `arena-gan-live.test.ts`
scans the raw response for "any number in [0,1]" and takes the first hit (self-described as
"an extraction, not a claim about the wire"). With a score question or multi-probe batch this
can pick up any probability (e.g. score `probabilities["0"]=0.64`) — order-dependent, name-blind.
Finding on OUR side; jev-quilt's kind+name-keyed `BackendDecision` parse is the fix shape.
(Budget governor + full CallReceipt in that file are, to be fair, excellent.)

**P2 — jev-quilt docs teach a phantom noul confidence field.** `typesafe_client.py` docstring:
"A noul answer's confidence is the model's confidence"; `JEV_TUTORIAL.md:30` example response:
`{"type":"noul","noul":0.85,"confidence":0.92}`; `JEV_ORACLE_SPEC.md:85` same. The wire says
otherwise (15 fresh rows this session; 27 cumulative across r8/r9/41-c; schema-level absent),
and their own code agrees with the wire (the fallback). Side effect: since fallback makes
noul confidence == probability, their "confidence ≥ 0.85" learnings/thresholds are actually
probability thresholds — semantics are muddled downstream.

**P2 — jev-quilt client drops the score `legend`.** Wire returns `legend: {"0": "foreign
body", …}` (receipted); `BackendDecision` has no field for it, so consumers must re-derive
level labels from the request's criteria to render a score.

**P2 — jev-quilt env/gate bookkeeping inconsistencies.** Client accepts three key env names
(JEV_API_KEY/TYPESAFE_API_KEY/TYPESAFEAI_KEY) but `test_integration_typesafe` gates only on
`TYPESAFEAI_KEY` — it stays skipped even when TYPESAFE_API_KEY is set, so the 2-test live
integration is dead in our env. `KNOWN_SKIPS.md` still lists the R8-audit hardcoded-key block
as "BLOCKED on removing the hardcoded TYPESAFEAI_KEY" — grep finds no hardcoded key anywhere;
the repair landed, the registry entry didn't.

**P2 — jeviter has no bounded-run surface for automation.** `tail` runs forever by design and
offers no `--max-events`/`--once` flag; only stdin digest is bounded; `jeviter_next` (MCP)
blocks through silence by design. Headless fleet use needs an external deadline wrapper today.
Also no tests for `src/cli.js` or `src/mcp.js` (the async bug above is exactly in the untested
path).

**P2 — substrate-llm-client brew overpromises.** README: "best of 5 parallel LLM calls";
implementation: `min(providers, 5)` calls (receipted: 1 provider → 1 call), "JEV picks best"
picks by the fake conf. No TTL/eviction on Pincher.

**P2 — our own task card is stale (finding on our side).** The wave-41 briefing calls jeviter
"JEV UI: promote/REVIEW/DISCUSS/REJECT oracle". No such taxonomy exists in jeviter (grepped:
promote/DISCUSS/REJECT absent; "review" appears only as review-queue walls in the collab
reader). The ACCEPT/REVIEW/DISCUSS/REJECT oracle lives in **jev-quilt's `jev_oracle.py`**.
Desk-review of that flow (ran live, receipted above): what it gives us beyond raw systemone
calls = (a) a fixed canonical 14-probe battery batched into ONE call, (b) misquote/inversion
probes as a separate channel from doctrine probes, (c) a deterministic 4-way verdict ladder
with explicit thresholds, (d) named receipts. Its limits: fixed thresholds not calibrated
beyond 6 fixture cases, no persisted receipts by default, P4 alignment fragility.

**P3 — jev-quilt small stuff.** ResourceWarnings (unclosed `open()`) in test_receipts_v2;
hand-rolled monkeypatch helper in test_typesafe_client where unittest.mock would do;
`score_oracle()` in jev_oracle.py is dead placeholder code (loop body `pass`).

**P3 — no retry ladder anywhere in the stack.** jev-quilt client is single-shot urllib (no
retry-after, no `X-TypeSafe-Retry-Count`, no 429/529 handling); substrate-llm-client swallows
errors into fallbacks. Only the vendor SDKs (r8 recon) implement the documented retry
semantics. Tavern wishlist item, not a port requirement.

## Suggestions (gift-framed, per repo)

**To jev-quilt:** (1) Make `validate()` map answers by name and assert set equality with the
request — one line, kills the P1 misalignment class. (2) Fix the docstring + tutorial's noul
example to `{type, noul}` and rename the fallback field honestly (e.g. `confidence=None,
probability=…` or `confidence_source="noul-fallback"`) so thresholds don't launder probability
into confidence. (3) Carry score `legend` through BackendDecision. (4) Un-skip the stale
KNOWN_SKIPS entry (repair landed) and align the integration-test gate with the client's
accepted env names. (5) A vendor-SDK-shaped retry wrapper (retry-after, 529) would make the
backend arena-grade.

**To jeviter:** (1) Await the stream in `next()` (make it `async next()` / bridge
AsyncFromSyncIterator properly) or reject async streams loudly at construction — today
`tail`/`follow`/`tui` on real streams silently fabricate ~6k silences/s. (2) Ship the
`wrapAsync` the README promises, and add one async-generator test (the suite's sync-only
coverage is why the bug ships green). (3) Add `--max-events N` / `--once` to the CLI so
headless runners don't need kill(1). (4) Consider a silence-flush policy (first silence
booked, then heartbeat at growing intervals) — "every silence is booked" is the doctrine, but
a quiet file at ~6k rows/s is a receipt firehose. (5) Tests for cli.js/mcp.js.

**To substrate-llm-client:** (1) Either wire `computeJev` to the real oracle (one noul probe
on `/v1/systemone`, typesafe as a first-class ProviderConfig kind) or rename it honestly
(`pseudoConfidence`) — "JEV gating" is currently a hash lottery, and the fleet's decision
substrate should not borrow that name. (2) Surface provider errors: return
`{error}`/throw instead of fabricating content, and never cache a fallback answer. (3) Fix
`hashKey` signedness (use `Math.imul`/`>>> 0` consistently) so the conf range matches its own
test. (4) brew: name it "best of N providers", add TTL to Pincher.

## Synergy adoptions for our repos

1. **Name-keyed typed parse for every JEV consumer (tavern + crab-traps).** Adopt jev-quilt's
   `BackendDecision{kind,value,probabilities,confidence,receipt_note}` parse keyed by question
   NAME as the standard extraction layer — it directly repairs our SCN-003 live judge's
   deep-scan (P5) and hardens the tavern runner against the SDK's drop-unknown-answer
   behavior. Keep our crab-traps CallReceipt shape (already better than theirs) and merge in
   their latency/receipt_note idea.
2. **SCN-003 judge upgrade: batched probe battery + verdict ladder.** Replace "extract one
   number" with jev-quilt's pattern: per GAN round, ONE batched call carrying named noul
   probes (survival, forgery-indicators, misquote-of-rules) + a deterministic threshold ladder
   mapping to SURVIVE/REVIEW/REJECT triage. Cost receipted this session: 14 probes = 1 call =
   1848 in-tok ≈ $0.000078. Better than SCN-003's single-scan extraction and cheaper than
   per-question fan-out. (jev-quilt does NOT do the SCN-003 wiring better today — its oracle
   is canon-alignment-specific and its client lacks retry/budget — but its parse+batch+ladder
   shape is the right borrow.)
3. **jeviter Ledger + Throttle for arena streams.** The Throttle ratchet ("adversarial
   resonance impossible by construction") is exactly the GAN threat model — wrap the forger
   endpoints with it so flood attempts are receipted and shed, and book judge silences to a
   jeviter Ledger so a quiet round is a receipted quiet round. Cross-verify with the pinned
   canary (all three repos + our bookkeeper share `0xcbf29ce484222325` /
   `0x024a555471370b18d`). Adopt ONLY the sync paths (or after their P1 fix) — the async
   tail path is unusable today.
4. **JEV-gated prior cache for the tavern — with REAL gates.** substrate-llm-client's
   Pincher architecture (cache admission gated on an oracle confidence) is worth stealing with
   one substitution: gate on actual wire noul values keyed by state-sha256, admission only
   when repeat-variance ≤ 0.04 is receipted for that question class (r9 doctrine: gate on
   noul/probabilities, never on confidence repeats). Never ship their computeJev.
5. **Enforced skip registry.** jev-quilt's KNOWN_SKIPS.md (unregistered skip fails CI) is a
   cheap, honest pattern for fleet-seeds and crab-traps suites — formalizes what our worklogs
   do informally.
6. **Silence receipts for the tavern runner.** Our r8 surface-probe texts were lost because
   only successes were receipted; jeviter's "every silence is booked" applied to our runner
   (receipt probes attempted-but-skipped, with state SHAs) closes that gap permanently.

**Recon conflicts, both ways:** Their docs (tutorial + docstring + oracle spec) claim noul
carries confidence — our r8/r9 recon and 15 fresh wire rows say no; finding on THEIR side,
our recon stands, and their own fallback code agrees with us. Nothing in the three repos
contradicts the 10-level ceiling, $42/Btok pricing, alias identity (jev-latest → jev-1.13.0
re-confirmed live ×3), rate limits, or the error-detail strings. Our briefing's attribution
of the verdict oracle to jeviter is the one stale note on OUR side.

## Honest limits

- One live session, one small state, n=2 repeats: Δ≤0.01 observed is consistent with r9's
  ≤0.04 bound but is NOT a new bound.
- 4/8 paid-call budget used (3× 200 billable = 2746 input tokens = **$0.000115** at $42/Btok;
  output free; 1× 400 receipted unbilled, assumption not vendor statement). No /v1/models call
  this session (r9 receipted it); no 429/529/retry path exercised live (none of the three
  clients implements one — that's the P3 finding, verified from source, not wire).
- Suites run once each; no flake sampling. jev-quilt's 2-test live integration remained
  skipped (gate-name mismatch, P8); its 2 "expected failures" not investigated (pinned).
- jeviter's MCP server not exercised over stdio; TUI correctly refuses non-TTY (receipted).
- substrate-llm-client was never let near a real provider (mock only) — by design; its fake
  gate means no paid calls via that repo were warranted.
- The jeviter spin-rate (~5,900 rows/s) is a disk-throttled lower bound on the loop rate.
- Sandbox clock 2026-09-27 vs briefing calendar discrepancy carried AS SAID (fleet convention).

---

DRAFT issue-comment (<=300 words) — for SuperInstance/jeviter, purpose: the async-path bug is
real, tiny to fix, and we have the receipts.

> Found while playtesting the JEV stack (wave 41, fleet lane 41-c). Suite green (85/85), but
> the async-stream path looks broken in a way the sync-only tests can't see.
>
> `JevIterator.next()` calls `this.stream.next()` without awaiting. For async generators
> (`followFile`/`followUrl` — i.e. `cli.js tail/follow`, `tui` on files/URLs), `step` is a
> Promise: `step.done` is undefined, `step.value` is undefined, so `raw = JSON.stringify(undefined ?? '') = '""'`.
> The `for(;;)` inside `next()` then spins synchronously: gain 0 ≤ threshold → book silence →
> repeat. Real lines are never awaited, so `tail` never emits and books fabricated silences
> as fast as the disk accepts them. Repro on a 3-line file: `node src/cli.js tail f.log
> --ledger out.jsonl` → 29,472 ledger rows in 5s (~5,900/s), every payload text `""`, zero
> events. The stdin digest path works because it passes a sync array. README's
> `for await (const ev of wrapAsync(it))` can't run as printed — `wrapAsync` isn't exported
> anywhere in src/.
>
> Suggest: make `next()` await (async iterator bridging), or refuse async streams loudly at
> construction; ship `wrapAsync`; add one async-generator test; consider `--max-events` for
> headless runners and a silence-flush policy (a quiet file currently books ~6k rows/s).
> Happy to share the full receipt (ledger sample, runner script). The sync core, Throttle
> ratchet, ledger scan, and the fnv1a-64 cross-repo canary all verified clean on our side —
> this is the one real crack we found in an otherwise tight little instrument.
