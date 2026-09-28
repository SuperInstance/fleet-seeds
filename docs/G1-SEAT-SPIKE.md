# G1 — Local LLM seat spike (wave 54, task 54-d, lane-d)

Status: **DESIGN + HARNESS landed; NO SEAT — harness validated fail-closed only.**
This lane ran in an honest no-GPU sandbox. Zero GPU compute, zero LLM calls, zero real
watt-receipts produced. What landed is the seat specification, the executable harness
contract with its fail-closed path **proven by execution**, and a blind pre-registration
(sealed) for the first real seat run. Companion artifacts:

- `docs/g1/predictions.json` — sealed pre-registration (§3)
- `scripts/g1_seat_harness.mjs` — stdlib-only harness, fail-closed (§2, §5)
- `receipts/g1/20260928T*.json` — VOID record of this sandbox's harness run (§5)

---

## 1. Seat specification

**Target class:** 7B–8B parameter instruct model, **Q4_K_M quantization** (llama.cpp
GGUF family), served locally — e.g. Qwen2.5-7B-Instruct / Llama-3.1-8B-Instruct class.

**Context budget:** per-prompt generation budget up to **8000 tokens**; the harness must
carry the *budget* as a variable (2000 / 4000 / 8000 steps), not a ceiling. That is the
entire point of G1 (playbook, wave 48):

> Every live LLM seat so far rides a gateway (deepseek-flash, reasoning_tokens starvation).
> A GPU hosts a 7B–8B seat *end to end* — we set the budget, we keep the raw transcript,
> the starvation finding becomes a variable instead of a wall.

**The 45-c starvation limit it unblocks, precisely:** in round 45-c (SCN-003 live half,
deepseek-reasoner as naive verifier vs forge-bred mimics) and the wave-45 embassy probe,
the gateway thinking seat spent ~100% of `max_tokens` on reasoning — starved at 2000,
raised to 4000 and *still starved on real verification work*; the witness-claims chamber
recorded a starvation KILL at 0/96 answered @2000 (playbook P1's baseline). A local seat
with no gateway token ceiling converts that binary kill into a measured
completion-rate-vs-budget curve (prediction S7 / carried playbook P1).

**Seat protocol (unchanged from the house standard):** registration → transcript on disk
→ AS-SAID extraction. Same verifier, same kill rule (D ≥ 0.20). The verdict stands
whether the local seat survives or dies.

**Serving stack, probe order (implemented in the harness):**

1. **ollama** — HTTP `GET http://127.0.0.1:11434/api/tags` (2.5 s timeout); a 200 with
   parseable JSON `{models:[...]}` = seat present. Generation via `POST /api/chat`.
2. **llama.cpp** — `llama-server` (then `llama-cli`) resolved on `PATH`, verified by
   executing `--version` (presence of the file alone is not proof). `llama-server`
   generation via `POST /v1/chat/completions`; `llama-cli` via child-process exec.
3. **No seat anywhere in the chain → fail-closed exit 2 + VOID record** (§2, §5).

## 2. Harness contract — `scripts/g1_seat_harness.mjs`

Stdlib-only Node (node ≥ 18; ran on v24.21.0). Exit codes, fail-closed everywhere:

| exit | meaning |
|---|---|
| 0 | seat responses accepted AND the run's own watt-receipt validated exit 0 through `scripts/g7_validate.mjs` (verdict may still be VOID-by-receipt when the battery is uncertified) |
| 2 | fail-closed VOID — no seat found (reason `no_seat`), receipt refused, battery invalid, model missing, or inference failed mid-battery; a timestamped VOID record is written to `receipts/g1/` |
| 3 | fail-closed run-level — success path attempted without operator-supplied run evidence (`no_energy_evidence`); VOID record also written |
| 4 | usage/registration error — bad args, or a seat is present but no `--battery` is registered (the harness will not call a seat without its battery); VOID record also written |
| 1 | reserved: unexpected internal faults — never a verdict |

Every fail-closed outcome (2/3/4) leaves a timestamped `g1-void-record@1` in
`receipts/g1/`; the exit code and the record are independent receipts of the same refusal.

**Input — certified-seed prompt battery (`--battery <file>`, JSON):**
`{battery_id, certified, seed:{source, cert, value}, prompts:[{id, text, max_tokens, temperature}]}`.
House law: a real run's battery seeds come from `tools/moth-seal.mjs` (comet-qrng-v1
certified) registered by the run lane **before** the run. The harness enforces: a battery
marked `certified: true` must carry a non-empty `seed.source` + `seed.cert` reference
(seed provenance is bound into the run's receipt); a battery that is not certified can
only ever produce a **VOID**-verdict run (plumbing/smoke use), never a shipping verdict.

**Output — per successful seat call:** raw responses on disk (transcript bundle) + ONE
`g7-watt-receipt@1` for the run. The harness builds the receipt from run facts it can
honestly observe (responses-bundle sha256 as `determinism.state_digest`, battery seed)
plus a **`--run-evidence <file>`** the operator must supply; it computes **no energy
number of its own**. `--run-evidence` carries the observed device + energy + cost facts:
`{device:{model, vram_gb, driver}, energy:{source, sampling_method, instrument?,
derivation?, joules, watt_hours}, compute:{gpu_seconds, kernel_count?},
cost:{currency, amount, rate_source}}`. Success path then **spawns
`node scripts/g7_validate.mjs <receipt>` and requires exit 0 before accepting any seat
response** — receipt-or-VOID, mechanically (G7 law: no receipt → run VOID).

**Fail-closed void record (`receipts/g1/<UTCstamp>-<reason>-<rand>.json`):** schema
`g1-void-record@1` — `record_id`, `task_id`, `agent`, `created_utc`, `reason: "no_seat"`,
the full probe evidence rows (method + result per probe — no hand-waving), measured
probe-chain wall seconds, `compute: {gpu_seconds: 0}` (no inference ran),
`energy: {joules: null, watt_hours: null}` with the note that any number here would be
fabricated, battery state, `gate: {rule: "no receipt → run VOID", verdict: "VOID"}`, and
bindings (`harness_sha256`, sha256 of the canonical probes array).

**Why the VOID record is NOT a `g7-watt-receipt@1` (deliberate):** the g7 schema *requires*
`device.vram_gb > 0` and an energy block. A no-seat run has no device and no energy —
filling those fields would be **fabrication** (the mortal sin). So the void record is its
own schema, self-declares `gate.verdict: "VOID"`, and is expected to be **refused** if fed
to `g7_validate.mjs` (that refusal is a selftest control). The G7 gate is still satisfied:
the run is VOID, and this record is the receipt *of* the void.

**Selftest (`--selftest`):** in-process controls including the injected fake-seat
fail-closed path (uncertified battery → no shipping verdict; missing energy evidence →
no acceptance; valid measured-style evidence + certified battery + echo seat → full
success path with a receipt that must pass `g7_validate.mjs`), plus g7 wiring controls
against the committed worked examples. Selftest seats are declared synthetic test doubles;
no fabricated number ever leaves a test context into a receipt.

## 3. Pre-registered predictions (sealed BEFORE any hardware exists)

Canonical artifact: `docs/g1/predictions.json`. **Seal computed immediately after the
file's final write (2026-09-28T18:58Z lane clock; file mtime 1790621920275 epoch-ms),
before any seat, runtime, or hardware existed in this sandbox and before any seat
traffic of any kind:**

```
seal of docs/g1/predictions.json:
  sha256        = fb98ca2992a55c3f9398f89eeda7242925f8f94317e8bd15f37c5b912fdb2c69
  bytes         = 9317
  mtime_epoch_ms = 1790621920275
  registered_utc = 2026-09-28T18:58:00Z (declared in-file; file mtime = primary receipt)
```

Registered: **7 new (S1–S7) + 3 carried verbatim (playbook G1 P1–P3, wave 48,
playbook sha256 `7068c9b39f15188b6659467df7e61ccb6f7d9dbe425510dadc74ff19c996411a`)
= 10 predictions.** One-line index (full claims/measurement/falsified-if in the file):

- **S1** CPU-only host: 7B-8B Q4_K_M generation band 1–15 tok/s (modal 3–8). Falsified if ≥ 15 tok/s on a receipted CPU-only host.
- **S2** consumer GPU ≥ 8 GiB VRAM: ≥ 20 tok/s sustained (band 20–120, modal 35–70), model fully resident. Falsified if < 20 tok/s under receipted residency.
- **S3** a 4 GiB cgroup (this sandbox's `memory.max = 4294967296`) cannot run the full seat usefully (≥ 5 tok/s @ 8000-token ctx). Falsified if it can — which would make this sandbox a usable G1 host after all.
- **S4** the first successful seat run's watt-receipt validates exit 0 via `g7_validate.mjs` with honest energy fields (measured ⇒ instrument named; estimated/tdp_derived ⇒ derivation arithmetic; digest binds the responses bundle). Falsified if refused, or if any verdict ships receipt-less (G7 incident).
- **S5** temperature-0 + fixed seed + same build/hardware/threads, single-stream: two identical calls are byte-identical. Any byte difference = first-class G2 determinism finding with receipted reproducer.
- **S6** Q4_K_M vs FP16 at temp 0 diverges (first differing token) within 200 generated tokens on ≥ 1 of 20 certified prompts; divergence rate weakly monotone increasing Q8_0 → Q4_K_M → Q4_0 → Q2_K (output-level analogue of E-Q10 monotone re-erosion — G3 link). Falsified by zero divergence or a clean monotonicity inversion.
- **S7** (operationalizes carried playbook P1) certified 96-prompt-class battery completes ≥ 80% within the 8000-token budget on GPU-class; completion-rate-vs-budget curve measured at {2000, 4000, 8000}. Falsified if < 80% @8000 — an honest KILL of record.
- **Carried** playbook P2 (separator-as-CLAIM grammar, TV ≤ 0.05 vs 94-dot corpus) and P3 (blind→reveal gap ≥ +0.3) stand unchanged with their wave-48 registration as origin.

Law note: these were registered with **zero** seat measurements existing anywhere in this
lane. Per PLANNING.md kill criteria, any prediction registered after its result is VOID —
the mtime above is the receipt that these were not.

## 4. Environment probe receipts (2026-09-28T18:54–18:57Z, this sandbox)

Every probe honest, expected all-absent, **confirmed all-absent**. Raw rows also appear
in the VOID record's `probes` array (§5).

| # | probe | method | result |
|---|---|---|---|
| 1 | nvidia-smi | `command -v` + exec | **ABSENT** (not on PATH) |
| 2 | ollama binary | `command -v` | **ABSENT** |
| 3 | ollama HTTP API | `GET 127.0.0.1:11434/api/tags`, 3 s timeout | **ABSENT** — `connect ECONNREFUSED` (curl exit 7: "Could not connect to server") |
| 4 | llama.cpp binaries | `command -v` for llama-cli, llama-server, llama-run, llama-quantize, main | **ALL ABSENT** |
| 5 | other GPU toolchains | `command -v` for nvcc, rocm-smi, vulkaninfo, clinfo, lshw, lspci | **ALL ABSENT** (nproc present: 2) |
| 6 | GPU device nodes | `ls /dev/dri`, `ls /dev/nvidia*` | **BOTH ABSENT** |
| 7 | GPU kernel modules | manual: `lsmod \| rg nvidia/amdgpu/i915/xe` — **PROBE MASKED, later receipted**: the `lsmod` binary itself is ABSENT, so that first manual probe proved nothing; harness re-probe: read `/proc/modules` directly | **CONFIRMED ABSENT** — `/proc/modules` readable but lists **0 modules**; no GPU module names matched |
| 8 | node-llama-cpp | `require.resolve` from repo root + global `npm root -g` listing | **UNRESOLVABLE** (globals: @mermaid-js, docx, pdf-lib, playwright, pptxgenjs, sharp — no LLM runtime) |
| 9 | docker | `command -v` | **ABSENT** |
| 10 | cgroup memory | `/sys/fs/cgroup/memory.max` | **4294967296 (4 GiB)** — see S3 |
| 11 | host | `/proc/cpuinfo`, `nproc`, `node --version` | Intel Xeon, 2 vCPU, node v24.21.0 |

(The house brief already receipted "NO GPU, no nvidia-smi/ollama/llama-cli/docker in this
sandbox"; this lane probed anyway, per receipts-first: absence is a claim until evidenced.)

**Probe-honesty incidents found and fixed inside this lane (receipted, append-only kept):**

1. **Masked manual probe (row 7).** The first manual kernel-module probe piped a binary
   that does not exist (`lsmod`) into a filter under `|| echo ABSENT` — the ABSENT verdict
   was an artifact of the mask, not evidence. Correction: read `/proc/modules` directly
   (readable, 0 module lines → no GPU modules, now honestly confirmed). Lesson priced:
   an `|| echo ABSENT` after a pipeline of unknown binaries is how absence gets fabricated.
2. **Harness evidence-label bug.** Harness v1 initialized the `/proc/modules` content to
   `""` and branched on truthiness, so a readable-but-empty module list was labeled
   `"/proc/modules unreadable"` — a false evidence string. Fixed to three-state
   (null=unreadable / readable-empty / matched). VOID records 1–3 in `receipts/g1/`
   carry the mislabeled row and are **superseded by record 4** (same run class, corrected
   evidence); per append-only law they stay on disk unedited.
3. **Accidental deletion + regeneration.** VOID record 1
   (`20260928T190540Z-no_seat-u6lv7.json`) was removed by a lane `rm` cleanup — an
   append-only violation. Restored byte-faithfully from the session transcript
   (regeneration IS restoration, after the violation is receipted): the restored file's
   own `binding.probes_digest_sha256` self-check MATCHED
   (`b0502e55a28e6b4cc9ea9520de386315adfdb60d27c4a12e0bbe378a53a52c9b`), proving the
   evidence rows are exact. Its file mtime is the restore time, not the run time — the
   in-file `created_utc` (19:05:40Z) remains the run fact.

## 5. Harness run receipts (this sandbox)

RUN 1 — default probe chain, no seat expected (2026-09-28T19:05:40Z, final corrected
re-run 19:06:38Z):

```
$ node scripts/g1_seat_harness.mjs
FAIL-CLOSED (exit 2): no_seat — probe chain exhausted: no ollama HTTP seat, no
  llama-server HTTP, no usable llama.cpp binary (+--model-path); see probe_verdicts
void record: receipts/g1/20260928T190638Z-no_seat-syizg.json
$ echo $?
2
```

- **Exit code receipted: 2 (fail-closed VOID), exactly as registered.**
- VOID record written: `receipts/g1/20260928T190638Z-no_seat-syizg.json` —
  schema `g1-void-record@1`, reason `no_seat`, 8 probe rows (ollama HTTP ECONNREFUSED,
  llama-server health ECONNREFUSED, no llama.cpp binary on PATH, no nvidia-smi, no
  dri/nvidia nodes, 0 kernel modules, cgroup memory 4294967296 bytes (4.00 GiB),
  node-llama-cpp MODULE_NOT_FOUND), `compute.gpu_seconds: 0`, `energy.joules: null`,
  zero responses accepted, `gate: {rule: "no receipt → run VOID", verdict: "VOID"}`.
- Cross-check: the record's probe rows match the manual probe battery in §4 row-for-row
  (including the corrected row 7).
- Records on disk (append-only history, all committed):
  `20260928T190540Z-no_seat-u6lv7.json` (restored, superseded — see incident 3),
  `20260928T190604Z-no_seat-up2mg.json` + `20260928T190608Z-no_seat-6sc28.json`
  (superseded — see incident 2), `20260928T190638Z-no_seat-syizg.json` (**authoritative,
  post-correction**; its `binding.harness_sha256` equals the committed harness sha256
  `e35c67dee9cf89f214c30cfc13b0adece447de8f214006dc619f5e1d8667939b`).

RUN 2 — selftest:

```
$ node scripts/g1_seat_harness.mjs --selftest
ok  C1 no-seat fail-closed: exit 2 + reason=no_seat + energy null + gpu_seconds 0 + no device block + gate VOID
ok  C2 void-record structure: schema/record_id/probe rows/bindings well-formed
ok  C3 g7_validate refuses the g1-void-record@1 (exit 1) — the void record cannot masquerade as a watt-receipt
ok  C4 g7 wiring: scripts/g7/examples/pass-measured.json validates exit 0
ok  C5 g7 wiring: scripts/g7/examples/void-missing-energy.json refused exit 1
ok  C6 uncertified battery: run completes, receipt gate.verdict=VOID, no shipping verdict (responses are plumbing artifacts)
ok  C7 no energy evidence: fail-closed exit 3, reason=no_energy_evidence, zero responses accepted
ok  C8 success path: receipt accepted after g7_validate exit 0, state_digest binds the responses bundle byte-exactly
selftest: 8/8 controls behaved as registered
$ echo $?
0
```

- **Selftest receipted: 8/8 controls, exit 0.** C1–C2 prove the fail-closed path
  in-process (with injected absent probes); C3 proves the void record cannot masquerade
  as a watt-receipt; C4–C5 prove the g7_validate wiring both ways against the committed
  worked examples; C6–C8 prove the receipt-or-VOID law on the success path with a
  declared synthetic echo seat (all synthetic artifacts live and die in a temp dir —
  nothing fake is committed).

## 6. Honest current-state verdict

**The sandbox has no GPU and no LLM runtime — zero real watt-receipts were produced, and
none could have been honestly produced.** What this lane shipped is exactly what a
CPU-only no-GPU environment can honestly ship:

1. the seat spec + the 45-c starvation context it unblocks (§1),
2. an executable harness whose fail-closed path is **proven by execution**, not by prose (§5), with the success path mechanically gated on `g7_validate.mjs` exit 0 (receipt-or-VOID as code, not policy),
3. ten sealed blind predictions awaiting the first hardware (§3),
4. a VOID record that is itself the first artifact in `receipts/g1/` — a receipt of absence, not a receipt of compute.

**NOT landed:** any seat response, any latency/determinism/erosion measurement, any
energy number. Every such value in this repo remains synthetic-test or absent — the
first real number in `receipts/g1/` must come from hardware, with its g7 receipt, or the
run is VOID by law.

## 7. What unblocks the first real run

1. Any host with a GPU ≥ 8 GiB VRAM (or, per S3's falsification clause, proof a smaller cgroup suffices), with ollama or llama.cpp installed — the harness probe chain finds it unmodified.
2. Run lane registers its battery seeds via `tools/moth-seal.mjs` **before** the run, passes `--battery` + `--energy-evidence` (nvidia-smi sampling or an honest derivation), and the harness does the rest — including refusing to accept a single response token if the receipt fails validation.
3. Fold results into S1–S7 verdicts + carried playbook P1–P3; first completion-rate-vs-budget curve retires the 45-c binary kill.
