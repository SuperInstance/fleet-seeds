#!/usr/bin/env node
// ct-kat.mjs — KAT harness + live CT verification for ct-reader.mjs (lane 40-a).
//
// Adopted from the dead lane 39-a's 39a-kat.mjs plan, rewritten honest:
//   - 39-a's harness never ran (context death), its /tmp fixtures are gone,
//     and it pinned a UTA script by sha WITHOUT the fixture provenance — so
//     40-a rebuilt the harness so every vector source is fetched at a PINNED
//     git SHA and hash-checked before use. Nothing is trusted on faith.
//
// Blocks (all fail-closed; any FAIL => exit non-zero, receipt ships anyway):
//   A. SPEC — canonical RFC 6962 vectors, fetched from raw.githubusercontent.com
//      at pinned commits, sha256-checked, then:
//        A1 provenance      (pinned files + hashes)
//        A2 tree_hasher_test.cc KATs (leaf/node hashes, collision laws)
//        A3 rfc6962_test.go KATs (the hasher ctgo depends on, transparency-dev/merkle)
//        A4 merkle_tree_test.cc kSHA256Roots (incremental MTH of kInputs)
//        A5 merkle_tree_test.cc kSHA256Paths (inclusion proofs + ported NEGATIVE
//           verifier tests: wrong index/size/leaf/root, tampered/garbled paths)
//        A6 merkle_tree_test.cc kSHA256Proofs (consistency proofs)
//        A7 exhaustive cross-check vs independent reference tree (n=1..40, all m)
//           + tamper controls + checkpoint parser tests + ed25519/ECDSA crypto
//           roundtrips for the checkpoint/STH signature paths (locally keyed,
//           in-memory keys only)
//   B. LIVE — a classic RFC 6962 log picked from the Google v3 log list:
//        get-sth -> parse + ECDSA TreeHeadSignature verify with the list's key;
//        get-entries near tip -> leaf hash; get-proof-by-hash -> inclusion
//        proof verify against the STH root; consistency proof if the tree grew.
//
// Receipt: ./kat-results.json (raw rows, no secrets).

import { writeFileSync, readFileSync } from 'node:fs';
import { createHash, generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import * as R from './ct-reader.mjs';

const sha256hex = (b) => createHash('sha256').update(b).digest('hex');

// ------------------------------------------------------------- pinned sources
const VECTORS = {
  merkleTreeTest: {
    url: 'https://raw.githubusercontent.com/google/certificate-transparency/0fe5116f42890853e9fcf5120f1f5129d64f64ea/cpp/merkletree/merkle_tree_test.cc',
    sha256: '2a49413fc09b5b325c1acc5d9574c6d4ec8c45b399bb415de07b1132dac0d91a',
    label: 'google/certificate-transparency @ 0fe5116f cpp/merkletree/merkle_tree_test.cc',
  },
  treeHasherTest: {
    url: 'https://raw.githubusercontent.com/google/certificate-transparency/0fe5116f42890853e9fcf5120f1f5129d64f64ea/cpp/merkletree/tree_hasher_test.cc',
    sha256: 'b12e2aba20e36e4cda26bfb447ba864996a2ee9c273687dbae0e77bd0e241f5e',
    label: 'google/certificate-transparency @ 0fe5116f cpp/merkletree/tree_hasher_test.cc',
  },
  rfc6962Go: {
    url: 'https://raw.githubusercontent.com/transparency-dev/merkle/fbbcd741c3d1c69d8498487baa8edc9e5824847c/rfc6962/rfc6962_test.go',
    sha256: '6237bd8f8131c49832575d4ce03395a62f98a6555080783b7ca5d1fb06a83678',
    label: 'transparency-dev/merkle @ fbbcd741 rfc6962/rfc6962_test.go',
  },
};

const LOG_LIST_URL = 'https://www.gstatic.com/ct/log_list/v3/log_list.json';

// ---------------------------------------------------------------- harness
const rows = [];
const kat = (block, name, ok, detail) => {
  rows.push({ block, name, ok: !!ok, detail: String(detail ?? '') });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${block}] ${name}${detail ? ' — ' + detail : ''}`);
  return !!ok;
};
const GET = async (url, accept = 'application/json') => {
  const res = await fetch(url, { headers: { Accept: accept } });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
};

// ============================== A. SPEC ====================================

// A1 — provenance: fetch each pinned source, sha256-check BEFORE parsing.
const vecFiles = {};
for (const [key, v] of Object.entries(VECTORS)) {
  let ok = false, detail = 'not fetched';
  try {
    const res = await fetch(v.url);
    const body = Buffer.from(await res.arrayBuffer());
    const got = sha256hex(body);
    ok = res.status === 200 && got === v.sha256;
    detail = `http ${res.status} sha256 ${got.slice(0, 16)}…`;
    if (ok) vecFiles[key] = body.toString('utf8');
  } catch (e) { detail = `fetch error: ${e.message}`; }
  kat('A1', `pinned vector source: ${v.label}`, ok, detail);
}
if (!vecFiles.merkleTreeTest || !vecFiles.treeHasherTest || !vecFiles.rfc6962Go) {
  writeReceiptAndExit('FAIL-CLOSED: pinned vector sources unavailable — nothing verified');
}

// Vector tables lifted verbatim from the pinned files (values below were read
// out of the fetched bytes; the sha256 checks in A1 bind them to the cites).
const V = {
  emptyTree: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  // tree_hasher_test.cc sha256_leaves[] (input hex, output)
  leaves: [
    { in: '', out: '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d' },
    { in: '00', out: '96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7' },
    { in: '101112131415161718191a1b1c1d1e1f', out: '3bfb960453ebaebf33727da7a1f4db38acc051d381b6da20d6d4e88f0eabfd7a' },
  ],
  // tree_hasher_test.cc sha256_nodes[] (left, right, output)
  nodes: [
    { l: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', r: '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f', out: '1a378704c17da31e2d05b6d121c2bb2c7d76f6ee6fa8f983e596c2d034963c57' },
  ],
  // rfc6962_test.go vectors (transparency-dev/merkle)
  goLeaf: { in: 'L123456', out: '395aa064aa4c29f7010acfe3f25db9485bbd4b91897b6ad7ad547639252b4d56' },
  goNode: { l: 'N123', r: 'N456', out: 'aa217fe888e47007fa15edab33c2b492a722cb106c64667fc2b044444de66bbb' },
  // merkle_tree_test.cc kInputs[8] (hex strings)
  inputs: ['', '00', '10', '2021', '3031', '40414243', '5051525354555657', '606162636465666768696a6b6c6d6e6f'].map((h) => Buffer.from(h, 'hex')),
  // merkle_tree_test.cc kSHA256Roots[8] (incremental roots)
  roots: [
    '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
    'fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125',
    'aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77',
    'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7',
    '4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4',
    '76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef',
    'ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c',
    '5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328',
  ],
  // merkle_tree_test.cc kSHA256Paths[6]: {leaf(1-based), snapshot, path[] ('' slots are padding)}
  paths: [
    { leaf: 0, snapshot: 0, path: [] },
    { leaf: 1, snapshot: 1, path: [] },
    { leaf: 1, snapshot: 8, path: ['96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7', '5f083f0a1a33ca076a95279832580db3e0ef4584bdff1f54c8a360f50de3031e', '6b47aaf29ee3c2af9af889bc1fb9254dabd31177f16232dd6aab035ca39bf6e4'] },
    { leaf: 6, snapshot: 8, path: ['bc1a0643b12e4d2d7c77918f44e0f4f79a838b6cf9ec5b5c283e1f4d88599e6b', 'ca854ea128ed050b41b35ffc1b87b8eb2bde461e9e3b5596ece6b9d5975a0ae0', 'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7'] },
    { leaf: 3, snapshot: 3, path: ['fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125'] },
    { leaf: 2, snapshot: 5, path: ['6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d', '5f083f0a1a33ca076a95279832580db3e0ef4584bdff1f54c8a360f50de3031e', 'bc1a0643b12e4d2d7c77918f44e0f4f79a838b6cf9ec5b5c283e1f4d88599e6b'] },
  ],
  // merkle_tree_test.cc kSHA256Proofs[4]: {snapshot1, snapshot2, proof[]}
  proofs: [
    { s1: 1, s2: 1, proof: [] },
    { s1: 1, s2: 8, proof: ['96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7', '5f083f0a1a33ca076a95279832580db3e0ef4584bdff1f54c8a360f50de3031e', '6b47aaf29ee3c2af9af889bc1fb9254dabd31177f16232dd6aab035ca39bf6e4'] },
    { s1: 6, s2: 8, proof: ['0ebc5d3437fbe2db158b9f126a1d118e308181031d0a949f8dededebc558ef6a', 'ca854ea128ed050b41b35ffc1b87b8eb2bde461e9e3b5596ece6b9d5975a0ae0', 'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7'] },
    { s1: 2, s2: 5, proof: ['5f083f0a1a33ca076a95279832580db3e0ef4584bdff1f54c8a360f50de3031e', 'bc1a0643b12e4d2d7c77918f44e0f4f79a838b6cf9ec5b5c283e1f4d88599e6b'] },
  ],
};

// A2 — tree_hasher_test.cc vectors + collision laws.
{
  let ok = R.emptyTreeRoot().toString('hex') === V.emptyTree;
  const detail = [`emptyTree=${R.emptyTreeRoot().toString('hex').slice(0, 12)}…`];
  for (const lv of V.leaves) {
    const got = R.leafHash(Buffer.from(lv.in, 'hex')).toString('hex');
    ok = ok && got === lv.out;
    detail.push(`leaf(${lv.in.slice(0, 8) || '∅'})=${got.slice(0, 12)}…`);
  }
  for (const nd of V.nodes) {
    const got = R.nodeHash(Buffer.from(nd.l, 'hex'), Buffer.from(nd.r, 'hex')).toString('hex');
    ok = ok && got === nd.out;
    detail.push(`node=${got.slice(0, 12)}…`);
  }
  // collision laws from TreeHasherTest.CollisionTest:
  const h1 = R.leafHash(Buffer.from('Hello')), h2 = R.leafHash(Buffer.from('World'));
  const sub = R.nodeHash(h1, h2);
  ok = ok
    && !R.emptyTreeRoot().equals(R.leafHash(Buffer.alloc(0)))
    && !sub.equals(R.leafHash(Buffer.concat([h1, h2])))
    && !sub.equals(R.nodeHash(h2, h1));
  detail.push('collisions ok');
  kat('A2', 'tree_hasher_test.cc: empty/leaf/node vectors + collision laws', ok, detail.join(' '));
}

// A3 — transparency-dev/merkle rfc6962_test.go vectors (hasher ctgo depends on).
{
  const l = R.leafHash(Buffer.from(V.goLeaf.in)).toString('hex');
  const n = R.nodeHash(Buffer.from(V.goNode.l), Buffer.from(V.goNode.r)).toString('hex');
  kat('A3', 'rfc6962_test.go: leaf "L123456" + node N123||N456', l === V.goLeaf.out && n === V.goNode.out,
    `leaf=${l.slice(0, 12)}… node=${n.slice(0, 12)}…`);
}

// A4 — merkle_tree_test.cc RootTestVectors: refMTH of first (i+1) kInputs.
{
  let bad = 0, detail = [];
  for (let i = 0; i < 8; i++) {
    const got = R.refMTH(V.inputs.slice(0, i + 1)).toString('hex');
    if (got !== V.roots[i]) bad++;
    detail.push(`n=${i + 1}:${got.slice(0, 8)}…`);
  }
  kat('A4', 'merkle_tree_test.cc kSHA256Roots[0..7] via refMTH(kInputs)', bad === 0, `${bad} mismatches; ${detail[7]}`);
}

// A5 — PathTestVectors (positive) + ported verifier negative tests.
{
  let bad = 0;
  for (const p of V.paths) {
    if (p.leaf === 0) continue; // {0,0} is the empty-tree sentinel in the C++ table
    const ok = R.verifyInclusionProof({
      leafHash: R.leafHash(V.inputs[p.leaf - 1]),
      treeSize: p.snapshot,
      leafIndex: p.leaf - 1,
      path: p.path,
      rootHash: V.roots[p.snapshot - 1],
    }).ok;
    if (!ok) bad++;
  }
  kat('A5a', 'merkle_tree_test.cc kSHA256Paths verify (4 non-trivial paths)', bad === 0, `${bad} failures`);
}
{
  // Port of MerkleVerifierTest negatives for path {leaf 6, snapshot 8}:
  const p = V.paths[3];
  const lh = R.leafHash(V.inputs[p.leaf - 1]);
  const root = V.roots[p.snapshot - 1];
  const good = (o) => R.verifyInclusionProof({ leafHash: lh, treeSize: p.snapshot, leafIndex: p.leaf - 1, path: p.path, rootHash: root, ...o });
  const negs = [
    ['wrong leaf index (leaf+1)', { leafIndex: p.leaf }],
    ['wrong tree size (x2)', { treeSize: p.snapshot * 2 }],
    ['wrong tree size (÷2)', { treeSize: Math.floor(p.snapshot / 2) }],
    ['wrong leaf data', { leafHash: R.leafHash(Buffer.from('WrongLeaf')) }],
    ['wrong root (empty-tree hash)', { rootHash: V.emptyTree }],
  ];
  let allok = true;
  for (const [name, o] of negs) {
    const r = good(o);
    if (r.ok) allok = false;
    kat('A5b', `negative: ${name} must FAIL`, r.ok === false, r.ok ? 'ACCEPTED (bug!)' : 'rejected');
  }
  for (let j = 0; j < p.path.length; j++) {
    const tam = p.path.map((h, k) => (k === j ? '00'.repeat(32) : h));
    const r = good({ path: tam });
    if (r.ok) allok = false;
    kat('A5b', `negative: tampered path element ${j} must FAIL`, r.ok === false, r.ok ? 'ACCEPTED (bug!)' : 'rejected');
  }
  {
    const r = good({ path: [...p.path, root] }); // garbage appended
    kat('A5b', 'negative: node appended to path must FAIL', r.ok === false, r.ok ? 'ACCEPTED (bug!)' : 'rejected');
  }
  {
    const r = good({ path: p.path.slice(0, -1) }); // node removed
    kat('A5b', 'negative: node removed from path must FAIL', r.ok === false, r.ok ? 'ACCEPTED (bug!)' : 'rejected');
  }
}

// A6 — ConsistencyTestVectors. NOTE: the reader's contract requires
// 0 < first < second (documented); {1,1} empty-proof case is a defined
// non-target and is checked as a REJECTION (strictness receipted, not a bug).
{
  let bad = 0;
  for (const pr of V.proofs) {
    if (pr.s1 >= pr.s2) {
      const r = R.verifyConsistencyProof({ size1: pr.s1, size2: pr.s2, proof: pr.proof, root1: V.roots[pr.s1 - 1], root2: V.roots[pr.s2 - 1] });
      kat('A6', `strictness: {${pr.s1},${pr.s2}} empty proof rejected by contract`, r.ok === false, r.reason?.slice(0, 40));
      continue;
    }
    const r = R.verifyConsistencyProof({ size1: pr.s1, size2: pr.s2, proof: pr.proof, root1: V.roots[pr.s1 - 1], root2: V.roots[pr.s2 - 1] });
    if (!r.ok) bad++;
    kat('A6', `merkle_tree_test.cc consistency {${pr.s1},${pr.s2}} (${pr.proof.length} nodes)`, r.ok, r.reason ?? 'ok');
  }
  if (bad) kat('A6', 'consistency vectors', false, `${bad} failures`);
}

// A7 — exhaustive + tamper + parser + crypto roundtrips.
{
  let checked = 0, bad = 0;
  for (let n = 1; n <= 40; n++) {
    const leaves = [];
    for (let i = 0; i < n; i++) leaves.push(Buffer.from(`leaf-${i}-${n}`));
    const root = R.refMTH(leaves);
    for (let m = 0; m < n; m++) {
      const path = R.refInclusionPath(m, leaves);
      const v = R.verifyInclusionProof({ leafHash: R.leafHash(leaves[m]), treeSize: n, leafIndex: m, path, rootHash: root });
      checked++;
      if (!v.ok) bad++;
    }
  }
  kat('A7a', `inclusion verifier vs reference tree (n=1..40, all m): ${checked} cases`, bad === 0, `${bad} disagreements`);
}
{
  const subproof = (m, D, b) => {
    const n = D.length;
    if (m === n) return b ? [] : [R.refMTH(D)];
    let k = 1; while (k * 2 < n) k *= 2;
    if (m <= k) return [...subproof(m, D.slice(0, k), b), R.refMTH(D.slice(k))];
    return [...subproof(m - k, D.slice(k), false), R.refMTH(D.slice(0, k))];
  };
  let checked = 0, bad = 0;
  for (let n = 2; n <= 33; n++) {
    const leaves = [];
    for (let i = 0; i < n; i++) leaves.push(Buffer.from(`c-${i}-${n}`));
    const root2 = R.refMTH(leaves);
    for (const m of [1, 2, 3, 4, 5, 8, 9, 16, 17].filter((x) => x < n)) {
      const proof = subproof(m, leaves, true);
      const root1 = R.refMTH(leaves.slice(0, m));
      const v = R.verifyConsistencyProof({ size1: m, size2: n, proof, root1, root2: root2 });
      checked++;
      if (!v.ok) bad++;
    }
  }
  kat('A7b', `consistency verifier vs reference SUBPROOF: ${checked} (m,n) pairs`, bad === 0, `${bad} disagreements`);
}
{
  // tamper controls on a 7-leaf tree
  const leaves = [];
  for (let i = 0; i < 7; i++) leaves.push(Buffer.from(`t-${i}`));
  const root = R.refMTH(leaves);
  const good = (lh, idx, path, rt) => R.verifyInclusionProof({ leafHash: lh, treeSize: 7, leafIndex: idx, path, rootHash: rt });
  const path3 = R.refInclusionPath(3, leaves);
  const tampered = path3.map((p) => Buffer.concat([p.subarray(0, 31), Buffer.from([p[31] ^ 1])]));
  const cut = path3.slice(0, -1);
  const t1 = good(R.leafHash(leaves[3]), 3, tampered, root).ok === false;
  const t2 = good(R.leafHash(leaves[3]), 3, cut, root).ok === false;
  const t3 = good(Buffer.concat([R.leafHash(Buffer.from('t-3')).subarray(0, 31), Buffer.from([0x00])]), 3, path3, root).ok === false;
  const t4 = good(R.leafHash(leaves[3]), 7, path3, root).ok === false;
  const t5 = good(R.leafHash(leaves[3]), 3, path3, Buffer.alloc(32, 9)).ok === false;
  const t6 = good(R.leafHash(leaves[3]), 3, [path3[0], path3[1], path3[0]], root).ok === false;
  kat('A7c', 'tamper controls: bad path / short path / bad leaf / OOB index / wrong root / long path all FAIL', t1 && t2 && t3 && t4 && t5 && t6,
    `t1..t6 = ${[t1, t2, t3, t4, t5, t6].join(',')}`);
}
{
  // C2SP checkpoint parser (39-a's A7 kept)
  const root64 = Buffer.from(R.sha256(Buffer.from('cp-root'))).toString('base64');
  const env1 = `demo.log/123\n42\n${root64}\n`;
  const env2 = `demo.log/123\n42\n${root64}\n\n— demo.log/123 AAAAAQ==\n`;
  const p1 = R.parseCheckpoint(env1);
  const p2 = R.parseCheckpoint(env2);
  const p3 = R.parseCheckpoint({ envelope: env2 });
  const bad = R.parseCheckpoint('demo.log/123\nnot-a-number\n' + root64 + '\n');
  kat('A7d', 'C2SP checkpoint parse (bare / sig-line / object form / reject bad size)',
    p1.ok && p2.ok && p3.ok && !bad.ok
      && p1.treeSize === 42 && p2.sigLines.length === 1 && p3.treeSize === 42
      && p1.rootHashHex === R.sha256(Buffer.from('cp-root')).toString('hex'),
    `size=${p1.treeSize} root=${p1.rootHashHex.slice(0, 12)}… bad=${bad.reason?.slice(0, 30)}`);
}
{
  // Ed25519 checkpoint-signature roundtrip (exercises the 40-a one-shot path).
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const root64 = Buffer.from(R.sha256(Buffer.from('ed-root'))).toString('base64');
  const body = `ed.log/1\n7\n${root64}\n`;
  const pemPub = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const der = publicKey.export({ format: 'der', type: 'spki' });
  const hint = R.sha256(der).subarray(0, 4);
  const sig = cryptoSign(null, Buffer.from(body, 'utf8'), privateKey);
  const cp = body + `\n— ed.log/1 ${Buffer.concat([hint, sig]).toString('base64')}\n`;
  const good = R.verifyCheckpointSignature(cp, pemPub);
  const tampered = R.verifyCheckpointSignature(body.replace('7', '8') + `\n— ed.log/1 ${Buffer.concat([hint, sig]).toString('base64')}\n`, pemPub);
  kat('A7e', 'ed25519 checkpoint signature roundtrip (sign ok / tamper rejected)',
    good.ok === true && good.hintOK === true && tampered.ok === false,
    `hintOK=${good.hintOK} tamperRej=${tampered.ok === false}`);
}
{
  // ECDSA-P256 TreeHeadSignature roundtrip (exercises 40-a's STH verifier).
  // The signature is served as a TLS DigitallySigned struct (RFC 5246 §4.7:
  // 0x04 0x03 + 2-byte len + DER) — the framing the first live run exposed.
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pemPub = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const root = R.sha256(Buffer.from('sth-root'));
  const sth = { timestamp: 1690000000000, treeSize: 123456789, rootHash: root };
  const blob = R.treeHeadSignatureBlob(sth).blob;
  const der = cryptoSign('sha256', blob, privateKey);
  const framed = Buffer.concat([Buffer.from([0x04, 0x03]), Buffer.from([(der.length >> 8) & 0xff, der.length & 0xff]), der]);
  const good = R.verifyTreeHeadSignature({ ...sth, signature: framed, publicKey: pemPub });
  const bad = R.verifyTreeHeadSignature({ ...sth, treeSize: 123456788, rootHash: root, signature: framed, publicKey: pemPub });
  const bare = R.parseDigitallySigned(der);
  kat('A7f', 'ECDSA-P256 TreeHeadSignature roundtrip (TLS-framed sig ok / tampered size rejected / bare-DER fallback)',
    good.ok === true && good.algorithm?.hash === 4 && good.algorithm?.signature === 3 && bad.ok === false && bare.framed === false && bare.signature.equals(der),
    `blobLen=${blob.length} framed=${good.ok} tamperRej=${bad.ok === false}`);
}

// ============================== B. LIVE ====================================
console.log('=== B. live RFC 6962 log (v3 log list -> get-sth -> get-entries -> get-proof-by-hash) ===');

const B = { listSha256: null, attempts: [], chosen: null };

// B0 — log list.
{
  const res = await GET(LOG_LIST_URL);
  B.listSha256 = sha256hex(Buffer.from(res.text, 'utf8'));
  // v3 list shape: {version, operators: [{name, logs: [...], tiled_logs: [...]}]}
  const classic = (res.json?.operators ?? []).flatMap((o) => (o.logs ?? []).map((l) => ({ ...l, operator: o.name })));
  const usable = classic.filter((l) => l.state && l.state.usable);
  const tiled = (res.json?.operators ?? []).flatMap((o) => o.tiled_logs ?? []);
  kat('B0', 'v3 log list fetched; usable (classic) logs counted', res.status === 200 && usable.length > 0,
    `http ${res.status} sha256 ${B.listSha256.slice(0, 16)}… usable=${usable.length} classic=${classic.length} tiled=${tiled.length}`);
  B.usableCount = usable.length;
  B.usable = usable;
}

// Preference order (well-run, fast-responding, v1-only): Google argon, Cloudflare
// nimbus, DigiCert yeti, Sectigo mammoth/xing. First log that passes the FULL
// pipeline is the receipted choice; every attempt is recorded.
const PREF = ['argon', 'nimbus2026', 'yeti2026', 'mammoth2026', 'xing2026'];
const candidates = [...B.usable ?? []].sort((a, b) => {
  const rank = (l) => { const s = ((l.description ?? '') + ' ' + String(l.url)).toLowerCase(); const i = PREF.findIndex((p) => s.includes(p)); return i === -1 ? PREF.length : i; };
  return rank(a) - rank(b);
});

let liveOK = false;
for (const log of candidates.slice(0, 6)) {
  const attempt = { description: log.description, url: log.url, steps: {} };
  B.attempts.push(attempt);
  try {
    // B1 — get-sth + ECDSA signature verify.
    const sthRes = await GET(new URL('ct/v1/get-sth', log.url).href);
    if (sthRes.status !== 200 || !sthRes.json) { attempt.steps.get_sth = `http ${sthRes.status}`; continue; }
    const sth = R.parseSTHResponse(sthRes.json);
    if (!sth.ok) { attempt.steps.parse_sth = sth.reason; continue; }
    const sig = R.verifyTreeHeadSignature({ timestamp: sth.timestamp, treeSize: sth.treeSize, rootHash: sth.rootHash, signature: sth.signature, publicKey: log.key });
    attempt.steps.sth = { tree_size: sth.treeSize, timestamp: sth.timestamp, root: sth.rootHashHex, sig_ok: sig.ok };
    if (!sig.ok) { attempt.steps.sth_sig = sig.reason; continue; }
    kat('B1', `STH signature verifies [${log.description}]`, true,
      `size=${sth.treeSize} ts=${sth.timestamp} root=${sth.rootHashHex}`);

    // B2 — get-entries near tip -> tree-leaf input d(m) -> leaf hash.
    // DIALECT (receipted empirically 2026-09-27): the v3 list's big classic logs
    // serve get-entries as {entries:[{leaf_input, extra_data}]} (Trillian legacy
    // shape + Google's static-CT tile shim), NOT the RFC §4.6 {data} shape.
    // For both dialects the tree leaf input d(m) is the leaf_input bytes
    // (verified live: get-proof-by-hash accepts SHA-256(0x00||leaf_input));
    // {data} is preferred when present per RFC 6962 §4.6.
    const idx = sth.treeSize - 1;
    const entRes = await GET(new URL(`ct/v1/get-entries?start=${idx}&end=${idx}`, log.url).href);
    if (entRes.status !== 200 || !entRes.json?.entries?.length) { attempt.steps.get_entries = `http ${entRes.status}`; continue; }
    const raw = entRes.json.entries[0];
    const dmB64 = raw.data ?? raw.leaf_input;
    if (!dmB64) { attempt.steps.get_entries = 'no data/leaf_input field'; continue; }
    const dmShape = raw.data ? 'data (RFC 6962 §4.6)' : 'leaf_input (trillian/shim dialect)';
    const entry = Buffer.from(dmB64, 'base64');
    const lh = R.leafHash(entry);
    attempt.steps.entry = { index: idx, bytes: entry.length, shape: dmShape, leaf_hash: lh.toString('hex') };
    kat('B2', `newest entry fetched (index ${idx})`, true,
      `shape=${dmShape} ${entry.length}B leafHash=${lh.toString('hex').slice(0, 16)}…`);

    // B3 — get-proof-by-hash -> verify inclusion against the STH root.
    // Response shape (receipted): {leaf_index, audit_path} — no tree_size/root
    // fields, so the proof is bound to the REQUESTED tree size and the STH
    // root fetched in B1 (that binding is the verification).
    const proofRes = await GET(new URL(`ct/v1/get-proof-by-hash?hash=${encodeURIComponent(lh.toString('base64'))}&tree_size=${sth.treeSize}`, log.url).href);
    if (proofRes.status !== 200 || !proofRes.json) { attempt.steps.get_proof = `http ${proofRes.status}`; continue; }
    const leafIndex = Number(proofRes.json.leaf_index ?? proofRes.json.log_index);
    const proofTreeSize = Number(proofRes.json.tree_size ?? sth.treeSize);
    if (!Number.isInteger(leafIndex) || leafIndex < 0) { attempt.steps.get_proof = `bad leaf_index: ${proofRes.json.leaf_index}`; continue; }
    const v = R.verifyInclusionProof({
      leafHash: lh,
      treeSize: proofTreeSize,
      leafIndex,
      path: proofRes.json.audit_path,
      rootHash: sth.rootHash,
    });
    attempt.steps.inclusion = { leaf_index: leafIndex, tree_size: proofTreeSize, path_len: (proofRes.json.audit_path ?? []).length, ok: v.ok, computed_root: v.computedRoot };
    kat('B3', `inclusion proof verifies against STH root [${log.description}]`, v.ok,
      `leaf_index=${leafIndex} size=${proofTreeSize} path=${(proofRes.json.audit_path ?? []).length} computedRoot=${v.computedRoot ?? v.reason}`);
    if (!v.ok) continue;

    // B4 — consistency proof if the tree grew between two observed STHs.
    let consDetail = 'no growth observed in window (honest receipt, not a reader failure)';
    const s2 = R.parseSTHResponse((await GET(new URL('ct/v1/get-sth', log.url).href)).json);
    if (s2.ok && s2.treeSize > sth.treeSize) {
      const cRes = await GET(new URL(`ct/v1/get-sth-consistency?first=${sth.treeSize}&second=${s2.treeSize}`, log.url).href);
      if (cRes.status === 200 && cRes.json) {
        // dialect note: RFC 6962 §5.3 JSON field is misspelled "conistency";
        // Google's shim returns "consistency"; some impls use "consistency_path".
        const rawProof = cRes.json.conistency ?? cRes.json.consistency ?? cRes.json.consistency_path;
        const cv = R.verifyConsistencyProof({ size1: sth.treeSize, size2: s2.treeSize, proof: rawProof, root1: sth.rootHash, root2: s2.rootHash });
        const sig2 = R.verifyTreeHeadSignature({ timestamp: s2.timestamp, treeSize: s2.treeSize, rootHash: s2.rootHash, signature: s2.signature, publicKey: log.key });
        attempt.steps.consistency = { from: sth.treeSize, to: s2.treeSize, ok: cv.ok, second_sig_ok: sig2.ok };
        consDetail = `${sth.treeSize}→${s2.treeSize} fold=${cv.ok} sig2=${sig2.ok}`;
        kat('B4', `consistency proof verifies [${log.description}]`, cv.ok && sig2.ok, consDetail);
      } else { consDetail = `get-sth-consistency http ${cRes.status}`; kat('B4', 'consistency proof (endpoint)', false, consDetail); }
    } else {
      kat('B4', 'consistency proof — skipped (tree static during run)', true, consDetail);
    }

    B.chosen = {
      description: log.description, url: log.url, key_sha256: sha256hex(Buffer.from(log.key, 'utf8')),
      sth: { tree_size: sth.treeSize, timestamp: sth.timestamp, root_hex: sth.rootHashHex, signature_ok: sig.ok },
      entry: attempt.steps.entry, inclusion: attempt.steps.inclusion, consistency: attempt.steps.consistency ?? null,
    };
    liveOK = true;
    break;
  } catch (e) {
    attempt.steps.error = String(e.message ?? e);
  }
}
if (!liveOK) kat('B', 'no candidate log passed the full live pipeline', false, `${B.attempts.length} attempts receipted`);

// ============================== SEAL =======================================
writeReceiptAndExit();

function writeReceiptAndExit(msg) {
  const fails = rows.filter((r) => !r.ok);
  const receipt = {
    schema: 'fleet-seeds/transparency-kat/2.0',
    lane: '40-a transparency-smith',
    generated_at: new Date().toISOString(),
    reader_sha256: sha256hex(readFileSync(new URL('./ct-reader.mjs', import.meta.url))),
    vector_sources: Object.entries(VECTORS).map(([k, v]) => ({ key: k, label: v.label, sha256: v.sha256 })),
    log_list_url: LOG_LIST_URL,
    log_list_sha256: B.listSha256,
    log_attempts: B.attempts,
    chosen_log: B.chosen,
    totals: { pass: rows.length - fails.length, fail: fails.length },
    rows,
    note: msg ?? undefined,
  };
  writeFileSync(new URL('./kat-results.json', import.meta.url), JSON.stringify(receipt, null, 1) + '\n');
  console.log(`\nKAT totals: ${receipt.totals.pass} pass, ${receipt.totals.fail} fail → kat-results.json`);
  if (msg) console.log(msg);
  process.exitCode = fails.length ? 1 : 0;
  process.exit(process.exitCode);
}
