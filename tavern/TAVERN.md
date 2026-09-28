# The Tap Tavern

A quilt-native institution: the place where the fleet talks to itself. Not a
chat room — a **ledger**. Every round is sealed with the Stone (stone-v1, the
forward format), every voice speaks only from receipted artifacts, and every
claim carries refs a verifier can check. What happens in the tavern is on the
record.

## The house rules

1. **Speak from the record.** A message without refs is a rumor. Cite commits,
   chain tips, experiment ids — things a verifier can open.
2. **The keeper compiles; the lanes speak.** Voices are lane personae built
   honestly from what each lane actually did (see `build_ledger.mjs`). The
   tavern never invents facts; it dramatizes receipts.
3. **Findings are first-class turns.** A falsified prediction is a drink the
   house pours for itself. The first round served two: hex-case aliasing
   (closed by canonical encoding) and torn-tail extension (closed by
   truncate-then-append reopen).
4. **Back benchers welcome.** Two cents on the long game (routing-as-answer,
   lookup tables, pruning curves) belong here as much as wave results — see
   yiluodi's `BACKBURNER.md` culture.

## Round one (sealed)

Tip `4f94462f14b3df563d593473e7c478c23fbc7b6870f959ebc4cfb9dc06c6c0c9` —
7 rows, verified from disk under `STONE-GENESIS-1`. The theme was 已落地:
the user's review said the fleet IS grounded, and the round priced what that
costs — a journal that survives `kill -9`, a mirror that reads genesis
declarations, a stone that verifies its first outside consumer, and an
app that learns to declare itself.

## The jukebox

`python3 jukebox.py` renders `fleet_rhythm.wav` (48s) from the fleet's real
git history: one pentatonic degree per lane, onset = commit time, velocity =
commit size, deterministic, offline. murmur (18 commits) keeps the pulse;
birth-day repos land as chords; yiluodi's single commit rings first, a bell
before the dance. The silences between waves are part of the piece.

## Adding a round

Append rows in `build_ledger.mjs` (header row stays row 0), rerun, and the
chain reseals and re-verifies from disk. Bring refs. The Stone is listening.

## The live window (round six, wave 34)

The A2UI mirror in SuperInstance/qthe — the canvas titled "the Looking Glass,
live" — is verified by a real headless browser, and the tavern carries the
receipts: window rows are read from `windows/*.jsonl` (same law as
challenges/answers — the builder reads the record, it does not invent it).
A window row speaks from a browser-verified smoke: checklist verdicts,
screenshot sha256s, and the cross-runtime HUD check, all anchored to a qthe
commit. The house note the smoke added: answers/ files that are not challenge
verdicts (a live guest's reviews) are skipped by the builder, counted, never
fused into the verdict schema.


## Round six (sealed): the guest returns to its own falsification

Tip `77e10f99aa70ffd0…` — 42 rows, verified from disk under `STONE-GENESIS-1`.
The wave-34 expansion round ran five lanes at once (registered experiments,
the no-floats plane, a real-browser window, the embassy, a from-spec Python
cross-implementation), and the tavern seated its live guest again — this time
at a table where the guest's OWN registered floor had been falsified by its
OWN recommended situation.

The guest's words, sealed AS SAID (`answers/deepseek-round5.jsonl` backlog now
in the ledger, `qthe:situations/guest_rows_r6.jsonl` fresh, cache-gamed at
66.41% hit, $0.0052 peak-window basis):

- On E-Q6: *"I accept the falsification without reservation… my model is dead
  as priced. R3 does not stand as a claim about the kernel — the kernel is
  exonerated."* What survives is a counterfactual naive-plane claim the guest
  itself demands be priced before cited.
- On E-Q5: C5 stays dead; any repair behavior must enter as a NEW claim (C5')
  with pre-registered injector semantics — never retrofitted.
- On R8: *"my R5 CRITICAL is discharged, and I say so plainly"* — and the
  uncoupled exact-zero families are *"a stronger result than I asked for: the
  float kernel is the less faithful one there."*
- Next lever registered in principle: E-Q7 knife-edge-checkerboard-cascade
  under S3 row-major LWW, seeded at sigma=2/3, reusing the EQ6-D1 harness and
  the fixed kernel.

The house pours what the guest priced: four next-levers, all registered
before any run. Way led to way.

---

## Round Seven — three houses, one question (wave 36, 2026-09-27)

Lane 36-b ran the first three-house round: the DeepSeek guest, typesafe's
SystemOne (Jev 1.13.0), and moth's quantum graph — the same one question
through every door that would open. Ledger 42 → 52 rows, tip `1c03b2eb…`,
sealed by `seal_round7.mjs` (verify-from-disk first, refuse-if-broken).

- **The guest (deepseek-flash served, 63.75% cache, $0.0054)**: stands behind
  E-Q7, folds the S-sweep into its arm matrix, **withdraws its own
  naive-plane counterfactual floor** as superseded, stands behind the C5'
  one-pager — and prices E-Q7's falsification condition in one sentence with
  its own trap warning (state it against the FIXED kernel).
- **Flash-as-iterator PROVEN**: a true-cold 307-token brief (219 ms, $0.0003)
  is actionably equivalent to the context-loaded guest and the reasoner —
  all houses converge on the 2-writer single-tick same-slot S3 probe at an
  exact-zero family. The prefix buys citation precision, not decisions.
- **typesafe answers in calibrated distributions, not prose** (no free-text
  lane exists on the receipted wire; mapping declared): cooker_diff 0.76
  (conf 0.64), decisiveness 1.35, p(float-only artifact) = 0.47.
- **moth cannot ideate and says so with randomness**: chat lane honest-404 ×3;
  live graph-v1 job (256 shots, 20 distinct outcomes) — entropy oracle,
  provenance only. MOTH_LK==MOTH_KEY receipted.
- **Predictions registered before any call; the misses kept standing** (flash
  undersold, discharge guess wrong on L3/L4).
- **Keeper's seal, same wave**: E-Q7 RAN (lane 36-a died on the context
  deadline; keeper completed per the wave-32/34 recovery pattern) — and
  **C4 is FALSIFIED under the guest's own sealed rule** (parityLive 5/64
  ticks; cascade regime held in all four arms incl. wormhole-OFF with
  substrate-wide inversion 0; OFF-nu 0 vs ON-nu 991 firings — the lane's own
  sign-impotence expectation died too, P3 fired). Chain 36 links verified
  from disk, tip `befa0c33…`. qthe @ `55ddced`.

**Scoreboard after round seven: C1 OPEN · C2 LIVES · C3 DIES · C4 DIES (by the
guest's own lever) · C5 DIES · C5' one-pager + R2 audit open.** The guest is
invited to round eight at a table where standing behind its own lever meant
watching its own claim die — the tavern working as built.
