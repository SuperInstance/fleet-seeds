#!/usr/bin/env node
// verify.mjs — walk a witness chain file and verify EVERY hash + parent link
// + (optionally) the pinned chain tip. Exit 0 IFF all good.
//
// Usage:
//   node verify.mjs <chain.jsonl> [--expect-tip=<64-hex>]
//
// Output: one JSON verdict line { ok, receipts, tip, error }.
// Fail-closed: parse errors, field errors, broken parent links, duplicate
// ids, empty chains, and tip mismatches all exit 1.
import fs from 'node:fs';
import process from 'node:process';
import { parseChainFile, verifyChain } from './witness.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const tipArg = args.find((a) => a.startsWith('--expect-tip='));
const expectTip = tipArg ? tipArg.slice('--expect-tip='.length) : undefined;

function fail(error, extra = {}) {
  process.stdout.write(`${JSON.stringify({ ok: false, receipts: extra.receipts ?? 0, tip: extra.tip ?? null, error }, null, 0)}\n`);
  process.exit(1);
}

if (!file) fail('usage: node verify.mjs <chain.jsonl> [--expect-tip=<64-hex>]');

let text;
try {
  text = fs.readFileSync(file, 'utf8');
} catch (e) {
  fail(`cannot read chain file: ${e.message}`);
}

let receipts;
try {
  receipts = parseChainFile(text);
} catch (e) {
  fail(`chain parse error: ${e.message}`);
}

const verdict = verifyChain(receipts, { expectTip });
process.stdout.write(`${JSON.stringify(verdict, null, 0)}\n`);
process.exit(verdict.ok ? 0 : 1);
