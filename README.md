# fleet-seeds — the intake lane for new experiment repos

> Every seed file becomes a repo. Every repo becomes a receipted experiment.

## The one idea

A question is cheapest to answer well at the exact moment it is asked — and
most expensive to answer well any time after. Every fleet repo that skipped
scaffolding at birth (CI, a smoke check, a charter) paid for it later as a
script with no receipt and a claim with no number. **fleet-seeds turns
"I have an idea" into "I have a repo that can already prove or disprove
itself"** in one step, before the idea has had a chance to lose its rigor.

## The mental model

Think of it as a seed drill, not a typewriter. You don't write a repo one
file at a time; you drop one seed document into a hopper and the hopper
germinates a fully-scaffolded lane around it — the same way every time, so
the rigor never depends on the mood of whoever is planting.

```
   seed1.md ──┐
   seed2.md ──┼──▶  node seedbox.mjs  ──▶  <repo-slug>/
   seedN.md ──┘        (the hopper)          ├── README.md   (seed, verbatim, + charter header)
                                              ├── package.json
                                              ├── .github/workflows/  (CI: smoke suite on every push)
                                              ├── smoke.mjs   (a REAL check, not a stub)
                                              └── git commit  (first commit already exists)

                                   repo  ──▶  receipted experiment
                                   (the seed's question, run with paired arms,
                                    decision rules written BEFORE the run)
```

Read it left to right: **seed → repo → receipted experiment.** Nothing skips
a stage. A seed that never becomes a repo never had its rigor tested; a repo
that never becomes a receipted experiment never answered its own question.
fleet-seeds' entire job is to make the first arrow (`seed → repo`) automatic,
so every fleet repo starts life already carrying a spine of the second arrow
(`repo → receipted experiment`) — CI wired, a smoke check that runs before any
feature code, the seed itself kept as the charter of record so nobody has to
remember why the repo exists.

## The protocol

1. Drop seed files (`seed1.md` … `seedN.md`) into this directory.
2. For each seed: `node seedbox.mjs seed1.md "repo-slug"`
   - emits `./<repo-slug>/` with: README.md (seed embedded verbatim + experiment
     charter header), package.json, a GitHub Actions CI that runs the smoke
     suite on every push, a `smoke.mjs` placeholder with a real check, and a
     first git commit.
3. Each spawned repo gets its own lane: the seed's question is turned into a
   receipted experiment (house style: paired arms, decision rules receipted
   BEFORE the run, honest negative verdicts welcome), run, committed, pushed.

## Why a box for it

The fleet's hardest-won lesson is that *starting* is where quality dies: a
question with no scaffold becomes a script with no receipt, becomes a claim
with no number. The seedbox makes the starting state rigorous by default —
CI on the first commit, a smoke check before any code, the seed itself
versioned as the charter of record.

## Status

- Waiting on seed files. The upload that carried them did not land
  (upload/ empty, nothing on disk, nothing in the account's recent repos).
- The box is built and tested (`node seedbox.mjs --selftest`).
- When the seeds arrive: spawn one repo per seed, one lane per repo.

## quilt-links.mjs lives here

This repo is also the fleet's **designated home** for `quilt-links.mjs` — the
zero-dependency generator behind the "Cross-pollination" section below. Every
other repo's `.quilt/links.yml` renders through this one script (copied in or
curled in CI), and this repo alone runs `node quilt-links.mjs --graph <dir>`
to produce the whole-fleet map (`FLEET.md`, `graph.mmd`). See
[`AI-Writings/situations/arch/CROSS-POLLINATION.md`](https://github.com/SuperInstance/AI-Writings/blob/main/situations/arch/CROSS-POLLINATION.md)
for the full schema and rationale.

## What a reader learns

- **Scaffolding is cheapest at birth.** CI, a smoke check, and a charter cost
  nothing to add before the first line of feature code, and a great deal to
  retrofit after.
- **A seed is a charter, not a scratch file.** Keeping it verbatim in the
  spawned repo means nobody has to reconstruct "why does this exist" from
  memory later.
- **`seed → repo → receipted experiment` is a pipeline, not a slogan** — each
  arrow is a concrete, runnable step (`node seedbox.mjs`, then paired-arm
  experiments with decision rules written before the run).
- **One script, many repos.** `quilt-links.mjs` is deliberately not vendored
  per-repo — one file, one home, curled or copied where needed, so a fix in
  one place fixes it everywhere.

<!-- QUILT:LINKS:START — generated from .quilt/links.yml by quilt-links.mjs. Do not edit by hand. -->
## Cross-pollination — the Reader's Fold

*Part of the **quilt** family. Under [Law 6](https://github.com/SuperInstance/jev-quilt), this repo carries no verdicts about its neighbors — only content-addressed pointers you fold under your own weights.*

**Provides** (fold these from here)
- `quilt-links-generator` — the zero-dependency generator (quilt-links.mjs) that renders every repo's Cross-pollination block and the whole-fleet graph (FLEET.md, graph.mmd)
- `seedbox` — the seed-file -> receipted-experiment-repo intake mechanism (seedbox.mjs)

**Consumes** (folded from elsewhere)
- [jev-quilt](https://github.com/SuperInstance/jev-quilt) `@5333e1a` — Law 6 (the Reader's Fold) and Law 7 (the Reach Bound) — the doctrinal basis for the .quilt/links.yml schema and quilt-links.mjs generator this repo hosts

<sub>Regenerate: `node quilt-links.mjs` · Fleet map: [FLEET.md](https://github.com/SuperInstance/fleet-seeds/blob/main/FLEET.md)</sub>
<!-- QUILT:LINKS:END -->
