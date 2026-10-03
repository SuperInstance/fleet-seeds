#!/usr/bin/env python3
"""FB5 pins — species-grammar envelope for zeroclaw (fleet-seeds, RD-005 proposal).

FAIL-first: written before zeroclaw.py v0.5's `cite` subcommand existed.
Run: python3 test_pins.py  (stdlib only; network pins hit live channels)
"""
import json, subprocess, sys, os

ZC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zeroclaw.py")
NOTARY = "https://quilt-tip-notary.casey-digennaro.workers.dev"
REAL_TIP = "b92d3cd2e735e8f5fdad0c008446a93667aa4ee0c0a06c4bcb2a3e2bccf5f572"  # lane erised-ft1, 2026-10-02
REAL_ROW = "3d0e52b8b056327d"  # zeroclaw genesis row

passed = failed = 0
def check(name, cond, detail=""):
    global passed, failed
    if cond: passed += 1; print(f"  ok  {name}")
    else: failed += 1; print(f"FAIL  {name}  {detail}")

def run(*args):
    return subprocess.run([sys.executable, ZC, *args], capture_output=True, text=True, timeout=60)

# 1. Bare 64-hex refuses to guess species (the RD-005 lesson as a pin)
r = run("cite", "ab" * 32)
check("bare 64-hex -> UNRESOLVED, exit 2 (no guessing)", r.returncode == 2 and "UNRESOLVED" in r.stdout, r.stdout[:120])

# 2. tip: real notary tip verifies IN CHANNEL with lane named
r = run("cite", f"tip:{REAL_TIP}")
check("tip: live notary tip -> MATCH + lane", r.returncode == 0 and "MATCH" in r.stdout and "erised-ft1" in r.stdout, r.stdout[:160])

# 3. tip: mutated tip -> MISMATCH, exit 1 (never softens)
mut = REAL_TIP[:-2] + ("00" if REAL_TIP[-2:] != "00" else "01")
r = run("cite", f"tip:{mut}")
check("tip: mutated -> MISMATCH, exit 1", r.returncode == 1 and "MISMATCH" in r.stdout, r.stdout[:160])

# 4. row: genesis journal row verifies
r = run("cite", f"row:{REAL_ROW}")
check("row: genesis row -> VERIFIED", r.returncode == 0 and "VERIFIED" in r.stdout, r.stdout[:160])

# 5. row: unknown hash -> NOT FOUND
r = run("cite", "row:" + "ff" * 8)
check("row: unknown -> NOT FOUND, exit 1", r.returncode == 1 and "NOT FOUND" in r.stdout, r.stdout[:160])

# 6. git: dead object -> NOT FOUND in channel (default repo fleet-seeds)
r = run("cite", "git:0000000000000000000000000000000000000000")
check("git: null sha -> NOT FOUND, exit 1", r.returncode == 1, r.stdout[:160])

# 7. unknown species prefix -> refused
r = run("cite", "banana:abcd")
check("unknown species -> refused, exit 2", r.returncode == 2 and "unknown species" in r.stdout, r.stdout[:120])

# 8. receipt rows carry cites and the chain still verifies over them
import shutil, tempfile
scratch = tempfile.mkdtemp()
shutil.copy(os.path.join(os.path.dirname(ZC), "zeroclaw-journal.jsonl"), os.path.join(scratch, "zeroclaw-journal.jsonl"))
env = dict(os.environ, ZC_JOURNAL=os.path.join(scratch, "zeroclaw-journal.jsonl"))
r = subprocess.run([sys.executable, ZC, "run-test-cites"], capture_output=True, text=True, timeout=60, env=env)
rows = [json.loads(l) for l in open(env["ZC_JOURNAL"])]
last = rows[-1]
check("run with cites: last row carries cites[]", "cites" in last and any(c.startswith("tip:") for c in last["cites"]), json.dumps(last)[:200])
v = subprocess.run([sys.executable, ZC, "verify"], capture_output=True, text=True, env=env)
check("chain verifies over cited rows", v.returncode == 0 and "CHAIN OK" in v.stdout, v.stdout[:120])

print(f"\npins: {passed} pass / {failed} fail")
sys.exit(1 if failed else 0)
