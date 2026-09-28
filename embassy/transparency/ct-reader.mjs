// ct-reader.mjs — the CT/tile-log dialect reader (S3, seed 37-f Track 5).
//
// Lane 40-a (transparency-smith) ADOPTED + VERIFIED this file: lane 39-a died
// mid-build with the KATs never run. 40-a ran the canonical RFC 6962 vectors
// (google/certificate-transparency @ 0fe5116f... cpp/merkletree/
// {merkle_tree_test.cc, tree_hasher_test.cc}; transparency-dev/merkle @
// fbbcd741... rfc6962/rfc6962_test.go — see ct-kat.mjs + ct-reader.verified.md
// for the pinned SHAs and receipts) before any live claim. Audit changes by
// 40-a are marked "40-a:" below; everything else is 39-a's text kept verbatim.
//
// WHAT: offline verification arithmetic for Certificate-Transparency-shaped
// Merkle trees, so a stone tip mirrored into a foreign log (Rekor) is
// trust-ADDED, not trust-shifted: we re-derive the fold ourselves instead of
// accepting the log's word for it.
//
// SCOPE (pinned to primary-source text, fetched 2026-09-27):
//   - RFC 9162 §2.1.1  Merkle Tree Hash (leaf 0x00-prefix, node 0x01-prefix,
//     k = largest power of two smaller than n) — identical definitions in
//     RFC 6962 §2.1.1 (v1, the dialect Rekor v1 speaks).
//   - RFC 9162 §2.1.3.2  inclusion-proof verification, implemented VERBATIM
//     (including the b.ii "right-shift both fn and sn equally until either
//     LSB(fn) is set or fn is 0" rule) + two strictness additions:
//     the path must be fully consumed and leaf_index must be in bounds.
//   - RFC 9162 §2.1.4.2  consistency-proof verification between two tree
//     heads (with the `first is an exact power of 2` prepend rule).
//   - RFC 6962 §3.2/§4.3  TreeHeadSignature verification for classic (v1)
//     CT logs (get-sth): blob = 0x00 || 0x01 || u64be(timestamp) ||
//     u64be(tree_size) || root[32]; ECDSA-P256/SHA-256 DER signatures.
//     Byte layout pinned against certificate-transparency-go serialization.go
//     SerializeSTHSignatureInput + types.go TreeHeadSignature @ f7ce2e30...
//     (40-a addition).
//   - C2SP tlog-checkpoint parsing (tolerant: trailing blank lines, em-dash
//     and hyphen signature lines, labeled signatures).
//   - Rekor v1 glue: leaf-data extraction from an API entry (`body` IS the
//     leaf bytes), tolerant proof-hash decoding (hex-64 or base64), the
//     signedEntryTimestamp blob (Go struct order — see note at function),
//     and the signed-note checkpoint signature (4-byte key-hint prefix).
//
// STYLE: no external dependencies (node:crypto only, house law). Every
// function is fail-closed: it returns {ok:false, reason} rather than throwing
// on bad input, and never invents a pass it did not compute.
//
// KAT posture (37-f): spec text above is the normative source; rekor's own
// /api/v1/log/proof responses and UTA's published verify-rekor.mjs are KAT
// SOURCES, not truth oracles — a disagreement is a registered falsifier.

// 40-a: one-shot crypto.verify replaces the streaming createVerify(...) path
// the 39-a draft used for ed25519 — createVerify(null) was never executed
// before the 39-a context death, and the one-shot form is the documented
// Ed25519/Ed448 API (also correct for ECDSA-P256 with dsaEncoding 'der').
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';

// ---------------------------------------------------------------- primitives

export function sha256(...parts) {
  return createHash('sha256').update(Buffer.concat(parts)).digest();
}

export const hex = (buf) => Buffer.from(buf).toString('hex');
export const fromHex = (s) => Buffer.from(String(s), 'hex');
export const fromB64 = (s) => Buffer.from(String(s), 'base64');

// RFC 9162 §2.1.1: MTH({d[0]}) = HASH(0x00 || d[0])
export function leafHash(leafData) {
  return sha256(Buffer.from([0x00]), Buffer.from(leafData));
}

// RFC 9162 §2.1.1: MTH(D_n) = HASH(0x01 || MTH(D[0:k]) || MTH(D[k:n]))
export function nodeHash(left, right) {
  return sha256(Buffer.from([0x01]), Buffer.from(left), Buffer.from(right));
}

// RFC 9162 §2.1.1: MTH({}) = HASH() — the empty-string SHA-256.
export function emptyTreeRoot() {
  return sha256();
}

// ------------------------------------------------- reference tree (KAT only)

// Minimal reference implementation of the RFC 9162 §2.1.1 tree definition,
// used ONLY by the KAT to exhaustively cross-check the two independent
// verification algorithms below (verifier vs reference tree = two readings
// of the same normative text; any disagreement is a registered falsifier).
export function refMTH(leaves) {
  const n = leaves.length;
  if (n === 0) return emptyTreeRoot();
  if (n === 1) return leafHash(leaves[0]);
  let k = 1;
  while (k * 2 < n) k *= 2;
  return nodeHash(refMTH(leaves.slice(0, k)), refMTH(leaves.slice(k)));
}

export function refInclusionPath(m, leaves) {
  const n = leaves.length;
  if (n <= 1) return [];
  let k = 1;
  while (k * 2 < n) k *= 2;
  if (m < k) return [...refInclusionPath(m, leaves.slice(0, k)), refMTH(leaves.slice(k))];
  return [...refInclusionPath(m - k, leaves.slice(k)), refMTH(leaves.slice(0, k))];
}

// RFC 9162 §2.1.2 (verify a tree head given entries) — used by the KAT.
export function rootFromLeaves(leaves) {
  return refMTH(leaves);
}

// ------------------------------------------------------- inclusion proof (S3)

/**
 * RFC 9162 §2.1.3.2, verbatim algorithm + strict end-state checks.
 *
 * @param {object} p
 * @param {Buffer|string} p.leafHash   32-byte leaf hash (HASH(0x00 || leaf))
 * @param {number} p.treeSize          total leaves in the tree at the STH
 * @param {number} p.leafIndex         0-based index of the proven leaf
 * @param {Buffer[]|string[]} p.path   inclusion (audit) path, leaf-upward
 * @param {Buffer|string} p.rootHash   32-byte expected root
 * @returns {{ok:boolean, reason?:string, computedRoot?:string, pathConsumed?:number}}
 */
export function verifyInclusionProof({ leafHash: lh, treeSize, leafIndex, path, rootHash }) {
  const fail = (reason) => ({ ok: false, reason });
  if (!Number.isInteger(treeSize) || treeSize < 1) return fail('treeSize must be an integer >= 1');
  if (!Number.isInteger(leafIndex) || leafIndex < 0) return fail('leafIndex must be an integer >= 0');
  if (leafIndex >= treeSize) return fail(`leafIndex ${leafIndex} >= treeSize ${treeSize} (out of bounds)`); // step 1
  const r0 = asBuf(lh, 'leafHash'); if (!r0.ok) return fail(r0.reason);
  const root = asBuf(rootHash, 'rootHash'); if (!root.ok) return fail(root.reason);
  if (r0.buf.length !== 32) return fail(`leafHash must be 32 bytes, got ${r0.buf.length}`);
  if (root.buf.length !== 32) return fail(`rootHash must be 32 bytes, got ${root.buf.length}`);
  const P = [];
  for (const p of path ?? []) {
    const b = asBuf(p, 'path element');
    if (!b.ok) return fail(b.reason);
    if (b.buf.length !== 32) return fail(`path element must be 32 bytes, got ${b.buf.length}`);
    P.push(b.buf);
  }

  let fn = leafIndex;           // step 2
  let sn = treeSize - 1;
  let r = r0.buf;               // step 3
  let x = 0;
  for (const p of P) {          // step 4
    if (sn === 0) return fail('sn hit 0 with path entries remaining (path too long)'); // 4.a
    if (((fn & 1) === 1) || fn === sn) {                        // 4.b
      r = nodeHash(p, r);                                       // 4.b.i  HASH(0x01 || p || r)
      if ((fn & 1) === 0) {                                     // 4.b.ii
        while ((fn & 1) === 0 && fn !== 0) {
          fn = Math.floor(fn / 2);
          sn = Math.floor(sn / 2);
        }
      }
    } else {
      r = nodeHash(r, p);                                       // 4.b.otherwise  HASH(0x01 || r || p)
    }
    fn = Math.floor(fn / 2);                                    // 4.c
    sn = Math.floor(sn / 2);
    x += 1;
  }
  // step 5 (+ strictness: nothing left over, everything consumed)
  if (sn !== 0) return fail(`sn != 0 after walk (${sn}) — path too short for treeSize`);
  if (x !== P.length) return fail('internal: path not fully consumed');
  const ok = r.equals(root.buf);
  return { ok, reason: ok ? undefined : 'computed root != expected rootHash', computedRoot: hex(r), pathConsumed: x };
}

// ----------------------------------------------------- consistency proof (S3)

/**
 * RFC 9162 §2.1.4.2, verbatim algorithm.
 *
 * @param {object} p
 * @param {number} p.size1   earlier tree size (first), 0 < first < second
 * @param {number} p.size2   later tree size (second)
 * @param {Buffer[]|string[]} p.proof  consistency path
 * @param {Buffer|string} p.root1     earlier tree head hash
 * @param {Buffer|string} p.root2     later tree head hash
 * @returns {{ok:boolean, reason?:string}}
 */
export function verifyConsistencyProof({ size1, size2, proof, root1, root2 }) {
  const fail = (reason) => ({ ok: false, reason });
  if (!Number.isInteger(size1) || !Number.isInteger(size2)) return fail('sizes must be integers');
  if (!(0 < size1 && size1 < size2)) return fail(`need 0 < first(${size1}) < second(${size2})`);
  const h1 = asBuf(root1, 'root1'); if (!h1.ok) return fail(h1.reason);
  const h2 = asBuf(root2, 'root2'); if (!h2.ok) return fail(h2.reason);
  const C = [];
  for (const c of proof ?? []) {
    const b = asBuf(c, 'proof element');
    if (!b.ok) return fail(b.reason);
    if (b.buf.length !== 32) return fail(`proof element must be 32 bytes, got ${b.buf.length}`);
    C.push(b.buf);
  }
  if (C.length === 0) return fail('consistency_path is empty'); // step 1

  let path = C;                                                    // step 2
  if (size1 > 0 && (size1 & (size1 - 1)) === 0) path = [h1.buf, ...path]; // first is a power of 2
  let fn = size1 - 1;                                              // step 3
  let sn = size2 - 1;
  while ((fn & 1) === 1) {                                         // step 4
    fn = Math.floor(fn / 2);
    sn = Math.floor(sn / 2);
  }
  let fr = path[0];                                                // step 5
  let sr = path[0];
  let x = 1;
  for (; x < path.length; x++) {                                   // step 6
    const c = path[x];
    if (sn === 0) return fail('sn hit 0 mid-walk (proof too long)');
    if (((fn & 1) === 1) || fn === sn) {                           // 6.b
      fr = nodeHash(c, fr);                                        // 6.b.i
      sr = nodeHash(c, sr);                                        // 6.b.ii
      if ((fn & 1) === 0) {                                        // 6.b.iii
        while ((fn & 1) === 0 && fn !== 0) {
          fn = Math.floor(fn / 2);
          sn = Math.floor(sn / 2);
        }
      }
    } else {
      sr = nodeHash(sr, c);                                        // 6.b.otherwise
    }
    fn = Math.floor(fn / 2);                                       // 6.c
    sn = Math.floor(sn / 2);
  }
  // step 7
  const okFr = fr.equals(h1.buf);
  const okSr = sr.equals(h2.buf);
  const ok = okFr && okSr && sn === 0;
  return { ok, reason: ok ? undefined : `end-state mismatch (fr:${okFr ? 'ok' : 'MISMATCH'} sr:${okSr ? 'ok' : 'MISMATCH'} sn:${sn})` };
}

// ------------------------------------------------- C2SP tlog-checkpoint (S3)

/**
 * Tolerant C2SP tlog-checkpoint parser (https://c2sp.org/tlog-checkpoint):
 *   line 1: origin
 *   line 2: tree size in decimal
 *   line 3: base64 (std, padded) SHA-256 root hash
 *   rest:   signature lines ("— label base64" / "- label base64" / bare base64)
 *           separated from the body by a blank line or directly appended.
 * The signed body is the first three lines, each with a trailing newline.
 *
 * Also accepts rekor's object form {envelope: "..."} by unwrapping it.
 */
export function parseCheckpoint(input) {
  const env = typeof input === 'string' ? input : (input && typeof input.envelope === 'string' ? input.envelope : null);
  if (env === null) return { ok: false, reason: 'checkpoint must be an envelope string or {envelope}' };
  const lines = env.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop(); // tolerate trailing blanks
  if (lines.length < 3) return { ok: false, reason: `checkpoint needs >= 3 lines, got ${lines.length}` };
  const origin = lines[0];
  const sizeLine = lines[1];
  if (!/^\d+$/.test(sizeLine.trim())) return { ok: false, reason: `line 2 is not decimal tree size: "${sizeLine.slice(0, 40)}"` };
  const treeSize = parseInt(sizeLine.trim(), 10);
  let rootBuf;
  try {
    rootBuf = fromB64(lines[2].trim());
  } catch {
    return { ok: false, reason: 'line 3 is not valid base64' };
  }
  if (rootBuf.length !== 32) return { ok: false, reason: `root hash must be 32 bytes, got ${rootBuf.length}` };
  const sigLines = lines.slice(3).filter((l) => l.trim() !== '');
  const signedBody = Buffer.from(lines.slice(0, 3).map((l) => l + '\n').join(''), 'utf8');
  return { ok: true, origin, treeSize, rootHash: rootBuf, rootHashHex: hex(rootBuf), sigLines, signedBody };
}

/**
 * C2SP signed-note verification of a checkpoint line: "— <key name> <b64>"
 * where b64 = 4-byte key hint || signature over the note body
 * (the three body lines each with trailing newline). Rekor's key hint is the
 * first 4 bytes of SHA-256 of the public key DER (per signed-note spec).
 * Returns {ok, reason, hintOK?}.
 */
export function verifyCheckpointSignature(checkpoint, publicKeyPem) {
  const cp = parseCheckpoint(checkpoint);
  if (!cp.ok) return cp;
  const sigLine = cp.sigLines.find((l) => /^(—|-|–)\s/.test(l.trim()));
  if (!sigLine) return { ok: false, reason: 'no "— label base64" signature line in checkpoint' };
  const parts = sigLine.trim().split(/\s+/);
  if (parts.length < 2) return { ok: false, reason: 'malformed signature line' };
  const b64 = parts[parts.length - 1];
  let sigAll;
  try { sigAll = fromB64(b64); } catch { return { ok: false, reason: 'signature is not valid base64' }; }
  if (sigAll.length <= 4) return { ok: false, reason: 'signature too short to carry 4-byte key hint' };
  const hint = sigAll.subarray(0, 4);
  const sig = sigAll.subarray(4);
  let key;
  try { key = createPublicKey(publicKeyPem); } catch (e) { return { ok: false, reason: `bad public key: ${e.message}` }; }
  const der = key.export({ format: 'der', type: 'spki' });
  const wantHint = sha256(der).subarray(0, 4);
  const hintOK = hint.equals(wantHint);
  // 40-a: one-shot verify (ed25519 => null digest; ECDSA/ RSA => sha256)
  let sigOK = false;
  try {
    sigOK = cryptoVerify(key.asymmetricKeyType === 'ed25519' ? null : 'sha256', cp.signedBody, key, sig);
  } catch { sigOK = false; }
  return { ok: sigOK, hintOK, reason: sigOK ? undefined : 'signature does not verify over checkpoint body' };
}

// --------------------------------------------------------- rekor v1 glue

/**
 * Rekor v1: the tree leaf for an entry IS the entry's `body` bytes
 * (base64 of the canonicalized proposed entry). The entry UUID equals
 * SHA-256(body bytes) — checked live and pinned in the KAT receipt.
 * Returns {ok, leafData, uuidClaim}.
 */
export function rekorLeafFromEntry(entry) {
  if (!entry || typeof entry.body !== 'string') return { ok: false, reason: 'entry.body missing' };
  let leafData;
  try { leafData = fromB64(entry.body); } catch (e) { return { ok: false, reason: `body base64: ${e.message}` }; }
  return { ok: true, leafData, uuidClaim: hex(sha256(leafData)) };
}

/**
 * Tolerant proof-hash decoding: rekor versions have served hex strings and
 * base64 strings. A 64-char lowercase hex string is read as hex; anything
 * else is read as base64. Result must be 32 bytes.
 */
export function decodeProofHashes(hashes) {
  if (!Array.isArray(hashes)) return { ok: false, reason: 'hashes must be an array' };
  const out = [];
  for (const h of hashes) {
    if (typeof h !== 'string') return { ok: false, reason: 'hash element is not a string' };
    const buf = /^[0-9a-fA-F]{64}$/.test(h) ? fromHex(h) : fromB64(h);
    if (buf.length !== 32) return { ok: false, reason: `hash element decodes to ${buf.length} bytes, want 32` };
    out.push(buf);
  }
  return { ok: true, bufs: out };
}

/**
 * Extract (leafIndex, treeSize, path, rootHash, checkpoint) from a rekor v1
 * entry's verification.inclusionProof, tolerating shape drift:
 *  - checkpoint as envelope string OR {envelope} object
 *  - treeSize from the checkpoint line preferred over the field (UTA KAT
 *    cross-check note: UTA parses the checkpoint; we take both and compare)
 */
export function rekorInclusionProofFromEntry(entry) {
  const incl = entry?.verification?.inclusionProof;
  if (!incl) return { ok: false, reason: 'entry.verification.inclusionProof missing' };
  const leafRes = rekorLeafFromEntry(entry);
  if (!leafRes.ok) return { ok: false, reason: leafRes.reason };
  const lh = leafHash(leafRes.leafData);
  const cp = parseCheckpoint(incl.checkpoint ?? incl.checkpointEnvelope ?? null);
  const hashes = decodeProofHashes(incl.hashes);
  if (!hashes.ok) return { ok: false, reason: hashes.reason };
  const treeSizeField = Number.isInteger(incl.treeSize) ? incl.treeSize : Number(incl.treeSize);
  return {
    ok: true,
    leafHashBuf: lh,
    leafIndex: typeof incl.logIndex === 'number' ? incl.logIndex : Number(incl.logIndex),
    path: hashes.bufs,
    rootHash: /^[0-9a-fA-F]{64}$/.test(String(incl.rootHash)) ? fromHex(String(incl.rootHash)) : fromB64(String(incl.rootHash)),
    treeSizeField,
    checkpoint: cp,
    uuidClaim: leafRes.uuidClaim,
  };
}

// -------------------------------- RFC 6962 §3.2/§4.3 classic-log STH (40-a)

/**
 * RFC 6962 §3.2 TreeHeadSignature (v1) bytes:
 *   0x00 (version v1) || 0x01 (signature_type = tree_head_signature) ||
 *   u64be(timestamp) || u64be(tree_size) || sha256_root_hash[32]
 * Byte layout pinned against certificate-transparency-go @ f7ce2e30:
 * serialization.go SerializeSTHSignatureInput (tls.Marshal of TreeHeadSignature;
 * uint64 fields are big-endian per ctgo/tls) + types.go TreeHeadSignature struct
 * and TreeHashSignatureType = 1.
 */
export function treeHeadSignatureBlob({ timestamp, treeSize, rootHash }) {
  const root = asBuf(rootHash, 'rootHash');
  if (!root.ok) return { ok: false, reason: root.reason };
  if (root.buf.length !== 32) return { ok: false, reason: `rootHash must be 32 bytes, got ${root.buf.length}` };
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) return { ok: false, reason: 'timestamp must be a non-negative safe integer' };
  if (!Number.isSafeInteger(treeSize) || treeSize < 0) return { ok: false, reason: 'treeSize must be a non-negative safe integer' };
  const b = Buffer.alloc(2 + 8 + 8 + 32);
  b[0] = 0x00; // Version v1
  b[1] = 0x01; // SignatureType tree_head_signature
  b.writeBigUInt64BE(BigInt(timestamp), 2);
  b.writeBigUInt64BE(BigInt(treeSize), 10);
  root.buf.copy(b, 18);
  return { ok: true, blob: b };
}

/**
 * Verify a classic CT log's get-sth response (RFC 6962 §4.3 JSON:
 * {tree_size, timestamp, sha256_root_hash, tree_head_signature}) against the
 * log's public key (PEM, or base64 SPKI DER as served by the v3 log list —
 * see makePublicKey). ECDSA-P256/SHA-256
 * with ASN.1 DER signatures (node dsaEncoding 'der' is the default).
 * rootHash/signature accept base64 (as served) or hex.
 *
 * 40-a, LIVE-CAUGHT: tree_head_signature is a TLS DigitallySigned struct
 * (RFC 5246 §4.7 framing: 2-byte Hash+SignatureAlgorithm — (4,3) = sha256/ecdsa
 * for v1 logs — then 2-byte opaque length, then the DER ECDSA signature), NOT
 * the bare DER signature. The unit roundtrip (A7f) could not catch this
 * because it is framing-agnostic; the first live run failed on all six
 * candidate logs, which isolated the framing as the only remaining difference.
 */
export function verifyTreeHeadSignature({ timestamp, treeSize, rootHash, signature, publicKey }) {
  const blob = treeHeadSignatureBlob({ timestamp, treeSize, rootHash });
  if (!blob.ok) return blob;
  let key;
  try {
    key = makePublicKey(publicKey);
  } catch (e) { return { ok: false, reason: `bad public key: ${e.message}` }; }
  let sig;
  try { sig = asBuf(signature, 'signature'); } catch (e) { return { ok: false, reason: String(e.message ?? e) }; }
  if (!sig.ok) return { ok: false, reason: sig.reason };
  const ds = parseDigitallySigned(sig.buf);
  if (!ds.ok) return { ok: false, reason: ds.reason };
  let ok = false;
  try {
    ok = cryptoVerify('sha256', blob.blob, key, ds.signature);
  } catch { ok = false; }
  return {
    ok,
    algorithm: ds.algorithm,
    reason: ok ? undefined : 'TreeHeadSignature does not verify over 0x00||0x01||ts||size||root',
  };
}

/**
 * 40-a: parse a TLS DigitallySigned blob per RFC 5246 §4.7:
 *   struct { SignatureAndHashAlgorithm algorithm; opaque signature<0..2^16-1> }
 * = 2-byte algorithm (hash, signature) + 2-byte length + signature bytes.
 * Falls back to treating the input as the bare signature when the framing
 * does not parse (tolerant of servers that skip the TLS wrapper); `framed`
 * records which reading was used.
 */
export function parseDigitallySigned(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) {
    return { ok: true, framed: false, algorithm: null, signature: buf };
  }
  const algHash = buf[0];
  const algSig = buf[1];
  const len = buf.readUInt16BE(2);
  if (len === buf.length - 4) {
    return { ok: true, framed: true, algorithm: { hash: algHash, signature: algSig }, signature: buf.subarray(4) };
  }
  return { ok: true, framed: false, algorithm: null, signature: buf };
}

/**
 * Tolerant parser for the RFC 6962 §4.3 get-sth JSON body. Numbers may arrive
 * as numbers or decimal strings; root/signature are base64 (hex tolerated).
 * Returns {ok, treeSize, timestamp, rootHash(buf), rootHashHex, signature(buf)}.
 */
export function parseSTHResponse(json) {
  if (!json || typeof json !== 'object') return { ok: false, reason: 'STH response is not an object' };
  const treeSize = Number(json.tree_size);
  const timestamp = Number(json.timestamp);
  if (!Number.isSafeInteger(treeSize) || treeSize < 0) return { ok: false, reason: `tree_size not a safe non-negative integer: ${json.tree_size}` };
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) return { ok: false, reason: `timestamp not a safe non-negative integer: ${json.timestamp}` };
  const root = asBuf(json.sha256_root_hash, 'sha256_root_hash');
  if (!root.ok) return { ok: false, reason: root.reason };
  if (root.buf.length !== 32) return { ok: false, reason: `sha256_root_hash must be 32 bytes, got ${root.buf.length}` };
  const sig = asBuf(json.tree_head_signature, 'tree_head_signature');
  if (!sig.ok) return { ok: false, reason: sig.reason };
  return { ok: true, treeSize, timestamp, rootHash: root.buf, rootHashHex: hex(root.buf), signature: sig.buf };
}

// ------------------------------------------- UTA KAT-source fold (non-normative)

/**
 * The simpler idx/last fold used by UTA's published verify-rekor.mjs
 * (check #5): parent = N(p, node) if idx===last or idx odd, else N(node, p);
 * one halving per level, no b.ii multi-shift. NON-NORMATIVE — kept ONLY to
 * cross-check the RFC 9162 verbatim walk on live data (KAT source, not truth
 * oracle). Returns {ok, computedRoot, levels} or {ok:false, reason}.
 */
export function foldUTAStyle({ leafHash: lh, treeSize, leafIndex, path, rootHash }) {
  if (leafIndex >= treeSize || leafIndex < 0 || treeSize < 1) return { ok: false, reason: 'index out of bounds' };
  let node = asBuf(lh, 'leafHash').buf;
  let idx = leafIndex;
  let last = treeSize - 1;
  const P = path.map((p) => asBuf(p, 'path element').buf);
  for (const p of P) {
    if (idx === last || idx % 2 === 1) {
      node = nodeHash(p, node);
    } else {
      node = nodeHash(node, p);
    }
    idx = Math.floor(idx / 2);
    last = Math.floor(last / 2);
  }
  const ok = node.equals(asBuf(rootHash, 'rootHash').buf);
  return { ok, computedRoot: hex(node), levels: P.length };
}

// ------------------------------------------------------- signedEntryTimestamp

/**
 * UTA check #4 agreement: rekor's signedEntryTimestamp is ECDSA-P256 over
 * JSON.stringify({body, integratedTime, logID, logIndex}) — Go STRUCT order
 * (body, integratedTime, logID, logIndex), deliberately NOT alphabetical.
 * Returns {ok, reason}.
 */
export function verifySignedEntryTimestamp(entry, rekorPem) {
  const set = entry?.verification?.signedEntryTimestamp;
  if (!set) return { ok: false, reason: 'signedEntryTimestamp missing' };
  const blob = Buffer.from(JSON.stringify({
    body: entry.body,
    integratedTime: entry.integratedTime,
    logID: entry.logID,
    logIndex: entry.logIndex,
  }), 'utf8');
  let key;
  try { key = createPublicKey(rekorPem); } catch (e) { return { ok: false, reason: `bad rekor key: ${e.message}` }; }
  // 40-a: one-shot verify (ed25519 => null digest; ECDSA/ RSA => sha256)
  let ok = false;
  try {
    ok = cryptoVerify(key.asymmetricKeyType === 'ed25519' ? null : 'sha256', blob, key, fromB64(set));
  } catch { ok = false; }
  return { ok, reason: ok ? undefined : 'signedEntryTimestamp does not verify' };
}

// ------------------------------------------------------------------ plumbing

/**
 * 40-a: tolerant public-key loader. Accepts:
 *   - PEM string ("-----BEGIN PUBLIC KEY-----")
 *   - base64 or hex string of SPKI DER (the v3 log list serves base64 SPKI,
 *     not PEM)
 *   - Buffer/Uint8Array of SPKI DER
 */
function makePublicKey(input) {
  if (typeof input === 'string' && input.includes('-----BEGIN')) return createPublicKey(input);
  if (typeof input === 'string' || Buffer.isBuffer(input) || input instanceof Uint8Array) {
    const der = Buffer.isBuffer(input) || input instanceof Uint8Array
      ? Buffer.from(input)
      : /^[0-9a-fA-F]+$/.test(input) && input.length % 2 === 0 && input.length > 72
        ? fromHex(input)
        : fromB64(input);
    return createPublicKey({ key: der, format: 'der', type: 'spki' });
  }
  return createPublicKey(input);
}

function asBuf(v, what) {
  if (Buffer.isBuffer(v)) return { ok: true, buf: v };
  if (v instanceof Uint8Array) return { ok: true, buf: Buffer.from(v) };
  if (typeof v === 'string') {
    const buf = /^[0-9a-fA-F]{64}$/.test(v) ? fromHex(v) : fromB64(v);
    if (buf.length === 0) return { ok: false, reason: `${what}: empty string` };
    return { ok: true, buf };
  }
  return { ok: false, reason: `${what}: cannot coerce to Buffer` };
}

export default {
  sha256, leafHash, nodeHash, emptyTreeRoot,
  refMTH, refInclusionPath, rootFromLeaves,
  verifyInclusionProof, verifyConsistencyProof,
  parseCheckpoint, verifyCheckpointSignature,
  rekorLeafFromEntry, rekorInclusionProofFromEntry, decodeProofHashes,
  foldUTAStyle, verifySignedEntryTimestamp,
  treeHeadSignatureBlob, verifyTreeHeadSignature, parseSTHResponse, parseDigitallySigned,
};
