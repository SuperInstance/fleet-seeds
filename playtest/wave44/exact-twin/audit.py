#!/usr/bin/env python3
"""44-b exact-twin audit harness — adopts SuperInstance/micrograd-quilt as the
fleet's affordable-exactness instrument (wave-43-b verdict: "direct qthe E-Q
companion instrument").

WHAT THIS IS
  A registered mini-audit on three embedding-style float expressions:
    E1_dot  : 8-dim dot product (attention-score style)
    E2_gate : tanh gate times value (GLU-style), 4-dim
    E3_norm : RMS-style normalization via exact integer-power reciprocal
  For each: float graph vs exact-mode twin graph (fractions.Fraction), plus
  the stochastic rational auditor over the float tape, plus negative controls
  (1-ulp gradient injections), plus tape determinism receipts.

IMPORT METHOD (documented per claims.json)
  sys.path import of a PINNED clone of micrograd-quilt; their files are
  UNMODIFIED: sys.dont_write_bytecode is set before import so no __pycache__
  is written into the clone, and the clone's `git status --porcelain` is
  receipted clean at the end of the run. MQT_EQ_PATH env var selects the
  clone location.

STDLIB ONLY. Python 3. Run: python3 audit.py [MQ_PATH]
"""
import sys
sys.dont_write_bytecode = True  # BEFORE imports: keep the source clone pristine
import hashlib
import json
import math
import os
import subprocess
from fractions import Fraction

MQ_PATH = sys.argv[1] if len(sys.argv) > 1 else os.environ.get(
    "MQT_EQ_PATH", "/home/z/my-project/pt44b-eq")
sys.path.insert(0, MQ_PATH)

from quilt import engine, auditor, tape  # noqa: E402  (pinned clone, unmodified)

HERE = os.path.dirname(os.path.abspath(__file__))

INPUTS = {
    "E1_q": [0.12, -0.47, 0.83, -0.05, 0.66, 0.21, -0.30, 0.91],
    "E1_k": [0.44, 0.19, -0.62, 0.77, -0.13, 0.58, 0.25, -0.08],
    "E2_q": [0.31, -0.52, 0.77, 0.09],
    "E2_k": [0.62, 0.15, -0.44, 0.28],
    "E2_v": [0.37],
    "E3_x": [0.30, -0.22, 0.51, 0.17, -0.44, 0.09, 0.63, -0.28],
}


# ── the three registered expressions ─────────────────────────────────────────
def build_E1():
    q = [engine.Value(v) for v in INPUTS["E1_q"]]
    k = [engine.Value(v) for v in INPUTS["E1_k"]]
    s = q[0] * k[0]
    for i in range(1, 8):
        s = s + q[i] * k[i]
    return s


def build_E2():
    q = [engine.Value(v) for v in INPUTS["E2_q"]]
    k = [engine.Value(v) for v in INPUTS["E2_k"]]
    s = q[0] * k[0]
    for i in range(1, 4):
        s = s + q[i] * k[i]
    g = s.tanh()
    v = engine.Value(INPUTS["E2_v"][0])
    return g * v


def build_E3():
    x = [engine.Value(v) for v in INPUTS["E3_x"]]
    y = x[0] * x[0]
    for i in range(1, 8):
        y = y + x[i] * x[i]
    r = y ** -1            # exact reciprocal (engine pow boundary: Fraction path)
    return r * x[0]        # normalize the first component


GRAPHS = {"E1_dot": build_E1, "E2_gate": build_E2, "E3_norm": build_E3}


def rel_err(a, b):
    """|a-b| relative to |b|, floored at 1e-300 (auditor's own convention)."""
    return abs(a - float(b)) / max(abs(float(b)), 1e-300)


def run_graph(name, build):
    """Float run (taped) + exact twin run + auditor exact cross-check."""
    engine.Value.reset_ids()
    t = tape.Tape()
    with tape.attach(t):
        sink = build()                 # float mode (default)
        sink.backward()                # live float backward, EFFECT rows taped
        rows = t.rows
        nodes = sink.topo("fwd")
        float_grads = {v.id: v.grad for v in nodes}
        float_vals = {v.id: v.data for v in nodes}
        verify_ok, verify_bad = t.verify()

    # exact twin graph: identical build order -> identical Value ids
    engine.Value.reset_ids()
    with engine.mode("exact"):
        sink_x = build()
        sink_x.backward()
        nodes_x = sink_x.topo("fwd")
        twin_vals = {v.id: v.twin for v in nodes_x}
        twin_grads = {v.id: v.grad_twin for v in nodes_x}

    # independent exact path: the auditor re-derives exact grads from tape rows
    sink_ids = auditor.sinks(rows)
    aud_exact = auditor.exact_grads(rows, sink_ids)

    # P1: drift, forward + gradients
    fwd_drift = {vid: rel_err(float_vals[vid], twin_vals[vid]) for vid in float_vals}
    grad_drift = {vid: rel_err(float_grads[vid], twin_grads[vid]) for vid in float_grads}
    aud_agree = all(twin_grads[vid] == aud_exact.get(vid, Fraction(0)) for vid in twin_grads)

    # P4: replay determinism (bitwise float grads from the tape alone)
    rep = tape.replay(rows, root=sink_ids[0])
    replay_bitwise = all(rep.get(vid, 0.0) == float_grads[vid] for vid in float_grads)

    # instrument finding: stochastic-mode coverage structure at seed 0
    rep0 = auditor.audit(rows, float_grads, mode="stochastic", seed=0)
    covered = sorted({a for _, a, _ in rep0.paths})

    return {
        "name": name,
        "n_nodes": len(nodes),
        "n_leaves": sum(1 for v in nodes if not v._op),
        "n_rows": len(rows),
        "sink_id": sink_ids[0],
        "float_value": float_vals[sink_ids[0]],
        "exact_value": str(twin_vals[sink_ids[0]]),
        "fwd_drift_max": max(fwd_drift.values()),
        "grad_drift_max": max(grad_drift.values()),
        "fwd_drift_max_node": max(fwd_drift, key=fwd_drift.get),
        "grad_drift_max_node": max(grad_drift, key=grad_drift.get),
        "auditor_exact_agrees": aud_agree,
        "tape_verify_ok": verify_ok and verify_bad is None,
        "replay_bitwise_equal": replay_bitwise,
        "auditor_seed0": {
            "n_nodes": rep0.n_nodes, "n_sampled": rep0.n_sampled,
            "n_paths": len(rep0.paths),
            "unique_ancestors_covered": len(covered),
            "covers_all_nodes": covered == sorted(float_grads),
            "mean": rep0.mean, "ci_half": rep0.ci_half,
            "worst": rep0.worst,
        },
        "_state": {  # kept internal, stripped before results.json
            "rows": rows,
            "float_grads": float_grads,
            "twin_grads": twin_grads,
            "float_vals": float_vals,
            "twin_vals": twin_vals,
            "node_ids": [v.id for v in nodes],
        },
    }


# ── P3: 1-ulp negative controls at EVERY auditable node ─────────────────────
def ulp_inject(gf, ge):
    """nextafter AWAY from the exact value (so drift can only grow)."""
    d = gf - ge
    direction = math.inf if d >= 0 else -math.inf
    return math.nextafter(gf, direction)


def run_controls(st):
    rows = st["_state"]["rows"]
    ids = st["_state"]["node_ids"]
    clean = st["_state"]["float_grads"]
    aud_clean = auditor.audit(rows, clean, mode="stochastic", seed=0)
    clean_rel = {(s, a): r for s, a, r in aud_clean.paths}
    flagged, missed = [], []
    for tid in ids:
        gf = clean[tid]
        ge = float(st["_state"]["twin_grads"][tid])
        corrupt = dict(clean)
        corrupt[tid] = ulp_inject(gf, ge)
        rep = auditor.audit(rows, corrupt, mode="stochastic", seed=0)
        hit = any(a == tid and r - clean_rel.get((s, a), 0.0) >= 2e-17
                  for s, a, r in rep.paths)
        (flagged if hit else missed).append({
            "node": tid,
            "gf": gf, "ge": ge,
            "injected": corrupt[tid],
            "best_delta": max((r - clean_rel.get((s, a), 0.0)
                               for s, a, r in rep.paths if a == tid),
                              default=None),
        })
    return flagged, missed, len(clean_rel)


# ── receipts ─────────────────────────────────────────────────────────────────
def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    receipts = {
        "mq_path": MQ_PATH,
        "pinned_commit": subprocess.run(
            ["git", "-C", MQ_PATH, "rev-parse", "HEAD"],
            capture_output=True, text=True).stdout.strip(),
        "source_files_sha256": {
            f: sha256_file(os.path.join(MQ_PATH, "quilt", f))
            for f in ("engine.py", "auditor.py", "tape.py")},
        "python": sys.version.split()[0],
    }

    results = [run_graph(n, b) for n, b in GRAPHS.items()]

    # P2c: receipt exact rational gradients verbatim (all nodes, all graphs)
    grads_receipt = []
    for st in results:
        for vid in st["_state"]["node_ids"]:
            g = st["_state"]["twin_grads"][vid]
            grads_receipt.append({
                "graph": st["name"], "node_id": vid,
                "numerator": str(g.numerator), "denominator": str(g.denominator),
                "num_digits": len(str(abs(g.numerator))),
                "den_digits": len(str(g.denominator)),
                "den_is_pow2_or_num_of_dyadic": None,  # filled below
            })
    max_den = max(g["den_digits"] for g in grads_receipt)

    flagged_total, missed_total = [], []
    for st in results:
        fl, ms, n_clean_paths = run_controls(st)
        flagged_total += [(st["name"], f) for f in fl]
        if ms:
            missed_total += [(st["name"], m) for m in ms]
        st["_state"]["n_clean_paths"] = n_clean_paths

    # clone pristine receipt
    git_status = subprocess.run(
        ["git", "-C", MQ_PATH, "status", "--porcelain"],
        capture_output=True, text=True).stdout.strip()
    receipts["clone_git_status_after_runs"] = git_status or "(clean)"

    out = {
        "receipts": receipts,
        "claims_file": {
            "sha256": "a9955586387632baa444385c97d94f7f3aacb003b81ab67917ce331369ac3eda",
            "mtime_epoch": 1790545576,
            "note": "pre-registered BEFORE any run (see verdict.md)",
        },
        "graphs": [{k: v for k, v in st.items() if k != "_state"} for st in results],
        "P1": {
            "threshold_all": 1e-13, "threshold_E1_E2": 1e-14,
            "max_fwd_drift": max(st["fwd_drift_max"] for st in results),
            "max_grad_drift": max(st["grad_drift_max"] for st in results),
            "max_fwd_drift_E1_E2": max(st["fwd_drift_max"] for st in results
                                       if st["name"] in ("E1_dot", "E2_gate")),
            "max_grad_drift_E1_E2": max(st["grad_drift_max"] for st in results
                                        if st["name"] in ("E1_dot", "E2_gate")),
            "pass": (max(st["fwd_drift_max"] for st in results) < 1e-13
                     and max(st["grad_drift_max"] for st in results) < 1e-13
                     and max(st["fwd_drift_max"] for st in results
                             if st["name"] in ("E1_dot", "E2_gate")) < 1e-14
                     and max(st["grad_drift_max"] for st in results
                             if st["name"] in ("E1_dot", "E2_gate")) < 1e-14),
        },
        "P2": {
            "auditor_engine_exact_equal": all(st["auditor_exact_agrees"] for st in results),
            "max_denominator_digits": max_den,
            "bound_digits": 1000,
            "n_gradients_receipted": len(grads_receipt),
            "pass": (all(st["auditor_exact_agrees"] for st in results)
                     and max_den <= 1000 and len(grads_receipt) > 0),
        },
        "P3": {
            "n_injections": len(flagged_total) + len(missed_total),
            "n_flagged": len(flagged_total),
            "n_missed": len(missed_total),
            "missed": missed_total,
            "coverage_finding": {
                st["name"]: st["auditor_seed0"]["covers_all_nodes"] for st in results},
            "pass": len(missed_total) == 0,
        },
        "P4": {
            "tape_verify_all": all(st["tape_verify_ok"] for st in results),
            "replay_bitwise_all": all(st["replay_bitwise_equal"] for st in results),
            "pass": (all(st["tape_verify_ok"] for st in results)
                     and all(st["replay_bitwise_equal"] for st in results)),
        },
    }

    with open(os.path.join(HERE, "results.json"), "w") as f:
        json.dump(out, f, indent=2, default=str)
    with open(os.path.join(HERE, "gradients.json"), "w") as f:
        json.dump({
            "note": "every exact rational gradient (engine grad_twin) verbatim; "
                    "P2c receipt. numerator/denominator are exact integers.",
            "gradients": grads_receipt,
        }, f, indent=2)

    # human summary
    print(f"pinned micrograd-quilt @ {receipts['pinned_commit'][:12]} "
          f"(clone status: {receipts['clone_git_status_after_runs']})")
    for st in results:
        a = st["auditor_seed0"]
        print(f"{st['name']}: nodes={st['n_nodes']} rows={st['n_rows']} "
              f"fwd_drift={st['fwd_drift_max']:.3e} grad_drift={st['grad_drift_max']:.3e} "
              f"exact_xcheck={st['auditor_exact_agrees']} tape_ok={st['tape_verify_ok']} "
              f"replay_bit={st['replay_bitwise_equal']} | audit seed0: sampled={a['n_sampled']} "
              f"paths={a['n_paths']} covers_all_nodes={a['covers_all_nodes']}")
    print(f"P1 pass={out['P1']['pass']}  P2 pass={out['P2']['pass']} "
          f"(max den digits={max_den})  P3 pass={out['P3']['pass']} "
          f"({out['P3']['n_flagged']}/{out['P3']['n_injections']} flagged, "
          f"missed={out['P3']['n_missed']})  P4 pass={out['P4']['pass']}")
    print(f"clone git status: {receipts['clone_git_status_after_runs']}")
    return 0 if all(out[p]["pass"] for p in ("P1", "P2", "P3", "P4")) else 1


if __name__ == "__main__":
    sys.exit(main())
