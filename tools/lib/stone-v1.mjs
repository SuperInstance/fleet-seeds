// stone-v1.mjs — 43-c tool-builder's OWN independent stone chain verifier.
//
// PROVENANCE: re-implemented from the normative text of quilt-stone's
// STONE-SPEC.md §stone-v1 and the receipted wave-41/42 cross-verify semantics
// (read-only reference: quilt-stone/stone.mjs @ 36253a7). Shares NO code with
// quilt-stone: a stranger's verifier must not trust the producer's engine.
//
// LAW (stone-v1):
//   * row 0 must be kind:'stone.header' (carrying alg:'stone-v1');
//   * genesis 'STONE-GENESIS-1' (or the header's own recorded genesis);
//   * row_hash = SHA-256(UTF-8(canonicalJSON([prev, row-without-row_hash])));
//   * canonicalJSON: object keys sorted recursively by Unicode code unit,
//     undefined-valued keys skipped, arrays keep order, scalars via
//     JSON.stringify semantics, NO whitespace;
//   * v2 ANNOTATION rows (kind 'stone.*' except 'stone.header') carry a
//     SELF-hash computed against the current tip but the tip NEVER advances
//     past them (STONE-V2-PILOTS; the staple sits outside the hashed prefix
//     while every byte of it stays tamper-evident);
//   * tip = hash of the last NON-annotation row (the hashed body tip).
//
// Zero dependencies, node:crypto only. Keys: none.

import { createHash } from 'node:crypto';

export const STONE_V1_GENESIS = 'STONE-GENESIS-1';

// Recursive key-sorted canonical JSON (the exoj/stone dialect; insertion
// order never matters because keys are sorted at every level).
export function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
}

const sha256Hex = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

export function isAnnotation(row) {
  return typeof row?.kind === 'string' && row.kind.startsWith('stone.') && row.kind !== 'stone.header';
}

// rowHash(row, prev) — SHA-256 over canonicalJSON([prev, row-without-row_hash]).
export function rowHash(row, prev) {
  const rest = {};
  for (const k of Object.keys(row)) if (k !== 'row_hash') rest[k] = row[k];
  return sha256Hex(canonicalJSON([prev, rest]));
}

// verifyStoneChain(rows, opts?) -> { ok, links, tip, firstBadIndex, at, why }
//   ok:true  -> links = rows.length, tip = last body-row hash (null if empty)
//   ok:false -> firstBadIndex = index of the first break, why = reason,
//               tip = last GOOD body hash before the break
export function verifyStoneChain(rows, opts = {}) {
  const base = { alg: 'stone-v1' };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, ...base, links: Array.isArray(rows) ? rows.length : 0, tip: null, firstBadIndex: 0, at: null, why: 'chain is empty or not an array' };
  }
  const h0 = rows[0];
  if (!h0 || typeof h0 !== 'object' || h0.kind !== 'stone.header') {
    return { ok: false, ...base, links: rows.length, tip: null, firstBadIndex: 0, at: null, why: 'row 0 is not a stone.header' };
  }
  if (opts.requireAlg !== false && h0.alg !== 'stone-v1') {
    return { ok: false, ...base, links: rows.length, tip: null, firstBadIndex: 0, at: null, why: `header alg is '${h0.alg}', expected 'stone-v1'` };
  }
  const genesis = typeof h0.genesis === 'string' ? h0.genesis : STONE_V1_GENESIS;
  let prev = genesis;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      return { ok: false, ...base, links: rows.length, tip: i > 0 ? prev : null, firstBadIndex: i, at: r?.seq ?? null, why: 'row is not an object' };
    }
    if (r.row_hash === undefined) {
      return { ok: false, ...base, links: rows.length, tip: i > 0 ? prev : null, firstBadIndex: i, at: r.seq ?? null, why: `missing row_hash at ${i}` };
    }
    const want = rowHash(r, prev);
    if (want !== r.row_hash) {
      return { ok: false, ...base, links: rows.length, tip: i > 0 ? prev : null, firstBadIndex: i, at: r.seq ?? null, why: isAnnotation(r) ? 'annotation hash mismatch' : 'hash mismatch' };
    }
    if (!isAnnotation(r)) prev = r.row_hash; // annotations never advance the tip
  }
  return { ok: true, ...base, links: rows.length, tip: prev, firstBadIndex: null, at: null, why: null, genesis };
}

// verifyStoneJsonl(text) — parse a JSONL chain (one JSON object per line) and
// verify. Throws on a malformed line (that IS a verification failure for a
// chain file; callers catch and receipt).
export function verifyStoneJsonl(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const rows = lines.map((l, i) => {
    try { return JSON.parse(l); } catch (e) {
      throw new Error(`line ${i} is not valid JSON: ${e.message}`);
    }
  });
  return verifyStoneChain(rows);
}
