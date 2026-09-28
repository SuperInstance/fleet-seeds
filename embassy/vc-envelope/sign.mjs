// sign.mjs — MINT a W3C VC 2.0 checkpoint credential (DataIntegrityProof,
// cryptosuite eddsa-jcs-2022) over the qthe e_q6 stone-v1 receipt chain.
//
// Lane 38-a (vc-smith), seed S2 from scout 37-f: our jcs-eddsa-2022-void
// envelope practice maps field-for-field onto the REGISTERED cryptosuite
// eddsa-jcs-2022 (vc-di-eddsa §3.3, W3C Recommendation 15 May 2025).
//
// Spec flow implemented here (vc-di-eddsa §3.3):
//   §3.3.1 Create Proof   — proof = options; proof.@context = doc.@context (step 2);
//   §3.3.5 Proof Config   — validate type/cryptosuite/created, JCS-canonicalize;
//   §3.3.3 Transformation — canonicalDocument = JCS(unsecuredDocument);
//   §3.3.4 Hashing        — hashData = sha256(canonicalProofConfig) || sha256(canonicalDocument);
//   §3.3.6 Serialization  — PureEdDSA(Ed25519) over hashData; proofValue = base58-btc Multibase.
//
// KEY LAW: a FRESH Ed25519 keypair is generated in-process per mint
// (node:crypto generateKeyPairSync('ed25519')). The PRIVATE KEY is never
// written to disk, never printed, never transmitted — it dies with this
// process. Only the derived did:key (public) is persisted, in public-key.json.
//
// Zero-dependency ESM. jcs.mjs is reused BYTES VERBATIM from embassy/vc-oracle
// per seed 37-f (the receipted RFC 8785 canonicalizer, RFC-corpus-proven there).

import { createHash, generateKeyPairSync, sign as edSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jcsSerialize } from './jcs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── base58-btc Multibase encode (multibase 'z' prefix; Bitcoin alphabet) ───
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58BtcEncode(bytes) {
  // big-endian big-integer repeated divmod (independent of any other file)
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  // leading zero bytes encode as leading '1's
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) out = '1' + out;
  return out;
}

// ── did:key from a raw Ed25519 public key (multicodec 0xed01 + 32 bytes) ───
function ed25519DidKey(rawPub32) {
  const mb = 'z' + base58BtcEncode(Buffer.concat([Buffer.from([0xed, 0x01]), rawPub32]));
  return { multibase: mb, didKey: `did:key:${mb}`, verificationMethod: `did:key:${mb}#${mb}` };
}

// xsd:dateTime instant, second precision, UTC ('Z') — valid XMLSCHEMA11-2
function xsdNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ── sha256 over UTF-8 bytes ────────────────────────────────────────────────
const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest();

// ── the chain being checkpointed (read from disk; verified separately by
//    the house verifier BEFORE this script is ever run — see README) ───────
const CHAIN_PATH = '/home/z/my-project/download/qthe/receipts/e_q6_chain.jsonl';

function chainFacts() {
  const raw = readFileSync(CHAIN_PATH);
  const lines = raw.toString('utf8').split('\n').filter((l) => l.trim() !== '');
  const rows = lines.map((l) => JSON.parse(l));
  const header = rows[0];
  if (header.kind !== 'stone.header' || header.alg !== 'stone-v1') {
    throw new Error('chain header is not stone-v1 stone.header — refusing to mint');
  }
  const tip = rows[rows.length - 1];
  return {
    fileBytes: raw.length,
    fileSha256: createHash('sha256').update(raw).digest('hex'),
    links: rows.length,
    header,
    tipRowHash: tip.row_hash,
    tipKind: tip.kind,
  };
}

// ── the unsecured VC document (vc-data-model-2.0 §3 Core / §4 Basic) ───────
function buildUnsecured(did, instant, facts) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: `urn:stone:SuperInstance:qthe:e_q6_chain:${facts.tipRowHash.slice(0, 8)}`,
    type: ['VerifiableCredential', 'StoneCheckpointCredential'],
    issuer: did.didKey,
    // DM 2.0 renamed issuanceDate -> validFrom (change log §G; the v2 context
    // defines validFrom, NOT issuanceDate). The lane directive said
    // "issuanceDate = today"; the mapping is receipted in README/worklog.
    validFrom: instant,
    credentialSubject: {
      id: 'urn:stone:SuperInstance:qthe:e_q6_chain',
      stoneChain: {
        format: facts.header.alg,
        genesis: facts.header.genesis,
        repo: facts.header.repo,
        lane: facts.header.lane,
        owns: facts.header.owns,
        experiment: facts.header.experiment,
        claim: facts.header.claim,
        headerRowHash: facts.header.row_hash,
        links: facts.links,
        tipSha256: facts.tipRowHash,
        tipKind: facts.tipKind,
      },
      artifact: {
        repo: 'SuperInstance/qthe',
        path: 'receipts/e_q6_chain.jsonl',
        mediaType: 'application/x-ndjson',
        sha256: facts.fileSha256,
        bytes: facts.fileBytes,
      },
      verifiedBy: `quilt-stone/stone.mjs verifyChainFile -> ok:true alg:stone-v1 links:${facts.links} tip:${facts.tipRowHash}`,
      verificationMethod: did.verificationMethod,
    },
  };
}

// ── MINT ────────────────────────────────────────────────────────────────────
export function mint() {
  const facts = chainFacts();

  // FRESH keypair, process-memory only (see KEY LAW above)
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const jwk = publicKey.export({ format: 'jwk' });
  const rawPub = Buffer.from(jwk.x, 'base64url');
  if (rawPub.length !== 32) throw new Error('unexpected raw public key length');
  const did = ed25519DidKey(rawPub);

  const instant = xsdNow();
  const unsecuredDocument = buildUnsecured(did, instant, facts);

  // §3.3.1 step 1-2: proof = options clone; carry the document @context into
  // the proof (interoperability note: required for proof sets/chains).
  const proof = {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-jcs-2022',
    created: instant,
    verificationMethod: did.verificationMethod,
    proofPurpose: 'assertionMethod',
  };
  proof['@context'] = unsecuredDocument['@context'];

  // §3.3.5 Proof Configuration: validate + JCS-canonicalize
  if (proof.type !== 'DataIntegrityProof' || proof.cryptosuite !== 'eddsa-jcs-2022') {
    throw new Error('PROOF_GENERATION_ERROR: bad type/cryptosuite');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(proof.created)) {
    throw new Error('PROOF_GENERATION_ERROR: created is not a valid xsd:dateTime');
  }
  const canonicalProofConfig = jcsSerialize(proof);

  // §3.3.3 Transformation: JCS over the unsecured document
  const canonicalDocument = jcsSerialize(unsecuredDocument);

  // §3.3.4 Hashing: proofConfigHash || transformedDocumentHash
  const hashData = Buffer.concat([sha256(canonicalProofConfig), sha256(canonicalDocument)]);
  if (hashData.length !== 64) throw new Error('hashData must be exactly 64 bytes');

  // §3.3.6 Proof Serialization: PureEdDSA Ed25519 over hashData (64-byte sig)
  const proofBytes = edSign(null, hashData, privateKey);
  if (proofBytes.length !== 64) throw new Error('proofBytes must be exactly 64 bytes');
  proof.proofValue = 'z' + base58BtcEncode(proofBytes);

  const signed = { ...unsecuredDocument, proof };

  // persist: the public credential + the public key record (private DIES here)
  const vcPath = join(HERE, 'stone-checkpoint.vc.json');
  writeFileSync(vcPath, JSON.stringify(signed, null, 2) + '\n', 'utf8');
  writeFileSync(
    join(HERE, 'public-key.json'),
    JSON.stringify(
      {
        note: 'FRESH Ed25519 public key for lane 38-a stone-checkpoint VC. The private key existed ONLY in sign.mjs process memory during minting and was destroyed at process exit — never written to disk, never printed, never transmitted. Verification needs nothing but this file and the did:key embedded in the credential.',
        keyType: 'Ed25519 (Multikey, multicodec 0xed01)',
        created: instant,
        multibase: did.multibase,
        didKey: did.didKey,
        verificationMethod: did.verificationMethod,
        rawPublicKeyHex: rawPub.toString('hex'),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  return {
    vcPath,
    did: did.verificationMethod,
    created: instant,
    hashDataHex: hashData.toString('hex'),
    proofConfigHashHex: sha256(canonicalProofConfig).toString('hex'),
    documentHashHex: sha256(canonicalDocument).toString('hex'),
    canonicalDocumentBytes: Buffer.byteLength(canonicalDocument, 'utf8'),
    proofValue: proof.proofValue,
    chain: { links: facts.links, tip: facts.tipRowHash },
  };
}

// CLI: `node sign.mjs` prints the mint receipt as JSON.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(mint(), null, 2));
}
