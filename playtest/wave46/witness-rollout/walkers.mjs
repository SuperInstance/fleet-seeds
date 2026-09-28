// walkers.mjs — lane 46-e "witness-roller" chain-walker adapters.
//
// REUSE WITH ATTRIBUTION (nothing re-implemented that the fleet already owns):
//   * stone-v1 walking + canonicalJSON: tools/lib/stone-v1.mjs (lane 43-c
//     tool-builder's independent verifier) — imported, not copied.
//   * witness receipt grammar: playtest/wave44/witness-grammar/witness.mjs
//     (44-b mavis adoption, hardened) — imported, not copied.
//   * pinned-fetch + fetch-receipt pattern: tools/verify-fleet.mjs (43-c).
//
// This module only adds: the PIN TABLE for the wave-46 rollout (every remote
// byte pinned to a commit sha), per-target walkers that accept INJECTED BYTES
// (so negative controls can tamper without touching the network), and the
// deterministic verdict-digest used as output_sha256 for non-chain artifacts.
//
// Zero dependencies, node:crypto only. Keys: none.

import { createHash } from 'node:crypto';
import { canonicalJSON, verifyStoneChain, verifyStoneJsonl } from '../../../tools/lib/stone-v1.mjs';
import { parseChainFile, verifyChain } from '../../wave44/witness-grammar/witness.mjs';

export { canonicalJSON };
export const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');

// ═══════════════════════════════════════════════════════════════════════════
// PIN TABLE — every byte this lane touches is pinned here and pre-registered
// in claims.json BEFORE the official run. Remote = raw.githubusercontent at a
// pinned commit; local = a fleet-seeds checkout file pinned by bytes+git-blob.
// ═══════════════════════════════════════════════════════════════════════════
export const PINS = {
  wave44Kat: {
    id: 'wave44_kat',
    kind: 'witness-chain',
    label: 'FIXTURE',
    path: 'playtest/wave44/witness-grammar/kat/chain.jsonl',
    expectTip: 'e4226c8846a9528253a4f193e21099abb87b275859edd7290556f8b3c7cdc69c',
    expectReceipts: 5,
  },
  qtheEq10: {
    id: 'qthe_e_q10',
    kind: 'stone-v1',
    label: 'LIVE',
    repo: 'SuperInstance/qthe',
    sha: '0f5be9d6652d90b7984ebfaa5394a6e20179c7dc',
    path: 'receipts/e_q10_chain.jsonl',
    rawUrl: 'https://raw.githubusercontent.com/SuperInstance/qthe/0f5be9d6652d90b7984ebfaa5394a6e20179c7dc/receipts/e_q10_chain.jsonl',
    expectTip: '50ddf5f9226d8c847948ea4916c54af6338775bd9f8d42b5bd314063317e6938',
    expectLinks: 24,
    expectBytesSha256: '6637ce7dfb2d68718cc0a09d13fbe6311d59f52d3a91c8e00264546911f1fc59',
    note: 'brief: "e_q10 receipt chain @ qthe tip 0f5be9d, 24 links tip 50ddf5f9…" — CONFIRMED (receipts/e_q10_chain.jsonl exists at the pinned tip; e_q9 chain does NOT exist anywhere in qthe — see claims P5)',
  },
  qtheEq6: {
    id: 'qthe_e_q6',
    kind: 'stone-v1',
    label: 'LIVE',
    repo: 'SuperInstance/qthe',
    sha: '905bb2f57ba369500359dc255aeaaeb681125fa6',
    path: 'receipts/e_q6_chain.jsonl',
    rawUrl: 'https://raw.githubusercontent.com/SuperInstance/qthe/905bb2f57ba369500359dc255aeaaeb681125fa6/receipts/e_q6_chain.jsonl',
    expectTip: 'ab4ea19681888b11c2843b9ca43d12f652dca045338217dc5bf1b5cd9e477db0',
    expectLinks: 15,
    expectBytesSha256: '3340b0823aabcd7773172c15104397452fdfbef01e006f25ed330dacf98018cc',
    fixture: 'tools/fixtures/qthe-e_q6-chain-905bb2f57ba369500359dc255aeaaeb681125fa6.jsonl',
    note: 'the brief said "e_q9 @ pinned 905bb2f5… per tools/fixtures" — the fixture at that pin is the e_q6 chain (disclosure claim P5); 905bb2f5 is the commit that sealed it (34-a), unchanged through ee00b99',
  },
  pongBirthSeal: {
    id: 'pong_birth_seal',
    kind: 'stone-v1',
    label: 'LIVE',
    repo: 'SuperInstance/pong-quilt',
    sha: '1da41be23eff100f4d11df0e187311e12ad704f9',
    path: 'checkpoints/stone-v1.json',
    rawUrl: 'https://raw.githubusercontent.com/SuperInstance/pong-quilt/1da41be23eff100f4d11df0e187311e12ad704f9/checkpoints/stone-v1.json',
    expectTip: 'c155fd016b364335c076cc18772b835672581230c2fd377fd8ac9f2849d296c7',
    expectLinks: 5,
    expectBytesSha256: '6e958f6716225872c613be556a3e0bd754628c7c4c47c3c378220a70e84ed576',
    fixture: 'tools/fixtures/pong-stone-v1-1da41be23eff100f4d11df0e187311e12ad704f9.json',
    eraReceipt: 'post-R42-site era pin per tools/verify-fleet.mjs PINS.pongBirthSeal (the ffe8abd8… tip is the stale 4d447ed3-era brief; wave 41-b P4) — not tampering',
  },
  tavernRound11: {
    id: 'tavern_round11',
    kind: 'stone-v1',
    label: 'FIXTURE',
    path: 'tavern/round-11/round11_ledger.jsonl',
    pinnedAtFleetSha: 'a7a0226185a47695f4b7fd420d54d0e394e48630',
    gitBlob: '913eea42b2b0f34ff669c74c3a6156dc2319a471',
    expectTip: 'db324fd05d0a4373b4f8ec8fc395039065e1b54494ba546425fd3e76054dc1b5',
    expectLinks: 6,
    expectBytesSha256: 'bdf3be0641f51b4241d3846b16744e2623bfb4ec24f5374f931d7618d1d19bf5',
  },
  crabTraps45c: {
    id: 'crabtraps_45c',
    kind: 'artifact+pre-registration-binding',
    label: 'LIVE',
    repo: 'SuperInstance/crab-traps',
    sha: 'e6f5ce3342e12280d7ef70d982ec4c6d709540e9',
    artifactPath: 'worker/src/arena-scenarios-003-live-reasoner-results.json',
    artifactRawUrl: 'https://raw.githubusercontent.com/SuperInstance/crab-traps/e6f5ce3342e12280d7ef70d982ec4c6d709540e9/worker/src/arena-scenarios-003-live-reasoner-results.json',
    expectArtifactSha256: '818e66834edb5ed1d21f1a2070eeb860d6cc8dd291546deaa59ea3fb61bc2184',
    predictionsPath: 'worker/src/arena-scenarios-003-live-reasoner-predictions.json',
    predictionsRawUrl: 'https://raw.githubusercontent.com/SuperInstance/crab-traps/e6f5ce3342e12280d7ef70d982ec4c6d709540e9/worker/src/arena-scenarios-003-live-reasoner-predictions.json',
    expectPredictionsSha256: '76bf72511c5507d0997eb7a2dc4d152090a8f7a0860f42b8159248fc21beac2a',
  },
  crabTraps44a: {
    id: 'crabtraps_44a',
    kind: 'artifact+pre-registration-binding',
    label: 'LIVE',
    repo: 'SuperInstance/crab-traps',
    sha: 'fed1e98502dfcedbd3669652bbe3d713e1156d78',
    artifactPath: 'worker/src/arena-scenarios-003-gan-results.json',
    artifactRawUrl: 'https://raw.githubusercontent.com/SuperInstance/crab-traps/fed1e98502dfcedbd3669652bbe3d713e1156d78/worker/src/arena-scenarios-003-gan-results.json',
    expectArtifactSha256: '6d7db23ec86e2ffb79d8dcae65b9972fd87bd6f012ecc33d596fb7ebe47a0d78',
    predictionsPath: 'worker/src/arena-scenarios-003-gan-predictions.json',
    predictionsRawUrl: 'https://raw.githubusercontent.com/SuperInstance/crab-traps/fed1e98502dfcedbd3669652bbe3d713e1156d78/worker/src/arena-scenarios-003-gan-predictions.json',
    expectPredictionsSha256: '76e5ef055f74c4d3b59d2021f1cfb59c994c44ad6119fedae6db5950b0b3ece7',
  },
  fleetFixtures: {
    id: 'fleetseeds_fixtures',
    kind: 'fixture-manifest',
    label: 'FIXTURE',
    dir: 'tools/fixtures',
    files: [
      { path: 'tools/fixtures/qthe-e_q6-chain-905bb2f57ba369500359dc255aeaaeb681125fa6.jsonl', expectSha256: '3340b0823aabcd7773172c15104397452fdfbef01e006f25ed330dacf98018cc', pinSource: 'tools/verify-fleet.mjs PINS.qtheEq6.fixtureSha256' },
      { path: 'tools/fixtures/pong-stone-v1-1da41be23eff100f4d11df0e187311e12ad704f9.json', expectSha256: '6e958f6716225872c613be556a3e0bd754628c7c4c47c3c378220a70e84ed576', pinSource: 'tools/verify-fleet.mjs PINS.pongBirthSeal.fixtureSha256' },
      { path: 'tools/fixtures/rekor-ecdsa-entry-108e9186-a00ec06ef.live-get.json', expectSha256: '4545f9182b4204e5f7bc2c1130739aeb0039026d12c735f4756c20043f879268', pinSource: 'tools/verify-fleet.mjs PINS.rekorEcdsa.fixtureSha256' },
      { path: 'tools/fixtures/moth-42b-raw-bits-2caa822b-7c46-4f65-a0c9-152c46272e19.txt', expectSha256: 'ebc8a43d90be5c0b01788f7cc63021ab0b0dac1a0294756e73a2882360b5e9b9', pinSource: 'wave-42 moth deep-trace receipt (raw ebc8a43d…); byte-equal copy at playtest/wave45/moth-census/fixtures/' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Fetch layer (LIVE mode) — pinned URLs only, receipted.
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchPinned(url, timeoutMs = 20000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'fleet-seeds playtest/wave46/witness-rollout.mjs (46-e)' },
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, bytes, sha256: sha256Hex(bytes) };
}

// ═══════════════════════════════════════════════════════════════════════════
// Walkers — PURE on injected bytes; the fetch layer above feeds them in LIVE
// mode, the self-test feeds them tampered copies in negative controls.
// ═══════════════════════════════════════════════════════════════════════════

/** stone-v1 chain (JSONL or single-JSON document). */
export function walkStoneBytes({ id, bytes, expectTip, expectLinks }) {
  const base = { id, kind: 'stone-v1', bytesSha256: sha256Hex(bytes) };
  try {
    const text = bytes.toString('utf8');
    const parsed = text.trimStart().startsWith('{') && text.includes('\n')
      ? verifyStoneJsonl(text)
      : verifyStoneChain(JSON.parse(text));
    const tipOk = parsed.tip === expectTip;
    const linksOk = parsed.links === expectLinks;
    const ok = parsed.ok === true && tipOk && linksOk;
    return { ...base, ok, links: parsed.links, tip: parsed.tip, tipOk, linksOk,
      why: ok ? null : (parsed.ok ? `expected tip ${String(expectTip).slice(0, 12)}… / ${expectLinks} links, got ${parsed.tip} / ${parsed.links}` : parsed.why) };
  } catch (e) {
    return { ...base, ok: false, links: null, tip: null, why: `stone walk failed: ${e.message}` };
  }
}

/** wave-grammar witness chain (the wave-44 KAT). */
export function walkWitnessBytes({ id, bytes, expectTip, expectReceipts }) {
  const base = { id, kind: 'witness-chain', bytesSha256: sha256Hex(bytes) };
  try {
    const v = verifyChain(parseChainFile(bytes.toString('utf8')), { expectTip });
    const countOk = v.receipts === expectReceipts;
    const ok = v.ok === true && countOk;
    return { ...base, ok, receipts: v.receipts, tip: v.tip,
      why: ok ? null : (v.error ?? `expected ${expectReceipts} receipts, got ${v.receipts}`) };
  } catch (e) {
    return { ...base, ok: false, receipts: 0, tip: null, why: `witness walk failed: ${e.message}` };
  }
}

/** Deterministic digest of an artifact verdict (no timestamps inside) —
 *  used as output_sha256 for non-chain artifacts. */
export const verdictDigest = (obj) => sha256Hex(Buffer.from(canonicalJSON(obj), 'utf8'));

/** crab-traps artifact + its pre-registration binding:
 *  artifact bytes must match the pinned sha AND the sha embedded in the
 *  artifact's own pre_registration block must match the fetched predictions
 *  bytes AND the pre-registered pin. */
export function walkArtifactBytes({ id, artifactBytes, predictionsBytes, expectArtifactSha256, expectPredictionsSha256 }) {
  const base = { id, kind: 'artifact+pre-registration-binding' };
  try {
    const artifactSha256 = sha256Hex(artifactBytes);
    const artifactShaMatchesPin = artifactSha256 === expectArtifactSha256;
    const artifact = JSON.parse(artifactBytes.toString('utf8'));
    const embedded = artifact?.pre_registration?.sha256;
    const predictionsSha256 = sha256Hex(predictionsBytes);
    const embeddedMatchesPredictions = typeof embedded === 'string' && embedded === predictionsSha256;
    const embeddedMatchesPin = embedded === expectPredictionsSha256;
    const hasVerdict = artifact?.verdict !== undefined;
    const ok = artifactShaMatchesPin && embeddedMatchesPredictions && embeddedMatchesPin && hasVerdict;
    const detail = { artifact_sha256: artifactSha256, predictions_sha256: predictionsSha256,
      embedded_pre_registration_sha256: embedded ?? null, artifactShaMatchesPin,
      embeddedMatchesPredictions, embeddedMatchesPin, hasVerdict };
    return { ...base, ok, detail,
      digest: verdictDigest({ id, ...detail, walker: '46e-witness-roller' }),
      why: ok ? null : (!artifactShaMatchesPin ? `artifact bytes sha ${artifactSha256.slice(0, 12)}… != pinned ${expectArtifactSha256.slice(0, 12)}…`
        : !embeddedMatchesPredictions ? `embedded pre_registration.sha256 ${String(embedded).slice(0, 12)}… != fetched predictions bytes sha ${predictionsSha256.slice(0, 12)}…`
        : !embeddedMatchesPin ? `embedded pre_registration.sha256 != pre-registered pin`
        : 'artifact lacks a verdict block') };
  } catch (e) {
    return { ...base, ok: false, detail: null, digest: null, why: `artifact walk failed: ${e.message}` };
  }
}

/** fleet fixtures manifest: canonical manifest text is
 *  `${path} ${sha256}\n` lines sorted by path — its sha256 is inputs_sha256. */
export function walkFixturesBytes({ id, files }) {
  // files: [{ path, bytes, expectSha256, pinSource }]
  const entries = files
    .map((f) => ({ path: f.path, expectSha256: f.expectSha256, pinSource: f.pinSource ?? null, actualSha256: sha256Hex(f.bytes), sizeBytes: f.bytes.length }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const manifest = entries.map((e) => `${e.path} ${e.actualSha256}\n`).join('');
  const manifestSha256 = sha256Hex(Buffer.from(manifest, 'utf8'));
  const mismatches = entries.filter((e) => e.actualSha256 !== e.expectSha256);
  const ok = mismatches.length === 0 && entries.length > 0;
  return {
    id, kind: 'fixture-manifest', ok, entries, manifest_sha256: manifestSha256,
    digest: verdictDigest({ id, entries: entries.map((e) => ({ path: e.path, sha256: e.actualSha256, sizeBytes: e.sizeBytes })), walker: '46e-witness-roller' }),
    why: ok ? null : `fixture sha mismatches: ${mismatches.map((m) => `${m.path} got ${m.actualSha256.slice(0, 12)}… want ${m.expectSha256.slice(0, 12)}…`).join('; ')}`,
  };
}
