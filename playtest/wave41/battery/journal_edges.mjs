// journal_edges.mjs — lane 41-d payload edge battery over the FOREIGN repo's
// arch/journal.mjs + arch/persist.mjs (READ-ONLY imports). Builds four tiny
// journals whose payloads exercise serialization corners the 10k LCG stream
// does not reach, writes each as JSONL, and reports the JS-side verdict plus
// the stateHash, so the Python ref (journal_ref.py) can be run on the SAME
// files for the cross-substrate verdict.
import { mkdirSync, writeFileSync } from 'node:fs';
import { JournalFile, verifyJournalFile } from '/home/z/my-project/download/pt-quilt-arch/arch/persist.mjs';

const dir = new URL('.', import.meta.url).pathname;
mkdirSync(dir + 'journals', { recursive: true });

const cases = {
  // U: two token ids whose RELATIVE ORDER differs between JS .sort()
  //    (UTF-16 code units) and Python sorted() (code points):
  //    "\u{10000}" (surrogate pair, first unit 0xD800) vs "\uE000".
  U: [
    ['TokenAdd', { token: { id: '\u{10000}', boundary: [], curvature: 1n, invariant: 2, scale: 1n, orientation: [0n, 0n, 0n] } }],
    ['TokenAdd', { token: { id: '\uE000', boundary: [], curvature: 1n, invariant: 2, scale: 1n, orientation: [0n, 0n, 0n] } }],
    ['Delta', { gamma: 5n, eta: -5n }],
  ],
  // D: DEL (0x7F) inside an id — JSON.stringify leaves it RAW, Python
  //    json.dumps(ensure_ascii=False) escapes it as .
  D: [
    ['TokenAdd', { token: { id: 'ab', boundary: [], curvature: 0n, invariant: 1, scale: 1n, orientation: [0n, 0n, 0n] } }],
    ['Delta', { gamma: 1n, eta: 0n }],
  ],
  // S: lone surrogate in an id — JS well-formed JSON.stringify escapes it;
  //    Python re-serializes a lone surrogate raw and .encode('utf-8') raises.
  S: [
    ['TokenAdd', { token: { id: 'a\ud800b', boundary: [], curvature: 0n, invariant: 1, scale: 1n, orientation: [0n, 0n, 0n] } }],
  ],
  // N: ASCII baseline incl. a >2^53 plain number and -0 in payload
  //    (invariant is copied verbatim by applyEvent — NOT a Q32 op).
  N: [
    ['TokenAdd', { token: { id: 'plain', boundary: [], curvature: 0n, invariant: 9007199254740993, scale: 1n, orientation: [0n, 0n, 0n] } }],
    ['TokenAdd', { token: { id: 'negzero', boundary: [], curvature: 0n, invariant: -0, scale: 1n, orientation: [0n, 0n, 0n] } }],
  ],
};

const report = {};
for (const [name, events] of Object.entries(cases)) {
  const path = dir + 'journals/journal_' + name + '.jsonl';
  let jsError = null, rounds = null, stateHash = null, storedInvariant = null;
  try {
    const jf = new JournalFile(path, { fsyncEvery: 1 });
    for (const [kind, payload] of events) jf.append(kind, payload);
    if (name === 'N') storedInvariant = jf.journal.state.tokens.plain.invariant;
    rounds = { appended: jf.journal.events.length, inversionChecks: jf.journal.inversionChecks };
    stateHash = jf.journal.state ? null : null;
    jf.close();
  } catch (err) { jsError = String(err && err.message || err).slice(0, 140); }
  let verdict = null;
  if (!jsError) {
    const v = verifyJournalFile(path);
    verdict = { ok: v.ok, frames: v.frames, lines: v.lines, tornBytes: v.tornBytes };
  }
  report[name] = { jsError, rounds, verdict, storedInvariant };
  console.error('case ' + name + ': ' + JSON.stringify(report[name]));
}
writeFileSync(dir + 'journal_edges_report.json', JSON.stringify(report, null, 2));
console.log('WROTE journals in ' + dir + 'journals/ (U, D, S, N)');
