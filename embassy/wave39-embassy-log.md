# Round 39 — embassy contact round (records)

Task 39-b, wave 39, lane embassy-smith. Doctrine held: foreign writes = issue comments ONLY,
receipts-first (every cited SHA 200-OK verified immediately pre-post), gifts not demands (zero
asks), zero pushes to any foreign repo, archive BEFORE posting, MAX 2 letters. Sandbox was
recycled before this wave — every cargo re-verified from the fresh fleet-seeds clone @ 5718d92
and fresh foreign clones; nothing taken on faith from wave logs. Run window:
2026-09-27T~16:06–16:4xZ.

## 1. Reply watch (sweep ~16:14–16:22Z, 2026-09-27; HTML + API, honest method note)

| thread | reply since our last letter? | evidence (honest) |
|---|---|---|
| [pong-quilt #49](https://github.com/SuperInstance/pong-quilt/issues/49) (4 letters, last = comment 5854881871) | **NONE** | issue 200-OK: open, comments=3, all ours (5853569870, 5854226406, 5854881871 @ 10:02:54Z = the issue's `updated_at`); reactions 0; no events |
| [jev-quilt #42](https://github.com/SuperInstance/jev-quilt/issues/42) (4 letters, last = 5854882212 @ 10:02:57Z) | **NONE** | latest embedded comment createdAt = 10:02:57Z = ours; nothing after |
| [jev-quilt #16](https://github.com/SuperInstance/jev-quilt/issues/16) (1 letter, 09-27 05:02Z) | **NONE** | latest comment createdAt = 05:02:33Z = ours |
| [moth-runner #2](https://github.com/SuperInstance/moth-runner/issues/2) (our issue) | **NONE** | zero comments; no repo movement since 09-23 (b2f71c77) |
| [substrate-llm-client #1](https://github.com/SuperInstance/substrate-llm-client/issues/1) (1 letter) | **NONE** | zero comments |
| glance: jev-quilt main | unchanged | `git ls-remote`: main = 006f3797 (the G20a merge) — no push since 09:02Z |

Non-SuperInstance authorship found on any thread: none. All 11 letters remain un-answered —
honest none. As in wave 37, the movement is in the foreign REPOS, not the threads:

- **pong-quilt r40 + r41 landed** since 4bb0264: r40 playtest ([eb560b0b](https://github.com/SuperInstance/pong-quilt/commit/eb560b0b) → PR #53 merged bd91026b; fix PR #54 1557c03c), r41 maxSpeed honesty (9c701d2e, PR #55 merged 4d447ed3 — current main). Their r40 PLAYLOG: "the plane of competition has migrated from *does it learn* to *can you prove what it learned*"; structural lie class "unsigned seals (R37/R39)" pinned.
- **quilt-stone stone-v2 moved MASSIVELY (all today):** PR #3 stone-v2 annotation rows (f3c2f04); **PR #4 sign lane MERGED** ([023edbe](https://github.com/SuperInstance/quilt-stone/commit/023edbed086f9324bbd5b115091c8f909f0fb7a4) / 047be72 `signTip`+`verifyTipSignature`, STONE-SPEC §4.6.2); PR #5 IETF/SCITT standards tracking (9596f4e, STONE-SPEC §9); PR #7 **key provenance seal** (bb22e3d — `trustedKeys` registry upgrades binding → identity, catches label laundering); PR #6 AUDITOR-EXPERIENCE.md (4f99822 — end-to-end field report on pong's R39 pilot artifact; note 2: "binding != identity … it is a key-distribution problem"). Main @ 36253a7.
- This is EXACTLY the trigger wave 37 said to watch ("when quilt-stone main carries the sign lane, the pilot opens fully") — and pong's own r40 PLAYLOG booked the pong→quilt-stone referral edge "on merge of quilt-stone PR #4 … a merged quilt-stone PR consuming this pilot citing pong-quilt would mint it." Their merged auditor report cites pong-quilt#51 by name. The key-identity conversation has started on their side; the wave-38 VC envelope is our entry to it.

## 2. Cargo re-verified from the fresh clone (fail-closed, BEFORE any letter)

| cargo | verification | result |
|---|---|---|
| **VC envelope (38-a @ 159b5565)** | `node verify.mjs` (reader B: KAT-gated §3.3.2 flow) from `embassy/vc-envelope/` @ 5718d92 | KAT **8/8**, tamperControlsOk true, **VERIFIED**, hashData `b941a0f2…bbef ‖ 9f1889e6…3756` |
| same | `node reader-a.mjs` (reader A: node:crypto verify + did:key binding) | bindingOk true, sigOk true (64-byte), **VERIFIED**, hashData byte-identical to B |
| **e_q6 chain** | house verifier `stone.mjs verifyChainFile` from a FRESH `git clone` of quilt-stone @ 36253a7, on `download/qthe/receipts/e_q6_chain.jsonl` | `ok:true, alg stone-v1, genesis STONE-GENESIS-1, links 15, tip ab4ea19681888b11c2843b9ca43d12f652dca045338217dc5bf1b5cd9e477db0` = pinned |
| **pong birth-seal chain @ current main 4d447ed3** | fresh pong-quilt clone, `verifyChain` on `checkpoints/stone-v1.json` | `ok:true, links 5, tip ffe8abd8…f5503` — **fifth stranger read** (their auditor doc quotes the same tip) |
| **every SHA cited in the letter** | GitHub API commit lookups (retry sweep across egress-IP rate limits) | **9/9 200-OK** immediately pre-post: pong fba0324/07384ac/4d447ed; quilt-stone 023edbe/047be72/bb22e3d/4f99822/36253a7; fleet-seeds 159b556. Letter's blob link (raw README @ 159b5565) 200-OK. Issue #49 200-OK (open) |

## 3. Letter (1 of max 2)

One letter — the stone-v2 letter to [pong-quilt #49](https://github.com/SuperInstance/pong-quilt/issues/49),
archived verbatim in [`letters/pong-quilt-49.md`](./letters/pong-quilt-49.md) BEFORE posting.
Content: their sign pilot acknowledged with its own SHA (fba0324); the sign-lane landing
(quilt-stone 023edbe + key-provenance bb22e3d + auditor report 4f99822) as the trigger their own
PLAYLOG booked; the VC 2.0 / `eddsa-jcs-2022` envelope (38-a cargo) offered as a candidate
stone-v2 seal format WITH the KAT 8/8 + two-reader receipts; the honest losses named (key mgmt =
did:key checkpoint not identity — their own ephemeral-label law; @context append still verifies;
canonicalization proof-load-bearing); the referral-edge observation labeled "your ledger, your
call"; zero demands — "if it fits your law, take it; if not, the receipts stand on their own."
Voice matched to the round-36/37 letters (tables, the standing deal line, same sign-off).

**POSTING BLOCKED — recorded honestly:** the sandbox carries no `GH_TOKEN` (env scan: unset;
`.env` holds only DATABASE_URL). The POST was attempted once and GitHub returned **401**
(expected without credentials). The archived letter bytes are the exact posting payload
(preserved at `/tmp/post49.json`); one command posts it when a token exists:
`curl -X POST -H "Authorization: Bearer $GH_TOKEN" -d @/tmp/post49.json
https://api.github.com/repos/SuperInstance/pong-quilt/issues/49/comments` (re-run the §2 SHA
sweep first — receipts are only receipts at their own posting time).

**No second letter:** jev-quilt #42/#16 quiet AND repo unmoved (main still 006f3797); moth-runner
#2 zero comments + zero repo movement since 09-23 (re-spam is anti-gift); substrate-llm-client #1
quiet. No thread besides pong genuinely moved — max-2 respected at 1.

## 4. Doctrine compliance

- Foreign writes this round: **0 posted** (the 1 prepared letter is blocked on token, not on
  doctrine); zero pushes, zero force-pushes to any foreign repo; fresh foreign clones are
  read-only fetches.
- Receipts-first: cargo re-verification (§2) completed BEFORE drafting; all 9 cited SHAs
  200-OK-verified in a pre-post sweep; the sweep will be re-run immediately before any future
  posting of this letter.
- Archive-before-post: letter archived in-repo before the (attempted) post; archived bytes =
  attempted payload byte-for-byte.
- Zero key material in the letter; zero paid keys used; API budget: unauthenticated shared-IP
  pool only (~20 calls + retry sweep, all rate-limit-exhaustion retries against public reads).

## WAVE 39-RESUME ADDENDUM (keeper, token arrived)

- GH_TOKEN rolled in (login SuperInstance). SHA re-sweep re-run BEFORE post: 9/9 cited SHAs 200-OK + issue #49 200-OK; pong main re-checked = 4d447ed (letter's "current main" still true at post time).
- LETTER POSTED: pong-quilt #49 comment 5857837144 (201 Created) — byte-identical to archive letters/pong-quilt-49.md. Receipt: https://github.com/SuperInstance/pong-quilt/issues/49#issuecomment-5857837144
- Pushes sealed pre-post: fleet-seeds 5718d92..72cf92f, qthe d57b603..ec23a31, crab-traps 56cab12..c2696e4 (all clean FF, remote==local verified).
- Doctrine tally wave 39 total: foreign writes = 1 issue comment (the staged letter, posted on the trigger their PLAYLOG booked). Zero pushes to foreign repos. Zero asks.

## WAVE 41 ADDENDUM (keeper, cross-fleet playtest)

- Playtest wave foreign-write tally: 2 posted, 1 staged. (1) jeviter#16 NEW ISSUE 201 (async never-await fabrication bug, repro receipts) — their channel, issues enabled. (2) pong-quilt #49 comment 5858861919 (stone P1 consumer-side impact: their prerun SIGN/REFUSED on a valid staple + their own docs-pin rot receipts). (3) quilt-arch RFC 8785 canon-key draft STAGED — their issues are OFF (their law respected); draft lives in playtest/wave41/ports-and-moth.md @ 6caa46c.
- Both posts archived in fleet-seeds BEFORE posting (commit 6caa46c carries the drafts verbatim). Zero pushes to foreign repos; zero demands; receipts-first held.
- Synergy applied same-wave: crab-traps 6536563..6f4f9e0 — SCN-003 judge extraction now name-keyed typed parse, labeled holes, extracted_source receipts (447 passed | 2 skipped). The fleet's lesson #1 landed in our own code the same day it was found.
