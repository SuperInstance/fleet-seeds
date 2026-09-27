// rfc9162.mjs — 43-c tool-builder's OWN BigInt inclusion-proof fold, per
// RFC 9162 §2.1.3.2 (Merkle Inclusion Proofs), plus the §2.1.3.1 tree-hash
// (MTH) and §2.1.2 PATH builders used by the self-tests as independent
// cross-checks.
//
// WHY OWN: wave 42-a found rekor's own fold variant mis-classifies a VALID
// RFC 9162 index-pair state as an error — the state (lo even, lo != hi,
// hi odd → LEFT fold; rekor's report: "unexpected tree state lo=1428629870").
// This implementation follows the RFC text verbatim:
//
//   1. compare leaf_index against tree_size (fail if out of range);
//   2. set fn = leaf_index, sn = tree_size - 1;
//   3. set r = hash (the leaf hash);
//   4. for each p in the inclusion path:
//        if LSB(fn) is set OR fn == sn:
//            r = H(0x01 || p || r)                      (RIGHT fold)
//            if LSB(fn) is not set: right-shift fn and sn equally until
//            LSB(fn) is set or fn == 0
//        else:
//            r = H(0x01 || r || p)                      (LEFT fold)
//        finally right-shift both fn and sn once;
//   5. after the path, fn == 0 and sn == 0 or the proof is INVALID.
//
// The lo == depth-1-index case (42-a's mis-classified state) is just the
// plain LEFT-fold branch here — no special case, no "unexpected tree state".
//
// Zero dependencies, node:crypto only. Keys: none.

import { createHash } from 'node:crypto';

const H = (prefix, left, right) =>
  createHash('sha256').update(Buffer.concat([Buffer.from([prefix]), left, right])).digest();

// RFC 9162 §2.1.3.2 — fold an inclusion proof to the root.
// Returns { ok, root, consumed, finalFn, finalSn, why }.
export function foldInclusionPath(leafHash, leafIndex, treeSize, path) {
  const L = Buffer.from(leafHash);
  if (!Number.isInteger(leafIndex) || !Number.isInteger(treeSize)) {
    return { ok: false, root: null, consumed: 0, finalFn: null, finalSn: null, why: 'leaf_index/tree_size must be integers' };
  }
  if (leafIndex < 0 || treeSize < 1 || leafIndex >= treeSize) {
    return { ok: false, root: null, consumed: 0, finalFn: leafIndex, finalSn: treeSize - 1, why: `leaf_index ${leafIndex} out of range for tree_size ${treeSize}` };
  }
  let fn = BigInt(leafIndex);
  let sn = BigInt(treeSize) - 1n;
  let r = L;
  let consumed = 0;
  for (const p of path) {
    // path entries arrive as lowercase hex strings (rekor API) or Buffers
    // (tests); a UTF-8 decode of a hex string here would silently poison the
    // fold, so non-Buffer entries are STRICTLY hex-decoded.
    const pb = Buffer.isBuffer(p) ? p : Buffer.from(String(p), 'hex');
    if (pb.length !== 32) {
      return { ok: false, root: null, consumed, finalFn: fn.toString(), finalSn: sn.toString(), why: `path hash ${consumed} is not 32 bytes after hex decode` };
    }
    if ((fn & 1n) === 1n || fn === sn) {
      r = H(1, pb, r); // RIGHT fold
      if ((fn & 1n) === 0n) {
        // LSB(fn) not set (came here because fn == sn): shift both until
        // LSB(fn) is set or fn == 0
        while (fn !== 0n && (fn & 1n) === 0n) { fn >>= 1n; sn >>= 1n; }
      }
    } else {
      r = H(1, r, pb); // LEFT fold — includes the (lo even, lo != hi, hi odd)
                       // state class rekor's variant mis-classified (42-a)
    }
    fn >>= 1n; sn >>= 1n;
    consumed++;
  }
  const ok = fn === 0n && sn === 0n;
  return {
    ok,
    root: ok ? r.toString('hex') : null,
    consumed,
    finalFn: fn.toString(),
    finalSn: sn.toString(),
    why: ok ? null : `residual index state after path: fn=${fn} sn=${sn} (expected 0/0)`,
  };
}

// RFC 9162 §2.1.3.1 — Merkle Tree Hash of an ordered leaf list.
export function mth(leaves) {
  const n = leaves.length;
  if (n === 0) return createHash('sha256').update(Buffer.alloc(0)).digest();
  if (n === 1) return Buffer.from(leaves[0]);
  const k = 2 ** Math.floor(Math.log2(n - 1)); // largest power of two STRICTLY < n
  return H(1, mth(leaves.slice(0, k)), mth(leaves.slice(k)));
}

// RFC 9162 §2.1.2 — PATH(m, d[n]) for the self-tests' independent cross-check.
export function pathFor(leafIndex, leaves) {
  const rec = (m, ls) => {
    const n = ls.length;
    if (n === 1) return [];
    const k = 2 ** Math.floor(Math.log2(n - 1));
    if (m < k) return rec(m, ls.slice(0, k)).concat([mth(ls.slice(k))]);
    return rec(m - k, ls.slice(k)).concat([mth(ls.slice(0, k))]);
  };
  return rec(leafIndex, leaves);
}

// Rekor-style leaf hash: SHA-256(0x00 || leafBytes).
export const leafHash = (leafBytes) =>
  createHash('sha256').update(Buffer.concat([Buffer.from([0]), Buffer.from(leafBytes)])).digest();
