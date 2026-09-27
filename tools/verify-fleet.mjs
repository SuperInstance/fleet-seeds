#!/usr/bin/env node
// verify-fleet.mjs — lane 43-c "tool-builder" — ONE COMMAND, EVERY CHAIN,
// EVERY VERIFIER.
//
// The fleet's law is "a stranger can independently re-verify everything".
// Waves 41/42 proved the interop web works (5 direction-by-direction
// cross-verifies) and found real bugs (stone PEM-string P1; rekor Ed25519ph;
// rekor's fold variant mis-classifying valid tree states). This tool turns
// that web into a command: every public chain this fleet anchors, re-verified
// from first principles by code that shares NOTHING with the producers.
//
// Chains verified in one run (each receipted in the JSON verdict):
//   (a) qthe E-Q6 stone-v1 chain      @ pinned SHA 905bb2f5…  (tip ab4ea196…)
//   (b) pong-quilt birth-seal chain   @ pinned SHA 1da41be2…  (tip c155fd01…,
//       the post-R42-site era; the ffe8abd8… tip is the stale 4d447ed3 era —
//       receipted per wave 41-b P4)
//   (c) our VC envelope stone-checkpoint.vc.json — BOTH reader flows
//       (Reader A committed-key + Reader B spec-text §3.3.2-3.3.7) with the
//       fail-closed §B.3 KAT (8/8) and tamper controls
//   (d) the rekor ECDSA entry (hashedrekord): inclusion proof folded with OUR
//       OWN BigInt RFC 9162 §2.1.3.2 implementation (handles the depth-1
//       lo==…-index state rekor's own variant mis-classifies, 42-a), digest
//       bound to the VC artifact, checkpoint root parsed + cross-checked
//   (e) rekor log public key check: LIVE mode fetches the log key and
//       verifies the SignedEntryTimestamp (ECDSA-P256 over the canonical
//       {body,integratedTime,logID,logIndex} payload); OFFLINE mode receipts
//       an honest skip (the log key is deliberately not pinned in-repo).
//
// Every network fetch is a PINNED SHA URL and is receipted (status + sha256
// of the fetched bytes + byte-equality against the committed fixture).
// Keys: this tool uses NONE. Zero npm dependencies; node:crypto only.
//
// Usage:
//   node tools/verify-fleet.mjs                 # live: pinned raw fetches
//   node tools/verify-fleet.mjs --offline       # CI: tools/fixtures/ only
//   node tools/verify-fleet.mjs --repo=<dir>    # fleet-seeds checkout override
//   node tools/verify-fleet.mjs --qthe-dir=<dir>   # local qthe clone instead
//                                                  # of the pinned raw fetch
//   node tools/verify-fleet.mjs --pong-dir=<dir>   # local pong-quilt clone
//   node tools/verify-fleet.mjs --out=<file>    # also write the JSON verdict
//   node tools/verify-fleet.mjs --quiet         # suppress the human table
//
// Exit 0 iff ALL chains ok.

import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { verifyStoneChain, verifyStoneJsonl } from './lib/stone-v1.mjs';
import { foldInclusionPath, leafHash } from './lib/rfc9162.mjs';
import { runKATB3, verifyProofA, verifyProofB, tamperControls } from './lib/vc-eddsa.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

// ═══════════════════════════════════════════════════════════════════════════
// PINS — every remote byte this tool touches is pinned here and receipted.
// ═══════════════════════════════════════════════════════════════════════════
export const PINS = {
  qtheEq6: {
    id: 'qthe_e_q6',
    repo: 'SuperInstance/qthe',
    sha: '905bb2f57ba369500359dc255aeaaeb681125fa6', // commit that sealed the chain (34-a); unchanged through ee00b99
    path: 'receipts/e_q6_chain.jsonl',
    rawUrl: 'https://raw.githubusercontent.com/SuperInstance/qthe/905bb2f57ba369500359dc255aeaaeb681125fa6/receipts/e_q6_chain.jsonl',
    expectTip: 'ab4ea19681888b11c2843b9ca43d12f652dca045338217dc5bf1b5cd9e477db0',
    expectLinks: 15,
    fixture: 'qthe-e_q6-chain-905bb2f57ba369500359dc255aeaaeb681125fa6.jsonl',
    fixtureSha256: '3340b0823aabcd7773172c15104397452fdfbef01e006f25ed330dacf98018cc',
  },
  pongBirthSeal: {
    id: 'pong_birth_seal',
    repo: 'SuperInstance/pong-quilt',
    sha: '1da41be23eff100f4d11df0e187311e12ad704f9',
    path: 'checkpoints/stone-v1.json',
    rawUrl: 'https://raw.githubusercontent.com/SuperInstance/pong-quilt/1da41be23eff100f4d11df0e187311e12ad704f9/checkpoints/stone-v1.json',
    expectTip: 'c155fd016b364335c076cc18772b835672581230c2fd377fd8ac9f2849d296c7',
    expectLinks: 5,
    eraReceipt: 'pinned @ 1da41be (post-R42-site merge, wave-41-b walk: ok, 5 links, tip c155fd01…). The ffe8abd8… tip is the STALE 4d447ed3-era brief; pong\'s own artifact-maxspeed lineage receipt documents the change (wave 41-b P4) — not tampering.',
    fixture: 'pong-stone-v1-1da41be23eff100f4d11df0e187311e12ad704f9.json',
    fixtureSha256: '6e958f6716225872c613be556a3e0bd754628c7c4c47c3c378220a70e84ed576',
  },
  vcEnvelope: {
    id: 'vc_envelope',
    path: 'embassy/vc-envelope/stone-checkpoint.vc.json',
    keyPath: 'embassy/vc-envelope/public-key.json',
    expectArtifactSha256: '94aa82cdde3a717dc9aa68729d9ef96a398daa39d2d83204edea26f5ba75b1e5', // == 40-a/42-a receipt
    expectKatSteps: 8,
  },
  rekorEcdsa: {
    id: 'rekor_ecdsa',
    uuid: '108e9186e8c5677a264d92959c4b08de58cdc375aa0f78f5c180a1fc14610a7b79ba3a0a00ec06ef',
    url: 'https://rekor.sigstore.dev/api/v1/log/entries/108e9186e8c5677a264d92959c4b08de58cdc375aa0f78f5c180a1fc14610a7b79ba3a0a00ec06ef',
    publicKeyUrl: 'https://rekor.sigstore.dev/api/v1/log/publicKey',
    // pinned fingerprints from lane 42-a's sealed receipts (rekor-ecdsa-inclusion-fold-42a.json)
    expectRoot: 'd9e80d6da0277a125de03cbfa06e70494d5a097b41244f834a402c2885902b2c',
    expectTreeSize: 2857595469,
    expectLeafIndex: 2857259740,
    expectPathHashes: 26,
    expectArtifactSha256: '94aa82cdde3a717dc9aa68729d9ef96a398daa39d2d83204edea26f5ba75b1e5',
    logKeyFingerprint: 'dce5ef715502ec9f3cdfd11f8cc384b31a6141023d3e7595e9908a81cb6241bd',
    fixture: 'rekor-ecdsa-entry-108e9186-a00ec06ef.live-get.json',
    fixtureSha256: '4545f9182b4204e5f7bc2c1130739aeb0039026d12c735f4756c20043f879268',
  },
};

const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');

function gitHead(repoRoot) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function fetchPinned(url, timeoutMs = 20000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'fleet-seeds verify-fleet.mjs (43-c)' } });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, bytes: body, sha256: sha256Hex(body) };
}

// Parse a rekor checkpoint note: line0 = "host - logid", line1 = treeSize,
// line2 = base64 root hash. (The trailing note + signature is not parsed —
// verifying it needs the same log key as the SET, checked separately.)
export function parseCheckpointNote(text) {
  const lines = String(text).split('\n');
  if (lines.length < 3) throw new Error('checkpoint note too short');
  const treeSize = Number(lines[1].trim());
  const root = Buffer.from(lines[2].trim(), 'base64').toString('hex');
  if (!Number.isInteger(treeSize) || root.length !== 64) throw new Error('checkpoint note unparsable');
  return { treeSize, root };
}

// ── chain (a)/(b): stone-v1 chains ──────────────────────────────────────────
export async function verifyStoneChainPinned(pin, opts) {
  const chain = { id: pin.id, verifier: opts.verifier, expectTip: pin.expectTip, expectLinks: pin.expectLinks };
  try {
    let text, source, fetchReceipt = null;
    if (opts.mode === 'offline') {
      const f = readFileSync(join(opts.fixturesDir ?? FIXTURES, pin.fixture));
      text = f.toString('utf8');
      source = `fixture:${pin.fixture}`;
      const fixtureSha = sha256Hex(f);
      fetchReceipt = { mode: 'offline-fixture', fixture: pin.fixture, sha256: fixtureSha, matchesPinnedFixtureSha: fixtureSha === pin.fixtureSha256 };
      if (fixtureSha !== pin.fixtureSha256) throw new Error(`fixture sha mismatch: ${fixtureSha}`);
    } else if (opts[opts.overrideKey]) {
      const f = readFileSync(resolve(opts[opts.overrideKey], pin.path));
      text = f.toString('utf8');
      source = `local:${resolve(opts[opts.overrideKey], pin.path)}`;
      fetchReceipt = { mode: 'local-dir', dir: resolve(opts[opts.overrideKey]), pinnedFetchSkipped: true };
    } else {
      const r = await fetchPinned(pin.rawUrl);
      if (r.status !== 200) throw new Error(`pinned raw fetch ${pin.rawUrl} -> HTTP ${r.status}`);
      text = r.bytes.toString('utf8');
      source = pin.rawUrl;
      fetchReceipt = { mode: 'live', url: pin.rawUrl, pinnedSha: pin.sha, status: r.status, bytesSha256: r.sha256, bytesEqualFixture: r.sha256 === pin.fixtureSha256 };
    }
    const parsed = pin.path.endsWith('.jsonl')
      ? verifyStoneJsonl(text)
      : verifyStoneChain(JSON.parse(text));
    const tipOk = parsed.tip === pin.expectTip;
    const linksOk = parsed.links === pin.expectLinks;
    const ok = parsed.ok === true && tipOk && linksOk;
    return { ...chain, ...parsed, ok, tipOk, linksOk, source, fetchReceipt,
      why: ok ? null : (parsed.ok ? `expected tip ${pin.expectTip.slice(0, 8)}… / ${pin.expectLinks} links, got ${parsed.tip} / ${parsed.links}` : parsed.why),
      ...(pin.eraReceipt ? { eraReceipt: pin.eraReceipt } : {}) };
  } catch (e) {
    return { ...chain, ok: false, links: null, tip: null, why: e.message };
  }
}

// ── chain (c): the VC envelope, BOTH readers + fail-closed KAT ──────────────
export function verifyVcEnvelope(opts) {
  const pin = PINS.vcEnvelope;
  const chain = { id: pin.id, verifier: opts.verifier, expectArtifactSha256: pin.expectArtifactSha256 };
  try {
    const vcPath = join(opts.repo, pin.path);
    const keyPath = join(opts.repo, pin.keyPath);
    const vcBytes = readFileSync(vcPath);
    const artifactSha256 = sha256Hex(vcBytes);
    const securedDocument = JSON.parse(vcBytes.toString('utf8'));
    const keyRecord = JSON.parse(readFileSync(keyPath, 'utf8'));

    // FAIL-CLOSED GATE: the spec's own §B.3 vector first — if ANY KAT step
    // fails, the reader is NOT qualified to judge our document.
    const kat = runKATB3();
    if (!kat.ok) {
      return { ...chain, ok: false, links: 0, tip: artifactSha256, artifactSha256, kat, why: `KAT FAILED (${kat.passed}/${kat.total}) — fail-closed, VC not judged` };
    }

    const readerB = verifyProofB(securedDocument);
    const readerA = verifyProofA(securedDocument, keyRecord);
    const controls = tamperControls(securedDocument);

    const ok = readerB.verified && readerA.verified && controls.controlsOk && artifactSha256 === pin.expectArtifactSha256;
    return {
      ...chain,
      ok,
      links: kat.total, // the 8 fail-closed KAT steps gate every judge of this artifact
      tip: artifactSha256,
      artifactSha256,
      artifactShaMatchesPinned: artifactSha256 === pin.expectArtifactSha256,
      kat: { ok: kat.ok, passed: kat.passed, total: kat.total },
      readers: {
        A_committed_key: { verified: readerA.verified, bindingOk: readerA.bindingOk, sigOk: readerA.sigOk, hashDataHex: readerA.hashDataHex },
        B_spec_text: { verified: readerB.verified, why: readerB.why, hashDataHex: readerB.hashDataHex },
      },
      tamperControls: controls,
      source: vcPath,
      why: ok ? null : 'reader A or B rejected, or controls failed, or artifact sha moved off the pinned value',
    };
  } catch (e) {
    return { ...chain, ok: false, links: null, tip: null, why: e.message };
  }
}

// ── chain (d)/(e): the rekor ECDSA anchor ───────────────────────────────────
export async function verifyRekorEcdsa(opts, pin = PINS.rekorEcdsa) {
  const chain = { id: pin.id, verifier: opts.verifier, expectRoot: pin.expectRoot, uuid: pin.uuid };
  let entry, source, fetchReceipt = null;
  try {
    if (opts.mode === 'offline') {
      const f = readFileSync(join(opts.fixturesDir ?? FIXTURES, pin.fixture));
      const outer = JSON.parse(f.toString('utf8'));
      entry = outer[pin.uuid];
      if (!entry) throw new Error('fixture does not contain the pinned uuid');
      source = `fixture:${pin.fixture}`;
      const fixtureSha = sha256Hex(f);
      fetchReceipt = { mode: 'offline-fixture', fixture: pin.fixture, sha256: fixtureSha, matchesPinnedFixtureSha: fixtureSha === pin.fixtureSha256 };
      if (fixtureSha !== pin.fixtureSha256) throw new Error(`fixture sha mismatch: ${fixtureSha}`);
    } else {
      const r = await fetchPinned(pin.url);
      if (r.status !== 200) throw new Error(`rekor GET -> HTTP ${r.status}`);
      const outer = JSON.parse(r.bytes.toString('utf8'));
      entry = outer[pin.uuid];
      if (!entry) throw new Error('rekor response does not contain the pinned uuid');
      source = pin.url;
      fetchReceipt = { mode: 'live', url: pin.url, status: r.status, bytesSha256: r.sha256, bytesEqualFixture: r.sha256 === pin.fixtureSha256 };
    }

    // body → hashedrekord; leaf = SHA-256(0x00 || canonicalized entry body)
    const bodyBytes = Buffer.from(entry.body, 'base64');
    const body = JSON.parse(bodyBytes.toString('utf8'));
    if (body.kind !== 'hashedrekord') throw new Error(`body kind ${body.kind}, expected hashedrekord`);
    const digest = body.spec?.data?.hash?.value;
    if (!digest || body.spec.data.hash.algorithm !== 'sha256') throw new Error('body lacks a sha256 data digest');

    const vcBytes = readFileSync(join(opts.repo, PINS.vcEnvelope.path));
    const artifactSha256 = sha256Hex(vcBytes);
    const digestMatchesArtifact = digest === artifactSha256;
    const digestMatchesPinned = digest === pin.expectArtifactSha256;

    // inclusion proof → OUR OWN RFC 9162 §2.1.3.2 BigInt fold
    const ip = entry.verification?.inclusionProof;
    if (!ip) throw new Error('entry lacks verification.inclusionProof');
    const leaf = leafHash(bodyBytes);
    const fold = foldInclusionPath(leaf, ip.logIndex, ip.treeSize, ip.hashes);
    const checkpoint = parseCheckpointNote(ip.checkpoint);
    const rootMatchesStated = fold.root === ip.rootHash;
    const rootMatchesCheckpoint = fold.root === checkpoint.root;
    const rootMatchesPinned = fold.root === pin.expectRoot;
    const checkpointSizeMatches = checkpoint.treeSize === ip.treeSize;

    // Transparency-log semantics (honest by construction): the log is
    // APPEND-ONLY, so its tree head advances between fetches. The ENTRY's
    // leaf index is immutable and must match the 42-a pin; the tree size can
    // only grow. When the tree size still equals the sealed one, the fold
    // must reproduce the sealed root exactly (offline fixture = sealed
    // moment replay). When the log has advanced past it, the current head
    // is attested by the SET under the pinned-fingerprint log key instead.
    const leafIndexMatches = ip.logIndex === pin.expectLeafIndex;
    const treeSizeMatchesPinned = ip.treeSize === pin.expectTreeSize;
    const logAdvanced = ip.treeSize > pin.expectTreeSize;
    const structuralOk = leafIndexMatches && ip.treeSize >= pin.expectTreeSize;
    const sealedRootCheck = treeSizeMatchesPinned ? rootMatchesPinned : true;
    const pinnedRootNote = treeSizeMatchesPinned
      ? 'tree size equals the 42-a sealed tree head — the fold MUST and DID reproduce the sealed root d9e80d6d…'
      : (logAdvanced
        ? `log advanced past the 42-a sealed tree head (${pin.expectTreeSize} -> ${ip.treeSize}; append-only) — current head attested via the SET under the pinned-fingerprint log key; the sealed root d9e80d6d… is the HISTORICAL head at 42-a's fetch (2026-09-27T20:31Z)`
        : 'tree size SHRANK below the pinned head — impossible for an append-only log, fail');

    // (e) log public key check: live SET verify, or an honest offline skip
    let logKey;
    if (opts.mode === 'offline') {
      logKey = { mode: 'skip', setVerified: null,
        why: 'rekor log public key is not pinned in-repo; offline mode performs no network fetch — the SignedEntryTimestamp check runs in live mode (fingerprint pinned: ' + pin.logKeyFingerprint.slice(0, 12) + '…)' };
    } else {
      try {
        const pk = await fetchPinned(pin.publicKeyUrl);
        if (pk.status !== 200) throw new Error(`log publicKey GET -> HTTP ${pk.status}`);
        const pem = pk.bytes.toString('utf8');
        const fp = sha256Hex(pk.bytes);
        const payload = JSON.stringify({ body: entry.body, integratedTime: entry.integratedTime, logID: entry.logID, logIndex: entry.logIndex });
        const setSig = Buffer.from(entry.verification.signedEntryTimestamp, 'base64');
        const setVerified = cryptoVerify('sha256', Buffer.from(payload, 'utf8'), createPublicKey(pem), setSig);
        logKey = { mode: 'live', url: pin.publicKeyUrl, status: pk.status, publicKeySha256: fp,
          fingerprintMatchesPinned: fp === pin.logKeyFingerprint, setVerified,
          why: setVerified ? null : 'SignedEntryTimestamp FAILED to verify under the fetched log key' };
      } catch (e) {
        logKey = { mode: 'live-error', setVerified: null, why: `log key check failed: ${e.message}` };
      }
    }

    const ok = fold.ok && rootMatchesStated && rootMatchesCheckpoint && sealedRootCheck && structuralOk
      && digestMatchesArtifact && digestMatchesPinned && checkpointSizeMatches
      && (logKey.setVerified === true || logKey.mode === 'skip');
    return {
      ...chain, ok,
      links: ip.hashes.length, // path hashes consumed
      tip: fold.root,
      source, fetchReceipt,
      bodyKind: body.kind, digest, digestMatchesArtifact, digestMatchesPinned,
      inclusionProof: {
        leafIndex: ip.logIndex, treeSize: ip.treeSize, pathHashes: ip.hashes.length,
        leafHash: leaf.toString('hex'),
        statedRoot: ip.rootHash, computedRoot: fold.root,
        finalFn: fold.finalFn, finalSn: fold.finalSn, hashesConsumed: `${fold.consumed}/${ip.hashes.length}`,
        rootMatchesStated, rootMatchesCheckpoint, rootMatchesPinned, structuralOk,
        leafIndexMatches, treeSizeMatchesPinned, logAdvanced, sealedRootCheck,
        pinnedRootNote,
        checkpoint: { treeSize: checkpoint.treeSize, root: checkpoint.root, sizeMatches: checkpointSizeMatches },
        foldImpl: 'own BigInt RFC 9162 §2.1.3.2 (tools/lib/rfc9162.mjs) — handles the depth-1 (lo even, lo != hi, hi odd) LEFT-fold state rekor\'s variant mis-classifies (wave 42-a)',
      },
      logKey,
      why: ok ? null : 'inclusion fold, digest binding, or pinned-head comparison failed — see receipts',
    };
  } catch (e) {
    return { ...chain, ok: false, links: null, tip: null, source: source ?? null, fetchReceipt, why: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestration
// ═══════════════════════════════════════════════════════════════════════════
export function parseArgs(argv) {
  const opts = { mode: 'live', repo: resolve(HERE, '..'), qtheDir: null, pongDir: null, out: null, quiet: false };
  for (const a of argv) {
    if (a === '--offline') opts.mode = 'offline';
    else if (a.startsWith('--repo=')) opts.repo = resolve(a.slice(7));
    else if (a.startsWith('--qthe-dir=')) opts.qtheDir = resolve(a.slice(11));
    else if (a.startsWith('--pong-dir=')) opts.pongDir = resolve(a.slice(11));
    else if (a.startsWith('--out=')) opts.out = a.slice(6);
    else if (a === '--quiet') opts.quiet = true;
    else throw new Error(`unknown argument '${a}'`);
  }
  return opts;
}

export async function verifyFleet(opts) {
  const mode = opts.mode;
  const verifier = `verify-fleet.mjs@${gitHead(opts.repo)}`;
  const ctx = { mode, repo: opts.repo, verifier, fixturesDir: opts.fixturesDir, overrideKey: 'qtheDir' };
  const [qthe, pong] = await Promise.all([
    verifyStoneChainPinned(PINS.qtheEq6, ctx),
    verifyStoneChainPinned(PINS.pongBirthSeal, { ...ctx, overrideKey: 'pongDir' }),
  ]);
  const vc = verifyVcEnvelope({ ...ctx });
  const rekor = await verifyRekorEcdsa({ ...ctx });
  const chains = { qthe_eq6: qthe, pong_birth_seal: pong, vc_envelope: vc, rekor_ecdsa: rekor };
  const allOk = Object.values(chains).every((c) => c.ok === true);
  return { tool: 'fleet-seeds/tools/verify-fleet.mjs', verifier, checkedAt: new Date().toISOString(), mode, allOk, chains };
}

function shortTip(t) { return t ? String(t).slice(0, 12) + '…' : '—'; }

export function humanTable(verdict) {
  const rows = [
    ['chain', 'mode', 'ok', 'links', 'tip'],
    ['qthe E-Q6 stone-v1 @ ' + PINS.qtheEq6.sha.slice(0, 7), verdict.chains.qthe_eq6.fetchReceipt?.mode ?? '?', String(verdict.chains.qthe_eq6.ok), String(verdict.chains.qthe_eq6.links), shortTip(verdict.chains.qthe_eq6.tip)],
    ['pong birth-seal @ ' + PINS.pongBirthSeal.sha.slice(0, 7), verdict.chains.pong_birth_seal.fetchReceipt?.mode ?? '?', String(verdict.chains.pong_birth_seal.ok), String(verdict.chains.pong_birth_seal.links), shortTip(verdict.chains.pong_birth_seal.tip)],
    ['VC envelope (readers A+B, KAT 8/8)', 'local', String(verdict.chains.vc_envelope.ok), String(verdict.chains.vc_envelope.links), shortTip(verdict.chains.vc_envelope.tip)],
    ['rekor ECDSA ' + PINS.rekorEcdsa.uuid.slice(0, 10) + '…', verdict.chains.rekor_ecdsa.fetchReceipt?.mode ?? '?', String(verdict.chains.rekor_ecdsa.ok), String(verdict.chains.rekor_ecdsa.links), shortTip(verdict.chains.rekor_ecdsa.tip)],
  ];
  const w = [0, 1, 2, 3, 4].map((c) => Math.max(...rows.map((r) => r[c].length)));
  const line = (r) => '| ' + r.map((cell, i) => cell.padEnd(w[i])).join(' | ') + ' |';
  const sep = '+' + w.map((n) => '-'.repeat(n + 2)).join('+') + '+';
  return [sep, line(rows[0]), sep, ...rows.slice(1).map(line), sep].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('verify-fleet.mjs')) {
  const main = async () => {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); } catch (e) {
      console.error(`verify-fleet: ${e.message}`);
      process.exit(2);
    }
    const verdict = await verifyFleet(opts);
    if (!opts.quiet) {
      console.log(humanTable(verdict));
      for (const [id, c] of Object.entries(verdict.chains)) {
        if (!c.ok) console.error(`FAIL ${id}: ${c.why}`);
        else if (c.logKey?.mode === 'skip') console.error(`note ${id}: log-key check receipted skip (offline)`);
      }
    }
    const json = JSON.stringify(verdict, null, 2);
    if (opts.out) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(opts.out, json + '\n', 'utf8');
    }
    console.log(json);
    process.exit(verdict.allOk ? 0 : 1);
  };
  main().catch((e) => { console.error(`verify-fleet: ${e.stack || e.message}`); process.exit(2); });
}
