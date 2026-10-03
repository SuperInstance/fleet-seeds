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
import hashlib, json, os, re, sys, time, urllib.request

FNV_OFFSET = 0xcbf29ce484222325
FNV_PRIME = 0x100000001b3
MASK64 = 0xFFFFFFFFFFFFFFFF

BASE = "https://api.minimax.io/v1"
MODEL = "MiniMax-M2.7"
ENV = "/root/.env"
HERE = os.path.dirname(os.path.abspath(__file__))
JOURNAL = os.environ.get("ZC_JOURNAL", os.path.join(HERE, "zeroclaw-journal.jsonl"))
DELTA_DIR = os.path.join(HERE, "deltas")
NOTARY = "https://quilt-tip-notary.casey-digennaro.workers.dev"
SPECIES = ("git", "tip", "seal", "fp", "row")
EXIT_VERIFIED, EXIT_FAIL, EXIT_USAGE, EXIT_CHANNEL = 0, 1, 2, 3

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
        if body.get("prev_hash") != prev:
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
        if "canned_output" in order:
            content = order["canned_output"]
            usage = {"canned": True}
        else:
            resp = minimax([
                {"role": "system", "content": order.get("system",
                    "You are zeroclaw, a fleet assistant. Terse, receipt-minded, honest about gaps. "
                    "Produce the requested artifact only, no preamble.")},
                {"role": "user", "content": prompt}])
            content = resp["choices"][0]["message"]["content"]
            usage = resp.get("usage", {})
        slug = order["slug"]
        delta_path = os.path.join(DELTA_DIR, f"{time.strftime('%Y-%m-%d')}-{slug}.md")
        with open(delta_path, "w") as f:
            f.write(content)
        row = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "agent": "zeroclaw-v0.5", "model": "canned" if "canned_output" in order else MODEL,
            "order": slug,
            "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
            "output_file": os.path.basename(delta_path),
            "output_sha256": hashlib.sha256(content.encode()).hexdigest(),
            "usage": usage, "latency_s": round(time.time() - t0, 3),
            "prev_hash": prev,
        }
        if order.get("cites"):
            row["cites"] = order["cites"]
        row["row_hash"] = fnv1a64(canon({k: v for k, v in row.items() if k != "row_hash"}))
        append_row(row)
        prev = row["row_hash"]
        print(f"[{oi}/{len(orders)}] {slug}: {len(content)} chars -> {delta_path} row {row['row_hash'][:12]}")

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

if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "verify":
        sys.exit(verify())
    if args and args[0] == "cite":
        sys.exit(cite(args[1:]))
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
