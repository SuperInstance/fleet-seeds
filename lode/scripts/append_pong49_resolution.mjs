// append_pong49_resolution.mjs — wave-62 keeper fold: PONG49-BATTERY fires at
// the FIRST seal after window close (2026-09-29T10:04Z). Fired 15:19:52Z and
// 15:19:52.279Z by BOTH registered scorers (scripts/ 53-f copy + embassy/battery/
// 42-d runner of record); all numbers agree (every price, brier, mean, annex
// number byte-equal — agreement checked programmatically before this fold).
// Outcome 0 = NO foreign comment on SuperInstance/pong-quilt#49 within the
// registered window. Append-only: validated with --against.
import { readFileSync, copyFileSync, appendFileSync } from 'node:fs';

import { createHash } from 'node:crypto';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const scoreA = JSON.parse(readFileSync('scripts/pong49_scorecard.json', 'utf8'));
const scoreB = JSON.parse(readFileSync('embassy/battery/pong49_scorecard.json', 'utf8'));
const scoreA_sha = sha('scripts/pong49_scorecard.json');
const scoreB_sha = sha('embassy/battery/pong49_scorecard.json');

const row = {
  set_id: 'PONG49-RESOLUTION',
  repo: 'SuperInstance/fleet-seeds',
  commit: 'FIRST-SEAL-AFTER-CLOSE', // this commit IS the first seal; scorecard sha256s below are the artifact binding
  predictions: 4,
  verdict: 'PASS',
  verdict_commit: 'FIRST-SEAL-AFTER-CLOSE',
  registration_ref: 'tavern/jev_calibration_battery_r8.json #c_pong49 (sha256 93e1ead1...) + scorer pre-registration scripts/pong49_scorer.registration.json (scorer sha256 08b6480f...); holds #1-#8 receipted while ARMED; fired at the FIRST seal after close exactly per L7',
  brier: 0.0049, // lane_37a price of record p=0.07 on outcome 0
  ts: '2026-09-29T15:25:00Z',
  notes: `FIRE RECEIPT: outcome=0 (NO_FOREIGN_REPLY) — zero non-SuperInstance comments on pong-quilt#49 in [2026-09-27T10:04:00Z, 2026-09-29T10:04:00Z], inclusive-window rule applied by both scorers. Dual-run agreement: ALL NUMBERS AGREE (prices 0.07/0.15 + r9 reference 0.13/0.14; briers 0.0049/0.0225/0.0169/0.0196; battery_noul_mean lane=0.10075 jev=0.246475; multiclass annex stand-outcome, brier lane 0.42 / jev 0.3374). Scorecard artifact sha256s at fold time: scripts/ ${scoreA_sha} | embassy/battery/ ${scoreB_sha} — envelopes differ by design (53-f vs 42-d), every number identical (programmatic agreement check receipted in worklog). First fire attempt BEFORE token recovery failed fail-closed (HTTP 403 unauthenticated rate limit, exit 1, no scorecard — receipted); successful fire used the re-armed GITHUB_TOKEN (read-only API). The L7 timing law is now MEASURED: armed 02:20Z, window closed 10:04Z, fired at first seal — never before, never skipped.`,
};

const f = 'lode/registry.jsonl';
copyFileSync(f, f + '.pre-pong49');
appendFileSync(f, JSON.stringify(row) + '\n');
console.log('PONG49-RESOLUTION appended');
