// stone-bridge.mjs — THE STONE's canonicalJSON vs JCS RFC 8785: a conformance
// REPORT, not a contest. Divergences are findings with minimal examples, not
// failures. Zero-dependency ESM (imports THE STONE read-only, unmodified).
//
// PROVENANCE: embassy/vc-oracle lane (Task 32-a), gift-oracle for
// SuperInstance/jev-quilt issue #42.
//
// HOUSES COMPARED:
//   stone-v1 canonicalJSON (download/quilt-stone/stone.mjs, verbatim import):
//     keys deep-sorted, undefined skipped, primitives via JSON.stringify,
//     digested with sha256 over canonicalJSON([prev, row]) in chains.
//   JCS RFC 8785 (./jcs.mjs): keys sorted, ES6 number-to-string explicit,
//     non-finite numbers are a THROW.
//
// PRE-READ PREDICTION (registered in oracle.test.mjs before any run): the
// serialization layers agree byte-for-byte on all well-formed JSON, and the
// divergences are (a) non-finite numbers (stone: "null"; JCS: throw) and
// (b) the fnv1a64-fleet legacy dialect's insertion-order serialization —
// plus the digest-layer difference (sha256-chain framing vs document hash),
// which is a design difference, not a serialization one.

import { canonicalJSON, sha256Hex, fnv1a64 } from '../../../quilt-stone/stone.mjs';
import { jcsSerialize } from './jcs.mjs';

// ---------------------------------------------------------------------------
// corpus: nested objects aimed at the likely seams (numbers at ES6
// boundaries, unicode keys, control chars, containers, deep nesting)
// ---------------------------------------------------------------------------

export function buildCorpus() {
  return [
    { id: 'num-1e21-boundary', doc: { a: 1e21 } },
    { id: 'num-1e-7-boundary', doc: { a: 1e-7 } },
    { id: 'num-1e-6-boundary', doc: { a: 1e-6 } },
    { id: 'num-neg-zero', doc: { a: -0 } },
    { id: 'num-min-double', doc: { a: 5e-324 } },
    { id: 'num-max-double', doc: { a: 1.7976931348623157e+308 } },
    { id: 'num-2pow53-plus1', doc: { a: 9007199254740993 } },
    { id: 'num-2pow53-minus1', doc: { a: 9007199254740991 } },
    { id: 'num-float-dirt', doc: { a: 0.1 + 0.2 } },
    { id: 'num-integer-big-plain', doc: { a: 123456789012345680000 } },
    { id: 'num-mixed-array', doc: { nums: [0, -0, 1.5, 1e21, 1e-7, 333333333.33333329, 2e-3] } },
    { id: 'unicode-keys', doc: { '€': 1, ö: 2, '😂': 3, a: 4, Z: 5 } },
    { id: 'unicode-lone-surrogate', doc: { a: '\ud800' } },
    { id: 'control-chars', doc: { a: '\u000f\n\t"\\' } },
    { id: 'empty-containers', doc: { o: {}, a: [] } },
    { id: 'deep-nesting', doc: { a: { b: { c: { d: [1, { e: null, f: true }] } } } } },
    { id: 'sorted-key-collide', doc: { A: 1, a: 2, 'a\u0301': 3, 'á': 4 } },
    { id: 'bool-null-verbatim', doc: { t: true, f: false, n: null } },
    { id: 'attestation-shaped', doc: { readings: [{ witness: 'w0', value: '42', drifting: false }, { witness: 'w1', value: '42', drifting: true }], consensus: '42', quorum: 3, earned_floor: '7/16', root: 'ab'.repeat(32), signer: 'issuer.k0', signature: 'cd'.repeat(64) } },
    { id: 'vc-envelope-shaped', doc: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiableCredential', 'JevQuiltAttestation'], issuer: 'did:jev:quilt:issuer.k0', issuanceDate: '2026-09-27T00:00:00Z', credentialSubject: { consensus: '42', quorum: 3 } } },
  ];
}

// Known-divergence probes (each documented, never a surprise)
export function buildDivergenceProbes() {
  return [
    { id: 'non-finite-NaN', doc: { a: NaN } },
    { id: 'non-finite-Infinity', doc: { a: Infinity } },
    { id: 'fleet-legacy-insertion-order', doc: { b: 1, a: 2 }, note: 'fnv1a64-fleet dialect: JSON.stringify insertion order (stone fnv1a64(input) default) vs JCS code-unit sort' },
  ];
}

// ---------------------------------------------------------------------------
// the comparison run — returns a structured report
// ---------------------------------------------------------------------------

export function runBridge() {
  const rows = [];
  const divergences = [];
  let agree = 0;
  for (const { id, doc } of buildCorpus()) {
    const stoneBytes = canonicalJSON(doc);
    const jcsBytes = jcsSerialize(doc);
    const equal = stoneBytes === jcsBytes;
    if (equal) agree++;
    else divergences.push({ id, stoneBytes, jcsBytes });
    rows.push({
      id, equal,
      stoneSha256: sha256Hex(stoneBytes), // translator check: same document bytes
      jcsSha256: sha256Hex(jcsBytes),     //   => same digest under either house
    });
  }

  const probeFindings = [];
  for (const p of buildDivergenceProbes()) {
    let stoneOut, jcsOut, stoneThrew = false, jcsThrew = false;
    try { stoneOut = canonicalJSON(p.doc); } catch { stoneThrew = true; }
    try { jcsOut = jcsSerialize(p.doc); } catch (e) { jcsThrew = true; jcsOut = `THROW: ${e.message}`; }
    probeFindings.push({ id: p.id, note: p.note ?? null, stoneThrew, stoneOut: stoneThrew ? null : stoneOut, jcsThrew, jcsOut });
  }

  // fleet-legacy dialect receipt: fnv1a64(JSON.stringify(insertion-order))
  // is the historical hash law — shown, not judged:
  const legacy = { b: 1, a: 2 };
  const legacyReceipt = {
    fleetInsertionOrderJson: JSON.stringify(legacy),
    fleetFnv1a64OfIt: fnv1a64(legacy),
    stoneSortedCanon: canonicalJSON(legacy),
    stoneSha256OfCanon: sha256Hex(canonicalJSON(legacy)),
    jcsCanon: jcsSerialize(legacy),
  };

  return {
    corpusSize: rows.length,
    byteEqualCount: agree,
    divergences,
    probeFindings,
    legacyReceipt,
    translator: {
      law: 'sha256(stoneCanonical(x)) === sha256(jcs(x)) for every corpus row where the serializations are byte-equal (verified below)',
      digestAgreeCount: rows.filter((r) => r.stoneSha256 === r.jcsSha256).length,
    },
    rows,
  };
}

// stone-canonicalize(JCS-canonicalize(x)): the identity translator. Parses a
// JCS string back to a value and re-canonicalizes it under the stone. For
// byte-equal serializations this is the identity on strings; for non-finite
// numbers the JCS throw IS the documented difference (refuse, don't guess).
export function stoneCanonicalizeOfJcs(jcsString) {
  return canonicalJSON(JSON.parse(jcsString));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runBridge();
  console.log(JSON.stringify(report, null, 2));
}
