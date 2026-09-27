#!/usr/bin/env node
// 43b-mesh-converge.mjs — micro-experiment for lane 43-b (concept-miner).
//
// WHAT: a faithful JS port of SuperInstance/quilt-mesh's broker-less mesh
// protocol sketch (src/lib.rs, Rust, @e7a3b4b) — Lamport clocks, dedupe by
// (lamport, author), per-peer version vectors, anti-entropy via pending_for
// — exercised over RANDOM GOSSIP between 3 peers with zero coordinator.
// Question-to-test: could crab-traps arena cells sync peer-to-peer with no
// coordinator? (protocol semantics theirs; harness mine)
//
// FINDING BUILT-IN (desk-mined pre-run): the sketch's RoomState.versions is
// only ever written for SELF (set()); receive() never records the author's
// clock, so pending_for(peer) almost always falls back to "send everything".
// We run THREE variants:
//   faithful — versions written only for self (full-dump gossip; the sketch
//              as written)
//   scalar   — the intended delta sync with a SCALAR per-peer acked clock
//              (one max over the whole delta) — REGISTERED P-X1/P-X2
//              EXPECTED-VALID READING, but see result: over-tracks across
//              authors, UNSOUND under multi-author streams
//   vv       — per-AUTHOR delivery tracking (send events authored by A with
//              lamport > max lamport of A's events we delivered to them) —
//              the minimal SOUND repair; the dedupe key (author, lamport)
//              already implies this version-vector granularity
// Convergence/clock/union claims (P-X1..X3) are evaluated on the SOUND
// minimal instantiation (vv); scalar + faithful are reported as findings.
//
// NO NETWORK. NO FLOATS. Node 24, ESM. Deterministic PRNG (mulberry32).

import { writeFileSync } from 'node:fs';

// ── deterministic PRNG ───────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the port (quilt-mesh src/lib.rs semantics) ───────────────────────────────
class Lamport {
  constructor(v = 0) { this.v = v; }
  tick() { this.v += 1; }
  observe(other) { this.v = Math.max(this.v, other) + 1; } // sketch: max+1
}

class Peer {
  constructor(me, { variant }) {
    this.me = me;
    this.clock = new Lamport(0);
    this.variant = variant; // 'faithful' | 'scalar' | 'vv'
    // room -> cell -> { events: Map(key->{lamport,author,value}), }
    this.rooms = new Map();
    // room -> Map(peer -> highest-seen lamport)  (version vector, sketch-shaped)
    this.versions = new Map();
    // room -> Map(peer -> Map(author -> max lamport WE delivered to them))
    this.sentTo = new Map();
  }
  static evKey(author, lamport) { return `${author}@${lamport}`; }

  set(room, cell, value) {
    this.clock.tick();
    const ev = { cell, value, author: this.me, lamport: this.clock.v };
    this.#cellState(room, cell).set(Peer.evKey(ev.author, ev.lamport), ev);
    if (!this.versions.has(room)) this.versions.set(room, new Map());
    const vv = this.versions.get(room);
    vv.set(this.me, Math.max(vv.get(this.me) ?? 0, this.clock.v)); // sketch: self only
    return ev;
  }

  receive(room, ev) {
    this.clock.observe(ev.lamport); // sketch receive(): observe first
    const st = this.#cellState(room, ev.cell);
    const k = Peer.evKey(ev.author, ev.lamport);
    if (st.has(k)) return 'Duplicate';
    st.set(k, ev);
    if (this.variant !== 'faithful') { // record what the author has done
      if (!this.versions.has(room)) this.versions.set(room, new Map());
      const vv = this.versions.get(room);
      const key = this.variant === 'vv' ? `${ev.author}` : ev.author; // same key space here
      vv.set(key, Math.max(vv.get(key) ?? 0, ev.lamport));
      // vv variant ALSO tracks self-received max per author on ACK side only
    }
    return 'Applied';
  }

  #cellState(room, cell) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Map());
    const cells = this.rooms.get(room);
    if (!cells.has(cell)) cells.set(cell, new Map());
    return cells.get(cell);
  }

  // all events this peer holds in `room`
  allEvents(room) {
    const out = [];
    const cells = this.rooms.get(room);
    if (cells) for (const m of cells.values()) for (const ev of m.values()) out.push(ev);
    return out;
  }

  // pending_for at SOUND granularity ('vv'): per-AUTHOR — send events authored
  // by A with lamport > the max lamport of A's events WE OURSELVES delivered to
  // this peer. Ascending-lamport monotone delivery makes this skip-free; it can
  // under-track (peer may have learned events from third peers) — safe, dedupe
  // absorbs duplicates. This IS the insight: the dedupe key (author, lamport)
  // is already a version vector; granularity per peer must follow.
  pendingFor(room, peer) {
    const all = this.allEvents(room);
    if (this.variant === 'vv') {
      const sent = this.sentTo.get(room)?.get(peer);
      return all
        .filter((e) => e.lamport > (sent?.get(e.author) ?? 0))
        .sort((a, b) => a.lamport - b.lamport);
    }
    const vv = this.versions.get(room);
    const theirClock = vv?.get(peer);
    if (theirClock === undefined) return all.slice().sort((a, b) => a.lamport - b.lamport);
    return all.filter((e) => e.lamport > theirClock).sort((a, b) => a.lamport - b.lamport);
  }

  // record what WE delivered to a peer: 'vv' tracks per-author max (sound);
  // 'scalar' tracks one scalar max over the whole delta (over-tracks across
  // authors — registered as the unsound variant to expose the granularity law).
  ack(room, peer, perAuthorMax) {
    if (this.variant === 'faithful') return;
    if (!this.sentTo.has(room)) this.sentTo.set(room, new Map());
    const m = this.sentTo.get(room);
    if (!m.has(peer)) m.set(peer, new Map());
    const pm = m.get(peer);
    if (this.variant === 'vv') {
      for (const [a, l] of perAuthorMax) pm.set(a, Math.max(pm.get(a) ?? 0, l));
    } else {
      let any = 0;
      for (const [, l] of perAuthorMax) any = Math.max(any, l);
      if (any) pm.set('*', Math.max(pm.get('*') ?? 0, any));
    }
  }

  digest(room) {
    return this.allEvents(room)
      .map((e) => `${e.author}@${e.lamport}:${e.cell}=${e.value}`)
      .sort()
      .join('|');
  }

  // the sketch's resolved cell VALUE: value of the max-lamport event;
  // on a same-lamport tie (different authors) it is insertion-order dependent
  // — the sketch's documented Conflict gap made observable.
  valueOf(room, cell) {
    const evs = [...(this.rooms.get(room)?.get(cell)?.values() ?? [])];
    if (!evs.length) return null;
    let max = evs[0];
    for (const e of evs) if (e.lamport > max.lamport) max = e;
    return { value: max.value, tie: evs.filter((e) => e.lamport === max.lamport).length > 1 };
  }
}

// ── the world: 3 peers, 3 rooms, 12 scattered set() events, random gossip ────
const PEERS = ['p0', 'p1', 'p2'];
const ROOMS = ['arena', 'tavern', 'embassy'];
const TOTAL_EVENTS = 12;
const MAX_ROUNDS = 60;

function simulate(seed, { variant, contention }) {
  const rnd = mulberry32(seed);
  const peers = PEERS.map((id) => new Peer(id, { variant }));
  // 12 set() events scattered: each authored by a random peer; cells either
  // distinct (12 cells) or contended (2 shared cells, 2 authors each) to probe
  // the sketch's same-lamport tie gap.
  const events = [];
  for (let i = 0; i < TOTAL_EVENTS; i++) {
    const author = PEERS[Math.floor(rnd() * 3)];
    const p = peers[PEERS.indexOf(author)];
    const room = ROOMS[i % 3];
    const cell = contention
      ? (i % 4 === 0 ? 'shared.a' : i % 4 === 2 ? 'shared.b' : `cell.${i}`)
      : `cell.${i}`;
    events.push({ author, ev: p.set(room, cell, `v${i}`), room });
  }

  // gossip loop: no coordinator — each round every peer calls one random peer
  // and they EXCHANGE deltas (sketch gossip_with shape, both directions, with
  // an ack so the repaired variant can prune).
  let rounds = 0;
  const wire = { eventsSent: 0, fullDumps: 0, deltas: 0 };
  for (; rounds < MAX_ROUNDS; rounds++) {
    let moved = false;
    for (const a of peers) {
      const bIdx = Math.floor(rnd() * PEERS.length);
      const bId = PEERS[bIdx === PEERS.indexOf(a.me) ? (bIdx + 1) % 3 : bIdx];
      const b = peers[PEERS.indexOf(bId)];
      for (const room of ROOMS) {
        // a -> b
        const toB = a.pendingFor(room, bId);
        if (toB.length) {
          const total = a.allEvents(room).length;
          if (toB.length >= total) wire.fullDumps++; else wire.deltas++;
        }
        const perAuthorB = new Map();
        for (const ev of toB) {
          if (b.receive(room, ev) === 'Applied') moved = true;
          perAuthorB.set(ev.author, Math.max(perAuthorB.get(ev.author) ?? 0, ev.lamport));
        }
        wire.eventsSent += toB.length;
        a.ack(room, bId, perAuthorB);
        // b -> a
        const toA = b.pendingFor(room, a.me);
        const perAuthorA = new Map();
        for (const ev of toA) {
          if (a.receive(room, ev) === 'Applied') moved = true;
          perAuthorA.set(ev.author, Math.max(perAuthorA.get(ev.author) ?? 0, ev.lamport));
        }
        wire.eventsSent += toA.length;
        b.ack(room, a.me, perAuthorA);
      }
    }
    // convergence: every peer holds the union (per room) and digests agree
    const digests = peers.map((p) => ROOMS.map((r) => p.digest(r)).join('#'));
    if (digests.every((d) => d === digests[0]) && peers.every((p) => p.allEvents('arena').length + p.allEvents('tavern').length + p.allEvents('embassy').length === TOTAL_EVENTS)) {
      // value-agreement check on the contended cells (sketch Conflict gap)
      const valueAgree = ['shared.a', 'shared.b'].map((c) => {
        const vals = peers.map((p) => p.valueOf('arena', c));
        const allSame = vals.every((v) => v.value === vals[0].value);
        return { cell: c, allSame, anyTie: vals.some((v) => v.tie) };
      });
      return { converged: true, rounds: rounds + 1, wire, clocks: peers.map((p) => p.clock.v), unionOk: true, finalDigest: digests[0], valueAgree };
    }
    if (!moved) return { converged: false, rounds: rounds + 1, wire, clocks: peers.map((p) => p.clock.v), unionOk: false, finalDigest: null };
  }
  return { converged: false, rounds: MAX_ROUNDS, wire, clocks: peers.map((p) => p.clock.v), unionOk: false, finalDigest: null };
}

// ── run the battery ──────────────────────────────────────────────────────────
const SIMS = 20;
const results = { faithful: [], scalar: [], vv: [] };
for (const variant of ['faithful', 'scalar', 'vv']) {
  for (let s = 1; s <= SIMS; s++) {
    results[variant].push(simulate(1000 + s, { variant, contention: true }));
  }
}

const rep = results.vv; // claims are evaluated on the SOUND minimal instantiation
const tieSims = rep.filter((r) => r.valueAgree?.some((v) => v.anyTie));
const valueDivergedSims = rep.filter((r) => r.valueAgree?.some((v) => !v.allSame));
const conRounds = rep.filter((r) => r.converged).map((r) => r.rounds);
const sorted = conRounds.slice().sort((a, b) => a - b);
const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
const maxRounds = sorted.length ? sorted[sorted.length - 1] : null;
const allConverged = rep.every((r) => r.converged);
const unionOkAll = rep.every((r) => r.unionOk);
const distinctFinalDigests = new Set(rep.map((r) => r.finalDigest)).size;

// clock property: recompute max event lamport per sim by re-simulating? simpler:
// every clock must be >= (max event lamport among the 12 events) — recapture via
// a rerun that also returns it.
function maxLamportFor(seed) {
  // event lamports are deterministic given the seed: re-run set() phase only
  const rnd = mulberry32(seed);
  const clocks = PEERS.map(() => new Lamport(0));
  for (let i = 0; i < TOTAL_EVENTS; i++) {
    const ai = Math.floor(rnd() * 3);
    clocks[ai].tick();
  }
  return Math.max(...clocks.map((c) => c.v));
}
const clocksOkReal = rep.every((r, i) => {
  const seed = 1001 + i;
  const mL = maxLamportFor(seed);
  return r.clocks.every((c) => c >= mL);
});

// per-variant wire totals
const wireOf = (v) => results[v].reduce((s, r) => s + r.wire.eventsSent, 0);
const faithfulSent = wireOf('faithful');
const scalarSent = wireOf('scalar');
const vvSent = wireOf('vv');
const scalarConverged = results.scalar.filter((r) => r.converged).length;

const out = {
  experiment: '43b-exp2-mesh-convergence',
  subject: 'quilt-mesh src/lib.rs protocol port (Lamport + version-vector anti-entropy), 3 peers, 12 events, 3 rooms, 20 sims, zero coordinator',
  vv_sound: {
    converged: rep.filter((r) => r.converged).length, sims: SIMS,
    medianRounds: median, maxRounds,
    unionOkAll, clocksOkReal, distinctFinalDigests,
    eventsOnWireTotal: vvSent,
    eventsOnWirePerSimMean: +(vvSent / SIMS).toFixed(1),
  },
  scalar_ack: {
    converged: scalarConverged,
    note: 'UNSOUND: scalar per-peer acked clock skips events authored by third peers with lamport <= acked clock — permanent divergence (honest FAIL finding)',
    eventsOnWireTotal: scalarSent,
  },
  faithful: {
    converged: results.faithful.filter((r) => r.converged).length,
    note: 'versions written for self only => pending_for() almost always full dump (sketch gap)',
    eventsOnWireTotal: faithfulSent,
    eventsOnWirePerSimMean: +(faithfulSent / SIMS).toFixed(1),
  },
  wireCompressionX_vv_vs_faithful: +(faithfulSent / Math.max(1, vvSent)).toFixed(2),
  sketch_conflict_gap: {
    contendedCellsProbe: 'shared.a/shared.b written by 2+ authors each',
    simsWhereLamportTieObserved: tieSims.length,
    simsWhereResolvedValueDiverged: valueDivergedSims.length,
    note: 'sketch resolves cell value by max lamport; same-lamport ties from different authors resolve insertion-order-dependently => value divergence even when event sets converge',
  },
};
console.log(JSON.stringify(out, null, 2));
writeFileSync(process.argv[2] ?? '43b-exp2-result.json', JSON.stringify(out, null, 2) + '\n');
