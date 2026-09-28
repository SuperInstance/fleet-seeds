#!/usr/bin/env node
// gen_chain.mjs — generate the committed KAT witness chain for 44-b.
//
// The 5 receipts below carry REAL content addresses: sha256s of this wave's
// sibling artifacts (pre-registered claims files -> produced results), so the
// KAT is not a toy — it witnesses the 44-b adoption itself. Generated ONCE
// and committed (kat/chain.jsonl + kat/chain.tip); test.mjs verifies it and
// runs all negative controls against tampered copies.
//
// Usage: node gen_chain.mjs   (writes kat/chain.jsonl + kat/chain.tip)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeReceipt, receiptId } from './witness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (p) => createHash('sha256').update(fs.readFileSync(p), null).digest('hex');

const EQ = path.join(HERE, '..', 'exact-twin');
const PA = path.join(HERE, '..', 'pairing');
const WG = HERE;

const now = () => new Date().toISOString();

let parent = 'GENESIS';
const receipts = [];
function append(claim, inputs, output) {
  const r = makeReceipt({ claim, inputs_sha256: inputs, output_sha256: output, parent, ts: now() });
  parent = receiptId(r);
  receipts.push(r);
}

append(
  '44-b exact-twin audit executed against pinned micrograd-quilt 82c295f1555062d80d7ff087aeb83667675062a3; inputs = pre-registered claims, outputs = measured results (P1-P4 all PASS, 74/74 1-ulp injections flagged)',
  sha(path.join(EQ, 'claims.json')), sha(path.join(EQ, 'results.json')),
);
append(
  '44-b exact rational gradients receipted verbatim (74 gradients, max denominator 67 digits); inputs = audit harness, outputs = gradients.json',
  sha(path.join(EQ, 'audit.py')), sha(path.join(EQ, 'gradients.json')),
);
append(
  '44-b pairing schedule run: Plain Bob method covers all 30 ordered adjacent pairs of 6 participants exactly 10x (ratio 1.0) vs round-robin 6/30; uniformity holds at every tested stage N=3..8; rows byte-equal to pinned ropesight d8b1bb4',
  sha(path.join(PA, 'claims.json')), sha(path.join(PA, 'results.json')),
);
append(
  '44-b pairing.mjs reusable module (plainCourseTokens-style derivation, stdlib-only) committed as the fair-rotation instrument',
  sha(path.join(PA, 'pairing.mjs')), sha(path.join(PA, 'results.json')),
);
append(
  '44-b witness grammar adopted (mavis hardening: single strict sha256 parent chain) — this chain is the KAT; inputs = pre-registered claims, outputs = the generator that emitted this line',
  sha(path.join(WG, 'claims.json')), sha(path.join(WG, 'gen_chain.mjs')),
);

const chainText = receipts.map((r) => JSON.stringify(r)).join('\n') + '\n';
const tip = receipts[receipts.length - 1] ? receiptId(receipts[receipts.length - 1]) : '';

fs.mkdirSync(path.join(HERE, 'kat'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'kat', 'chain.jsonl'), chainText);
fs.writeFileSync(path.join(HERE, 'kat', 'chain.tip'), tip + '\n');
console.log(`wrote kat/chain.jsonl (${receipts.length} receipts) tip=${tip}`);
