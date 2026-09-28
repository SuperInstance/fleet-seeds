// verify.mjs — READER B: an INDEPENDENT eddsa-jcs-2022 verifier, written from
// the normative text of vc-di-eddsa (W3C Recommendation 15 May 2025):
//   §3.3.2 Verify Proof (the flow), §3.3.3 Transformation, §3.3.4 Hashing,
//   §3.3.5 Proof Configuration, §3.3.7 Proof Verification.
// It shares NO code with sign.mjs (the mint path). The only shared file is
// jcs.mjs — the receipted RFC 8785 canonicalizer, reused BYTES VERBATIM from
// embassy/vc-oracle per seed 37-f (canonicalization is load-bearing and
// corpus-proven there: vectors/rfc8785, 6/6 byte-exact).
//
// FAIL-CLOSED ORDERING: before this reader is allowed to judge OUR document,
// it must pass the spec's own §B.3 test vector (B.3 Representation:
// eddsa-jcs-2022) end-to-end — canonicalization bytes, both hashes, the
// base58-btc proofValue decode, and a full §3.3.2 verification of Example 39.
// If ANY KAT step fails, this reader exits non-zero and NEVER reaches our VC.
//
// Usage: node verify.mjs [vc.json]   (default: ./stone-checkpoint.vc.json)
// Writes: kat-b3-results.json, verify-receipt.json (next to this file).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jcsSerialize } from './jcs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC_URL = 'https://www.w3.org/TR/vc-di-eddsa/';

// ── base58-btc Multibase decode (multibase 'z'; Bitcoin alphabet) ──────────
// Deliberately a different construction from sign.mjs's encoder: fold the
// alphabet indices into a big integer most-significant-first.
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
function rawPubFromDidKey(verificationMethod) {
  const m = /^did:key:(z[1-9A-HJ-NP-Za-km-z]+)#z[1-9A-HJ-NP-Za-km-z]+$/.exec(verificationMethod);
  if (!m) throw new Error(`verificationMethod is not a did:key Multikey form: ${verificationMethod}`);
  const decoded = base58BtcDecode(m[1]);
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('did:key is not a 32-byte Ed25519 Multikey (expected 0xed01 prefix)');
  }
  return decoded.subarray(2);
}

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest();

// ── §3.3.5 Proof Configuration (eddsa-jcs-2022) ─────────────────────────────
function canonicalProofConfig(proofOptions) {
  if (proofOptions.type !== 'DataIntegrityProof') {
    throw new Error('PROOF_VERIFICATION_ERROR: options.type must be DataIntegrityProof');
  }
  if (proofOptions.cryptosuite !== 'eddsa-jcs-2022') {
    throw new Error('PROOF_VERIFICATION_ERROR: options.cryptosuite must be eddsa-jcs-2022');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(proofOptions.created ?? '')) {
    throw new Error('PROOF_VERIFICATION_ERROR: created is not a valid xsd:dateTime');
  }
  return jcsSerialize(proofOptions);
}

// ── §3.3.3 Transformation (eddsa-jcs-2022) ──────────────────────────────────
function transform(unsecuredDocument, options) {
  if (options.type !== 'DataIntegrityProof' || options.cryptosuite !== 'eddsa-jcs-2022') {
    throw new Error('PROOF_VERIFICATION_ERROR: transformation options bad');
  }
  return jcsSerialize(unsecuredDocument);
}

// ── §3.3.4 Hashing (eddsa-jcs-2022) ─────────────────────────────────────────
function hashDataOf(canonicalDocument, canonicalProofConfig) {
  return Buffer.concat([sha256(canonicalProofConfig), sha256(canonicalDocument)]);
}

// §3.3.2 helper — "securedDocument.@context starts with all values contained
// in proofOptions.@context in the same order" (string or array forms)
function contextPrefixOk(docContext, proofContext) {
  const d = Array.isArray(docContext) ? docContext : [docContext];
  const p = Array.isArray(proofContext) ? proofContext : [proofContext];
  if (p.length > d.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (JSON.stringify(d[i]) !== JSON.stringify(p[i])) return false;
  }
  return true;
}

// ── §3.3.2 Verify Proof (eddsa-jcs-2022) ────────────────────────────────────
// Returns { verified, verifiedDocument, detail } — or THROWS on malformed
// input (a throw is a verification failure: callers catch and record).
function verifyProof(securedDocument, options = {}) {
  const out = (verified, extra = {}) => ({ verified, verifiedDocument: verified ? options.__returnedDoc : null, ...extra });
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

    // §3.3.2 @context rule: the document context must START WITH the proof
    // context in the same order; the verification input then uses the proof's
    // copy (protects the proof hash across context-scoped proof sets/chains).
    if (proofOptions['@context'] !== undefined) {
      if (!contextPrefixOk(unsecuredDocument['@context'], proofOptions['@context'])) {
        return out(false, { why: 'document @context does not start with proof @context in the same order' });
      }
      unsecuredDocument['@context'] = proofOptions['@context'];
    }

    const canonicalDocument = transform(unsecuredDocument, proofOptions);
    const canonicalConfig = canonicalProofConfig(proofOptions);
    const hashData = hashDataOf(canonicalDocument, canonicalConfig);

    // §3.3.7 Proof Verification — PureEdDSA Ed25519 over hashData
    const rawPub = rawPubFromDidKey(proofOptions.verificationMethod);
    const keyObject = createPublicKeyFromRaw(rawPub);
    const ok = cryptoVerify(hashData, proofBytes, keyObject);
    options.__returnedDoc = unsecuredDocument;
    return out(ok, {
      why: ok ? null : 'Ed25519 verification returned false',
      hashDataHex: hashData.toString('hex'),
      proofConfigHashHex: sha256(canonicalConfig).toString('hex'),
      documentHashHex: sha256(canonicalDocument).toString('hex'),
    });
  } catch (e) {
    return out(false, { why: e.message });
  }
}

// node:crypto plumbing for §3.3.7 (Reader B builds its own KeyObject from the
// did:key bytes — it does NOT trust any persisted key file)
import { createPublicKey, verify as edVerify } from 'node:crypto';
function createPublicKeyFromRaw(raw32) {
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(raw32).toString('base64url') },
    format: 'jwk',
  });
}
function cryptoVerify(data, sig, keyObject) {
  return edVerify(null, data, keyObject, sig);
}

// ═══════════════════════════════════════════════════════════════════════════
// KAT — the spec's own §B.3 test vector (fail-closed gate)
// Constants transcribed verbatim from https://www.w3.org/TR/vc-di-eddsa/#B.3
// ═══════════════════════════════════════════════════════════════════════════
const B3 = {
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

function runKAT() {
  const steps = [];
  const add = (id, claim, pass, detail) => steps.push({ id, claim, pass, detail });

  // K1: JCS(Example 30) === Example 31, byte-exact
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

  // K2: sha256(Example 31) === Example 32
  const docHash = sha256(canonDoc).toString('hex');
  add('K2-document-hash', 'sha256(canonical credential) === Example 32', docHash === B3.credentialHashHex, { got: docHash });

  // K3: JCS(Example 33) === Example 34, byte-exact
  const canonOpts = jcsSerialize(B3.proofOptions);
  add('K3-jcs-proof-config', 'JCS(Example 33) === Example 34 canonical proof options, byte-exact',
    canonOpts === B3.canonicalProofOptions, { bytes: Buffer.byteLength(canonOpts, 'utf8') });

  // K4: sha256(Example 34) === Example 35
  const optsHash = sha256(canonOpts).toString('hex');
  add('K4-proof-config-hash', 'sha256(canonical proof options) === Example 35', optsHash === B3.proofOptionsHashHex, { got: optsHash });

  // K5: §3.3.4 composition === Example 36
  const combined = Buffer.concat([Buffer.from(optsHash, 'hex'), Buffer.from(docHash, 'hex')]).toString('hex');
  add('K5-hash-composition', 'proofConfigHash || documentHash === Example 36', combined === B3.combinedHashHex, {});

  // K6: base58-btc decode(Example 38) === Example 37 hex
  const decoded = base58BtcDecode(B3.proofValue).toString('hex');
  add('K6-multibase-decode', "base58-btc decode(Example 38 proofValue) === Example 37 signature hex", decoded === B3.signatureHex, { bytes: decoded.length / 2 });

  // K7: full §3.3.2 verification of Example 39 under the spec's own key
  const v = verifyProof(B3.signedCredential);
  add('K7-verify-example-39', '§3.3.2 Verify Proof(Example 39) === true', v.verified === true,
    { hashDataHex: v.hashDataHex, why: v.why });

  // K8: the reader's hash composition touches the combined hash the spec signed
  add('K8-kat-hash-echo', 'KAT verify hashData === Example 36 combined hash', v.hashDataHex === B3.combinedHashHex, {});

  const passed = steps.filter((s) => s.pass).length;
  return { steps, passed, total: steps.length, ok: passed === steps.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — KAT first (fail-closed), then our VC, then tamper controls
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  const vcPath = process.argv[2] ?? join(HERE, 'stone-checkpoint.vc.json');
  const receipt = { reader: 'B (verify.mjs)', spec: SPEC_URL, specVersion: 'W3C Recommendation 15 May 2025', checkedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') };

  // ---- GATE: spec §B.3 vector, fail-closed ----
  const kat = runKAT();
  writeFileSync(join(HERE, 'kat-b3-results.json'), JSON.stringify({
    kat: 'vc-di-eddsa §B.3 (eddsa-jcs-2022) — the spec\'s own test vector',
    source: SPEC_URL + '#B.3',
    ok: kat.ok,
    passed: kat.passed,
    total: kat.total,
    steps: kat.steps,
  }, null, 2) + '\n', 'utf8');

  if (!kat.ok) {
    // FAIL-CLOSED: never touch our document if the spec vector fails
    writeFileSync(join(HERE, 'verify-receipt.json'), JSON.stringify({ ...receipt, gate: 'FAILED', verdict: 'REFUSED', why: 'KAT failed — reader not qualified to judge our document' }, null, 2) + '\n', 'utf8');
    console.error('KAT FAILED — fail-closed, refusing to verify our document');
    process.exit(2);
  }

  // ---- our document, read from disk ----
  const securedDocument = JSON.parse(readFileSync(vcPath, 'utf8'));
  const ours = verifyProof(securedDocument);
  receipt.gate = 'PASSED';
  receipt.vc = vcPath;
  receipt.verified = ours.verified;
  receipt.why = ours.why;
  receipt.hashDataHex = ours.hashDataHex;
  receipt.proofConfigHashHex = ours.proofConfigHashHex;
  receipt.documentHashHex = ours.documentHashHex;

  // ---- tamper controls (the falsifier's inverse: the reader must REJECT) ----
  const tampered = structuredClone(securedDocument);
  tampered.credentialSubject.stoneChain.tipSha256 =
    (tampered.credentialSubject.stoneChain.tipSha256[0] === 'a' ? 'b' : 'a') + tampered.credentialSubject.stoneChain.tipSha256.slice(1);
  const t1 = verifyProof(tampered);

  const badSig = structuredClone(securedDocument);
  const pv = badSig.proof.proofValue;
  const mid = Math.floor(pv.length / 2);
  badSig.proof.proofValue = pv.slice(0, mid) + (pv[mid] === '2' ? '3' : '2') + pv.slice(mid + 1);
  const t2 = verifyProof(badSig);

  // context REPLACE: document context no longer starts with the proof context
  // in the same order -> §3.3.2 prefix rule must reject
  const badCtx = structuredClone(securedDocument);
  badCtx['@context'] = ['https://example.org/wrong-credentials/v2'];
  const t3 = verifyProof(badCtx);

  // context APPEND: spec semantics receipt, NOT a tamper — §3.3.2 only demands
  // the PREFIX rule and then replaces the verification context with the
  // proof's own copy, so an appended extra context value still verifies. This
  // is the scout's honest loss ("mandatory @context validation") shown on our
  // own artifact rather than hidden.
  const appendedCtx = structuredClone(securedDocument);
  appendedCtx['@context'] = [...appendedCtx['@context'], 'https://example.org/extra/v1'];
  const t4 = verifyProof(appendedCtx);

  receipt.tamperControls = {
    subjectTamper: { expected: false, got: t1.verified, why: t1.why },
    signatureTamper: { expected: false, got: t2.verified, why: t2.why },
    contextReplace: { expected: false, got: t3.verified, why: t3.why },
  };
  receipt.specSemanticsReceipts = {
    contextAppend: {
      specBehavior: 'still verifies — §3.3.2 prefix rule + proof-context replacement',
      expected: true, got: t4.verified, why: t4.why,
      note: 'the scout\'s honest loss (mandatory @context validation) demonstrated on our own artifact',
    },
  };
  const controlsOk = !t1.verified && !t2.verified && !t3.verified && t4.verified;
  receipt.tamperControlsOk = controlsOk;
  receipt.verdict = ours.verified && controlsOk ? 'VERIFIED' : 'FAILED';
  receipt.falsifierStatus = ours.verified
    ? 'NOT triggered — a spec-conforming reader (KAT-proven on §B.3) ACCEPTS our proof'
    : 'TRIGGERED — spec-conforming reader rejects our proof; shipping the FAIL honestly';

  writeFileSync(join(HERE, 'verify-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ kat: `${kat.passed}/${kat.total}`, verified: ours.verified, tamperControlsOk: controlsOk, verdict: receipt.verdict, hashDataHex: ours.hashDataHex }, null, 2));
  if (!(ours.verified && controlsOk)) process.exit(1);
}

main();
