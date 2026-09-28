// verify-fleet.test.mjs — lane 43-c self-tests for the fleet cross-verifier.
//
// node:test, zero dependencies, NO network (CI-safe): all negative controls
// and KATs run against tools/fixtures/ + lib-level vectors. The LIVE pinned
// fetches are exercised by `node tools/verify-fleet.mjs` (receipted in the
// lane's worklog + commit), never by CI.
//
// KAT policy (fail-closed, honest):
//   * RFC 9162 fold KAT 1 — a 7-leaf tree, leaf index 4: after one fold step
//     the index pair is (lo=2, hi=3) — lo even, lo != hi, hi odd → the LEFT
//     fold state rekor's own variant mis-classified as "unexpected tree
//     state" (wave 42-a). Root + path pinned as literals; root also
//     cross-checked against an independent §2.1.3.1 MTH.
//   * RFC 9162 fold KAT 2 — the REAL rekor ECDSA entry (tools/fixtures/):
//     leaf folds 26/26 to the sealed root d9e80d6d… (42-a receipt).
//   * exhaustive small-tree cross-check: for every tree size 1..12 and EVERY
//     leaf index, the fold reproduces the MTH root — this covers every
//     index-pair state class, including all depth-1 cases.
//   * stone-v1 KAT — a hand-built 3-row chain (header + body + stone.sign
//     annotation) with pinned row_hash literals; annotation must NOT advance
//     the tip.
//   * VC §B.3 KAT 8/8 — the spec's own vector, fail-closed gate.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJSON, verifyStoneChain, verifyStoneJsonl, rowHash, isAnnotation } from './lib/stone-v1.mjs';
import { foldInclusionPath, mth, pathFor, leafHash } from './lib/rfc9162.mjs';
import { runKATB3, verifyProofA, verifyProofB, tamperControls } from './lib/vc-eddsa.mjs';
import { PINS, verifyFleet, verifyStoneChainPinned, verifyRekorEcdsa, parseCheckpointNote, humanTable } from './verify-fleet.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..'); // fleet-seeds checkout containing this tools/
const sha256Hex = (b) => createHash('sha256').update(b).digest('hex');

// ═════════════════════ stone-v1 ═════════════════════
describe('stone-v1 chain verifier (own implementation)', () => {
  // hand-built KAT chain, hashes pinned as literals (computed once, reviewed)
  const KAT_ROWS = [
    { kind: 'stone.header', alg: 'stone-v1', genesis: 'STONE-GENESIS-1', repo: 'kat', note: 'b', row_hash: 'c175e7295dafbfa26600414f2ab8db5da906441c755535b6225be955ab88bbec' },
    { kind: 'kat.row', n: 1, payload: { z: 1, a: [2, 1] }, row_hash: '340010d13c3475b3d856aafca13eb7b845af98008f07f3995bda1c824912d673' },
    { kind: 'stone.sign', alg: 'ed25519', sig: 'Z0', tip: 'TIP', row_hash: 'cb2dfce38b54d5d6899a59f9537c1d97858927ab8058a6d92631942618245129' },
  ];

  test('KAT: hand-built chain verifies; tip = body tip; annotation does not advance it', () => {
    const v = verifyStoneChain(structuredClone(KAT_ROWS));
    assert.equal(v.ok, true, v.why);
    assert.equal(v.links, 3);
    assert.equal(v.tip, '340010d13c3475b3d856aafca13eb7b845af98008f07f3995bda1c824912d673');
    assert.equal(isAnnotation(KAT_ROWS[2]), true);
  });

  test('KAT: annotation self-hash breaks when the annotation is edited (tamper-evident)', () => {
    const rows = structuredClone(KAT_ROWS);
    rows[2].sig = 'Z1';
    const v = verifyStoneChain(rows);
    assert.equal(v.ok, false);
    assert.equal(v.firstBadIndex, 2);
    assert.equal(v.why, 'annotation hash mismatch');
  });

  test('negative control: one flipped byte in a body row -> hash mismatch at the exact row', () => {
    const rows = structuredClone(KAT_ROWS);
    rows[1].n = 2; // tamper
    const v = verifyStoneChain(rows);
    assert.equal(v.ok, false);
    assert.equal(v.firstBadIndex, 1);
    assert.equal(v.why, 'hash mismatch');
    assert.equal(v.tip, KAT_ROWS[0].row_hash); // last GOOD hash before the break
  });

  test('canonicalJSON: recursive key sort, undefined skipped, scalars via JSON semantics', () => {
    assert.equal(canonicalJSON({ b: 1, a: { d: 2, c: undefined } }), '{"a":{"d":2},"b":1}');
    assert.equal(canonicalJSON([3, null, 'x"y']), '[3,null,"x\\"y"]');
    assert.equal(canonicalJSON(undefined), 'null');
  });

  test('rowHash matches the KAT literals (canonicalJSON([prev, row-without-row_hash]))', () => {
    const { row_hash, ...r0 } = KAT_ROWS[0];
    assert.equal(rowHash(r0, 'STONE-GENESIS-1'), row_hash);
    const { row_hash: rh1, ...r1 } = KAT_ROWS[1];
    assert.equal(rowHash(r1, KAT_ROWS[0].row_hash), rh1);
  });

  test('fixture (offline): qthe E-Q6 chain @ 905bb2f5 -> ok, 15 links, tip ab4ea196…', () => {
    const text = readFixture(PINS.qtheEq6.fixture);
    const v = verifyStoneJsonl(text);
    assert.equal(v.ok, true, v.why);
    assert.equal(v.links, PINS.qtheEq6.expectLinks);
    assert.equal(v.tip, PINS.qtheEq6.expectTip);
  });

  test('fixture (offline): pong birth-seal @ 1da41be -> ok, 5 links, tip c155fd01…', () => {
    const v = verifyStoneChain(JSON.parse(readFixture(PINS.pongBirthSeal.fixture)));
    assert.equal(v.ok, true, v.why);
    assert.equal(v.links, PINS.pongBirthSeal.expectLinks);
    assert.equal(v.tip, PINS.pongBirthSeal.expectTip);
  });
});

// ═════════════════════ RFC 9162 fold ═════════════════════
describe('RFC 9162 §2.1.3.2 fold (own BigInt implementation)', () => {
  // 7-leaf tree, deterministic leaves = SHA-256("leaf-i"); values computed and
  // pinned once. Leaf index 4 hits the rekor-mis-classified state class.
  const LEAVES7 = [
    'd2dbf006f96dd05044a8f63d8f118f23925ba4cc5750f8b6c8e287fd506c8188',
    '4140bf0e8569ed03ec838871ff2f190e9b3ea86bc083d7e9901049f75f00e855',
    '649837ddcb7e1967086d7d35aaef7b975c513815d96fc6e70015e93a2bfe0f9a',
    '9fde56c376760bd399b82eb8569229a2dff19219411ac71154dfeab2cf502454',
    '697f943b9ec5f90eddda8ae7473f5eb688187e3467f312fefa8677dde255042c',
    'fb1ec199d052a3ce6d141a28c2d706a51b99f09c2a8d61243062a046f06b68f1',
    'add4b896cb06bf0d24fd68948f1e9f7e0084b19f7b37f3fbc0f4b5d0d58ae277',
  ].map((h) => Buffer.from(h, 'hex'));
  const ROOT7 = '47249849653ade6eb70d84bfa744130e8ae6915a588a9488b95f67b7247756e3';
  const PATH4 = [
    'fb1ec199d052a3ce6d141a28c2d706a51b99f09c2a8d61243062a046f06b68f1',
    'add4b896cb06bf0d24fd68948f1e9f7e0084b19f7b37f3fbc0f4b5d0d58ae277',
    '1313c93ce2269a6e22eeb1bf7e902daa94b13c138c33a1eee66a248cf566e0be',
  ].map((h) => Buffer.from(h, 'hex'));

  test('KAT fold 1: 7-leaf tree, leaf 4 — the (lo even, lo != hi, hi odd) LEFT-fold state folds to the pinned root', () => {
    const v = foldInclusionPath(LEAVES7[4], 4, 7, PATH4);
    assert.equal(v.ok, true, v.why);
    assert.equal(v.consumed, 3);
    assert.equal(v.finalFn, '0');
    assert.equal(v.finalSn, '0');
    assert.equal(v.root, ROOT7);
    // independent cross-check: §2.1.3.1 MTH of the same leaves
    assert.equal(mth(LEAVES7).toString('hex'), ROOT7);
  });

  test('KAT fold 2: the REAL rekor ECDSA entry folds 26/26 to the sealed root d9e80d6d…', () => {
    const outer = JSON.parse(readFixture(PINS.rekorEcdsa.fixture));
    const e = outer[PINS.rekorEcdsa.uuid];
    const ip = e.verification.inclusionProof;
    const body = Buffer.from(e.body, 'base64');
    const v = foldInclusionPath(leafHash(body), ip.logIndex, ip.treeSize, ip.hashes);
    assert.equal(v.ok, true, v.why);
    assert.equal(v.consumed, 26);
    assert.equal(v.root, PINS.rekorEcdsa.expectRoot);
    assert.equal(v.root, ip.rootHash);
    const cp = parseCheckpointNote(ip.checkpoint);
    assert.equal(cp.root, v.root);
    assert.equal(cp.treeSize, ip.treeSize);
  });

  test('exhaustive small trees 1..12, EVERY leaf index: fold == MTH root (covers all index-pair states incl. depth-1 cases)', () => {
    for (let size = 1; size <= 12; size++) {
      const leaves = Array.from({ length: size }, (_, i) =>
        createHash('sha256').update(`exh-${size}-${i}`).digest());
      const root = mth(leaves).toString('hex');
      for (let idx = 0; idx < size; idx++) {
        const path = pathFor(idx, leaves);
        const v = foldInclusionPath(leaves[idx], idx, size, path);
        assert.equal(v.ok, true, `size=${size} idx=${idx}: ${v.why}`);
        assert.equal(v.root, root, `size=${size} idx=${idx}: root mismatch`);
        assert.equal(v.consumed, path.length);
      }
    }
  });

  test('negative control: one flipped byte in a path hash -> fold completes to a WRONG root (tamper caught at root comparison, not by the fold)', () => {
    const bad = Buffer.from(PATH4[0]);
    bad[0] ^= 0x01;
    const v = foldInclusionPath(LEAVES7[4], 4, 7, [bad, PATH4[1], PATH4[2]]);
    assert.equal(v.ok, true); // the fold is index-driven; it cannot know a sibling was swapped
    assert.notEqual(v.root, ROOT7);
    assert.equal(v.consumed, 3);
    // the ACTUAL detection is the root comparison the tool performs:
    assert.notEqual(v.root, PINS.rekorEcdsa.expectRoot);
  });

  test('negative control: a path entry that is not 32 bytes after hex decode -> fold refuses', () => {
    const v = foldInclusionPath(LEAVES7[4], 4, 7, ['zznot-hex', PATH4[1], PATH4[2]]);
    assert.equal(v.ok, false);
    assert.match(v.why, /not 32 bytes/);
  });

  test('negative control: leaf_index out of range -> rejected before any hashing', () => {
    const v = foldInclusionPath(LEAVES7[0], 7, 7, []);
    assert.equal(v.ok, false);
    assert.match(v.why, /out of range/);
  });

  test('parseCheckpointNote: tree size + base64 root parse from the real note', () => {
    const cp = parseCheckpointNote('rekor.sigstore.dev - 1193050959916656506\n2857595469\n2egNbaAnehJd4Dy/oG5wSU1aCXtBJE+DSkAsKIWQKyw=\n');
    assert.equal(cp.treeSize, 2857595469);
    assert.equal(cp.root, PINS.rekorEcdsa.expectRoot);
  });
});

// ═════════════════════ VC envelope (both readers) ═════════════════════
describe('VC envelope: spec-KAT gate + both readers + tamper controls', () => {
  const loadVc = () => JSON.parse(readFileSync(join(REPO, PINS.vcEnvelope.path), 'utf8'));
  const loadKey = () => JSON.parse(readFileSync(join(REPO, PINS.vcEnvelope.keyPath), 'utf8'));

  test('§B.3 KAT 8/8 (fail-closed gate)', () => {
    const kat = runKATB3();
    assert.equal(kat.ok, true);
    assert.equal(kat.passed, 8);
    assert.equal(kat.total, 8);
  });

  test('Reader B (spec text, did:key self-derived) VERIFIES our stone-checkpoint VC', () => {
    const v = verifyProofB(loadVc());
    assert.equal(v.verified, true, v.why);
  });

  test('Reader A (committed key + binding) VERIFIES our stone-checkpoint VC', () => {
    const v = verifyProofA(loadVc(), loadKey());
    assert.equal(v.verified, true);
    assert.equal(v.bindingOk, true);
    assert.equal(v.sigOk, true);
  });

  test('artifact sha == pinned 94aa82cd… (the anchored digest rekor holds)', () => {
    const artifactSha = sha256Hex(readFileSync(join(REPO, PINS.vcEnvelope.path)));
    assert.equal(artifactSha, PINS.vcEnvelope.expectArtifactSha256);
    assert.equal(artifactSha, PINS.rekorEcdsa.expectArtifactSha256);
  });

  test('tamper controls: subject byte flip, signature byte flip, context replace REJECTED; context append accepted per §3.3.2', () => {
    const c = tamperControls(loadVc());
    assert.equal(c.controlsOk, true);
    assert.equal(c.controls.subjectTamper.got, false);
    assert.equal(c.controls.signatureTamper.got, false);
    assert.equal(c.controls.contextReplace.got, false);
    assert.equal(c.specSemanticsReceipts.contextAppend.got, true);
  });
});

// ═════════════════════ integration (offline, no network) ═════════════════════
describe('verify-fleet offline integration + integration-level negative controls', () => {
  test('offline run: all four chains ok; rekor log-key check receipted skip', async () => {
    const verdict = await verifyFleet({ mode: 'offline', repo: REPO });
    assert.equal(verdict.allOk, true, JSON.stringify(verdict.chains, null, 2));
    assert.match(verdict.verifier, /^verify-fleet\.mjs@[0-9a-f]{40}$/);
    assert.equal(verdict.chains.qthe_eq6.fetchReceipt.mode, 'offline-fixture');
    assert.equal(verdict.chains.pong_birth_seal.fetchReceipt.mode, 'offline-fixture');
    assert.equal(verdict.chains.vc_envelope.ok, true);
    assert.equal(verdict.chains.vc_envelope.kat.passed, 8);
    assert.equal(verdict.chains.rekor_ecdsa.links, 26);
    assert.equal(verdict.chains.rekor_ecdsa.logKey.mode, 'skip');
    // offline fixture = the SEALED 42-a tree-head moment: exact replay of the pinned root
    assert.equal(verdict.chains.rekor_ecdsa.inclusionProof.rootMatchesPinned, true);
    assert.equal(verdict.chains.rekor_ecdsa.inclusionProof.sealedRootCheck, true);
    assert.equal(verdict.chains.rekor_ecdsa.inclusionProof.logAdvanced, false);
    assert.equal(verdict.chains.rekor_ecdsa.inclusionProof.leafIndexMatches, true);
    // machine-readable shape: every chain carries {ok, links, tip, verifier}
    for (const c of Object.values(verdict.chains)) {
      for (const k of ['ok', 'links', 'tip', 'verifier']) assert.ok(k in c, `missing ${k}`);
      assert.equal(c.verifier, verdict.verifier);
    }
    assert.ok(humanTable(verdict).includes('qthe E-Q6'));
  });

  test('negative control: tamper one byte of the qthe chain fixture -> chain FAILS at that row', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vf-tamper-'));
    try {
      const text = readFixture(PINS.qtheEq6.fixture);
      const lines = text.split('\n');
      const row = JSON.parse(lines[3]);
      const k = Object.keys(row).find((x) => x !== 'row_hash' && typeof row[x] === 'string');
      row[k] = row[k][0] === 'z' ? 'Z' + row[k].slice(1) : 'z' + row[k].slice(1); // one byte
      lines[3] = JSON.stringify(row);
      const tampered = lines.join('\n');
      writeFileSync(join(tmp, PINS.qtheEq6.fixture), tampered);
      const pin = { ...PINS.qtheEq6, fixtureSha256: sha256Hex(Buffer.from(tampered)) }; // pin updated so the sha gate passes and the CHAIN verify is what fails
      const v = await verifyStoneChainPinned(pin, { mode: 'offline', repo: REPO, fixturesDir: tmp, verifier: 'test' });
      assert.equal(v.ok, false);
      assert.equal(v.why, 'hash mismatch');
      assert.equal(v.firstBadIndex, 3);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  });

  test('negative control: tamper a rekor path hash -> fold root mismatch -> chain FAILS', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vf-tamper-'));
    try {
      const outer = JSON.parse(readFixture(PINS.rekorEcdsa.fixture));
      const e = outer[PINS.rekorEcdsa.uuid];
      e.verification.inclusionProof.hashes[0] = '00' + e.verification.inclusionProof.hashes[0].slice(2);
      const tampered = JSON.stringify(outer, null, 1);
      writeFileSync(join(tmp, PINS.rekorEcdsa.fixture), tampered);
      const pin = { ...PINS.rekorEcdsa, fixtureSha256: sha256Hex(Buffer.from(tampered)) }; // sha gate updated so the FOLD is what must catch the tamper
      const v = await verifyRekorEcdsa({ mode: 'offline', repo: REPO, fixturesDir: tmp, verifier: 'test' }, pin);
      assert.equal(v.ok, false);
      assert.match(v.why, /pinned-head comparison failed|inclusion fold/);
      assert.equal(v.inclusionProof.rootMatchesStated, false);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  });

  test('negative control: WRONG expected tip -> chain FAILS with tipOk=false', async () => {
    const pin = { ...PINS.qtheEq6, expectTip: 'f'.repeat(64) };
    const v = await verifyStoneChainPinned(pin, { mode: 'offline', repo: REPO, verifier: 'test' });
    assert.equal(v.ok, false);
    assert.equal(v.tipOk, false);
    assert.equal(v.linksOk, true);
  });

  test('negative control: fixture byte-moved off its pinned sha -> FAILS CLOSED at the gate', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vf-tamper-'));
    try {
      writeFileSync(join(tmp, PINS.qtheEq6.fixture), readFixture(PINS.qtheEq6.fixture) + '\n'); // one extra byte
      const v = await verifyStoneChainPinned(PINS.qtheEq6, { mode: 'offline', repo: REPO, fixturesDir: tmp, verifier: 'test' });
      assert.equal(v.ok, false);
      assert.match(v.why, /fixture sha mismatch/);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  });
});

// shared fixture reader with a pinned-sha sanity check
import { readFileSync } from 'node:fs';
function readFixture(name) {
  const map = {
    [PINS.qtheEq6.fixture]: PINS.qtheEq6.fixtureSha256,
    [PINS.pongBirthSeal.fixture]: PINS.pongBirthSeal.fixtureSha256,
    [PINS.rekorEcdsa.fixture]: PINS.rekorEcdsa.fixtureSha256,
  };
  const buf = readFileSync(join(HERE, 'fixtures', name));
  assert.equal(sha256Hex(buf), map[name], `fixture ${name} moved off its pinned sha`);
  return buf.toString('utf8');
}
