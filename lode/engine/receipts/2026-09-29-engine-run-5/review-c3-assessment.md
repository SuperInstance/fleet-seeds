# keeper review — c3 (QRNG-drawn, engine run-5, wave-62)

- run: 2026-09-29-engine-run-5 · drawn: c3 by certified comet-qrng-v1 (witness.json, anti-cherry-pick preserved)
- c3 card: "Recursive self-improvement of AI research agents" · source hn-algolia · ref https://arxiv.org/abs/2609.26457 · noul 0.25 · date 2026-09-23
- review act: keeper (main), 2026-09-29 ~15:4xZ, abstract fetched from arxiv (receipted below)

## Verdict: ALREADY-MINED — no new mine sealed (the draw collides with the ledger)

Identity CONFIRMED: fetched arxiv title for 2609.26457 is exactly "Recursive self-improvement of AI
research agents"; abstract describes the loop where "each accepted rewrite becomes the agent that the
next round edits" — this is the weco AIDE-squared paper, already mined as:

- M3 (public/private score split, private score decides survival)
- M4 (fixed cost budget doubles as selection pressure)
- M7 (sec 2.4: later mutation silently broke a correct anti-hacking layer)

M3's own source field cites arXiv:2609.26457. **The M10 history-conditioning law was VIOLATED this run:
an already-mined hypothesis was re-proposed and drawn.** Root cause (receipted, not papered over):

## Root cause: marker-channel mismatch (wave-62 honest catch #1)

The exclusion matcher extracts arxiv markers from mines.jsonl in COLON form only (`arxiv:2609.26457`)
but candidate card refs carry URL form (`arxiv.org/abs/2609.26457`). `blob.includes('arxiv:2609.26457')`
is false for every URL-form ref. Channel audit:

- GitHub-slug markers DO match github-source cards (ref = github.com/SLUG) — this is why the rrsi card
  was correctly excluded (c1→M10 in runs 3/4/5: its GitHub repo card matches M10's slug).
- Paper-only mines with NO slug (M3, M4, M6, M9, M11) were structurally unprotected against URL-form
  refs: the law held only where marker channel and card ref channel coincide.

Timeline honesty: runs.jsonl row for run-5 was appended BEFORE the collision was known; it stands
verbatim. The QRNG draw was honestly blind — it selected a card that should never have been on the
table. No mine is sealed from this draw (there is nothing new to mine); the draw's spend is receipted
as the cost of catching the violation (M11's own law: you can only recursively improve what you can
seal — the exclusion law WAS sealed, so the violation was measurable and caught).

## Fix of record (this wave, same commit as this receipt)

engine_run.mjs: (1) miner side now extracts arxiv ids from BOTH channels (colon + abs/pdf URL forms),
stored as bare ids; (2) card side extracts ids from both channels (version suffix stripped) and
matching compares bare ids; (3) history.excluded entries now carry source+ref (audit quality).
Run-5 receipts stay on disk verbatim as the violation of record; run-6 is the first run under the
fixed matcher and its history.json is the regression test (c3-class cards must exclude as →M3).

## What the collision still buys (honest value accounting)

The paper resurfacing through an independent channel (HN, 2026-09-23, 17 days after mining) is mild
external corroboration that the ledger's M3/M4/M7 rows track a live research frontier — but no new
claim, no pred_sha256, no M12. Budget B annealed to 1 as registered (t=4): the bundle was the lead
alone, so no filler was spent either. Next run's deep-review slot is unspent and carries to run-6.
