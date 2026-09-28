# G7 — Watt-receipts: the receipt schema for gifted GPU compute

Status: **ADOPTED LAW** (GPU-AGENT-PLAYBOOK G7, registered wave 48; schema landed wave 53, lane 53-f).
Companion validator: `scripts/g7_validate.mjs` (node, stdlib-only). Examples: `scripts/g7/examples/`.

The pricing-first law says: gifted compute must leave usage receipts, exactly like API spend did
(per-call usage tables in the embassy logs; kill criterion "spend without receipts = VOID").
Local GPU compute is gifted compute — watts and GPU-seconds instead of dollars — so every G-lane
run ships a **watt-receipt**. The gate is mechanical, not aspirational:

> **gate.rule: `no receipt → run VOID`** — a G-lane verdict that ships without a schema-valid
> watt-receipt is VOID, regardless of its result. The validator's exit 1 on a receipt file IS the
> gate refusing the receipt: the run it describes is then VOID.

---

## 1. The receipt schema (g7-watt-receipt@1)

One receipt per JSON file, UTF-8, canonical pretty-printed JSON encouraged (not required by the
validator). Unknown extra fields are tolerated and echoed as informational — required fields are
strict. Field-for-field:

```json
{
  "schema": "g7-watt-receipt@1",
  "receipt_id": "g7-wr-G1-001",
  "task_id": "53-x",
  "agent": "lane-x (subagent) | keeper (main Super Z) | <external agent name>",
  "device": {
    "model": "NVIDIA GeForce RTX 4090",
    "vram_gb": 24,
    "driver": "550.54.15 / CUDA 12.4"
  },
  "energy": {
    "joules": 43200.0,
    "watt_hours": 12.0,
    "source": "measured",
    "sampling_method": "nvidia-smi --query-gpu=power.draw --format=csv,noheader,nounits -l 1 sampled at 1 Hz over the whole run window; integral = mean_power_W x wall_seconds / 3600",
    "instrument": "nvidia-smi (NVML power.draw) on the host owning the GPU",
    "derivation": null
  },
  "compute": {
    "gpu_seconds": 43.2,
    "kernel_count": 1204
  },
  "cost": {
    "currency": "USD",
    "amount": 0.144,
    "rate_source": "grid price $0.12/kWh, utility schedule used by the host, quoted 2026-09-28"
  },
  "determinism": {
    "seed": "moth-seal comet-qrng-v1 cert 2026-09-28T… / or integer literal",
    "state_digest": "64 lowercase hex (sha256 of the run-state artifact the receipt binds)"
  },
  "gate": {
    "rule": "no receipt → run VOID",
    "verdict": "PASS"
  }
}
```

### Field contract (what the validator enforces)

| Field | Type / constraint |
|---|---|
| `receipt_id` | non-empty string (convention: `g7-wr-<lane>-<seq>`; uniqueness enforced by your ledger, not the validator) |
| `task_id` | non-empty string (worklog Task ID this receipt belongs to) |
| `agent` | non-empty string |
| `device.model` | non-empty string |
| `device.vram_gb` | number > 0 |
| `device.driver` | non-empty string |
| `energy` | **required object** — a receipt without it is not a receipt (this is the gate's canonical refusal, see `scripts/g7/examples/void-missing-energy.json`) |
| `energy.joules` | number ≥ 0 |
| `energy.watt_hours` | number ≥ 0 and consistent with `joules` (|joules/3600 − watt_hours| ≤ 2% of watt_hours) |
| `energy.source` | exactly one of `measured` \| `estimated` \| `tdp_derived` |
| `energy.sampling_method` | non-empty string (how energy was obtained over time, incl. sample rate/integration) |
| `energy.instrument` | **required iff `source == "measured"`** — the honest name of the instrument (e.g. "nvidia-smi NVML power.draw", a wall-meter model, "RAPL counters") |
| `energy.derivation` | **required iff `source ∈ {estimated, tdp_derived}`** — the arithmetic: what was assumed and why (e.g. "TDP 450 W × measured duty factor 0.62 from power.draw samples; 450×0.62×wall_s/3600") |
| `compute.gpu_seconds` | number ≥ 0 (GPU-active seconds, not wall seconds; say which in `sampling_method` if ambiguous) |
| `compute.kernel_count` | optional integer ≥ 0 |
| `cost.currency` | 3 uppercase letters (ISO 4217) |
| `cost.amount` | number ≥ 0 (monetized value of the energy — grid price × kWh unless another rate is declared) |
| `cost.rate_source` | non-empty string (where the rate came from; "internal — gifted, priced at host marginal rate $X/kWh" is acceptable if honest) |
| `determinism.seed` | non-empty string or number (moth-seal certified seed preferred) |
| `determinism.state_digest` | exactly 64 lowercase hex chars — sha256 of the run-state artifact this receipt binds (output bundle, chain tip, or verdict file) |
| `gate.rule` | **exactly the string `no receipt → run VOID`** — the registered rule, verbatim; any drift = rejection (prevents quiet rule-rewriting) |
| `gate.verdict` | exactly `PASS` \| `VOID` (`VOID` is how a lane itself declares its run void, e.g. sampling failed mid-run; a schema-invalid receipt is refused by the validator and voids the run the same way) |

---

## 2. Mandatory honesty rules (house law — non-negotiable)

1. **Estimated energy MUST say estimated + derivation.** `source: "estimated"` or `"tdp_derived"`
   without a non-empty `derivation` field is a rejection. The derivation must show the arithmetic
   and its assumptions (TDP value, duty factor, wall-clock window), not a vibe.
2. **Measured energy MUST name the instrument.** `source: "measured"` without a non-empty
   `instrument` field is a rejection. "I measured it" is not an instrument.
3. **Receipts are append-only.** Never edit or retract a receipt; corrections are new receipts that
   reference the superseded `receipt_id` (see the fleet's reseal/append-only discipline). A receipt
   file that was retroactively "improved" voids the run it describes.
4. **The digest binds.** `determinism.state_digest` must be the sha256 of an artifact that exists in
   the repo or run bundle at seal time — a receipt whose digest names nothing checkable is VOID.
5. **Cost is not optional.** Gifted watts are still watts; price them (amount ≥ 0). An honest
   `0.00` with a named rate source is fine only when the run genuinely drew no GPU energy.
6. **The gate is fail-closed.** No receipt file, unparseable receipt, or validator exit 1 → the run
   is VOID. The verdict text ("honest FAIL is a valid verdict") is unchanged — this gates the
   *shipping* of a verdict, not its direction.

## 3. Adoption

- Every G-lane (G1–G7) attaches one or more watt-receipts to its run bundle before the verdict
  commits; the receipt's `state_digest` pins the run state the verdict claims.
- First consumer: whichever G-lane runs first (per the playbook's wave slots, G1's seat spike).
- Validator usage:

```
node scripts/g7_validate.mjs <receipt.json>        # exit 0 = valid, 1 = refused (reasons printed)
node scripts/g7_validate.mjs --selftest            # exercises N negative controls, all must refuse
```

- The two worked examples under `scripts/g7/examples/` are themselves gate exercises:
  `pass-measured.json` (fully populated, measured, instrument named) validates clean;
  `void-missing-energy.json` (the run whose energy sampling failed) is refused with the precise
  reason — which is the gate doing its job: that run ships no verdict.
