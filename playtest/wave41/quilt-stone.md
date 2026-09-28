# Playtest: quilt-stone @ 36253a74c80d497a293e413cb5bd33867df63fae

Lane 41-a "stone-playtester", wave 41, quilt/murmur-protocol. RESEARCH + PLAYTEST ONLY — zero foreign writes, zero pushes, zero comments posted (this report is the deliverable; the keeper posts anything it deems worth sending). Every claim below carries a command + output excerpt; repro scripts live in `playtest-wave41/` (`adv1.mjs`, `producer.mjs`, `auditor.mjs`).

## Setup

- `git clone https://github.com/SuperInstance/quilt-stone.git /home/z/my-project/download/pt-quilt-stone` → HEAD **36253a74c80d497a293e413cb5bd33867df63fae** ("Merge pull request #6 from SuperInstance/auditor-experience-doc"). Fresh clone, matches the mission's "current main 36253a7+".
- GitHub API receipt (token used for reads only, never printed/committed): `GET /repos/SuperInstance/quilt-stone/commits/main` → **HTTP 200, sha 36253a7…** — HEAD == origin/main at test time.
- Env: `node v24.21.0` (the fleet's stated major). GH_TOKEN sourced from `/home/z/my-project/.env`, used for 2 API reads.
- My scratch dirs (all writes landed here, never in any repo): `playtest-wave41/` + my own fresh clone `pt-pong-r39a` (pong @ **1da41be23eff100f4d11df0e187311e12ad704f9**, current main — note: pong has moved past the worklog's 4d447ed3).

## What works (receipts)

**1. The suite.**
- `node smoke.mjs` → `SMOKE GREEN: 92/92 checks pass`, exit 0, **0.047s** real.
- `node verify_all.mjs` → `TALLY: 68/69 chains verified under their own semantics | local cross-check 39/69 | divergences 0 | repos scanned 23 | jsonl scanned 160`, **0.7s**. The single BAD is `pt-moth-runner/examples/witness.jsonl` — a scratch clone of SuperInstance/**moth-runner** (outside the Task 26-b 11-sibling canon; an unknown dialect sniffed as quant). Not a stone defect — but see P5 (it flips the canonical CONFORMANCE GREEN→RED in any workspace with scratch dirs).

**2. Tamper evidence — field-by-field matrix (adv1.mjs §A, 11/11 caught with exact index + clean `why`):**
```
payload field        -> ok:false why="hash mismatch" at=2
kind field           -> ok:false why="hash mismatch" at=2
row_hash itself      -> ok:false why="hash mismatch" at=2
delete row_hash      -> ok:false why="missing row_hash" at=2
delete middle row    -> ok:false why="hash mismatch" at=2
duplicate a row      -> ok:false why="hash mismatch" at=3
swap rows            -> ok:false why="hash mismatch" at=1
prepend rogue row    -> ok:false why="hash mismatch" at=2
header tamper        -> ok:false why="hash mismatch" at=0
null row             -> ok:false why="row is not an object" at=2
kind→type rename     -> ok:false (stone-v1 has no type alias in hash)
```

**3. Replay (§B, 4/4):** verbatim staple copy chain A→B → `verifyChain` `annotation hash mismatch`; recomputed-staple replay (self-hash rebuilt — the stronger attacker) → chain green but `verifyTipSignature` → `signed tip does not match the chain tip (post-signature chain edit)`; body-row replay → `hash mismatch at=4`; byte-identical whole-chain replay → honest `ok:true` both gates (same content).

**4. Sign lane refusals (§D, 7/7, uniform clean mode):** wrong domain (`"stone-v1"||tip` signed with the real key) → refused; truncated sig (127 hex — Buffer.from silently drops the half-byte, still refused); non-hex sig; missing sig field; wrong key; alg relabel (`es256`) → `unsupported signature alg 'es256'`; appended shadow sign row (attacker garbage, self-consistent) → chain green, sig gate fails **closed** (`signature invalid for this tip and key`) — loud, never quiet.

**5. trustedKeys — the key-provenance law is enforced exactly as claimed (§E):** sign row claiming `key_id:"i-am-admin"` while the verifying key matches registry entry `casey` → `identity={key_id:"casey"}`, `identity_claim_conflict=true` — the claimed label is **never** promoted on binding alone (stone.mjs:507-518: identity comes only from `verifiedKeyId`, the registry match). Unregistered key claiming a registered label → `ok:true` (binding valid), `identity:null`, `binding_only:true`, conflict named. Clean path → identity promoted, no conflict. Registry accepts Map, object, and PEM-string values.

**6. Canonicalization (§F):** stone-v1 fully re-keyed rows still verify (canonicalJSON permutation-invariant — the §5 claim holds); fleet-dialect re-key → `ok:false` **loud** (documented false-tamper risk is loud, not silent); re-key+re-seal verifies green (honest — why stone-v1 is the forward format); nested-object re-key in fleet → caught (§5 "recursive objects unsorted" confirmed load-bearing); quant top-level re-key → verifies (top-sorted canon, as spec'd).

**7. Edges (§C):** empty chain `ok:true, links:0, tip:null` (spec §6, vacuous); `verifyChainFile` on missing path → verdict, not throw (`verifier error: ENOENT…`); malformed JSONL → verdict **with line number** (`malformed JSON at line 2: …`); 1 MiB payload row seals+verifies in **3.9ms**; 20k-row chain verifies in **50ms**; unicode (BMP + astral + U+2028) and float forms (`0.1, 1e21, -0, 5e-7`) survive the disk round-trip.

**8. Code walk (stone.mjs 563 lines, read in full):** dialect registry matches STONE-SPEC §4 exactly per-dialect; annotations self-hash against the tip with `prev` never advancing (§4.6.1 implemented as spec'd, incl. mid-chain staples); `bodyTip` re-derives without trusting stored hashes (the anti-laundering core of §4.6.2); §9 pins verified live by smoke checks 87–92 (draft `-07`, RFC 8785, RFC 9943, Ed25519/ES256/ML-DSA-65, house mapping).

## Findings

Severity key: CRITICAL = forgery/laundering possible; MAJOR = false verdicts or broken documented flows; MINOR = real gap, bounded impact; NIT = polish.

**P1 — MAJOR (interop break, cross-repo): `verifyTipSignature` silently rejects VALID signatures when the verifying key is a PEM string on Node v24.21.0.**
`edVerify` (stone.mjs:433-439) tries `verify(null, msg, sig, pub)` and falls back to `verify(null, msg, pub, sig)` only on `ERR_INVALID_ARG_TYPE`. But (Node v24.21.0, measured):
```
wrong-order, pub=PEM string  -> THREW ERR_OSSL_UNSUPPORTED (decoder routines::unsupported)
wrong-order, pub=KeyObject   -> THREW ERR_INVALID_ARG_TYPE  (→ fallback rescues → true)
doc-order   , pub=PEM string -> true
doc-order   , pub=KeyObject  -> true
```
A PEM string at the signature slot is type-valid, and the 64-byte sig Buffer at the key slot throws **ERR_OSSL_UNSUPPORTED** — not the discriminator — so the exception is rethrown, swallowed by `verifyTipSignature`'s `catch { good = false }`, and a perfectly valid signature is reported as `signature invalid for this tip and key`. Fail-closed, but a false negative on the authenticity gate. Blast radius, all receipted live:
- pong-quilt @ 1da41be + quilt-stone @ 36253a7: `QUILT_STONE_DIR=<pt clone> QUILT_STONE_SIGN_KEY=<pem> node tools/prerun.js` → `stone: SIGN/REFUSED verifyTipSignature rejects the staple {"ok":false,"why":"signature invalid for this tip and key",…}` — the producer flow **bricks** (prerun.js:190 passes `publicKeyPem`, a string).
- The doc-literal auditor walk (below) fails at check 2 for the same reason; the doc's quoted verbatim output (`ok:true`) is not reproducible on this Node.
- Same chain, same signature: `verifyTipSignature(rows, KeyObject)` → `ok:true`; `verifyTipSignature(rows, that KeyObject's own exported PEM)` → `ok:false` (producer.mjs output).
Smoke stays green because it only exercises KeyObjects — the string-key path is unpinned. (Note: the R39 pilot reportedly passed on 2026-09-27 with a string pub; behavior is Node-build-dependent, which is itself part of the problem — see Honest limits.)

**P2 — MAJOR (spec-contract divergence, gates disagree): the header-recorded genesis is never honored; the two gates can disagree on one artifact.**
STONE-SPEC §3: stone-v1 genesis is `'STONE-GENESIS-1'` *"(or the header row's recorded genesis)"*. Measured (adv1.mjs §G): a chain sealed with `genesis:'MY-GENESIS-X'` (header records it, as §3 prescribes):
```
verifyChain(rows)        -> ok:false, tip=undefined      (verifier hardcodes STONE-GENESIS-1)
verifyTipSignature(rows) -> ok:true,  tip=b819f132c47c…  (sign lane ALSO hardcodes the default)
```
Two problems in one: (a) gate 1 refuses a chain the spec says is valid (`hash mismatch` at 0 — loud, but wrong per §3); (b) gate 2 blesses a **phantom tip** the chain gate cannot even see — `signTip`/`verifyTipSignature`/`bodyTip` all derive from `alg.genesis` and none of them reads the header or accepts a genesis override (stone.mjs:388-397, 415, 477). Corollary, also receipted: the header's `genesis` field is **decorative** — re-seal the same rows under the default genesis and `verifyChain` → `ok:true` while the header still claims `MY-GENESIS-X`. The fleet currently writes default-genesis chains (pong's exporter pins `STONE-GENESIS-1`), so impact is latent — but §3 explicitly sanctions the custom case, and today it produces a spec-valid chain that fails gate 1 while passing gate 2.

**P3 — MINOR: post-signature appends are silently uncovered.**
[body rows, stone.sign, attacker-authored body row] → `verifyChain ok:true` (mid-chain staples are legal, §4.6.1) **and** `verifyTipSignature ok:true` with `tip` = the pre-append tip. Both gates green; the signed tip ≠ `verifyChain`'s tip; **no field in either verdict flags the uncovered suffix** (adv1.mjs §D, receipted with both tips). This soft-touches the §4.6.2 promise ("chain verifies now implies this exact byte string was signed") — the byte string with the suffix was never signed, and nothing says so. Mitigated: the honest tip is still reported, so an auditor diffing tips catches it manually; edits (vs appends) are caught outright.

**P4 — MINOR: `signer_role`/`key_id` labels are unauthenticated metadata, and the role is promoted into `identity` verbatim.**
The signed message is `"stone-v2"||tip` only (stone.mjs:417). Rewrite `signer_role:"producer"→"fleet-admin"` and `key_id`, recompute the annotation's self-hash (no key needed — the self-hash has no signature on it), and both gates go green; even with a trustedKeys registry, `identity.signer_role` comes from the sign row unchanged (only `key_id` gets the conflict flag; the role has no check). Receipted (adv1.mjs §E3): `with-registry identity={"key_id":"casey","signer_role":"fleet-admin"} conflict=true`. Bounded: registry keeps the key_id honest, and their own note 2 (binding ≠ identity) is the stated posture — but the result object's `identity` field lends the role a trust the signature never gave it.

**P5 — MINOR (conformance-run scope hygiene):** the `verify_all.mjs` CLI hardcodes `ROOT = join(HERE,'..')` and sweeps everything — including other lanes' `pt-*` scratch clones and repos outside the 11-sibling canon. In this workspace that yields `CONFORMANCE RED` on `pt-moth-runner/examples/witness.jsonl`, an unknown dialect that detection mislabels `fnv1a64-quant` with `why="prev_hash mismatch at=0"` (the real reason: not a quant chain at all) — the verdict is safe but points the auditor at the wrong conclusion, and a scratch file flips the fleet's canonical GREEN. `runConformance({root})` accepts a root; the CLI doesn't expose one.

**P6 — NIT (doc drift their own pin-style would catch):** README states "85/85 self-checks" twice (lines 32, 67); actual at HEAD is **92/92**. Their §9 smoke pins make draft-number drift loud — the same trick pinned on their own counts would have caught this.

**P7 — NIT (tautological smoke check):** smoke.mjs:27 — `ok(fnv1a64RawString('\u00e9') !== fnv1a64('a').slice(0) || true, 'raw variant callable')` — the `|| true` makes it unconditionally green; it can never fail, so it pins nothing.

**P8 — NIT (doc audit, where a stranger gets stuck):** AUDITOR-EXPERIENCE.md's Reproduction says `node tools/prerun.js # with QUILT_STONE_DIR + QUILT_STONE_SIGN_KEY`. Stuck points, in order of encounter: (1) no key-generation step — a stranger must guess ed25519/PKCS8 PEM; (2) `<producer PEM>` reads like a PEM value but the code wants a **file path** (`createPrivateKey(fs.readFileSync(keyPath))`, prerun.js:177); (3) today the step bricks anyway (P1), which is the loudest possible stuck point. The audit sketch itself (`const pub = art.key.public`) is correct as documentation but passes the exact string type that trips P1.

## Suggestions (gift-framed — file or fold, zero demands)

1. **One-line class-kill for P1:** normalize the verifying key up front — `if (typeof publicKey === 'string') publicKey = createPublicKey(publicKey)` inside `verifyTipSignature` (or `edVerify`). Kills the string/KeyObject split for good; alternatively try the docs' order first (`verify(null, msg, key, sig)` — Node's documented signature is `(algorithm, data, key, signature)`, so the "fallback" is actually the documented call) or broaden the fallback to any throw. Same one-liner dropped into pong's prerun unbricks the R39 flow today. A smoke pin with a **PEM-string** verifying key would keep the class dead ("detected by running, pinned in smoke" — extend that doctrine to this path).
2. **P2:** plumb genesis through the sign lane (`opts.genesis` → `bodyTip`) and read the header's `genesis` in `detectAlg`/`verifyChain` for stone-v1 (it's already read for `alg`), or add a verdict field `header_genesis_matches:false`. Either honors §3 or amends §3 to "default only" — the current state is the only option that leaves both docs true and code false.
3. **P3/P4:** two cheap verdict fields: `covers_chain` (signed tip == derived full-chain tip) and `rows_after_sign`; and either fold `key_id`/`signer_role` into the signed message (a `stone-v3` domain bump) or registry-check the role like the key_id. Until then, the doc's note 2 could name the role as unauthenticated explicitly.
4. **P5:** `node verify_all.mjs [root]` + a `--canon` mode restricted to the §4 repo list; and when trial-verification fails under both quant and tidepool, a `why` like `"no matching prev_hash dialect"` instead of the quant mislabel.
5. **P6/P7:** pin the smoke count in smoke itself (`ok(n === 92, 'check total pinned')` printed last — self-referential pins are very much the house style); delete or make real the line-27 guard.
6. **P8:** two lines in the Reproduction block: `node -e "require('crypto').writeFileSync('producer.pem', crypto.generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}))"` and "QUILT_STONE_SIGN_KEY is a path to a PEM file". Once P1 is fixed, the walk becomes fully stranger-proof.

## Cross-verify receipts (direction by direction)

**Their verifier → our chain (6th+ stranger read):**
```
node -e "import('./stone.mjs').then(m => console.log(m.verifyChainFile('/home/z/my-project/download/qthe/receipts/e_q6_chain.jsonl')))"
→ {"ok":true,"alg":"stone-v1","genesis":"STONE-GENESIS-1","links":15,
   "tip":"ab4ea19681888b11c2843b9ca43d12f652dca045338217dc5bf1b5cd9e477db0","why":null}
```
Tip == the pinned `ab4ea196…` exactly. Also seen in the verify_all table (qthe rows, 15 rows, same tip). PASS.

**Their verifier + sign lane → the R39 pilot artifact, regenerated at current mains:** pong prerun @ 1da41be sealed `checkpoints/stone-v1.json` green (`live stone.mjs verifyChain: ok (links 5)`) but the sign step SIGN/REFUSED (P1). I reproduced the staple outside their flow (playtest-wave41/producer.mjs, pong's own sealed chain + stone.signTip + my producer.pem) and ran the doc's walk literally (auditor.mjs):
- Check 1 `verifyChain(rows)` → `{"ok":true,"alg":"stone-v1","links":6,"tip":"c155fd01…"}` — matches the doc's quoted shape.
- Check 2 doc-literal (`pub` = embedded PEM string) → **`ok:false`** (P1); with `createPublicKey(pub)` → `ok:true`, signer block exactly as documented.
- Check 3 tamper → `hash mismatch at=2`. Check 4 laundering (tamper+re-seal+staple): verbatim-copy variant → gate 1 catches at the staple; recomputed-self-hash variant (stronger) → gate 1 green, gate 2 refuses with the documented `signed tip does not match…`. Check 5 wrong key → `signature invalid for this tip and key`.
- Note: my first check-4 draft shared a nested `args` reference and accidentally demonstrated the tip-mismatch refusal on the honest chain — my bug, kept as an anecdote that the refusal message fired correctly on a content-only edit.

**Our VC readers → their shipped signed artifact:** quilt-stone ships no signed artifact file (smoke signs in-memory ephemeral chains); the closest surface is the pong wrapper (not a VC). Reader B (`verify.mjs`) and reader A (`reader-a.mjs`, run from a byte-identical copy in `playtest-wave41/vc-run/` so receipts never touched fleet-seeds) both **throw TypeError** on it (reader B: property set on undefined `credentialSubject.stoneChain`; reader A: read of `proof.proofValue`) — honest format mismatch, fail-closed, no false accept; but a stack trace instead of a verdict is a UX finding **on our side** (below).

**Our VC readers → our committed artifact (regression, wave-38/39 cargo):** reader B: KAT 8/8, `verified:true, tamperControlsOk:true, verdict:"VERIFIED"`; reader A: `bindingOk:true, sigOk:true, verified:true`; `hashDataHex` identical across A/B: `b941a0f2…bbef ‖ 9f1889e6…3756` — byte-match with the wave-39 receipt.

## Lessons for our repos (fleet-seeds / qthe / crab-traps)

1. **Normalize key inputs at the boundary.** Our `reader-a.mjs` already calls the documented order (`edVerify(null, hashData, keyObject, sig)`); stone's heuristic-first design is what tripped. Adopt their lesson the safe way: accept PEM/JWK/KeyObject and convert once, explicitly — never rely on arg-order heuristics or runtime dialects.
2. **Their tamper matrix is cheap enough to be free.** 92 checks in 47ms. qthe/crab-traps self-checks should steal the pattern wholesale: per-field mutation, splice/dup/swap, replay across chains, wrong-domain sig, truncated sig — each asserting the exact `why` string, not just `ok:false`.
3. **Verdicts, never throws.** `verifyChainFile` returns a verdict for ENOENT and names the malformed JSONL line — better stranger-UX than our VC readers' raw TypeErrors (this playtest's honest cross-direction failure). Wrap our readers' input validation in the same contract.
4. **The two-gates doctrine translates directly to our VC lane.** Our eddsa-jcs-2022 envelope already hashes the proof options into `hashData` (their P4 is precisely the gap DI proofs close) — keep it that way, and when we staple stone chains, bind the tip **and** state coverage (`covers_chain`) explicitly.
5. **Pin our own doc claims like they pin §9.** Their draft-number pins work; their README count drifted (P6). Our READMEs carry counts and tips — pin them in self-checks so drift fails loudly.
6. **Tip-agreement assert whenever we staple.** qthe chains are default-genesis (unaffected by P2), but if any experiment ever passes custom genesis to `sealChain`, the sign lane silently drifts — an `assert(verifyChain(rows).tip === verifyTipSignature(rows, pub).tip)` costs one line in every sealing script.

## Honest limits

- **One Node build.** All P1 evidence is Node v24.21.0; the R39 pilot's reported success with a string pub implies build-dependence I could not survey (no other Node in sandbox). The report claims the break on *this* fleet-stated runtime, not universally.
- **No fuzzing/formal tools** (per env constraints): 39 targeted adversarial probes + 92 pinned smoke checks + a 160-file conformance sweep — broad, not exhaustive. No bisect of when P1/P2 entered (both present since 047be72 for the sign lane by inspection).
- **verify_all canonical GREEN is not reproducible in this workspace** (scratch `pt-*` dirs + moth-runner sit under `download/`), so the 42/42-era claim was not re-certified on the canon set — 68/69 with 0 divergences is the honest number here, with the 1 BAD receipted as out-of-scope.
- **Foreign-write ledger: zero.** pong prerun artifacts were written only inside my own fresh clone (`pt-pong-r39a/`, unpushed); VC-reader receipts landed in my copy (`playtest-wave41/vc-run/`), fleet-seeds untouched and read-only; qthe/e_q6 read-only; nothing pushed, nothing posted.
- **ES256/ML-DSA-65 untested** — §9 is a tracking lane, not a claim, and I treated it as such.
- Transcript hygiene: the setup step sourced GH_TOKEN per instructions; it was used for two read-only API calls and never intentionally printed, written, or committed.

---

## DRAFT issue-comment (<=350 words, generous tone, receipts-cited, zero demands)

**Subject: playtest receipts @ 36253a7 — one interop break, two gate disagreements, all fail-closed**

We playtested THE STONE (fresh clone @ 36253a7, node v24.21.0): smoke 92/92, verify_all 68/69 with 0 divergences (the 1 BAD is a moth-runner scratch clone, unknown dialect), tamper matrix 11/11 caught at exact index, replay 4/4, sign-lane refusals 7/7 with clean `why`s, and your key-provenance law held under direct attack — a sign row claiming "i-am-admin" against a registry entry "casey" came back `identity=casey, conflict=true`. Your verifier also read our e_q6 chain: `ok:true, 15 links, tip ab4ea196…` as pinned.

Three receipts you may want, all fail-closed (nothing forges; that's why we're handing them over rather than sitting on them):

1. **PEM-string verifying keys get valid signatures rejected** on node v24.21.0. `edVerify`'s first call throws `ERR_OSSL_UNSUPPORTED` for strings (vs `ERR_INVALID_ARG_TYPE` for KeyObjects), so the fallback never fires: same chain, same signature — KeyObject `ok:true`, its own exported PEM `ok:false`. This bricks pong's `prerun.js` verify-before-write at current mains (`SIGN/REFUSED … signature invalid for this tip and key`) and makes AUDITOR-EXPERIENCE.md check 2 unreproducible as written. One line at the boundary (`createPublicKey` any string input) kills the class; a string-key smoke pin would keep it dead.
2. **Custom-genesis chains: the gates disagree.** §3 sanctions the header's recorded genesis, but `verifyChain` hardcodes the default (→ `ok:false`) while `verifyTipSignature` derives a phantom tip from the default too (→ `ok:true`) — one artifact, two verdicts. Plumbing `opts.genesis` (or amending §3) closes it; today the header's genesis field is decorative (a lying header verifies green).
3. **Smaller:** post-signature appends leave both gates `ok:true` with tips silently disagreeing; `signer_role` rides into `identity` unauthenticated (key_id conflicts flag; role doesn't); README says 85/85, actual 92/92.

Your own §6 line — "verdicts, not exceptions" — is the pattern we're stealing next. Full repro scripts and outputs available; take whatever is useful, ignore the rest.

---
*Draft only — NOT posted (keeper decides; zero foreign writes by this lane).*
