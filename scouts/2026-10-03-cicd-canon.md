# CI/CD Canon — receipts-grade pipelines (cross-pollination sweep, 2026-10-03)

Filed by the external lane (scripter) under standing directive "get CI/CD
more advanced as you crosspollinate around the repos". Survey via gh api
contents/.github/workflows; receipts inline.

## Landscape (18 repos sampled)

| Tier | Repos | What's there |
|---|---|---|
| Advanced | OpenConstruct (35 workflows: gates, e2e, release trains, vouch), cocapn-plato (ci/ci-python/coverage/security/release), pincher (ci, release, publish_nail, **agent-workflow L3 dispatch**), pong-quilt (forge, **merge-gate**, pages, test), quilt-c (ci + **publish-pypi OIDC**) | full receipts culture |
| Minimal | quilt-pincher (was: single-job ci), exoj (forge+smoke), quilt-studio (test), fleet-seeds (forge) | bones only |
| **No CI at all** | exoj-js, jev-toolkit, chiaroscuro, quilt-in-git, zc, embed-mojo, MicroMoth (7 of 18 sampled — Casey's manifest sweep said 25 org-wide) | gap |

## Patterns worth pollinating (source → where)

1. **Named-canary first gate** (pong-quilt merge-gate.yml): a cheap pin that
   fails with the GATE'S name, not "suite failed". Byte-spine doctrine:
   deterministic layers get a pinned hash run on every tip.
   → any repo with a deterministic core. NOW LIVE in quilt-pincher
   (test/hdc-spine.mjs, pin 51b6d1e1…99483, PR #16 → fe7d95c).
2. **Fail-closed OIDC publish + falsifier comments** (quilt-c publish.yml):
   tag-only, verify-gate before anything leaves, auth via the workflow's
   own identity; comments say "a 403 means configure the trusted publisher,
   do NOT commit a token". npm variant (provenance-signed) now in
   quilt-pincher publish.yml.
3. **Agent-in-CI dispatch** (pincher agent-workflow.yml): workflow_dispatch
   runs an L3 agent task ephemerally. Natural next home: zeroclaw (when
   minted) — zeroclaw already has a fnv1a-64 receipt journal; CI dispatch
   would run its standing orders on GitHub runners with the journal as the
   artifact.
4. **Trivial smoke on push** (exoj smoke.yml, one node step): the cheapest
   possible floor for the no-CI repos below.
5. **Merge-gate enforcement half of a doctrine doc** (pong-quilt): text half
   lives in EXPERIMENTS.md, workflow is the enforcement half. Two halves or
   it doesn't count.

## No-CI repos — smallest first builds

- **exoj-js**: `node --test` on node 22 (it has manual-test carve-outs per
  wave-63; pins should cover the carve-outs explicitly).
- **jev-toolkit**: has staged CI beyond GHA 35 days (per lode) — but nothing
  on push. Smallest: a lint+unit job for the changed stage only.
- **chiaroscuro**: TS mirror + parity runner exist; a `node --test` job +
  parity check on PR would pin the pre-registration culture (R1 synonym
  graph committed before the run) into the gate.
- **quilt-in-git**: shell tools — pins via FAIL-first sealed tests already
  exist as files (ADSR 11/11 pattern); a job that runs the pin suite covers.
- **embed-mojo / MicroMoth**: Rust/Go smalls — cargo test / go test jobs.
- **zc**: Go; has smoke.mjs-style check potential.

Caution: these are other owners' repos. The canon is a menu for their
lanes or for PR offers, not self-merge territory. The external lane merged
its own repo only (quilt-pincher #16).

## Composite

quilt-pincher is now the reference minimal-advanced pipeline: named spine
canary → matrix suite → build+pack → (tag) gated provenance publish. Copy
ci.yml + publish.yml, swap the spine for the repo's own deterministic
artifact, done.
