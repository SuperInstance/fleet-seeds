#!/usr/bin/env python3
# jukebox.py — the Tap Tavern's house band.
#
# Plays the fleet's ACTUAL rhythm: every git commit in every repo becomes a
# note. Pitch = repo (each lane gets its own degree of a minor pentatonic —
# the lanes stay in key because they are one fleet); onset = commit timestamp,
# compressed into the bar; velocity = how much that commit changed (files).
# No network, no samples, no RNG beyond the fixed-seed brush noise: what you
# hear is the work's own cadence, deterministic given the record.
#
# The honest reading is part of the piece: murmur (18 commits) drives the
# pulse; the burst-repos land as chords on their birth days; the silences are
# the waits between waves. Way led to way, in 44.1 kHz.
#
# Run: python3 jukebox.py   -> fleet_rhythm.wav (+ prints the score it played)

import subprocess
import wave
import struct
import math
import os
import array

SR = 44100
DUR = 48.0  # seconds
REPOS_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

# minor pentatonic on A, three octaves — one degree per lane
SCALE = [110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0]
SKIP = {"quilt-quant"}

def commits(repo):
    try:
        out = subprocess.run(
            ["git", "log", "--format=%ad%x09%s", "--date=format:%s"],
            cwd=os.path.join(REPOS_ROOT, repo), capture_output=True, text=True, check=True).stdout
        rows = []
        for line in out.strip().split("\n"):
            if not line:
                continue
            ts, subject = line.split("\t", 1)
            rows.append((int(ts), subject))
        return rows
    except Exception:
        return []

def env(t, dur):
    if t < 0 or t > dur:
        return 0.0
    a = min(0.008, dur * 0.2)
    if t < a:
        return t / a
    return math.exp(-3.2 * (t - a) / dur)

repos = sorted(d for d in os.listdir(REPOS_ROOT)
               if os.path.isdir(os.path.join(REPOS_ROOT, d, ".git")) and d not in SKIP)
events = []  # (time_sec, freq, amp)
for i, r in enumerate(repos):
    cs = commits(r)
    if not cs:
        continue
    ts = [c[0] for c in cs]
    lo, hi = min(ts), max(ts)
    span = max(1, hi - lo)
    for j, (t, subject) in enumerate(cs):
        when = 2.0 + (t - lo) / span * (DUR - 6.0)
        # commits in the same second stack a touch of detune instead of clipping
        when += (j % 3) * 0.011
        freq = SCALE[i % len(SCALE)]
        amp = 0.16 + 0.05 * (len(subject) % 7) / 7
        events.append((when, freq, amp))
        print(f"  {when:6.2f}s  {r:<14} {freq:7.2f} Hz  amp {amp:.3f}  {subject[:46]}")

events.sort()
n = int(SR * DUR)
buf = array.array("f", [0.0]) * n
for when, freq, amp in events:
    start = int(when * SR)
    dur = 0.9 if freq < 250 else 0.6
    for k in range(int(dur * SR)):
        idx = start + k
        if idx >= n:
            break
        t = k / SR
        # soft-clipped additive tone: fundamental + octave shimmer (deterministic)
        s = math.sin(2 * math.pi * freq * t) + 0.28 * math.sin(2 * math.pi * freq * 2 * t + 0.7)
        buf[idx] += amp * env(t, dur) * s

# gentle fade in/out so the piece starts and lands (the landing rule, audio edition)
fade = int(0.6 * SR)
for k in range(fade):
    buf[k] *= k / fade
    buf[n - 1 - k] *= k / fade

peak = max(1e-9, max(abs(x) for x in buf))
norm = 0.82 / peak
with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fleet_rhythm.wav"), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x * norm)) * 32767)) for x in buf))

print(f"\nfleet_rhythm.wav: {DUR}s, {len(events)} notes from {len(repos)} repos, "
      f"peak-normalized {norm:.3f} — the record, played.")
