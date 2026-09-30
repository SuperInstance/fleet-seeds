# keeper review — c2 (QRNG-drawn, engine run-7, wave-67 lane 67-h)

- run: 2026-09-30-engine-run-7 · drawn: c2 by certified comet-qrng-v1 (witness.json, anti-cherry-pick preserved) · B=1 (t=6, anneal law exact)
- c2 card: "Recursive Self Improvement for Coding Agents" · source hn-algolia · ref https://cline.ghost.io/recursive-self-improvement-for-coding-agents/ · noul 0.32 · date 2026-07-30 · key_score 2
- anti-cherry-pick observed LIVE: the priors battery's own first-test choice was c3 (the Ask HN thread, 0.85) — the certified draw selected c2 anyway. The review target was NOT the taste-pick.
- review act: keeper-lane 67-h (general-purpose subagent, principal-delegated), 2026-09-30, article fetched raw (42,390 B; receipted in review-c2-provenance.md — raw + extracted text stay uncommitted per L9 keyscan-false-positive-class; committed evidence = review-c2-pr12465.json + this file)

## Verdict: SURVIVES as a genuinely new falsifiable law — M12 SEALED (nearest_prior M11)

### Identity and collision check (all clean)

- Ledger arXiv markers (2507.19457, 2609.26457, 2505.03335, 2609.11873, 2609.24972): 0/5 present in the article.
- Ledger slug markers (google-research/rrsi, PrimeIntellect-ai/prime-agent): 0/2 present.
- Curated channel: 0 occurrences of the vendor name in the awesome-rsi catalog (139 arXiv ids + 37 slugs) — **the curation channel MISSED this result**; a concrete live case of run-6's measured complementarity (freshness channel found what the curated map lacks).
- Previously-drawn titles (runs 1/2/4/5/6): no match. Not an already-mined collision.

### What the drawn article claims (vendor-reported; evidence anchors receipted)

A single-prompt, ~17-hour agentic campaign in which a leader model improved the Cline
harness itself and lifted Kimi K3 on Terminal-Bench 2.1 from a 69/89 (77.5%) baseline at
$79/run to a 79/89 (88.8%) confirmation at $49.8/run — matching the vendor-reported SOTA
(88.3%) at roughly a tenth of the cited frontier costs ($552 / $400). Total spend ~1B
tokens, ~$680. Five experiments ran; the article's own accounting: a correctness fix to
reasoning-effort mapping (no score change, "unblocked everything downstream"), retry with
exponential backoff on provider rate limits (five baseline losses flipped), an
output-aware loop detector (two flips — the old one killed agents legitimately polling
long-running work), a one-line liveness fix for an async file-index worker (one flip),
and tool guidance replacing broad pattern-kills that terminated the harness's own process
(two flips). Reward hacking was excluded by prompt design (no verifier edits, name-based
detection, or timeout inflation — paraphrased-for-keyscan); the agent recorded
attribution guards, excluded and re-ran invalidated confirmations, and the final backstop
was human review of the full PR. Declared outcome: this becomes the STANDARD process for
new model releases (immediate baseline, then self-improvement prompts).

### The measured finding of record: 100% of score movement is substrate-class

All +10 recovered points are the four transport/liveness/sensing repairs (5+2+1+2). The
one correctness/strategy edit moved zero score. Simultaneously cost per run FELL 37%
because repaired transport stops wasting tokens on doomed retries and self-terminations —
an external, paper-strength instance of M4's cost discipline (repairs pay for themselves).
The public diff (cline/cline#12465, 34 files, +774/−58; API snapshot receipted in
review-c2-pr12465.json) classifies the same way at file level: provider-retry +149 with
tests, loop-detection +46/+57 tests, file-indexer liveness +4/+37 tests,
reasoning-effort mapping +1/+17 tests, plus orchestration/guidance tests. Honest receipt:
the same snapshot shows state=closed with merged_at=null — the diff's class structure is
public and verifiable either way; the merge bookkeeping is NOT load-bearing for this
review and is receipted verbatim, not interpreted away.

### The law (M12, novelty-gate compliant per M1)

**Gauge before game: within any sealable domain, first-campaign self-improvement gains
concentrate in measurement/transport repair — availability (retry/backoff), liveness,
progress/stall sensing, self-termination prevention, instrumentation correctness — not in
the strategy layer. The engine improves its gauge before it improves its game.**

Delta vs nearest prior M11: M11 is the eligibility gate over DOMAINS (a domain yields RSI
gains exactly insofar as its objective can be sealed). M12 is distributional WITHIN a
sealable domain: it predicts what gets fixed FIRST (the seal/transport substrate) before
any strategy-level gain appears. M11 predicts where RSI is possible; M12 predicts the
order of its gains. Adjacent-but-distinct: M10 constrains HOW the search moves
(regularization); M7 names the failure mode (silent layer breakage); M12 names where the
gains live. Side-receipts (not minted): the campaign's experiment record file is an
external instance of M10's history-conditioned proposer; the self-policing attribution
guards are a folk instance of M3's anti-hacking hygiene; the harness PR as final backstop
is M11's verification case verbatim.

### Falsifiable prediction (sealed in mines.jsonl as M12)

Decompose the next fleet self-improvement-shaped campaign (agent edits its own
harness/tooling/queries under a sealed metric + pre-registered budget; E6 re-registration
is the first candidate) edit by edit at resolution time: majority of score-moving edits
will be measurement/transport-class, not strategy-class. REFUTED if the first such
campaign's score movement is majority strategy-class. If no such campaign resolves by end
of wave 70, fold NULL (untested ≠ confirmed). External corroboration channel: the #12465
diff classification receipted above.

### Honest caveats (carried, not buried)

1. Vendor-reported, n=1, one benchmark; scores/costs are self-reported with public proof
   gists we have not audited. The MINE does not rest on the vendor's numbers being true —
   it rests on the fleet's own future campaign (the falsifiable part); the article is
   provenance, not proof.
2. c3 (priors' first-test pick) and c1 (arXiv:2609.17523 "Recursive-in-Recursive
   Self-Improvement for Interactive Scientific Agents" — absent from BOTH ledger and
   catalog: fresh paper, highest-interest filler) stay frozen for run-8+ (budget-annealed,
   not discarded).
3. Engine receipts for this run: (a) curated-corpus awareness WORKED first fire (c11
   Gödel Agent arXiv:2410.04444 excluded pre-freeze as catalog:2410.04444); (b) the run-5
   collision class is still excluded post-fix (c3→M3, third consecutive run); (c) the
   rrsi card returned via a NEW channel (hn-algolia, regularized-rsi.com) and was caught
   by the drawn-memory (c1→drawn@run-2); (d) honest catch #2: HN no-URL cards got
   ref `https://github.com/undefined` — fixed post-run in engine_run.mjs, frozen run-7
   receipts stay verbatim; (e) arXiv 429'd through the FULL 0/4/8/16s backoff ladder this
   run (attempts receipted in scout/raw.json): scout 4/5, honest partial, no silent source
   drop; (f) the pool=1 guard did not fire (pool=3).

### Disposition (spend + ledger acts)

1. **M12 SEALED** via append_m12.mjs (backup mines.jsonl.pre-m12; lode_validate mines +
   append-only --against proof required before push).
2. Spend: typesafe 2 calls this lane (probe 331+22 tok, run-7 priors 825+100 tok = 1156+122 total);
   mothquantum 1 job (db1bb3f0-2bb7-4cd4-93b2-5b92019858c8, 456 certified bits, healthPassed,
   CHSH S≈2.847) + 1 zero-job engines-list probe; $0 other external spend.
3. No new lesson (L13): every catch this run maps to an existing lesson (L9 keyscan class,
   L10/L11 classes); the engine changes are receipted in-file per the engine's own
   convention. Append-only lessons.jsonl stands at 12.
