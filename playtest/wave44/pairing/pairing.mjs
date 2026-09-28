// pairing.mjs — Plain Bob method schedule as a fair-rotation pairing policy.
//
// ADOPTION: SuperInstance/ropesight (bells/methods.mjs, pinned commit
// d8b1bb40fd9f797ab96b5b544bf05302fcefcdee), whose plainCourseTokens is the
// schedule primitive. Wave-43-b measured on ropesight's own code: a Plain Bob
// Minor plain course covers ALL 30 ordered adjacent pairs of 6 participants
// EXACTLY 10 times each (max/min = 1.0) vs a 60-row cyclic round-robin
// covering only 6 pairs. This module reimplements that derivation as a
// self-contained, stdlib-only, zero-coordinator pairing instrument for the
// fleet, and run.mjs cross-checks it byte-equal against the pinned clone.
//
// CONVENTIONS (ropesight's, fixed here too):
//   - positions and participants are 0-based internally; rows render 1-based.
//   - a ROW r is an array where r[i] = participant occupying position i.
//   - a CHANGE c is an array where c[i] = the source position feeding
//     position i: next[i] = row[c[i]].
//   - every change is a product of disjoint ADJACENT transpositions
//     (ropesight seed L49): no participant moves more than one place per
//     round — the property that makes the schedule locally executable with
//     zero coordinator.
//
// NO NETWORK. NO FLOATS in the algebra (all integers). Node 24, ESM.

/** rounds row: participant i in position i. */
export const rounds = (n) => Array.from({ length: n }, (_, i) => i);

/** applyChange: global application of change c to row r. */
export const applyChange = (r, c) => r.map((_, i) => r[c[i]]);

/** parse place-notation token -> set of 0-based fixed places.
 *  'x' = cross (no fixed places, even stages only); '16' = places 1,6. */
export function fixedPlaces(token, n) {
  if (token === 'x') {
    if (n % 2 === 1) throw new Error(`'x' illegal on odd stage ${n}`);
    return new Set();
  }
  const fixed = new Set();
  for (const ch of token) {
    const p = Number(ch);
    if (!(p >= 1 && p <= n)) throw new Error(`place ${ch} out of range for stage ${n}`);
    fixed.add(p - 1);
  }
  return fixed;
}

/** makeChange(n, token): product of disjoint ADJACENT transpositions;
 *  unnamed positions pair up consecutively (1-2, 3-4, ...). */
export function makeChange(n, token) {
  const fixed = fixedPlaces(token, n);
  const c = rounds(n);
  for (let i = 0; i < n; i++) {
    if (fixed.has(i) || c[i] !== i) continue;
    if (i + 1 < n && !fixed.has(i + 1) && c[i + 1] === i + 1) {
      c[i] = i + 1; c[i + 1] = i; i++;
    } else {
      throw new Error(`token '${token}' leaves position ${i + 1} unpaired on stage ${n}`);
    }
  }
  return c;
}

/** One lead of Plain Bob on n bells, as notation tokens (ropesight's
 *  derivation): plain hunt with 2nds made at the lead end.
 *  Lead length = 2n changes; plain course = (n-1) leads = 2n(n-1) changes.
 *  n=3 is the extent itself: the plain hunt cycle IS the extent. */
export function plainBobLeadTokens(n) {
  if (n === 3) return Array.from({ length: 2 * n }, (_, i) => (i % 2 === 0 ? '3' : '1'));
  const up = n % 2 === 0 ? 'x' : String(n);
  const down = n % 2 === 0 ? '1' + String(n) : '1';
  const hunt = [];
  for (let i = 0; i < 2 * n - 1; i++) hunt.push(i % 2 === 0 ? up : down);
  const le = n % 2 === 1 ? [1, 2, n] : [1, 2];
  return [...hunt, le.join('')];
}

/** Token list for the plain course (no calls) on n participants. */
export function plainCourseTokens(n) {
  const lead = plainBobLeadTokens(n);
  const leads = n === 3 ? 1 : n - 1;
  const tokens = [];
  for (let L = 0; L < leads; L++) {
    for (const t of lead) tokens.push(makeChange(n, t));
  }
  return tokens;
}

/** Walk a token list from rounds. Returns rows r_0..r_L (incl. the return to
 *  rounds) and maxMove (ropesight L49: must stay <= 1). */
export function walkCourse(tokens, n) {
  const rows = [rounds(n)];
  let row = rounds(n);
  let maxMove = 0;
  for (const tok of tokens) {
    const next = applyChange(row, tok);
    for (let b = 0; b < n; b++) {
      const d = Math.abs(next.indexOf(b) - row.indexOf(b));
      if (d > maxMove) maxMove = d;
    }
    row = next;
    rows.push(row);
  }
  return { rows, maxMove };
}

/** THE SCHEDULE: plain-course rows r_0..r_{period-1} for n participants,
 *  with verified facts (period, truth, closure, maxMove). */
export function plainBobSchedule(n) {
  const tokens = plainCourseTokens(n);
  const { rows, maxMove } = walkCourse(tokens, n);
  let period = -1;
  for (let k = 1; k < rows.length; k++) {
    if (rows[k].every((b, i) => b === i)) { period = k; break; }
  }
  const seen = new Set(rows.slice(0, period).map((r) => r.join(',')));
  return {
    n,
    rows: rows.slice(0, period),
    period,
    tokens: tokens.length,
    true: seen.size === period,
    closed: period === tokens.length,
    maxMove,
  };
}

/** Meetings of every ordered adjacent pair over a row sequence. */
export function adjacentPairMeetings(rows) {
  const m = new Map(); // "a>b" -> count
  const at = new Map(); // "a>b" -> [rows]
  rows.forEach((r, t) => {
    for (let i = 0; i + 1 < r.length; i++) {
      const key = `${r[i]}>${r[i + 1]}`;
      m.set(key, (m.get(key) || 0) + 1);
      if (!at.has(key)) at.set(key, []);
      at.get(key).push(t);
    }
  });
  return { m, at };
}

/** Coverage stats over all n*(n-1) ordered pairs: uniformity + max wait. */
export function pairStats(rows, n) {
  const { m, at } = adjacentPairMeetings(rows);
  const totalPairs = n * (n - 1);
  const counts = [];
  const never = [];
  let maxWait = 0;
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a === b) continue;
      const key = `${a}>${b}`;
      const c = m.get(key) || 0;
      if (c === 0) never.push(key);
      else {
        counts.push(c);
        const rs = at.get(key);
        for (let i = 1; i < rs.length; i++) {
          maxWait = Math.max(maxWait, rs[i] - rs[i - 1]);
        }
      }
    }
  }
  const min = counts.length ? Math.min(...counts) : 0;
  const max = counts.length ? Math.max(...counts) : 0;
  // maxWait per claims.json: max rows BETWEEN consecutive meetings (strictly
  // between, i.e. distance - 1 — the same internal-gap metric as wave-43-b's
  // M4). maxWaitDistance is the raw distance reading, reported alongside.
  const maxWaitDistance = Math.max(maxWait, 0);
  return {
    totalPairs, coveredPairs: counts.length, neverPairs: never.length,
    never: never.slice(0, 10), min, max, ratio: min > 0 ? max / min : Infinity,
    maxWait: Math.max(maxWaitDistance - 1, 0), maxWaitDistance,
    meetingsTotal: rows.length * (n - 1),
  };
}

/** Round-robin baseline: cyclic rotation r_t[i] = (i+t) mod n, L rows. */
export function roundRobinRows(n, L) {
  const rows = [];
  for (let t = 0; t < L; t++) {
    rows.push(Array.from({ length: n }, (_, i) => (i + t) % n));
  }
  return rows;
}

export const rowString = (r) => r.map((b) => b + 1).join('');

// CLI: node pairing.mjs --n=6
if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=6').slice(4));
  const s = plainBobSchedule(n);
  const st = pairStats(s.rows, n);
  console.log(`n=${n} period=${s.period} tokens=${s.tokens} true=${s.true} closed=${s.closed} maxMove=${s.maxMove}`);
  console.log(`coverage: ${st.coveredPairs}/${st.totalPairs} ordered pairs, min=${st.min} max=${st.max} ratio=${st.ratio} maxWait=${st.maxWait} never=${st.neverPairs}`);
}
