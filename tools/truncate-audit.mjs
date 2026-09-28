#!/usr/bin/env node
// truncate-audit.mjs — 45-d concept-adopter — POWER-YANK ADOPTION (wave 44-c).
//
// PROVENANCE: ports the test PATTERN of quilt-rust's
// packages/core/tests/journal_power_yank.rs ("power_yank_truncation_matrix":
// a journal torn at EVERY byte offset must never produce a silent wrong
// state — replay either lands clean on the last complete frame or reports
// the tear honestly) to the fleet verifier's chains. Like 43-c's
// verify-fleet.mjs, this module shares NO code with quilt-rust; only the
// law is adopted. Concepts source: playtest/wave44/concepts-44c.md §6.
//
// THE LAW (this audit):
//   For every chain verify-fleet.mjs knows — qthe E-Q6 stone-v1 (JSONL),
//   pong birth-seal (JSON), the rekor ECDSA entry, the VC envelope — the
//   byte stream is truncated at EVERY offset 0..len-1 and the verifier must
//   FAIL CLOSED on every one of them. Truncated input must never produce
//   exit 0. A prefix may verify as a valid shorter chain ONLY if the
//   verifier explicitly reports the mismatch vs the pinned expected tip
//   (honest semantics — exit is still non-zero).
//
// TWO layers, disclosed (the audit runs BOTH):
//   L1 DEPLOYED PATH — the real pinned verifiers with the repo's UNTOUCHED
//      pins (fixture-sha256 gate first, then chain, tip, links). Law:
//      every offset < len -> ok:false. This is the shipped "never exit 0
//      on truncated input" guarantee.
//   L2 CHAIN-SEMANTICS LAYER — the sha gate is neutralized (pin updated to
//      the truncated bytes for pin-taking verifiers; a direct
//      parse+content-compare for the VC reader, whose pins are internal),
//      so the trivially-all-failing sha gate cannot mask what the CHAIN
//      layer alone would do. Law: ok:true at offset < len is acceptable
//      ONLY when the truncated content is byte-loss-without-semantic-change
//      (parsed content deep-equals the full chain's content — in practice
//      exactly the final trailing-newline byte of each committed fixture).
//      Any ok:true with different content = SILENT WRONG STATE -> FAIL.
//      (quilt-rust's question, asked directly of our chain layer.)
//      Signed-document semantics note: the VC envelope's integrity anchor
//      IS its exact bytes (artifact sha), so for VC the L2 content-identical
//      class is receipted as "would verify under an updated document pin —
//      correct per signed-document semantics, not exercised by the deployed
//      reader".
//
// FIELD-EDGE DELTA PROPERTY (44-c's second adoption, field-edge-bridge):
// "the ledger's imbalance and the field's edge are two projections of one
// directed edge Δ = after − before." A hand-built toy stone chain carries
// transfer/mint rows with per-row before/after balances; the audit asserts
//   imbalance (Σ credits − Σ debits from the row's own seal)
//     ≡ field edge Δ (Σ accounts after − Σ accounts before)
// exactly over integers and to 1e-12 over floats — checked per row and
// globally — and the toy chain itself goes through the exhaustive
// truncation matrix (its serialization joins rows with '\n' and carries NO
// trailing newline, so EVERY truncation is content-changing: the toy's
// per-layer fail counts must equal len exactly).
//
// ANNOTATION-TAIL PROBE (stone-v2 semantics): annotation rows never
// advance the tip, so a prefix that drops a TRAILING annotation keeps the
// tip and is caught ONLY by the links pin. The probe receipts that the
// links pin is load-bearing for our pins.
//
// Zero dependencies, node:crypto only. Keys: none. Offline only (fixtures).
//
// Usage:
//   node tools/truncate-audit.mjs               # full exhaustive audit
//   node tools/truncate-audit.mjs --chains=qthe,pong   # subset
//   node tools/truncate-audit.mjs --json        # JSON only
//   node tools/truncate-audit.mjs --out=<file>  # also write the JSON verdict
//
// Exit 0 iff the audit passes (L1 fails closed everywhere, L2 zero silent
// wrong states, controls verify, delta property holds).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PINS, verifyStoneChainPinned, verifyRekorEcdsa, verifyVcEnvelope } from './verify-fleet.mjs';
import { verifyStoneChain, verifyStoneJsonl, rowHash, canonicalJSON, isAnnotation } from './lib/stone-v1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');

// ═══════════════════════════════════════════════════════════════════════════
// Toy chain builders (values-carrying stone chains for the delta property)
// ═══════════════════════════════════════════════════════════════════════════

// A toy ledger: header + value rows (transfers + one mint) + one trailing
// stone.sign annotation. Each value row carries the row's own seal
// (debits/credits) AND the observed field state (per-account before/after).
// The identity under audit: Σ credits − Σ debits ≡ Σ (after − before).
export function buildToyChain({ floats = false } = {}) {
  const state = floats ? { A: 1.0, B: 0.3 } : { A: 100, B: 40 };
  const ops = floats
    ? [
        { kind: 'toy.transfer', from: 'A', to: 'B', amount: 0.1 },
        { kind: 'toy.transfer', from: 'B', to: 'A', amount: 0.07 },
        { kind: 'toy.mint', to: 'B', amount: 0.05 },
        { kind: 'toy.transfer', from: 'A', to: 'B', amount: 0.21 },
      ]
    : [
        { kind: 'toy.transfer', from: 'A', to: 'B', amount: 30 },
        { kind: 'toy.transfer', from: 'B', to: 'A', amount: 5 },
        { kind: 'toy.mint', to: 'B', amount: 12 },
        { kind: 'toy.transfer', from: 'A', to: 'B', amount: 50 },
        { kind: 'toy.transfer', from: 'A', to: 'B', amount: 8 },
      ];
  const rows = [{
    kind: 'stone.header', alg: 'stone-v1', genesis: 'STONE-GENESIS-1',
    repo: 'SuperInstance/fleet-seeds', lane: '45-d concept-adopter',
    experiment: '45D-POWER-YANK', variant: floats ? 'float' : 'int',
    claim: 'toy ledger: imbalance ≡ field edge Δ = after − before (field-edge-bridge adoption, 44-c)',
  }];
  rows[0].row_hash = rowHash(rows[0], 'STONE-GENESIS-1');
  let prev = rows[0].row_hash; // running tip: header is a body row
  for (const [i, op] of ops.entries()) {
    const before = { ...state };
    const seal = { debits: {}, credits: {} };
    if (op.kind === 'toy.transfer') {
      state[op.from] -= op.amount;
      state[op.to] += op.amount;
      seal.debits[op.from] = op.amount;
      seal.credits[op.to] = op.amount;
    } else { // toy.mint — credits without a debit: imbalance ≠ 0, identity still holds
      state[op.to] += op.amount;
      seal.credits[op.to] = op.amount;
    }
    const touched = [...new Set([...Object.keys(seal.debits), ...Object.keys(seal.credits)])];
    const row = {
      kind: op.kind, seq: i + 1, ...op, seal,
      ledger: Object.fromEntries(touched.map((k) => [k, { before: before[k], after: state[k] }])),
    };
    row.row_hash = rowHash(row, prev);
    prev = row.row_hash;
    rows.push(row);
  }
  // trailing annotation (stone-v2 semantics: hashed against the tip, never advances it)
  const ann = { kind: 'stone.sign', alg: 'ed25519', note: 'toy audit seal — 45-d', tip: prev };
  ann.row_hash = rowHash(ann, prev);
  rows.push(ann);
  return { rows, state, jsonl: rows.map((r) => JSON.stringify(r)).join('\n') };
}

// edgeDelta(rows) — the field-edge-bridge identity, checked per row and
// globally. imbalance = Σ credits − Σ debits (the row's own seal);
// fieldDelta = Σ accounts (after − before) (the observed edge). The law:
// residual === 0 exactly over integers, ≤ 1e-12 over floats.
export function edgeDelta(rows) {
  const perRow = [];
  let globalImbalance = 0;
  const totals = {};
  for (const r of rows) {
    if (!r || typeof r !== 'object' || isAnnotation(r)) continue;
    if (!r.seal || !r.ledger) continue;
    let imbalance = 0;
    for (const v of Object.values(r.seal.credits ?? {})) imbalance += v;
    for (const v of Object.values(r.seal.debits ?? {})) imbalance -= v;
    let fieldDelta = 0;
    for (const [acct, edge] of Object.entries(r.ledger)) {
      fieldDelta += edge.after - edge.before;
      totals[acct] = (totals[acct] ?? 0) + (edge.after - edge.before);
    }
    perRow.push({ seq: r.seq ?? null, kind: r.kind, imbalance, fieldDelta, residual: Math.abs(imbalance - fieldDelta) });
    globalImbalance += imbalance;
  }
  const globalFieldDelta = Object.values(totals).reduce((a, b) => a + b, 0);
  const maxResidual = Math.max(0, ...perRow.map((r) => r.residual), Math.abs(globalImbalance - globalFieldDelta));
  return { perRow, globalImbalance, globalFieldDelta, maxResidual, rowsWithValue: perRow.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// The truncation matrix
// ═══════════════════════════════════════════════════════════════════════════

const KINDS = {
  qthe: { id: 'qthe_eq6', pin: PINS.qtheEq6, kind: 'stone-jsonl', bytes: () => readFileSync(join(HERE, 'fixtures', PINS.qtheEq6.fixture)) },
  pong: { id: 'pong_birth_seal', pin: PINS.pongBirthSeal, kind: 'stone-json', bytes: () => readFileSync(join(HERE, 'fixtures', PINS.pongBirthSeal.fixture)) },
  rekor: { id: 'rekor_ecdsa', pin: PINS.rekorEcdsa, kind: 'rekor', bytes: () => readFileSync(join(HERE, 'fixtures', PINS.rekorEcdsa.fixture)) },
  vc: { id: 'vc_envelope', pin: PINS.vcEnvelope, kind: 'vc', bytes: () => readFileSync(join(REPO, PINS.vcEnvelope.path)) },
};
export const AUDIT_CHAIN_IDS = Object.keys(KINDS);

function parseChain(kind, text) {
  if (kind === 'stone-jsonl') return verifyStoneJsonl(text);
  if (kind === 'stone-json' || kind === 'rekor' || kind === 'vc') {
    const parsed = JSON.parse(text);
    return kind === 'stone-json' ? verifyStoneChain(parsed) : { docParsed: true, value: parsed };
  }
  throw new Error(`unknown kind ${kind}`);
}

// runVerifier — the REAL tool-level verifier for a chain kind, pointed at
// staged bytes. shaOverride == null → deployed path (L1, untouched pins);
// otherwise the sha pin is updated (L2) for pin-taking verifiers.
// (verifyStoneChainPinned/verifyRekorEcdsa are async — always awaited.)
async function runVerifier(entry, { shaOverride = null, workDir, workRepo }) {
  const pin = shaOverride == null ? entry.pin
    : { ...entry.pin, ...(entry.kind === 'vc' ? { expectArtifactSha256: shaOverride } : { fixtureSha256: shaOverride }) };
  const opts = { mode: 'offline', repo: workRepo, verifier: 'truncate-audit.mjs', fixturesDir: workDir };
  if (entry.kind === 'vc') return verifyVcEnvelope(opts);
  if (entry.kind === 'rekor') return verifyRekorEcdsa(opts, pin);
  return verifyStoneChainPinned(pin, opts);
}

// stageDir — a disposable workspace. The VC artifact slot is always staged
// with the REAL (unmodified) VC bytes: the rekor verifier digests them, and
// the vc entry's own bytes are staged into that same slot per-offset by the
// matrix loop (targetPath). The rekor fixture slot lives in workDir.
function stageDir() {
  const workDir = mkdtempSync(join(tmpdir(), '45d-trunc-'));
  const workRepo = join(workDir, 'repo');
  mkdirSync(join(workRepo, dirname(PINS.vcEnvelope.path)), { recursive: true });
  writeFileSync(join(workRepo, PINS.vcEnvelope.path), readFileSync(join(REPO, PINS.vcEnvelope.path)));
  writeFileSync(join(workRepo, PINS.vcEnvelope.keyPath), readFileSync(join(REPO, PINS.vcEnvelope.keyPath)));
  return { workDir, workRepo };
}

function classifyWhy(v) {
  if (v.ok === true) return 'accepted';
  const why = String(v.why ?? '');
  if (/fixture sha mismatch/.test(why)) return 'sha-gate';
  if (/expected tip/.test(why)) return 'prefix-honest';
  if (/hash mismatch|missing row_hash|annotation hash mismatch|not a stone\.header|empty or not an array|row is not an object|expected 'stone-v1'/.test(why)) return 'chain-break';
  if (/not valid JSON|Unexpected|unexpected|unexpectedly|JSON/.test(why)) return 'parse-break';
  if (/sha moved off the pinned value|reader A or B rejected|KAT/.test(why)) return 'sha-gate';
  return 'other';
}

// contentIdentity — independent deep-compare of truncated vs full parsed
// content. For chains: the row_hash list (row hashes bind all content).
// For documents: canonicalJSON deep-equality.
function contentIdentity(kind, truncText, fullRowHashes, fullDoc) {
  try {
    if (kind === 'stone-jsonl') {
      const rows = truncText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0).map((l) => JSON.parse(l));
      return JSON.stringify(rows.map((r) => r.row_hash)) === JSON.stringify(fullRowHashes);
    }
    if (kind === 'stone-json') {
      return JSON.stringify(JSON.parse(truncText).map((r) => r.row_hash)) === JSON.stringify(fullRowHashes);
    }
    return canonicalJSON(JSON.parse(truncText)) === canonicalJSON(fullDoc);
  } catch {
    return false;
  }
}

// auditChain — the exhaustive matrix for one chain. Every offset < len MUST
// fail at L1; at L2 ok:true is allowed only with deep-equal content.
// `offsets` (optional) restricts the tested offsets (self-tests use a
// hand-picked subset for speed; the CLI always runs the FULL range).
export async function auditChain(entry, { verbose = false, offsets = null } = {}) {
  const bytes = entry.bytes();
  const len = bytes.length;
  const fullText = bytes.toString('utf8');
  let fullDoc = null;
  if (entry.kind === 'rekor' || entry.kind === 'vc') fullDoc = JSON.parse(fullText);
  let fullChain;
  try {
    fullChain = entry.kind === 'stone-jsonl' || entry.kind === 'stone-json' ? parseChain(entry.kind, fullText) : null;
    if (fullChain && fullChain.ok !== true) throw new Error(fullChain.why);
  } catch (e) { throw new Error(`${entry.id}: FULL fixture does not verify (${e.message}) — audit precondition`); }
  const fullRowHashes = (entry.kind === 'stone-jsonl'
    ? fullText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0).map((l) => JSON.parse(l))
    : entry.kind === 'stone-json' ? JSON.parse(fullText) : null)?.map((r) => r.row_hash) ?? null;

  const { workDir, workRepo } = stageDir();
  const targetPath = entry.kind === 'vc'
    ? join(workRepo, PINS.vcEnvelope.path)
    : join(workDir, entry.pin.fixture ?? 'fixture.bin');

  const l1 = { failCount: 0, okOffsets: [], classes: {} };
  const l2 = { failCount: 0, okOffsets: [], contentIdenticalOffsets: [], silentOffsets: [], classes: {} };
  const sample = [];

  try {
    const range = offsets ?? Array.from({ length: len }, (_, i) => i);
    for (const offset of range) {
      if (!(Number.isInteger(offset) && offset >= 0 && offset < len)) throw new Error(`offset ${offset} out of range 0..${len - 1}`);
      const truncated = bytes.subarray(0, offset);
      const truncSha = sha256Hex(truncated);
      const truncText = truncated.toString('utf8');
      writeFileSync(targetPath, truncated);

      // L1 — deployed path, UNTOUCHED pins
      const v1 = await runVerifier(entry, { workDir, workRepo });
      if (v1.ok === true) l1.okOffsets.push(offset);
      else {
        l1.failCount++;
        const c = classifyWhy(v1);
        l1.classes[c] = (l1.classes[c] ?? 0) + 1;
      }

      // L2 — chain-semantics layer (sha gate neutralized)
      let v2;
      if (entry.kind === 'vc') {
        // the deployed VC reader's pins are internal (exact-bytes anchor);
        // L2 asks the DOCUMENT question directly: does the prefix parse,
        // and is its content identical?
        if (contentIdentity('vc', truncText, null, fullDoc)) {
          v2 = { ok: true, l2Note: 'parses + content deep-equals the full document — would verify under an updated document pin; deployed reader pins exact bytes (correct for a signed document)' };
        } else {
          v2 = { ok: false, why: (() => { try { JSON.parse(truncText); return 'parsed but content differs from the full document'; } catch (e) { return `parse error: ${e.message}`; } })() };
        }
      } else {
        v2 = await runVerifier(entry, { shaOverride: truncSha, workDir, workRepo });
      }
      if (v2.ok === true) {
        const identical = contentIdentity(entry.kind, truncText, fullRowHashes, fullDoc);
        if (identical) {
          l2.contentIdenticalOffsets.push(offset);
          l2.classes['content-identical'] = (l2.classes['content-identical'] ?? 0) + 1;
        } else {
          l2.silentOffsets.push(offset); // SILENT WRONG STATE
          l2.classes['SILENT-WRONG-STATE'] = (l2.classes['SILENT-WRONG-STATE'] ?? 0) + 1;
        }
      } else {
        l2.failCount++;
        const c = classifyWhy(v2);
        l2.classes[c] = (l2.classes[c] ?? 0) + 1;
        if (sample.length < 5 && (c === 'prefix-honest' || c === 'chain-break')) {
          sample.push({ offset, class: c, firstBadIndex: v2.firstBadIndex ?? null, at: v2.at ?? null, why: v2.why });
        }
      }
      if (verbose && offset % 2000 === 0) console.error(`  ${entry.id}: offset ${offset}/${len}`);
    }

    // CONTROL: the FULL byte stream must verify through the deployed path
    writeFileSync(targetPath, bytes);
    const control = await runVerifier(entry, { workDir, workRepo });
    return {
      id: entry.id, kind: entry.kind, bytes: len, offsetsTested: offsets ? offsets.length : len,
      offsetsSubset: offsets != null,
      l1: { ...l1, ok: l1.okOffsets.length === 0 },
      l2: {
        ...l2,
        ok: l2.silentOffsets.length === 0,
        contentIdenticalNote: l2.contentIdenticalOffsets.length
          ? `offset(s) ${l2.contentIdenticalOffsets.join(',')} drop only non-semantic whitespace (parsed content deep-equals the full chain) — allowed, not silent`
          : 'no content-identical offsets',
      },
      control: { ok: control.ok === true, tip: control.tip ?? null, why: control.why ?? null },
      sample,
      ok: l1.okOffsets.length === 0 && l2.silentOffsets.length === 0 && control.ok === true,
    };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestration + toy self-audit
// ═══════════════════════════════════════════════════════════════════════════

// The toy chain as a self-contained audit entry (no repo pins — the pins are
// computed from the toy itself).
export function toyAuditEntry({ floats = false } = {}) {
  const toy = buildToyChain({ floats });
  const bytes = Buffer.from(toy.jsonl, 'utf8');
  const v = verifyStoneChain(toy.rows);
  if (v.ok !== true) throw new Error(`toy chain (${floats ? 'float' : 'int'}) does not verify: ${v.why}`);
  const pin = {
    id: `toy_45d_${floats ? 'float' : 'int'}`,
    // path matters: verifyStoneChainPinned dispatches on the .jsonl suffix
    path: `receipts/toy-45d-power-yank-${floats ? 'float' : 'int'}.jsonl`,
    fixture: `toy-45d-power-yank-${floats ? 'float' : 'int'}.jsonl`,
    fixtureSha256: sha256Hex(bytes),
    expectTip: v.tip,
    expectLinks: v.links,
  };
  return { id: pin.id, pin, kind: 'stone-jsonl', bytes: () => bytes };
}

// ANNOTATION-TAIL PROBE — drop exactly the trailing annotation row and show
// the honest failure shape: tip SURVIVES (stone-v2: annotations never
// advance the tip), the links pin is what catches the prefix. This is an
// L2-class probe by construction: the fixture-sha pin is updated to the
// PREFIX bytes so the chain layer (tip + links pins) is what judges —
// under the deployed L1 path the sha gate fires first for every truncation.
export async function annotationTailProbe() {
  const entry = toyAuditEntry({ floats: false });
  const toy = buildToyChain({ floats: false });
  const bodyRows = toy.rows.slice(0, -1); // minus the trailing annotation
  const prefix = Buffer.from(bodyRows.map((r) => JSON.stringify(r)).join('\n'), 'utf8');
  const workDir = mkdtempSync(join(tmpdir(), '45d-ann-'));
  try {
    writeFileSync(join(workDir, entry.pin.fixture), prefix);
    const prefixPin = { ...entry.pin, fixtureSha256: sha256Hex(prefix) };
    const v = await verifyStoneChainPinned(prefixPin, { mode: 'offline', repo: REPO, fixturesDir: workDir, verifier: 'truncate-audit.mjs' });
    const parsed = verifyStoneChain(bodyRows);
    const ok = parsed.ok === true && v.tipOk === true && v.linksOk === false && v.ok === false;
    return {
      prefixVerifiesAsShorterChain: parsed.ok === true,
      tipUnchangedByAnnotationDrop: v.tipOk === true,
      linksPinCatchesIt: v.linksOk === false && v.ok === false,
      why: v.why,
      verdict: ok
        ? 'PASS — prefix-honest: explicit links-mismatch, exit non-zero; the links pin is load-bearing (tip-only pinning would be silent)'
        : 'FAIL',
      ok,
    };
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}

export async function runTruncateAudit({ chains = AUDIT_CHAIN_IDS, verbose = false } = {}) {
  const startedAt = new Date().toISOString();
  const chainResults = {};
  for (const id of chains) {
    const entry = KINDS[id];
    if (!entry) throw new Error(`unknown chain id '${id}' (known: ${AUDIT_CHAIN_IDS.join(', ')})`);
    chainResults[id] = await auditChain(entry, { verbose });
  }
  // the toy chain: known-good, NO non-semantic bytes -> EVERY truncation
  // (count = len) must fail at BOTH layers
  const toy = await auditChain(toyAuditEntry({ floats: false }), { verbose });
  const toyFloat = await auditChain(toyAuditEntry({ floats: true }), { verbose });
  // the delta property on both variants
  const deltaInt = edgeDelta(buildToyChain({ floats: false }).rows);
  const deltaFloat = edgeDelta(buildToyChain({ floats: true }).rows);
  const deltaProperty = {
    identity: 'imbalance (Σ credits − Σ debits, row seal) ≡ field edge Δ (Σ after − before)',
    int: { rowsWithValue: deltaInt.rowsWithValue, globalImbalance: deltaInt.globalImbalance, globalFieldDelta: deltaInt.globalFieldDelta, maxResidual: deltaInt.maxResidual, ok: deltaInt.maxResidual === 0 },
    float: { rowsWithValue: deltaFloat.rowsWithValue, globalImbalance: deltaFloat.globalImbalance, globalFieldDelta: deltaFloat.globalFieldDelta, maxResidual: deltaFloat.maxResidual, ok: deltaFloat.maxResidual <= 1e-12 },
    ok: deltaInt.maxResidual === 0 && deltaFloat.maxResidual <= 1e-12,
  };
  const annotationProbe = await annotationTailProbe();
  const allChainsOk = Object.values(chainResults).every((c) => c.ok);
  const ok = allChainsOk && toy.ok && toyFloat.ok && deltaProperty.ok && annotationProbe.ok;
  return {
    tool: 'fleet-seeds/tools/truncate-audit.mjs',
    adoptedFrom: 'quilt-rust packages/core/tests/journal_power_yank.rs (wave 44-c concepts-44c.md §6) — pattern only, no shared code',
    law: 'no silent wrong state: every byte-offset truncation fails closed; a prefix may verify as a shorter chain ONLY with an explicit tip/links-mismatch report; truncated input never exits 0',
    layers: 'L1 deployed pinned path (sha gate first); L2 chain-semantics layer (sha pin neutralized; ok:true allowed only with deep-equal content)',
    ranAt: startedAt,
    finishedAt: new Date().toISOString(),
    node: process.version,
    chains: chainResults,
    toy: { int: toy, float: toyFloat },
    deltaProperty,
    annotationTailProbe: annotationProbe,
    excluded: { 'moth-42b-raw-bits': 'raw quantum-job bitstream, not a chain (no chain verifier consumes it)' },
    ok,
    why: ok ? null : 'see chains[].l1.okOffsets / chains[].l2.silentOffsets / deltaProperty / annotationTailProbe',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════
function parseArgs(argv) {
  const opts = { chains: AUDIT_CHAIN_IDS, json: false, out: null, quiet: false };
  for (const a of argv) {
    if (a === '--json') opts.json = true;
    else if (a.startsWith('--chains=')) opts.chains = a.slice(9).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--out=')) opts.out = a.slice(6);
    else if (a === '--quiet') opts.quiet = true;
    else throw new Error(`unknown argument '${a}'`);
  }
  return opts;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('truncate-audit.mjs')) {
  const main = async () => {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); } catch (e) {
      console.error(`truncate-audit: ${e.message}`);
      process.exit(2);
    }
    const verdict = await runTruncateAudit(opts);
    if (!opts.json && !opts.quiet) {
      for (const [id, c] of Object.entries(verdict.chains)) {
        console.log(`${id.padEnd(6)} bytes=${String(c.bytes).padStart(6)}  L1 fail ${c.l1.failCount}/${c.bytes} (accepted ${c.l1.okOffsets.length})  L2 fail ${c.l2.failCount}/${c.bytes} (content-identical ${c.l2.contentIdenticalOffsets.length}, SILENT ${c.l2.silentOffsets.length})  control ${c.control.ok ? 'ok' : 'FAIL'}  -> ${c.ok ? 'ok' : 'FAIL'}`);
      }
      console.log(`toy-int   bytes=${String(verdict.toy.int.bytes).padStart(6)}  L1 fail ${verdict.toy.int.l1.failCount}/${verdict.toy.int.bytes}  L2 fail ${verdict.toy.int.l2.failCount}/${verdict.toy.int.bytes} (every truncation fails, count=len)  -> ${verdict.toy.int.ok ? 'ok' : 'FAIL'}`);
      console.log(`toy-float bytes=${String(verdict.toy.float.bytes).padStart(6)}  L1 fail ${verdict.toy.float.l1.failCount}/${verdict.toy.float.bytes}  L2 fail ${verdict.toy.float.l2.failCount}/${verdict.toy.float.bytes}  -> ${verdict.toy.float.ok ? 'ok' : 'FAIL'}`);
      console.log(`delta property: int maxResidual=${verdict.deltaProperty.int.maxResidual} float maxResidual=${verdict.deltaProperty.float.maxResidual} (bound 1e-12) -> ${verdict.deltaProperty.ok ? 'ok' : 'FAIL'}`);
      console.log(`annotation-tail probe: ${verdict.annotationTailProbe.verdict}`);
      console.log(`AUDIT ${verdict.ok ? 'PASS' : 'FAIL'}${verdict.why ? ` — ${verdict.why}` : ''}`);
    }
    const json = JSON.stringify(verdict, null, 2);
    if (opts.out) writeFileSync(opts.out, json + '\n', 'utf8');
    if (opts.json || opts.quiet) console.log(json);
    process.exit(verdict.ok ? 0 : 1);
  };
  main().catch((e) => { console.error(`truncate-audit: ${e.stack || e.message}`); process.exit(2); });
}
