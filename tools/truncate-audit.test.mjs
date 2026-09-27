// truncate-audit.test.mjs — 45-d self-tests for the power-yank adoption.
//
// node:test, zero dependencies, NO network. The toy chains are exhaustive
// (they are small and carry no non-semantic bytes); the real fixtures are
// exercised at hand-picked interesting offsets (0, first-line interior,
// row boundaries, len-2, len-1) plus the full-length control. The FULL
// exhaustive matrix over every committed fixture is the CLI run
// (`node tools/truncate-audit.mjs`), receipted in tools/wave45/.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildToyChain, edgeDelta, auditChain, toyAuditEntry,
  annotationTailProbe, runTruncateAudit, AUDIT_CHAIN_IDS,
} from './truncate-audit.mjs';
import { verifyStoneChain } from './lib/stone-v1.mjs';
import { PINS } from './verify-fleet.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)); // tools/
const REPO = join(HERE, '..');
const FIXTURES = join(HERE, 'fixtures');

// byte boundary after the first n rows of a toy chain (JSONL line starts).
// BYTE length, not char length — toy rows carry multi-byte UTF-8 (≡, Δ, —).
function toyBoundary(toy, n) {
  let acc = 0;
  for (const r of toy.rows.slice(0, n)) acc += Buffer.byteLength(JSON.stringify(r), 'utf8') + 1;
  return acc;
}

describe('toy chain + field-edge delta property (44-c adoption)', () => {
  test('toy chain verifies as stone-v1; trailing annotation does not advance the tip', () => {
    const toy = buildToyChain({ floats: false });
    const v = verifyStoneChain(toy.rows);
    assert.equal(v.ok, true, v.why);
    assert.equal(v.links, toy.rows.length); // 1 header + 5 values + 1 annotation
    const vBody = verifyStoneChain(toy.rows.slice(0, -1));
    assert.equal(vBody.tip, v.tip); // the annotation left the tip alone
  });

  test('delta property, integers: imbalance ≡ field edge Δ EXACTLY (residual 0, per row + global)', () => {
    const d = edgeDelta(buildToyChain({ floats: false }).rows);
    assert.equal(d.rowsWithValue, 5);
    for (const r of d.perRow) assert.equal(r.residual, 0, `row ${r.seq}: |${r.imbalance} − ${r.fieldDelta}| != 0`);
    // global: the two projections of ONE directed edge agree exactly
    assert.equal(d.globalImbalance - d.globalFieldDelta, 0);
    assert.equal(d.maxResidual, 0);
  });

  test('delta property, floats: max residual ≤ 1e-12 (field-edge-bridge golden bound; float arithmetic is NOT exact — that is the point of the bound)', () => {
    const d = edgeDelta(buildToyChain({ floats: true }).rows);
    assert.equal(d.rowsWithValue, 4);
    assert.ok(d.maxResidual <= 1e-12, `maxResidual ${d.maxResidual} > 1e-12`);
    assert.ok(Math.abs(d.globalImbalance - d.globalFieldDelta) <= 1e-12); // bound holds globally too
  });

  test('toy serialization carries NO non-semantic bytes (no trailing newline) — every truncation is content-changing', () => {
    const toy = buildToyChain({ floats: false });
    assert.ok(!toy.jsonl.endsWith('\n'));
    assert.equal(toy.rows.filter((r) => r.seal).length, 5);
  });
});

describe('truncation matrix: the toy chain (known-good, exhaustive)', () => {
  test('EVERY byte offset 0..len-1 fails at BOTH layers (count = len); full-length control ok', async () => {
    const entry = toyAuditEntry({ floats: false });
    const c = await auditChain(entry);
    assert.equal(c.offsetsTested, c.bytes);
    assert.equal(c.l1.failCount, c.bytes, 'L1: every truncation must fail');
    assert.equal(c.l1.okOffsets.length, 0);
    assert.equal(c.l2.failCount, c.bytes, 'L2: every truncation must fail (no content-identical offsets by construction)');
    assert.equal(c.l2.contentIdenticalOffsets.length, 0);
    assert.equal(c.l2.silentOffsets.length, 0);
    assert.equal(c.control.ok, true);
    assert.equal(c.ok, true);
  });

  test('L2 failure classes are structured: every row boundary is prefix-honest (valid shorter chain, explicit mismatch report)', async () => {
    const entry = toyAuditEntry({ floats: false });
    const toy = buildToyChain({ floats: false });
    for (let n = 1; n <= toy.rows.length - 1; n++) {
      const b = toyBoundary(toy, n);
      const one = await auditChain(entry, { offsets: [b] });
      assert.equal(one.l2.classes['prefix-honest'], 1, `offset ${b} (after ${n} rows) should be prefix-honest`);
      assert.ok(one.sample.some((s) => s.class === 'prefix-honest' && s.offset === b));
    }
  });

  test('SILENT-WRONG-STATE detector fires: a pin that blesses a 3-row prefix makes that truncation silent, and the audit SCREAMS', async () => {
    const entry = toyAuditEntry({ floats: false });
    const toy = buildToyChain({ floats: false });
    const prefix3 = toy.rows.slice(0, 3);
    const pv = verifyStoneChain(prefix3);
    assert.equal(pv.ok, true);
    const dishonest = { ...entry, pin: { ...entry.pin, expectTip: pv.tip, expectLinks: pv.links } };
    const c = await auditChain(dishonest, { offsets: [toyBoundary(toy, 3)] });
    assert.equal(c.l2.silentOffsets.length, 1, 'the audit must flag a prefix accepted without a mismatch report');
    assert.equal(c.l2.classes['SILENT-WRONG-STATE'], 1);
    assert.equal(c.control.ok, false, 'the full chain cannot pass a pin that blesses the prefix');
    assert.equal(c.ok, false);
  });

  test('annotation-tail probe: dropping the trailing annotation keeps the tip — caught ONLY by the links pin', async () => {
    const p = await annotationTailProbe();
    assert.equal(p.ok, true, JSON.stringify(p));
    assert.equal(p.prefixVerifiesAsShorterChain, true);
    assert.equal(p.tipUnchangedByAnnotationDrop, true);
    assert.equal(p.linksPinCatchesIt, true);
  });
});

describe('real fixtures (interesting-offset subset + control; full range is the CLI receipt)', () => {
  test('qthe E-Q6 (JSONL): empty/interior/boundary/len-2/len-1 all fail closed at L1; len-1 is content-identical at L2 (the disclosed allowance); control ok', async () => {
    const bytes = readFileSync(join(FIXTURES, PINS.qtheEq6.fixture));
    const rowBoundary = bytes.indexOf(0x0a) + 1; // end of the header line
    const entry = { id: 'qthe_eq6', pin: PINS.qtheEq6, kind: 'stone-jsonl', bytes: () => bytes };
    const c = await auditChain(entry, { offsets: [0, 1, rowBoundary - 1, rowBoundary, rowBoundary + 1, bytes.length - 2, bytes.length - 1] });
    assert.equal(c.l1.okOffsets.length, 0, 'L1: no truncated input may be accepted');
    assert.equal(c.l2.silentOffsets.length, 0, 'L2: zero silent wrong states');
    assert.deepEqual(c.l2.contentIdenticalOffsets, [bytes.length - 1], 'only the final newline is non-semantic');
    assert.equal(c.control.ok, true, JSON.stringify(c.control));
    // at the first row boundary the prefix is a valid SHORTER chain, honestly reported
    const one = await auditChain(entry, { offsets: [rowBoundary] });
    assert.equal(one.l2.classes['prefix-honest'], 1);
  });

  test('pong birth-seal (JSON document): a strict byte prefix never parses; len-1 (final newline) is content-identical at L2; control ok', async () => {
    const bytes = readFileSync(join(FIXTURES, PINS.pongBirthSeal.fixture));
    const entry = { id: 'pong_birth_seal', pin: PINS.pongBirthSeal, kind: 'stone-json', bytes: () => bytes };
    const c = await auditChain(entry, { offsets: [0, Math.floor(bytes.length / 2), bytes.length - 2, bytes.length - 1] });
    assert.equal(c.l1.okOffsets.length, 0);
    assert.equal(c.l2.silentOffsets.length, 0);
    assert.deepEqual(c.l2.contentIdenticalOffsets, [bytes.length - 1]);
    assert.equal(c.control.ok, true);
  });

  test('rekor + VC envelope: strict prefixes fail closed at L1; control verifies through the real paths', async () => {
    const rekorBytes = readFileSync(join(FIXTURES, PINS.rekorEcdsa.fixture));
    const vcBytes = readFileSync(join(REPO, PINS.vcEnvelope.path));
    const r = await auditChain({ id: 'rekor_ecdsa', pin: PINS.rekorEcdsa, kind: 'rekor', bytes: () => rekorBytes },
      { offsets: [0, 100, rekorBytes.length - 1] });
    assert.equal(r.l1.okOffsets.length, 0);
    assert.equal(r.l2.silentOffsets.length, 0);
    assert.equal(r.control.ok, true, JSON.stringify(r.control));
    const v = await auditChain({ id: 'vc_envelope', pin: PINS.vcEnvelope, kind: 'vc', bytes: () => vcBytes },
      { offsets: [0, 100, vcBytes.length - 1] });
    assert.equal(v.l1.okOffsets.length, 0);
    assert.equal(v.l2.silentOffsets.length, 0);
    assert.equal(v.control.ok, true, JSON.stringify(v.control));
  });
});

describe('audit orchestration', () => {
  test('runTruncateAudit({chains:[]}) — toys + delta property + annotation probe only; ok', async () => {
    const v = await runTruncateAudit({ chains: [] });
    assert.equal(v.deltaProperty.ok, true);
    assert.equal(v.annotationTailProbe.ok, true);
    assert.equal(v.toy.int.ok, true);
    assert.equal(v.toy.float.ok, true);
    assert.equal(v.ok, true, v.why);
    assert.deepEqual(Object.keys(v.chains), []);
  });

  test('unknown chain id is rejected loudly; exactly four fleet chains are known', async () => {
    await assert.rejects(() => runTruncateAudit({ chains: ['nope'] }), /unknown chain id/);
    assert.deepEqual([...AUDIT_CHAIN_IDS].sort(), ['pong', 'qthe', 'rekor', 'vc']);
  });
});
