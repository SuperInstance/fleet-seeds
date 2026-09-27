#!/usr/bin/env python3
"""py_bridge.py — cross-language bridge for the embassy vc-oracle (Task 32-a).

Runs jev-quilt's REAL Python (their HEAD, unmodified) in two modes:

  verify  (stdin: {"pubkeys": {...}, "attestations": [...]})
      Builds their Attestation objects from JS-minted JSON and runs their
      verify_attestation on each. Prints {"verdicts": [...]}. This is the
      "free test oracle" direction of issue #42: their Python judges our
      port's bytes.

  mint N  (stdout: {"pubkeys": {...}, "attestations": [...]})
      Mints N attestations with their REAL byte law (canonical_attestation_bytes
      + attestation_root + seal_bytes) for our JS port to verify. Deterministic
      inputs; TEST-MATERIAL seed (32 zero bytes), matching their pinned vector
      convention.

JEVDATA_DIR env var points at the jev-quilt checkout (default: foreign-refs).
Their repo is NEVER modified.
"""
import json
import os
import sys

REPO = os.environ.get("JEVDATA_DIR", "/home/z/my-project/foreign-refs/jev-quilt")
sys.path.insert(0, REPO)

from jev_quilt.attest import Attestation, WitnessReading, canonical_attestation_bytes, attestation_root  # noqa: E402
from jev_quilt.signed_receipts import seal_bytes, chain_head_hex  # noqa: E402
from jev_quilt.ed25519 import publickey  # noqa: E402

SEED = bytes(32)  # TEST MATERIAL — same zero-seed convention as their pinned vector
SIGNER = "oracle.k0"


def _att_from_json(d):
    readings = tuple(
        WitnessReading(witness=r["witness"], value=r["value"], drifting=bool(r["drifting"]))
        for r in d["readings"]
    )
    return Attestation(
        readings=readings,
        consensus=d["consensus"],
        quorum=int(d["quorum"]),
        earned_floor=d.get("earned_floor"),
        root=d["root"],
        signer=d["signer"],
        signature=d["signature"],
    )


def _att_to_json(att, seed=SEED):
    return {
        "readings": [
            {"witness": r.witness, "value": r.value, "drifting": bool(r.drifting)}
            for r in att.readings
        ],
        "consensus": att.consensus,
        "quorum": att.quorum,
        "earned_floor": att.earned_floor,
        "root": att.root,
        "signer": att.signer,
        "signature": att.signature,
        "chain_head": chain_head_hex(att.root),
    }


def mode_verify():
    data = json.load(sys.stdin)
    pubkeys = {k: bytes.fromhex(v) for k, v in data["pubkeys"].items()}
    verdicts = []
    for d in data["attestations"]:
        att = _att_from_json(d)
        verdict = verify_theirs(att, {k: v.hex() for k, v in pubkeys.items()})
        verdicts.append(verdict)
    print(json.dumps({"verdicts": verdicts}))


def verify_theirs(att, pubkeys_hex):
    """Direct call into their verify_attestation (jev_quilt.attest)."""
    from jev_quilt.attest import verify_attestation
    return verify_attestation(att, pubkeys_hex)


MINTS = [
    {"readings": [{"witness": "py-w0", "value": "42", "drifting": False},
                  {"witness": "py-w1", "value": "42", "drifting": True}],
     "consensus": "42", "quorum": 3, "earned_floor": "7/16"},
    {"readings": [{"witness": "py-a", "value": "holds", "drifting": False},
                  {"witness": "py-b", "value": "holds", "drifting": False},
                  {"witness": "py-c", "value": "drifts", "drifting": True}],
     "consensus": "holds", "quorum": 2, "earned_floor": None},
    {"readings": [{"witness": "py-ünïcode", "value": "λ→π", "drifting": False}],
     "consensus": "λ→π", "quorum": 1, "earned_floor": "1/2"},
]


def mode_mint(n):
    pubkeys = {SIGNER: publickey(SEED).hex()}
    atts = []
    for m in MINTS[: max(1, min(int(n), len(MINTS)))]:
        readings = tuple(
            WitnessReading(witness=r["witness"], value=r["value"], drifting=bool(r["drifting"]))
            for r in m["readings"]
        )
        root = attestation_root(readings, m["consensus"], m["quorum"], m["earned_floor"]).hex()
        _, signature = seal_bytes(
            canonical_attestation_bytes(readings, m["consensus"], m["quorum"], m["earned_floor"]),
            chain_tip=root, signer=SIGNER, seed_hex=SEED.hex(),
        )
        atts.append(_att_to_json(Attestation(
            readings=readings, consensus=m["consensus"], quorum=m["quorum"],
            earned_floor=m["earned_floor"], root=root, signer=SIGNER, signature=signature,
        )))
    print(json.dumps({"pubkeys": pubkeys, "attestations": atts}))


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "verify":
        mode_verify()
    elif len(sys.argv) >= 2 and sys.argv[1] == "mint":
        mode_mint(sys.argv[2] if len(sys.argv) > 2 else "3")
    else:
        print("usage: py_bridge.py verify | mint N", file=sys.stderr)
        sys.exit(2)
