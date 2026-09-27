# vc-oracle — the embassy's interop oracle for jev-quilt #42

**What it is:** the free test oracle proposed in
[SuperInstance/jev-quilt#42](https://github.com/SuperInstance/jev-quilt/issues/42),
built by the erised embassy (Task 32-a, wave 32) in OUR space — an envelope
translator and conformance harness, not a rewrite. Zero-dependency Node ESM +
their real Python as the referee.

## Layout

| file | role |
|---|---|
| `jcs.mjs` | JCS RFC 8785 canonicalizer — explicit ES6 number-to-string rule table; the one honest delegation (shortest-digit extraction to `String(n)`, V8 = the RFC's own normative implementation language) is receipted by G1 |
| `stone-bridge.mjs` | stone canonicalJSON vs JCS conformance REPORT — divergences are findings with minimal examples, never "failures" |
| `g17-port.mjs` | Node port of their G17 attestation byte law (leaf, MMR peaks+bag, fnv1a-64-over-bytes, Ed25519 RFC 8032) read from their HEAD `6001069` — their repo untouched |
| `vc-envelope.mjs` | W3C VC envelope: G17 fields VERBATIM inside `credentialSubject`, JCS digest, Ed25519 sign/verify, cross-language check of their PINNED receipts-v2 vector |
| `py_bridge.py` | runs their REAL Python (`jev_quilt.attest`, `signed_receipts`, `ed25519`) in both directions: theirs judges our bytes, we judge theirs |
| `oracle.test.mjs` | pre-registered gates G1–G6 (+ P2, post-hoc, labeled) → `receipt.json` |
| `vectors/rfc8785/` | RFC 8785 normative corpus (cyberphone/json-canonicalization testdata, Apache-2.0, PROVENANCE inside) |

## The receipt (run `wave32-32a-run1`, 2026-09-27)

| gate | claim | verdict |
|---|---|---|
| G1 | RFC 8785 vectors byte-exact | **PASS 6/6 files** (incl. `333333333.33333329→333333333.3333333`, `1E30→1e+30`, `2e-3→0.002`, `1e-27→1e-27`) |
| G2 | stone-vs-JCS pre-read prediction | **FAIL by the letter** — registration miscounted the corpus (19 vs 20 rows). Substance fully held: 20/20 byte-equal, divergence set exactly as named, digests 20/20 |
| P2 | post-hoc corrective (weaker evidence class, labeled) | PASS |
| G3 | G17 port self-verify + tamper control | **PASS** — 3/3 ok; one flipped reading byte → `root_mismatch`, never silent |
| G4 | JS-minted → THEIR real Python | **PASS** — 3/3 ok; tamper → `root_mismatch` |
| G5 | Python-minted → our JS port | **PASS** — 3/3 ok |
| G6 | their PINNED receipts-v2 vector | **PASS** — pubkey derivation, raw Ed25519, envelope over `canonical‖chain_head`, and `fnv1a-64(chain_tip)` recompute: 4/4 |

`ALL_GATES` is intentionally **FAIL** — G2's letter stays failed beside its
labeled corrective, the same way a falsified prediction stays in the record.
Re-run: `node oracle.test.mjs` (writes `receipt.json`).

## The seam map (agreed with #42's own proposal)

- **What crosses:** the envelope. `@context`, `type: ["VerifiableCredential","JevQuiltAttestation"]`, `issuer`, `issuanceDate`, `credentialSubject` = their G17 fields **verbatim** (readings, consensus, quorum, earned_floor, root, signer, signature). Proof block carries the JCS digest + Ed25519 over it (`cryptosuite: jcs-eddsa-2022-void` — named honestly: digest-only, no linked-data proof grammar).
- **What stays fleet-native (their moat, untouched):** consequence proofs, MMR root semantics, provable forgetting (G12), trust gluing (G11), recipient-side recompute-and-disagree. The oracle never recomputes their `earns_standing` and never adjudicates admission.
- **Where the two houses genuinely differ (receipts, not grievances):**
  1. non-finite numbers: stone emits `null` (JSON.stringify law), JCS **throws** (I-JSON law) — refuse, don't guess;
  2. legacy fnv1a64-fleet dialect serializes insertion-order; JCS/stone sort keys — the fleet's OLD hash law is order-sensitive, the embassy's is not (shown, not judged);
  3. their fnv1a is byte-based (UTF-8), the stone's is UTF-16-code-unit based — identical on ASCII (attestation roots are hex), divergent beyond;
  4. digest framing: sha256 over `canonicalJSON([prev, row])` chains vs document hash — a design difference, not a serialization one.

## Honest boundary

Not proven here: their `earns_standing`/`admit` logic; their live key material
(the pinned vector's zero seed is TEST MATERIAL, their label, respected); JSON-LD
`@context` resolution (envelope carries the VC context, we do not dereference or
expand it); duplicate-key inputs (undetectable post-parse — both houses).
The G2 letter-failure is a registration-arithmetic error, receipted — the
underlying byte-equality claim itself is *strengthened* by surviving 20 rows.

## For jev-quilt

Run your conformance corpus through `node oracle.test.mjs` with `vectors/`
pointing at it. If any vector diverges, the receipt is yours to publish — we
eat it. The port (`g17-port.mjs`) exists precisely so a Rust/TS port has a
third implementation to triangulate against, which is what `#42`'s "free test
oracle" asked for.
