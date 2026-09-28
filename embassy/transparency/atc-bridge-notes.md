# atc-bridge-notes.md — lane 40-a transparency-smith (desk-check, no wire traffic)

**Subject:** `embassy/vc-envelope/stone-checkpoint.vc.json` (sha256 `94aa82cdde3a717dc9aa68729d9ef96a398daa39d2d83204edea26f5ba75b1e5`, VC 2.0 envelope) vs the ATC / Universal Trust Adapter spec surface.

## Sources (pinned, fetched 2026-09-27)

| Source | Pinned SHA | Content sha256 |
|---|---|---|
| alicelabs-llc/universal-trust-adapter `main` (canonical repo; formerly atc-spec) | `9f44abda5033e17949f692cca0a7544b69907055` | — |
| ↳ `spec/RFC-ATC-v3-Draft-00.md` (378 ln, ATC/3.0-extended finalized 2026-09-17) | ″ | — |
| ↳ `spec/UTS-v1.md` (Universal Trust Schema, canonical translation layer) | ″ | — |
| alicelabs-llc/MARKETNOW `docs/atc-spec/SPEC.md` — **ATC/1.0 spec** (pointer cited in UTA README "ATC/1.0 · Public, stable · Single-sig (Ed25519)") | repo `ccaa316e9d9043cee2d6ed0a32aee1dd94778752` | `62666ab5f11554781ab0f049e03c8315a777047bec6cb3ed5ae8b03c9dbd9977` |

## Our envelope surface (desk-read)

`@context: ["https://www.w3.org/ns/credentials/v2"]` (VC 2.0) · `type: ["VerifiableCredential","StoneCheckpointCredential"]` · issuer `did:key:z6MkjkY3…` · `proof`: **DataIntegrityProof / cryptosuite `eddsa-jcs-2022`**, fields `{type, cryptosuite, created, verificationMethod, proofPurpose, @context, proofValue}` (note: the proof carries its own `@context` binding), verificationMethod `did:key:z6MkjkY3…#z6MkjkY3…`.

## Desk-check vs ATC/1.0 (MARKETNOW SPEC.md)

1. **Cryptographic core ALIGNS.** ATC/1.0 mandates Ed25519 (RFC 8032) over **RFC 8785 JCS canonical JSON** with `signed_payload_hash` = SHA-256 of the canonical payload; our cryptosuite `eddsa-jcs-2022` is exactly Ed25519-over-JCS. Byte-level philosophy is the same; a bridge verifier only needs a proof-shape adapter, not new crypto.
2. **Proof-shape DIVERGES.** ATC/1.0 uses a flat `attestation.signature` / `signed_payload_hash` pair verified by: JCS(payload with signature="") → SHA-256 → compare hash → verify Ed25519 against `ca_public_key`. Ours is the W3C VC 2.0 DataIntegrityProof model (`proofValue` base58btc-b64, `verificationMethod` did:key, no CA). Bridge implication: **trust-anchor mismatch is the real work** — ATC/1.0 pins a `ca_public_key` + `ca_url` + revocation list; ours is self-certifying did:key (mesh trust, cf. our pong/birth-seal verifier chains). A bridge must decide which anchor to honor; hash-and-sign of the *other* side's canonical form is trivial.
3. **Enrollment surface.** ATC/1.0 wants `issued_at`/`expires_at` (fail-closed expiry), `ca_url`, revocation endpoint, capability manifest, evidence block. Our envelope carries `validFrom` (VC 2.0 camelCase) and no `expiresAt`/`ca_url`/revocation pointer — an ATC-conformant bridge card would need `expires_at` + revocation URL added (VC 2.0 `validUntil` maps naturally).
4. **Type systems.** `type: ["VerifiableCredential","StoneCheckpointCredential"]` — ATC expects `AgentTrustCard`-ish type; VC type-array inheritance makes an extra `AgentTrustCredential` type additive, non-breaking.

## Desk-check vs ATC/3.0 (UTA repo RFC-ATC-v3)

- v3's multi-format `signatures[]` array (formats seen: `atc-ed25519` Ed25519/JCS/base58btc required-minimum; `eat-cwt` CWT/COSE; `w3c-vc` **Ed25519Signature2020 + `jcs_canonicalized: true`**; `signatures_provided[]` declared) is the cleanest bridge target: our JCS-canon Ed25519 proof is semantically a fifth format. But the format enum in the schema examples does NOT include `eddsa-jcs-2022`/DataIntegrityProof — the `w3c-vc` slot expects the older Ed25519Signature2020 suite (`proof_value`, `verification_method` did:key — same did:key shape as ours). Bridge cost: emit a parallel `Ed25519Signature2020` proof over the same JCS canonical bytes (cheap — same key, same canonicalization), or propose an additional format entry upstream.
- **UTS-v1** explicitly lists W3C VC as a translatable format (field table: `credential_subject.*` ↔ `sub`/`agent_id`, keys ↔ `public_key`, issuance dates) — a UTA adapter could ingest our envelope via its VC translator without schema surgery.
- Backward-compat clause (RFC-ATC-v3 §2.1): v3 verifiers accept v2.0 single-sig; a bridged card would ride this path.

## Verdict

Byte-compatible crypto (Ed25519+JCS both directions), shape-compatible did:key methods, but **three concrete deltas**: (a) proof model DataIntegrityProof vs flat signature+payload-hash (ATC/1.0) / Ed25519Signature2020 enum (ATC/3.0); (b) trust anchor did:key-mesh vs ATC CA + revocation list (the substantive one); (c) lifecycle field naming (validFrom/validUntil vs issued_at/expires_at + ca_url). All three are adapter-level, none cryptographic. No changes recommended to our envelope from the ATC side; if the embassy ever needs an ATC conformance surface, emit an additive `AgentTrustCredential` type + `Ed25519Signature2020` co-proof over the same JCS payload.

## Method notes / honesty

- Desk-check only — no submissions to any ATC endpoint, no credentials minted.
- ATC/1.0 SPEC.md read via pinned MARKETNOW master `ccaa316e…` (repo's canonical pointer per UTA README); UTA repo read via pinned `9f44abda…` (sparse checkout; file-level content hashes not individually recorded for the two spec .md files in the UTA repo — tracked by the repo SHA).
