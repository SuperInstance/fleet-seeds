// vc-envelope.mjs — W3C Verifiable Credentials envelope translator for
// jev-quilt's G17 Attestation shape + a real JCS/SHA-256/Ed25519 sign-verify
// round trip. Zero-dependency ESM (node:crypto only).
//
// PROVENANCE: embassy/vc-oracle lane (Task 32-a), gift-oracle for
// SuperInstance/jev-quilt issue #42.
//
// WHAT THIS IS: an ENVELOPE, not a rewrite. The G17 fields (readings,
// consensus, quorum, earned_floor, root, signer, signature — exactly the
// attest.Attestation field set at their HEAD 6001069) are carried VERBATIM
// inside credentialSubject. Their moat (consequence proofs, MMR roots,
// recipient-side recompute-and-disagree) stays fleet-native; this wrapper
// only gives it a W3C-shaped passport and a JCS-canonicalized digest to
// sign.
//
// WHAT THIS IS NOT (honest boundary): a re-implementation of their trust
// logic. We do NOT recompute their MMR root or adjudicate `earns_standing`
// here — that is their admit() law (see g17-port.mjs for the byte-law port
// that IS cross-verified against their Python).

import { createHash, sign as edSign, verify as edVerify } from 'node:crypto';
import { jcsSerialize } from './jcs.mjs';
import { publicKeyFromSeed, privateKeyFromSeed, publicKeyHexFromSeed } from './g17-port.mjs';

export const VC_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

// ---------------------------------------------------------------------------
// wrap: G17 attestation dict -> VC-shaped JSON
// ---------------------------------------------------------------------------

export function wrapG17Attestation(att, opts = {}) {
  for (const f of ['readings', 'consensus', 'quorum', 'root', 'signer', 'signature']) {
    if (att[f] === undefined) throw new TypeError(`wrapG17Attestation: missing G17 field '${f}'`);
  }
  return {
    '@context': VC_CONTEXT,
    id: opts.credentialId ?? `urn:jev-quilt:attestation:${att.root}`,
    type: ['VerifiableCredential', 'JevQuiltAttestation'],
    issuer: opts.issuer ?? `did:jev:quilt:${att.signer}`,
    issuanceDate: opts.issuanceDate ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    credentialSubject: {
      // VERBATIM G17 fields — nothing added, nothing renamed:
      readings: att.readings,
      consensus: att.consensus,
      quorum: att.quorum,
      earned_floor: att.earned_floor ?? null,
      root: att.root,
      signer: att.signer,
      signature: att.signature,
    },
  };
}

// ---------------------------------------------------------------------------
// canonicalize -> digest -> sign -> verify (byte-exact round trip)
// ---------------------------------------------------------------------------

export function canonicalEnvelope(envelope) {
  return Buffer.from(jcsSerialize(envelope), 'utf8');
}

export function digestEnvelope(envelope) {
  return createHash('sha256').update(canonicalEnvelope(envelope)).digest();
}

export function signEnvelope(envelope, seed32) {
  const sig = edSign(null, digestEnvelope(envelope), privateKeyFromSeed(seed32));
  return {
    proof: {
      type: 'DataIntegrityProof',
      cryptosuite: 'jcs-eddsa-2022-void', // named honestly below: digest-only, no linked-data proof grammar
      created: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      verificationMethod: `did:jev:quilt:${publicKeyHexFromSeed(seed32).slice(0, 16)}`,
      proofPurpose: 'assertionMethod',
      digestHex: digestEnvelope(envelope).toString('hex'),
      jcs: true, // the bytes signed are the JCS canonicalization of this envelope
      signatureHex: sig.toString('hex'),
    },
  };
}

export function verifyEnvelopeProof(envelopeWithProof, seed32) {
  const { proof, ...envelope } = envelopeWithProof;
  const recomputed = digestEnvelope(envelope);
  const digestOk = recomputed.toString('hex') === proof.digestHex;
  const pub = publicKeyFromSeed(seed32);
  const sigOk = edVerify(null, recomputed, pub, Buffer.from(proof.signatureHex, 'hex'));
  const reCanon = jcsSerialize(JSON.parse(jcsSerialize(envelope)));
  const byteExact = reCanon === jcsSerialize(envelope);
  return { digestOk, sigOk, byteExact, ok: digestOk && sigOk && byteExact };
}

// ---------------------------------------------------------------------------
// cross-language receipt: verify jev-quilt's PINNED vector (their repo,
// vectors/signed_receipt_vectors.json — "TEST MATERIAL, never a real node
// key", seed = 32 zero bytes) with node:crypto. Their Python RFC-8032
// ed25519 must agree with OpenSSL bit-for-bit.
// ---------------------------------------------------------------------------

export function verifyPinnedForeignVector(vec) {
  const seed = Buffer.alloc(32, 0);
  const pub = publicKeyFromSeed(seed);
  const results = {};

  // (1) raw Ed25519 section: signature over their message under the zero seed
  const msg = Buffer.from(vec.ed25519.message_hex, 'hex');
  results.ed25519Message = edVerify(null, msg, pub, Buffer.from(vec.ed25519.signature_hex, 'hex'));
  results.ed25519PubkeyMatches = publicKeyHexFromSeed(seed) === vec.ed25519.public_key_hex;

  // (2) full envelope: signature over canonical_bytes || chain_head (ASCII hex)
  const canonical = Buffer.from(vec.envelope.canonical_hex, 'hex');
  const envMsg = Buffer.concat([canonical, Buffer.from(vec.envelope.chain_head, 'ascii')]);
  results.envelope = edVerify(null, envMsg, pub, Buffer.from(vec.envelope.signature_hex, 'hex'));

  return results;
}
