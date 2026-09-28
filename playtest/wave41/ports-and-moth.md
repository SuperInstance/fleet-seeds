# Playtest: ports + moth (wave 41, lane 41-d)

Repos under test (fresh anonymous clones, `download/pt-*`, HEAD at playtest time):

| repo | HEAD | date |
|---|---|---|
| quilt-arch | `249d526003e8874188914e9045079ed0f106ca12` | 2026-09-27 (E-C1 chaos) |
| exoj | `597ca32041f8b71ea97aa9b2192c018cd826a437` | 2026-09-27 (readme-pin PR #1 merge) |
| quilt-verilog | `68fb9b4c01fe9449739fa22cd6e96befbc7c7dab` | 2026-09-27 (CI toolchain detect fix) |
| moth-waveform | `bf1d767543affd8681f189bc4c6bae3b250076ce` | 2026-09-26 (gate-pin flake fix) |
| moth-runner | `b2f71c7707b7f447c4bf3ed7cb50d8c0defa7dcd` | 2026-09-23 (PR #1 merge) |

All trees returned to clean (`git status` empty) after every run — note their own experiment runners regenerate `experiments/outputs/*` in-repo by design (run timestamps); receipts were captured from the fresh runs (identical chain tips/verdicts), then the trees were restored to HEAD. Battery + receipts live in
`download/playtest-wave41/battery/` (my lane dir; foreign repos imported READ-ONLY via absolute paths).

## Setup

- Node v24.21.0, Python 3.12.14. `.env` sourced (`DATABASE_URL`, `MOTH_KEY`, `TYPESAFE_API_KEY`, `GH_TOKEN` present; `DEEPSEEK_API_KEY` absent — irrelevant here).
- Toolchain honesty: **no cargo/rust, no verilator, no iverilog, no yosys/sby** in sandbox (`which` empty for all; `make test` in quilt-verilog fails on its own `NO_TOOLCHAIN` guard — receipted, not worked around).
- Python deps for the foreign Python suites installed into a lane-local venv (`playtest-wave41/venv`): `moth-cells@moth-cells-k1` (pinned by moth-runner), `pytest`, `numpy/scipy/qiskit/qiskit-aer/quantumaudio` (moth-waveform). No writes into any foreign repo.

## What works (receipts)

### quilt-arch (the bit-exactness backbone) — GREEN, fresh
- `smoke.mjs` **3/3**; `experiments/smoke_arch.mjs` **27/27**; `experiments/smoke_chaos.mjs` **12/12**.
- `experiments/e_a1_conformance.mjs` re-run fresh: **R1–R5 all PASS**; chain tip `0x3ab0d64a76995315` (10 links, verify ok). **R2 = the JS==Python cross-language conformance: 0 mismatches / 10,000 ops, python_exit 0 — the 0/10000 claim reproduces today.** R1 trace hash `6f7e089887c401cb` twice, other-seed differs (`e62c2c6b684181a4`). R5 no-floats scan of `arch/*.mjs`: 0 hits.
- `experiments/e_c1_chaos.mjs` re-run fresh: R1–R5 PASS (R6 INFO-ARM), chain `0x4d68951aa4086e1c` 15 links, killLostMax 37.
- Python side run directly: `ref/q32_ref.py --selftest` OK (wrap/sat/floor-shift/trunc-div/sqrt/split).

### exoj — GREEN, field-primary model receipts
- `smoke.mjs` 3/3; `experiments/smoke_exoj.mjs` **11/11** (conservation, local collapse, chain verify/tamper, save/load, programs).
- `e_x0_pocs` **8/8 PASS** (seed POC table vs JS port); `e_x3_dogfood_e40` **6/6 PASS**; `e_x1_naturality` receipts R1 seed-`_norm` violates parallel-first (divergence 6.0e-1), R2 deferred-norm improves but residual 3.3e-1, **R3 commutative ledger natural at 2.2e-16 (the float non-associativity floor)**; `e_x2_conserve_policy`: refuse-policy conserves AND is chain-replayable (A's silent mean-norm breaks the proof object); `e_x5_qcollapse` replay byte-exact with 0 MOTH jobs, R1–R5 PASS.
- `challenge_c4_02_chains`: **4/4 dba chains verify under the independent exoj reader**, tamper caught identically.

### quilt-verilog — Python reference surface GREEN; RTL/formal honestly skipped
- `sim/tools/test_tapfabric.py` (the `make sim` behavioral model): **34/34 OK**.
- `bash tools/gc-verifies/run_gc.sh`: **GC SUITE ALL PASS — 8 benches, 565,551 exact checks, 0 failures** (escrow/nc/wavefront/type/product + FC benches; integers+SHA only, zero float verdicts).
- `make test` / `make formal`: **NOT RUN — no iverilog/yosys/sby in sandbox**; the Makefile's own guard aborts: `oss-cad-suite not found: set OSSCAD=...`. Receipted as the lane's formal-tools skip.

### moth-runner / moth-waveform — GREEN
- moth-runner `pytest` **13/13 passed** (after installing its pinned kernel dep `moth-cells@moth-cells-k1`); `examples/demo_campaigns.py` runs 3 campaigns: admissions 2/1, 2/2, 2/2, decoys resisted 2 per campaign, throttle window → 4, witness 17 rows sealed intact.
- moth-waveform `pytest` **14/14 passed** (real AerSimulator runs, 65 s); `tests/calibrate_sensitivity.py` reproduces the planted-protocol receipts (P4 CARRIER duck=2 with named margins; P3/P5 REFUSED with entropy reasons ≥3.5 bits).

### MOTH RECON — **CRACKED, one live job receipted**
The API is fully documented by a working client in-repo: **`pt-exoj/experiments/moth_bits.mjs`** (provenance chain it declares: quilt-dba `dba/mothqrc.mjs` E-D3 ← quilt-murmur `murmur/moth.mjs`). Cross-checked byte-for-byte in shape against two more clients in the workspace (`quilt-arena/arena/moth.mjs`, `quilt-murmur/murmur/moth.mjs`):

- Base: `https://api.mothquantum.com/api/v1`
- Auth: `Authorization: Bearer <MOTH_KEY>`, `Content-Type: application/json` (key from `process.env.MOTH_KEY` or `/home/z/my-project/.env` at runtime; never written/logged)
- Submit: `POST /engines/{engine}/process` body `{"params": {...}}` → 200/202 → `{job_id}` (429 → backoff 15 s, 30 s)
- Poll: `GET /jobs/{job_id}/status` → `{status}` until `completed|failed|cancelled`
- Result: `GET /jobs/{job_id}/result` → envelope `{$schema, result}`; `result.output.measurements[] = {bitstring, count, probability}` + `backend`
- Engine `graph-v1`: params `{mode:'emu', num_qubits:8, shots, coupling_map:[[0,1],...,[7,0]]}`

**Live job run end-to-end (ONE of the 2-job budget; deliberate reserve of 1 held):**
- `job_id` **`5517f11b-b87b-4b75-ad47-908601e4fbca`**, engine `graph-v1`, mode `emu`, shots 1024, backend **`aer`**
- submitted 2026-09-27T18:32:01.088Z, latency **3,989 ms**, status `completed`
- result: 20 distinct outcomes (top result `11100110` ×57); **bits_sha256 `49199382bdefef9ecb522246204af3d7d39cee5717d347c84fbbf8cb033abc05`**, bits_len 4,432, ones 2,787, balance 0.6288
- their documented "measurements truncated to top-20 outcomes" caveat **confirmed empirically**: 4,432 bits captured < 8,192 expanded-capacity
- key never printed; receipt contains no key material (`battery/moth_job_receipt.json.txt`)
- moth-runner / moth-waveform contain **no REST client at all** (runner = offline campaign harness; waveform = local Aer via `quantumaudio`) — the exoj client is the only documented one, and it works.

## Findings

**P1 — Journal canonical serialization is not substrate-stable for non-ASCII payload strings (cross-substrate divergence, empirically demonstrated).** `arch/journal.mjs` `canon()` sorts object keys with JS `.sort()` (**UTF-16 code-unit order**) while `ref/journal_ref.py` uses Python `sorted()` (**code-point order**). For any state containing an astral-plane key vs a U+E000–U+FFFF key the canonical bytes — hence every `stateHash`, `makeId` and the signed `eventBytes` — differ. Battery (`battery/journals/`):
- Case **U** (token ids `U+10000` and `U+E000`): JS `verifyJournalFile` ok 3/3; **Python recovery verifier rejects at frame 1 with `NotReversible:after`** — same file, same keyseed.
- Case **S** (lone surrogate in an id): JS escapes it (well-formed `JSON.stringify`) and accepts 1/1; **Python dies in `jdump().encode('utf-8')` (`'utf-8' codec can't encode character '\ud800'`)** → 0 frames.
- Control **D** (DEL 0x7F): both sides agree (Python `ensure_ascii=False` leaves 0x7F raw — verified directly); control **N** (ASCII): both agree. So the gap is exactly non-BMP ordering + lone surrogates. RFC 8785 (JCS) — which this fleet's own `vc-oracle` implements with UTF-16-order vectors — is the existing fix pattern: pick one order (UTF-16 code units), one escape law, and add these as KAT vectors.

**P2 — The journal payload door silently coerces plain numbers through f64.** `applyEvent` copies payload fields verbatim as JS numbers: a `TokenAdd` with `invariant: 9007199254740993` stores **9007199254740992** (battery case N, `storedInvariant` receipted); `NaN/Infinity` would become JSON `null`, `-0` becomes `0`. Everything is self-consistent (JS in-memory == file == Python), so hashes never catch it — but the charter's "refusal, not coercion" discipline (which `Q32.fromNumber` enforces with a `RangeError`) is absent at the journal boundary. The exact "quantization at the door" class E-Q9 flagged, one layer up.

**P2 — `checkedDiv(i64::MIN, -1)` returns 0 — a latent JS-vs-Rust conformance landmine.** JS BigInt path: `(MIN<<32)/-1 = -2^95`, `asIntN(64,·)` → low 64 bits 0 → **0**. Plain Rust i64 division of MIN/-1 panics (and `checked_div` → `None`); a future Rust reference implementing the obvious thing will disagree with the two agreeing ports. Battery receipts the whole corner family, all JS==Python today: `div(MAX, 1)` → `-2^32` (wrap), `tokenEnergy(c=0, n≥2^31)` → **negative** size (`-2^32`), `abs(MIN) → MIN`, `mul(MIN,MIN) → 0`. All are per the port's declared as-i64-wrap law — the risk is against the unwritten Rust, worth one line in the seed's Core Types before silicon ever meets this.

**P3 — Wrap-manufactured verdicts (per-contract, caller-visible).** `triangleIsClosed([MAX, MAX, 2, 0, 0, 0])` → **true** (i64 wrap sums to 0 — a "closed triangle" from overflow); `correlate` with stage≈2^62: `sum_ii` wraps to exactly 0 → the row reads as **zero-energy** and the pair silently correlates to 0 instead of erroring; huge-stage pair (0,1) → `null` cell via sqrt-of-wrapped-negative. Python agrees on all — deterministic everywhere, but a cost-model hazard for anyone accumulating in i64.

**P3 — Q32 multiply is floor-rounded ⇒ one-sided −ulp drift + operand-scaled blindness (the E-Q9 classes, now measured in quilt-arch's own arithmetic).** `mul(-1, 1) → -1` while `mul(1, 1) → 0` (negative sub-ulp products become −1 ulp, positive ones 0 — exactly the "fixed moves −1" family E-Q9 measured); `mul(-3, 2^31) → -2` vs `mul(3, 2^31) → 1`. Blindness: `mul(2^31, 2^32)` and `mul(2^31, 2^32+1)` both → 2^31 — a 1-ulp operand difference vanishes whenever `a·δ/2^32 < 1` (the band scales with the other operand; with `a = 2^32` it is visible). Dyadic doors: every Q32 value is `k/2^32`, and quilt-arch is single-arithmetic (R5 no-floats audit) — so the E-Q9 float-vs-fixed **artifact plane is structurally absent here**, and there is **no real→Q32 door at all** (`fromNumber` refuses non-integers): the quantization decision is pushed to the caller.

**P3 — exoj `challenge_c4_01_rewind` hard-fails on a missing sibling repo** (`ERR_MODULE_NOT_FOUND: .../quilt-dba/dba/rewind.mjs`); its sibling c4_02 runs fine on checked-in artifacts. Cross-repo test dep not vendored or guarded.

**INFO — the two log2(3) constants disagree across repos.** quilt-arch `Q32.LOG2_3 = 6806210843` (the seed's explicit constant; their E-A1 R3b receipts the ~2.7e-4 discrepancy) vs qthe `DEFAULT_SIGMA_Q = 6807362106` (true round(log2(3)·2^32)). Delta **1,151,263 raw units (~2.7e-4)**. Any future cross of a quilt-arch conservation bound with a qthe sigmaQ door inherits a pre-loaded disagreement.

**INFO — graph-v1 `emu` is not a QRNG.** The live job's bit balance is 0.6288 (top outcome 6.5% of shots) — a graph-circuit distribution, not uniform randomness. Fine for the E-X5 field-level use; anyone doing seed ordering must whiten (or ask for a QRNG engine).

## Suggestions

1. **quilt-arch (upstream-worthy):** declare the canonical string law (JCS-style: sort by UTF-16 code units, one escape law incl. lone surrogates) in `journal.mjs` **and** `journal_ref.py`; add cases U/D/S as KAT vectors; refuse or bigint-tag non-safe-integer plain numbers at `append()` the way `fromNumber` does. A draft issue comment is below.
2. Add the wrap corners (`MIN/-1`, `energy` boundary-length wrap, wrap-closure triclose, giant-stage correlate) to the E-A1 `EXTREMES`×op mix — they cost ~10 lines and pin the wilder contract corners into CI.
3. exoj: vendor or `existsSync`-guard the `quilt-dba` dep in `challenge_c4_01_rewind` with a named skip line.
4. moth: the fleet now has a **working, documented, three-repo-corroborated client**. For E-Q10-seed ordering: one graph-v1 job ≈ 4 s and ~4.4k usable bits (top-20 truncation), schema-compatible with the E-D3 cache rows in exoj; whiten before consuming as seeds, and budget the 429 backoff path (not exercised here).
5. moth-waveform's planted-protocol calibration pattern (earn trust on planted truth before fleet data) is a clean template for any future quantum-input consumer.

## Synergy

- **For the qthe fixed kernel:** quilt-arch independently lands on the same discipline qthe uses — every op carries a *declared* rounding law (floor mul / trunc div / floor sqrt / saturate; qthe: round-half-up door + refuse-never-wrap). The measured −ulp floor drift and operand-scaled blindness give E-Q10 a concrete prior: in mixed-sign accumulate loops, expect a systematic −1-ulp bias per negative product, and expect ulp-blindness bands proportional to the co-operand — dyadic inputs stay exact everywhere.
- **For crab-traps cost models:** E-C1's receipts are directly reusable evidence-seal patterns — deterministic UUIDv4-from-chain ids, canonical-guard corruption detection (the 1-bit case-flip aliasing fix), truncate-to-last-good-boundary reopen (SQLite WAL playbook), and "recovered state == in-memory state" as the pass condition.
- **moth cracked ⇒ concrete unlocks:** idle `MOTH_KEY` now has a zero-new-code path (import `pt-exoj/experiments/moth_bits.mjs`); E-Q10-seed ordering can run today with `graphJob()` rows; the top-20 truncation + 0.6288 balance numbers turn "quantum randomness" claims into priced ones (whiten or label).
- **exoj's ledger policy** (commutative α-weighted accumulate, aggregates at sense-time, naturality at 2.2e-16) is the exact parallel-first fix pattern qthe's multi-writer cells could borrow for same-slot write ordering.

## Honest limits

- **Formal/sim not re-run for quilt-verilog**: no iverilog/verilator/yosys/sby in the sandbox; the 23/23 testbench suite, 34/34 `make sim` (Python tapfabric **did** re-run green — 34/34), 6/6 SymbiYosys proofs and iCE40 synth results are taken from repo receipts, not reproduced. `make test` was attempted and aborted on the repo's own toolchain guard.
- **Moth budget: 1 of 2 allowed jobs used** (deliberate reserve). Not exercised: 429 backoff, auth-failure paths, other engines, `failed` job handling. Latency/window numbers are single-sample. No key material printed, logged, or committed anywhere; the receipt stores only key length/prefix metadata in one console line that is itself excluded from the saved file.
- **exoj `e_x4_livejev` not attempted** (live JEV backend spend out of this lane's scope; lanes kept at zero LLM spend). `challenge_c4_01_rewind` skipped for the missing `quilt-dba` dep (P3).
- **moth-runner demo writes `examples/witness.jsonl` in-repo by design**; it regenerated byte-identical content (tree stayed clean, `git diff HEAD` empty) — noted as a near-miss for future lanes running it: prefer copying the demo out of the repo first.
- The 63-op edge battery and the journal edge cases are **my harness**, not theirs: results are integer-equality compared via their own enc() contract on both sides, every JS op executed twice (deterministic), and all claims above were additionally re-derived directly (key-order demo, DEL byte check) rather than inferred.
- No foreign writes at any point: all five pt-* trees clean at close (experiment outputs regenerated by their own runners during suite runs were restored to HEAD after receipt capture); clones, venv, battery and report live in `download/playtest-wave41/` and `download/pt-*` only.
- The `playtest-wave41/` dir also holds files from a concurrent lane (`adv1.mjs`, `jev-stack.md`, `producer.pem`, …) — untouched, not this lane's; this lane's products are `ports-and-moth.md` + `battery/` + `venv/` only.

---

## DRAFT issue-comment (quilt-arch, ≤300 words — for the keeper to post if wanted)

**Cross-substrate journal recovery breaks on non-BMP payload keys (canon key-order) and lone surrogates**

Played E-A1/E-C1 fresh from `249d526` — 0/10000 JS==Python reproduces, chaos suite green. Two serialization corners the LCG stream can't reach:

1. `canon()` sorts keys with JS `.sort()` = UTF-16 code-unit order; `ref/journal_ref.py` sorts by code point. For a state containing token ids `U+10000` and `U+E000`, the same JSONL verifies 3/3 in JS but the Python recovery verifier rejects frame 1 with `NotReversible:after` (after-hash computed over a different key order). Repro + minimal journals: case U in the wave-41 playtest battery (`download/playtest-wave41/battery/journals/journal_U.jsonl`).
2. Lone surrogate in a payload string: JS's well-formed `JSON.stringify` escapes it; the Python ref then raises `UnicodeEncodeError` in `jdump(...).encode('utf-8')` and recovers 0 frames. Same file, JS ok.

RFC 8785 (JCS) already standardizes the fix: sort on UTF-16 code units + a declared escape law; this fleet's vc-oracle has passing JCS vectors to crib. Also observed (self-consistent, no hash break): plain payload numbers cross the boundary through f64 (`9007199254740993` stores as `...992`); refusing non-safe-integers at `append()` (like `Q32.fromNumber` does) would keep the charter's refusal-not-coercion law.

Happy to package the three KAT journals (U/D/S) if useful.
