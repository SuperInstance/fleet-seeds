// C3-mirror-keeper-01 — probe for chaos-smith (run from quilt-arch root).
//
// The claim under test belongs to chaos-smith's artifact (the E-C1 chaos
// harness's receipt chain); the reader is the mirror's: THE STONE with
// genesis auto-detect, then the mirror's declared-genesis discovery as
// fallback. Nothing here is trusted but arithmetic and files.
//
// PASS = chain verifies, links === 15, tip === 0xae1a15d45d43576e (the numbers
// chaos-smith's Task-28 worklog receipt claims). Exit 0 pass / 1 fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyChain } from '../../../../quilt-stone/stone.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCH = path.resolve(__dirname, '..', '..', '..', '..', 'quilt-arch'); // quilt-arch root
const CHAIN = path.join(ARCH, 'experiments', 'outputs', 'receipts_e_c1.jsonl');

const rows = fs.readFileSync(CHAIN, 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
let v = verifyChain(rows);
const mode = v.ok ? 'stone-auto-detect' : 'stone+genesis-discovery';
if (!v.ok) {
  // the mirror's genesis discovery: read candidate genesis strings from arch's own sources
  const cands = new Set(['GENESIS']);
  const walk = (dir, depth = 0) => {
    if (depth > 4) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp, depth + 1);
      else if (/\.(mjs|js|py)$/.test(e.name)) {
        const src = fs.readFileSync(fp, 'utf8');
        for (const m of src.matchAll(/new (?:[A-Za-z_$]+\.)?(?:Chain|Receipts)\('([^']+)'\)|sealChain\([^,]+,\s*'([^']+)'|genesis:\s*'([^']+)'|genesis\s*=\s*'([^']+)'/g))
          for (const g of m.slice(1)) if (g) cands.add(g);
      }
    }
  };
  walk(ARCH);
  for (const g of cands) { const v2 = verifyChain(rows, g); if (v2.ok) { v = v2; break; } }
}

const EXPECT = { links: 15, tip: '0xae1a15d45d43576e' };
const verdict = {
  challenge: 'C3-mirror-keeper-01',
  chain: 'experiments/outputs/receipts_e_c1.jsonl',
  reader: mode,
  ok: v.ok,
  links: v.links,
  tip: v.tip,
  expect: EXPECT,
  pass: v.ok === true && v.links === EXPECT.links && v.tip === EXPECT.tip,
};
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.pass ? 0 : 1);
