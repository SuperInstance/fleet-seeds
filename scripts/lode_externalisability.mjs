#!/usr/bin/env node
/**
 * lode_externalisability.mjs — fail-closed externalisability gate for sealed predictions.
 *
 * lode_validate.mjs checks that a registration is well-formed: schema, sha256, append-only.
 * This checks something different and harder: that the prediction is DECIDABLE BY A STRANGER.
 *
 * A prediction can be perfectly sealed, correctly hashed, schema-valid, have an explicit
 * FAIL event, and still be worth nothing — because satisfying it requires artifacts a
 * stranger cannot reach, or because the pass condition is satisfiable by bookkeeping
 * alone. The latter is the dangerous case: it looks rigorous and is vacuous.
 *
 * Four checks, all deterministic, all fail-closed:
 *
 *   E1 ANCHOR      the prediction names a public artifact an outsider could fetch
 *                  (a repo/path, a URL, a commit, or a named measurement procedure)
 *   E2 NO_VACUOUS_DENOMINATOR
 *                  the pass condition cannot be satisfied by shrinking its own
 *                  denominator ("at least half of the queue" where the queue can be empty)
 *   E3 NO_BOOKKEEPING_PASS
 *                  the pass condition is not satisfiable by writing the required field
 *                  and nothing else ("every registration carries a X statement")
 *   E4 EXPLICIT_FAIL
 *                  the prediction states an explicit failure condition
 *
 * Exit 0 = all mines pass. Exit 2 = at least one mine fails. Nothing partial.
 *
 * Usage:
 *   node lode_externalisability.mjs <path-to-mines.jsonl> [--json]
 *   node lode_externalisability.mjs --self-test
 */

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

/* ── the rule sets ────────────────────────────────────────────────────── */

// E1: an outsider needs a public handle. These are the ways a prediction can name one.
const ANCHOR_PATTERNS = [
  /\bhttps?:\/\//,                                  // any URL
  /\bSuperInstance\/[A-Za-z0-9_.-]+/,                // repo-qualified path
  /\b[a-z0-9-]+\/[a-z0-9_.-]+\.[a-z]{2,4}\b/,         // org/repo.ext style path
  /\bcommit [0-9a-f]{7,40}\b/i,                      // named commit
  /\bsha-?256\b/i,                                  // names its own hash
  /\bjsonl?\b/i,                                    // a named machine-readable artifact
  /\bPR #\d+\b/, /\bissue #\d+\b/,                   // a numbered, public handle
  /\bregistry\b/i, /\bledger\b/i, /\bseal\b/i,      // a named append-only record
  /\bmeasured against\b/i, /\bfrom the wire\b/i,    // an explicit measurement procedure
  /\bpublic(ly)? (reachable|available|fetchable)\b/i,
];

// E2: denominators the author controls, so the pass condition can be made vacuous.
const VACUOUS_DENOMINATOR = [
  /\bat least (one|1)\b/i,
  /\bat least half\b/i,
  /\bmost of\b/i,
  /\bmajority of\b/i,
  /\bevery\b[^.]{0,60}\bthat (exist|is present|are present)\b/i,
  /\bany (queue|set|batch) (is|remains) empty\b/i,
  /\b(if|when) (no|zero)\b[^.]{0,40}\bthen (PASS|pass|it passes)\b/i,
];

// E3: pass conditions satisfiable by writing a field and changing nothing else.
// This is the class an adversary named in 10/10 audits: satisfy the presence check,
// skip the substance.
const BOOKKEEPING_PASS = [
  /\bcarries? (a|an|the) [a-z_ ]{3,30}(statement|note|header|line|field|tag|marker)/i,
  /\bcites? (its|the|their|at least one)\b/i,
  /\bincludes? (a|an|the) [a-z_ ]{3,30}(citation|reference|statement|note)/i,
  /\bappend (a|an) (boilerplate|statement|note)/i,
  /\bnearest_prior\s*\+\s*delta\b/i,
  /\bheader carries\b/i,
  /\bis present\b/i,
  /\bare present\b/i,
  /\bexists?\b[^.]{0,40}\bby the end of\b/i,
];

// E4: an explicit failure event. A missing one is the most basic defect.
const FAIL_EVENT = [
  /\bFAIL event\b/i,
  /\bis the FAIL\b/i,
  /\bFAIL if\b/i,
  /\bfails? if\b/i,
  /\bcounts? as (a )?fail(ure)?\b/i,
  /\bFAIL\b/,
];

/* ── the checks ────────────────────────────────────────────────────────── */

function checkE1(text) {
  return ANCHOR_PATTERNS.some(re => re.test(text));
}
function checkE2(text) {
  return !VACUOUS_DENOMINATOR.some(re => re.test(text));
}
function checkE3(text) {
  return !BOOKKEEPING_PASS.some(re => re.test(text));
}
function checkE4(text) {
  return FAIL_EVENT.some(re => re.test(text));
}

export function audit(prediction) {
  const text = String(prediction || '');
  const checks = {
    E1_ANCHOR: checkE1(text),
    E2_NO_VACUOUS_DENOMINATOR: checkE2(text),
    E3_NO_BOOKKEEPING_PASS: checkE3(text),
    E4_EXPLICIT_FAIL: checkE4(text),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  return { decidable: failed.length === 0, checks, failed };
}

/* ── self-test: the linter must fail on known-bad and pass on known-good ── */

const SELFTEST = [
  // Should PASS: public anchor, fixed denominator, substance test, explicit fail.
  {
    name: 'good: anchored, fixed N, substance, explicit fail',
    pred: 'Within 14 days, SuperInstance/quilt-c must publish 3 signed git tags, each whose annotated message lists the commit sha256 of the source tree at tag time. A tag count below 3, or any tag whose recorded tree hash does not equal `make verify` output at that commit, is the FAIL event.',
    expect: true,
  },
  // Should FAIL: no public anchor, vacuous denominator, bookkeeping pass, no fail event.
  {
    name: 'bad: unanchored, vacuous, bookkeeping, no fail',
    pred: 'At least one lane registration carries a citation statement, and most briefs cite a lesson id.',
    expect: false,
  },
  // Should FAIL: bookkeeping pass (the exact class the 10/10 audit found).
  {
    name: 'bad: boilerplate-satisfiable pass with an explicit fail',
    pred: 'Through wave 62, at least three lane pre-registrations cite mine ids in PLANNING.md queue items, and every registration lacking a mine citation carries a nearest_prior + delta statement; a registration missing both is the FAIL event. Measured against PLANNING.md Round 60-62 refinements.',
    expect: false,
  },
  // Should FAIL: explicit fail event present but denominator is self-controlled.
  {
    name: 'bad: vacuous denominator ("at least half")',
    pred: 'In the wave-60 queue at least half the items cite a mine id; fewer than half is the FAIL event. Measured against PLANNING.md registry.jsonl.',
    expect: false,
  },
  // Should FAIL: no explicit failure condition at all.
  {
    name: 'bad: no explicit fail event',
    pred: 'The next 3 registrations in SuperInstance/fleet-seeds reference a prior mine id in their header and the sha256 is recorded in registry.jsonl for audit.',
    expect: false,
  },
];

function selfTest() {
  let failures = 0;
  for (const t of SELFTEST) {
    const r = audit(t.pred);
    const ok = r.decidable === t.expect;
    if (!ok) failures++;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${t.name}`);
    console.log(`         decidable=${r.decidable} expected=${t.expect} failed_checks=${r.failed.join(',') || 'none'}`);
  }
  console.log(failures === 0
    ? `\nselftest: ${SELFTEST.length}/${SELFTEST.length} legs correct`
    : `\nselftest: ${failures} leg(s) wrong — the linter is not trustworthy`);
  return failures === 0;
}

/* ── main ──────────────────────────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    process.exit(selfTest() ? 0 : 2);
  }
  const path = args.find(a => !a.startsWith('--'));
  if (!path || !existsSync(path)) {
    console.error('usage: lode_externalisability.mjs <mines.jsonl> [--json] | --self-test');
    process.exit(2);
  }
  const lines = readFileSync(path, 'utf8').split('\n').filter(l => l.trim());
  const mines = lines.map(l => JSON.parse(l));
  const asJson = args.includes('--json');

  const rows = mines.map(m => {
    const r = audit(m.prediction);
    // Integrity: the seal must still match the text, or the audit is meaningless.
    const sealOk = m.pred_sha256
      ? createHash('sha256').update(m.prediction).digest('hex') === m.pred_sha256
      : null;
    return { id: m.id, lane: m.lane, ...r, seal_intact: sealOk };
  });

  const externalisable = rows.filter(r => r.decidable).length;
  const n = rows.length;
  const verdict = externalisable === n ? 'ALL EXTERNALISABLE' : 'NOT EXTERNALLY DECIDABLE';

  if (asJson) {
    console.log(JSON.stringify({
      schema: 'lode/externalisability-audit@v1',
      mines: n, externalisable, verdict, rows,
    }, null, 2));
  } else {
    console.log('lode externalisability audit');
    console.log('='.repeat(78));
    console.log(`mines: ${n}   externally decidable: ${externalisable}   verdict: ${verdict}`);
    console.log('='.repeat(78));
    for (const r of rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
      const mark = r.decidable ? 'ok  ' : 'FAIL';
      const seal = r.seal_intact === null ? '' : (r.seal_intact ? ' seal:ok' : ' seal:BROKEN');
      console.log(`  [${mark}] ${r.id.padEnd(5)} ${(r.failed.join(',') || '-').padEnd(46)}${seal}`);
    }
    console.log('='.repeat(78));
    if (externalisable !== n) {
      console.log('');
      console.log('A prediction that fails E2 or E3 can be satisfied by bookkeeping alone.');
      console.log('A prediction that fails E1 cannot be decided by anyone outside the fleet.');
      console.log('Sealing is not the problem. Reachability of the pass condition is.');
    }
  }
  process.exit(externalisable === n ? 0 : 2);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
