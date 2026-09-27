// g17-port.mjs — a Node.js port of jev-quilt's G17 Attestation byte law
// (read from their repo at HEAD 6001069: jev_quilt/attest.py, fold.py,
// bookkeeper.py, ed25519.py, signed_receipts.py). ZERO changes to their
// repo; this file exists so the oracle can PROVE the port cross-language
// (py_bridge.py runs their real Python against this port, both directions).
//
// Their law, verbatim:
//   leaf(r)        = sha256("{witness}\x1f{value}\x1f{int(drifting)}")
//   canonical      = "|".join(sorted readings as "{w}\x1f{v}\x1f{d}") +
//                    "|{consensus or ''}|{quorum}|{earned_floor or ''}"  (UTF-8)
//   attestation_root = MMR(leaves sorted by witness + __meta__ leaf)
//                    MMR = binary-counter peaks, bag = sha256(peaks||count),
//                    empty = sha256("mmr:empty")
//   chain_head_hex = fnv1a-64 over the tip's UTF-8 bytes, 16 lowercase hex
//   signature      = Ed25519(seed, canonical || chain_head_ascii)  (RFC 8032;
//                    their ed25519.sign does NOT pre-hash — checked at source)
//
// Cross-fleet note: their fnv1a is byte-based (UTF-8); the fleet's stone
// fnv1a64 is UTF-16-code-unit based — identical on ASCII (attestation roots
// are hex), a documented divergence beyond it (see stone-bridge report).

import { createHash, createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest();
const utf8 = (s) => Buffer.from(s, 'utf8');

// ── their fnv1a-64 over bytes (bookkeeper.py, byte-based) ──────────────────
export function fnv1a64Bytes(buf) {
  let h = 0xcbf29ce484222325n;
  const p = 0x100000001b3n, m = 0xffffffffffffffffn;
  for (const b of buf) {
    h ^= BigInt(b);
    h = (h * p) & m;
  }
  return h;
}

export function chainHeadHex(chainTip) {
  return fnv1a64Bytes(utf8(chainTip)).toString(16).padStart(16, '0');
}

// ── canonical attestation bytes (attest.py verbatim) ───────────────────────
function readingPart(r) {
  return `${r.witness}\u001f${r.value}\u001f${r.drifting ? 1 : 0}`;
}

export function canonicalAttestationBytes(readings, consensus, quorum, earnedFloor) {
  const sorted = [...readings].sort((a, b) => (a.witness < b.witness ? -1 : a.witness > b.witness ? 1 : 0));
  const rsPart = sorted.map(readingPart).join('|');
  return utf8(`${rsPart}|${consensus || ''}|${quorum}|${earnedFloor || ''}`);
}

// ── MMR (fold.py verbatim: binary-counter peaks, bagged with count) ────────
function pushPeak(stack, i, leaf) {
  let h = 0, node = leaf;
  while (i & (1 << h)) {
    node = sha256(Buffer.concat([stack.pop(), node]));
    h++;
  }
  stack.push(node);
}

export function mmrRoot(leaves) {
  if (leaves.length === 0) return sha256(utf8('mmr:empty'));
  const stack = [];
  for (let i = 0; i < leaves.length; i++) pushPeak(stack, i, leaves[i]);
  return sha256(Buffer.concat([...stack, utf8(String(leaves.length))]));
}

function attestationLeaf(r) {
  return sha256(utf8(readingPart(r)));
}

export function attestationRoot(readings, consensus, quorum, earnedFloor) {
  const sorted = [...readings].sort((a, b) => (a.witness < b.witness ? -1 : a.witness > b.witness ? 1 : 0));
  const leaves = sorted.map(attestationLeaf);
  leaves.push(sha256(utf8(`__meta__\u001f${consensus || ''}\u001f${quorum}\u001f${earnedFloor || ''}`)));
  return mmrRoot(leaves);
}

// ── Ed25519 helpers: RFC 8032 seed -> Node key objects (PKCS8/SPKI wrap) ───
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function privateKeyFromSeed(seed32) {
  return createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed32]), format: 'der', type: 'pkcs8' });
}

export function publicKeyFromSeed(seed32) {
  return createPublicKey(privateKeyFromSeed(seed32));
}

export function publicKeyHexFromSeed(seed32) {
  const spki = publicKeyFromSeed(seed32).export({ format: 'der', type: 'spki' });
  return spki.subarray(spki.length - 32).toString('hex');
}

// ── sign/verify in THEIR scheme ────────────────────────────────────────────
export function sealAttestation(att, seedHex) {
  const canonical = canonicalAttestationBytes(att.readings, att.consensus, att.quorum, att.earned_floor);
  const chainHead = chainHeadHex(att.root);
  const msg = Buffer.concat([canonical, utf8(chainHead)]);
  const sig = edSign(null, msg, privateKeyFromSeed(Buffer.from(seedHex, 'hex')));
  return { chainHead, signatureHex: sig.toString('hex') };
}

// verify_attestation (attest.py): root first, then signature — never raises.
export function verifyAttestation(att, pubkeysHex) {
  const recomputed = attestationRoot(att.readings, att.consensus, att.quorum, att.earned_floor).toString('hex');
  if (recomputed !== att.root) return { ok: false, reasons: ['root_mismatch'], signer: att.signer };
  if (pubkeysHex[att.signer] === undefined) return { ok: false, reasons: ['unknown_signer'], signer: att.signer };
  if (chainHeadHex(att.root) !== att.chain_head) return { ok: false, reasons: ['wrong_chain_head'], signer: att.signer };
  const canonical = canonicalAttestationBytes(att.readings, att.consensus, att.quorum, att.earned_floor);
  const msg = Buffer.concat([canonical, utf8(att.chain_head)]);
  const ok = edVerify(null, msg, createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(pubkeysHex[att.signer], 'hex')]), format: 'der', type: 'spki' }), Buffer.from(att.signature, 'hex'));
  return { ok, reasons: ok ? [] : ['bad_signature'], signer: att.signer };
}

// ── synthetic G17-shape attestation builder (their exact field set) ────────
// Fields verbatim from attest.Attestation: readings, consensus, quorum,
// earned_floor, root, signer, signature (+ our chain_head for the port's
// verify path — theirs recomputes it from root).
export function mintSyntheticAttestation({ witnesses, consensus, quorum, earnedFloor, signer, seedHex }) {
  const readings = witnesses.map((w) => ({ witness: w.id, value: w.value, drifting: !!w.drifting }));
  const root = attestationRoot(readings, consensus, quorum, earnedFloor).toString('hex');
  const att = { readings, consensus, quorum, earned_floor: earnedFloor, root, signer, chain_head: null, signature: null };
  const { chainHead, signatureHex } = sealAttestation(att, seedHex);
  att.chain_head = chainHead;
  att.signature = signatureHex;
  return att;
}
