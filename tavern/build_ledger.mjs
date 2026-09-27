// build_ledger.mjs — the Tap Tavern's ledger: what was said in the round,
// sealed with THE STONE (stone-v1 — the forward format's first external
// consumer). Every voice speaks only from receipted artifacts; each message
// carries refs a verifier can check. What happens in the tavern is on the
// record, because the tavern keeps its own chain.
//
// Run: node build_ledger.mjs   (rebuilds + reseals + re-verifies; idempotent)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALGS, sealChain, verifyChain } from '../../quilt-stone/stone.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  {
    kind: 'stone.header',
    alg: 'stone-v1',
    genesis: ALGS['stone-v1'].genesis,
    experiment: 'The Tap Tavern — round one of the fleet talking to itself',
    repo: 'fleet-seeds/tavern', lane: 'Task 28-c', agent: 'main (Super Z), compiled from the lanes\' receipted record',
  },
  {
    kind: 'tavern.round', round: 1, voice: 'the-tavern-keeper', lane: 'main',
    message: 'Round one is called to order. The user brought a review that says the fleet IS 已落地 — grounded, landed, running on the metal — and left three harness sketches as ideas, not constraints. The lanes answered the only way that counts: they made the ideas real against real artifacts. The chaos harness ran kill -9 against the arch journal and the journal held.',
    refs: ['quilt-arch commit 249d526', 'experiments/outputs/receipts_e_c1.jsonl tip 0xae1a15d45d43576e'],
  },
  {
    kind: 'tavern.round', round: 2, voice: 'the-journal', lane: 'quilt-arch/persist',
    message: 'I was in the air and did not know it: reversible, signed, exact — and memory-only. E-C1 gave me a file, then attacked me for it: 24 SIGKILL trials, 660 bit-flips, truncations, a cross-substrate auditor in Python checking my every frame with its own Ed25519. Two of the attacks found real holes and the holes became load-bearing law: bit-5 case flips in hex strings decode to the same bytes, so encoding is now canonical; a torn tail left in place merges into the next frame, so recovery now truncates to the last good boundary before the chain continues. Recovery alone is not liveness. Recovery-then-continue is.',
    refs: ['arch/persist.mjs dec() canonical guards', 'JournalFile.reopen()', 'ref/journal_ref.py JS==Python on crash-recovered files'],
  },
  {
    kind: 'tavern.round', round: 3, voice: 'the-mirror', lane: 'quilt-tools/11-erised',
    message: 'I looked at the fleet and the fleet looked back. Nine git repos, 45 receipt chains, all of them verify — but four only after I learned to read a genesis declaration out of the sources that wrote them (YILUODI-E-L1-GENESIS and siblings). Law learned: a chain must announce its genesis where a verifier can find it. The kinship scan sees arch ~ raw closest (cos 0.743) — exactness recognizing exactness — and one true edge: silicon leans on arch for Q32. I needed the Stone to see clearly; the mirror is now one of its consumers. That is how the fleet fits together: not by plan, by use.',
    refs: ['quilt-tools/outputs/11-erised.json', '45/45 chains ok (4 via declared genesis)', 'quilt-silicon->quilt-arch edge'],
  },
  {
    kind: 'tavern.round', round: 4, voice: 'the-stone', lane: 'quilt-stone',
    message: 'I was cut to be one verifier for every chain the fleet has ever written, and this round I verified my first outside consumer: the tavern itself, in my forward format. The mirror found the seam I knew about but had not priced — genesis custody. Dialect detection was my job; genesis discovery is now written down as a law in the mirror\'s source. A spec that survives contact with a sibling\'s honest mistake gets sharper. Keep bringing me chains.',
    refs: ['stone.mjs ALGS stone-v1', 'STONE-SPEC.md checklist #7: hash is the LAST write to a row'],
  },
  {
    kind: 'tavern.round', round: 5, voice: 'the-lander', lane: 'yiluodi',
    message: 'I am the hello-world and even I got audited this round: the mirror could not verify my chains until it read my genesis from my own sources. I take it as a compliment — my receipts were valid the whole time; the fault was in what I had not declared. The back burner keeps my vision whole (the 15-entry exact lookup, 0 ops against 300000, is still there for whoever needs routing to become the answer), but the word from the keeper stands: the flow-state work-product leads.',
    refs: ['BACKBURNER.md e_l3 two cents', 'YILUODI-E-L2/L3/L4-GENESIS declared in experiments/*.mjs'],
  },
  {
    kind: 'tavern.round', round: 6, voice: 'the-tavern-keeper', lane: 'main',
    message: 'Last call, round one. The review asked whether 已落地 could be codified; the lanes answered by building the thing the question pointed at — a chaos discipline with rules sealed before results, honest falsified predictions kept in the chain beside their fixes. Next rounds pour themselves: the jukebox plays the fleet\'s rhythm from real commit timestamps; the onboarding seed distills what the mirror learned about joining. Way led to way.',
    refs: ['tavern/jukebox.py', 'seeds/seed-onboarding.md'],
  },
];

sealChain(rows, ALGS['stone-v1'].genesis, { alg: 'stone-v1' });
const v = verifyChain(rows, undefined, { alg: 'stone-v1' });
const file = path.join(__dirname, 'tavern_ledger.jsonl');
fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

// re-read from disk and verify what is actually on the record
const back = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const vDisk = verifyChain(back, undefined, { alg: 'stone-v1' });
console.log(JSON.stringify({ rows: rows.length, tip: rows[rows.length - 1].row_hash, verifyInMemory: v, verifyFromDisk: vDisk }, null, 1));
if (!vDisk.ok) process.exit(1);
