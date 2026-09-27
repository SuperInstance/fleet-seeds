# ct-reader.verified.md — lane 40-a transparency-smith

**Reader:** `embassy/transparency/ct-reader.mjs` (sha256 `f76ef6256a6176a51d3ce8573aaba272956ad7585da24bca33843c499fe9f394`)
**KAT harness:** `embassy/transparency/ct-kat.mjs` · full results: `kat-results.json` (schema `fleet-seeds/transparency-kat/2.0`)
**Verdict: 32 pass / 0 fail** (run 2026-09-27T17:28:59Z, re-sealed after one dialect fix, see Honest-notes)

## 1. Offline RFC 6962 vectors (all fetched live from raw.githubusercontent.com at pinned commits; content sha256 recorded below)

| Source | Pinned at | Content sha256 |
|---|---|---|
| google/certificate-transparency `cpp/merkletree/merkle_tree_test.cc` | `0fe5116f` | `2a49413fc09b5b325c1acc5d9574c6d4ec8c45b399bb415de07b1132dac0d91a` |
| google/certificate-transparency `cpp/merkletree/tree_hasher_test.cc` | `0fe5116f` | `b12e2aba20e36e4cda26bfb447ba864996a2ee9c273687dbae0e77bd0e241f5e` |
| transparency-dev/merkle `rfc6962/rfc6962_test.go` | `fbbcd741` | `6237bd8f8131c49832575d4ce03395a62f98a6555080783b7ca5d1fb06a83678` |

Canonical values verified (A1–A5):
- **MTH({}) = `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`** (empty tree = SHA-256 of "")
- leaf(∅)=`6e340b9cffb37ae98b9bb12b45d7f838…`, leaf(`00`)=`96a296d224f287c67d3b76f0fdb2d5cb…`, leaf(`10111213`)=`3bfb960453eb9d09d03d3a513e6b7c11…`, node(`0102`‖`0304`)=`1a378704c17d4b726ec7e7eb85c9581f…` (tree_hasher_test.cc)
- rfc6962_test.go: leaf `"L123456"` = `395aa064aa4c…`, node `N123‖N456` = `aa217fe888e4…` (transparency-dev/merkle @ fbbcd741)
- merkle_tree_test.cc `kSHA256Roots[0..7]` (incl. n=8 `5dc9da79…`) and `kSHA256Paths` — 0 mismatches
- consistency SUBPROOF sweep: **232 (m,n) pairs, 0 disagreements**; inclusion verifier vs reference tree n=1..40 all m: **820 cases, 0 disagreements**
- negative/tamper controls: bad/short path, bad leaf, OOB index, wrong root, long path, {1,1} empty-proof contract — all correctly REJECTED

## 2. Live-log receipt (single US log, fetched 2026-09-27)

- **Log list:** `https://www.gstatic.com/ct/log_list/v3/log_list.json` → http 200, sha256 `22f7fc4aca3508ef96d6460a4a4f753324a718d36ab36e6963936ad94b6e26d3` (21 usable classic logs of 64 total)
- **Log:** Google **'Argon2026h2'** (US region, classic RFC 6962) — `https://ct.googleapis.com/logs/us1/argon2026h2/`
  - log key sha256: `325a2637b9628d7051190d8e1a502741771eed23bd6b2f8a85bd796490381db4`
- **get-sth:** tree_size `3315675370`, timestamp `1790530320024`, root `9254c0167556655a3c32b41f38a68827b496f8d0f4aaa3d257250376514d7174`
  - **STH ECDSA-P256 (RFC 6962 TLS-framed digitally-signed) signature vs log public_key: VERIFIED = true** [B1]
- **get-entries** (newest, index 3315675369): fetched, `leaf_input` shim dialect, leafHash `cd3481161bf32ecd…` [B2]
- **get-proof-by-hash inclusion proof: VERIFIED = true** [B3] — leaf_index 3315675369, path len 14, computedRoot == STH root `9254c0167556…` (self-folded, not trusted)
- **get-sth-consistency proof: VERIFIED = true** [B4] — `3315675370→3315675586`, fold=true, second STH signature also verifies (independent sig over the second root)

## Honest-notes (dialect fix, disclosed)

First run scored 31/32: [B4] read the consistency proof from field `consistency_path`, but Google's shim returns the array under `consistency` (RFC 6962 §5.3 itself misspells the field as `conistency`). The reader's `verifyConsistencyProof` was correct the whole time (232/232 offline pairs, and the live proof verified immediately when fed the right bytes via an out-of-band probe). Fix: harness normalizes `conistency ?? consistency ?? consistency_path`. Re-run sealed at 32/32. No reader logic changed — only the KAT harness' JSON-key dialect handling.

## Open items
- None blocking. (Cross-log diversity: receipts are from one log; tiled-log dialect and C2SPOGH tlog-checkpoint parse+ed25519 are covered offline in A7d/A7e only.)
