// reader-a.mjs — READER A: direct node:crypto Ed25519 verification of the
// minted stone-checkpoint VC (lane 38-a two-reader receipt, path (a)).
//
// Reader A and reader B (verify.mjs) fail on DIFFERENT surfaces:
//   Reader A trusts the COMMITTED public key (public-key.json) and checks the
//   did:key BINDING (proof.verificationMethod must name exactly that key),
//   re-derives hashData with the house canonicalizer (jcs.mjs — the same
//   receipted RFC 8785 engine the mint path ran; that sharing is receipted,
//   not hidden), and hands the bytes to crypto.verify() — the opposite
//   direction of the mint path's crypto.sign().
//   Reader B trusts ONLY the document: it decodes the did:key itself
//   (base58-btc + multicodec 0xed01), re-implements §3.3.2-§3.3.7 from the
//   spec text, and is KAT-gated on the spec's own §B.3 vector first.
//
// Usage: node reader-a.mjs [vc.json]  (default: ./stone-checkpoint.vc.json)

import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jcsSerialize } from './jcs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest();

function main() {
  const vcPath = process.argv[2] ?? join(HERE, 'stone-checkpoint.vc.json');
  const securedDocument = JSON.parse(readFileSync(vcPath, 'utf8'));
  const keyRecord = JSON.parse(readFileSync(join(HERE, 'public-key.json'), 'utf8'));

  // 1. BINDING: the proof's verificationMethod must name the committed key
  const vm = securedDocument?.proof?.verificationMethod;
  const bindingOk = vm === keyRecord.verificationMethod && vm === keyRecord.didKey + '#' + keyRecord.multibase;

  // 2. RE-DERIVE hashData from the on-disk document (proof stripped,
  //    proofValue removed; proof @context === document @context at mint, and
  //    reader B enforces the full §3.3.2 context rule — noted honestly here).
  const { proof, ...unsecuredDocument } = securedDocument;
  const proofOptions = { ...proof };
  delete proofOptions.proofValue;
  const hashData = Buffer.concat([
    sha256(jcsSerialize(proofOptions)),
    sha256(jcsSerialize(unsecuredDocument)),
  ]);

  // 3. node:crypto Ed25519 verify with the committed raw public key
  const keyObject = createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(keyRecord.rawPublicKeyHex, 'hex').toString('base64url') },
    format: 'jwk',
  });
  const sig = Buffer.from(mbDecodeHex(proof.proofValue), 'hex');
  const sigOk = edVerify(null, hashData, keyObject, sig);

  const receipt = {
    reader: 'A (reader-a.mjs)',
    vc: vcPath,
    checkedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    bindingOk,
    hashDataHex: hashData.toString('hex'),
    signatureBytes: sig.length,
    sigOk,
    verified: bindingOk && sigOk,
  };
  writeFileSync(join(HERE, 'reader-a-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.verified) process.exit(1);
}

// multibase 'z' (base58-btc) decode — minimal local fold, independent of
// verify.mjs's decoder and sign.mjs's encoder
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

main();
