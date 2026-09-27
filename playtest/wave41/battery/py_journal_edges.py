#!/usr/bin/env python3
"""py_journal_edges.py — run the FOREIGN ref/journal_ref.py verifier on each
edge journal the JS side wrote. Prints one JSON per case.
"""
import io
import json
import subprocess
import sys

CASES = ["U", "D", "S", "N"]
BASE = "/home/z/my-project/download/playtest-wave41/battery/journals/"
REF = "/home/z/my-project/download/pt-quilt-arch/ref/journal_ref.py"

for c in CASES:
    path = BASE + "journal_" + c + ".jsonl"
    proc = subprocess.run(
        [sys.executable, REF, "--file", path],
        capture_output=True, timeout=60,
    )
    out = proc.stdout.decode("utf-8", "replace").strip()
    err = proc.stderr.decode("utf-8", "replace").strip()
    parsed = None
    try:
        parsed = json.loads(out)
    except Exception:
        pass
    # summarize the failure mode without dumping full tracebacks
    err_head = " | ".join(err.splitlines()[-3:])[:220] if err else ""
    print(json.dumps({
        "case": c,
        "exit": proc.returncode,
        "verdict": parsed,
        "error_head": err_head,
    }))
