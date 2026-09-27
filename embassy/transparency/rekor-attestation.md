# rekor-attestation.md — lane 40-a transparency-smith

**Deliverable class: submitted-and-REJECTED, receipted honestly** (lane task: "a rejected submit with exact response body receipted is an honest deliverable"). Full wire ledger: `rekor-submit-result.json`. Submitter script (armed for resubmit): `40a-rekor-submit.mjs`.

## What was attempted

Anchor `embassy/vc-envelope/stone-checkpoint.vc.json` (1904 bytes, `VerifiableCredential`+`StoneCheckpointCredential`, issuer `did:key:z6MkjkY3QBSzMXq7c1pKEiEqtBFES7Yus4nq2Y88rHMx8Jjr`) as a **rekor hashedrekord v0.0.1** entry on `https://rekor.sigstore.dev`:

- **Artifact digest:** sha256 `94aa82cdde3a717dc9aa68729d9ef96a398daa39d2d83204edea26f5ba75b1e5`
- **Key:** ephemeral Ed25519, generated in-process, never persisted (pub PEM sha256 `99ab1594cbe2f0fe3bb5383d49bd719f864a2b6c79598110592f62f1296d881c`)
- **Signature:** over the **digest bytes** per spec — `sigstore/rekor@904bbccce4df5e63c30209d7b7a00d9dda5400d6` `pkg/types/hashedrekord/v0.0.1/entry.go:272`: `sigObj.Verify(nil, keyObj, options.WithDigest(decoded), options.WithCryptoSignerOpts(alg))`; schema `hashedrekord_v0_0_1_schema.json` (sha256 `b8ecdc597ddb7e3289ae41e28fc3983ea25f248f531314a68dcc2361f3edada4`) permits `sha256|sha384|sha512`
- **Local self-verify before any wire traffic: true**

## Submit ledger (max-2 lane law respected)

1. `POST /api/v1/entries` → **404** `{"code":404,"message":"path /api/v1/entries was not found"}` ×2 — lane's own routing error; rekor **v1** spec path is `POST /api/v1/log/entries` (confirmed live: `GET /api/v1/log` = 200). Not a log rejection; receipted for completeness.
2. `POST /api/v1/log/entries` → **400** `{"code":400,"message":"error processing entry: verifying signature: unsupported hash algorithm: \"SHA-256\" not in [SHA-512]"}` ×2 — identical body both times. **These were the 2 real submit attempts.**

## Diagnosis (why the entry was rejected)

The rejection happens in rekor's server-side verifier **before the signature bytes are checked**:

- rekor@904bbccc `entry.go:249–273`: for a `sha256` hashedrekord it passes `alg=crypto.SHA256` alongside the 32-byte digest into `Verify(..., WithDigest(decoded), WithCryptoSignerOpts(crypto.SHA256))`.
- `sigstore/sigstore@0425dec39b5c768727ed5c2d807e7e4337027706` `pkg/signature/ed25519.go:28–30`: `ed25519SupportedHashFuncs = []crypto.Hash{crypto.Hash(0)}`; the deployed build's gate prints `[SHA-512]`; `pkg/signature/message.go:74` (`ComputeDigestForVerifying`) then fails with exactly the observed message.

Net effect: **hashedrekord + Ed25519 + sha256 is currently unsignable on rekor.sigstore.dev** — the gate accepts no `WithCryptoSignerOpts(crypto.SHA256)` for Ed25519, even though the entry is schema-valid and the signature construction is exactly per spec (our client-side Ed25519 over the 32 digest bytes self-verifies true). This is a cross-repo contract mismatch between rekor's `WithCryptoSignerOpts(alg)` pass-through and sigstore/sigstore's Ed25519 hash allow-list — worth an upstream issue.

## Open next action (one command, armed, dry-run-proven)

`40a-rekor-submit.mjs` now supports knobs; all three configs build spec-valid entries with `local_selfverify=true` in `--dry-run` (no network):

```sh
node 40a-rekor-submit.mjs --alg=sha512   # sha512 digest of the VC; alg=crypto.SHA512 passes the Ed25519 gate
node 40a-rekor-submit.mjs --key=ecdsa    # ECDSA-P256 + sha256 (classic cosign verifier path), DER sig
```

On 201 the script self-verifies the returned inclusion proof from first principles: leaf = SHA-256(0x00 ‖ canonicalized entry body), RFC 9162 §2.1.3.2 fold over `verification.inclusionProof.{logIndex,treeSize,hashes}` vs `rootHash`, plus body→digest match checks — before declaring `SEALED_OK`. Suggested: prefer `--alg=sha512` (keeps Ed25519; digest is of the same artifact) or commit a second entry with `--key=ecdsa` and note both in the embassy ledger. Did NOT run these: lane law caps submit attempts at 2, both spent.
