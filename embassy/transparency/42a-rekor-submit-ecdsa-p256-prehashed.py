#!/usr/bin/env python3
# 42a-rekor-submit-ecdsa-p256-prehashed.py — lane 42-a rekor-finisher
#
# Config 2 (ONE wire attempt, NO retry — lane law): hashedrekord v0.0.1 of
# embassy/vc-envelope/stone-checkpoint.vc.json on https://rekor.sigstore.dev
# with ECDSA P-256 + sha256, using the SERVER-MANDATED construction.
#
# WHY A NEW CLIENT (source-pinned diagnosis, see rekor-attestation-sha512.md):
#   rekor hashedrekord validate() (entry.go:272) verifies via
#     sigObj.Verify(nil, keyObj, options.WithDigest(decoded), WithCryptoSignerOpts(alg))
#   -> sigstore ECDSAVerifier.VerifySignature (ecdsa.go:180-198):
#     ComputeDigestForVerifying(..., opts) returns the WithDigest bytes AS-IS
#     -> ecdsa.VerifyASN1(pub, digest, sig)
#   i.e. the DER signature must be ECDSA over the RAW 32-byte sha256 ARTIFACT
#   DIGEST (digest = prehash; the classic cosign path).
#   The armed 40a script's --key=ecdsa mode signs SHA256(digest) (double hash,
#   node createSign('sha256').update(digest)) — source-proven to fail the same
#   VerifyASN1 with "invalid signature", so the single attempt for this config
#   is spent on the correct construction instead (documented AS DECIDED).
#
# Key law: ephemeral P-256 key generated in-process, never persisted/printed;
# only public SPKI PEM + sha256 fingerprints are receipted. Zero LLM spend.
import base64
import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils as asym_utils  # asym_utils.Prehashed + decode_dss_signature

REKOR = "https://rekor.sigstore.dev"
HERE = Path(__file__).resolve().parent
VC = HERE.parent / "vc-envelope" / "stone-checkpoint.vc.json"
RECEIPT_PATH = HERE / "rekor-submit-result-42a-ecdsa.json"

# P-256 (secp256r1) domain parameters — first-principles verification only
P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
A = P - 3
B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
GX = 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296
GY = 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5
N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def ec_add(p1, p2):
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % P == 0:
        return None
    if p1 == p2:
        lam = (3 * x1 * x1 + A) * pow(2 * y1, -1, P) % P
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    y3 = (lam * (x1 - x3) - y1) % P
    return (x3, y3)


def ec_mul(k, point):
    result, addend = None, point
    while k:
        if k & 1:
            result = ec_add(result, addend)
        addend = ec_add(addend, addend)
        k >>= 1
    return result


def first_principles_ecdsa_verify(pub_point, digest32, r, s):
    """RFC 6979-style ECDSA verification on P-256 from raw point math."""
    if not (1 <= r < N and 1 <= s < N):
        return False, "r/s out of range"
    e = int.from_bytes(digest32, "big")
    w = pow(s, -1, N)
    u1 = (e * w) % N
    u2 = (r * w) % N
    point = ec_add(ec_mul(u1, (GX, GY)), ec_mul(u2, pub_point))
    if point is None:
        return False, "R is point at infinity"
    ok = (point[0] % N) == r
    return ok, f"R.x mod n = {point[0] % N:064x}"


def main():
    receipt = {
        "schema": "fleet-seeds/rekor-submit-ledger/1.0",
        "lane": "42-a rekor-finisher",
        "config": "ecdsa-p256+sha256 (server-mandated prehash-over-digest construction)",
        "started_at": now(),
        "wire_attempt_budget": "ONE POST /api/v1/log/entries, NO retry (mission: one attempt, 2 configs total)",
    }
    artifact = VC.read_bytes()
    digest = hashlib.sha256(artifact).digest()
    receipt["artifact"] = {
        "path": "embassy/vc-envelope/stone-checkpoint.vc.json",
        "bytes": len(artifact),
        "sha256": digest.hex(),
    }
    assert digest.hex() == "94aa82cdde3a717dc9aa68729d9ef96a398daa39d2d83204edea26f5ba75b1e5", "artifact digest drift"

    # ephemeral key — never persisted, never printed (public material only below)
    priv = ec.generate_private_key(ec.SECP256R1())
    pub_pem = priv.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    receipt["ephemeral_public_key_pem"] = pub_pem.decode()
    receipt["ephemeral_public_key_sha256"] = hashlib.sha256(pub_pem).hexdigest()

    # SERVER CONTRACT: sig = ECDSA-P256/DER over the RAW 32-byte artifact digest
    prehashed = asym_utils.Prehashed(hashes.SHA256())
    sig = priv.sign(digest, ec.ECDSA(prehashed))

    # local self-verify #1 — independent library path
    try:
        priv.public_key().verify(sig, digest, ec.ECDSA(prehashed))
        v1 = True
    except InvalidSignature:
        v1 = False
    receipt["local_selfverify_library"] = v1

    # local self-verify #2 — first principles: DER parse -> (r,s) -> raw P-256 math
    r, s = asym_utils.decode_dss_signature(sig)
    pn = priv.public_key().public_numbers()
    pub_point = (pn.x, pn.y)
    ok2, detail = first_principles_ecdsa_verify(pub_point, digest, r, s)
    receipt["local_selfverify_first_principles"] = {"ok": ok2, "detail": detail, "r": f"{r:064x}", "s": f"{s:064x}"}

    if not (v1 and ok2):
        receipt["final"] = "ABORTED_LOCAL_SELFVERIFY_FAILED"
        receipt["finished_at"] = now()
        RECEIPT_PATH.write_text(json.dumps(receipt, indent=2))
        print(json.dumps(receipt, indent=2))
        sys.exit(3)

    proposed_entry = {
        "apiVersion": "0.0.1",
        "kind": "hashedrekord",
        "spec": {
            "data": {"hash": {"algorithm": "sha256", "value": digest.hex()}},
            "signature": {
                "content": base64.b64encode(sig).decode(),
                "publicKey": {"content": base64.b64encode(pub_pem).decode()},
            },
        },
    }
    receipt["signature_construction"] = (
        "ECDSA-P256 DER over the RAW 32-byte sha256 artifact digest "
        "(cryptography Prehashed(SHA256); = Go ecdsa.SignASN1(priv, digest); "
        "server: sigstore ecdsa.go VerifyASN1(pub, WithDigest-bytes, sig))"
    )
    body = json.dumps(proposed_entry).encode()
    receipt["proposed_entry_bytes"] = len(body)

    req = urllib.request.Request(
        f"{REKOR}/api/v1/log/entries",
        data=body,
        headers={"content-type": "application/json", "accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            status, text = res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode()

    receipt["wire_attempts"] = [{"n": 1, "method": "POST /api/v1/log/entries", "status": status, "response_body": text[:2000]}]

    if status != 201:
        receipt["final"] = "REJECTED_AFTER_1_ATTEMPT (config law: one ecdsa attempt)"
        receipt["finished_at"] = now()
        RECEIPT_PATH.write_text(json.dumps(receipt, indent=2))
        print(json.dumps(receipt, indent=2)[:3000])
        sys.exit(2)

    entry_obj = json.loads(text)
    uuid, entry = next(iter(entry_obj.items()))
    receipt["entry_uuid"] = uuid
    receipt["integrated_time"] = entry.get("integratedTime")
    receipt["log_id"] = entry.get("logID")
    receipt["log_index"] = entry.get("logIndex")

    # RFC 9162 §2.1.3.2 inclusion-proof fold from first principles
    ip = entry.get("verification", {}).get("inclusionProof")
    incl = {"ok": False, "reason": "no inclusionProof in response"}
    if ip:
        leaf_value = base64.b64decode(entry["body"])
        leaf_hash = hashlib.sha256(b"\x00" + leaf_value).digest()
        lo, hi, h, i = ip["logIndex"], ip["treeSize"] - 1, leaf_hash, 0
        path = [bytes.fromhex(x) for x in ip["hashes"]]
        while hi > 0:
            if i >= len(path):
                incl = {"ok": False, "reason": "path exhausted early"}
                break
            p = path[i]
            i += 1
            if lo % 2 == 1 or lo == hi:
                h = hashlib.sha256(b"\x01" + p + h).digest()
            elif hi % 2 == 0:
                h = hashlib.sha256(b"\x01" + h + p).digest()
            else:
                incl = {"ok": False, "reason": f"unexpected tree state lo={lo} hi={hi}"}
                break
            lo >>= 1
            hi >>= 1
        else:
            incl = {
                "ok": i == len(path) and h == bytes.fromhex(ip["rootHash"]),
                "computed_root": h.hex(),
                "stated_root_hash": ip["rootHash"],
                "consumed": i,
                "path_len": len(path),
                "leaf_hash": leaf_hash.hex(),
                "tree_size": ip["treeSize"],
                "log_index": ip["logIndex"],
            }
    receipt["inclusion_selfverify"] = incl

    body_json = json.loads(base64.b64decode(entry["body"]))
    receipt["body_kind"] = body_json.get("kind")
    receipt["body_digest_matches"] = (
        body_json.get("spec", {}).get("data", {}).get("hash", {}).get("value") == digest.hex()
    )
    receipt["body_sig_matches"] = base64.b64decode(body_json["spec"]["signature"]["content"]) == sig
    receipt["final"] = (
        "SEALED_OK" if incl.get("ok") and receipt["body_digest_matches"] else "SUBMITTED_INCLUSION_UNVERIFIED"
    )
    receipt["permanent_url"] = f"{REKOR}/api/v1/log/entries/{uuid}"
    receipt["finished_at"] = now()
    RECEIPT_PATH.write_text(json.dumps(receipt, indent=2))
    print(
        json.dumps(
            {
                "status": status,
                "uuid": uuid,
                "integratedTime": receipt["integrated_time"],
                "inclusion_selfverify": receipt["inclusion_selfverify"],
                "body_digest_matches": receipt["body_digest_matches"],
                "body_sig_matches": receipt["body_sig_matches"],
                "final": receipt["final"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
