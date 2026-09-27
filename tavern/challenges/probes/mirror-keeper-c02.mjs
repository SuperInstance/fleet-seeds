// C3-mirror-keeper-02 — probe for the tavern (run from fleet-seeds root).
//
// Two claims about the keeper's own sealed artifacts, tested with the
// fleet's arithmetic:
//  (1) the round-one..two ledger re-verifies from disk under stone-v1:
//      12 links, tip 3f173f7db384ea4a02cbb9677f9cb6921b44805ac580c464ba7d66edb03e0611;
//  (2) the jukebox is deterministic given the record: two consecutive renders
//      of fleet_rhythm.wav are byte-identical (sha256 equal). The on-disk wav
//      is backed up and restored byte-for-byte, so the probe leaves the
//      tavern exactly as it found it.
//
// Exit 0 pass / 1 fail. Runtime ~6s (two ~3s renders), well under the house 120s.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyChain } from '../../../../quilt-stone/stone.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS = path.resolve(__dirname, '..', '..', '..'); // fleet-seeds root
const TAVERN = path.join(SEEDS, 'tavern');
const LEDGER = path.join(TAVERN, 'tavern_ledger.jsonl');
const WAV = path.join(TAVERN, 'fleet_rhythm.wav');
const EXPECT_TIP = '3f173f7db384ea4a02cbb9677f9cb6921b44805ac580c464ba7d66edb03e0611';

const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// (1) ledger
const rows = fs.readFileSync(LEDGER, 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const ledger = verifyChain(rows);

// (2) jukebox determinism — render twice, compare, restore the original wav
const backup = path.join(os.tmpdir(), `tavern-wav-backup-${process.pid}.wav`);
fs.copyFileSync(WAV, backup);
let r1, r2;
try {
  execSync('python3 jukebox.py', { cwd: TAVERN, stdio: 'ignore' });
  r1 = sha256(WAV);
  execSync('python3 jukebox.py', { cwd: TAVERN, stdio: 'ignore' });
  r2 = sha256(WAV);
} finally {
  fs.copyFileSync(backup, WAV); // byte-for-byte restore
  fs.unlinkSync(backup);
}

const verdict = {
  challenge: 'C3-mirror-keeper-02',
  ledger: { file: 'tavern/tavern_ledger.jsonl', ok: ledger.ok, alg: ledger.alg, genesis: ledger.genesis, links: ledger.links, tip: ledger.tip, expect_tip: EXPECT_TIP, tip_ok: ledger.tip === EXPECT_TIP },
  jukebox: { render1_sha256: r1, render2_sha256: r2, identical: r1 === r2, wav_restored: sha256(WAV) },
  pass: ledger.ok === true && ledger.links === 12 && ledger.tip === EXPECT_TIP && r1 === r2,
};
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.pass ? 0 : 1);
