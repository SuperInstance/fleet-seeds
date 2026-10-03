#!/usr/bin/env python3
"""FB5 pins — species-grammar envelope for zeroclaw (fleet-seeds, RD-005 proposal).

FAIL-first: written before zeroclaw.py v0.5's `cite` subcommand existed.
Run: python3 test_pins.py  (stdlib only; network pins hit live channels)
"""
import json, subprocess, sys, os

ZC = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "zeroclaw.py"))
JOURNAL = os.path.join(os.path.dirname(ZC), "zeroclaw-journal.jsonl")
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
shutil.copy(JOURNAL, os.path.join(scratch, "zeroclaw-journal.jsonl"))
env = dict(os.environ, ZC_JOURNAL=os.path.join(scratch, "zeroclaw-journal.jsonl"))
r = subprocess.run([sys.executable, ZC, "run-test-cites"], capture_output=True, text=True, timeout=60, env=env)
rows = [json.loads(l) for l in open(env["ZC_JOURNAL"])]
last = rows[-1]
check("run with cites: last row carries cites[]", "cites" in last and any(c.startswith("tip:") for c in last["cites"]), json.dumps(last)[:200])
v = subprocess.run([sys.executable, ZC, "verify"], capture_output=True, text=True, env=env)
check("chain verifies over cited rows", v.returncode == 0 and "CHAIN OK" in v.stdout, v.stdout[:120])

print(f"\npins (FB5): {passed} pass / {failed} fail")

# ── FB2 pins: the reflex synapse (FAIL-first: before zeroclaw v0.6 existed) ──
# Pure-function pins run in-process (env set before import); contract pins use
# a stub serve script so the zeroclaw↔pincher contract is pinned without a
# pincher checkout.
import hashlib as _hl, importlib.util as _il, os as _os, tempfile as _tf

scratch = _tf.mkdtemp()
_os.environ["ZC_REFLEXES"] = _os.path.join(scratch, "reflexes")
STUB = _os.path.join(scratch, "stub-serve.js")
_os.environ["ZC_PINCHER_SERVE"] = STUB

_spec = _il.spec_from_file_location("zeroclaw", ZC)
mod = _il.module_from_spec(_spec)
_spec.loader.exec_module(mod)

# 9. trigger construction is deterministic and addresses context exactly
t1 = mod.build_trigger("demo-order", "do the thing", "ab" * 32)
t2 = mod.build_trigger("demo-order", "do the thing", "ab" * 32)
t3 = mod.build_trigger("demo-order", "do the thing", "cd" * 32)
check("FB2 trigger: deterministic", t1 == t2)
check("FB2 trigger: one-hex context change readdresses", t1 != t3 and t1.endswith("ab" * 32))

# 10. filed spec roundtrips: id stable, payload self-verifying, cites chain
row = {"row_hash": "feedface12345678"}
content = "# demo delta\nreflex payload\n"
sid_a = mod.file_spec("demo-order", "do the thing", "ab" * 32, content, "2026-10-03-demo-order.md", row, ["git:" + "e9" * 40])
sid_b = mod.file_spec("demo-order", "do the thing", "ab" * 32, content, "2026-10-03-demo-order.md", row, ["git:" + "e9" * 40])
spec = json.load(open(_os.path.join(_os.environ["ZC_REFLEXES"], sid_a + ".json")))
check("FB2 spec: id content-addressed (stable)", sid_a == sid_b and sid_a.startswith("zc-"))
check("FB2 spec: payload sha self-verifies",
      _hl.sha256(content.encode()).hexdigest() == spec["payload"]["output_sha256"])
check("FB2 spec: cites carry grammar + origin row",
      "row:feedface12345678" in spec["cites"] and any(c.startswith("git:") for c in spec["cites"]))
check("FB2 spec: provenance is zeroclaw", spec["provenance"]["compiledBy"] == "zeroclaw")

# 11. serve-contract pin via stub: hit roundtrips, corrupt payload rejected,
#     exit 4 is an honest miss (never a stale hit)
GOOD_SHA = "ab" * 32
with open(STUB, "w") as f:
    f.write(r'''
const fs = require("fs");
const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i+1] : ""; };
const sha = arg("--context-sha256");
if (sha !== process.env.STUB_GOOD_SHA) process.exit(4);
const content = "# served delta\n";
const payload = { content, output_sha256: require("crypto").createHash("sha256").update(content).digest("hex"),
  cites: ["row:origin000000000001"], origin_row: "origin000000000001" };
console.log(JSON.stringify({ kind: "hit", latencyMs: 3, specId: "zc-stub", output: payload }));
''')

_os.environ["ZC_PINCHER_SERVE"] = STUB
_os.environ["STUB_GOOD_SHA"] = GOOD_SHA
spec2 = _il.spec_from_file_location("zeroclaw2", ZC)
mod2 = _il.module_from_spec(spec2)
spec2.loader.exec_module(mod2)
hit = mod2.try_reflex("demo-order", "do the thing", GOOD_SHA)
check("FB2 contract: stub hit roundtrips content + origin row",
      hit is not None and hit[0] == "# served delta\n" and hit[2] == "origin000000000001"
      and "row:origin000000000001" in hit[3], repr(hit)[:160])
miss = mod2.try_reflex("demo-order", "do the thing", "cd" * 32)
check("FB2 contract: exit 4 -> honest miss (None)", miss is None)

# 12. corrupted payload (sha mismatch) is never served
CORRUPT = _os.path.join(scratch, "stub-corrupt.js")
with open(CORRUPT, "w") as f:
    f.write('console.log(JSON.stringify({kind:"hit", latencyMs:1, specId:"zc-x", output:{content:"# tampered\n", output_sha256:"' + "00" * 32 + '", cites:[]}}));')
_os.environ["ZC_PINCHER_SERVE"] = CORRUPT
spec3 = _il.spec_from_file_location("zeroclaw3", ZC)
mod3 = _il.module_from_spec(spec3)
spec3.loader.exec_module(mod3)
bad = mod3.try_reflex("demo-order", "do the thing", GOOD_SHA)
check("FB2 contract: sha-mismatched payload -> None (never serve a lie)", bad is None)

# ── FB7 pins: verify-any-receipt — one envelope, every channel (FAIL-first) ──
scratch7 = _tf.mkdtemp()
_os.environ["ZC_JOURNAL"] = _os.path.join(scratch7, "journal.jsonl")
_os.environ["ZC_DELTAS"] = _os.path.join(scratch7, "deltas")
_os.environ["ZC_REFLEXES"] = _os.path.join(scratch7, "reflexes")
_os.makedirs(_os.environ["ZC_DELTAS"])

# craft a two-row chain with on-disk deltas (hermetic; production journal untouched)
def _mkrow(slug, content, cites, prev, model="canned"):
    row = {"ts": "2026-10-03T00:00:00Z", "agent": "pin-fixture", "model": model,
           "order": slug, "prompt_sha256": _hl.sha256(slug.encode()).hexdigest(),
           "output_file": f"2026-10-03-{slug}.md",
           "output_sha256": _hl.sha256(content.encode()).hexdigest(),
           "usage": {"canned": True}, "latency_s": 0.01, "prev_hash": prev}
    if cites:
        row["cites"] = cites
    row["row_hash"] = mod.fnv1a64(mod.canon({k: v for k, v in row.items() if k != "row_hash"}))
    return row

_c1, _c2 = "# alpha delta\n", "# beta delta\n"
_r1 = _mkrow("pin-alpha", _c1, ["git:e9363fa49548c12239da58745120e4fb59b61250"], "genesis")
_r2 = _mkrow("pin-beta", _c2, [], _r1["row_hash"])
with open(_os.environ["ZC_JOURNAL"], "w") as _f:
    _f.write(json.dumps(_r1) + "\n" + json.dumps(_r2) + "\n")
open(_os.path.join(_os.environ["ZC_DELTAS"], "2026-10-03-pin-alpha.md"), "w").write(_c1)
open(_os.path.join(_os.environ["ZC_DELTAS"], "2026-10-03-pin-beta.md"), "w").write(_c2)

spec7 = _il.spec_from_file_location("zeroclaw7", ZC)
mod7 = _il.module_from_spec(spec7)
spec7.loader.exec_module(mod7)

import io, contextlib as _cx

def _audit(prefix):
    buf = io.StringIO()
    with _cx.redirect_stdout(buf):
        code = mod7.audit([prefix])
    return code, buf.getvalue()

code7, out7 = _audit(_r1["row_hash"][:12])
check("FB7 audit: clean genesis row PASSES (hash+seal+git cite in-channel)",
      code7 == 0 and "HASH OK" in out7 and "GENESIS" in out7 and "SEAL OK" in out7 and "CITE OK" in out7,
      out7[:200])
code7b, out7b = _audit(_r2["row_hash"][:12])
check("FB7 audit: second row CHAIN OK to first",
      code7b == 0 and "CHAIN OK" in out7b, out7b[:200])

# tamper the beta delta on disk -> SEAL BROKEN, AUDIT FAIL
open(_os.path.join(_os.environ["ZC_DELTAS"], "2026-10-03-pin-beta.md"), "w").write("# tampered\n")
code7c, out7c = _audit(_r2["row_hash"][:12])
check("FB7 audit: tampered delta file -> SEAL BROKEN + AUDIT FAIL",
      code7c == 1 and "SEAL BROKEN" in out7c and "AUDIT FAIL" in out7c, out7c[-120:])

# tamper a row FIELD without fixing row_hash -> HASH MISMATCH
rows7 = [json.loads(l) for l in open(_os.environ["ZC_JOURNAL"])]
rows7[0]["usage"] = {"canned": False}
with open(_os.environ["ZC_JOURNAL"], "w") as _f:
    _f.write("\n".join(json.dumps(r) for r in rows7) + "\n")
code7d, out7d = _audit(_r1["row_hash"][:12])
check("FB7 audit: field tamper -> HASH MISMATCH + AUDIT FAIL",
      code7d == 1 and "HASH MISMATCH" in out7d, out7d[:160])

code7e, out7e = _audit("ff" * 8)
check("FB7 audit: unknown row -> NOT FOUND, exit 2", code7e == 2 and "NOT FOUND" in out7e)

# FB3 wiring: zeroclaw forwards --ledger to serve when ZC_PINCHER_LEDGER is set
ARGVLOG = _os.path.join(scratch7, "stub-argv.json")
LEDGER = _os.path.join(scratch7, "pincher-ledger.jsonl")
STUB7 = _os.path.join(scratch7, "stub-serve7.js")
_os.environ["STUB_ARGV_LOG"] = ARGVLOG
with open(STUB7, "w") as f:
    f.write(r'''
const fs = require("fs");
fs.writeFileSync(process.env.STUB_ARGV_LOG, JSON.stringify(process.argv));
const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i+1] : ""; };
const ledger = arg("--ledger");
if (ledger) fs.appendFileSync(ledger, JSON.stringify({note:"stub-served"}) + "\n");
const content = "# served delta\n";
const payload = { content, output_sha256: require("crypto").createHash("sha256").update(content).digest("hex"), cites: [] };
console.log(JSON.stringify({ kind: "hit", latencyMs: 2, specId: "zc-stub7", output: payload }));
''')
_os.environ["ZC_PINCHER_SERVE"] = STUB7
_os.environ["ZC_PINCHER_LEDGER"] = LEDGER
spec8 = _il.spec_from_file_location("zeroclaw8", ZC)
mod8 = _il.module_from_spec(spec8)
spec8.loader.exec_module(mod8)
hit8 = mod8.try_reflex("pin-order", "prompt", GOOD_SHA)
argv_logged = json.load(open(ARGVLOG)) if _os.path.exists(ARGVLOG) else []
check("FB3 wiring: --ledger forwarded to serve when configured",
      hit8 is not None and "--ledger" in argv_logged and LEDGER in argv_logged
      and _os.path.exists(LEDGER))

print(f"\npins total: {passed} pass / {failed} fail")
sys.exit(1 if failed else 0)
