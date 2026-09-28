# Scout report — GPU-agent workloads for the quilt fleet (2026-09-28)

Question from the principal: *what kinds of work could an agent with a GPU do with all our systems?*
Method: 7 web searches (raw results archived in `scouts/raw/gpu1..gpu7*.json`), then synthesis against the
PLANNING.md instruments inventory. Output consumer: `docs/GPU-AGENT-PLAYBOOK.md` (this report is the evidence layer).

## Search receipts

| # | Query (abridged) | Results | Quality verdict |
|---|---|---|---|
| 1 | local LLM single-GPU serving (vLLM/llama.cpp, 7B–8B Q4) | 6 | GOOD — actionable hardware/quant numbers |
| 2 | GPU deterministic kernels / bitwise reproducibility | 8 | GOOD — confirms bitwise is *not* free; active research |
| 3 | GPU fault injection bit-flip deep learning | 2 | JUNK — unrelated returns; receipted, not used |
| 4 | LLM quantization int8/int4 drift benchmarks | 8 | GOOD — outlier-weight error jumps are documented |
| 5 | certified QRNG / TRNG for Monte Carlo seeding | 8 | GOOD — certified entropy for MC is an established need |
| 6 | GPU Monte Carlo at scale for randomness verification | 8 | GOOD — MCMC on GPU mature; billion-trial norms exist |
| 7 | retry of #3 with SDC/ECC terms | 1 | JUNK — OSRS game PDF; channel confirmed weak here |

## Findings that shape the playbook

1. **Local seats are cheap and real.** 7B–8B models run at Q4_K_M on ~8 GB VRAM (llama.cpp/Ollama-class),
   vLLM for serving. The fleet can host a JEV seat *we fully control* — no gateway, no `reasoning_tokens`
   starvation, no extraction-law workarounds needed. This directly attacks the one honest limitation of
   waves 45–46: real seats dying of token economics.
2. **Bitwise GPU determinism is a known-hard, active problem** (PyTorch's deterministic mode is documented
   as not guaranteeing bitwise for all ops; TP-invariant kernels are a 2025-26 research topic). Our
   power-yank / no-silent-wrong-state law + stone chains are exactly the missing *audit* layer. A GPU
   determinism auditor is a real tool the fleet is uniquely shaped to build.
3. **Quantization error is documented but not *audited*.** INT4 error jumps on outlier weights are known;
   nobody publishes *monotone re-erosion curves* against exact rational twins (our micrograd-quilt exact-twin
   + E-Q10 injector-law methodology). Pre-registered quantization-erosion predictions are a novel, cheap,
   stranger-verifiable contribution.
4. **Certified entropy for Monte Carlo is an established need** (TRNG/QRNG papers list MC and ML as primary
   consumers). We already run a certified sampling service (moth-seal on comet-qrng-v1, CHSH-witnessed bits).
   GPU-scale Monte Carlo (10^9 trials) is the natural scale-up of our D-statistic arena — GPU brings the N,
   moth-seal brings the provenance.
5. **Honest negative:** the fault-injection literature is not reachable through this search channel
   (queries 3 and 7 returned garbage). The GPU fault-injection lane (E-Q10 ported to GPU) proceeds from
   first principles with the literature pass marked OPEN — a first-principles registration is still valid,
   it just must say so.

## Where this lands

Full catalog with acceptance criteria and wave slots: `docs/GPU-AGENT-PLAYBOOK.md` (7 work items G1–G7,
onboarding protocol, pre-registered predictions for the first three GPU experiments). PLANNING.md carries
the Round 48 refinement that adopts it into the near/mid arcs.
