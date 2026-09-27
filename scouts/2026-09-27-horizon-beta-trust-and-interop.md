# Horizon Scout — Trust / Verifiability / Interop Standards (beta)

**Task 37-f · wave 37 · lane horizon-scout-beta · 2026-09-27**
RESEARCH-ONLY lane. Zero foreign writes. Zero paid-key spend. Every claim pinned (URL + retrieval date 2026-09-27 unless stated). Objective: scout where the stone standard (stranger-verifiable checkpoint chains, JCS RFC 8785, W3C VC envelopes, honest FAIL receipts) should interoperate NEXT, and return falsifiable seeds for waves 38+.

Method: GitHub REST (token header-only, search + repo/issue endpoints), live GETs of public spec servers and the Rekor public instance (read-only — no write attempted, per directive), local re-read of `embassy/vc-oracle/` (the wave-32 oracle receipt) as the fleet-side ground truth. Helper receipts: search outputs preserved in this note as pinned quotes; no helper script needed beyond curl/node one-liners.

---

## Track 1 — Canonicalization ecosystem: the JCS census and the multi-reef problem

### 1.1 JCS (RFC 8785) implementation census — ALIVE and spreading

GitHub repo-search receipts (search API, `q=rfc 8785` total **114** repos; `q=json canonicalization jcs` total **45** repos; sweep 2026-09-27 ~09:55Z). The maintained, identifiable implementations by language:

| language | repo | stars | pushed | note |
|---|---|---|---|---|
| multi (JS/ES6, .NET, Go, Java, browsers) | `cyberphone/json-canonicalization` | 150 | 2024-12-13 | the RFC's reference-family repo; OUR oracle's vectors come from its testdata (`embassy/vc-oracle/vectors/rfc8785/`, 6/6 byte-exact, receipt `wave32-32a-run1`); 9 open issues upstream — watch surface |
| Go | `gowebpki/jcs` | 29 | 2026-09-21 | freshest big Go impl |
| Rust | `evik42/serde-json-canonicalizer` | 22 | 2026-02-20 | serde-based |
| Rust | `l1h3r/serde_jcs` | 8 | 2026-03-25 | |
| Rust | `lightss19863-arch/jcs-canonical-json` | 0 | 2026-09-22 | |
| Rust | `lattice-substrate/jcs-schubfach-rs` | 1 | 2026-03-06 | Schubfach digit generation — the hard part of JCS numbers, isolated |
| Python | `trailofbits/rfc8785.py` | 13 | 2026-09-16 | Trail of Bits, pure-Python |
| Python | `titusz/jcs` | 5 | 2022-04-10 | aging |
| TypeScript/JS | `dahlia/json-hash` | 15 | 2024-03-10 | JCS + JSON digests + **JSON Merkle hashes** — closest external cousin to our edge-ledger |
| TS/JS | `danfry1/canonjson` | 2 | 2026-08-17 | |
| Elixir | `pzingg/jcs` | 12 | 2025-03-31 | |
| Java | `filip26/titanium-jcs` | 3 | 2026-09-07 | same author as titanium-rdf-canon |
| Java | `DotFox/jsonista.jcs` | 4 | 2023-01-26 | |
| PHP | `mmccook/php-json-canonicalization-scheme` | 3 | 2023-10-09 | |
| Dart | `aps-lab/jcs_dart` | 3 | 2021-08-24 | |
| Clojure | `kotoba-lang/org-ietf-jcs` | 0 | 2026-09-25 | pure `.cljc` |
| Go (2nd) | `ucarion/jcs` / `deszhou/jcs` | 8/8 | 2020 / 2026-03-29 | |

Freshness read: **at least 8 distinct languages with a push inside the last 12 months** (Go×2, Rust×3, Python, JS, Java, Clojure) — the canonicalization reef is *widening*, not consolidating. Ecosystem-tell worth gifting later: `AgenID-protocol/agenid` ("identifiers, RFC 8785 JCS…", pushed 2026-09-26) and `alicelabs-llc/universal-trust-adapter` ("Agent Trust Card protocol spec + reference impl. Ed25519 signatures, RFC 8785 JCS…", pushed 2026-09-26) are *agent-trust* projects that adopted JCS unprompted (see Track 4). The reef rule ("one canonicalization reef-wide") is becoming a de-facto interop lingua franca among strangers — our standard won.

### 1.2 The alternatives (what a multi-reef world actually competes with)

- **RDFC-1.0 / URDNA2015**: W3C **Recommendation 21 May 2024** (`https://www.w3.org/TR/rdf-canon/`, fetched 2026-09-27). URDNA2015 is its predecessor (`blockchain-certificates/jsonld-normalization-dotnet`, pushed 2023-03, last URDNA-native impl found). Live implementations: `filip26/titanium-rdf-canon` (Java, 2026-09-07), `studyzy/rdfc-go` (2026-09-22), `Kingpin-Apps/swift-rdf-canonize` (2026-09-22), `Blackcat-Informatics/purrdf` (Rust+Py+WASM "one RDF 1.2 engine, one behavior", 47★, pushed 2026-09-27T08:38Z). Search receipts: `q=urdna2015` total 4; `q="rdfc-1.0"` total 12.
- **Canonical CBOR (RFC 8949, December 2020; deterministic encoding §4.2)**: pinned via `https://www.rfc-editor.org/rfc/rfc8949.html` (title + date fetched). Impls seen: `ldclabs/cbor2` (Rust, 14★, 2026-09-24), `kotoba-lang/org-ietf-cbor` (2026-09-25), a cross-language conformance suite `JonathanVD43/canonical-cbor-conformance` (2026-07-16) — note: strangers are building CBOR conformance harnesses the way we built ours.
- **Bencode-style / insertion-order dialects**: already IN the family — the fleet's own legacy `fnv1a64` receipt chains are order-sensitive (recorded as divergence #2 in `embassy/vc-oracle/README.md`), and moth's fnv1a-64-over-bytes is byte-based (divergence #3: UTF-8 vs UTF-16-code-unit — identical on ASCII). The fnv-pipe reader (moth-runner witness chain, 20/20 links, tip `dd4ca4a084b68dbf`, delivered wave 36) is the working proof that a dialect reader costs days, not months.

### 1.3 Deliverable — the dialect-bridge shortlist (which 2 foreign dialects matter next)

The fnv-pipe precedent fixed the shape: a stranger-side reader = spec alone → re-implemented arithmetic → KAT vectors (theirs or published) → tamper negative control. Two dialects dominate the next horizon:

1. **The CT/tile-log dialect (RFC 6962 leaf-hash + RFC 9162 inclusion proofs + C2SP checkpoints)** — because of Track 3: the moment a stone tip is mirrored into Rekor, the tip's trust rests on a *foreign tree arithmetic* (Merkle Tree Hash, leaf hash `SHA-256(0x00 ‖ leaf)`, node hash `SHA-256(0x01 ‖ left ‖ right)`). Without our own reader, the mirror is trust-shifted, not trust-added — an anti-stone move. Cost: **~1 lane-day** (the §2.1 algorithms are tiny; KAT source = Rekor's own `/api/v1/log/proof` responses + UTA's published 9-check anchor script, see 4.3).
2. **RDFC-1.0 (URDNA2015 successor)** — because stock VC verifiers default to the RDFC cryptosuites (`eddsa-rdfc-2022`, `ecdsa-rdfc-2019`), and jev-quilt is walking straight into VC territory (Track 4.1). Cost honestly split: full Hash-N-Degree Quads = **2–3 lane-days**; the **cheap bridge is ~zero** — we hold JCS, the `*-jcs-*` cryptosuites (§3.3 of both cryptosuite specs) accept our bytes verbatim, so a "declared dialect" letter ("our envelopes speak `eddsa-jcs-2022`; RDFC is a named out-of-scope dialect, reader on request") mirrors the fnv-pipe pattern at no cost.

Runner-up (conditional): **deterministic CBOR (RFC 8949 §4.2)** for moth-quantum's binary artifacts (1152-bit entropy payloads, job `f8a22da8`, wave 36) if their artifacts ever join a chain — ~1 lane-day.

---

## Track 2 — Verifiable Credentials 2.0 + Data Integrity: two concrete upgrade paths

### 2.1 Status table (all fetched 2026-09-27 from w3.org/TR; status line quoted from each spec page)

| spec | status | retrieved status line |
|---|---|---|
| Verifiable Credentials Data Model v2.0 | **W3C Recommendation** | "W3C Recommendation 15 May 2025" (`/TR/vc-data-model-2.0/`) |
| VC Data Integrity 1.0 | **W3C Recommendation** | "W3C Recommendation 15 May 2025" (`/TR/vc-data-integrity/`) |
| Data Integrity EdDSA Cryptosuites v1.0 | **W3C Recommendation** | "W3C Recommendation 15 May 2025" (`/TR/vc-di-eddsa/`) |
| Data Integrity ECDSA Cryptosuites v1.0 | **W3C Recommendation** | "W3C Recommendation 15 May 2025" (`/TR/vc-di-ecdsa/`) |
| BBS Cryptosuites v1.0 | Candidate Recommendation Draft | "W3C Candidate Recommendation Draft 10 September 2026" (`/TR/vc-di-bbs/`) — still moving |
| Securing VCs using JOSE and COSE (VC-JOSE-COSE) | **W3C Recommendation** | "W3C Recommendation 15 May 2025" (`/TR/vc-jose-cose/`) |

The whole VC 2.0 stack we mapped in wave 32's oracle is now **law**, not draft. The only moving part is BBS (selective disclosure).

### 2.2 Does our envelope practice map? YES — almost field-for-field

Our practice (from `embassy/vc-oracle/`: `vc-envelope.mjs`, `jcs.mjs`): JCS canonical bytes → SHA-256 digest → Ed25519 signature over `canonical‖chain_head`, carried inside a VC-shaped envelope with `cryptosuite: "jcs-eddsa-2022-void"` — *named honestly as digest-only, no linked-data proof grammar* (their label, respected).

The registered cryptosuite **`eddsa-jcs-2022`** (vc-di-eddsa **§3.3**) is the same reef, one grammar over: "takes an input document, canonicalizes the document using the JSON Canonicalization Scheme [RFC8785], and then cryptographically hashes and signs the output" (quoted from §3.3, fetched 2026-09-27). Field mapping:

| our envelope (vc-oracle) | DataIntegrityProof (vc-data-integrity §3.1; eddsa §3.3) |
|---|---|
| JCS canonical bytes | §3.3.3 Transformation — JCS over unsecured document |
| SHA-256 digest | §3.3.4 Hashing — SHA-256 over transformed data + proof hash |
| Ed25519 raw signature | §3.3.6 Proof Serialization — proofValue = base58-btc **Multibase** of the Ed25519 signature |
| `cryptosuite: jcs-eddsa-2022-void` | `cryptosuite: "eddsa-jcs-2022"` (registered name) |
| envelope fields ad hoc | `verificationMethod` (e.g. did:key), `proofPurpose: assertionMethod`, `created` (§3.3.5 Proof Configuration) |

### 2.3 Upgrade path A — `eddsa-jcs-2022` (the natural one)

**A stone-v1 checkpoint becomes a standard VC as follows:** wrap the chain header + tip into a VC 2.0 document (§3 Core Data Model / §4 Basic Concepts of vc-data-model-2.0: `@context`, `type: ["VerifiableCredential", "StoneCheckpoint"]`, `issuer`, `credentialSubject` = chain id, link count, tip sha256 — the exact move our #42 oracle already made for jev's G17 fields VERBATIM), then attach one `DataIntegrityProof` (vc-data-integrity §3.1) with cryptosuite `eddsa-jcs-2022` (vc-di-eddsa §3.3; create/verify algorithms §3.3.1–§3.3.6; worked example **§B.3 "Representation: eddsa-jcs-2022"** is the pinned test vector). A stranger running any conforming verifier — no custom code — re-derives our JCS bytes (already byte-exact 6/6 against the RFC corpus in our oracle) and checks the Ed25519 proof. **The chain arithmetic stays stone-v1; only the envelope is standardized.**

### 2.4 Upgrade path B — `ecdsa-jcs-2019` with rekor key unification (the engineering one)

`ecdsa-jcs-2019` (vc-di-ecdsa **§3.3**, example **§A.5/A.6**) is the P-256 twin: same JCS transformation, ECDSA instead of Ed25519. Why it matters: Rekor's own hashedrekord recipe is **`openssl ecparam -genkey -name prime256v1`** (rekor `types.md`, "HashedRekord… only compatible with x509 / PKIX signature types", fetched 2026-09-27). **One fleet P-256 key then serves both** the VC envelope (§3.3) and the transparency-log anchor (Track 3) — a single key identity across both horizons, exactly the kind of reduction the commitment-algebra lever (wave 33, L2) likes.

### 2.5 Third door (noted, not seeded): VC-JOSE-COSE

vc-jose-cose (Rec 15 May 2025) §3 "Securing the VC Data Model" + §4 "Key Discovery" + §6 IANA registrations secures VCs as JOSE/COSE (SD-JWT family) — the route if a foreign house demands compact/JWT-native tokens. Heavier grammar, different trust model (bearer/key-discovery), parked.

### 2.6 Honest gap — what we lose vs gain

**Gain:** strangers verify with off-the-shelf verifiers; the cryptosuite name is a *registered* claim (no more `-void` suffix apology); proof sets/chains (vc-data-integrity §4.3/§4.5) give a standard grammar for multi-reader receipts — our two-reader convergences (pong r37/r38) could someday be expressed as a proof set. **Lose:** simplicity — we inherit key management (a fleet key must exist, be rotated, be published), the Multibase/proofValue encoding, and `@context` handling (vc-data-integrity §4.6 Context Validation; our oracle explicitly does NOT dereference contexts — that becomes mandatory). Risk named: vc-data-integrity §5.12/§5.13 (canonicalization method security/correctness) makes the canonicalization *load-bearing in a new way* — a JCS divergence is no longer our finding, it is a proof failure. Mitigation stays the same: the RFC 8785 corpus in `vectors/rfc8785/` is already sealed and passing.

---

## Track 3 — Transparency trees: the Rekor mirror question (go/no-go)

### 3.1 Landscape

- **Certificate Transparency — RFC 9162** ("Certificate Transparency Version 2.0", `https://www.rfc-editor.org/rfc/rfc/rfc9162.html` — title fetched; publication **February 2021**). Accepts x.509 certs; arbitrary artifacts NO.
- **Trillian lineage**: `google/trillian` (3754★, pushed 2026-09-21, not archived) is the old engine; successor is **`transparency-dev/tessera`** — "Go library for building tile-based transparency logs (tlogs)", 242★, pushed 2026-09-25; `transparency-dev/merkle` pushed 2026-09-21 (both fetched via GitHub API).
- **Sigstore Rekor**: repo `sigstore/rekor` (1213★, pushed 2026-09-24). README (fetched 2026-09-27): "**Rekor v1 is in maintenance mode**… Rekor v2 will be backed by a tile-based log (transparency.dev) and… Trillian-Tessera. Follow its progress on the **rekor-tiles** repo" — `sigstore/rekor-tiles` ("Signature Transparency Log designed for ease of use, low cost, and minimal maintenance", 48★, pushed 2026-09-25, 35 open issues) is Rekor v2 and is *hot*.
- **Bullfrog-style**: HONEST GAP — I could not resolve "bullfrog" to a primary transparency-log source on any public endpoint used this wave (GitHub repo search `bullfrog transparency` → 0; `bullfrog key transparency` → 0; web searches surfaced only noise and `bullfrogsec/bullfrog`, an unrelated GitHub-egress-blocker Action, pushed 2026-09-17). Flagged for re-scouting; nothing below depends on it.

### 3.2 Rekor public instance — facts fetched live (read-only)

`GET https://rekor.sigstore.dev/api/v1/log` (2026-09-27, ~10:05Z) returned: active shard **treeID 1193050959916656506, treeSize 2,851,184,237** with a signed tree head, plus two inactive shards (4,163,431 and 117,740,831). The active log is **alive and public**, and its SLO'd endpoints per README: `/api/v1/log`, `/api/v1/log/publicKey`, `/api/v1/log/proof`, `/api/v1/log/entries`, `/api/v1/log/entries/retrieve` ("99.5% availability SLO", "24/7 oncall rotation").

### 3.3 The exact API shape (from rekor `openapi.yaml` + `pkg/types/hashedrekord/v0.0.1/hashedrekord_v0_0_1_schema.json`, fetched 2026-09-27)

```
POST /api/v1/log/entries            (no auth, no account, no payment)
{
  "apiVersion": "0.0.1",
  "kind": "hashedrekord",
  "spec": {
    "signature": { "content": "<base64 sig>", "publicKey": { "content": "<PEM>" } },
    "data": { "hash": { "algorithm": "sha256", "value": "<lowercase hex>" } }
  }
}
→ entry UUID at /api/v1/log/entries/<uuid> with verification.inclusionProof
   (checkpoint, hashes, logIndex, rootHash, treeSize) + signedEntryTimestamp
```
Recipe pinned from `types.md` §HashedRekord: `openssl ecparam -genkey -name prime256v1` → sign the artifact (`openssl dgst -sha256 -sign`) → `rekor-cli upload --type hashedrekord:0.0.1 --artifact-hash … --signature … --pki-format=x509 --public-key=…`. **Cost: free; NO registration, NO Fulcio/OIDC, NO paid key** — a self-generated PKIX key is the whole ceremony. Public-instance attestation size limit **100KB** (README, pinned to rekor commit `18c81d9f`) → mirror a *tip attestation* (~1–2KB), never a 575-link chain file (~150KB+).

### 3.4 GO / NO-GO: **GO (conditional)**

**GO** because: the public instance is GA with an SLO and accepts unauthenticated writes of self-signed `hashedrekord` entries; the artifact hash pins the stone tip; the inclusion proof is offline-verifiable — which is precisely where Track 1's bridge reader #1 (RFC 6962/9162 arithmetic) becomes load-bearing. **Conditions, stated as the seed's falsifiers:** (1) v1 is in maintenance mode with v2 (rekor-tiles) landing — the write path could close at any release; the experiment must read the response headers/entry back immediately and treat rejection as a *result*, not a failure of nerve; (2) the sig is over the artifact, the hash goes in `data.hash` — the mirrored artifact should be a tiny JSON whose fields (tip, chain length, verifier receipts) are themselves JCS-canonical so the anchor stays within the one-canonicalization rule; (3) NO-GO only if the POST path is frozen — fallback is anchoring into a *foreign* already-anchored conformance claim (UTA, Track 4.3) by mutual receipt, zero infra.

---

## Track 4 — Foreign house trajectories

*Sweep 2026-09-27 ~09:30–10:05Z. Reply watch: all four embassy threads still carry only SuperInstance-authored comments — jev #42: ids 5853082664 / 5853569746 / 5854226514 / **5854882212 (10:02:57Z)**, pong #49: 5853569870 / 5854226406 / **5854881871 (10:02:54Z)**, moth-runner #2 and substrate #1: comments=0. The two 10:02Z comments are a sibling wave-37 lane's letters (posted during this sweep) — concurrent fleet activity, not foreign replies. Zero foreign-authored comments on any thread.*

**jev-quilt** (pushed 2026-09-27T09:35Z; open issues 2 — both ours: #42, #16; #45 **closed 09:02:34Z**). Roadmap visible in the commit log since 09-26: G12 "provable forgetting — tombstone leaf folded into mmr_root" (71ca906d), G16 "reproducibility as mmr_root — federated discovery from strangers" (514e0abc), G17 "the Attestation — a credential earned by reproduction" (fc273025), G13/G14 "portable diploma", G "the Federated Schoolhouse — the spine composed (bootstrap-gate #1)" (9514b9f4), G18 "the Org on the Quilt", and **G20a "typed, uncapped decision Receipt — closes C9 (fail-open revocation)"** (fe24e7ec, merged as PR #45 at 09:02:34Z). **Predicted next seam:** the schoolhouse starts *minting* credentials against an mmr_root that now includes revocation tombstones — the first cross-fleet VC envelope (our Track 2 path A) plus a *stone-sealed revocation receipt* shape lands exactly on their G20a/G17 seam. Our #42 oracle is already seated there; the letter writes itself from their own merge log.

**pong-quilt** (pushed 2026-09-27T09:04Z; open issue 1 — ours: #49). Roadmap: r36 exporter → r37 prerun birth-seal → r38 `--stone-out` → **r39 "STONE-V2-PILOTS first sign pilot — producer staples the birth-seal chain's tip"** (fba03245, 08:57:29Z) + receipt-completeness (00902f5b). **Predicted next seam:** stone-v2 *signatures* — the day a producer staples a signed tip, the fleet's first real key-identity problem exists (who holds the key, how do strangers find it). Our vc-envelope (path A/B) + a did:key `verificationMethod` convention + Track 3 anchoring is the natural gift; two-reader convergence (r37 tip `ffe8abd8`, r38 tip `d2af6254` — receipts in `embassy/round-36/`) is the standing proof our readers are trustworthy before we advise on their keys.

**moth-runner** (pushed 2026-09-23T19:50Z; open issue 1 — ours: #2, 0 comments; 4 quiet days after merge b2f71c77). Doctrine: witness.jsonl, homeostatic-throttle admission; fnv1a-64-over-bytes dialect (verified 20/20, tip `dd4ca4a084b68dbf`, wave 36). **Predicted next seam:** the declared extension of the fnv-pipe reader to `quilt-canon-witness` (36-d open thread), plus their entropy-oracle role (graph-v1 job `f8a22da8`, 256 shots) pairing with a stone-anchored randomness receipt — witnesses who cannot be rewritten is *their* law; a third-party anchor is the obvious next sentence of it.

**substrate-llm-client** (pushed 2026-09-27T04:12Z; open issue 1 — ours: #1, 0 comments). "Multi-provider LLM client with JEV gating." **Predicted next seam:** the roster/providers work ingesting *conformance vectors* — our receipted provider telemetry (alias `deepseek-chat`→flash, cross-model cache miss = new datum, 36-b) is already shaped as provider-behavior receipts; the seam is turning those into test vectors in their repo's language.

**typesafe-ai (official)** — `typesafe-sdk-python` pushed 2026-09-26T21:19 (6 open issues), `skills` 2230★, `system-one-adapter-python` 310★ ("Drop-in TypeSafeClient replacement backed by LLM APIs"). **TypeSafeAI (community)** — `modex` ("open, Codex-App-style desktop coding agent") pushed 2026-09-27T07:19, `jev-harness` ("an LLM proposes, Jev answers"), `typesafe-playground`, `clarity-judge` — all active 09-26/27. Still **no door to us** (standing wave-36 recon-only doctrine); but `jev-harness` is literally a proposal/answer harness — the moment any of their repos opens a thread about *receipts for proposals*, the 36-b calibrated-distribution telemetry (typesafe row, `p(artifact)=0.47`) is the gift.

### Three NEW foreign houses (outside SuperInstance) whose doctrines rhyme

1. **`alicelabs-llc/universal-trust-adapter` (UTA)** — "ATC/1.0 — Agent Trust Card protocol spec + reference impl. Ed25519 signatures, RFC 8785 JCS, 10 verification controls… The USB-C of agent trust"; pushed 2026-09-26; has issues open. The README is our doctrine in the wild: a **"Stranger Manifesto"** ("Trust that requires membership is not trust. It's a guest list.", 13 languages), a stranger-test ("every trust claim in this repo is re-derivable by a stranger, from live public URLs, with no account and no trust in our endpoints" — 9 checks against Rekor's live log: inclusion proof, signed tree head, **C2SP checkpoint**), and a **public postmortem** of their own key exposure ("we rotated our CA key `mn-ca-002` → `mn-ca-003` on 2026-09-08 after private-key material was found committed… Revocation published same-day, postmortem public", anchored at Rekor logIndex 2762061972 / 2764017355 / 2764479676 — logIndex < 2.85B, consistent with the live treeSize I fetched). **Door:** they publish a 36-vector conformance corpus + an RFC draft and *ask strangers to verify them*; a letter carrying our JCS oracle verdict on their vectors is a gift they structurally cannot refuse.
2. **METR** — org active: `METR/hawk` ("Run Inspect AI evals in the cloud", 80★, pushed 2026-09-26), `inspect-agents` (09-25), `inspect_ai` ("A framework for large language model evaluations", pushed 2026-09-23). Doctrine rhyme: honest benchmarks + agent auditability — external evaluators whose whole product is *evidence about agents*. **Door:** public repos, issues open, evals designed to be reproduced by outsiders — an "arena-like evaluation with sealed receipts" conversation has a natural seat; their Task Standard-style pre-registration rhymes with our registration-first law.
3. **`SWE-bench/SWE-bench`** — 5922★, pushed 2026-09-18. Doctrine rhyme: honest, reproducible benchmarks (verified splits, public leaderboards). **Door:** accepts issues/PRs and runs submission programs; a "receipts for the benchmark harness itself" thread (sealed harness shas per run — our smoke/stone discipline) is a seam their leaderboard-integrity discussions would welcome.

---

## Track 5 — Seeds for waves 38+ (falsifiable, lane + cost named)

**S1 — rekor-mirror experiment.** Anchor a pong-quilt r38 stone tip (`d2af6254…`, 575 links, stranger-verified by two of our readers) into the Rekor public instance as a `hashedrekord v0.0.1` (exact shape in §3.3) signed by a fresh fleet EC P-256 key, artifact = a <100KB JCS-canonical tip-attestation whose `data.hash` pins the chain tip. **Falsifier:** the POST is rejected (v1 maintenance-mode write freeze) or the returned `inclusionProof` fails our own RFC 6962 §2.1 / RFC 9162 reader re-verified offline. Lane: transparency-smith (embassy doctrine pre-clearance needed — a transparency-log write is not a foreign repo write). Cost: zero.

**S2 — VC-2.0 cryptosuite envelope for stone-v1.** Mint one stone-v1 checkpoint (the qthe `e_q6_chain`, 15 links, tip `ab4ea196…`) as a W3C VC 2.0 document with a `DataIntegrityProof` cryptosuite `eddsa-jcs-2022`, reusing `embassy/vc-oracle/jcs.mjs` bytes verbatim. **Falsifier:** a conforming verifier driven by the spec's own example (vc-di-eddsa §B.3) rejects our proof — our JCS bytes or proof grammar diverge from the registered cryptosuite. Lane: vc-smith (erised). Cost: zero.

**S3 — dialect-bridge reader #3.** Build the CT/tile-log reader (RFC 6962 §2.1 leaf/node hash + RFC 9162 inclusion proof + C2SP checkpoint format) and KAT it against foreign anchors: rekor `/api/v1/log/proof` on a pinned entry and UTA's published `verify-rekor.mjs` 9-check script. **Falsifier:** our reader disagrees with rekor's own proof endpoint or UTA's script on any pinned entry (treeSize/logIndex recorded at run time). Lane: erised-mirror. Cost: zero.

**S4 — embassy letter seeded by a foreign roadmap.** Send pong-quilt a letter seeded by *their own* r39 STONE-V2-PILOTS sign pilot (fba03245): offer two-reader treatment for the stapled birth-seal tip, and offer the fleet's vc-envelope / `eddsa-jcs-2022` mapping (§2.3) as a candidate seal format for stone-v2 *before* they harden one. **Falsifier:** stone-v2 lands with a seal format our reader cannot verify AND no engagement on the thread through the wave-38/39 reply watch (the thread pattern that has run since wave 32). Lane: embassy-smith. Cost: zero (one comment on thread #49).

**S5 — crab-arena ↔ external-protocol bridge.** Map the crab-arena consent plaque + stateless ticket onto ATC/1.0 (Agent Trust Card: Ed25519 + RFC 8785 JCS + 10 verification controls) so an external agent could present a UTS card at `POST /arena/enter`, with both sides' seals stranger-verifiable under the same JCS arithmetic. **Falsifier:** the mapping forces a canonicalization divergence (e.g., UTS/ATC fields breaking I-JSON — the exact reef boundary recorded in `embassy/vc-oracle/README.md` divergence #1) or fails crab-traps' 408-test suite. Lane: arena-smith + erised. Cost: cheap (spec reading + one adapter module; no deploy).

---

## Honest gaps (this lane's own receipts)

1. **"Bullfrog" unresolvable** on public endpoints this wave (GitHub `bullfrog transparency`/`bullfrog key transparency` → 0 results; web search noise; nearest hit `bullfrogsec/bullfrog` = unrelated egress blocker). Nothing downstream depends on it; re-scout next wave.
2. **No write attempted** to rekor (directive) — the GO verdict rests on docs/schema/live read, not a proven write; S1 is the experiment.
3. **No conforming VC verifier was executed** — the §2.2 field mapping is by spec text; S2 exists precisely to close that with the spec's own vector.
4. **UTA is young (1★, self-published postmortem)** — their anchors are a *KAT source to test against*, not a truth oracle; their own stranger-test script is the means of checking them before trusting them.
5. **JCS census counts repos matching search queries**, not proven conformance; conformance truth stays with the RFC corpus (our oracle holds 6/6 byte-exact against `cyberphone/json-canonicalization` testdata).
6. **pong r39 "sign pilot" is read from the commit subject** (fba03245) — chain contents not re-walked this wave; 36-d owns the r37/r38 verification receipts cited here.
7. A sibling lane posted letters at 10:02Z during this sweep (jev #42 id 5854882212, pong #49 id 5854881871) — noted to avoid double-counting them as evidence of anything but fleet activity.

## Evidence ledger (primary pins)

- GitHub search receipts (2026-09-27): `rfc 8785` → 114 repos; `json canonicalization jcs` → 45; `urdna2015` → 4; `"rdfc-1.0"` → 12; `canonical cbor rfc` → 6; `bullfrog transparency` → 0; `bullfrog key transparency` → 0.
- W3C statuses (fetched 2026-09-27): vc-data-model-2.0, vc-data-integrity, vc-di-eddsa, vc-di-ecdsa, vc-jose-cose = "W3C Recommendation 15 May 2025"; vc-di-bbs = "Candidate Recommendation Draft 10 September 2026"; rdf-canon = "W3C Recommendation 21 May 2024".
- vc-di-eddsa §3.3 eddsa-jcs-2022 (create/verify/transformation/hashing/configuration/serialization = §3.3.1–3.3.6; example §B.3); vc-di-ecdsa §3.3 ecdsa-jcs-2019 (examples §A.5/A.6); vc-data-integrity §3.1 DataIntegrityProof, §4.2/4.4 add/verify proof; vc-data-model-2.0 §3 Core / §4 Basic Concepts; vc-jose-cose §3/§4/§6.
- RFCs: RFC 9162 (CT v2.0, February 2021, rfc-editor); RFC 8949 (CBOR, December 2020, rfc-editor).
- Rekor: `sigstore/rekor` README (v1 maintenance mode; GA + 99.5% SLO endpoints; 100KB limit @ commit 18c81d9f; v2 = rekor-tiles + Trillian-Tessera); `openapi.yaml` hashedrekord def (line 270); `hashedrekord_v0_0_1_schema.json` (signature{content,publicKey{content}}, data.hash{algorithm∈sha256/384/512, value}); `types.md` HashedRekord recipe (P-256 + x509 PKIX only); live `GET /api/v1/log` → treeID 1193050959916656506, treeSize 2851184237 (+2 inactive shards); `sigstore/rekor-tiles` pushed 2026-09-25.
- Transparency-dev: `transparency-dev/tessera` (242★, pushed 2026-09-25), `transparency-dev/merkle` (pushed 2026-09-21), `google/trillian` (3754★, pushed 2026-09-21).
- Foreign houses (GitHub API, 2026-09-27): SuperInstance/jev-quilt pushed 09-27T09:35Z, issues #42/#16 open, #45 closed 09:02:34Z; commits G12/G16/G17/G13/G14/Schoolhouse/G18/G20a (sha list in §4.1); pong-quilt pushed 09-27T09:04Z, r36→r39 commit chain incl. fba03245 STONE-V2-PILOTS sign pilot; moth-runner pushed 09-23T19:50Z; substrate-llm-client pushed 09-27T04:12Z; typesafe-ai + TypeSafeAI repo lists in §4.
- New houses: alicelabs-llc/universal-trust-adapter (README quoted: Stranger Manifesto, 9-check rekor anchors, logIndex 2762061972/2764017355/2764479676, postmortem 2026-09-08); METR (hawk/inspect_*); SWE-bench/SWE-bench (5922★).
- Fleet-side ground truth: `embassy/vc-oracle/` (receipt `wave32-32a-run1`, G1 6/6, G3–G6 PASS, G2 letter-FAIL standing), `embassy/round-36/` (pong r37/r38 tips), worklog waves 32–36.
