#!/usr/bin/env node
// 46d-round12-fold.mjs — THE LEDGER FOLD (task 46-d): fold round-11's six
// ledger rows into the main tavern ledger, append-only, stone-v1 law.
//
// Design registered BEFORE this build in
//   tavern/round-12/predictions/46d-round12-predictions.json
//   (sha ffb3d245908894642f3ea74789df5160c5cf093a0a0ce8ef24a018733a8db192,
//    mtime 2026-09-28T00:42:17Z — fold_design_registered_before_fold_build)
//
// LAW:
//  * append-only: no existing row is edited, reordered, or deleted
//  * source rows 1-5 are re-parented onto the current main tip — content
//    deep-equal to the standalone sources (canonical-JSON equality of the
//    parsed objects minus row_hash), row_hash recomputed link-by-link
//  * source row 0 (the round-11 stone.header) is embedded VERBATIM inside the
//    fold receipt row — the main ledger keeps exactly one chain header
//  * fail-closed guards: on-disk main tip must equal the registered pre-fold
//    tip; source file sha must equal the registered source sha; the source
//    chain must verify standalone; no prior fold row may exist
//  * stone-v1: row_hash = sha256(canonicalJSON([prev, row-minus-row_hash])),
//    genesis STONE-GENESIS-1 — reimplemented here from the normative text,
//    zero shared code with any producer (43-c / r11 verifier convention)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const REPO = '/home/z/my-project/pt45a-fs';
const MAIN = path.join(REPO, 'tavern/tavern_ledger.jsonl');
const SRC = path.join(REPO, 'tavern/round-11/round11_ledger.jsonl');
const REG = path.join(REPO, 'tavern/round-12/predictions/46d-round12-predictions.json');
const REG_SHA = 'ffb3d245908894642f3ea74789df5160c5cf093a0a0ce8ef24a018733a8db192';
const MAIN_TIP_AT_REG = '1c03b2eb7a2b15e0a6ffec536c0d5c60c3e2586806ca6caaced65f90016f11cb';
const SRC_TIP = 'db324fd05d0a4373b4f8ec8fc395039065e1b54494ba546425fd3e76054dc1b5';
const SRC_SHA = 'bdf3be0641f51b4241d3846b16744e2623bfb4ec24f5374f931d7618d1d19bf5';

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const canon = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const ks = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + ks.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};
const rowHash = (row, prev) => { const r = { ...row }; delete r.row_hash; return sha256(canon([prev, r])); };
const fail = (m) => { console.error('FOLD REFUSED: ' + m); process.exit(1); };

// ---- guards -----------------------------------------------------------------
if (sha256(fs.readFileSync(REG, 'utf8')) !== REG_SHA) fail('registration sha drift');
const main = fs.readFileSync(MAIN, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
if (main.length !== 52) fail(`main ledger has ${main.length} rows, registered 52`);
if (main.at(-1).row_hash !== MAIN_TIP_AT_REG) fail('main tip differs from registered pre-fold tip (concurrent drift?)');
if (main.some((r) => r.kind === 'tavern.fold')) fail('a fold row already exists — never double-fold');
const srcText = fs.readFileSync(SRC, 'utf8');
if (sha256(srcText) !== SRC_SHA) fail('source ledger sha differs from registered sha');
const src = srcText.trim().split('\n').map((l) => JSON.parse(l));
if (src.length !== 6 || src[0].kind !== 'stone.header') fail('source ledger shape unexpected');
// source chain verifies standalone
{ let prev = src[0].genesis ?? 'STONE-GENESIS-1';
  for (let i = 0; i < src.length; i++) { if (rowHash(src[i], prev) !== src[i].row_hash) fail(`source chain break at row ${i}`); prev = src[i].row_hash; }
  if (prev !== SRC_TIP) fail('source tip differs from registered source tip'); }

// ---- build fold rows ----------------------------------------------------------
const mapping = [];
const folded = [];
let prev = MAIN_TIP_AT_REG;
for (let i = 1; i < src.length; i++) {
  const row = JSON.parse(JSON.stringify(src[i])); // deep copy, key order preserved
  const standaloneHash = row.row_hash;
  delete row.row_hash;
  row.row_hash = rowHash(row, prev);
  mapping.push({ source_ordinal: i, source_row_hash: standaloneHash, folded_row_hash: row.row_hash });
  folded.push(row);
  prev = row.row_hash;
}
const method = [
  'append-only fold: source rows 1-5 re-parented onto pre-fold main tip ' + MAIN_TIP_AT_REG + ', content deep-equal to their standalone sources (canonical-JSON equality modulo row_hash), row_hash recomputed link-by-link under stone-v1',
  'source row 0 (round-11 stone.header) embedded verbatim in this receipt row — the main ledger keeps exactly one chain header',
  'no existing row edited, reordered, or deleted; the standalone round-11 chain remains untouched and verifying',
  'registered pre-build in tavern/round-12/predictions/46d-round12-predictions.json sha ' + REG_SHA + ' (fold_design_registered_before_fold_build); builder-compatibility note: tavern/build_ledger.mjs is unrunnable in this repo (quilt-stone import absent, r11 README receipt) and its SECTION-B replay law (verify-then-adopt disk rows) accepts this fold unchanged',
];
const receipt = {
  kind: 'tavern.fold',
  round: 11,
  voice: 'the-fold',
  lane: '46-d',
  message: "Round eleven's six ledger rows are folded into the main ledger: the five content rows re-parented onto the pre-fold tip, content-deep-equal to their standalone sources (round11_ledger.jsonl, six rows, tip db324fd0…, header embedded verbatim in this receipt), plus this receipt row. The fold is append-only — no sealed row was edited or reordered — and the standalone round-11 chain stays untouched: its own verifier stays 16/16. This closes round-11's open thread (1); thread (2), the asset-free blind prior, runs in round twelve.",
  source_ledger: 'tavern/round-11/round11_ledger.jsonl',
  source_sha256: SRC_SHA,
  source_tip: SRC_TIP,
  source_header: JSON.parse(JSON.stringify(src[0])),
  mapping,
  pre_fold_main_tip: MAIN_TIP_AT_REG,
  method,
  registration_sha256: REG_SHA,
  refs: [
    'tavern/round-11/round11_ledger.jsonl (standalone, 6 rows, tip db324fd0…)',
    'tavern/round-11/verify_round11.mjs — ALL CHECKS PASS 16/16 (must stay green)',
    'tavern/round-12/verify_round12.mjs — the fold verifier',
    'tavern/round-12/predictions/46d-round12-predictions.json sha ffb3d245…',
  ],
};
receipt.row_hash = rowHash(receipt, prev);
folded.push(receipt);

// ---- write append-only + re-verify from disk ----------------------------------
fs.appendFileSync(MAIN, folded.map((r) => JSON.stringify(r)).join('\n') + '\n');
const back = fs.readFileSync(MAIN, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
let p = back[0]?.genesis ?? 'STONE-GENESIS-1', ok = true;
for (let i = 0; i < back.length; i++) { if (rowHash(back[i], p) !== back[i].row_hash) { ok = false; console.error(`POST-WRITE CHAIN BREAK at row ${i}`); break; } p = back[i].row_hash; }
// prefix intact?
const prefixOk = main.every((r, i) => back[i].row_hash === r.row_hash);
console.log(JSON.stringify({
  appended: folded.length, main_rows_after: back.length, chain_ok_from_disk: ok, prefix_intact: prefixOk,
  merged_tip: p, old_tip: MAIN_TIP_AT_REG, source_tip: SRC_TIP,
}, null, 1));
if (!ok || !prefixOk) process.exit(1);
