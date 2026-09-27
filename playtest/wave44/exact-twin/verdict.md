# verdict — 44-b exact-twin audit (micrograd-quilt adoption)

**VERDICT: PASS 4/4 claims (P1 P2 P3 P4), zero honest FAILs, one structural finding receipted.**
Pre-registered claims: `claims.json` (sha256 `a9955586387632baa444385c97d94f7f3aacb003b81ab67917ce331369ac3eda`, mtime epoch 1790545576) — registered BEFORE any run; all result mtimes later.

## Instrument adopted

SuperInstance/micrograd-quilt — float-first scalar autograd with exact rational twins
(`fractions.Fraction`) and a stochastic rational auditor. Pinned clone:
commit `82c295f1555062d80d7ff087aeb83667675062a3` (branch master), imported via
`sys.path` (documented in claims.json); **their files UNMODIFIED** —
`sys.dont_write_bytecode` set before import, and the clone's
`git status --porcelain` receipted **(clean)** after all runs.

Source-file sha256 receipts (pinned clone):
- `quilt/engine.py`  `2e6daa969949034f78bb081910ed1a5a3bfb267184cae65a9b2a1a6bc854689c`
- `quilt/auditor.py` `ec024c5293910126ad7050f9474ddb986608c880bed86854dc647ae28104ba42`
- `quilt/tape.py`    `4441ecb72bbdb5646c3117819fa60c2c80f96bcd007ea13b47c0a2449b0ee5c8`

## Registered expressions (embedding-style math)

| id | expression | nodes (Values) | tape rows |
|----|------------|----------------|-----------|
| E1_dot | 8-dim dot product `s = Σ q_i·k_i` (attention-score style, mixed signs) | 31 | 107 |
| E2_gate | tanh gate `h = tanh(Σ_{i<4} q_i·k_i)·v` (GLU-style) | 18 | 62 |
| E3_norm | RMS-style normalization `out = (Σ x_i²)^(-1)·x_0` via exact integer-power reciprocal | 25 | 100 |

## Claims vs results (full numbers in results.json)

- **P1 — drift bounded: PASS.** Max float-vs-exact relative error across every
  node's forward value AND gradient on all three graphs:
  forward ≤ **3.17e-16**, gradients ≤ **2.03e-16** — far inside the registered
  1e-13 (all) / 1e-14 (E1∧E2) bounds. The a-priori rounding derivation held
  with ~300x margin.
- **P2 — exactness real + consistent: PASS.** Engine exact-mode backward
  (`Value.grad_twin`) and `auditor.exact_grads` over the float tape rows agree
  **EXACTLY** (Fraction equality) on all 74 audited nodes. Max exact-gradient
  denominator: **67 decimal digits** (registered bound: 1000, honest margin
  ~15x). All 74 exact rational gradients receipted verbatim in
  `gradients.json`; sample (E2_gate node 0, grad w.r.t. q_0):
  numerator 65 digits / denominator 66 digits
  `23222982857884800650498759049313057649227531943498094255016916415 / 105312291668557186697918027683670432318895095400549111254310977536`.
  Sink values: E1 float `-0.7013999999999998` vs exact
  `-455234627072041008000749863984903/649037107316853453566312041152512`;
  E2 float `-0.07281549169741436` vs exact
  `-23629978049572090893122528346913/324518553658426726783156020576256`;
  E3 float `0.2716407098877218` vs exact
  `389422264390112057728268417105920/1433593162641465945764865011450539`.
- **P3 — negative control: PASS 74/74.** A 1-ulp gradient corruption
  (`math.nextafter` AWAY from the exact value) injected at EVERY auditable
  node of all three graphs was **flagged in 74/74 cases** by
  `audit(rows, corrupted, mode="stochastic", seed=0)` (criterion: some path
  anchored at the target with rel_corrupted − rel_clean ≥ 2e-17; same seed →
  identical path set, so non-target paths have delta exactly 0). Zero misses.
- **P4 — determinism receipts: PASS.** After a taped float backward,
  `Tape.verify()` = ok on all three graphs, and `tape.replay(rows, root)`
  reproduces the live float gradients **bitwise** on every node of all three
  graphs (design law 2 holds on our graphs).

## Structural finding (registered IN ADVANCE as P3's derivation, confirmed)

The stochastic auditor's `1/sqrt(N)` sampling does **not** govern coverage:
every sink is always promoted, `ancestors()` walks all parents of each sampled
node, and every node feeds some sink — so the audited path set covers **every
node's gradient at any seed** (measured at seed 0: `covers_all_nodes=true` on
all three graphs, e.g. E1: sampled=2 nodes already yielding 34 paths over all
31 nodes). The sqrt(N) economy therefore governs path *multiplicity/reporting*
(and the cost story — `exact_grads` is computed unconditionally anyway), not
detection. This makes the negative control STRONGER than requested: detection
is structural, not stochastic. Honest caveat for adopters: on graphs where a
subgraph feeds NO always-sampled sink (impossible by the auditor's own sink
definition) or if `ancestors()` is ever truncated, this guarantee lapses.

## Reproduce

```
git clone https://github.com/SuperInstance/micrograd-quilt pt44b-eq   # pin 82c295f15550
MQT_EQ_PATH=$PWD/pt44b-eq python3 audit.py $PWD/pt44b-eq              # stdlib-only
```

Exit 0 iff all four claims pass. Full machine receipts: `results.json`,
`gradients.json`.
