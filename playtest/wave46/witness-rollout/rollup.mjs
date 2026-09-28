#!/usr/bin/env node
// rollup.mjs — lane 46-e "witness-roller" — the fleet's first CROSS-CHAIN
// witness rollup.
//
// Walks EVERY chain the fleet owns (remote chains fetched at pinned commit
// shas and labeled LIVE; local checkout files labeled FIXTURE), emits ONE
// witness receipt per chain using the wave-44 grammar, parent-chains them
// into ONE wave-46 witness chain, then verifies that chain with the
// UNMODIFIED wave-44 module (in-process AND via the wave-44 verify.mjs CLI).
// Exit 0 IFF every target verified AND the wave-46 chain verifies.
//
// GENESIS note: wave-44 verifyChain requires receipt 0's parent to be the
// literal "GENESIS" sentinel (a 64-hex parent fails), so the wave-44 KAT tip
// e4226c88… cannot be used AS the parent field; instead row 1 is a receipt
// ABOUT the KAT chain (output_sha256 = the KAT tip) — the wave-44 tip is
// anchored BY CONTENT. See claims.json genesis_note.
//
// Usage:
//   node rollup.mjs                      # official run: LIVE fetches, out=receipts/
//   node rollup.mjs --out=<dir>          # write receipts elsewhere (repro runs)
//   node rollup.mjs --offline            # replay from <out>/fetched/ (no network)
//   node rollup.mjs --quiet              # human lines only on stderr
//
// Receipt template (per the 46-e brief):
//   claim="chain X verified at tip T over N links by walker W at time S"
//   inputs_sha256 = sha256 of the chain/artifact bytes actually read
//   output_sha256 = chain tip (chains) / deterministic verdict digest (artifacts)
//   parent = id(previous receipt) | "GENESIS";  ts = wall-clock ISO-8601
//
// Fail-closed: any target failure => NO chain is emitted, run receipt records
// the failure, exit 1. Tampered bytes never become witness receipts.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeReceipt, receiptId, verifyChain } from '../../wave44/witness-grammar/witness.mjs';
import {
  PINS, fetchPinned, sha256Hex,
  walkStoneBytes, walkWitnessBytes, walkArtifactBytes, walkFixturesBytes,
} from './walkers.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const WAVE44_VERIFY = path.join(HERE, '..', '..', 'wave44', 'witness-grammar', 'verify.mjs');
const WALKER = '46e-witness-roller';
const FLEET_HEAD = gitHead(REPO); // pinned checkout the FIXTURE targets read from

function gitHead(repoRoot) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch { return 'unknown'; }
}

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? path.resolve(outArg.slice(6)) : path.join(HERE, 'receipts');
const OFFLINE = argv.includes('--offline');
const QUIET = argv.includes('--quiet');
const say = (m) => { if (!QUIET) process.stderr.write(`${m}\n`); };

function readRepo(p) {
  return fs.readFileSync(path.join(REPO, p));
}

// ── walk every target ───────────────────────────────────────────────────────
async function walkAll() {
  const targets = [];
  const fetchedDir = path.join(OUT, 'fetched');
  const saveFetched = (id, basename, bytes) => {
    const d = path.join(fetchedDir, id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, basename), bytes);
    return path.join('fetched', id, basename);
  };
  const loadFetched = (id, basename) => fs.readFileSync(path.join(fetchedDir, id, basename));

  // 1. wave-44 KAT (FIXTURE, in-repo)
  {
    const pin = PINS.wave44Kat;
    const bytes = readRepo(pin.path);
    const w = walkWitnessBytes({ id: pin.id, bytes, expectTip: pin.expectTip, expectReceipts: pin.expectReceipts });
    targets.push({ pin, w, bytes, source: `${pin.label}:${pin.path}`, fetchReceipt: { mode: 'in-repo-fixture' } });
  }

  // 2-4. remote stone-v1 chains (LIVE at pinned shas)
  for (const pin of [PINS.qtheEq10, PINS.qtheEq6, PINS.pongBirthSeal]) {
    let bytes, fetchReceipt, savedAs = null;
    if (OFFLINE) {
      bytes = loadFetched(pin.id, path.basename(pin.path));
      fetchReceipt = { mode: 'replay-fixture', savedAs, note: 'offline replay of the LIVE bytes saved by the official run' };
    } else {
      const r = await fetchPinned(pin.rawUrl);
      if (r.status !== 200) {
        targets.push({ pin, w: { id: pin.id, ok: false, why: `pinned raw fetch -> HTTP ${r.status}` }, bytes: null, source: pin.rawUrl, fetchReceipt: { mode: 'live', url: pin.rawUrl, status: r.status } });
        continue;
      }
      bytes = r.bytes;
      savedAs = saveFetched(pin.id, path.basename(pin.path), bytes);
      fetchReceipt = { mode: 'live', url: pin.rawUrl, pinnedSha: pin.sha, status: r.status, bytesSha256: r.sha256, bytesMatchPin: r.sha256 === pin.expectBytesSha256, savedAs };
    }
    const w = walkStoneBytes({ id: pin.id, bytes, expectTip: pin.expectTip, expectLinks: pin.expectLinks });
    w.bytesMatchPin = fetchReceipt.bytesMatchPin ?? sha256Hex(bytes) === pin.expectBytesSha256;
    if (pin.fixture) {
      const fixtureBytes = readRepo(pin.fixture);
      w.fixtureByteEqual = sha256Hex(fixtureBytes) === sha256Hex(bytes);
      w.why = w.ok && !w.fixtureByteEqual ? 'chain verified but live bytes differ from the committed fixture' : w.why;
    }
    w.ok = w.ok === true && w.bytesMatchPin === true && (pin.fixture ? w.fixtureByteEqual === true : true);
    targets.push({ pin, w, bytes, source: OFFLINE ? `replay:${pin.path}` : pin.rawUrl, fetchReceipt });
  }

  // 5. tavern round-11 ledger (FIXTURE, local checkout pinned by bytes+git blob)
  {
    const pin = PINS.tavernRound11;
    const bytes = readRepo(pin.path);
    const w = walkStoneBytes({ id: pin.id, bytes, expectTip: pin.expectTip, expectLinks: pin.expectLinks });
    w.bytesMatchPin = sha256Hex(bytes) === pin.expectBytesSha256;
    const blob = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`, 'utf8')).update(bytes).digest('hex');
    w.gitBlobMatchesPin = blob === pin.gitBlob;
    w.ok = w.ok === true && w.bytesMatchPin && w.gitBlobMatchesPin;
    targets.push({ pin, w, bytes, source: `FIXTURE:fleet-seeds@${FLEET_HEAD.slice(0, 12)}:${pin.path}`, fetchReceipt: { mode: 'in-repo-fixture', gitBlob: blob } });
  }

  // 6-7. crab-traps artifacts + pre-registration bindings (LIVE at pinned shas)
  for (const pin of [PINS.crabTraps45c, PINS.crabTraps44a]) {
    let artifactBytes, predictionsBytes, fetchReceipt, savedAs = null;
    if (OFFLINE) {
      artifactBytes = loadFetched(pin.id, path.basename(pin.artifactPath));
      predictionsBytes = loadFetched(pin.id, path.basename(pin.predictionsPath));
      fetchReceipt = { mode: 'replay-fixture', note: 'offline replay of the LIVE bytes saved by the official run' };
    } else {
      const [a, p] = [await fetchPinned(pin.artifactRawUrl), await fetchPinned(pin.predictionsRawUrl)];
      if (a.status !== 200 || p.status !== 200) {
        targets.push({ pin, w: { id: pin.id, ok: false, why: `pinned fetch -> artifact HTTP ${a.status}, predictions HTTP ${p.status}` }, bytes: null, source: pin.artifactRawUrl, fetchReceipt: { mode: 'live', statuses: [a.status, p.status] } });
        continue;
      }
      artifactBytes = a.bytes; predictionsBytes = p.bytes;
      savedAs = [saveFetched(pin.id, path.basename(pin.artifactPath), artifactBytes), saveFetched(pin.id, path.basename(pin.predictionsPath), predictionsBytes)];
      fetchReceipt = {
        mode: 'live', artifactUrl: pin.artifactRawUrl, predictionsUrl: pin.predictionsRawUrl,
        pinnedSha: pin.sha, status: [a.status, p.status],
        artifactBytesSha256: a.sha256, artifactBytesMatchPin: a.sha256 === pin.expectArtifactSha256,
        predictionsBytesSha256: p.sha256, predictionsBytesMatchPin: p.sha256 === pin.expectPredictionsSha256,
        savedAs,
      };
    }
    const w = walkArtifactBytes({ id: pin.id, artifactBytes, predictionsBytes, expectArtifactSha256: pin.expectArtifactSha256, expectPredictionsSha256: pin.expectPredictionsSha256 });
    const fr = fetchReceipt;
    if (fr.artifactBytesMatchPin !== undefined) w.ok = w.ok === true && fr.artifactBytesMatchPin && fr.predictionsBytesMatchPin;
    else w.ok = w.ok === true && sha256Hex(artifactBytes) === pin.expectArtifactSha256 && sha256Hex(predictionsBytes) === pin.expectPredictionsSha256;
    targets.push({ pin, w, bytes: artifactBytes, source: OFFLINE ? `replay:${pin.artifactPath}` : pin.artifactRawUrl, fetchReceipt });
  }

  // 8. fleet fixtures manifest (FIXTURE)
  {
    const pin = PINS.fleetFixtures;
    const files = pin.files.map((f) => ({ ...f, bytes: readRepo(f.path) }));
    const w = walkFixturesBytes({ id: pin.id, files });
    targets.push({ pin, w, bytes: null, source: `FIXTURE:fleet-seeds@${FLEET_HEAD.slice(0, 12)}:${pin.dir}/`, fetchReceipt: { mode: 'in-repo-fixture', files: pin.files.map((f) => f.path) } });
  }

  return targets;
}

// ── receipt emission ────────────────────────────────────────────────────────
function buildReceipts(targets) {
  const short = (h) => String(h).slice(0, 12) + '…';
  let parent = 'GENESIS';
  const receipts = [];
  const add = (claim, inputs, output) => {
    const r = makeReceipt({ claim, inputs_sha256: inputs, output_sha256: output, parent, ts: new Date().toISOString() });
    parent = receiptId(r);
    receipts.push(r);
  };
  for (const { pin, w } of targets) {
    const ts = new Date().toISOString();
    if (pin.kind === 'witness-chain') {
      add(`wave-46 cross-chain rollout anchor: wave-44 witness-grammar KAT chain (5 receipts) verified at tip ${w.tip} over ${w.receipts} receipts by walker ${WALKER} (${pin.label}) at ${ts}`,
        w.bytesSha256, w.tip);
    } else if (pin.kind === 'stone-v1' && pin.label === 'LIVE') {
      const extra = pin.fixture ? (w.fixtureByteEqual ? ', live bytes byte-equal to the committed fixture' : ', FIXTURE MISMATCH') : '';
      const era = pin.eraReceipt ? `; ${pin.eraReceipt}` : '';
      add(`chain ${pin.id} (LIVE @ ${pin.repo} ${pin.sha} ${pin.path}${extra}) verified at tip ${w.tip} over ${w.links} links by walker ${WALKER} (stone-v1) at ${ts}${era}`,
        w.bytesSha256, w.tip);
    } else if (pin.kind === 'stone-v1') {
      add(`chain ${pin.id} (${pin.label} fleet-seeds@${FLEET_HEAD} ${pin.path}, git blob ${pin.gitBlob}) verified at tip ${w.tip} over ${w.links} rows by walker ${WALKER} (stone-v1) at ${ts}`,
        w.bytesSha256, w.tip);
    } else if (pin.kind === 'artifact+pre-registration-binding') {
      add(`artifact ${pin.id} (LIVE @ ${pin.repo} ${pin.sha} ${pin.artifactPath}) verified: pre-registration binding intact (predictions ${pin.predictionsPath} byte-sha ${short(w.detail.predictions_sha256)} matches embedded + pinned) by walker ${WALKER} at ${ts}`,
        w.detail.artifact_sha256, w.digest);
    } else if (pin.kind === 'fixture-manifest') {
      add(`fixture set ${pin.id} (${pin.label} fleet-seeds tools/fixtures/, ${w.entries.length} files) verified: every file matches its pinned sha256 (qthe e_q6 chain, pong birth-seal, rekor ECDSA entry, moth-42b raw bits) by walker ${WALKER} at ${ts}`,
        w.manifest_sha256, w.digest);
    }
  }
  return receipts;
}

// ── main ────────────────────────────────────────────────────────────────────
const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const runAt = new Date().toISOString();
  const targets = await walkAll();

  const summary = targets.map(({ pin, w, source, fetchReceipt }) => ({
    id: pin.id, kind: pin.kind, source, label: pin.label,
    ok: w.ok, why: w.why ?? null,
    links: w.links ?? w.receipts ?? null, tip: w.tip ?? null,
    bytesSha256: w.bytesSha256 ?? w.detail?.artifact_sha256 ?? null,
    output: w.tip ?? w.digest ?? null,
    detail: w.detail ?? null, extra: {
      bytesMatchPin: w.bytesMatchPin, fixtureByteEqual: w.fixtureByteEqual, gitBlobMatchesPin: w.gitBlobMatchesPin,
    },
    fetchReceipt,
  }));

  const allOk = summary.every((s) => s.ok === true);
  const provenance = {
    grammar: { module: 'playtest/wave44/witness-grammar/witness.mjs', sha256: sha256Hex(fs.readFileSync(path.join(HERE, '..', '..', 'wave44', 'witness-grammar', 'witness.mjs'))) },
    stoneWalker: { module: 'tools/lib/stone-v1.mjs', sha256: sha256Hex(fs.readFileSync(path.join(REPO, 'tools', 'lib', 'stone-v1.mjs'))) },
    fleetAdapter: { module: 'playtest/wave46/witness-rollout/walkers.mjs', sha256: sha256Hex(fs.readFileSync(path.join(HERE, 'walkers.mjs'))) },
    claimsSha256: sha256Hex(fs.readFileSync(path.join(HERE, 'claims.json'))),
    fleetHead: FLEET_HEAD, node: process.version,
  };

  if (!allOk) {
    const failed = summary.filter((s) => !s.ok);
    const receipt = { tool: 'fleet-seeds/playtest/wave46/witness-rollout/rollup.mjs', lane: '46-e witness-roller', run_at: runAt, mode: OFFLINE ? 'offline-replay' : 'live', all_ok: false, provenance, targets: summary, failed: failed.map((f) => ({ id: f.id, why: f.why })), note: 'FAIL-CLOSED: no wave-46 chain emitted.' };
    fs.writeFileSync(path.join(OUT, 'run-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    for (const f of failed) say(`FAIL ${f.id}: ${f.why}`);
    say(`rollup: ${failed.length}/${summary.length} targets FAILED — no chain emitted (fail-closed)`);
    process.exit(1);
  }

  // build the wave-46 chain
  const receipts = buildReceipts(targets);
  const chainText = receipts.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const chainPath = path.join(OUT, 'rollup-chain.jsonl');
  const tipPath = path.join(OUT, 'rollup-chain.tip');
  fs.writeFileSync(chainPath, chainText);
  const tip = receiptId(receipts[receipts.length - 1]);
  fs.writeFileSync(tipPath, tip + '\n');

  // verify with the UNMODIFIED wave-44 grammar: in-process + CLI subprocess
  const libVerdict = verifyChain(receipts, { expectTip: tip });
  const cli = spawnSync(process.execPath, [WAVE44_VERIFY, chainPath, `--expect-tip=${tip}`], { encoding: 'utf8' });
  let cliVerdict = null;
  try { cliVerdict = JSON.parse(cli.stdout.trim().split('\n').pop()); } catch { /* non-JSON */ }

  const chainOk = libVerdict.ok === true && cli.status === 0 && cliVerdict?.ok === true && cliVerdict?.tip === tip;
  const receipt = {
    tool: 'fleet-seeds/playtest/wave46/witness-rollout/rollup.mjs',
    lane: '46-e witness-roller',
    run_at: runAt, mode: OFFLINE ? 'offline-replay' : 'live',
    all_ok: allOk && chainOk,
    provenance,
    targets: summary,
    chains_verified: summary.length,
    wave46_chain: {
      file: path.relative(HERE, chainPath), receipts: receipts.length, tip,
      tipFile: path.relative(HERE, tipPath),
      genesis: 'GENESIS (row 1 anchors the wave-44 KAT tip by content: output_sha256 = e4226c88…)',
      grammar_lib_verdict: libVerdict,
      wave44_cli: { cmd: `node ${path.relative(HERE, WAVE44_VERIFY)} ${path.relative(HERE, chainPath)} --expect-tip=<tip>`, exit: cli.status, verdict: cliVerdict },
    },
  };
  fs.writeFileSync(path.join(OUT, 'run-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');

  for (const s of summary) say(`${s.ok ? 'ok  ' : 'FAIL'} ${s.id} [${s.label}] links=${s.links ?? '-'} tip=${s.tip ? String(s.tip).slice(0, 12) + '…' : (s.output ? String(s.output).slice(0, 12) + '…' : '-')}`);
  say(`wave-46 rollup chain: ${receipts.length} receipts, tip ${tip.slice(0, 12)}…`);
  say(`wave-44 verify CLI: exit ${cli.status} ok=${cliVerdict?.ok}`);
  say(allOk && chainOk ? 'rollup: PASS (exit 0)' : 'rollup: FAIL (exit 1)');
  process.exit(allOk && chainOk ? 0 : 1);
};

main().catch((e) => { say(`rollup: ${e.stack || e.message}`); process.exit(2); });
