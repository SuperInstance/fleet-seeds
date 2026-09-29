// append_jepr8_registry.mjs — wave-62 keeper fold: JEPA-R8 into the fleet
// experiment registry. Round-8 = first MIXED round in registry history: 5/6
// predictions PASS, MECH FAIL sealed verbatim on its pre-priced saturation
// branch. Verdict PARTIAL refers to the claim set (21/22), NOT execution
// completeness (all 6 predictions resolved; determinism chain extended to r8).
// Append-only: validated with --against.
import { readFileSync, copyFileSync, appendFileSync } from 'node:fs';

const row = {
  set_id: 'JEPA-R8',
  repo: 'SuperInstance/quilt-jepa',
  commit: 'e187902',
  predictions: 6,
  verdict: 'PARTIAL',
  verdict_commit: 'e187902',
  registration_ref: 'quilt-jepa registration-v8.json (sealed 260c01ba, commit b5bc818, pre-run order verified) + resolution-m8-m11.json (beceb96a) + registration-coverage-v2.json (ea74809f); dual-instrument resolution per the wave-61 instruments committed at 4ed0527',
  brier: null,
  ts: '2026-09-29T17:15:00Z',
  notes: '5/6 PASS, 1 FAIL (honest, pre-priced) — round COMPLETE. MECH FAIL: leg-1 dose-ordering HELD (Spearman 1.0, 7 doses, three run7 ratios bit-exact) but leg-2 compounding REFUTED — rho20_2 = 0.955014 in [rho20_1 = 0.931166, 1), ratio2(3e-4) = 1.126893 >= 1: the plasticity advantage PERSISTS but does not GROW = one-time re-balancing, not a compounding asset (sealed verbatim, zero threshold surgery). GWIN8 PASS: g(0.1,W300) = 0.27634 local-minimum vs g(0.2) = 0.25370 bit-exact, dip 0.073635 >= 0.05. REDOSE PASS: rate(2e-4) re-bound bit-exact, D = 85387 = 2.83x D_wd0 >= 60348 (round-6 gate verbatim), guards unrelaxed — decision of record: wd 2e-4 = plasticity-optimal cured-dose candidate for round 9, wd 3e-4 remains longevity main dose. OVERDECAY PASS: ratio(1e-3) = 0.570098 @20k / 0.508588 @100k, NO-REVERSAL holds — the advantage GROWS at 3.3x the main dose. P-carried/P-R4 PASS: all 17 carried claims reproduce bit-exactly. Determinism crown: probe==run==twin==r4..r8, run8.json reproduced BYTE-IDENTICAL (sha 0d08ca2d, tip c37d617c), cross-checks zero mismatches. M8 coverage rounds 4-8: claims 8/11/14/18/22 (cum 73), headlines 21/22 (FAIL honestly carried), 40 receipts-level cells, instrument ran twice byte-identical — M8 HELD, its registered FAIL event did not fire. M11 tags: 4/4 resolved (MECH FAIL / GWIN8 PASS / REDOSE PASS / OVERDECAY PASS; leg-1 needed >=3 SATISFIED), leg-2 NOT-APPLICABLE over the EMPTY unsealed set exactly per the advance receipt at 4ed0527. $0 external API spend.',
};

const f = 'lode/registry.jsonl';
copyFileSync(f, f + '.pre-jepr8');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('JEPA-R8 appended');
