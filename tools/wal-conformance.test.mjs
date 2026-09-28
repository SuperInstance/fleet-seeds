// wal-conformance.test.mjs — 45-d self-tests (node --test, offline, fast).
// The FULL matrix over the fleet fixtures is the CLI's job; these tests pin
// the port's semantics and the stone-as-WAL replay on tiny built chains.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WAL_GENESIS, walRecordSum, buildToyWal, replayWalEdl,
  stoneReplayWal, flipRowHashByte, structuralFlip,
} from './wal-conformance.mjs';
import { buildToyChain } from './truncate-audit.mjs'; // intra-lane reuse (45-d)
import { rowHash } from './lib/stone-v1.mjs';

const DELTAS = [
  { op: 'SPLICE', clipId: 'c1', at: 0, srcIn: 0, srcOut: 1000 },
  { op: 'TRIM', clipId: 'c1', srcIn: 100, srcOut: 900 },
  { op: 'PARK', clipId: 'c1' },
];

test('wal-edl recordSum port: chained, genesis-seeded, 32 hex chars', () => {
  const s1 = walRecordSum(WAL_GENESIS, 1, DELTAS[0]);
  const s1again = walRecordSum(WAL_GENESIS, 1, DELTAS[0]);
  const s2 = walRecordSum(s1, 2, DELTAS[1]);
  assert.equal(s1, s1again);
  assert.match(s1, /^[0-9a-f]{32}$/);
  assert.notEqual(s1, s2);
});

test('wal-edl replay port: fresh log applies all, not torn', () => {
  const { bytes } = buildToyWal(DELTAS);
  const r = replayWalEdl(bytes);
  assert.equal(r.torn, false);
  assert.equal(r.applied, 3);
  assert.equal(r.goodBytes, bytes.length);
});

test('wal-edl replay port: torn tail -> prefix + wal-edl-shaped reason', () => {
  const { bytes } = buildToyWal(DELTAS);
  const r = replayWalEdl(bytes.subarray(0, bytes.length - 3));
  assert.equal(r.torn, true);
  assert.equal(r.class, 'torn-tail');
  assert.equal(r.applied, 2);
  assert.match(r.reason, /^torn tail: \d+ byte\(s\) after last newline$/);
});

test('wal-edl replay port: corrupt sum/prev -> exact seq, apply-nothing past break', () => {
  const { bytes } = buildToyWal(DELTAS);
  const lines = bytes.toString('utf8').split('\n').filter(Boolean);
  const rec = JSON.parse(lines[1]);
  rec.sum = (rec.sum[0] === '0' ? '1' : '0') + rec.sum.slice(1);
  lines[1] = JSON.stringify(rec);
  const r = replayWalEdl(Buffer.from(lines.join('\n') + '\n', 'utf8'));
  assert.equal(r.class, 'checksum-mismatch');
  assert.equal(r.seq, 2);
  assert.equal(r.applied, 1);
  // prev flip -> chain-break (explicit-prev class; no stone equivalent, disclosed)
  const lines2 = bytes.toString('utf8').split('\n').filter(Boolean);
  const rec2 = JSON.parse(lines2[2]);
  rec2.prev = 'f' + rec2.prev.slice(1);
  lines2[2] = JSON.stringify(rec2);
  const r2 = replayWalEdl(Buffer.from(lines2.join('\n') + '\n', 'utf8'));
  assert.equal(r2.class, 'chain-break');
  assert.equal(r2.seq, 3);
  assert.equal(r2.applied, 2);
});

test('stone-as-WAL (mini jsonl): full clean, torn tail recovered to prefix with tornOk, corrupt exact seq', () => {
  const toy = buildToyChain({ floats: false });
  const bytes = Buffer.from(toy.jsonl, 'utf8');
  // wal-edl framing law: a record is durable once its newline lands. The toy
  // serialization has NO trailing newline -> the final record is non-durable
  // (torn tail) even though its bytes parse; the newline-terminated
  // serialization replays clean.
  const full = stoneReplayWal(bytes);
  assert.equal(full.torn, true);
  assert.equal(full.class, 'torn-tail');
  assert.equal(full.applied, toy.rows.length - 1);
  const terminated = stoneReplayWal(Buffer.concat([bytes, Buffer.from('\n')]));
  assert.equal(terminated.torn, false);
  assert.equal(terminated.applied, toy.rows.length);
  // torn tail: cut into the final (annotation) row
  const lastNl = bytes.lastIndexOf(0x0a);
  const lastStart = bytes[bytes.length - 1] === 0x0a
    ? bytes.subarray(0, lastNl).lastIndexOf(0x0a) + 1
    : lastNl + 1;
  const cut = lastStart + Math.floor((bytes.length - lastStart) / 2);
  const torn = stoneReplayWal(bytes.subarray(0, cut));
  assert.equal(torn.class, 'torn-tail');
  assert.equal(torn.applied, toy.rows.length - 1);
  assert.equal(torn.ok, false); // default: damage fails
  assert.equal(stoneReplayWal(bytes.subarray(0, cut), { tornOk: true }).ok, true);
  assert.match(torn.reason, /^torn tail: \d+ byte\(s\) after last newline$/);
  // corrupt: flip a row_hash hex char on row 1 -> checksum mismatch at seq 1
  const { bytes: patched } = flipRowHashByte(bytes, { frame: 'jsonl', ordinal: 1 });
  const r = stoneReplayWal(patched, { tornOk: true });
  assert.equal(r.class, 'checksum-mismatch');
  assert.equal(r.seq, 1);
  assert.equal(r.applied, 0);
  assert.equal(r.ok, false); // tornOk must NOT rescue mid-chain corruption
});

test('stone-as-WAL (document frame): parse-safe hash flip caught at explicit seq; structural -> 0 applied', () => {
  const rows = [
    { kind: 'stone.header', alg: 'stone-v1', seq: 0, note: 'h' },
    { kind: 'toy.op', seq: 1, n: 1 },
  ];
  rows[0].row_hash = rowHash(rows[0], 'STONE-GENESIS-1');
  rows[1].row_hash = rowHash(rows[1], rows[0].row_hash);
  const doc = Buffer.from(JSON.stringify(rows, null, 2), 'utf8'); // pretty = pong-like
  const full = stoneReplayWal(doc, { frame: 'document' });
  assert.equal(full.torn, false);
  assert.equal(full.applied, 2);
  // torn tail -> all-or-nothing: parse-break, 0 applied, tornOk must not rescue
  const torn = stoneReplayWal(doc.subarray(0, doc.length - 8), { frame: 'document' });
  assert.equal(torn.class, 'parse-break');
  assert.equal(torn.applied, 0);
  assert.equal(torn.ok, false);
  assert.equal(stoneReplayWal(doc.subarray(0, doc.length - 8), { frame: 'document', tornOk: true }).ok, false);
  // JSON-safe hash flip on row 2 -> parse survives, walk reports explicit seq
  const { bytes: patched } = flipRowHashByte(doc, { frame: 'document', ordinal: 2 });
  const r = stoneReplayWal(patched, { frame: 'document' });
  assert.equal(r.class, 'checksum-mismatch');
  assert.equal(r.seq, 1); // the row's OWN seq field
  assert.equal(r.ordinalSeq, 2); // ...and the ordinal matches
  // structural corruption -> parse-break, 0 applied
  const s = stoneReplayWal(structuralFlip(doc, { frame: 'document', ordinal: 1 }), { frame: 'document' });
  assert.equal(s.class, 'parse-break');
  assert.equal(s.applied, 0);
});

test('structural jsonl corruption: parse-break at the flipped line, prefix applies', () => {
  const toy = buildToyChain({ floats: false });
  const bytes = Buffer.from(toy.jsonl, 'utf8');
  const r = stoneReplayWal(structuralFlip(bytes, { frame: 'jsonl', ordinal: 3 }));
  assert.equal(r.class, 'parse-break');
  assert.equal(r.seq, 3);
  assert.equal(r.applied, 2);
});
