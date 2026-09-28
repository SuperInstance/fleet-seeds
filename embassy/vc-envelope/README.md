# vc-envelope — a W3C VC 2.0 checkpoint for a stone-v1 chain (eddsa-jcs-2022)

Lane 38-a (vc-smith), seed **S2** from scout 37-f: mint ONE stone-v1 checkpoint
chain as a **W3C Verifiable Credentials 2.0** document carrying a
**DataIntegrityProof** with the **registered** cryptosuite `eddsa-jcs-2022`,
verified by two independent readers. Zero paid keys, zero foreign writes.

The scout's finding (worklog `Task ID: 37-f`, TRACK 2): our wave-32 envelope
practice (`embassy/vc-oracle`, `jcs-eddsa-2022-void`) maps field-for-field onto
the registered cryptosuite — this lane is the upgrade, executed.

## What was minted

`stone-checkpoint.vc.json` — a VC 2.0 credential whose `credentialSubject`
carries the qthe **e_q6** stone-v1 chain checkpoint (chain id, header, length,
tip sha256, the on-disk artifact link + file digest, and the attesting
verification method), secured by a DataIntegrityProof.

| field | value |
|---|---|
| `@context` | `["https://www.w3.org/ns/credentials/v2"]` (DM 2.0 §4.3: first value MUST be the v2 context) |
| `type` | `["VerifiableCredential", "StoneCheckpointCredential"]` (DM 2.0 §4.5) |
| issuer / validFrom | `did:key:z6MkjkY3QBSzMXq7c1pKEiEqtBFES7Yus4nq2Y88rHMx8Jjr` / `2026-09-27T10:38:05Z` (DM 2.0 §4.7/§4.9) |
| proof.type | `DataIntegrityProof` (vc-data-integrity §2.1) |
| proof.cryptosuite | `eddsa-jcs-2022` (vc-di-eddsa §3.3) |
| proof.verificationMethod | `did:key:z6MkjkY3…#z6MkjkY3…` (Ed25519 Multikey) |
| proof.proofPurpose | `assertionMethod` |
| proof.proofValue | `z3ovApYvRhgWrVt3p9rD3cLPp2u28tPFYwSKHUDU2tHEWwEQmNnNfG4epa2gmFtQ9bLRSzCBQ9bdsSp5p5ouojAdm` (base58-btc Multibase, 64-byte Ed25519) |

## Spec sections pinned by URL (all W3C Recommendation 15 May 2025 unless noted)

- VC Data Model 2.0 — <https://www.w3.org/TR/vc-data-model-2.0/> — §3 Core Data
  Model (`#core-data-model`), §4.3 Contexts (`#contexts`), §4.5 Types
  (`#types`), §4.7 Issuer, §4.8 Credential Subject, §4.9 Validity Period
- VC Data Integrity 1.0 — <https://www.w3.org/TR/vc-data-integrity/> — §2.1
  DataIntegrityProof (`#dataintegrityproof`), multibase proofValue
- Data Integrity EdDSA Cryptosuites v1.0 — <https://www.w3.org/TR/vc-di-eddsa/>
  — **§3.3** `eddsa-jcs-2022` (`#eddsa-jcs-2022`): §3.3.1 Create Proof,
  §3.3.2 Verify Proof, §3.3.3 Transformation, §3.3.4 Hashing, §3.3.5 Proof
  Configuration, §3.3.6 Serialization, §3.3.7 Verification; **§B.3** test
  vector (`#B.3`)
- JSON Canonicalization Scheme — <https://www.rfc-editor.org/rfc/rfc8785>
- credentials/v2 JSON-LD context — <https://www.w3.org/ns/credentials/v2>
- Local spec snapshot (receipt): `/home/z/my-project/scripts/38a-spec/`
  (vc-di-eddsa.html + extracted §3.3/§B.3 text; fetched from /TR/, uncommitted)

## Step 1 — the chain, verified from disk BEFORE enveloping (fail-closed)

House verifier `quilt-stone/stone.mjs` → `verifyChainFile` on
`/home/z/my-project/download/qthe/receipts/e_q6_chain.jsonl`:

```json
{"ok":true,"alg":"stone-v1","genesis":"STONE-GENESIS-1","links":15,
 "tip":"ab4ea19681888b11c2843b9ca43d12f652dca045338217dc5bf1b5cd9e477db0"}
```

- **15 links, tip `ab4ea196…`** — equals the pinned tip from scout 37-f and
  `qthe/experiments/outputs/e_q6_tip.txt`. Header row hash `0edd00dd…`
  (kind `stone.header`, experiment E-Q6, claim R3); tip row kind
  `verdict.EQ6` (R3 RESOLVED: S3 LIVE-READ ROW-MAJOR LWW).
- Honest path note: the directive named `qthe/experiments/receipts/…`; the
  chain lives at `qthe/receipts/e_q6_chain.jsonl` (located under qthe/,
  verified from disk before any enveloping).
- The credential does NOT embed the 15-link chain — it carries header + tip +
  the artifact's own sha256 over raw bytes
  (`3340b082…018cc`, 9242 bytes) so a verifier holding the file can recompute
  the tip and match the checkpoint. A checkpoint, not a luggage cart.

## Step 2 — KAT: the spec's own §B.3 vector first (fail-closed)

`verify.mjs` refuses to judge our document until it passes the spec's own
vector (§B.3, Examples 29–39) end-to-end — `kat-b3-results.json`:

| step | claim | verdict |
|---|---|---|
| K1 | JCS(Example 30) === Example 31 canonical credential, byte-exact | **PASS** |
| K2 | sha256(canonical credential) === Example 32 (`59b7cb62…`) | **PASS** |
| K3 | JCS(Example 33) === Example 34 canonical proof options, byte-exact | **PASS** |
| K4 | sha256(canonical proof options) === Example 35 (`66ab154f…`) | **PASS** |
| K5 | proofConfigHash ‖ documentHash === Example 36 | **PASS** |
| K6 | base58-btc decode(Example 38) === Example 37 signature hex | **PASS** |
| K7 | §3.3.2 Verify Proof(Example 39) === true (spec's own key) | **PASS** |
| K8 | KAT verify hashData === Example 36 combined hash | **PASS** |

**8/8 PASS** — then, and only then, the reader touched our VC.

## Step 3 — two-reader verification receipt

Both readers re-derive `hashData = sha256(proofConfig) ‖ sha256(document)` and
must agree byte-for-byte with the mint receipt:

`b941a0f2a40c5a6a9c46e08f3ad973f27c45ac3eae36fef4b78d44173912bbef` (proof cfg)
`9f1889e676f951fa7247076304bd8bbc5f12baa2ee6120927beec50500b33756` (document)

| reader | trust base | checks | verdict |
|---|---|---|---|
| **A** (`reader-a.mjs`) | committed `public-key.json` | did:key↔key-file **binding**; hashData re-derived via the house canonicalizer; **node:crypto `verify()`** (opposite direction of the mint's `sign()`) | **VERIFIED** (binding true, sigOk true, 64-byte sig) |
| **B** (`verify.mjs`) | the document ONLY | own base58-btc decoder + multicodec `0xed01`; §3.3.2 flow incl. the @context prefix rule; §3.3.5/§3.3.4 re-hash; §3.3.7 verify; **KAT-gated 8/8 first** | **VERIFIED** |

Tamper controls (reader B; the falsifier's inverse — the reader is not a
rubber stamp): subject byte-flip → rejected; proofValue byte-flip → rejected;
@context replacement → rejected by the §3.3.2 prefix rule.
`verify-receipt.json` verdict: **VERIFIED**, falsifier status: **NOT
triggered** — a spec-conforming, KAT-proven reader ACCEPTS our proof.

## Honest losses (named by scout 37-f — shown on our own artifact, not hidden)

1. **Key management.** The Ed25519 keypair was generated FRESH in the minting
   process (`node:crypto generateKeyPairSync('ed25519')`); the private key
   existed only in that process's memory and was **destroyed at process exit —
   never written to disk, never printed, never transmitted**. Only the public
   key is committed (`public-key.json`). Consequence: no rotation, no
   revocation, no continuity — a `did:key` checkpoint, not an identity.
2. **@context validation.** We ship the minimal v2 context and do NOT
   dereference/validate contexts at verify time. Demonstrated on our own
   artifact: APPENDING an extra context value still verifies (§3.3.2 only
   demands the prefix rule, then replaces the verification context with the
   proof's copy — receipted in `verify-receipt.json` under
   `specSemanticsReceipts.contextAppend`). Our custom terms (`stoneChain`,
   `artifact`, `verifiedBy`, the extra credential `type`) are plain JSON, not
   JSON-LD-typed; a strict processor maps them to unexpected terms.
3. **Canonicalization is proof-load-bearing.** Both readers share `jcs.mjs`
   (reused BYTES VERBATIM from `embassy/vc-oracle` per the seed, sha256
   `428e24ce17f6bf1db1e73ce5a1160db70081ecc9e36d48cf6dc531bba264d0c0`). The
   two-reader independence covers the proof grammar and the crypto — it is NOT
   a re-implementation of RFC 8785. That base is receipted separately by the
   RFC's own corpus (`embassy/vc-oracle/vectors/rfc8785/`, 6/6 byte-exact, G1).
4. **issuanceDate → validFrom.** The lane directive said "issuanceDate =
   today"; DM 2.0 renamed the field (change log: "Rename issuanceDate /
   expirationDate to validFrom / validUntil") and the v2 context defines only
   `validFrom` — so the credential carries `validFrom:
   2026-09-27T10:38:05Z`. Mapping receipted, not silently dropped.

## Files

| file | role |
|---|---|
| `stone-checkpoint.vc.json` | THE deliverable: the signed VC 2.0 document |
| `public-key.json` | committed Ed25519 public key + did:key + provenance note |
| `sign.mjs` | mint path (§3.3.1/3.3.3–3.3.6); fresh in-memory key per run |
| `verify.mjs` | reader B: independent §3.3.2 reader + KAT gate + controls |
| `reader-a.mjs` | reader A: node:crypto verify + key binding |
| `kat-b3-results.json` | §B.3 KAT outcome (machine-readable) |
| `verify-receipt.json` | reader B verdict + controls (machine-readable) |
| `jcs.mjs` | byte-verbatim copy of `embassy/vc-oracle/jcs.mjs` (RFC 8785) |

Re-run: `node verify.mjs && node reader-a.mjs` (verify first — it re-runs the
KAT gate). `node sign.mjs` mints a NEW key and overwrites the VC; the
committed artifact is the receipted one.
