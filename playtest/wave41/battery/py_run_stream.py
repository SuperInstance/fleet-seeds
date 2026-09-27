#!/usr/bin/env python3
"""py_run_stream.py — lane 41-d edge battery, Python side.
Imports the FOREIGN repo's ref/q32_ref.py READ-ONLY (sys.path insert) and
runs run_stream over edges_stream.json. Prints one JSON per line: {i, op, result}.
"""
import json
import sys

sys.path.insert(0, "/home/z/my-project/download/pt-quilt-arch/ref")
import q32_ref  # noqa: E402

with open("/home/z/my-project/download/playtest-wave41/battery/edges_stream.json", "r", encoding="utf-8") as f:
    stream = json.load(f)

for i, (op, res) in enumerate(zip(stream["ops"], q32_ref.run_stream(stream))):
    print(json.dumps({"i": i, "op": op["op"], "result": res}))
