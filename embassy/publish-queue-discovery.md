# Publish-Queue Discovery — jev-quilt #16 step 1 (DISCOVER)

Wave 32 embassy round, keeper task 32-c. Built 2026-09-27.

## What this is

The deterministic list the issue asks for **before anyone publishes anything**:
every SuperInstance repo whose default-branch ROOT carries a `package.json`,
`pyproject.toml`, or `Cargo.toml`, with a minimal publish-readiness parse.

- Full data: `publish-queue-discovery.tsv` (2538 manifest rows)
- Method: GraphQL for the repo census (light, 51 pages), then
  `raw.githubusercontent.com/.../HEAD/<manifest>` for contents (CDN, outside
  REST quota; no secondary-rate-limit drama). Zero REST contents calls.
- Scope (declared, honest): repos **pushed within the last 120 days**
  (2026-05-30 .. 2026-09-27) — the publish *queue* is about live work; a repo
  untouched for four months is not queued. Org census: 5030 repos; in-scope
  with root manifests: 2484.
- Readiness rules (per issue #16): npm = real `name`+`version` and not
  `private:true`; pypi = `[project]` (or poetry) `name`; crates.io = `name`
  **and** `license` **and** `description`.

## Headline numbers

| registry | publish-ready rows |
|---|---|
| crates.io | 1607 |
| pypi | 446 |
| npm | 243 |
| **total** | **2296** |

2484 of 5030 org repos carry root manifests. The org is far larger than the
issue's "known candidates" list assumed.

## High-signal named candidates (core-name repos)

| repo | registry | manifest says |
|---|---|---|
| jev-quilt | pypi | `jev-quilt` v0.1.0 |
| quilt-cli | pypi | `quilt` v0.1.0 — the flagship name on PyPI |
| plato-portal | pypi | `superinstance` v0.1.1 — the org-name package |
| plato-portal | npm | `@superinstance/schemas` v1.0.0 |
| quilt-egg | pypi | `quilt-egg` v0.1.0 — "smallest substrate that can BE" |
| substrate-llm-client | npm | `substrate-llm-client` v0.0.2 |
| git-agent | pypi | `cocapn-git-agent` v0.1.2 (renamed for PyPI) |
| fleet-murmur | pypi | `fleet-murmur` v0.1.0 |
| yiluodi | npm | `yiluodi` v0.1.0 (fleet-owned; hello-world of SuperInstance) |

Our own fleet's repos also carry publish-ready manifests (exoj, quilt-arch,
quilt-dba, quilt-murmur, quilt-raw, quilt-silicon, quilt-stone, ropesight,
yiluodi) — the embassy led by example and swept itself without mercy.

## Honest boundary

Manifest-level readiness ≠ build readiness: no test suites were run, no
sdist/wheel/crate builds were attempted, no CI status was consulted, and
name-collision checks against the live registries were NOT performed
(e.g. generic names like `vector-clock`, `witness-topology`, `zero-knowledge`
are almost certainly taken upstream — claiming them will need scoped names
like the existing `@superinstance/*` and `si-*` patterns).

## Doctrine note (embassy)

This sweep publishes nothing. Per #16's own protocol, discovery precedes
publishing, creds stay with the cred-holder, and the list is a gift with
receipts — the fleet decides what ships.
