// m13-llm-leg.test.mjs — wave 70-a — calibration battery for the LLM-executor
// leg (ZERO network: only the pure comparator/instrument surface is tested;
// the external calls are the scored run itself, receipted elsewhere).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  loadSpecs, sealDoc, loadLegSeal, verifySeal, certifyGroundTruth,
  byteEq, firstBalancedObject, parseConstrained, classifyFreeform, parseChecksum,
  EXPECTED_68F_PROCS_HASH, GROUNDTRUTH_PATH, M13LegError,
} from './m13-llm-leg.mjs';
import { canonicalJSON } from './preregister.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPECS = join(HERE, 'fixtures', 'm13-llm-leg-specs.json');
const specs = loadSpecs(SPECS);

test('fixture loads with the registered schema and all three escalating specs', () => {
  assert.equal(specs.schema, 'm13-llm-leg-specs@1');
  for (const id of ['freeform', 'constrained', 'computation']) {
    assert.ok(specs.specs[id].prompt.length > 200, `${id} prompt is substantive`);
  }
  assert.equal(specs.callProtocol.budget.hardCap, 10);
  assert.equal(specs.callProtocol.budget.core, 6);
});

test('ground truth is the 68-f-certified sealed module: procsHash matches the 68f instrument seal', () => {
  const h = 'sha256:' + createHash('sha256').update(readFileSync(GROUNDTRUTH_PATH)).digest('hex');
  assert.equal(h, EXPECTED_68F_PROCS_HASH);
});

test('certifyGroundTruth: sealed fnv1a32 over the fixture input equals the fixture ground truth', async () => {
  const hex = await certifyGroundTruth(specs);
  assert.equal(hex, '88A64422');
});

test('fnv1a32 KATs via the sealed module (independent python3 reference agrees pre-seal)', async () => {
  const mod = await import(new URL('file://' + GROUNDTRUTH_PATH.replace(/\\/g, '/')));
  assert.equal(mod.fnv1a32('').toString(16).toUpperCase().padStart(8, '0'), '811C9DC5');
  assert.equal(mod.fnv1a32('a').toString(16).toUpperCase().padStart(8, '0'), 'E40C292C');
  assert.equal(mod.fnv1a32(specs.specs.computation.checksumInput).toString(16).toUpperCase().padStart(8, '0'), specs.specs.computation.groundTruth);
});

test('freeform classifier KATs — the pre-registered priority rubric (credit > manager > deny-only > other)', () => {
  const rubric = specs.comparatorRubric;
  const cases = [
    ['We cannot offer a full refund because no receipt was presented. However, we are happy to offer you store credit for the milk.', 'deny+store-credit'],
    ['Unfortunately I must decline the refund; I will escalate this to the store manager for review.', 'manager-review'],
    ['We cannot issue a refund without a receipt. The policy is clear on this.', 'deny-only'],
    ['The milk is a great product and I hope you enjoy your day!', 'other'],
    ['We cannot give a refund, but we can offer store credit; a manager can help you redeem it.', 'deny+store-credit'],
    ['Please come back when you have more questions about our refund options.', 'other'],
  ];
  for (const [text, want] of cases) {
    assert.equal(classifyFreeform(text, rubric).cls, want, `classify: ${text.slice(0, 40)}…`);
  }
});

test("'other' never agrees — the comparator kills the misexecution-agrees-with-misexecution pass", () => {
  const rubric = specs.comparatorRubric;
  const a = classifyFreeform('The weather is nice today.', rubric);
  const b = classifyFreeform('Milk contains calcium.', rubric);
  const NAMED = ['deny+store-credit', 'manager-review', 'deny-only'];
  const agree = NAMED.includes(a.cls) && NAMED.includes(b.cls) && a.cls === b.cls;
  assert.equal(agree, false);
  assert.equal(a.cls, 'other');
  assert.equal(b.cls, 'other');
});

test('constrained parser KATs — first balanced object wins; legal iff exactly {outcome: enum}', () => {
  const ok = (s) => parseConstrained(s);
  assert.deepEqual({ ...ok('{"outcome": "store-credit"}'), canon: ok('{"outcome": "store-credit"}').canon }, { parsed: true, outcome: 'store-credit', canon: '{"outcome":"store-credit"}' });
  assert.equal(ok('```json\n{"outcome":"full-refund"}\n```').outcome, 'full-refund');
  assert.equal(ok('Here is my answer: {"outcome":"manager-review"}. Thanks!').outcome, 'manager-review');
  assert.equal(ok('{"outcome":"store-credit"} {"outcome":"full-refund"}').outcome, 'store-credit');
  assert.equal(ok('{"outcome":"store-credit","why":"no receipt"}').parsed, false, 'extra key is illegal');
  assert.equal(ok('{"outcome":"partial"}').parsed, false, 'illegal enum value');
  assert.equal(ok('no json here').parsed, false);
  // quote-aware brace walk: a '}' inside a string does not close the object —
  // the extractor returns the FULL object; legality then fails on the extra key (the law, not the scanner)
  assert.equal(firstBalancedObject('{"outcome":"store-credit","note":"has } brace inside"}'), '{"outcome":"store-credit","note":"has } brace inside"}');
  assert.equal(ok('{"outcome":"store-credit","note":"has } brace inside"}').parsed, false);
  assert.equal(firstBalancedObject('{"outcome":"store-credit","note":"say \\"hi\\""}'), '{"outcome":"store-credit","note":"say \\"hi\\""}');
  // a one-key object with a brace inside a string value: the scanner handles it,
  // and the LAW (exactly one key) still governs legality — extra key => illegal
  assert.equal(ok('{"note":"} tricky","outcome":"store-credit"}').parsed, false, 'extra key illegal even with a legal value and a brace in a string');
});

test('checksum parse KATs — first CHECKSUM= line; case-insensitive; 8 hex exactly', () => {
  assert.equal(parseChecksum('CHECKSUM=88A64422'), '88A64422');
  assert.equal(parseChecksum('check: CHECKSUM = 88a64422.'), '88A64422');
  assert.equal(parseChecksum('step 1... step 27...\nCHECKSUM=7C1E9B04'), '7C1E9B04');
  assert.equal(parseChecksum('no answer at all'), null);
  assert.equal(parseChecksum('CHECKSUM=88A6442'), null, '7 digits is not an answer');
});

test('byte law: EXACT content equality, no normalization (executor noise IS the finding)', () => {
  assert.equal(byteEq('abc', 'abc'), true);
  assert.equal(byteEq('abc', 'abc\n'), false, 'trailing newline diverges');
  assert.equal(byteEq('{"a":1}', '{"a": 1}'), false);
});

test('prompt assembly: both executors receive the SAME verbatim fixture bytes', () => {
  const raw = JSON.parse(readFileSync(SPECS, 'utf8'));
  for (const id of ['freeform', 'constrained', 'computation']) {
    assert.equal(specs.specs[id].prompt, raw.specs[id].prompt, `${id} prompt round-trips byte-exact`);
  }
});

test('canonical dialect: constrained canon agrees with preregister.mjs canonicalJSON', () => {
  assert.equal(canonicalJSON({ outcome: 'store-credit' }), '{"outcome":"store-credit"}');
  assert.equal(canonicalJSON({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

test('instrument seal round-trip: a fresh seal verifies; tampering any sealed member refuses BY NAME', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'm13-llm-leg-test-'));
  try {
    const tSpecs = join(tmp, 'specs.json');
    const specsText = readFileSync(SPECS, 'utf8');
    writeFileSync(tSpecs, specsText);
    const seal = sealDoc({ specsPath: tSpecs }, 'calibration');
    const sealPath = join(tmp, 'seal.json');
    writeFileSync(sealPath, JSON.stringify(seal, null, 2));
    assert.equal(verifySeal({ specsPath: tSpecs }, loadLegSeal(sealPath)), true);

    writeFileSync(tSpecs, specsText + '\n');
    assert.throws(() => verifySeal({ specsPath: tSpecs }, loadLegSeal(sealPath)), (e) => e instanceof M13LegError && e.errName === 'E_SPECS_MODIFIED');

    // a DIFFERENT specs file (same schema) must refuse — the seal binds content, not shape
    const other = JSON.parse(specsText);
    other.leg = 'tampered';
    writeFileSync(tSpecs, JSON.stringify(other, null, 2));
    assert.throws(() => verifySeal({ specsPath: tSpecs }, loadLegSeal(sealPath)), (e) => e instanceof M13LegError && e.errName === 'E_SPECS_MODIFIED');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
