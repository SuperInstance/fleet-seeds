// append_a13_registry.mjs — wave-61 keeper fold: JEV-A13 into the fleet
// experiment registry. A13 = jev-garden's budget-cap law execution (M10+M4
// header), PASS 4/4 at commit d05e1d9. Append-only: validated with --against.
import { readFileSync, copyFileSync, appendFileSync } from 'node:fs';

const row = {
  set_id: 'JEV-A13',
  repo: 'SuperInstance/jev-garden',
  commit: 'd05e1d9',
  predictions: 4,
  verdict: 'PASS',
  verdict_commit: 'd05e1d9',
  registration_ref: 'jev-garden registration.json seal v22 (self_sha256 2be7eba5c7f5fdcc9b2c0140001d4eed08757012364448dcf0303db4f425b719); header cites lode M10 (arXiv:2609.24972 cost rule) + M4 (budget caps); nearest_prior M4 with governance-vs-executed delta; receipt-of-record provenance note receipted (v21 run-of-record tip d46a0a1c reproduced exactly, v22 re-run measured-bytes-identical modulo registered stamp class)',
  brier: null,
  ts: '2026-09-29T05:15:00Z',
  notes: 'P-A13a cap binds (32 granted/96 refused, arrival-order prefix); P-A13b zero degradation at pre-stated threshold (capped==uncapped==default==1378/1418); P-A13c M10 need-side contrast (mean top.p granted 0.425716 <= refused 0.428008); P-A13d house bindings green (twin, midpoint twins 16/16, smoke 9/9, A12 regression stands). Spend vs the registration\'s own M4 cap: $0.00/0 calls/0 tokens.',
};

const f = 'lode/registry.jsonl';
copyFileSync(f, f + '.pre-a13');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('JEV-A13 appended');
