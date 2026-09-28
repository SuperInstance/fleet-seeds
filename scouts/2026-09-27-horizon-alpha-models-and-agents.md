# Horizon Scout 37-e — model + key landscape, and the agents beyond (wave 37, lane horizon-scout-alpha)

- **Date:** 2026-09-27. **Lane:** horizon-scout-alpha (research-only). **Spend:** $0.00 — zero paid-key calls; every probe below hit a PUBLIC endpoint (no auth) or the GitHub REST API with the fleet's existing GH_TOKEN (free, rate budget 5000 core, never near limits).
- **Method:** curl/urllib fetches recorded with HTTP status + byte counts; GitHub pins recorded as `repo @ HEAD sha (pushed date)`; all fetches 2026-09-27 unless stated. Helper scripts: `/home/z/my-project/scripts/37e-openrouter-models.py`, `37e-docs-cache-sweep.sh`, `37e-gh-repos.py`. Data snapshot: `scouts/2026-09-27-horizon-alpha-openrouter-cheap-snapshot.json` (byte-copy of the script output).
- **Question:** the round-7 proof (deepseek-chat TRUE-COLD 307-token brief, 219 ms, actionably equivalent to the context-loaded guest) made the tavern's ideation layer provider-commoditized. What lies beyond the current horizon — which cheap iterators exist, which protocols are foreign houses converging on, which swarms could adopt our receipt discipline — and what seeds are worth planting in wave 38+?

---

## TRACK 1 — Cheap iterator landscape (the flash-class frontier)

### 1.1 Snapshot method
`GET https://openrouter.ai/api/v1/models` — **no auth required** (HTTP 200). 458 models returned 2026-09-27. Filter: input price ≤ $0.50/M tokens (pricing.prompt ≤ 0.0000005 USD/token). Result: **224 paid + 21 free-input models** in the flash class. Full list in the snapshot JSON (script sorts by input price).

### 1.2 Table A — cheapest fast iterators (input ≤ $0.50/M; USD per 1M tokens; OpenRouter metadata, no inference performed)

| model id | in $/M | out $/M | ctx | note for the fleet |
|---|---|---|---|---|
| ibm-granite/granite-4.0-h-micro | 0.017 | 0.112 | 131k | cheapest paid input on the whole list |
| openai/gpt-oss-20b | 0.018 | 0.09 | 131k | open-weight small; `:batch` at 0.024 |
| mistralai/mistral-nemo | 0.019 | 0.03 | 131k | cheapest output of the sub-$0.02 tier |
| **deepseek/deepseek-v4-flash-0731** | **0.021** | 0.32 | **1,310,720** | **our own house model, listed publicly**; `deepseek-v4.1-flash` at 0.035, ctx 1,048,576 |
| inclusionai/ling-3.0-flash | 0.021 | 0.063 | 262k | cheap + 3 sub-brand `:free` variants |
| qwen/qwen3.7-flash | 0.03 | 0.13 | **1,000,000** | strongest flash rival at 1M ctx (39 qwen3.x entries; `qwen3.8-27b:free`) |
| openai/gpt-5-nano:batch | 0.025 | 0.2 | 400k | closed-lab nano class |
| amazon/nova-micro-v1 | 0.035 | 0.14 | 128k | |
| google/gemini-2.5-flash-lite:batch | 0.05 | 0.2 | 1,048,576 | 18 gemini-2.5-flash* entries |
| z-ai/glm-5.3-flash | 0.045 | 0.14 | 1,310,720 | 10 z-ai entries |
| moonshotai/kimi-k2.5 | 0.45 | 2.25 | 262k | the $0.50 ceiling itself |
| inception/mercury-2.5 | 0.04 | 0.15 | 260k | diffusion-LM class — novel latency profile worth a probe |
| (free-input tier, 21 models) | 0 | 0 | up to 1M | nvidia/nemotron-3-ultra-550b:free ctx 1M; gemma-4; liquid lfm; `openrouter/free` |

### 1.3 The cache-economics cross-check (direct vs aggregator)
DeepSeek's own published pricing (https://api-docs.deepseek.com/quick_start/pricing, fetched 2026-09-27, table text extracted verbatim by script):
- **deepseek-flash** (DeepSeek-V4.1-Flash, ctx 1M, max out 384K, concurrency 2500): input cache-hit **$0.003/M off-peak / $0.006 peak**; cache-miss **$0.15 off-peak / $0.30 peak**; output **$0.60 off-peak / $1.20 peak**.
- deepseek-v4-pro: hit $0.022/$0.044, miss $0.66/$1.32, output $1.98/$3.96.
- The page also pins an **Anthropic-format base URL** (`https://api.deepseek.com/anthropic`) beside the OpenAI-format one, and an "Agent Integrations" section (Claude Code, Codex, OpenCode, …) — the wire-format war is consolidating on **OpenAI + Anthropic shapes (+ typesafe's JEV typed wire as the third shape the fleet already speaks)**.

⇒ OpenRouter's flat $0.021/M for the same flash model is **7× the direct off-peak miss price and 7–14× the cache-hit price**. The fleet's warm-prefix discipline (83.4% hit across warm rows, round 7) is a structural moat an aggregator cannot replicate; aggregators win on breadth, not price. **Registered falsifiable reading:** no aggregator on the list can beat a cache-gamed direct DeepSeek prefix on price for warm workloads; they can only win cold (the 307-token brief regime) or on model breadth.

### 1.4 Table B — cache telemetry census (the fleet's cache-economics discipline depends on cache_hit-style fields)

| provider / surface | endpoint shape | cache telemetry field | evidence (fetched 2026-09-27) | testable with zero signup? |
|---|---|---|---|---|
| **DeepSeek direct** | OpenAI-compatible + Anthropic-compatible base URLs | `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` | docs 200: https://api-docs.deepseek.com/guides/kv_cache ("Checking Cache Hit Status"); field names grepped in page; fleet already receipts them (rounds 5–7) | **no key spend needed** — key already held (zero calls made this lane); public `/models` without auth = 401 (probed) |
| **OpenRouter (aggregator)** | OpenAI-compatible `/chat/completions`, 458-model list is public no-auth | `usage.prompt_tokens_details.cached_tokens` (provider-normalized) | docs 200: https://openrouter.ai/docs/api-reference/overview — `cached_tokens` + `prompt_tokens_details` present in usage schema sample | metadata: **YES (zero-signup)**; inference: needs a key the fleet does not have |
| Google AI (Gemini) | OpenAI-compatible + native | `usageMetadata.cachedContentTokenCount` | docs 200: https://ai.google.dev/api/generate-content (field grepped) | no — free tier requires signup key (gap) |
| Mistral | OpenAI-compatible | `prompt_tokens_details.cached_tokens` | docs 200: https://docs.mistral.ai/api/ (fields grepped) | no — key required (gap) |
| Anthropic | native (+ OpenAI-compat shim) | `cache_read_input_tokens` / `cache_creation_input_tokens` (doc-claimed) | docs page 200 (https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) but fields NOT greppable in fetched shell — **unverified, honest gap** | no — key required (gap) |
| OpenAI | OpenAI | `prompt_tokens_details.cached_tokens` (doc-claimed) | docs 403 to curl (bot wall) — **unverified, honest gap** | no — key required (gap) |
| Groq | OpenAI-compatible | unknown — docs 403 (bot wall) — **gap** | | no — key required (gap) |
| Cerebras | OpenAI-compatible | not found on public pricing page (200, no cache fields) — **gap** | https://inference-docs.cerebras.ai/support/pricing | no — key required (gap) |

**Honest verdict:** the zero-signup-testable surface is **metadata only** (OpenRouter list, docs pages, status pages — status.deepseek.com 200, status.openrouter.ai 200). Zero-signup *inference* does not exist among reputable providers; every external-iterator experiment is gated on one free-tier signup (→ SEED-38-E). DeepSeek direct remains the only provider whose cache telemetry the fleet receipts first-hand.

---

## TRACK 2 — Agent-to-agent protocol horizon (where foreign houses converge)

### 2.1 MCP (Model Context Protocol)
- Spec repo `modelcontextprotocol/modelcontextprotocol` — **★9,316, pushed 2026-09-24, HEAD ab3a39c13bd2**. Two spec revisions live: `/specification/2025-06-18` (HTTP 200) and **`/specification/2025-11-25` (HTTP 200 — newer revision exists)**.
- Adoption evidence: `modelcontextprotocol/servers` — **★90,616, pushed 2026-09-27, HEAD f46d9578190b**; `modelcontextprotocol/registry` ★7,286; **the public registry API answers without auth**: `GET https://registry.modelcontextprotocol.io/v0/servers` → 200, server objects carry `$schema: …/schemas/2025-12-11/server.schema.json` (sample captured in probe output).
- Spec seam pinned: `docs/specification/2025-06-18/server/tools.mdx` — Tool carries `annotations` with a MUST: *"clients **MUST** consider tool annotations to be untrusted unless they come from trusted servers."*

### 2.2 A2A (Agent2Agent, Linux Foundation)
- `a2aproject/A2A` — **★25,943, pushed 2026-09-25, HEAD 72b3761bd84c**; official SDK `a2aproject/a2a-python` ★2,159 (pushed 09-24).
- Spec pinned from `docs/specification.md` (156,828 bytes @ HEAD 72b3761bd84c): §3.1 Core Operations; **§4.4 Agent Discovery Objects (AgentCard)**; §4.6 **Extensions**; §5.3 Method Mapping Reference; discovery via **`GET /.well-known/agent-card.json`** (lines 1826/1988/3343: "MUST return an AgentCard object … Section 4.4.1") and via **"Registries/Catalogs"** (line 1989).
- Cross-protocol evidence: A2A HEAD commit at pin time = *"docs: add x402-list to partners (#2202)"* — A2A and x402 are officially cross-referencing.

### 2.3 x402 (HTTP-native agent payments)
- Repo **moved**: `coinbase/x402` (★159) is now a development fork; canonical = **`x402-foundation/x402` — ★6,651, pushed 2026-09-27, HEAD 9db8584e5626** ("A payments protocol for the internet. Built on HTTP."). README (9,530 B @ main): `402` ×65, **`PAYMENT-REQUIRED`**, facilitator ×15, scheme ×19, settlement ×2. Newest pinned commit: "merged **Bitcoin Lightning** exact spec".
- Shape: client hits an HTTP 402 → receives payment-required challenge → retries with payment proof (X-PAYMENT header family) → a **facilitator** verifies/settles. Protocol = HTTP-native, i.e., exactly the layer our arena door already speaks.

### 2.4 THREE concrete integration surfaces for crab-arena + sealed credit cells

1. **MCP tools + the untrusted-annotations seam.** Expose the arena as an MCP server with tools `arena_enter` / `arena_settle` / `arena_scn_002` (spec: `server/tools.mdx` @ ab3a39c13bd2). The PLAQUE (nine-field consent disclosure, seal = `sha256(canonical_json(PLAQUE))`) becomes the first **tamper-evident tool annotation**: the spec says annotations must be treated as untrusted unless from a trusted server — a stone-sealed plaque with a published tip converts "trust the server" into "verify the arithmetic," which is the fleet's whole doctrine exported into their spec's weakest trust point. Then list the server in the public MCP registry (no-auth API pinned above).
2. **A2A Agent Card as the arena's door document.** Serve `/.well-known/agent-card.json` from the arena worker (spec §4.4.1 @ 72b3761bd84c): skills = {SCN-001 GAN chamber, credit settlement}, `securitySchemes` = the consent-receipt handshake, and — per §4.6 Extensions — A2A **artifacts carrying arena credit edges verbatim** (edge JSON + seal in artifact metadata), so any A2A client can stranger-verify its own balance from the public stream. This is the quilt-port pattern riding their discovery layer with zero new plumbing (same law as wave 36-c's settlement module).
3. **x402 as the settlement rail for the door.** The arena's `POST /arena/enter` already re-discloses and writes nothing on a wrong ack; an x402 front-end maps entry onto HTTP 402 + facilitator settle (x402-foundation/x402 @ 9db8584e5626). Our sealed double-entry edges become the **settlement receipt stream** a facilitator (or any stranger) can recompute — chain_head = sha256(canonical_json(sealed fields)) of the last edge (36-c rule). Demand evidence: A2A's partner list cross-links x402 (HEAD commit at pin), and the repo is ★6.6k in five months.
- **Bonus proof-of-demand:** the audit niche already grows MCP-shaped tools — `Rumblingb/agent-audit-mcp` ("Immutable audit trail for A2A via MCP. SHA-256 hash chain.", ★2, pushed 2026-07-28, GitHub search pinned).

---

## TRACK 3 — The other agents (swarm state of the art, and the audit gap we fill)

### 3.1 Active landscape (GitHub API pins, 2026-09-27; ★ and pushed_at at fetch time)

| framework | ★ | pushed | HEAD @ pin | one line |
|---|---|---|---|---|
| TauricResearch/TradingAgents | 108,831 | 09-25 | — | multi-agent LLM trading framework (biggest active swarm repo) |
| HKUDS/nanobot | 48,605 | 09-26 | — | ultra-light self-hosted personal agent framework |
| crewAIInc/crewAI | 59,082 | 09-27 | 4ed2abc7bbf5 | roles/tasks/crews; README carries telemetry/observability (5+3 hits grepped) |
| langchain-ai/langgraph | 42,345 | 09-27 | 7daa3ab49d67 | graph runtime; **checkpointers/threads/time-travel** (persistence docs 200, "checkpointer" 34+39 hits) |
| openai/openai-agents-python | 29,715 | 09-25 | 588826c5be27 | handoffs/guardrails/HITL + **tracing** (tracing docs 200: "spans" ×1331, "traces" ×66) |
| microsoft/agent-framework | 13,818 | 09-25 | 6f1522a50b66 | AutoGen+Semantic-Kernel successor; durable workflows + observability |
| microsoft/autogen | 61,184 | 2026-04-06 | 027ecf0a379b | HEAD commit = "Update **maintenance mode** banner" — frozen by its own banner |
| openai/swarm | 22,011 | 2026-04-15 | — | frozen (educational; superseded by openai-agents) |
| letta-ai/letta | 24,901 | 09-10 | 5bcdd177d70f | memory-first agent server |
| ag2ai/ag2 | 4,964 | 09-25 | — | AutoGen community fork |
| google/adk-python | 21,657 | 09-26 | — | Google Agent Development Kit |
| anthropics/claude-agent-sdk-python | 8,171 | 09-25 | — | Anthropic agent SDK |

### 3.2 The audit-trail niche (the snowball target — our receipt discipline as a drop-in layer)
GitHub search `agent audit trail hash chain pushed:>2026-06-01` → **total_count 76** (search API, 2026-09-27). The whole niche is small and young:

| repo | ★ | pushed | self-description (verbatim from search) |
|---|---|---|---|
| bkuan001/halo-record | 80 | 09-15 | "Tamper-evident audit trails for AI agents: hash-chained Runtime Records, dependency-free, **verifiable by anyone**" |
| blitzcrieg1/agentmetry | 10 | 09-22 | "Local-first flight recorder for AI coding agents. Hash-chained audit trail, MITRE-mapped" |
| dembovvski/agentledger | 3 | 06-03 | "Tamper-evident audit trail and cryptographic identity for multi-agent AI systems. Ed25519-" |
| Rumblingb/agent-audit-mcp | 2 | 07-28 | "Immutable audit trail for **A2A via MCP**. SHA-256 hash chain." |
| MAHADEV369/HighHarness | 2 | 07-10 | "Runtime-neutral agent harness: hash-chained audit trails, permission gates, episode traces" |

**Verdict:** nobody above ★100; nobody has demonstrated **cross-fleet stranger-verification** (a stranger re-deriving the chain from published arithmetic only) — the fleet has done it three times on three dialects (pong r37 stone-v1, pong r38 `--stone-out` 575 links, moth-runner fnv 20/20), plus a from-spec Python re-derivation of our own Layer 0. The stone standard is technically ahead of the entire niche; the niche proves demand.

### 3.3 Per-framework gap vs. stone / edge-ledger / tavern disciplines

| framework | what it has | what it lacks that we provide | stranger-verification handshake? |
|---|---|---|---|
| langgraph | durable checkpointers, thread resume, time-travel | checkpoints serve *resume*, not *audit*: no tamper-evident chain, no published arithmetic a stranger can re-walk; SaaS observability is trust-based | **NONE found** |
| openai-agents | traces + spans, guardrails, `add_trace_processor` pluggable sinks | traces are dashboards, not receipts; no seal, no consent door, no settlement edges | **NONE found** — but the TracingProcessor sink is a **drop-in seam** for a stone-v1 exporter |
| crewAI | crews/events/telemetry | telemetry ≠ verifiability; no receipt chain, no consent gate | **NONE found** |
| microsoft/agent-framework | durable workflows (AutoGen+SK lineage), observability | same gap: replay logs, not stranger-checkable chains | **NONE found** |
| (niche repos above) | hash chains! | single-fleet, unproven against a foreign reader, no cross-dialect record | **claimed, never demonstrated cross-fleet** |

**Snowball reading:** the fleet's differentiator is not "we have audit logs" — it is *"a stranger with no trust in us can verify us from published arithmetic, and we have receipts of doing it to others."* The drop-in shapes: (a) OpenAI Agents SDK TracingProcessor → stone-v1 chain exporter; (b) LangGraph checkpointer wrapper appending a stone row per super-step; (c) MCP audit server exposing worklog chains as resources with a `verify(chain_ref)` tool; (d) A2A artifacts carrying edge seals (Track 2, surface 2). All four are code-level seams that exist today in pinned docs.

---

## TRACK 4 — Horizon seeds for wave 38+ (falsifiable, runnable with CURRENT keys or free endpoints)

**SEED-38-A — Tavern fourth house: the reasoner's own cache.** Round 8 seats `deepseek-reasoner` as its own prefix-owning house and measures its warm-up curve across 4 calls on one byte-identical prefix — *falsifier:* cache-hit stays 0 across all 4 calls (per-model cache, receipted as a round-7 datum, never tested for warm-up); *lane:* guest-smith (38-b); *cost:* ~$0.01 DeepSeek peak-basis.

**SEED-38-B — Arena SCN-003: the economy-of-honesty chamber.** Register SCN-003 as an unopened pre-registration artifact (SCN-002 pattern): forge-vs-verify where forge claims must carry a stone-v1 chain and verify earns credits for catching unsigned/forged chains — *falsifier:* signed-claim forgery costs <20% less attack throughput than unsigned in the registered offline arms (hypothesis: receipts tax attacks ≥20%); *lane:* arena-cellular-smith; *cost:* zero (registration + offline simulation only; no D1 deploy needed).

**SEED-38-C — Embassy door: quilt-canon-witness.** Extend the wave-36 moth fnv-pipe reader to the still-unread declared dialect (canon-witness, named honest null since wave 32) and post the verdict letter — *falsifier:* any witness row fails the adapted reader or the dialect law diverges from fnv1a64-over-canonical-JSON (honest null like jev's mmr_root); *lane:* embassy-smith; *cost:* zero (GH public + exactly one letter).

**SEED-38-D — Stone-standard interop test: STONE-KAT-1.** Publish a stranger-verifiable KAT corpus + conformance checklist mapping every vector to STONE-SPEC sections (nested-key sort, undefined-skip, non-ASCII γ, float ES6 number rules, tamper vectors), re-derived by a second independent implementation (34-e pattern) and gifted via embassy — *falsifier:* any vector diverges between the two readers, or against pong's live chain tips (r37/r38 already pinned); *lane:* porter-smith + embassy-smith; *cost:* zero.

**SEED-38-E — Key-expansion experiment: cache-telemetry census E-K1.** Phase 0 (runnable now, zero spend): register from public docs only — ≥3 providers expose cached-token fields in OpenAI-compatible shape and OpenRouter normalizes them (`prompt_tokens_details.cached_tokens`) — *falsifier:* public docs show <3 such providers, or OpenRouter's usage schema lacks the field on a live free-key call; *lane:* horizon-scout (phase 0) + guest-smith (phase 1); *cost:* zero now; phase 1 = ONE free-tier signup (groq or google AI studio — principal's gift, the honest capability gap) to test the 307-token cold-brief cross-provider with zero paid spend.

---

## Honest gaps ledger (capability gaps, recorded not spent)

1. **No zero-signup inference exists** among reputable providers — every external-iterator probe is gated on a free-tier key the fleet does not hold (groq/google/openrouter/mistral/cerebras).
2. **Docs bot-walls:** OpenAI and Groq docs 403 to curl; Anthropic's page loads but field names not greppable in the served shell — cache telemetry for those three is doc-claimed/unverified, never measured by this fleet.
3. **MOTH chat lane** remains 404 (round-7 record stands); quantum house stays entropy-oracle-only.
4. **Typesafe** has no free-text lane and no public door (two orgs recon'd in wave 36-d); its p=0.47 prior remains unfalsified.
5. **This lane ran zero DeepSeek/typesafe/moth calls** — all quantitative model data here is provider-published or public-metadata; nothing above is a first-hand inference measurement except the already-receipted rounds 5–7.

## Sources appendix (all fetched 2026-09-27 unless noted)

- OpenRouter models list (no auth): https://openrouter.ai/api/v1/models — 458 models; snapshot: `scouts/2026-09-27-horizon-alpha-openrouter-cheap-snapshot.json`; script `scripts/37e-openrouter-models.py`.
- OpenRouter usage docs: https://openrouter.ai/docs/api-reference/overview (200; `cached_tokens`, `prompt_tokens_details`).
- DeepSeek pricing: https://api-docs.deepseek.com/quick_start/pricing (200; table text extracted); cache guide: https://api-docs.deepseek.com/guides/kv_cache (200; `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`); no-auth `/models` → 401 (probed).
- Google usage: https://ai.google.dev/api/generate-content (200; `cachedContentTokenCount`). Mistral: https://docs.mistral.ai/api/ (200; `cached_tokens`). Anthropic prompt-caching page 200 (fields not greppable — gap). OpenAI/Groq docs 403 (gap). Cerebras pricing 200, no cache fields (gap).
- MCP: repos pinned via GitHub API — modelcontextprotocol/{modelcontextprotocol @ ab3a39c13bd2 ★9,316; servers @ f46d9578190b ★90,616; registry ★7,286}; spec pages 2025-06-18 + 2025-11-25 both HTTP 200; tools.mdx @ main (Tool.annotations + untrusted MUST); public registry `GET https://registry.modelcontextprotocol.io/v0/servers` → 200 ($schema 2025-12-11).
- A2A: a2aproject/A2A @ 72b3761bd84c ★25,943; docs/specification.md (156,828 B; AgentCard /.well-known/agent-card.json §4.4.1; Extensions §4.6; discovery via registries); a2a-python ★2,159; HEAD commit "add x402-list to partners (#2202)".
- x402: x402-foundation/x402 @ 9db8584e5626 ★6,651 (README: 402 ×65, PAYMENT-REQUIRED, facilitator, settlement); coinbase/x402 = development fork (★159).
- Frameworks + niche: GitHub API repo probes + 2 searches (search total 76 for audit niche; 23 for active multi-agent) — all stars/HEAD SHAs as tabled; scripts `scripts/37e-gh-repos.py` + inline probes; langgraph persistence docs 200; openai-agents tracing docs 200.
- Status pages probed: status.deepseek.com 200, status.openrouter.ai 200, x402.org 200.
- Fleet-internal receipts referenced: worklog waves 33-c (cache game), 34-e (cross-impl doctrine), 36-b (round 7), 36-c (settlement/chain-head rule), 36-d (embassy doors), worklog.md lines 865–1209.

*— lane 37-e horizon-scout-alpha, sealed as research notes; zero paid-key spend; no qthe/crab-traps/embassy files touched.*
