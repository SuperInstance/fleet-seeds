// run_edges.mjs — lane 41-d edge-case battery runner (JS side).
// Reads edges_stream.json, executes each op through the FOREIGN repo's
// arch/q32.mjs + arch/kernels.mjs (imported READ-ONLY via absolute path),
// encodes results with the same enc() contract as e_a1_conformance.mjs,
// prints one JSON per line: {i, op, result}.
import { readFileSync } from 'node:fs';
import { satI64 } from '/home/z/my-project/download/pt-quilt-arch/arch/q32.mjs';
import {
  mulNorm, mulWgslSplit, addRaw, subRaw, absRaw, sqrtRaw, divRaw,
  tokenEnergy, triangleIsClosed, gluePairs, solveElastica, correlate,
} from '/home/z/my-project/download/pt-quilt-arch/arch/kernels.mjs';

const stream = JSON.parse(readFileSync(new URL('./edges_stream.json', import.meta.url), 'utf8'));

function execOp(op) {
  switch (op.op) {
    case 'add': return addRaw(BigInt(op.a), BigInt(op.b));
    case 'sub': return subRaw(BigInt(op.a), BigInt(op.b));
    case 'mul': return mulNorm(BigInt(op.a), BigInt(op.b));
    case 'div': return divRaw(BigInt(op.a), BigInt(op.b));
    case 'sqrt': return sqrtRaw(BigInt(op.a));
    case 'abs': return absRaw(BigInt(op.a));
    case 'satadd': return satI64(BigInt(op.a) + BigInt(op.b));
    case 'satsub': return satI64(BigInt(op.a) - BigInt(op.b));
    case 'wgslmul': return mulWgslSplit(BigInt(op.a), BigInt(op.b));
    case 'energy': return tokenEnergy(BigInt(op.c), BigInt(op.n));
    case 'triclose': return triangleIsClosed(op.bits.map((b) => BigInt(b)));
    case 'glue': {
      const toks = op.ids.map((id, i) => ({
        id, invariant: op.inv[i], boundary_offset: op.off[i], boundary_count: op.cnt[i],
      }));
      return gluePairs(toks, op.bounds.map((b) => BigInt(b)));
    }
    case 'elastica': {
      const arch = op.kappa.map((k, i) => ({ p: [0n, 0n, 0n], kappa: BigInt(k), f: BigInt(op.f[i]) }));
      return solveElastica(arch, { n: arch.length, iterations: op.iters, dt: 0n }).map((a) => a.kappa);
    }
    case 'correlate': {
      const deltas = op.stage.map((s, i) => ({ from: Math.floor(i / op.ticks), tick: i % op.ticks, stage: BigInt(s), velocity: 0n }));
      return correlate(deltas, { n_instances: op.n, n_ticks: op.ticks, stride: op.ticks });
    }
    default: throw new Error('bad op ' + op.op);
  }
}

// enc identical to e_a1's contract (bigint|number->dec string, bool->1|0, null)
function enc(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === 'bigint') return x.toString();
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (typeof x === 'number') return String(x);
  if (Array.isArray(x)) return x.map(enc);
  const o = {};
  for (const k of Object.keys(x)) o[k] = enc(x[k]);
  return o;
}

stream.ops.forEach((op, i) => {
  const r1 = enc(execOp(op));
  const r2 = enc(execOp(op)); // determinism: same op twice
  console.log(JSON.stringify({ i, op: op.op, result: r1, same: JSON.stringify(r1) === JSON.stringify(r2) }));
});
