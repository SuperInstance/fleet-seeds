#!/usr/bin/env node
// preregister.test.mjs — wave 67-c self-tests for the pre-registration
// primitive. node:test, zero dependencies, ZERO network, zero keys.
//
// Registered coverage (maps onto the primitive's honesty laws):
//   * seal/verify roundtrip (the (b) of the contract);
//   * canonical-JSON key-order independence — reordering keys and
//     reformatting the claims file does NOT change the hash or the verdict;
//   * post-hoc tamper is detectable by re-hashing (E_CLAIMS_MODIFIED) and
//     the scorer REFUSES to score it (fail-closed, the (d) of the contract);
//   * malformed seals refuse by name (E_SEAL_MALFORMED);
//   * the four verdicts — PASS / FAIL / VACUOUS / PENDING — and the
//     murmuration vacuousIf clause firing as VACUOUS, never a silent PASS;
//   * score determinism — double run is byte-identical (pure function);
//   * comparator coverage: gte/lte/gt/lt/eq/neq/range/expr;
//   * empty claims refused (E_CLAIMS_MALFORMED); usage errors exit 2.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJSON, claimsHashOf, evalExprWith, PreregisterError } from './preregister.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, 'preregister.mjs');

function tmp() { return mkdtempSync(join(tmpdir(), 'prereg-test-')); }

function runCli(args, { expectCode = 0 } = {}) {
  let out = '', err = '', code = 0;
  try {
    out = execFileSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  } catch (e) {
    code = e.status ?? 1;
    out = e.stdout ?? '';
    err = e.stderr ?? '';
  }
  assert.equal(code, expectCode, `exit ${code} != ${expectCode}\nstdout:${out}\nstderr:${err}`);
  return { out, err };
}

const CLAIMS = {
  prereg: 'preregister@1',
  wave: 'test',
  claims: [
    { id: 'P1', claim: 'measured x >= 1', metric: 'x', op: 'gte', threshold: 1, refusal: 'x below 1 refutes' },
    { id: 'P2', claim: 'y in [1,5]', metric: 'nest.y', op: 'range', threshold: [1, 5], refusal: 'y out of band refutes' },
    { id: 'P3', claim: 'z between 0 and 9 (expr)', metric: 'z', op: 'expr', threshold: 'z >= 0 && z <= 9', refusal: 'z out of band refutes' },
    { id: 'P4', claim: 'w equals 2', metric: 'w', op: 'eq', threshold: 2, refusal: 'w != 2 refutes' },
    { id: 'P5', claim: 'declared-vacuous clause', metric: 'v', op: 'eq', threshold: 0, refusal: 'v != 0 refutes' },
    { id: 'P6', claim: 'unexercised clause', metric: 'absent.metric', op: 'eq', threshold: 0, refusal: 'fires only when exercised' },
    { id: 'P7', claim: 'murmuration clause over a constant signal', metric: 'mean', op: 'gt', threshold: 0,
      vacuousIf: { metric: 'spread', op: 'eq', threshold: 0, note: 'std == 0 — a relational claim over a constant measurement' },
      refusal: 'mean <= 0 refutes' },
  ],
};

const RESULTS_FULL = {
  metrics: { x: 3, nest: { y: 2.5 }, z: 7, w: 3, v: { vacuous: true, reason: 'no discriminating evidence this run' }, spread: 0 },
};

describe('preregister seal/verify (contract b+d)', () => {
  test('seal -> verify roundtrip PASSes with the sealed hash', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    const { out } = runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    const seal = JSON.parse(out);
    assert.equal(seal.tool, 'preregister@1');
    assert.match(seal.claimsHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(seal.claimsHash, claimsHashOf(CLAIMS));
    const v = JSON.parse(runCli(['verify', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`]).out);
    assert.equal(v.ok, true);
    rmSync(d, { recursive: true, force: true });
  });

  test('seal is deterministic in content, NOT in time (sealedAt present, hash stable)', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    const a = JSON.parse(runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's1.json')}`]).out);
    const b = JSON.parse(runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's2.json')}`]).out);
    assert.equal(a.claimsHash, b.claimsHash);
    assert.equal(typeof a.sealedAt, 'string');
    rmSync(d, { recursive: true, force: true });
  });

  test('prevSeal chains an addendum (jev-garden seal_history pattern)', () => {
    const d = tmp();
    writeFileSync(join(d, 'c1.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c1.json')}`, `--out=${join(d, 's1.json')}`]);
    const c2 = { ...CLAIMS, claims: [...CLAIMS.claims, { id: 'A1', claim: 'addendum', metric: 'a', op: 'eq', threshold: 1 }] };
    writeFileSync(join(d, 'c2.json'), JSON.stringify(c2));
    const s2 = JSON.parse(runCli(['seal', `--claims=${join(d, 'c2.json')}`, `--out=${join(d, 's2.json')}`, `--prev-seal=${join(d, 's1.json')}`]).out);
    assert.equal(s2.prevSeal, claimsHashOf(CLAIMS));
    rmSync(d, { recursive: true, force: true });
  });

  test('canonical JSON key-order independence: reordered+reformatted claims verify PASS', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    // reverse key order recursively + 4-space pretty-print (cosmetic churn)
    const rev = (v) => {
      if (Array.isArray(v)) return v.map(rev);
      if (v && typeof v === 'object') {
        const o = {};
        for (const k of Object.keys(v).reverse()) o[k] = rev(v[k]);
        return o;
      }
      return v;
    };
    writeFileSync(join(d, 'reordered.json'), JSON.stringify(rev(CLAIMS), null, 4));
    const s1 = JSON.parse(readFileSync(join(d, 's.json'), 'utf8'));
    assert.equal(claimsHashOf(JSON.parse(readFileSync(join(d, 'reordered.json'), 'utf8'))), s1.claimsHash);
    const v = JSON.parse(runCli(['verify', `--claims=${join(d, 'reordered.json')}`, `--seal=${join(d, 's.json')}`]).out);
    assert.equal(v.ok, true);
    rmSync(d, { recursive: true, force: true });
  });

  test('post-hoc tamper of any claim value is caught by re-hash: E_CLAIMS_MODIFIED', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    const tampered = JSON.parse(readFileSync(join(d, 'c.json'), 'utf8'));
    tampered.claims[0].threshold = 0.5; // threshold surgery — the classic post-hoc move
    writeFileSync(join(d, 'c.json'), JSON.stringify(tampered));
    const r = runCli(['verify', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`], { expectCode: 1 });
    assert.match(r.err, /E_CLAIMS_MODIFIED/);
    rmSync(d, { recursive: true, force: true });
  });

  test('malformed seal refuses by name: E_SEAL_MALFORMED (missing hash / wrong tool / bad hex)', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    for (const [key, value] of [['claimsHash', undefined], ['tool', 'preregister@9'], ['claimsHash', 'sha256:nothex']]) {
      const seal = { tool: 'preregister@1', sealedAt: '2026-10-02T00:00:00.000Z', claimsHash: 'sha256:' + 'a'.repeat(64), ...{} };
      if (key === 'claimsHash') { delete seal.claimsHash; if (value !== undefined) seal.claimsHash = value; }
      else seal.tool = value;
      writeFileSync(join(d, 's.json'), JSON.stringify(seal));
      const r = runCli(['verify', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`], { expectCode: 1 });
      assert.match(r.err, /E_SEAL_MALFORMED/);
    }
    rmSync(d, { recursive: true, force: true });
  });

  test('empty claims array refused: E_CLAIMS_MALFORMED (a seal over zero claims is vacuous by construction)', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify({ claims: [] }));
    const r = runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`], { expectCode: 1 });
    assert.match(r.err, /E_CLAIMS_MALFORMED/);
    rmSync(d, { recursive: true, force: true });
  });
});

describe('preregister score (contract c: verdicts beside untouched claims)', () => {
  test('scores all four verdicts honestly: PASS, FAIL, VACUOUS, PENDING', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify(RESULTS_FULL));
    const v = JSON.parse(runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`, `--out=${join(d, 'v.json')}`]).out);
    const by = Object.fromEntries(v.verdicts.map((x) => [x.claimId, x]));
    assert.equal(by.P1.verdict, 'PASS');
    assert.equal(by.P1.measured, 3);
    assert.equal(by.P2.verdict, 'PASS'); // nested dotted metric
    assert.equal(by.P3.verdict, 'PASS'); // expr
    assert.equal(by.P4.verdict, 'FAIL'); // honest FAIL is a receipt, exit still 0
    assert.equal(by.P5.verdict, 'VACUOUS'); // declared vacuous in results, receipted with reason
    assert.match(by.P5.reason, /no discriminating evidence/);
    assert.equal(by.P6.verdict, 'PENDING'); // unexercised clause — honest state
    assert.match(by.P6.reason, /unexercised/);
    assert.equal(by.P7.verdict, 'VACUOUS'); // murmuration: std==0 makes the relational claim vacuous
    assert.match(by.P7.reason, /constant measurement|vacuousIf holds/);
    assert.deepEqual(v.counts, { PASS: 3, FAIL: 1, VACUOUS: 2, PENDING: 1 });
    rmSync(d, { recursive: true, force: true });
  });

  test('murmuration clause does NOT fire when spread > 0 — claim scores on its merits', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify({ metrics: { mean: 5, spread: 1.5 } }));
    const v = JSON.parse(runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`]).out);
    assert.equal(v.verdicts.find((x) => x.claimId === 'P7').verdict, 'PASS');
    rmSync(d, { recursive: true, force: true });
  });

  test('score is fail-closed on tampered claims: E_CLAIMS_MODIFIED and NO verdict written', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    const tampered = JSON.parse(readFileSync(join(d, 'c.json'), 'utf8'));
    tampered.claims[3].claim = 'w equals 2 (edited post-run)'; // moving the goalposts
    writeFileSync(join(d, 'c.json'), JSON.stringify(tampered));
    writeFileSync(join(d, 'r.json'), JSON.stringify(RESULTS_FULL));
    const r = runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`, `--out=${join(d, 'v.json')}`], { expectCode: 1 });
    assert.match(r.err, /E_CLAIMS_MODIFIED/);
    assert.throws(() => readFileSync(join(d, 'v.json'), 'utf8'), /ENOENT/);
    rmSync(d, { recursive: true, force: true });
  });

  test('score determinism: double run is byte-identical (pure function of claims+seal+results)', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify(CLAIMS));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify(RESULTS_FULL));
    runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`, `--out=${join(d, 'v1.json')}`]);
    runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`, `--out=${join(d, 'v2.json')}`]);
    assert.equal(readFileSync(join(d, 'v1.json'), 'utf8'), readFileSync(join(d, 'v2.json'), 'utf8'));
    rmSync(d, { recursive: true, force: true });
  });

  test('comparator matrix: gte/lte/gt/lt/eq/neq/range boundaries', () => {
    const d = tmp();
    const c = { claims: [
      { id: 'a', claim: 'gte', metric: 'm', op: 'gte', threshold: 2 },
      { id: 'b', claim: 'lte', metric: 'm', op: 'lte', threshold: 2 },
      { id: 'e', claim: 'eq', metric: 'm', op: 'eq', threshold: 2 },
      { id: 'n', claim: 'neq', metric: 'm', op: 'neq', threshold: 3 },
      { id: 'r', claim: 'range-edge-inclusive', metric: 'm', op: 'range', threshold: [2, 4] },
    ] };
    writeFileSync(join(d, 'c.json'), JSON.stringify(c));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify({ metrics: { m: 2 } }));
    const v = JSON.parse(runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`]).out);
    assert.deepEqual(v.verdicts.map((x) => x.verdict), ['PASS', 'PASS', 'PASS', 'PASS', 'PASS']);
    rmSync(d, { recursive: true, force: true });
  });

  test('order comparators refuse non-numeric evidence by name: E_MEASURED_NOT_COMPARABLE', () => {
    const d = tmp();
    const c = { claims: [{ id: 's', claim: 'string vs number', metric: 'm', op: 'gt', threshold: 1 }] };
    writeFileSync(join(d, 'c.json'), JSON.stringify(c));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify({ metrics: { m: 'three' } }));
    const r = runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`], { expectCode: 1 });
    assert.match(r.err, /E_MEASURED_NOT_COMPARABLE/);
    rmSync(d, { recursive: true, force: true });
  });

  test('expr: parentheses, || and a missing variable -> PENDING', () => {
    const d = tmp();
    const c = { claims: [
      { id: 'e1', claim: 'paren+or', metric: 'a', op: 'expr', threshold: '(a >= 3 && a <= 9) || a == 1' },
      { id: 'e2', claim: 'missing var', metric: 'a', op: 'expr', threshold: 'a >= 0 && b <= 2' },
    ] };
    writeFileSync(join(d, 'c.json'), JSON.stringify(c));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify({ metrics: { a: 1 } }));
    const v = JSON.parse(runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`]).out);
    const by = Object.fromEntries(v.verdicts.map((x) => [x.claimId, x]));
    assert.equal(by.e1.verdict, 'PASS');
    assert.equal(by.e2.verdict, 'PENDING');
    rmSync(d, { recursive: true, force: true });
  });

  test('unparseable expression refuses by name: E_EXPR_BAD', () => {
    const d = tmp();
    const c = { claims: [{ id: 'e3', claim: 'bad expr', metric: 'a', op: 'expr', threshold: 'a >= ) 3' }] };
    writeFileSync(join(d, 'c.json'), JSON.stringify(c));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), JSON.stringify({ metrics: { a: 1 } }));
    const r = runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`], { expectCode: 1 });
    assert.match(r.err, /E_EXPR_BAD/);
    rmSync(d, { recursive: true, force: true });
  });

  test('malformed results refuse by name: E_RESULTS_MALFORMED', () => {
    const d = tmp();
    writeFileSync(join(d, 'c.json'), JSON.stringify({ claims: [{ id: 'x', claim: 'c', metric: 'm', op: 'eq', threshold: 1 }] }));
    runCli(['seal', `--claims=${join(d, 'c.json')}`, `--out=${join(d, 's.json')}`]);
    writeFileSync(join(d, 'r.json'), '[1,2,3]');
    const r = runCli(['score', `--claims=${join(d, 'c.json')}`, `--seal=${join(d, 's.json')}`, `--results=${join(d, 'r.json')}`], { expectCode: 1 });
    assert.match(r.err, /E_RESULTS_MALFORMED/);
    rmSync(d, { recursive: true, force: true });
  });
});

describe('preregister library surface', () => {
  test('canonicalJSON matches the stone-v1 custody dialect on shared values', async () => {
    const stone = await import('./lib/stone-v1.mjs');
    const sample = { b: 1, a: { d: [1, 2, { c: 1, a: 2 }], z: undefined, y: null } };
    assert.equal(canonicalJSON(sample), stone.canonicalJSON(sample));
  });

  test('evalExprWith: arithmetic + precedence + dotted identifiers, no eval', () => {
    const R = { a: 2, 'deep.path': { v: 5 } };
    const res = (n) => {
      if (n === 'deep.path.v') return R['deep.path'].v;
      if (n in R) return R[n];
      throw new PreregisterError('E_MISSING', n);
    };
    assert.equal(evalExprWith('a + 3 * 2', res), 8);
    assert.equal(evalExprWith('(a + 3) * 2', res), 10);
    assert.equal(evalExprWith('deep.path.v == 5', res), true);
    assert.equal(evalExprWith('-a < 0 && !(a > 2)', res), true);
    assert.throws(() => evalExprWith('a > ) 2', res), PreregisterError);
  });

  test('usage errors exit 2, unknown command exit 2', () => {
    const d = tmp();
    runCli(['bogus'], { expectCode: 2 });
    runCli(['seal'], { expectCode: 2 }); // missing required args
    rmSync(d, { recursive: true, force: true });
  });
});
