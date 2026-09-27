// vc-eddsa.mjs — 43-c tool-builder's port of the TWO independent VC readers
// (embassy/vc-envelope/verify.mjs = READER B, reader-a.mjs = READER A) from
// READ-ONLY reference code @ fleet-seeds e5390cf, restructured as pure
// functions (no file writes, no process.exit) so the fleet tool can drive
// both flows and receipt them.
//
// READER B (eddsa-jcs-2022, W3C vc-di-eddsa Rec 15 May 2025): trusts ONLY the
// document — decodes the did:key itself (base58-btc + multicodec 0xed01),
// re-implements §3.3.2-§3.3.7 from the spec text, and is FAIL-CLOSED gated on
// the spec's own §B.3 test vector (8 steps) before it may judge our VC.
//
// READER A (node:crypto direct): trusts the COMMITTED public key
// (public-key.json), checks the did:key BINDING, re-derives hashData with the
// house canonicalizer (lib/jcs.mjs — the receipted RFC 8785 engine, reused
// BYTES VERBATIM per seed 37-f), and hands the bytes to crypto.verify().
//
// Zero dependencies beyond node:crypto + lib/jcs.mjs. Keys: none (Reader B
// derives the public key from the document; Reader A reads the committed
// PUBLIC key record only).

import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';
import { jcsSerialize } from './jcs.mjs';

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest();

// ── base58-btc Multibase decode (multibase 'z'; Bitcoin alphabet) ──────────
// Reader B's construction: fold alphabet indices into a BigInt MSB-first.
const B58_INDEX = new Map();
for (let i = 0; i < 58; i++) {
  const ch = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[i];
  B58_INDEX.set(ch, i);
}
function base58BtcDecode(multibase) {
  if (multibase[0] !== 'z') throw new Error(`unsupported multibase prefix '${multibase[0]}' (need 'z' = base58-btc)`);
  const body = multibase.slice(1);
  let acc = 0n;
  for (const ch of body) {
    const idx = B58_INDEX.get(ch);
    if (idx === undefined) throw new Error(`non-base58 character '${ch}'`);
    acc = acc * 58n + BigInt(idx);
  }
  const bytes = [];
  while (acc > 0n) {
    bytes.unshift(Number(acc & 0xffn));
    acc >>= 8n;
  }
  let zeros = 0;
  while (zeros < body.length && body[zeros] === '1') zeros++;
  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(bytes)]);
}

// did:key -> raw Ed25519 public key bytes (Multikey: multicodec 0xed01 + 32B)
export function rawPubFromDidKey(verificationMethod) {
  const m = /^did:key:(z[1-9A-HJ-NP-Za-km-z]+)#z[1-9A-HJ-NP-Za-km-z]+$/.exec(verificationMethod);
  if (!m) throw new Error(`verificationMethod is not a did:key Multikey form: ${verificationMethod}`);
  const decoded = base58BtcDecode(m[1]);
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('did:key is not a 32-byte Ed25519 Multikey (expected 0xed01 prefix)');
  }
  return decoded.subarray(2);
}

// ── §3.3.5 Proof Configuration (eddsa-jcs-2022) ─────────────────────────────
function canonicalProofConfig(proofOptions) {
  if (proofOptions.type !== 'DataIntegrityProof') throw new Error('PROOF_VERIFICATION_ERROR: options.type must be DataIntegrityProof');
  if (proofOptions.cryptosuite !== 'eddsa-jcs-2022') throw new Error('PROOF_VERIFICATION_ERROR: options.cryptosuite must be eddsa-jcs-2022');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(proofOptions.created ?? '')) {
    throw new Error('PROOF_VERIFICATION_ERROR: created is not a valid xsd:dateTime');
  }
  return jcsSerialize(proofOptions);
}

// §3.3.3 Transformation
function transform(unsecuredDocument, options) {
  if (options.type !== 'DataIntegrityProof' || options.cryptosuite !== 'eddsa-jcs-2022') {
    throw new Error('PROOF_VERIFICATION_ERROR: transformation options bad');
  }
  return jcsSerialize(unsecuredDocument);
}

// §3.3.4 Hashing
function hashDataOf(canonicalDocument, canonicalProofConfig) {
  return Buffer.concat([sha256(canonicalProofConfig), sha256(canonicalDocument)]);
}

// §3.3.2 helper — @context prefix rule
function contextPrefixOk(docContext, proofContext) {
  const d = Array.isArray(docContext) ? docContext : [docContext];
  const p = Array.isArray(proofContext) ? proofContext : [proofContext];
  if (p.length > d.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (JSON.stringify(d[i]) !== JSON.stringify(p[i])) return false;
  }
  return true;
}

// ── §3.3.2 Verify Proof (READER B) ──────────────────────────────────────────
export function verifyProofB(securedDocument) {
  const out = (verified, extra = {}) => ({ verified, verifiedDocument: verified ? extra.__doc ?? null : null, ...extra });
  try {
    if (!securedDocument || typeof securedDocument !== 'object' || Array.isArray(securedDocument)) {
      throw new Error('securedDocument is not a JSON object');
    }
    const { proof, ...unsecuredDocument } = structuredClone(securedDocument);
    if (!proof || typeof proof !== 'object') throw new Error('missing proof');
    if (proof.proofValue === undefined) throw new Error('missing proof.proofValue');
    const proofOptions = structuredClone(proof);
    delete proofOptions.proofValue;
    const proofBytes = base58BtcDecode(proof.proofValue);
    if (proofBytes.length !== 64) throw new Error(`proofBytes must be exactly 64 bytes, got ${proofBytes.length}`);
    if (proofOptions['@context'] !== undefined) {
      if (!contextPrefixOk(unsecuredDocument['@context'], proofOptions['@context'])) {
        return out(false, { why: 'document @context does not start with proof @context in the same order' });
      }
      unsecuredDocument['@context'] = proofOptions['@context'];
    }
    const canonicalDocument = transform(unsecuredDocument, proofOptions);
    const canonicalConfig = canonicalProofConfig(proofOptions);
    const hashData = hashDataOf(canonicalDocument, canonicalConfig);
    const rawPub = rawPubFromDidKey(proofOptions.verificationMethod);
    const keyObject = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(rawPub).toString('base64url') },
      format: 'jwk',
    });
    const ok = edVerify(null, hashData, keyObject, proofBytes);
    return out(ok, { why: ok ? null : 'Ed25519 verification returned false', hashDataHex: hashData.toString('hex'), __doc: unsecuredDocument });
  } catch (e) {
    return out(false, { why: e.message });
  }
}

// READER A — direct node:crypto verify against the COMMITTED key record
// { verificationMethod, didKey, multibase, rawPublicKeyHex } (public-key.json).
export function verifyProofA(securedDocument, keyRecord) {
  const proof = securedDocument?.proof;
  const vm = proof?.verificationMethod;
  const bindingOk = vm === keyRecord.verificationMethod && vm === keyRecord.didKey + '#' + keyRecord.multibase;
  const { proof: p, ...unsecuredDocument } = securedDocument;
  const proofOptions = { ...p };
  delete proofOptions.proofValue;
  const hashData = Buffer.concat([
    sha256(jcsSerialize(proofOptions)),
    sha256(jcsSerialize(unsecuredDocument)),
  ]);
  const keyObject = createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(keyRecord.rawPublicKeyHex, 'hex').toString('base64url') },
    format: 'jwk',
  });
  const sig = Buffer.from(mbDecodeHex(proof.proofValue), 'hex');
  const sigOk = edVerify(null, hashData, keyObject, sig);
  return { bindingOk, hashDataHex: hashData.toString('hex'), signatureBytes: sig.length, sigOk, verified: bindingOk && sigOk };
}

// multibase 'z' decode — Reader A's own minimal fold (independent of the
// verify.mjs decoder by construction in the reference; kept verbatim here).
function mbDecodeHex(multibase) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const IDX = new Map([...ALPHABET].map((c, i) => [c, i]));
  if (multibase[0] !== 'z') throw new Error("multibase prefix must be 'z'");
  let acc = 0n;
  for (const ch of multibase.slice(1)) {
    const i = IDX.get(ch);
    if (i === undefined) throw new Error('non-base58 character');
    acc = acc * 58n + BigInt(i);
  }
  const bytes = [];
  while (acc > 0n) {
    bytes.unshift(Number(acc & 0xffn));
    acc >>= 8n;
  }
  let zeros = 0;
  while (zeros < multibase.length - 1 && multibase[1 + zeros] === '1') zeros++;
  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(bytes)]).toString('hex');
}

// ═══════════════════════════════════════════════════════════════════════════
// KAT — the spec's own §B.3 test vector (fail-closed gate), transcribed
// verbatim from https://www.w3.org/TR/vc-di-eddsa/#B.3
// ═══════════════════════════════════════════════════════════════════════════
export const B3 = {
  publicKeyMultibase: 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
  canonicalCredential: '{"@context":["https://www.w3.org/ns/credentials/v2","https://www.w3.org/ns/credentials/examples/v2"],"credentialSubject":{"alumniOf":"The School of Examples","id":"did:example:abcdefgh"},"description":"A minimum viable example of an Alumni Credential.","id":"urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33","issuer":"https://vc.example/issuers/5678","name":"Alumni Credential","type":["VerifiableCredential","AlumniCredential"],"validFrom":"2023-01-01T00:00:00Z"}',
  credentialHashHex: '59b7cb6251b8991add1ce0bc83107e3db9dbbab5bd2c28f687db1a03abc92f19',
  proofOptions: {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-jcs-2022',
    created: '2023-02-24T23:36:38Z',
    verificationMethod: 'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2#z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
    proofPurpose: 'assertionMethod',
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/examples/v2'],
  },
  canonicalProofOptions: '{"@context":["https://www.w3.org/ns/credentials/v2","https://www.w3.org/ns/credentials/examples/v2"],"created":"2023-02-24T23:36:38Z","cryptosuite":"eddsa-jcs-2022","proofPurpose":"assertionMethod","type":"DataIntegrityProof","verificationMethod":"did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2#z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2"}',
  proofOptionsHashHex: '66ab154f5c2890a140cb8388a22a160454f80575f6eae09e5a097cabe539a1db',
  combinedHashHex: '66ab154f5c2890a140cb8388a22a160454f80575f6eae09e5a097cabe539a1db59b7cb6251b8991add1ce0bc83107e3db9dbbab5bd2c28f687db1a03abc92f19',
  signatureHex: '407cd12654b33d718ecbb99179a1506daaa849450bf3fc523cce3e1c96f8b80351da3f253d725c6f00b07c9e5448d50b3ef78012b9ab54255116d069c6dd2808',
  proofValue: 'z2HnFSSPPBzR36zdDgK8PbEHeXbR56YF24jwMpt3R1eHXQzJDMWS93FCzpvJpwTWd3GAVFuUfjoJdcnTMuVor51aX',
  signedCredential: {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/examples/v2'],
    id: 'urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33',
    type: ['VerifiableCredential', 'AlumniCredential'],
    name: 'Alumni Credential',
    description: 'A minimum viable example of an Alumni Credential.',
    issuer: 'https://vc.example/issuers/5678',
    validFrom: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'did:example:abcdefgh', alumniOf: 'The School of Examples' },
    proof: {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-jcs-2022',
      created: '2023-02-24T23:36:38Z',
      verificationMethod: 'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2#z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
      proofPurpose: 'assertionMethod',
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/examples/v2'],
      proofValue: 'z2HnFSSPPBzR36zdDgK8PbEHeXbR56YF24jwMpt3R1eHXQzJDMWS93FCzpvJpwTWd3GAVFuUfjoJdcnTMuVor51aX',
    },
  },
};

export function runKATB3() {
  const steps = [];
  const add = (id, claim, pass, detail) => steps.push({ id, claim, pass, detail });

  const e30 = {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/examples/v2'],
    id: 'urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33',
    type: ['VerifiableCredential', 'AlumniCredential'],
    name: 'Alumni Credential',
    description: 'A minimum viable example of an Alumni Credential.',
    issuer: 'https://vc.example/issuers/5678',
    validFrom: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'did:example:abcdefgh', alumniOf: 'The School of Examples' },
  };
  const canonDoc = jcsSerialize(e30);
  add('K1-jcs-document', 'JCS(Example 30) === Example 31 canonical credential, byte-exact',
    canonDoc === B3.canonicalCredential, { bytes: Buffer.byteLength(canonDoc, 'utf8') });

  const docHash = sha256(canonDoc).toString('hex');
  add('K2-document-hash', 'sha256(canonical credential) === Example 32', docHash === B3.credentialHashHex, { got: docHash });

  const canonOpts = jcsSerialize(B3.proofOptions);
  add('K3-jcs-proof-config', 'JCS(Example 33) === Example 34 canonical proof options, byte-exact',
    canonOpts === B3.canonicalProofOptions, { bytes: Buffer.byteLength(canonOpts, 'utf8') });

  const optsHash = sha256(canonOpts).toString('hex');
  add('K4-proof-config-hash', 'sha256(canonical proof options) === Example 35', optsHash === B3.proofOptionsHashHex, { got: optsHash });

  const combined = Buffer.concat([Buffer.from(optsHash, 'hex'), Buffer.from(docHash, 'hex')]).toString('hex');
  add('K5-hash-composition', 'proofConfigHash || documentHash === Example 36', combined === B3.combinedHashHex, {});

  const decoded = base58BtcDecode(B3.proofValue).toString('hex');
  add('K6-multibase-decode', 'base58-btc decode(Example 38 proofValue) === Example 37 signature hex', decoded === B3.signatureHex, { bytes: decoded.length / 2 });

  const v = verifyProofB(B3.signedCredential);
  add('K7-verify-example-39', '§3.3.2 Verify Proof(Example 39) === true', v.verified === true, { hashDataHex: v.hashDataHex, why: v.why });

  add('K8-kat-hash-echo', 'KAT verify hashData === Example 36 combined hash', v.hashDataHex === B3.combinedHashHex, {});

  const passed = steps.filter((s) => s.pass).length;
  return { steps, passed, total: steps.length, ok: passed === steps.length };
}

// Tamper controls on a secured VC (the falsifier's inverse: the reader must
// REJECT the three tampered forms and ACCEPT the spec-legal context append).
export function tamperControls(securedDocument) {
  const t1doc = structuredClone(securedDocument);
  t1doc.credentialSubject.stoneChain.tipSha256 =
    (t1doc.credentialSubject.stoneChain.tipSha256[0] === 'a' ? 'b' : 'a') + t1doc.credentialSubject.stoneChain.tipSha256.slice(1);
  const t1 = verifyProofB(t1doc);

  const t2doc = structuredClone(securedDocument);
  const pv = t2doc.proof.proofValue;
  const mid = Math.floor(pv.length / 2);
  t2doc.proof.proofValue = pv.slice(0, mid) + (pv[mid] === '2' ? '3' : '2') + pv.slice(mid + 1);
  const t2 = verifyProofB(t2doc);

  const t3doc = structuredClone(securedDocument);
  t3doc['@context'] = ['https://example.org/wrong-credentials/v2'];
  const t3 = verifyProofB(t3doc);

  const t4doc = structuredClone(securedDocument);
  t4doc['@context'] = [...t4doc['@context'], 'https://example.org/extra/v1'];
  const t4 = verifyProofB(t4doc);

  const controlsOk = !t1.verified && !t2.verified && !t3.verified && t4.verified;
  return {
    controlsOk,
    controls: {
      subjectTamper: { expected: false, got: t1.verified, why: t1.why },
      signatureTamper: { expected: false, got: t2.verified, why: t2.why },
      contextReplace: { expected: false, got: t3.verified, why: t3.why },
    },
    specSemanticsReceipts: {
      contextAppend: { specBehavior: 'still verifies — §3.3.2 prefix rule + proof-context replacement', expected: true, got: t4.verified, why: t4.why },
    },
  };
}
