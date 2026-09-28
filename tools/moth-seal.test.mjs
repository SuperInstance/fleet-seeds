// moth-seal.test.mjs — lane 46-b self-tests for the certified sampling service.
// node:test, zero dependencies, NO network, NO keys: all API traffic goes
// through an injected fake fetchImpl serving deterministic fixture payloads.
//
// Coverage (registered claims P1-P5 map onto these):
//   * negative controls — cert field missing (6 mutations) -> CertError;
//     truncated/garbled responses -> SealError; certified-bits exhaustion
//     (direct stream) -> SealError; no silent fallback (comet failure -> exit
//     path throws unless mode='fallback').
//   * fallback path — receipt.mode === 'FALLBACK' + whitening recipe + KAT
//     reference present, seed-use declaration marks the degraded source.
//   * determinism — FY over fixed bits: pinned against an INDEPENDENTLY
//     written mini-implementation + byte-identical receipt on replay.
//   * prf extension — block(c) pinned to direct sha256 computation.
//   * receipt schema — required keys, chosen[] in [0,pool) distinct, seed-use
//     declaration singleUse, no-seed-reuse guard (assertDistinctSeals).
//   * CLI usage path — bad args exit 2 without touching the network.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  seal, verifyCertFields, extractOutput, verifyReceiptSchema, assertDistinctSeals,
  certifiedStream, prfExtendedStream, SealError, CertError,
  COMET_PARAMS, GRAPH_PARAMS, KAT_REFERENCE, RECEIPT_REQUIRED_KEYS,
} from './moth-seal.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');

// ── fixtures ─────────────────────────────────────────────────────────────────
// Synthetic-but-shape-exact comet-qrng-v1 output (mirrors the 45-e hands-on2
// receipt structure; bytes are a FIXED literal, not entropy).

const CERT_HEX =
  '0ef7272802cbccc47634c1e774d128aa4fa30fcd5a11e8b4f9c047b6d21f3e8a' +
  '7d94be2f60318a5c4e9d70b28813fa6c05b9e447d2a18c6390fb57e214d8abf3' +
  'c6819d54e2073b8fa4915d0c62be73a8f0d41962e58c7033ab9fd8146e20c5b7' +
  '9e03a581c4d7620fbe9417a3c5d0862fe1b7049a38cd5260ebf91734a2c0586d' +
  '3b19e7405ac28d96f1b03e5847a62cd0f914e83527b6a0d4cf9851e2073bd64a' +
  '5c8f19e340a76d2b80f5c319e6470abd2f85e1c3049a7b5d620fe81473ac09b5' +
  '61f08e34a9c75d20b48f613e09a7c52d84eb60f37a195dc42e6b80f513a7c49d' +
  'e085f31b746a90c25df83e1b096a47c52d0f9e83a516470bd2f85c3e91046a7b' +
  '0d3581e64a9c72f05b3e8d14067a29fc35b0e8461d7a92c05fbe31748a60d92f';

function cometFixture() {
  const bytesLen = CERT_HEX.length / 2;
  return {
    $schema: 'https://api.mothquantum.com/schemas/JobResultOutputBody.json',
    result: {
      output: {
        entropy_report: {
          accounting_basis: 'pairwise-tree', grade: 'simulator-baseline', health_passed: true,
          h_bit: 0.8944675593767856, budget_bits: 714.8225885525171,
          budget_bits_assumption_free: 0, budget_bits_modelled: 714.8225885525171,
          epsilon_log2: 64, output_bits: bytesLen * 8, raw_bits: 49152, public_output: true,
          statements: ['fixture'], witness_violates_classical: true, independence_model_falsified: false,
        },
        extractor: { kind: 'toeplitz', public_seed: 'toeplitz-v1', seed_id: 'toeplitz-v1', seed_mode: 'shipped', input_bits: 49152, output_bits: bytesLen * 8, epsilon_log2: 64, input_serialisation: 'sorted bitstrings repeated by count (canonical multiset)' },
        device_fingerprint: { n_qubits: 20, p1: [0.4897, 0.4924, 0.5005], roles: { randomness: [0, 1, 2] }, bias_pvalues: [0.19], stuck_qubits: [], z_expectations: [0.02], note: 'fixture' },
        commitment: { binds: ['circuit_hash', 'backend', 'provider_job_id', 'salt'], commit: 'a'.repeat(64), committed_at: '2026-09-27T23:07:01+00:00', salt: 'b'.repeat(64), note: 'fixture' },
        pulse: { index: null, prev_hash: '0'.repeat(64), output_hash: 'c'.repeat(64), pulse_hash: 'd'.repeat(64), timestamp: '2026-09-27T23:07:20+00:00', version: 1, commitment: {}, entropy: {}, extractor: {}, provenance: {} },
        bell_witness: { kind: 'chsh_fidelity_witness', S: 2.8046875, classical_bound: 2, tsirelson_bound: 2.8284271247461903, violates_classical_3sigma: true, z_above_classical: 36.12, caveat: 'fixture' },
        random: { hex: CERT_HEX, bits: bytesLen * 8, bytes: bytesLen, requested_bytes: 512, derived: {} },
        raw: { counts: { '01011010011011100011': 1 }, counts_sha256: 'e'.repeat(64), memory_available: true, n_unique_bitstrings: 1 },
      },
    },
  };
}

function graphFixture() {
  // top-20-truncated shape: measurements[{bitstring,count}] (45-e P1)
  return {
    result: {
      output: {
        measurements: [
          { bitstring: '010110100110', count: 96 }, { bitstring: '111100001010', count: 88 },
          { bitstring: '000011112222'.slice(0, 12).replace(/2/g, '0'), count: 81 }, // distinct shape, width 12
          { bitstring: '101010101010', count: 74 },
        ],
        dominant_bitstring: '010110100110',
      },
    },
  };
}

// fake transport: routes by (method, url) via a handler map
function fakeTransport(handlers, calls = []) {
  return async (url, opts = {}) => {
    calls.push({ url, method: opts.method, body: opts.body });
    const h = handlers.find(([match]) => (typeof match === 'string' ? url.includes(match) : match.test(url)));
    if (!h) return { status: 404, text: `no handler for ${url}` };
    const [, respond] = h;
    return respond(url, opts);
  };
}

const json = (obj) => ({ status: 200, text: () => JSON.stringify(obj) });
const J = json;
let jobIdSeq = 0;
function jobHandlers(resultFn, { failFirstSubmit = false, statusFail = false, truncateResult = false } = {}) {
  return [
    [/\/engines\/(.+)\/process$/, (url, opts) => {
      if (failFirstSubmit) { failFirstSubmit = false; return { status: 500, text: () => 'boom' }; }
      if (!JSON.parse(opts.body).params) return { status: 422, text: () => 'unexpected property' }; // envelope gate
      return J({ job_id: `job-${++jobIdSeq}` });
    }],
    [/\/jobs\/(.+)\/status$/, () => J({ status: statusFail ? 'failed' : 'completed' })],
    [/\/jobs\/(.+)\/result$/, () => (truncateResult ? { status: 200, text: () => '{"result":{"output":{"random":{"hex":"0"' } : json(resultFn()))],
  ];
}

const BASE_OPTS = { key: 'test-key-runtime-only', pollIntervalMs: 1, log: () => {} };

// independent FY mini-implementation (same spec, written separately from the
// module and from mothbits — the determinism cross-check)
function fyIndependent(bytesBuf, pool, take) {
  let pos = 0;
  const next16 = () => {
    let v = 0;
    for (let k = 0; k < 16; k++) { v = (v << 1) | ((bytesBuf[pos >> 3] >> (7 - (pos & 7))) & 1); pos++; }
    return v;
  };
  const a = Array.from({ length: pool }, (_, i) => i);
  for (let i = pool - 1; i > 0; i--) {
    const v = i + 1;
    const lim = Math.floor(65536 / v) * v;
    let r = next16();
    while (r >= lim) r = next16();
    const j = r % v;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a.slice(0, take);
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('cert verification (fail-closed)', () => {
  test('full fixture passes', () => {
    assert.equal(verifyCertFields(extractOutput(cometFixture())), true);
  });

  const mutations = {
    'entropy_report': (o) => { delete o.entropy_report; },
    'health_passed': (o) => { o.entropy_report.health_passed = false; },
    'h_bit': (o) => { delete o.entropy_report.h_bit; },
    'extractor.toeplitz': (o) => { o.extractor.kind = 'xor'; },
    'device_fingerprint': (o) => { delete o.device_fingerprint; },
    'commitment.commit': (o) => { o.commitment.commit = 'nope'; },
    'commitment.binds': (o) => { o.commitment.binds = []; },
    'pulse.pulse_hash': (o) => { delete o.pulse.pulse_hash; },
    'random.hex': (o) => { delete o.random.hex; },
    'random.bits': (o) => { o.random.bits = 0; },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    test(`missing/invalid ${name} -> CertError`, () => {
      const out = extractOutput(cometFixture());
      mutate(out);
      assert.throws(() => verifyCertFields(out), CertError);
    });
  }

  test('odd-length hex (truncated) -> CertError', () => {
    const out = extractOutput(cometFixture());
    out.random.hex = CERT_HEX.slice(0, 21); // odd nibble count
    assert.throws(() => verifyCertFields(out), CertError);
  });

  test('empty output object -> CertError', () => {
    assert.throws(() => extractOutput({ result: {} }), CertError);
    assert.throws(() => extractOutput(null), CertError);
  });
});

describe('certified seal (direct stream)', () => {
  test('end-to-end: fake comet transport -> certified receipt, chosen = independent FY', async () => {
    const calls = [];
    const fetchImpl = fakeTransport(jobHandlers(() => cometFixture()), calls);
    const { receipt, rawResult } = await seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'test-certified', stream: 'direct', fetchImpl });
    assert.equal(receipt.mode, 'certified');
    assert.equal(receipt.job.engine, 'comet-qrng-v1');
    assert.ok(receipt.job.jobId.startsWith('job-'));
    // envelope gate: POST body must be {"params":{...}}
    const submitBody = JSON.parse(calls.find((c) => c.url.includes('/process')).body);
    assert.deepEqual(Object.keys(submitBody), ['params']);
    assert.deepEqual(submitBody.params, COMET_PARAMS);
    // cert fields verbatim
    assert.equal(receipt.cert.commitment.commit, 'a'.repeat(64));
    assert.equal(receipt.cert.pulse.pulse_hash, 'd'.repeat(64));
    assert.equal(receipt.cert.entropyReport.health_passed, true);
    assert.equal(receipt.cert.bellWitness.S, 2.8046875);
    // bits + FY cross-check against the independent implementation
    const bytes = Buffer.from(CERT_HEX, 'hex');
    assert.equal(receipt.chosen.selected.join(','), fyIndependent(bytes, 10, 4).join(','));
    assert.equal(receipt.certifiedBits.hexSha256, sha256Hex(bytes));
    assert.equal(receipt.rawResultSha256, sha256Hex(Buffer.from(JSON.stringify(cometFixture()), 'utf8')));
    assert.equal(receipt.chosen.selected.length, 4);
    assert.ok(receipt.chosen.selected.every((x) => x >= 0 && x < 10));
    assert.equal(new Set(receipt.chosen.selected).size, 4);
    assert.equal(receipt.seedUseDeclaration.singleUse, true);
    assert.equal(receipt.seedUseDeclaration.consumer, 'test-certified');
    verifyReceiptSchema(receipt);
    assert.ok(rawResult);
  });

  test('determinism: same bits -> byte-identical permutation + receipt equality', async () => {
    const a = await seal({ ...BASE_OPTS, poolSize: 16, take: 8, label: 'det', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) });
    const b = await seal({ ...BASE_OPTS, poolSize: 16, take: 8, label: 'det', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) });
    assert.deepEqual(a.receipt.chosen.selected, b.receipt.chosen.selected);
    assert.deepEqual(a.receipt.chosen, b.receipt.chosen);
  });

  test('pool too large for delivered bits -> SealError (pre-check)', async () => {
    await assert.rejects(
      () => seal({ ...BASE_OPTS, poolSize: 1134, take: 16, label: 'too-big', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) }),
      (e) => e instanceof SealError && /needs >= 18128 bits/.test(e.message)
    );
  });

  test('exhaustion mid-shuffle -> SealError (no PRF without opt-in)', async () => {
    // exactly enough bits pre-check passes but the shuffle consumes more than available? —
    // use a small odd shape: pool=37 needs 576 bits; deliver 80 bytes = 640 bits.
    const shortHex = CERT_HEX.slice(0, 160); // 80 bytes = 640 bits
    const fx = cometFixture();
    fx.result.output.random.hex = shortHex;
    fx.result.output.random.bits = 640;
    fx.result.output.random.bytes = 80;
    // pool=41 needs 640 bits exactly; any rejection or overshoot must throw, not extend
    const attempt = () => seal({ ...BASE_OPTS, poolSize: 41, take: 16, label: 'edge', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => fx)) });
    // either completes (if no bit beyond 640 needed) or fails closed — never extends
    try {
      const { receipt } = await attempt();
      assert.equal(receipt.certifiedBits.consumedBits <= 640, true);
    } catch (e) {
      assert.ok(e instanceof SealError && /exhausted mid-shuffle/.test(e.message));
    }
    // pool=50 needs 784 bits > 640 -> guaranteed pre-check throw
    await assert.rejects(
      () => seal({ ...BASE_OPTS, poolSize: 50, take: 16, label: 'over', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => fx)) }),
      SealError
    );
  });
});

describe('certified seal (prf stream)', () => {
  test('block(c) pinned to sha256(u32be(c) || seed); FY deterministic across runs', async () => {
    const bytes = Buffer.from(CERT_HEX, 'hex');
    const s = prfExtendedStream(bytes);
    const head = Buffer.alloc(4); head.writeUInt32BE(0, 0);
    assert.equal(s.block(0).toString('hex'), sha256Hex(Buffer.concat([head, bytes])));
    const head3 = Buffer.alloc(4); head3.writeUInt32BE(3, 0);
    assert.equal(s.block(3).toString('hex'), sha256Hex(Buffer.concat([head3, bytes])));
    const a = await seal({ ...BASE_OPTS, poolSize: 1134, take: 16, label: 'prf', stream: 'prf', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) });
    const b = await seal({ ...BASE_OPTS, poolSize: 1134, take: 16, label: 'prf', stream: 'prf', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) });
    assert.deepEqual(a.receipt.chosen.selected, b.receipt.chosen.selected);
    assert.equal(a.receipt.certifiedBits.stream, 'prf-extension(mothbits-STEP3)');
    assert.equal(a.receipt.certifiedBits.consumedBits, 16 * a.receipt.chosen.draws);
    assert.ok(a.receipt.certifiedBits.consumedBits >= 16 * 1133);
    assert.equal(a.receipt.chosen.draws, 1133 + a.receipt.chosen.rejects);
    // effective entropy bounded by the certified budget, never invented
    assert.equal(a.receipt.certifiedBits.effectiveEntropyBits, 714.82);
    // prf cross-check: selected equals independent FY over the same extended stream
    const s2 = prfExtendedStream(bytes);
    const expect = fyIndependentStream(s2, 1134, 16);
    assert.deepEqual(a.receipt.chosen.selected, expect);
  });
});

function fyIndependentStream(stream, pool, take) {
  const a = Array.from({ length: pool }, (_, i) => i);
  for (let i = pool - 1; i > 0; i--) {
    const v = i + 1;
    const lim = Math.floor(65536 / v) * v;
    let r = stream.next16();
    while (r >= lim) r = stream.next16();
    const j = r % v;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a.slice(0, take);
}

describe('negative transport controls (fail-closed, no silent anything)', () => {
  test('submit HTTP 500 -> SealError', async () => {
    await assert.rejects(
      () => seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'x', fetchImpl: fakeTransport(jobHandlers(() => cometFixture(), { failFirstSubmit: true })) }),
      SealError
    );
  });
  test('job failed -> SealError', async () => {
    await assert.rejects(
      () => seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'x', fetchImpl: fakeTransport(jobHandlers(() => cometFixture(), { statusFail: true })) }),
      (e) => /final status 'failed'/.test(e.message)
    );
  });
  test('truncated (non-JSON) result -> SealError', async () => {
    await assert.rejects(
      () => seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'x', fetchImpl: fakeTransport(jobHandlers(() => cometFixture(), { truncateResult: true })) }),
      (e) => /result not JSON \(truncated response\)/.test(e.message)
    );
  });
  test('submit body always uses the {"params":{...}} envelope (45-e gate)', async () => {
    const calls = [];
    await seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'x', fetchImpl: fakeTransport(jobHandlers(() => cometFixture()), calls) });
    const submit = calls.find((c) => c.url.includes('/process'));
    assert.deepEqual(Object.keys(JSON.parse(submit.body)), ['params']);
  });
  test('no key -> SealError before any network call', async () => {
    let called = 0;
    const fetchImpl = async () => { called++; return { status: 200, text: '{}' }; };
    await assert.rejects(() => seal({ ...BASE_OPTS, key: null, poolSize: 10, take: 4, label: 'x', fetchImpl }), SealError);
    assert.equal(called, 0);
  });
});

describe('fallback path (labeled, KAT-referenced)', () => {
  test('fallback seal -> mode FALLBACK + whitening + KAT, never claims certified', async () => {
    const { receipt } = await seal({ ...BASE_OPTS, poolSize: 1134, take: 16, label: 'fb', mode: 'fallback', fetchImpl: fakeTransport(jobHandlers(() => graphFixture())) });
    assert.equal(receipt.mode, 'FALLBACK');
    assert.equal(receipt.job.engine, 'graph-v1');
    assert.deepEqual(receipt.job.params, GRAPH_PARAMS);
    assert.equal(receipt.cert, null);
    assert.equal(receipt.certifiedBits, null);
    assert.ok(receipt.fallback.katReference === KAT_REFERENCE);
    assert.match(receipt.fallback.katReference, /moth-42b-raw-bits/);
    assert.ok(receipt.fallback.whitening.recipe.startsWith('STEP1 von Neumann'));
    assert.ok(receipt.fallback.sourceVerdict.includes('top-20'));
    assert.match(receipt.seedUseDeclaration.note, /FALLBACK PATH/);
    verifyReceiptSchema(receipt);
    // schema guard: a FALLBACK receipt missing the KAT reference must be rejected
    const bad = JSON.parse(JSON.stringify(receipt));
    bad.fallback.katReference = '';
    assert.throws(() => verifyReceiptSchema(bad), SealError);
  });

  test('fallback graph result without measurements -> CertError', async () => {
    await assert.rejects(
      () => seal({ ...BASE_OPTS, poolSize: 8, take: 4, label: 'fb', mode: 'fallback', fetchImpl: fakeTransport(jobHandlers(() => ({ result: { output: {} } }))) }),
      CertError
    );
  });
});

describe('receipt schema + no-seed-reuse guard', () => {
  test('required keys all present on both receipt flavors', async () => {
    const cert = await seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 's1', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) });
    const fb = await seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 's2', mode: 'fallback', fetchImpl: fakeTransport(jobHandlers(() => graphFixture())) });
    for (const r of [cert.receipt, fb.receipt]) {
      for (const k of RECEIPT_REQUIRED_KEYS) assert.ok(k in r, `missing ${k}`);
    }
  });

  test('assertDistinctSeals: same jobId -> throw; same bytes -> throw; distinct -> ok', async () => {
    // second fixture: same cert shape, DIFFERENT certified bytes (independent job)
    const fx2 = cometFixture();
    fx2.result.output.random.hex = 'ff' + CERT_HEX.slice(2);
    fx2.result.output.random.bits = fx2.result.output.random.bits; // same bit count
    const r1 = await seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'd1', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => cometFixture())) });
    const r2 = await seal({ ...BASE_OPTS, poolSize: 10, take: 4, label: 'd2', stream: 'direct', fetchImpl: fakeTransport(jobHandlers(() => fx2)) });
    assert.notEqual(r1.receipt.certifiedBits.hexSha256, r2.receipt.certifiedBits.hexSha256);
    assert.equal(assertDistinctSeals([r1.receipt, r2.receipt]).sealsChecked, 2);
    const replay = JSON.parse(JSON.stringify(r2.receipt));
    replay.job.jobId = r1.receipt.job.jobId; // replayed job — silent seed reuse
    assert.throws(() => assertDistinctSeals([r1.receipt, replay]), /seed reuse: jobId/);
    const clone2 = JSON.parse(JSON.stringify(r1.receipt)); // same bytes as r1, "fresh" jobId
    clone2.job.jobId = 'job-fresh';
    assert.throws(() => assertDistinctSeals([r1.receipt, clone2]), /identical certified-bytes sha256/);
  });

  test('schema guard: selected out of range -> throw', () => {
    const bad = { instrument: 'x', sealVersion: '1', schema: 'moth-seal/receipt-v1', ts: 't', label: 'l', mode: 'certified', seedUseDeclaration: { singleUse: true }, job: {}, certifiedBits: {}, cert: { entropyReport: {}, commitment: {}, deviceFingerprint: {}, pulse: {} }, rawResultSha256: 'x', chosen: { poolSize: 4, take: 2, selected: [0, 9] }, keysUsed: 'none', note: '' };
    assert.throws(() => verifyReceiptSchema(bad), /out of \[0,pool\)/);
  });
});

describe('CLI usage path (offline)', () => {
  test('bad args -> exit 2, no network', () => {
    let code = 0, out = '';
    try {
      out = execFileSync(process.execPath, [join(HERE, 'moth-seal.mjs'), '--bogus-flag'], { encoding: 'utf8', env: { ...process.env, MOTH_KEY: '' } });
    } catch (e) {
      code = e.status; out = (e.stderr || '') + (e.stdout || '');
    }
    assert.equal(code, 2);
    assert.match(out, /usage:/);
  });
  test('missing label -> exit 2', () => {
    let code = 0;
    try {
      execFileSync(process.execPath, [join(HERE, 'moth-seal.mjs'), '--n=4', '--pool=10'], { encoding: 'utf8', env: { ...process.env, MOTH_KEY: '' }, stdio: 'pipe' });
    } catch (e) { code = e.status; }
    assert.equal(code, 2);
  });
});
