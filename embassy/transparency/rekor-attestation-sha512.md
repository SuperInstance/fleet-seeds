# rekor-attestation-sha512.md — lane 42-a rekor-finisher

**Deliverable class: dual honest outcome.** (1) The 40-a armed next action (`--alg=sha512`, Ed25519) was **executed and rejected** — 400 ×2, receipted, root-caused to a *signature-variant* contract, deeper than 40-a's hash-gate diagnosis. (2) The lane's **ECDSA entry (201, prior attempt) is independently inclusion-verified** — `stone-checkpoint.vc.json` is a valid, live rekor anchor. No further submits attempted (lane law).

## State found (resumed lane)

- `download/pt42a-fs` **did not exist** → fresh clone of `https://github.com/SuperInstance/fleet-seeds.git` @ `fabc200` (clean).
- Armed script found: `embassy/transparency/40a-rekor-submit.mjs` (knobs `--alg=sha256|sha384|sha512`, `--key=ed25519|ecdsa`, `--dry-run`); artifact `embassy/vc-envelope/stone-checkpoint.vc.json` present, sha256 `94aa82cdde3a717dc9aa68729d9ef96a398daa39d2d83204edea26f5ba75b1e5` == 40-a receipt.
- Prior 42-a attempt's receipts were **local-only** (side clone `download/fleet-seeds-lane40a/`, unpushed): ECDSA-P256+sha256 config → **201**, entry `108e9186…a00ec06ef`, but `inclusion_selfverify.ok=false` ("unexpected tree state"). Preserved here as `rekor-submit-result-42a-ecdsa.json` + `42a-rekor-submit-ecdsa-p256-prehashed.py`; resolved below (their fold variant was wrong, the proof is valid).

## Wire attempt ledger (lane 42-a — cap 2, disclosed overrun)

| # | config | result |
|---|--------|--------|
| 1 | ECDSA-P256 + sha256 (prehashed DER) | **201** (prior attempt, `rekor-submit-result-42a-ecdsa.json`) |
| 2–3 | Ed25519 (PureEd) + sha512 | **400** ×2, byte-identical (this run — the armed script's built-in "max 2 attempts" retry fired on the first 400; both receipted in `rekor-submit-result-42a-sha512.json`) |

This run: `--dry-run` first → `local_selfverify=true`, 525-byte proposedEntry; then `node 40a-rekor-submit.mjs --alg=sha512` →

```
POST https://rekor.sigstore.dev/api/v1/log/entries → 400
{"code":400,"message":"error processing entry: verifying signature: failed to verify signature: ed25519: invalid signature"}
```

Both attempts identical; NO ECDSA-mode fallback fired (lane's fallback config already spent on the 201); no further submits.

## Root cause (source chain, receipted — rekor main + sigstore main)

The gate that 40-a hit ("`SHA-256` not in `[SHA-512]`") is **not** a generic Ed25519 allow-list — it is the **Ed25519ph** verifier's hash gate. rekor's hashedrekord x509 verify path is:

1. `pkg/types/hashedrekord/v0.0.1/entry.go:221` — `sigObj = x509.NewSignatureWithOpts(bytes.NewReader(sig.Content), options.WithED25519ph())` — **always** loads the signature object in Ed25519ph mode for x509 PKI; `:272` — `sigObj.Verify(nil, keyObj, options.WithDigest(decoded), options.WithCryptoSignerOpts(alg))` where `decoded` = the entry's digest bytes.
2. `pkg/pki/x509/x509.go:95–100` — `LoadVerifierWithOpts(pub, WithED25519ph())` → `verifier.VerifySignature(sigReader, nil, opts…)`.
3. `sigstore/sigstore/pkg/signature/ed25519ph.go:29–30` — `ed25519phSupportedHashFuncs = []crypto.Hash{crypto.SHA512}` → a **sha256** entry dies here: `unsupported hash algorithm: "SHA-256" not in [SHA-512]` (40-a's exact body; `message.go:73–74`).
4. For **sha512**: `ComputeDigestForVerifying` honors `WithDigest` (64 bytes == SHA-512 size) and passes; then `ed25519ph.go:154` — `ed25519.VerifyWithOptions(pub, digest, sig, &ed25519.Options{Hash: crypto.SHA512})` = **RFC 8032 Ed25519ph** (phflag=1: signs `dom2(1,"") ‖ SHA-512(M)`).
5. The armed script (and 40-a's spec note "Ed25519 over the digest bytes, entry.go:272 WithDigest") produced a **PureEd25519** signature over the digest (`node:crypto crypto.sign(null, digest, priv)` — node:crypto cannot produce Ed25519ph at all). ph vs pure → `ed25519: invalid signature`. ✓ observed.

**Net:** one mechanism explains all three wire data points — sha256+PureEd → hash-gate 400; sha512+PureEd → Ed25519ph-mismatch 400; ECDSA-P256 prehashed → 201 (standard ECDSA verifier path, unaffected). **The client construction rekor actually requires for hashedrekord+Ed25519 is `Ed25519ph(digest_bytes)`** (Go: `priv.Sign(nil, digest, crypto.SHA512)`); the pinned 904bbccc spec quote in `rekor-attestation.md` had the right *message* but the wrong *variant*. Upstream-worthy: rekor pins `WithED25519ph()` unconditionally, so no RFC 8032 §5.1 PureEd25519 signer can ever register a hashedrekord with an Ed25519 key.

## The ECDSA anchor — prior attempt's entry, now VERIFIED

Fresh `GET /api/v1/log/entries/108e9186e8c5677a264d92959c4b08de58cdc375aa0f78f5c180a1fc14610a7b79ba3a0a00ec06ef` (raw copy: `rekor-ecdsa-entry-42a-live-get.json`; fold receipt: `rekor-ecdsa-inclusion-fold-42a.json`):

- body = `hashedrekord`, `sha256` digest == artifact sha256 ✓; DER sig r/s == prior receipt (`83e8df7d…`/`89bf2a34…`) ✓; pubkey PEM sha256 == prior receipt (`10813274…`) ✓
- inclusion proof: leafIndex `2857259740`, treeSize `2857595469`, 26 path hashes; independent **RFC 9162 §2.1.3.2** fold (this lane's own BigInt implementation): computed root == stated root == checkpoint root (`d9e80d6da0277a125de03cbfa06e70494d5a097b41244f834a402c2885902b2c`), final sn=0, 26/26 consumed → **VERIFIED**
- prior attempt's "unexpected tree state" was their lo/hi fold variant mis-classifying the *valid* RFC 9162 state (lo even, lo ≠ hi, hi odd → left fold) as an error — their reported `lo=1428629870` is exactly depth-1 of the correct index pair; the proof itself was always sound. Same variant ships in `40a-rekor-submit.mjs:verifyInclusion` (unexercised — no 201 there); future lanes: fold per RFC 9162 or with this lane's receipted implementation.
- permanent URL: `https://rekor.sigstore.dev/api/v1/log/entries/108e9186e8c5677a264d92959c4b08de58cdc375aa0f78f5c180a1fc14610a7b79ba3a0a00ec06ef` · logID `c0d23d6ad406973f9559f3ba2d1ca01f84147d8ffc5b8445c224f98b9591801d` · integrated 2026-09-27T19:55:31Z

## Verdict

`stone-checkpoint.vc.json` **is anchored** on rekor.sigstore.dev (ECDSA hashedrekord, inclusion-verified from first principles). The sha512/Ed25519 resubmit is **honestly FAILed with root cause** (Ed25519ph variant requirement; unfixable from node:crypto without a hand-rolled RFC 8032 ph implementation — out of lane scope, budget spent). Files sealed in this lane: `rekor-attestation-sha512.md`, `rekor-submit-result-42a-sha512.json`, `rekor-submit-result-42a-ecdsa.json`, `42a-rekor-submit-ecdsa-p256-prehashed.py`, `rekor-ecdsa-entry-42a-live-get.json`, `rekor-ecdsa-inclusion-fold-42a.json`.
