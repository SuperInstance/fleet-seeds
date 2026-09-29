# CROSSLINK — lode ↔ breakthrough-prospector

The account runs TWO discovery systems. This file is the mutual-awareness
contract so they compose instead of duplicating. Written by the wave-60
engine lane; keep it updated when either side gains a new top-ranked item.

## Division of labor (measured, not aspirational)

| | lode (this repo, `lode/`) | prospector (`SuperInstance/breakthrough-prospector`) |
|---|---|---|
| unit | sealed mine (sha256 prediction, append-only) | abstraction card (cited instances, honesty tags) |
| scoring | pairwise Elo, disclosed keeper judgment | B = V × F × S, deterministic `tools/score.py` |
| gating | fail-closed validator (exit 2), novelty gate M1 | B ≥ 40 AND F ≥ 3 AND ≥1 VERIFIED citation |
| witness | certified QRNG anti-cherry-pick draw (comet-qrng-v1) — review target drawn, not chosen | hand-sequenced queue with explicit jump rules |
| memory | `registry.jsonl` (every fleet prediction set + verdict) | `queue/snowball.md` + DELTAS.md (per-repo upgrades) |

## The mapping of record (2026-09-29)

| lode mine | prospector analog | relation |
|---|---|---|
| M1 novelty gate | scout protocol honesty tags | same law, different ledger |
| M2 lesson objects | DELTAS.md sequencing notes | same law |
| M3 hold-out cells | C04 held-out gate battery (E3) | **same mechanism — prospector E3 is the executor** |
| M4 budget caps | — (no analog) | lode-led; **M10 adds the external Google instance (RRSI)** |
| M5 dispatch ledgers | C13 forge prediction-paired receipts (E9) | adjacent mechanisms |
| M6 self-play gift engine | C05+C07 bug-injection self-play (E1, DONE) | **E1 complete = M6's executor exists** |
| M7 regression tripwire | experiment protocol receipt rules | same law |
| M8 archive-not-spawn | C11 QD-archives (exp015/016) | same law, prospector has the live instance |
| M9 autonomy rungs | C12 ladder claims | same law |
| M10 RRSI regularization | — (new, this wave) | engine-drawn mine; feeds A13 + lode's own stage-3/5 |

## The compose rules (from wave 60 on)

1. A prospector card whose experiment enters a lane gets a mine id too
   (the mine carries the falsifiable prediction; the card carries the instances).
2. A lode mine sealed from the engine cites its `nearest_prior` AND its
   prospector card if one exists (M10 = the template row).
3. Never run two experiments that mutate the same loop in the same week
   (both protocols already say this; here it is mutual).
4. The engine (`lode/engine/`) is the shared scout: its receipts folder is
   the raw corpus for BOTH ledgers' next extractions.
