// witness.mjs — the fleet witness receipt grammar (44-b mavis adoption).
//
// ADOPTION + HARDENING of SuperInstance/mavis-substrate-walker (pinned commit
// 808f0d3ec8eaaba656412188e8337479e5d0b42a): mavis's WitnessChain anchors each
// witness to the last THREE witnesses (rolling window, FNV1a-64). This grammar
// hardens that to a SINGLE STRICT PARENT (full sha256 of the previous
// receipt's canonical form; first receipt's parent = "GENESIS"), so ANY
// tamper, skip, or reorder anywhere breaks verification — fail-closed by
// construction. sha256 replaces FNV1a-64 to match the fleet's other
// transparency instruments (rekor/VC work in embassy/transparency).
//
// GRAMMAR (per witness-grammar/claims.json):
//   receipt = { claim: string,
//               inputs_sha256: 64-hex,   // content address of what was read
//               output_sha256: 64-hex,   // content address of what was produced
//               parent: 64-hex | "GENESIS",  // sha256 of the PREVIOUS receipt
//               ts: ISO-8601 string }
//   id(receipt) = sha256(canonical_json(receipt)) hex
//   chain file  = JSONL, one receipt per line, append-only
//   tip         = id of the last receipt (what an external pin anchors to)
//
// STDLIB ONLY (node:crypto, node:fs). Node 24, ESM.
import { createHash } from 'node:crypto';

export const GENESIS = 'GENESIS';
export const HEX64 = /^[0-9a-f]{64}$/;

/** canonical form: sorted keys, tight separators, UTF-8 (fleet convention,
 *  same shape as mavis hash_witness / quilt tape _canon). */
export function canon(receipt) {
  const keys = Object.keys(receipt).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(receipt[k])}`);
  return `{${parts.join(',')}}`;
}

export const sha256Hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/** id of a receipt = sha256 of its canonical form. */
export const receiptId = (receipt) => sha256Hex(canon(receipt));

/** field-level validation; returns [ok, error]. */
export function validateFields(receipt) {
  if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return [false, 'receipt is not an object'];
  }
  const keys = Object.keys(receipt).sort();
  const want = ['claim', 'inputs_sha256', 'output_sha256', 'parent', 'ts'];
  if (keys.join(',') !== want.join(',')) {
    return [false, `fields must be exactly ${want.join(',')} (got: ${keys.join(',')})`];
  }
  if (typeof receipt.claim !== 'string' || receipt.claim.length === 0) {
    return [false, 'claim must be a non-empty string'];
  }
  for (const f of ['inputs_sha256', 'output_sha256']) {
    if (typeof receipt[f] !== 'string' || !HEX64.test(receipt[f])) {
      return [false, `${f} must be 64 lowercase hex chars`];
    }
  }
  if (receipt.parent !== GENESIS
      && (typeof receipt.parent !== 'string' || !HEX64.test(receipt.parent))) {
    return [false, 'parent must be 64 hex chars or "GENESIS"'];
  }
  if (typeof receipt.ts !== 'string' || receipt.ts.length === 0
      || Number.isNaN(Date.parse(receipt.ts))) {
    return [false, 'ts must be an ISO-8601 parseable string'];
  }
  return [true, null];
}

/** Verify a chain (array of receipts, in file order).
 *  Returns { ok, receipts, tip, error } — ok=false on ANY failure.
 *  opts.expectTip: fail-closed pin on the chain tip. */
export function verifyChain(receipts, opts = {}) {
  if (!Array.isArray(receipts)) {
    return { ok: false, receipts: 0, tip: null, error: 'chain is not an array' };
  }
  if (receipts.length === 0) {
    return { ok: false, receipts: 0, tip: null, error: 'empty chain (fail-closed)' };
  }
  const seen = new Set();
  let prevId = GENESIS;
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const [fieldsOk, fieldErr] = validateFields(r);
    if (!fieldsOk) {
      return { ok: false, receipts: i, tip: null, error: `receipt ${i}: ${fieldErr}` };
    }
    if (i === 0 && r.parent !== GENESIS) {
      return { ok: false, receipts: i, tip: null, error: `receipt 0: parent must be "GENESIS" (got ${r.parent.slice(0, 12)}...)` };
    }
    if (i > 0 && r.parent !== prevId) {
      return { ok: false, receipts: i, tip: null, error: `receipt ${i}: parent link broken (expected ${prevId.slice(0, 12)}..., got ${String(r.parent).slice(0, 12)}...)` };
    }
    const id = receiptId(r);
    if (seen.has(id)) {
      return { ok: false, receipts: i, tip: null, error: `receipt ${i}: duplicate id ${id.slice(0, 12)}...` };
    }
    seen.add(id);
    prevId = id;
  }
  const tip = prevId;
  if (opts.expectTip && opts.expectTip !== tip) {
    return { ok: false, receipts: receipts.length, tip, error: `tip mismatch (computed ${tip.slice(0, 12)}..., expected ${String(opts.expectTip).slice(0, 12)}...)` };
  }
  return { ok: true, receipts: receipts.length, tip, error: null };
}

/** Parse a JSONL chain file (string) into receipts; throws on bad JSON. */
export function parseChainFile(text) {
  return text.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

/** Build a receipt anchored to the previous one (or GENESIS). */
export function makeReceipt({ claim, inputs_sha256, output_sha256, parent, ts }) {
  return { claim, inputs_sha256, output_sha256, parent, ts };
}
