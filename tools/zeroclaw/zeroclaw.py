#!/usr/bin/env python3
"""zeroclaw v0.5 — single-file assistant loop on Minimax, fnv1a-64-chained
receipts, species-grammar citation envelope (FB5, RD-005 proposal).

Commands:
  zeroclaw.py run              # execute standing orders, append receipt rows
  zeroclaw.py verify           # recompute the whole receipt chain, print tip
  zeroclaw.py cite <token> [--repo R] [--file P]
                               # verify one citation IN ITS OWN CHANNEL.
                               # token forms: git:<sha> tip:<sha256> seal:<sha256>
                               #              fp:<hex>   row:<fnv1a64>
                               # Bare 64-hex is REFUSED (three hash families
                               # share that surface — RD-005 lesson) unless it
                               # is exactly 40 hex (git sha-1 shape).

Design (fleet-seeds lode 2026-10-03):
  - stdlib only; token read from /root/.env (never printed)
  - one Minimax call per order; every exchange becomes a receipt row
  - rows are hash-chained: row_hash = fnv1a64(canonical_json(row incl prev_hash))
  - rows may carry `cites: ["git:…", "tip:…"]` — the chain covers them
"""
import hashlib, json, os, re, subprocess, sys, tempfile, time, urllib.request

FNV_OFFSET = 0xcbf29ce484222325
FNV_PRIME = 0x100000001b3
MASK64 = 0xFFFFFFFFFFFFFFFF

BASE = "https://api.minimax.io/v1"
MODEL = "MiniMax-M2.7"
ENV = "/root/.env"
HERE = os.path.dirname(os.path.abspath(__file__))
JOURNAL = os.environ.get("ZC_JOURNAL", os.path.join(HERE, "zeroclaw-journal.jsonl"))
DELTA_DIR = os.environ.get("ZC_DELTAS", os.path.join(HERE, "deltas"))
REFLEX_DIR = os.environ.get("ZC_REFLEXES", os.path.join(HERE, "reflexes"))
# FB2: the pincher serve CLI (quilt-pincher dist/cli/serve.js). Unset → reflex
# layer skips silently; every run takes the honest LLM path.
PINCHER_SERVE = os.environ.get("ZC_PINCHER_SERVE", "")
# FB3: pincher's own traffic ledger (--ledger). Opt-in; the receipt chain
# stays here, pincher keeps traffic stats. Two ledgers, one loop.
PINCHER_LEDGER = os.environ.get("ZC_PINCHER_LEDGER", "")
NOTARY = "https://quilt-tip-notary.casey-digennaro.workers.dev"
SPECIES = ("git", "tip", "seal", "fp", "row")
EXIT_VERIFIED, EXIT_FAIL, EXIT_USAGE, EXIT_CHANNEL = 0, 1, 2, 3
AGENT = "zeroclaw-v0.7.1"

def fnv1a64(data: bytes) -> str:
    h = FNV_OFFSET
    for b in data:
        h ^= b
        h = (h * FNV_PRIME) & MASK64
    return f"{h:016x}"

def canon(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()

def token() -> str:
    for line in open(ENV):
        if line.startswith("MINIMAX_TOKEN="):
            return line.strip().split("=", 1)[1]
    raise SystemExit("MINIMAX_TOKEN not found in /root/.env")

def minimax(messages, max_tokens=1200):
    body = json.dumps({"model": MODEL, "messages": messages,
                       "max_tokens": max_tokens, "temperature": 0.3}).encode()
    req = urllib.request.Request(f"{BASE}/chat/completions", data=body, headers={
        "Authorization": f"Bearer {token()}",
        "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def journal_tip():
    if not os.path.exists(JOURNAL):
        return None, -1
    tip, idx = None, -1
    with open(JOURNAL) as f:
        for i, line in enumerate(f):
            row = json.loads(line)
            tip, idx = row["row_hash"], i
    return tip, idx

def append_row(row):
    with open(JOURNAL, "a") as f:
        f.write(json.dumps(row, sort_keys=True) + "\n")

def verify():
    prev, tip, n = None, None, 0
    for line in open(JOURNAL):
        row = json.loads(line)
        body = {k: v for k, v in row.items() if k != "row_hash"}
        # genesis anchor: history carries BOTH representations — v0/v0.5 rows
        # have prev_hash null, run() writes "genesis". Both are the anchor.
        # (found 2026-10-03 building FB6: verify() used to reject run()'s own
        # fresh journals at row 0 while audit() accepted them — a real
        # cross-command contract gap, now pinned on the toolkit side.)
        if n == 0:
            ok = body.get("prev_hash") in (None, "genesis")
        else:
            ok = body.get("prev_hash") == prev
        if not ok:
            print(f"BREAK at row {n}: prev_hash {body.get('prev_hash')} != chain tip {prev}")
            return 1
        if fnv1a64(canon(body)) != row["row_hash"]:
            print(f"BREAK at row {n}: row_hash mismatch")
            return 1
        prev, tip, n = row["row_hash"], row["row_hash"], n + 1
    print(f"CHAIN OK: {n} rows, tip {tip}")
    return 0

def run(orders):
    os.makedirs(DELTA_DIR, exist_ok=True)
    prev, idx = journal_tip()
    for oi, order in enumerate(orders, 1):
        t0 = time.time()
        context = order["context_fn"]() if "context_fn" in order else ""
        prompt = order.get("prompt", "") + ("\n\n=== CONTEXT ===\n" + context if context else "")
        ctx_sha = hashlib.sha256(context.encode()).hexdigest()
        slug = order["slug"]
        reflex_hit = None
        if "canned_output" not in order:
            # FB2: ask pincher for an earned reflex BEFORE spending tokens.
            reflex_hit = try_reflex(slug, order.get("prompt", ""), ctx_sha)
        if "canned_output" in order:
            content = order["canned_output"]
            usage = {"canned": True}
        elif reflex_hit:
            content, spec_id, origin_row, _rcites = reflex_hit
            usage = {"reflex_hit": True, "reflex_id": spec_id, "tokens": 0,
                     "origin_row": origin_row}
        else:
            resp = minimax([
                {"role": "system", "content": order.get("system",
                    "You are zeroclaw, a fleet assistant. Terse, receipt-minded, honest about gaps. "
                    "Produce the requested artifact only, no preamble.")},
                {"role": "user", "content": prompt}])
            content = resp["choices"][0]["message"]["content"]
            usage = resp.get("usage", {})
        delta_path = os.path.join(DELTA_DIR, f"{time.strftime('%Y-%m-%d')}-{slug}.md")
        with open(delta_path, "w") as f:
            f.write(content)
        row = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "agent": AGENT, "model": "pincher-reflex" if reflex_hit else ("canned" if "canned_output" in order else MODEL),
            "order": slug,
            "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
            "output_file": os.path.basename(delta_path),
            "output_sha256": hashlib.sha256(content.encode()).hexdigest(),
            "usage": usage, "latency_s": round(time.time() - t0, 3),
            "prev_hash": prev,
        }
        if reflex_hit:
            # the served payload's cites already chain back to the origin row
            row["cites"] = reflex_hit[3]
        elif order.get("cites"):
            row["cites"] = order["cites"]
        row["row_hash"] = fnv1a64(canon({k: v for k, v in row.items() if k != "row_hash"}))
        append_row(row)
        prev = row["row_hash"]
        # FB2: every non-reflex run files the earned reflex so the next
        # identical (order, context) is served from the FAST tier.
        if not reflex_hit:
            spec_id = file_spec(slug, order.get("prompt", ""), ctx_sha, content,
                                os.path.basename(delta_path), row, order.get("cites"))
            print(f"[{oi}/{len(orders)}] {slug}: {len(content)} chars -> {delta_path} row {row['row_hash'][:12]} reflex {spec_id}")
        else:
            print(f"[{oi}/{len(orders)}] {slug}: REFLEX HIT {usage['reflex_id']} (origin row {str(usage['origin_row'])[:12]}) -> {delta_path} row {row['row_hash'][:12]}")

# ── FB2: the zeroclaw↔pincher reflex synapse ───────────────────────────────
# zeroclaw-reflex-spec/v1 — the shared format, no wire protocol. pincher's
# serve CLI (quilt-pincher dist/cli/serve.js) loads a dir of these and
# answers a matching trigger in ~20ms with 0 tokens. Cache-integrity law:
# the trigger embeds the context SHA, and serve pre-filters by EXACT
# context_sha256 — a drifted context is an honest miss, never a stale hit.

def build_trigger(slug: str, prompt: str, ctx_sha: str) -> str:
    return f"order:{slug}\n{prompt}\ncontext-sha256:{ctx_sha}"

def file_spec(slug, prompt, ctx_sha, content, delta_basename, row, order_cites) -> str:
    """File the earned reflex; returns spec id. id is content-addressed off
    the exact trigger, so an identical rerun addresses the same spec."""
    os.makedirs(REFLEX_DIR, exist_ok=True)
    spec_id = "zc-" + fnv1a64(build_trigger(slug, prompt, ctx_sha).encode())
    cites = list(order_cites or []) + [f"row:{row['row_hash']}"]
    spec = {
        "$schema": "zeroclaw-reflex-spec/v1",
        "id": spec_id,
        "intent": f"zeroclaw order: {slug} (earned reflex)",
        "trigger": build_trigger(slug, prompt, ctx_sha),
        "context_sha256": ctx_sha,
        "model": MODEL,
        "payload": {
            "delta_path": delta_basename,
            "output_sha256": hashlib.sha256(content.encode()).hexdigest(),
            "content": content,
            "bytes": len(content.encode()),
        },
        "origin_row": row["row_hash"],
        "cites": cites,
        "provenance": {"compiledBy": "zeroclaw", "parentOrder": slug},
    }
    with open(os.path.join(REFLEX_DIR, spec_id + ".json"), "w") as f:
        json.dump(spec, f, indent=1, sort_keys=True)
    return spec_id

def try_reflex(slug, prompt, ctx_sha):
    """Ask pincher serve for an earned reflex. Returns
    (content, spec_id, origin_row, cites) or None. NEVER raises — any
    failure means the honest LLM path. Contract pinned in test_pins.py
    with a stub serve script (no pincher checkout needed)."""
    if not PINCHER_SERVE or not os.path.exists(PINCHER_SERVE):
        return None
    trigger = build_trigger(slug, prompt, ctx_sha)
    fd, tpath = tempfile.mkstemp(prefix="zc-trigger-", suffix=".txt")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(trigger)
        proc = subprocess.run(
            ["node", PINCHER_SERVE, "--trigger-file", tpath,
             "--spec-dir", REFLEX_DIR, "--context-sha256", ctx_sha]
            + (["--ledger", PINCHER_LEDGER] if PINCHER_LEDGER else []),
            capture_output=True, text=True, timeout=30)
        if proc.returncode != 0:
            return None  # 4 = honest miss (drift or first run); 1/5 = error/veto
        line = [l for l in proc.stdout.splitlines() if l.strip()][-1]
        out = json.loads(line)
        payload = out.get("output") or {}
        content = payload.get("content")
        sha = payload.get("output_sha256")
        if not content or not sha:
            return None
        if hashlib.sha256(content.encode()).hexdigest() != sha:
            return None  # payload corrupted in transit — never serve a lie
        cites = list(payload.get("cites") or [])
        origin = payload.get("origin_row")
        if origin and f"row:{origin}" not in cites:
            cites.append(f"row:{origin}")
        return content, out.get("specId"), origin, cites
    except Exception:
        return None
    finally:
        os.unlink(tpath)

# ── species-grammar citation envelope (FB5) ────────────────────────────────

def classify(tok: str):
    """Return (species, value, error). Bare 64-hex is REFUSED — RD-005."""
    if ":" in tok:
        sp, val = tok.split(":", 1)
        if sp not in SPECIES:
            return None, val, f"unknown species '{sp}' (known: {'/'.join(SPECIES)})"
        return sp, val, None
    if re.fullmatch(r"[0-9a-f]{40}", tok):
        return "git", tok, None
    if re.fullmatch(r"[0-9a-f]{64}", tok):
        return None, tok, ("UNRESOLVED 64-hex: three hash families share this surface "
                           "(git sha256 / notary tip / content seal). Supply a species "
                           "prefix: git: tip: seal: fp: row: (RD-005 lesson)")
    return None, tok, "unrecognized token shape (want 40/64 hex or species:prefix)"

def http_get(url: str, timeout=30):
    req = urllib.request.Request(url, headers={
        "User-Agent": "zeroclaw/0.5 (receipt citation; fleet-seeds)",
        "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def get_json(url: str, timeout=30):
    return json.loads(http_get(url, timeout))

def cite_channel(species: str, val: str, repo: str, filepath):
    """Verify in the species' own channel. Returns (verdict_str, exit_code)."""
    if species == "tip":
        try:
            st = get_json(f"{NOTARY}/status")
        except Exception as e:
            return f"CHANNEL-ERROR notary /status: {e}", EXIT_CHANNEL
        for lane in st.get("lanes", []):
            if lane.get("tip") == val:
                return (f"MATCH lane={lane.get('lane')} day={lane.get('day')} "
                        f"integrity={lane.get('integrity')}"), EXIT_VERIFIED
        return "MISMATCH (tip not anchored in any tracked lane)", EXIT_FAIL
    if species == "git":
        import subprocess
        p = subprocess.run(["gh", "api", f"repos/SuperInstance/{repo}/commits/{val}",
                            "--jq", ".sha"], capture_output=True, text=True, timeout=60)
        if p.returncode == 0 and p.stdout.strip():
            return f"VERIFIED repo=SuperInstance/{repo} commit={p.stdout.strip()[:12]}", EXIT_VERIFIED
        return f"NOT FOUND in SuperInstance/{repo} (gh exit {p.returncode})", EXIT_FAIL
    if species == "row":
        if not os.path.exists(JOURNAL):
            return "NOT FOUND (no journal)", EXIT_FAIL
        hits = [json.loads(l) for l in open(JOURNAL)
                if json.loads(l)["row_hash"].startswith(val)]
        if len(hits) == 1:
            r0 = hits[0]
            return f"VERIFIED row {r0['row_hash']} order={r0['order']} ts={r0['ts']}", EXIT_VERIFIED
        if len(hits) > 1:
            return f"AMBIGUOUS ({len(hits)} rows share prefix '{val}' — extend it)", EXIT_USAGE
        return "NOT FOUND (no journal row carries this hash/prefix)", EXIT_FAIL
    if species == "seal":
        if not filepath or not os.path.exists(filepath):
            return "USAGE: seal: verification needs --file <path> (the sealed artifact)", EXIT_USAGE
        actual = hashlib.sha256(open(filepath, "rb").read()).hexdigest()
        if actual == val:
            return f"MATCH sha256 of {filepath}", EXIT_VERIFIED
        return f"MISMATCH file hashes to {actual[:16]}…, seal claims {val[:16]}…", EXIT_FAIL
    if species == "fp":
        if not re.fullmatch(r"[0-9a-f]{62,66}", val):
            return "FORMAT-REJECT (Ed25519 fingerprints are ~64 hex)", EXIT_USAGE
        if filepath and os.path.exists(filepath):
            reg = open(filepath).read()
            if val in reg:
                return f"MATCH fingerprint present in {filepath}", EXIT_VERIFIED
            return f"NOT FOUND in {filepath}", EXIT_FAIL
        return "FORMAT-OK (no --file registry supplied; format check only, not identity)", EXIT_VERIFIED
    return f"no channel for species '{species}'", EXIT_USAGE

def cite(argv):
    if not argv:
        print("usage: zeroclaw.py cite <token> [--repo R] [--file P]")
        return EXIT_USAGE
    tok, repo, filepath = argv[0], "fleet-seeds", None
    if "--repo" in argv: repo = argv[argv.index("--repo") + 1]
    if "--file" in argv: filepath = argv[argv.index("--file") + 1]
    species, val, err = classify(tok)
    if err:
        print(f"CITE {tok}\n  verdict: REFUSED — {err}")
        return EXIT_USAGE
    verdict, code = cite_channel(species, val, repo, filepath)
    print(f"CITE {tok}\n  species: {species}\n  channel: {channel_name(species, repo, filepath)}\n  verdict: {verdict}")
    return code

def channel_name(species, repo, filepath):
    return {"tip": f"notary /status ({NOTARY})",
            "git": f"github commits API (SuperInstance/{repo})",
            "row": f"zeroclaw journal ({os.path.basename(JOURNAL)})",
            "seal": f"sha256 of --file {filepath}",
            "fp": f"fingerprint registry {filepath or '(format only)'}"}[species]

# ── FB7: verify-any-receipt — one envelope, every channel ──────────────────

def find_row(prefix: str):
    if not os.path.exists(JOURNAL):
        return None, []
    hits = [json.loads(l) for l in open(JOURNAL)
            if json.loads(l)["row_hash"].startswith(prefix)]
    if len(hits) == 1:
        return hits[0], hits
    return None, hits

def audit(argv):
    """Audit one receipt row end to end: hash recomputed from canonical
    fields, chain linkage to prev_hash, output file re-sealed, every cite
    verified in its own channel. Exit 0 only if ALL checks pass."""
    if not argv:
        print("usage: zeroclaw.py audit <row-prefix> [--repo R]")
        return EXIT_USAGE
    prefix = argv[0]
    repo = argv[argv.index("--repo") + 1] if "--repo" in argv else "fleet-seeds"
    row, hits = find_row(prefix)
    if row is None:
        print(f"AUDIT {prefix}\n  verdict: {'AMBIGUOUS (' + str(len(hits)) + ' rows)' if hits else 'NOT FOUND'}")
        return EXIT_USAGE
    results, ok = [], True
    # 1. hash integrity: recompute from canonical content
    expect = row["row_hash"]
    actual = fnv1a64(canon({k: v for k, v in row.items() if k != "row_hash"}))
    if actual == expect:
        results.append(f"HASH OK        row_hash {expect[:16]}… recomputed match")
    else:
        results.append(f"HASH MISMATCH  stored {expect[:16]}… recomputes to {actual[:16]}… (row tampered)")
        ok = False
    # 2. chain linkage
    rows = [json.loads(l) for l in open(JOURNAL)]
    idx = next((i for i, r in enumerate(rows) if r["row_hash"] == row["row_hash"]), -1)
    if idx <= 0:
        results.append("GENESIS        first row — no prev linkage to check")
    else:
        prev_actual = rows[idx - 1]["row_hash"]
        if row.get("prev_hash") == prev_actual:
            results.append(f"CHAIN OK       prev_hash -> {prev_actual[:16]}…")
        else:
            results.append(f"CHAIN BROKEN   prev_hash {str(row.get('prev_hash'))[:16]}… but journal prev is {prev_actual[:16]}…")
            ok = False
    # 3. output seal: re-hash the delta file on disk
    opath = os.path.join(DELTA_DIR, row["output_file"])
    if os.path.exists(opath):
        osha = hashlib.sha256(open(opath, "rb").read()).hexdigest()
        if osha == row["output_sha256"]:
            results.append(f"SEAL OK        {row['output_file']} hashes to the recorded output_sha256")
        else:
            results.append(f"SEAL BROKEN    {row['output_file']} hashes {osha[:16]}…, row claims {row['output_sha256'][:16]}…")
            ok = False
    else:
        results.append(f"SEAL UNKNOWN   {row['output_file']} not on disk here (verify on the filing host)")
    # 4. every cite in its own channel
    for tok in row.get("cites", []):
        species, val, err = classify(tok)
        if err:
            results.append(f"CITE REFUSED   {tok[:48]} — {err}")
            ok = False
            continue
        verdict, _code = cite_channel(species, val, repo,
                                      opath if species == "seal" else None)
        mark = "CITE OK       " if _code == EXIT_VERIFIED else "CITE FAIL     "
        if _code != EXIT_VERIFIED:
            ok = False
        results.append(f"{mark} {species}:{val[:24]}… -> {verdict.splitlines()[0][:88]}")
    print(f"AUDIT row {row['row_hash']} order={row['order']} model={row['model']}")
    for r in results:
        print(f"  {r}")
    print(f"  verdict: {'AUDIT PASS' if ok else 'AUDIT FAIL'}")
    return EXIT_VERIFIED if ok else EXIT_FAIL

if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "verify":
        sys.exit(verify())
    if args and args[0] == "cite":
        sys.exit(cite(args[1:]))
    if args and args[0] == "audit":
        sys.exit(audit(args[1:]))
    if args and args[0] == "run-test-cites":
        run([{
            "slug": "test-cites", "canned_output": "test row for cite pins; no model call",
            "cites": ["tip:b92d3cd2e735e8f5fdad0c008446a93667aa4ee0c0a06c4bcb2a3e2bccf5f572",
                      "git:e9363fa49548c12239da58745120e4fb59b61250",
                      "row:3d0e52b8b056327d"],
        }])
        sys.exit(0)
    SEEDS = "/tmp/fleet-seeds/scouts"
    def read_last_scouts(n=3):
        files = sorted(f for f in os.listdir(SEEDS) if f.endswith(".md"))[-n:]
        return "\n\n".join(f"--- {f} ---\n" + open(os.path.join(SEEDS, f)).read()[:6000]
                           for f in files)
    ORDERS = [{
        "slug": "fleet-seeds-last3-scout-delta",
        "prompt": ("Read the 3 most recent scout reports below from the fleet-seeds repo. "
                   "File a DELTA: (1) one line per scout — what it established; "
                   "(2) cross-scout threads (things two scouts touched); "
                   "(3) the 3 highest-value next actions, each with a named owner lane. "
                   "Under 60 lines, markdown."),
        "context_fn": read_last_scouts,
        "cites": ["git:e9363fa49548c12239da58745120e4fb59b61250",
                  "tip:b92d3cd2e735e8f5fdad0c008446a93667aa4ee0c0a06c4bcb2a3e2bccf5f572"],
    }]
    run(ORDERS)
