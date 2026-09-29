# Keeper review — run-4 LEAD c4 (QRNG-drawn, index 3)

**Candidate**: "Noam Brown – Agent swarms, alignment, & recursive self-improvement"
**Ref**: https://www.dwarkesh.com/p/noam-brown (published 2026-09-20)
**Receipts**: review-c4-raw.html (487,918 bytes, fetched 2026-09-29T04:4xZ), review-c4-text.txt (80,041 chars extracted)
**QRNG witness**: jobId 95873136-ee3e-4d3c-aaa6-7711b17d40f2, raw_result_sha256 79c88e70…, selected [3]

## Extracted claims (transcript timestamps from the page itself)

1. (00:00–00:22) Multi-agent coordination is the swarm bottleneck: "it is very possible that 10,000 humans are better at coordinating than 10,000 agents right now"; early multi-agent versions "were very difficult to get right… very hard to get the agents to even talk to each other."
2. (00:22:02) Math progress → RSI plausibility: domains are "spiky"; RSI-able domains are the measurable ones: "There's a very clear objective. It's just more measurable… there are certain metrics that you care about."
3. (00:22–00:40) RSI speedup is real but modest: "if that exponential is 3x faster, that is massive. But there's a big difference between that and 100x faster." Experiment-running (not just intelligence) is the bottleneck: "if you had 100x less compute… it would definitely be less [progress]."
4. (00:40–01:01) Rung-gating as the alignment organ: "Okay, alignment is working. Let's do the next RSI rung. Let's do the next RSI rung." — a robust safety case gates each autonomy rung.
5. (01:08:34) Measurement-channel decay: "chain of thought is degrading" — reward for cheating that evades human review is the RSI-integrity killer.

## Keeper verdict: SURVIVES → sealed as M11

The deeper abstraction the fleet can use: **measurability is the RSI-eligibility criterion** — you can only recursively improve what you can seal. This is not surface hype (the interview is a discussion of mechanisms, with concrete failure modes), and it is fleet-testable: our lanes are seal-gated, so we can predict resolution-rate differences between sealed-measurable and unsealed agenda items.

Fleet mapping:
- Brown's rung-gating = M9's autonomy rungs + the fleet's pre-register→run→verdict→seal loop as the safety case per rung.
- CoT degradation = M7 (mutation fragility) + the determinism-chain countermeasure (probe==run==twin bit-equality) already standing in quilt-jepa.
- Swarm skepticism (claim 1) = M8 (archive, not population): coordination overhead is why the fleet composes artifacts through shared ledgers instead of spawning agent populations.
- Modest speedup (claim 3) = M4 (cost caps): compound rate is bounded by experiment throughput, so budget discipline is not overhead — it IS the speedup.

Falsifiable prediction (sealed in mines.jsonl M11): round-8 agenda items tagged SEALED-MEASURABLE resolve to definitive PASS/FAIL at ≥3-of-tagged rate, while UNSEALED items defer at majority rate; refuted if sealed items defer at equal/higher rate.

Honest limits: interview source (opinion-grade, not peer-reviewed); the claims above are quoted from the page receipt; the mine's value is its testable consequence, not the authority of the speaker.
