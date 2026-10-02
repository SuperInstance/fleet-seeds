#!/usr/bin/env python3
# m13-procs.py — wave 68-f — executor-C (python3) port of the M13 re-seal
# procedures. Language-portable members of tools/m13-procs.mjs ONLY:
# battery-eval and qrng-pick. The unsealed positive control (wallclock-leak)
# is deliberately NOT ported — see the module header there.
#
# PORTABILITY LAW (mirrors m13-procs.mjs exactly):
#   * uint32 domain: (1664525 * x + 1013904223) % 4294967296
#   * FNV-1a-32 over ASCII bytes
#   * canonical JSON = fleet dialect (recursive key-sort, no whitespace,
#     raw non-ASCII, JSON.stringify string escapes) — NEVER json.dumps
#     defaults (ensure_ascii=True is the documented 67-a canonical-law break).
# Emits are integers/booleans/ASCII strings only, so the two languages are
# bit-exact. stdout carries canonicalJSON(emit) + '\n' — nothing else.
#
# ZERO NETWORK. stdlib only.

import json
import sys

LCG_A = 1664525
LCG_C = 1013904223
MASK = 0xFFFFFFFF


def lcg_next(x):
    return (LCG_A * x + LCG_C) & MASK


def fnv1a32(s):
    h = 0x811C9DC5
    for b in s.encode('ascii'):
        h = (h ^ b) & MASK
        h = (h * 0x01000193) & MASK
    return h


def battery_eval(prefix):
    constants = prefix['constants']
    prior_state = prefix['priorState']
    x = prefix['seed'] & MASK
    acc = prior_state['acc'] & MASK
    steps = constants['steps']
    trace = []
    for i in range(1, steps + 1):
        x = lcg_next(x)
        acc = ((acc ^ x) + constants['w1'] * i + constants['w2']) & MASK
        if i == 1 or i == steps // 2 or i == steps:
            trace.append(acc)
    score = acc % 1000
    verdict = 'accept' if score >= constants['threshold'] else 'reject'
    return {
        'id': 'battery-eval',
        'class': 'sealed',
        'score': score,
        'verdict': verdict,
        'steps': steps,
        'finalX': x,
        'acc': acc,
        'trace': trace,
    }


def qrng_pick(prefix):
    constants = prefix['constants']
    x = prefix['seed'] & MASK
    draws = []
    for _ in range(8):
        x = lcg_next(x)
        draws.append(x % 100)
    c = constants['candidates']
    scores = [draws[k * 2] + draws[k * 2 + 1] for k in range(c)]
    pick = 0
    for k in range(1, c):
        if scores[k] > scores[pick]:
            pick = k  # tie-break: lowest index
    override = pick != constants['priorsPick']
    return {
        'id': 'qrng-pick',
        'class': 'sealed',
        'draws': draws,
        'scores': scores,
        'pick': pick,
        'priorsPick': constants['priorsPick'],
        'override': override,
        'verdict': 'override' if override else 'uphold',
        'drawFnv': fnv1a32(','.join(str(d) for d in draws)),
    }


def run_procedure(proc_id, prefix):
    if proc_id == 'battery-eval':
        return battery_eval(prefix)
    if proc_id == 'qrng-pick':
        return qrng_pick(prefix)
    raise SystemExit('E_UNKNOWN_PROC: %r not portable to executor-C' % (proc_id,))


# ── canonical JSON: the fleet dialect, mirrored byte-exactly ───────────────
# Mirror of preregister.mjs canonicalJSON for the emit value domain
# (null / bool / int / str / list / dict, strings raw-non-ASCII).
def canon(v):
    if v is None:
        return 'null'
    if v is True:
        return 'true'
    if v is False:
        return 'false'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list):
        return '[' + ','.join(canon(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ','.join(
            json.dumps(k, ensure_ascii=False) + ':' + canon(v[k])
            for k in sorted(v.keys())
        ) + '}'
    raise SystemExit('E_EMIT_NOT_PORTABLE: %r' % (type(v),))


def selftest():
    # KATs receipted beside the JS side (same vectors, same dialect):
    checks = {
        "fnv1a32('')": fnv1a32(''),
        "fnv1a32('a')": fnv1a32('a'),
        "lcg(1)": lcg_next(1),
        "canon(doc)": canon({'b': [1, True, None, 'x"y'], 'a': 2, 'z': {'k': False}}),
    }
    sys.stdout.write(json.dumps(checks, sort_keys=True) + '\n')


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == '--selftest':
        selftest()
        return
    if len(sys.argv) < 2:
        sys.stderr.write('usage: m13-procs.py <proc-id>  (prefix JSON on stdin)\n')
        raise SystemExit(2)
    proc_id = sys.argv[1]
    prefix = json.load(sys.stdin)
    emit = run_procedure(proc_id, prefix)
    sys.stdout.buffer.write((canon(emit) + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()


if __name__ == '__main__':
    main()
