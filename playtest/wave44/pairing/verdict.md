# verdict — 44-b pairing schedule (ropesight adoption)

**VERDICT: PASS 4/4 claims (P1 P2 P3 P4), plus a generalization bonus the claims did not dare predict.**
Pre-registered claims: `claims.json` (sha256 `ca8c7567c21e655fe3a714d8e0751833241c10ec8ea68c7b15230eb3aa3d5535`, mtime epoch 1790545604) — registered BEFORE any run; results mtime later.

## Instrument adopted

SuperInstance/ropesight — change-ringing method schedules as zero-coordinator
fair-rotation policy. Pinned clone: commit
`d8b1bb40fd9f797ab96b5b544bf05302fcefcdee` (branch main), imported READ-ONLY
for the fidelity cross-check (`bells/methods.mjs`); the shipped module
`pairing.mjs` is a self-contained stdlib-only reimplementation of their
`plainCourseTokens` derivation (attribution + conventions in its header).
Their clone's `git status` receipted clean after the run.

## Results (full numbers in results.json)

| N | rows (period) | maxMove | ordered-pair coverage | min/max meetings | ratio | maxWait (between) |
|---|---------------|---------|----------------------|------------------|-------|-------------------|
| 3 | 6   | 1 | 6/6   | 2/2   | 1.0 | 3  |
| 4 | 24  | 1 | 12/12 | 6/6   | 1.0 | 7  |
| 5 | 40  | 1 | 20/20 | 8/8   | 1.0 | 8  |
| 6 | 60  | 1 | 30/30 | 10/10 | 1.0 | 9  |
| 7 | 84  | 1 | 42/42 | 12/12 | 1.0 | 10 |
| 8 | 112 | 1 | 56/56 | 14/14 | 1.0 | 11 |

- **P1 — N=6 uniform vs RR: PASS.** Method schedule covers **30/30** ordered
  adjacent pairs at EXACTLY **10** meetings each (max/min = 1.0); the 60-row
  cyclic round-robin covers exactly **6/30** pairs at 50 meetings each —
  a 5x coverage multiplier at identical row budget.
- **P2 — bounded wait: PASS.** Method max wait = **9 rows between consecutive
  meetings** (distance reading 10; wave-43-b's registered metric, matched
  exactly). RR baseline's max wait = 1 (its 6 fixed pairs meet almost every
  row — that is precisely its failure: the other 24 pairs wait FOREVER,
  never-meeting, wait = ∞).
- **P3 — generalization (registered with real falsification risk): PASS, and
  stronger than predicted.** Registered bar: N=5 and N=7 achieve full coverage
  with max/min ≤ 2.0. MEASURED: **perfect uniformity (ratio 1.0) at BOTH**, and
  in fact at every tested stage N=3..8 (informational rows above). Meetings per
  pair = period/N = 2(n−1) — exactly ropesight's conserved-cover constant: the
  adjacent-pair schedule inherits the height law.
- **P4 — fidelity: PASS.** The reimplementation's rows are **BYTE-EQUAL** to
  the pinned ropesight clone (`courseFacts(name).rows`) for all five METHODS
  stages (Extent on Three 3, Doubles 5, Minor 6, Triples 7, Major 8), and
  maxMove = 1 (L49 law) holds at every tested stage.

## Honest limits

- "Uniform at every tested stage" is measured for N=3..8 only; N ≥ 9 is
  UNTESTED (Plain Bob plain courses are true and close for all n ≥ 3 per the
  derivation, but pair-coverage uniformity at larger stages is unproven here).
- The schedule is the PLAIN course (no calls). Conductor calls (`bobToken`,
  `courseTokens` in ropesight) alter pair trajectories; unmeasured here.
- "Wait" is internal-gap only (rows strictly between consecutive meetings),
  matching wave-43-b's registered metric; head/tail wait to the first/last
  meeting is not folded in.
- Round-robin baseline is the wave-43-b cyclic construction; other RR variants
  (e.g. circle-method 1-factorizations at even N) are NOT compared — they are
  a genuinely fairer pairing baseline at even N and the right next benchmark.

## Use

```js
import { plainBobSchedule, pairStats, roundRobinRows } from './pairing.mjs';
const s = plainBobSchedule(6);          // { rows, period, true, closed, maxMove }
const st = pairStats(s.rows, 6);        // coverage uniformity + maxWait
node pairing.mjs --n=6                  # CLI summary
node run.mjs                            # registered experiment (RS_PATH env for the cross-check clone)
```
