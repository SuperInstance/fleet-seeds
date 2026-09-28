# Wave 52 keeper lanes — codespace-as-tool + account atlas (2026-09-28)

## Lane 52-e: quilt-codespace-lab — the codespace as an ephemeral honest worker

**Pattern proven:** a Codespace whose `postCreateCommand` runs ONE experiment and
pushes its own receipts to a unique `codespace-run/<ts>` branch. No ssh, no tunnel —
the receipt IS the product. Worker deleted after each run (zero-extraction);
8 codespaces created, 8 deleted, 0 left standing.

Repo: SuperInstance/quilt-codespace-lab @ 262236124124 (remote==local verified).
Receipt branches: codespace-run/20260928T161442Z (attempt 2), …161708Z (3),
…162001Z (4), …162425Z (5), …162727Z (6), …163051Z (7), …163839Z (8, VERDICT PASS).

**Experiment E-CS52-1 verdict table (all predictions registered pre-run):**

| prediction | verdict |
|---|---|
| P1 registry install inside codespace w/ codespace token | FAIL×2 receipted (E401 attempt 2: no .npmrc auth; E403 attempt 3: `permission_denied: read_package` — codespace tokens lack read:packages, platform boundary). Adaptation: release-asset channel (contents:read) — install rc=0 from attempt 4 |
| P2 selftest 54/54, 0 escapes | PASS attempt 8 (witness mode receipted) |
| P3 receipts branch exists after Available | PASS from attempt 2 — every attempt self-pushed |

**The gift found by the worker:** the v0.1.0/0.1.1 package selftest was NOT hermetic —
it resolved crab-traps fixtures via repo-relative paths (passed in-sandbox only
because the sandbox contained the real crab-traps checkout; fresh-tarball consumer
simulation was co-located, not isolated). Caught by the ephemeral worker as ENOENT.

**Root cause (reader's own words, attempt 7):**
`reader: pin table mtime does not match seal.mtime_local (1790613055663.0051 vs
499162500000) — refusing to walk (fail closed)` — npm install normalizes extracted
mtimes to the 1985-10-26T08:15Z epoch (499162500000 ms). Isolated by the
tar-vs-npm extraction control (tar preserves header mtimes → 54/54; npm → refuse).

**Registered fix (not slipped):** qthe reader v0.2.0 `--mtime-witness` flag —
strict binding stays default; flag receipted per-walk (`mtime_binding` field);
registration resealed `7efea995…` with the witness law self-declared in
`seal.method`; selftest mode-aware (strict in-repo / witness under distribution);
CRAB resolution now env > bundled fixtures > repo sibling. qthe @ de7d73cfce27.

**Published:** @superinstance/qthe 0.1.0 → 0.1.1 → **0.2.0** (registry
npm.pkg.github.com + release assets v0.1.0/v0.1.1/v0.2.0). sha256 v0.2.0
`afaa7cf0d436d2c9aeabcb31f067f6fbe34e1d4c40c8b2670ffcce28323cdf69`.
Gate matrix for 0.2.0: repo-strict 54/54 ✓, npm-install-witness 54/54 ✓,
tar-extract-witness 54/54 ✓.

## Lane 52-f: quilt-atlas — the living map

SuperInstance/quilt-atlas @ 08b7cd8b5663. Account inventory is **≥4000 repos**
(hard cap receipted in atlas.json notes; the map does not fake a total).
Families (name-classified, precedence jev>latent>moth>qthe>quilt>fleet):
other=3327 · fleet=389 · quilt=202 · qthe=33 · moth=18 · jev=18 · latent=13.
Scheduled workflow `atlas.yml` (cron 17 */6 * * * + dispatch) — **first cloud run
36448364325 completed success**; the account now re-maps itself every 6h.
Design laws: families are name-classified (imperfect on purpose, stated);
CI probed only on the top-motion slice — absence elsewhere is UNMEASURED, never zero.

## Cross-pollination context for the next wave

- CI seeded (lane 52-b): coev PR#1 + mavis-substrate-walker PR#3, both Actions green.
- Package published (lane 52-c): @superinstance/qthe (above); 3 gists: fleet cheatsheet
  5a6de51bead71ed50efb22c5b1a66f5f, hardness law bad88a542d1fcec23a06c4f5537bd71a,
  systemone wire 4458c4bfaef69bb5f22a1de7f8bc6253.
- Play-test receipts (lane 52-d): scouts/2026-09-28-playtest-wave52.md —
  quilt 160/160 (install deps broken), jeviter 86/86, mavis 15/15, coev 33/33
  (script broken on node 24), qthe-codec honest-falsification confirmed,
  SmartCRDT Shamir FAIL 42→56 (needs owner attention).
- Open items: npm package visibility reports private via API despite public-intent
  publish (queued for main/UI); codespace GITHUB_TOKEN lacks read:packages (documented).
