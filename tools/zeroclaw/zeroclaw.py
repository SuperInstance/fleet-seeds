#!/usr/bin/env python3
"""zeroclaw v0 — single-file assistant loop on Minimax, fnv1a-64-chained receipts.

Usage:
  python3 zeroclaw.py run            # execute standing orders, append receipt rows
  python3 zeroclaw.py verify         # recompute the whole receipt chain, print tip

Design (fleet-seeds lode 2026-10-03, FB2):
  - stdlib only; token read from /root/.env (never printed)
  - one Minimax call per order; every exchange becomes a receipt row
  - rows are hash-chained: row_hash = fnv1a64(canonical_json(row incl prev_hash))
  - journal is append-only; verify recomputes genesis->tip
"""
import hashlib, json, os, sys, time, urllib.request

FNV_OFFSET = 0xcbf29ce484222325
FNV_PRIME = 0x100000001b3
MASK64 = 0xFFFFFFFFFFFFFFFF

BASE = "https://api.minimax.io/v1"
MODEL = "MiniMax-M2.7"
ENV = "/root/.env"
JOURNAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zeroclaw-journal.jsonl")
DELTA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deltas")

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
        prompt = order["prompt"] + ("\n\n=== CONTEXT ===\n" + context if context else "")
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
            "agent": "zeroclaw-v0", "model": MODEL, "order": slug,
            "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
            "output_file": os.path.basename(delta_path),
            "output_sha256": hashlib.sha256(content.encode()).hexdigest(),
            "usage": usage, "latency_s": round(time.time() - t0, 3),
            "prev_hash": prev,
        }
        row["row_hash"] = fnv1a64(canon({k: v for k, v in row.items() if k != "row_hash"}))
        append_row(row)
        prev = row["row_hash"]
        print(f"[{oi}/{len(orders)}] {slug}: {len(content)} chars -> {delta_path} "
              f"({usage.get('total_tokens','?')} tok, {row['latency_s']}s) row {row['row_hash'][:12]}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        sys.exit(verify())
    SEEDS = "/tmp/fleet-seeds/scouts"
    def read_last_scouts(n=3):
        files = sorted(f for f in os.listdir(SEEDS) if f.endswith(".md"))[-n:]
        return "\n\n".join(f"--- {f} ---\n" + open(os.path.join(SEEDS, f)).read()[:6000]
                           for f in files)
    orders = [{
        "slug": "fleet-seeds-last3-scout-delta",
        "prompt": ("Read the 3 most recent scout reports below from the fleet-seeds repo. "
                   "File a DELTA: (1) one line per scout — what it established; "
                   "(2) cross-scout threads (things two scouts touched); "
                   "(3) the 3 highest-value next actions, each with a named owner lane. "
                   "Under 60 lines, markdown."),
        "context_fn": read_last_scouts,
    }]
    run(orders)
