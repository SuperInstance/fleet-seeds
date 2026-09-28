// oracle.test.mjs — the embassy vc-oracle harness. PRE-REGISTERED GATES,
// written BEFORE the first full run (pricing-first house law). Every claim
// below is answered by a run, not an opinion.
//
// PROVENANCE: embassy/vc-oracle lane (Task 32-a), gift-oracle for
// SuperInstance/jev-quilt issue #42 (their proposal, our receipt).
//
// ── PRE-REGISTERED GATES (registered 2026-09-27, before the run) ──────────
// G1 RFC-VECTORS: all six RFC 8785 testdata pairs (arrays, french,
//    structures, unicode, values, weird) canonicalize byte-exact through
//    jcs.mjs. Floor: 6/6 files with every case matching. Any miss is named
//    with the exact divergent bytes. (An ES6-number formatting bug would
//    surface here — that is what G1 is FOR.)
// G2 STONE-BRIDGE (pre-read PREDICTION, registered before reading the
//    corpus results): stone canonicalJSON and JCS agree byte-for-byte on
//    all 19 well-formed corpus rows; the divergences are EXACTLY
//    (a) non-finite numbers: stone emits null, JCS throws; (b) the legacy
//    fnv1a64-fleet dialect's insertion-order serialization (named probe,
//    not part of the 19); digest agreement == byte-equality count.
//    If the actual run disagrees with this prediction, the RECEIPT wins.
// G3 G17-PORT SELF: 3/3 synthetic G17-shape attestations mint under the
//    port and verify ok (root recompute + chain_head + Ed25519); the
//    tamper control (one flipped reading byte) is REFUSED with a named
//    reason, never silent.
// G4 CROSS-LANG JS→PY: the same 3 JS-minted attestations verified by
//    jev-quilt's REAL Python (verify_attestation at their HEAD) return
//    ok:3/3; the tampered one refused 1/1. Their Python is the oracle for
//    our port — this is the "free test oracle" direction #42 asked for.
// G5 CROSS-LANG PY→JS: 3 attestations minted by their REAL Python
//    (canonical_attestation_bytes + seal_bytes + attestation_root) verify
//    ok under our JS port 3/3. Byte law ported, both directions.
// G6 PINNED VECTOR: their vectors/signed_receipt_vectors.json (zero seed,
//    TEST MATERIAL): pubkey derivation matches, raw-message Ed25519
//    verifies, the receipts-v2 envelope verifies over canonical||chain_head
//    ASCII, and chain_head recompute (fnv1a-64 over bytes of chain_tip)
//    matches — four independent checks on THEIR published bytes.
//
// Non-gates (reported, not gated): stone-vs-JCS digest table, VC envelope
// sign/verify round trip (must be ok — it is a hard assert, not a gate),
// the divergence receipts.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { jcsSerialize } from './jcs.mjs';
import { runBridge } from './stone-bridge.mjs';
import {
  wrapG17Attestation, canonicalEnvelope, digestEnvelope,
  signEnvelope, verifyEnvelopeProof, verifyPinnedForeignVector,
} from './vc-envelope.mjs';
import {
  mintSyntheticAttestation, verifyAttestation, publicKeyHexFromSeed,
} from './g17-port.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_TAG = 'wave32-32a-run1';

// stone import: sibling-repo layout first (dev box), org co-clone second.
const STONE_PATHS = ['../../../quilt-stone/stone.mjs', 'quilt-stone/stone.mjs'];
let stone = null, stoneLoadedFrom = null;
for (const p of STONE_PATHS) {
  try { stone = await import(p); stoneLoadedFrom = p; break; } catch { /* next */ }
}
if (!stone) throw new Error('stone.mjs not found (tried: ' + STONE_PATHS.join(', ') + ')');

const table = [];
const gate = (id, name, pass, observed) => {
  table.push({ id, name, pass, observed });
  return pass;
};

// ── G1: RFC 8785 vectors ──────────────────────────────────────────────────
const FILES = ['arrays', 'french', 'structures', 'unicode', 'values', 'weird'];
const rfcMisses = [];
let rfcCases = 0, rfcOk = 0, rfcFilesOk = 0;
for (const f of FILES) {
  const input = JSON.parse(readFileSync(join(HERE, 'vectors/rfc8785', `${f}.input.json`), 'utf8'));
  // cyberphone format: output file IS the canonical form of the whole input doc
  const wantStr = readFileSync(join(HERE, 'vectors/rfc8785', `${f}.output.json`), 'utf8').trim();
  rfcCases++;
  const got = jcsSerialize(input);
  if (got === wantStr) rfcOk++; else rfcMisses.push({ file: f, got: got.slice(0, 160), want: wantStr.slice(0, 160) });
  const wantObj = JSON.parse(wantStr);
  let fileOk = (got === wantStr);
  if (fileOk) rfcFilesOk++;
}
gate('G1', 'RFC 8785 vectors byte-exact', rfcOk === rfcCases && rfcFilesOk === FILES.length,
  `${rfcOk}/${rfcCases} cases across ${rfcFilesOk}/${FILES.length} files` + (rfcMisses.length ? `; misses: ${JSON.stringify(rfcMisses).slice(0, 400)}` : ''));

function readCanonical(p) {
  // output sidecar files hold the canon string as a JSON string value
  const raw = readFileSync(p, 'utf8').trim();
  try { const v = JSON.parse(raw); return typeof v === 'string' ? v : raw; } catch { return raw; }
}

// ── G2: stone-vs-JCS bridge ───────────────────────────────────────────────
const bridge = runBridge();
const pred = { corpusRows: 19, allByteEqual: true, nonFiniteStone: 'null', nonFiniteJcs: 'throw' };
const actual = {
  corpusRows: bridge.corpusSize,
  allByteEqual: bridge.byteEqualCount === bridge.corpusSize,
  nonFiniteStone: bridge.probeFindings.find((p) => p.id === 'non-finite-NaN')?.stoneOut,
  nonFiniteJcs: bridge.probeFindings.find((p) => p.id === 'non-finite-NaN')?.jcsThrew ? 'throw' : 'other',
};
gate('G2', 'stone-vs-JCS byte-equality matches pre-read prediction',
  actual.corpusRows === pred.corpusRows && actual.allByteEqual === pred.allByteEqual &&
  actual.nonFiniteStone === pred.nonFiniteStone && actual.nonFiniteJcs === pred.nonFiniteJcs,
  `corpus ${bridge.byteEqualCount}/${bridge.corpusSize} byte-equal; NaN: stone=${JSON.stringify(actual.nonFiniteStone)} jcs=${actual.nonFiniteJcs}; digest agree ${bridge.translator.digestAgreeCount}/${bridge.corpusSize}; prediction ${JSON.stringify(pred)}`);

// ── G3: G17 port self-verify + tamper control ─────────────────────────────
const SEED = 'aa'.repeat(32); // TEST MATERIAL seed, ours
const PUBS = { 'oracle.k0': publicKeyHexFromSeed(Buffer.from(SEED, 'hex')) };
const mints = [
  { witnesses: [{ id: 'w0', value: '42', drifting: false }, { id: 'w1', value: '42', drifting: true }], consensus: '42', quorum: 3, earnedFloor: '7/16', signer: 'oracle.k0' },
  { witnesses: [{ id: 'wA', value: 'quorum-holds', drifting: false }, { id: 'wB', value: 'quorum-holds', drifting: false }, { id: 'wC', value: 'drifting-off', drifting: true }], consensus: 'quorum-holds', quorum: 2, earnedFloor: null, signer: 'oracle.k0' },
  { witnesses: [{ id: 'w-ünïcode', value: 'λ→π', drifting: false }], consensus: 'λ→π', quorum: 1, earnedFloor: '1/2', signer: 'oracle.k0' },
];
const attestations = mints.map((m) => mintSyntheticAttestation({ ...m, seedHex: SEED }));
const selfOk = attestations.filter((a) => verifyAttestation(a, PUBS).ok).length;
const tampered = JSON.parse(JSON.stringify(attestations[0]));
tampered.readings[0].value = '43';
const tamperVerdict = verifyAttestation(tampered, PUBS);
gate('G3', 'G17 port self-verify + tamper refused', selfOk === 3 && !tamperVerdict.ok,
  `self ${selfOk}/3; tamper -> ${tamperVerdict.ok ? 'SILENTLY OK (BAD)' : tamperVerdict.reasons.join(',')}`);

// ── G4/G5: cross-language bridges (their real Python) ─────────────────────
let pyOut = { error: 'not-run' };
try {
  const io = { pubkeys: PUBS, attestations: [...attestations, tampered] };
  const pyScript = join(HERE, 'py_bridge.py');
  pyOut = JSON.parse(execFileSync('python3', [pyScript, 'verify', '-'],
    { input: JSON.stringify(io), encoding: 'utf8', timeout: 60000,
      env: { ...process.env, JEVDATA_DIR: '/home/z/my-project/foreign-refs/jev-quilt' } }));
} catch (e) {
  pyOut = { error: String(e.message).slice(0, 300) };
}
const pyVerdicts = pyOut.verdicts ?? [];
const pyGood = pyVerdicts.slice(0, 3);
const jsToPyOk = pyGood.filter((v) => v.ok).length;
const jsToPyTamper = pyVerdicts.length === 4 ? pyVerdicts[3] : null;
gate('G4', 'JS-minted attestations verified by their real Python', jsToPyOk === 3 && jsToPyTamper && !jsToPyTamper.ok,
  pyOut.error ? `ERROR: ${pyOut.error}` : `python ok ${jsToPyOk}/3; tamper -> ${jsToPyTamper ? (jsToPyTamper.ok ? 'SILENTLY OK (BAD)' : jsToPyTamper.reasons.join(',')) : 'n/a'}`);

let pyMint = { error: 'not-run' };
try {
  pyMint = JSON.parse(execFileSync('python3', [join(HERE, 'py_bridge.py'), 'mint', '3'],
    { encoding: 'utf8', timeout: 60000,
      env: { ...process.env, JEVDATA_DIR: '/home/z/my-project/foreign-refs/jev-quilt' } }));
} catch (e) {
  pyMint = { error: String(e.message).slice(0, 300) };
}
const pyMintedOk = (pyMint.attestations ?? []).filter((a) => verifyAttestation(a, pyMint.pubkeys ?? {}).ok).length;
gate('G5', 'Python-minted attestations verified by our JS port', pyMintedOk === 3,
  pyMint.error ? `ERROR: ${pyMint.error}` : `js port ok ${pyMintedOk}/3 over python-minted bytes`);

// ── G6: their pinned vector ───────────────────────────────────────────────
const VEC_PATHS = ['/home/z/my-project/foreign-refs/jev-quilt/vectors/signed_receipt_vectors.json'];
let vec = null;
for (const p of VEC_PATHS) { try { vec = JSON.parse(readFileSync(p, 'utf8')); break; } catch { /* next */ } }
let g6Obs = 'vector file not found';
let g6Pass = false;
if (vec) {
  const r = verifyPinnedForeignVector(vec);
  // chain_head recompute (our fnv1a-64-bytes port against their published tip)
  const { chainHeadHex } = await import('./g17-port.mjs');
  const chOk = chainHeadHex(vec.envelope.chain_tip) === vec.envelope.chain_head;
  g6Pass = r.ed25519PubkeyMatches && r.ed25519Message && r.envelope && chOk;
  g6Obs = `pubkey=${r.ed25519PubkeyMatches} rawMsgSig=${r.ed25519Message} envelopeSig=${r.envelope} chainHeadRecompute=${chOk}`;
}
gate('G6', 'their pinned receipts-v2 vector (four checks)', g6Pass, g6Obs);

// ── VC envelope round trip (hard assert, not a gate) ──────────────────────
const env = wrapG17Attestation(attestations[0], { issuer: 'did:jev:quilt:oracle.k0' });
const proof = signEnvelope(env, Buffer.from(SEED, 'hex'));
const rt = verifyEnvelopeProof({ ...env, ...proof }, Buffer.from(SEED, 'hex'));
if (!rt.ok) throw new Error(`VC envelope round trip FAILED: ${JSON.stringify(rt)}`);

// ── P2: post-hoc corrective gate (registered AFTER run1 — weaker evidence
// class, clearly labeled; the G2 registration miscounted the corpus as 19
// rows when generation produced 20. The SUBSTANCE of G2's prediction held
// (all rows byte-equal, divergence set exactly as named, digests agree).
// Pricing-first law: never rewrite a registered gate; add a new one,
// labeled.) ─────────────────────────────────────────────────────────────
gate('P2', 'post-hoc corrective: substance of G2 prediction',
  bridge.byteEqualCount === bridge.corpusSize &&
  bridge.translator.digestAgreeCount === bridge.corpusSize &&
  bridge.probeFindings.find((p) => p.id === 'non-finite-NaN')?.stoneOut === '{"a":null}' &&
  bridge.probeFindings.find((p) => p.id === 'non-finite-NaN')?.jcsThrew === true,
  `corpus ${bridge.byteEqualCount}/${bridge.corpusSize} byte-equal, digests ${bridge.translator.digestAgreeCount}/${bridge.corpusSize}, NaN seam as named`);

// ── receipt ───────────────────────────────────────────────────────────────
const receipt = {
  run_tag: RUN_TAG,
  registered_gates: 'G1-G6 pre-registered in header BEFORE first full run',
  stone_loaded_from: stoneLoadedFrom,
  gates: table,
  all_pass: table.every((g) => g.pass),
  bridge_report: {
    corpusSize: bridge.corpusSize,
    byteEqualCount: bridge.byteEqualCount,
    divergences: bridge.divergences,
    probeFindings: bridge.probeFindings,
    legacyReceipt: bridge.legacyReceipt,
    digestAgree: `${bridge.translator.digestAgreeCount}/${bridge.corpusSize}`,
  },
  vc_envelope_round_trip: rt,
  env_bytes: canonicalEnvelope(env).toString('hex').slice(0, 64) + '...',
  env_digest_hex: digestEnvelope(env).toString('hex'),
};
writeFileSync(join(HERE, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log('GATE TABLE');
for (const g of table) console.log(` ${g.pass ? 'PASS' : 'FAIL'}  ${g.id}  ${g.name}\n        ${g.observed}`);
console.log(`\nALL_GATES: ${receipt.all_pass ? 'PASS' : 'FAIL'}  -> receipt.json`);
process.exit(receipt.all_pass ? 0 : 1);
