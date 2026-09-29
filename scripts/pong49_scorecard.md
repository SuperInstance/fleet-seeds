# pong49 scorecard — SCORED (scripts/pong49_scorer.mjs, 53-f)

- generated_at: 2026-09-29T15:19:40.032Z
- window: [2026-09-27T10:04:00Z, 2026-09-29T10:04:00Z] (registered: tavern/jev_calibration_battery_r8.json #scoring_rule.resolution_sources.c_pong49)
- registered artifacts sha256: cal=93e1ead1169c3ecb… scores=9c406d01ae1bf0c8… r9=9a729a1a8abff4aa…

## Resolution (AS OF close)
- outcome: **0** (NO_FOREIGN_REPLY)
- rule: any comment authored by an account whose login is not 'SuperInstance' on SuperInstance/pong-quilt #49 within [2026-09-27T10:04:00Z, 2026-09-29T10:04:00Z] = 1, else 0
- evidence: GitHub API comments list: zero non-SuperInstance authors in window

## Brier per registered price (binary, pre-declared rule)
| predictor | p | Brier | source |
|---|---|---|---|
| lane_37a_jev_smith | 0.07 | 0.0049 | tavern/jev_calibration_battery_r8.json#lane_predictions_37a_jev_smith.p_pong49_external_comment |
| jev_r8_battery | 0.15 | 0.0225 | tavern/jev_calibration_battery_r8.json#jev_answers_as_said.p_pong49_external_comment |
| jev_r9_remap_jev_latest | 0.13 | 0.0169 | tavern/jev_remap_r9_rows.jsonl#r9-battery-verbatim-jev-latest |
| jev_r9_remap_jev_preview | 0.14 | 0.0196 | tavern/jev_remap_r9_rows.jsonl#r9-battery-verbatim-jev-preview |

## Registered battery mean (noul questions, 4/4 resolved)
```json
{
  "lane_37a": 0.10075,
  "jev_r8": 0.246475,
  "includes": "3 keeper-sealed r8 resolutions carried verbatim (tavern/jev_battery_scores_r8.json#resolved) + pong49 resolved at close",
  "excludes": "guest_surviving_standing (score type) — excluded per the registration's own unresolved_policy; guest_c5_stance is choice-type, scored in the multiclass annex; r9 remap priors are fresh-prior reference rows, not r8 battery predictors",
  "r8_running_3_resolved_reference": {
    "jev": 0.3211,
    "lane": 0.1327,
    "source": "tavern/jev_battery_scores_r8.json#running_brier_3_resolved"
  }
}
```

## Multiclass annex (guest_c5_stance, keeper-sealed outcome)
```json
{
  "question": "guest_c5_stance",
  "options": [
    "stand",
    "revise",
    "withdraw"
  ],
  "outcome": "stand",
  "outcome_source": "tavern/jev_battery_scores_r8.json#typed_seat_outcome (keeper seal, not re-adjudicated here)",
  "prices": {
    "lane_37a": {
      "stand": 0.5,
      "revise": 0.4,
      "withdraw": 0.1
    },
    "jev_r8": {
      "withdraw": 0.18,
      "revise": 0.29,
      "stand": 0.53
    }
  },
  "brier": {
    "lane_37a": 0.42,
    "jev_r8": 0.3374
  }
}
```

---
Registered artifacts (verbatim, not invented): tavern/jev_calibration_battery_r8.json (lane 0.07 / JEV r8 0.15), tavern/jev_remap_r9_rows.jsonl (JEV r9 priors 0.13 / 0.14), tavern/jev_battery_scores_r8.json (3 sealed resolutions + typed_seat_outcome). Everything not in the registration is watch context and is NEVER scored here.
