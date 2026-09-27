// mothbits.test.mjs — lane 43-c self-tests for the whitened-randomness
// instrument. node:test, zero dependencies, NO network, NO keys.
//
// Known-vector policy (one KAT per stage, plus the sealed 42-b end-to-end):
//   * von Neumann: hand-computed biased fixtures (emit/discard counts pinned).
//   * counter stream: pinned block0 hexes for trivial seeds + MSB-first
//     consumption pinned (first 16 bits of block0(empty) == 57088).
//   * Fisher-Yates: pinned selected sequences for fixed seeds + determinism
//     (run twice, byte-identical) + permutation properties on the real pool.
//   * 42-b KAT (sealed): the archived raw bits reproduce EVERY stage:
//     ebc8a43d… -> 67946001… -> 157B/pad2 -> 836985ec… -> pool_idx sequence.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
  vonNeumann, packBytes, whitenedStream, fisherYatesSelect,
  whiteningReceipt, DRY_RUN_FIXTURE,
} from './mothbits.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_BITS_FIXTURE = join(HERE, 'fixtures', 'moth-42b-raw-bits-2caa822b-7c46-4f65-a0c9-152c46272e19.txt');
const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');

// 42-b sealed expectations (experiments/outputs/eq9dt_seed_receipt.json @ 44a872f)
const K42B = {
  rawSha: 'ebc8a43d90be5c0b01788f7cc63021ab0b0dac1a0294756e73a2882360b5e9b9',
  rawLen: 4848,
  vnLen: 1254,
  vnSha: '679460013c0f38d381ba51cd0ba0de8c06a00384e92a6db040f30b05a2b09189',
  pairStats: { pairs: 2424, emit0: 1015, emit1: 239, discard00: 464, discard11: 706 },
  bytesLen: 157,
  padLen: 2,
  block0Sha: '836985ec99d5e5e69cef6445ce5bf33b3b232c2ce0733ca72f9b88d244e8ddeb',
  pool: 1134,
  selected: [191, 560, 613, 600, 93, 378, 373, 319, 247, 118, 540, 231, 1027, 804, 130, 668],
};

describe('STEP 1: von Neumann debias', () => {
  test('KAT: emit/discard pinned on hand-computed biased fixtures', () => {
    //  (0,1)->0  (0,1)->0  (1,0)->1
    let r = vonNeumann('010110');
    assert.equal(r.vnBits, '001');
    assert.deepEqual(r.pairStats, { pairs: 3, emit0: 2, emit1: 1, discard00: 0, discard11: 0 });

    //  (0,1)->0  (1,0)->1  (1,0)->1  (0,0)X  (0,1)->0  + odd trailing pair (1,1)X
    r = vonNeumann('0110100001' + '1');
    assert.equal(r.vnBits, '0110');
    assert.deepEqual(r.pairStats, { pairs: 5, emit0: 2, emit1: 2, discard00: 1, discard11: 0 });

    //  fully biased input: nothing survives (the debiaser's whole point)
    r = vonNeumann('1111111100000000');
    assert.equal(r.vnBits, '');
    assert.deepEqual(r.pairStats, { pairs: 8, emit0: 0, emit1: 0, discard00: 4, discard11: 4 });
  });

  test('KAT: 42-b pair statistics reproduce from the archived raw bits', () => {
    const raw = readFileSync(RAW_BITS_FIXTURE, 'utf8').trim();
    const { vnBits, pairStats } = vonNeumann(raw);
    assert.deepEqual(pairStats, K42B.pairStats);
    assert.equal(vnBits.length, K42B.vnLen);
    assert.equal(sha256Hex(Buffer.from(vnBits, 'utf8')), K42B.vnSha);
  });
});

describe('STEP 2: MSB-first byte pack', () => {
  test('KAT: bit packing + zero pad receipted', () => {
    let r = packBytes('010');
    assert.equal(r.bytes.length, 1);
    assert.equal(r.bytes[0], 0b01000000);
    assert.equal(r.padLen, 5);

    r = packBytes('11111111');
    assert.equal(r.bytes[0], 0xff);
    assert.equal(r.padLen, 0);

    r = packBytes('1'.repeat(9) + '0');
    assert.equal(r.bytes.length, 2);
    assert.equal(r.bytes[0], 0xff);
    assert.equal(r.bytes[1], 0b10000000);
    assert.equal(r.padLen, 6);
  });

  test('KAT: 42-b pack — 1,254 bits -> 157 bytes, pad 2', () => {
    const raw = readFileSync(RAW_BITS_FIXTURE, 'utf8').trim();
    const { vnBits } = vonNeumann(raw);
    const { bytes, padLen } = packBytes(vnBits);
    assert.equal(bytes.length, K42B.bytesLen);
    assert.equal(padLen, K42B.padLen);
  });
});

describe('STEP 3: SHA-256 counter stream', () => {
  test('KAT: block_0 hexes pinned for trivial seeds', () => {
    const s0 = whitenedStream(Buffer.alloc(0));
    assert.equal(s0.block(0).toString('hex'), 'df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119');
    const sf = whitenedStream(Buffer.from([0xff]));
    assert.equal(sf.block(0).toString('hex'), 'a0960f8d63bfe4fce6c26ae9e33f8f2d2729239a3bf47c9b5ee9a0c2c456a39e');
  });

  test('KAT: MSB-first consumption — first 16 bits of block_0(empty) == 57151 (0xdf3f)', () => {
    const s = whitenedStream(Buffer.alloc(0));
    assert.equal(s.next16(), 57151);
    // next draw continues MSB-first across the SAME block (no re-alignment)
    const b0 = s.block(0);
    const expect = (b0[2] << 8) | b0[3]; // 0x6198
    assert.equal(s.next16(), expect);
  });

  test('KAT: counter advances — block_1 != block_0, lazy materialization', () => {
    const s = whitenedStream(Buffer.alloc(0));
    for (let i = 0; i < 16; i++) s.next16(); // 32 bytes = block 0 exactly
    assert.equal(s.blocksMaterialized(), 1);
    s.next16(); // crosses into block 1
    assert.equal(s.blocksMaterialized(), 2);
    assert.notEqual(s.block(1).toString('hex'), s.block(0).toString('hex'));
  });
});

describe('STEP 4: Fisher-Yates selection (16-bit rejection sampling)', () => {
  test('KAT: pinned selections for fixed seeds', () => {
    const s1 = whitenedStream(Buffer.from([0xff]));
    let r = fisherYatesSelect(100, s1, 5);
    assert.deepEqual(r.selected, [39, 30, 61, 97, 58]);
    assert.equal(r.draws, 99);
    assert.equal(r.rejects, 0);

    const s2 = whitenedStream(Buffer.alloc(0));
    r = fisherYatesSelect(16, s2, 4);
    assert.deepEqual(r.selected, [4, 6, 8, 1]);
  });

  test('determinism: same seed -> byte-identical selection, twice', () => {
    const run = () => fisherYatesSelect(1134, whitenedStream(Buffer.from([0x42])), 16).selected;
    assert.deepEqual(run(), run());
  });

  test('permutation properties on the real pool size: distinct, in range, order used', () => {
    const s = whitenedStream(packBytes(vonNeumann(readFileSync(RAW_BITS_FIXTURE, 'utf8').trim()).vnBits).bytes);
    const r = fisherYatesSelect(1134, s, 16);
    assert.equal(new Set(r.selected).size, 16);
    for (const idx of r.selected) assert.ok(idx >= 0 && idx < 1134);
    // the FULL order is a permutation of the pool
    assert.deepEqual([...r.order].sort((a, b) => a - b), Array.from({ length: 1134 }, (_, i) => i));
  });
});

describe('42-b end-to-end KAT (sealed recipe, archived raw bits)', () => {
  test('raw ebc8a43d… -> VN 67946001… -> 157B/pad2 -> block0 sha 836985ec… -> pinned pool_idx sequence', () => {
    const raw = readFileSync(RAW_BITS_FIXTURE, 'utf8').trim();
    assert.equal(sha256Hex(Buffer.from(raw, 'utf8')), K42B.rawSha);
    const receipt = whiteningReceipt(raw, { poolSize: K42B.pool, take: 16 });
    assert.equal(receipt.step1_vonNeumann.bitsLen, K42B.vnLen);
    assert.equal(receipt.step1_vonNeumann.bitsSha256, K42B.vnSha);
    assert.equal(receipt.step2_pack.bytesLen, K42B.bytesLen);
    assert.equal(receipt.step2_pack.padLen, K42B.padLen);
    assert.equal(receipt.step3_counterStream.block0Sha256, K42B.block0Sha);
    assert.deepEqual(receipt.step4_fisherYates.selected, K42B.selected);
    assert.equal(receipt.step4_fisherYates.rejects, 2);
    assert.equal(receipt.keysUsed, 'none');
  });

  test('receipt honesty: no key material in any receipt field', () => {
    const raw = readFileSync(RAW_BITS_FIXTURE, 'utf8').trim();
    const s = JSON.stringify(whiteningReceipt(raw));
    assert.doesNotMatch(s, /(MOTH_KEY|sk-|x-access-token|BEGIN [A-Z ]*PRIVATE)/);
  });
});

describe('fail-closed behavior', () => {
  test('zero VN output -> loud throw, never a silent seed', () => {
    assert.throws(() => whiteningReceipt('1111000011110000'), /zero bits/);
  });
  test('non-01 input, short input, bad pool/take -> loud throws', () => {
    assert.throws(() => whiteningReceipt('abc1'), /0\/1 string/);
    assert.throws(() => whiteningReceipt('1'), /at least 2 raw bits/);
    assert.throws(() => whiteningReceipt('0101', { poolSize: 1, take: 1 }), /poolSize/);
    assert.throws(() => whiteningReceipt('0101', { poolSize: 4, take: 5 }), /poolSize/);
  });
});

describe('CLI (deterministic, offline)', () => {
  const CLI = resolve(HERE, 'mothbits.mjs');
  const runCli = (args, input) =>
    execFileSync(process.execPath, [CLI, ...args], { input, encoding: 'utf8' });

  test('--dry-run is deterministic and well-shaped', () => {
    const a = JSON.parse(runCli(['--dry-run', '--n=8', '--pool=64']));
    const b = JSON.parse(runCli(['--dry-run', '--n=8', '--pool=64']));
    assert.deepEqual(a, b);
    assert.match(a.input.source, /dry-run-fixture/);
    assert.equal(a.step4_fisherYates.poolSize, 64);
    assert.equal(a.step4_fisherYates.selected.length, 8);
    assert.match(a.recipe, /von Neumann/);
  });

  test('stdin hex input: CLI receipt matches the module receipt for the same bits', () => {
    const cli = JSON.parse(runCli(['--n=4', '--pool=32'], 'deadbeef'));
    const mod = whiteningReceipt(bitsFromHex('deadbeef'), { poolSize: 32, take: 4 });
    assert.equal(cli.step3_counterStream.block0Sha256, mod.step3_counterStream.block0Sha256);
    assert.deepEqual(cli.step4_fisherYates.selected, mod.step4_fisherYates.selected);
    assert.equal(cli.input.source, 'stdin');
  });

  test('bad input fails closed (non-zero exit, error on stderr)', () => {
    assert.throws(() => runCli(['--bits=xyz']), /neither a 0\/1 bitstring/);
    assert.throws(() => runCli(['--bits=1111']), /zero bits/);
  });

  test('the 42-b fixture drives the CLI end-to-end to the sealed seed sha', () => {
    const cli = JSON.parse(runCli([`--file=${RAW_BITS_FIXTURE}`, '--n=16', '--pool=1134']));
    assert.equal(cli.step3_counterStream.block0Sha256, K42B.block0Sha);
    assert.deepEqual(cli.step4_fisherYates.selected, K42B.selected);
  });
});

function bitsFromHex(hex) {
  const bytes = Buffer.from(hex, 'hex');
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  return bits;
}
