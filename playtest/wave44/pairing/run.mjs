// run.mjs — 44-b pairing experiment: pre-registered claims P1-P4
// (pairing/claims.json, sha256 ca8c7567c21e655fe3a714d8e0751833241c10ec8ea68c7b15230eb3aa3d5535,
// mtime 1790545604 — registered BEFORE this run).
//
// Cross-checks the reimplementation against the PINNED ropesight clone
// (RS_PATH env var, default /home/z/my-project/pt44b-rs) — their files are
// only READ (imported), never modified.
//
// Usage: node run.mjs   (writes results.json + prints summary)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {
  plainBobSchedule, pairStats, roundRobinRows, rowString,
} from './pairing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RS_PATH = process.env.RS_PATH || '/home/z/my-project/pt44b-rs';

// pinned source import (READ-ONLY)
const rs = await import(pathToFileURL(path.join(RS_PATH, 'bells', 'methods.mjs')).href);
const pinnedCommit = execSync(`git -C ${RS_PATH} rev-parse HEAD`).toString().trim();
const cloneStatus = execSync(`git -C ${RS_PATH} status --porcelain`).toString().trim() || '(clean)';

// ── P4: fidelity cross-check vs ropesight METHODS table (N=3,5,6,7,8) ───────
const RS_METHODS = {
  'Extent on Three': 3, 'Plain Bob Doubles': 5, 'Plain Bob Minor': 6,
  'Plain Bob Triples': 7, 'Plain Bob Major': 8,
};
const cross = [];
for (const [name, n] of Object.entries(RS_METHODS)) {
  // their courseFacts().rows is period-sliced (r_0..r_{period-1}) — the same
  // window my plainBobSchedule returns; compare those directly.
  const theirs = rs.courseFacts(name).rows.map(rowString);
  const mine = plainBobSchedule(n).rows.map(rowString);
  cross.push({ name, n, byteEqual: theirs.length === mine.length && theirs.every((r, i) => r === mine[i]),
    theirsRows: theirs.length, mineRows: mine.length });
}

// move-law + coverage for every stage tested (informational for N=3,4,8)
const allStages = {};
for (const n of [3, 4, 5, 6, 7, 8]) {
  const s = plainBobSchedule(n);
  const st = pairStats(s.rows, n);
  allStages[n] = {
    period: s.period, tokens: s.tokens, true: s.true, closed: s.closed,
    maxMove: s.maxMove, coverage: st,
  };
}

// ── P1/P2: N=6 method vs round-robin baseline ────────────────────────────────
// wait definition per claims.json ("max gap in rows BETWEEN consecutive
// meetings", matching wave-43-b's internal-gap metric): rows strictly between
// = distance - 1. Both readings are reported.
const s6 = plainBobSchedule(6);
const m6 = pairStats(s6.rows, 6);
const rr6 = pairStats(roundRobinRows(6, s6.rows.length), 6);
const p1pass = m6.coveredPairs === 30 && m6.min === 10 && m6.max === 10
  && rr6.coveredPairs === 6 && rr6.min === 50 && rr6.max === 50;
const p2pass = m6.maxWait <= 9; // maxWait IS the between-rows reading

// ── P3: generalization N=5, N=7 (real falsification risk) ────────────────────
const gen = {};
let p3pass = true;
for (const n of [5, 7]) {
  const s = plainBobSchedule(n);
  const st = pairStats(s.rows, n);
  gen[n] = { period: s.period, rows: s.rows.length, coverage: st };
  if (!(st.neverPairs === 0 && st.ratio <= 2.0)) p3pass = false;
}

const p4pass = cross.every((c) => c.byteEqual)
  && Object.values(allStages).every((a) => a.maxMove <= 1);

const results = {
  receipts: {
    ropesight_pinned_commit: pinnedCommit,
    ropesight_clone_git_status: cloneStatus,
    claims_file: {
      sha256: 'ca8c7567c21e655fe3a714d8e0751833241c10ec8ea68c7b15230eb3aa3d5535',
      mtime_epoch: 1790545604,
      note: 'pre-registered BEFORE any run',
    },
    node: process.version,
  },
  P1: { method: m6, roundRobin: rr6, methodRows: s6.rows.length, pass: p1pass },
  P2: { methodMaxWait: m6.maxWait, bound: 9, rrMaxWait: rr6.maxWait, pass: p2pass },
  P3: { generalization: gen, pass: p3pass },
  P4: { crossCheck: cross, allStages, pass: p4pass },
};

fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify(results, null, 2));

console.log(`ropesight pinned @ ${pinnedCommit.slice(0, 12)} (clone ${cloneStatus})`);
console.log('P4 cross-check vs clone:', cross.map((c) => `N=${c.n}:${c.byteEqual ? 'BYTE-EQUAL' : 'MISMATCH'}`).join(' '));
for (const [n, a] of Object.entries(allStages)) {
  const c = a.coverage;
  console.log(`N=${n} period=${a.period} maxMove=${a.maxMove} coverage ${c.coveredPairs}/${c.totalPairs} min=${c.min} max=${c.max} ratio=${c.ratio} maxWait=${c.maxWait}`);
}
console.log(`P1 (N=6 uniform 30/30 vs RR 6/30): ${p1pass ? 'PASS' : 'FAIL'}`);
console.log(`P2 (N=6 maxWait between-rows ${m6.maxWait} (distance ${m6.maxWaitDistance}) <= 9; RR wait ${rr6.maxWait}): ${p2pass ? 'PASS' : 'FAIL'}`);
console.log(`P3 (N=5 ratio ${gen[5].coverage.ratio}, N=7 ratio ${gen[7].coverage.ratio}, never: ${gen[5].coverage.neverPairs}/${gen[7].coverage.neverPairs}): ${p3pass ? 'PASS' : 'FAIL'}`);
console.log(`P4 (byte-equal + maxMove<=1): ${p4pass ? 'PASS' : 'FAIL'}`);
process.exit(p1pass && p2pass && p3pass && p4pass ? 0 : 1);
