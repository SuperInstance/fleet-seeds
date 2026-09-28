#!/usr/bin/env node
// 40a-rekor-submit.mjs — lane 40-a transparency-smith
// rekor hashedrekord v0.0.1 submission of embassy/vc-envelope/stone-checkpoint.vc.json
//   artifact digest = sha256(file); Ed25519 signature over the DIGEST BYTES
//   (spec: sigstore/rekor@904bbccc pkg/types/hashedrekord/v0.0.1/entry.go:272
//    sigObj.Verify(nil, keyObj, options.WithDigest(decoded), ...) — payload = digest)
//   + independent RFC 6962 inclusion-proof self-verification of the returned entry.
import { createHash, createSign, createVerify, generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const REKOR = 'https://rekor.sigstore.dev';
const VC = new URL('../vc-envelope/stone-checkpoint.vc.json', import.meta.url);

// --- knobs (used by follow-on lanes after the receipted 400, see rekor-attestation.md)
//   --dry-run        build+sign+selfverify only, NO network submit
//   --alg=sha512     hashedrekord hash algorithm (sha256|sha384|sha512)
//   --key=ecdsa      key type (ed25519|ecdsa); ecdsa+sha256 is the classic cosign path
const ARGS = new Map(process.argv.slice(2).map((a) => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const HASH_ALG = ARGS.get('alg') ?? 'sha256';
const KEY_TYPE = ARGS.get('key') ?? 'ed25519';
const DRY_RUN = ARGS.has('dry-run');
if (!['sha256', 'sha384', 'sha512'].includes(HASH_ALG)) throw new Error(`bad alg ${HASH_ALG}`);
if (!['ed25519', 'ecdsa'].includes(KEY_TYPE)) throw new Error(`bad key ${KEY_TYPE}`);

const H = (b) => b.toString('hex');
const receipt = { started_at: new Date().toISOString(), hash_algorithm: HASH_ALG, key_type: KEY_TYPE, dry_run: DRY_RUN };

// 1. artifact + digest
const artifact = readFileSync(VC);
const digest = createHash(HASH_ALG).update(artifact).digest();
receipt.artifact = { path: 'embassy/vc-envelope/stone-checkpoint.vc.json', bytes: artifact.length, sha256: createHash('sha256').update(artifact).digest('hex'), [HASH_ALG]: H(digest) };

// 2. ephemeral key
let publicKey, privateKey, sig, selfverify;
if (KEY_TYPE === 'ed25519') {
  ({ publicKey, privateKey } = generateKeyPairSync('ed25519'));
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  receipt.ephemeral_public_key_sha256 = createHash('sha256').update(pem).digest('hex');
  // signature over digest bytes (PureEd25519 message = the digest) — per spec entry.go:272 WithDigest(decoded)
  sig = edSign(null, digest, privateKey);
  selfverify = edVerify(null, digest, publicKey, sig);
  receipt.proposedEntry_publicKey_pem_sha256 = createHash('sha256').update(pem).digest('hex');
  var PUB_PEM = pem;
} else {
  ({ publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' }));
  PUB_PEM = publicKey.export({ type: 'spki', format: 'pem' });
  receipt.ephemeral_public_key_sha256 = createHash('sha256').update(PUB_PEM).digest('hex');
  // ECDSA-P256 signs the digest via the standard prehash path (DER sig — what sigstore expects)
  const signer = createSign(HASH_ALG); signer.update(digest); signer.end();
  sig = signer.sign(privateKey);
  const verifier = createVerify(HASH_ALG); verifier.update(digest); verifier.end();
  selfverify = verifier.verify(publicKey, sig);
}
receipt.local_selfverify = selfverify;

const proposedEntry = {
  apiVersion: '0.0.1',
  kind: 'hashedrekord',
  spec: {
    data: { hash: { algorithm: HASH_ALG, value: H(digest) } },
    signature: {
      content: sig.toString('base64'),
      publicKey: { content: Buffer.from(PUB_PEM).toString('base64') },
    },
  },
};

// ---- RFC 6962 / rekor inclusion self-verify -------------------------------
// rekor leaf value = the canonicalized entry JSON (base64 "body");
// leaf hash = SHA-256(0x00 || leafValue); fold path per RFC 9162 §2.1.3.2.
const NH = (l, r) => createHash('sha256').update(Buffer.concat([Buffer.from([1]), l, r])).digest();
function verifyInclusion({ leafHash, treeSize, leafIndex, path, root }) {
  let lo = leafIndex, hi = treeSize - 1, h = leafHash, i = 0;
  while (hi > 0) {
    if (path.length <= i) return { ok: false, reason: 'path exhausted early' };
    const p = path[i++];
    if (lo % 2 === 1 || lo === hi) h = NH(p, h);
    else if (hi % 2 === 0) h = NH(h, p);
    else return { ok: false, reason: `unexpected tree state lo=${lo} hi=${hi}` };
    lo >>= 1; hi >>= 1;
  }
  return { ok: i === path.length && h.equals(root), computedRoot: h.toString('hex'), consumed: i, pathLen: path.length };
}

async function submit() {
  // rekor v1 spec: entries are created at POST /api/v1/log/entries
  // (v1 log confirmed live via GET /api/v1/log == 200)
  const res = await fetch(`${REKOR}/api/v1/log/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(proposedEntry),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text: text.slice(0, 2000) };
}

if (DRY_RUN) {
  receipt.final = 'DRY_RUN_OK_LOCAL_SELFVERIFY_' + (selfverify ? 'TRUE' : 'FALSE');
  writeFileSync(new URL('./rekor-submit-result.json', import.meta.url), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ dry_run: true, alg: HASH_ALG, key: KEY_TYPE, selfverify, entryBytes: JSON.stringify(proposedEntry).length }, null, 2));
  process.exit(0);
}

let attempt = await submit();
receipt.attempts = [{ status: attempt.status }];
// ATTEMPT LEDGER HONESTY: two earlier submissions were spent on a WRONG PATH
// (POST /api/v1/entries -> 404 "path not found", body receipted in
// rekor-submit-result.json before this run); those were routing 404s, not
// log rejections of the entry. This run uses the spec path /api/v1/log/entries.

if (attempt.status !== 201 || !attempt.json) {
  receipt.attempts[0].body = attempt.text;
  console.log('ATTEMPT1 non-201:', attempt.status, attempt.text.slice(0, 400));
  attempt = await submit(); // max 2 attempts per lane law
  receipt.attempts.push({ status: attempt.status, body: attempt.text.slice(0, 2000) });
  if (attempt.status !== 201 || !attempt.json) {
    receipt.final = 'REJECTED_AFTER_2_ATTEMPTS';
    writeFileSync(new URL('./rekor-submit-result.json', import.meta.url), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt, null, 2).slice(0, 3000));
    process.exit(2);
  }
}

const [uuid, entry] = Object.entries(attempt.json)[0];
receipt.entry_uuid = uuid;
receipt.integrated_time = entry.integratedTime;
receipt.log_id = entry.logID;
receipt.log_index = entry.logIndex;

// ---- self-verify inclusion proof -------------------------------------------
const ip = entry.verification?.inclusionProof;
let incl = { ok: false, reason: 'no inclusionProof in response' };
if (ip) {
  const leafValue = Buffer.from(entry.body, 'base64');
  const leafHash = createHash('sha256').update(Buffer.concat([Buffer.from([0]), leafValue])).digest();
  const root = Buffer.from(ip.rootHash, 'hex');
  incl = verifyInclusion({ leafHash, treeSize: ip.treeSize, leafIndex: ip.logIndex, path: ip.hashes.map((x) => Buffer.from(x, 'hex')), root });
  incl.leafHash = leafHash.toString('hex');
  incl.statedRootHash = ip.rootHash;
  incl.treeSize = ip.treeSize;
  incl.logIndex = ip.logIndex;
  incl.checkpoint_first_line = ip.checkpoint ? ip.checkpoint.split('\n')[0] : null;
}
receipt.inclusion_selfverify = incl;

// ---- canonical body sanity: body must re-serialize to our proposed entry ---
const bodyJson = JSON.parse(Buffer.from(entry.body, 'base64').toString('utf8'));
receipt.body_kind = bodyJson.kind;
receipt.body_digest_matches = bodyJson?.spec?.data?.hash?.value === H(digest);
receipt.body_sig_matches = Buffer.from(bodyJson.spec.signature.content, 'base64').equals(sig);

receipt.finished_at = new Date().toISOString();
receipt.final = incl.ok && receipt.body_digest_matches ? 'SEALED_OK' : 'SUBMITTED_INCLUSION_UNVERIFIED';
writeFileSync(new URL('./rekor-submit-result.json', import.meta.url), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: attempt.status, uuid, incl: receipt.inclusion_selfverify, final: receipt.final }, null, 2));
