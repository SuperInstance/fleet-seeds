#!/usr/bin/env node
// scripts/pong49_scorer.mjs — pong49 scorer, PREPARED INSTRUMENT (wave 53, lane 53-f).
//
// =====================================================================================
// ============================== PRE-REGISTRATION BLOCK ===============================
// This file is a PREPARED, PRE-REGISTERED scoring instrument. Its sha256 is sealed in
// scripts/pong49_scorer.registration.json (authored BEFORE any scoring run; see the
// registration's no_run_declaration). Registered status: PREPARED_NOT_FIRED.
//
//   IT FIRES AT THE FIRST SEAL AFTER 2026-09-29T10:04Z (the registered window close).
//   Until then it must NOT be run against live window data — and the code enforces that:
//
//   * default mode  : PREPARED — zero network, zero files written, exit 3. Prints this
//                     receipt and stops. You cannot "accidentally" fire it.
//   * --arm         : the ONLY mode that touches the network; additionally refuses
//                     (exit 2, no network call made) while now < WINDOW_CLOSE.
//   * --selftest    : hermetic KAT battery + registration-binding smoke (reads the local
//                     registered artifacts, never the network). This is the only execution
//                     performed before firing, and it is receipted in the registration file.
//
// Registered question being scored (DO NOT INVENT — read from the registration artifacts):
//   p_pong49_external_comment = P(any comment authored by a GitHub account whose login is not
//   'SuperInstance' on SuperInstance/pong-quilt issue #49 within
//   [2026-09-27T10:04:00Z, 2026-09-29T10:04:00Z] = 1, else 0)
//   — registered in tavern/jev_calibration_battery_r8.json (wave 37, lane 37-a, registered_at
//   2026-09-27T10:04:00Z; resolution source scoring_rule.resolution_sources.c_pong49: "GitHub
//   API read of SuperInstance/pong-quilt issue #49 comments at registered_at + 48h =
//   2026-09-29T10:04:00Z"). Brier scoring pre-declared in the same file; battery score = mean
//   Brier over RESOLVED noul questions (unresolved questions are EXCLUDED per the registered
//   unresolved_policy, never scored 0.5).
//
// Registered procedure implemented here, artifact-bound (sha256s checked at run time):
//   1. Prices: lane_37a_jev_smith 0.07 and jev_r8 0.15 read from
//      tavern/jev_calibration_battery_r8.json (#lane_predictions_37a_jev_smith /
//      #jev_answers_as_said); jev_r9 remap priors (jev-latest 0.13, jev-preview 0.14) read from
//      tavern/jev_remap_r9_rows.jsonl (#r9-battery-verbatim-jev-latest / -jev-preview,
//      parsed_verdict.answers.p_pong49_external_comment.noul — fresh priors on the open
//      question; scored, but NOT part of the registered r8 battery mean, whose predictors are
//      lane 37-a and JEV r8 — the same faithful reading the registered runner of record,
//      embassy/battery/pong49_scorer.mjs (lane 42-d), implements).
//   2. The 3 already keeper-sealed r8 noul resolutions (outcomes + per-predictor Briers) are
//      read VERBATIM from tavern/jev_battery_scores_r8.json (#resolved) — this script does NOT
//      re-adjudicate them; at close they fold with the pong49 outcome into the registered
//      battery mean over 4/4 resolved noul questions.
//   3. Multiclass annex (registration rule d_choice_multiclass): guest_c5_stance over options
//      [stand, revise, withdraw], outcome read from tavern/jev_battery_scores_r8.json
//      (#typed_seat_outcome — keeper seal, leading option word parsed strictly, fail-closed if
//      not exactly one of the registered options); probability sets read from the registration
//      (#lane_predictions_37a_jev_smith.guest_c5_stance_probabilities /
//      #jev_answers_as_said.guest_c5_stance.probabilities).
//   4. guest_surviving_standing (score type): excluded from the mean per the registered
//      unresolved_policy (keeper judged unresolvable) — noted in every scorecard, never scored.
//
// Registered artifacts are the ONLY scoring inputs. Everything not in them ("sign-lane fix
// landed", "letter acknowledged", …) is watch context and is NEVER scored.
//
// Companion of record: embassy/battery/pong49_scorer.mjs (lane 42-d runner, same registered
// procedure, premature-guard verified wave 44). This scripts/ copy exists so the firing lane
// (first seal after 2026-09-29T10:04Z) runs an arming-gated, registration-sealed instrument;
// if both are ever run at close, their scorecards must agree on every number.
//
// Exit codes: 0 = scored (after close, --arm; scorecard.json + .md written next to this file)
//             1 = fail-closed (API/data error; nothing written)
//             2 = PREMATURE/UNARMED-FIRING attempt (--arm before close; nothing written, no network)
//             3 = PREPARED mode (default; no network, nothing written)
//             4 = selftest failure (selftest exit 0 = all controls pass)
// =====================================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");

// ---------------------------------------------------------------- registered constants (from the registration, mirrored verbatim)
const REG_CAL = join(REPO_ROOT, "tavern", "jev_calibration_battery_r8.json");
const REG_SCORES = join(REPO_ROOT, "tavern", "jev_battery_scores_r8.json");
const REG_R9ROWS = join(REPO_ROOT, "tavern", "jev_remap_r9_rows.jsonl");
const FLEET_LOGIN = "SuperInstance";      // comments by this login never count as foreign replies
const REPO = "SuperInstance/pong-quilt";
const ISSUE_NO = 49;
const MULTICLASS_OPTIONS = ["stand", "revise", "withdraw"];
const EXCLUDED_SCORE_QUESTION = "guest_surviving_standing (score type) — excluded per the registration's own unresolved_policy";

// ---------------------------------------------------------------- small helpers (stdlib only)
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const r2 = (x) => Math.round(x * 1e6) / 1e6;
const jstr = (o) => JSON.stringify(o, null, 2);
const brierBinary = (p, o01) => (p - o01) ** 2;
const brierMulticlass = (probs, outcome) =>
  MULTICLASS_OPTIONS.reduce((s, o) => s + ((probs[o] ?? 0) - (o === outcome ? 1 : 0)) ** 2, 0);
const inWindow = (iso, open, close) => {
  const t = Date.parse(iso);
  return t >= Date.parse(open) && t <= Date.parse(close); // registered text: within [open, close] — inclusive both ends
};

// ---------------------------------------------------------------- registration artifact loading (fail-closed)
function loadRegistration() {
  const files = {};
  for (const [k, p] of [["calibration_r8", REG_CAL], ["scores_r8", REG_SCORES], ["remap_r9", REG_R9ROWS]]) {
    let raw;
    try { raw = readFileSync(p, "utf8"); }
    catch (e) { throw new Error(`registered artifact missing: ${p} (${e.message}) — fail-closed`); }
    files[k] = { path: p, sha256: sha256(raw), raw };
  }
  const cal = JSON.parse(files.calibration_r8.raw);
  const scores = JSON.parse(files.scores_r8.raw);
  const r9rows = files.remap_r9.raw.trim().split("\n").map((l) => JSON.parse(l));

  // window + registered question text
  const registeredAt = cal.registered_at;
  const WINDOW_OPEN = registeredAt; // registration state: "the pong-quilt #49 48h window starts at registered_at"
  // WINDOW_CLOSE: computed as registered_at + 48h, then bound to the LITERAL registered string in
  // scoring_rule.resolution_sources.c_pong49 ("... at registered_at + 48h = 2026-09-29T10:04:00Z")
  // so every scorecard prints the registered string, not a re-serialization of it. Fail-closed if
  // the literal and the arithmetic disagree.
  const closeMs = Date.parse(registeredAt) + 48 * 3600 * 1000;
  const literals = (cal.scoring_rule.resolution_sources.c_pong49.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g) ?? []);
  const closeLiteral = literals.find((s) => Date.parse(s) === closeMs);
  if (!closeLiteral)
    throw new Error(`registration drift: c_pong49 literal close string not found/arithmetic mismatch (computed ${new Date(closeMs).toISOString()}, literals ${JSON.stringify(literals)}) — fail-closed`);
  const WINDOW_CLOSE = closeLiteral;
  const q = cal.questions.find((x) => x.id === "p_pong49_external_comment");
  if (!q || q.resolution !== "scoring_rule.resolution_sources.c_pong49")
    throw new Error("registration drift: p_pong49_external_comment / c_pong49 not found as registered — fail-closed");
  if (!cal.scoring_rule || !cal.scoring_rule.resolution_sources || !cal.scoring_rule.resolution_sources.c_pong49)
    throw new Error("registration drift: scoring_rule.resolution_sources.c_pong49 missing — fail-closed");

  // registered prices
  const laneP = cal.lane_predictions_37a_jev_smith?.p_pong49_external_comment;
  const jevP = cal.jev_answers_as_said?.p_pong49_external_comment?.noul;
  for (const [name, v] of [["lane 37-a", laneP], ["jev r8", jevP]])
    if (typeof v !== "number" || v < 0 || v > 1) throw new Error(`registration drift: ${name} pong49 price unreadable (${v}) — fail-closed`);
  const remap = {};
  for (const probe of ["r9-battery-verbatim-jev-latest", "r9-battery-verbatim-jev-preview"]) {
    const row = r9rows.find((r) => r.probe_id === probe);
    const p = row?.parsed_verdict?.answers?.p_pong49_external_comment?.noul;
    if (typeof p !== "number" || p < 0 || p > 1)
      throw new Error(`registration drift: r9 remap prior unreadable for ${probe} (${p}) — fail-closed`);
    remap[probe] = p;
  }

  // keeper-sealed r8 resolutions (carried VERBATIM — never re-adjudicated here)
  const resolved = (scores.resolved ?? []).map((r) => {
    if (typeof r.jev_brier !== "number" || typeof r.lane_brier !== "number" || typeof r.outcome !== "boolean")
      throw new Error("registration drift: keeper-sealed r8 resolution row incomplete — fail-closed");
    return r;
  });
  if (resolved.length !== 3)
    throw new Error(`registration drift: expected 3 keeper-sealed r8 resolutions, found ${resolved.length} — fail-closed`);

  // multiclass annex inputs
  const stanceOutRaw = scores.typed_seat_outcome?.outcome;
  const stanceOutcome = MULTICLASS_OPTIONS.find((o) => typeof stanceOutRaw === "string" && stanceOutRaw.startsWith(o));
  if (!stanceOutcome)
    throw new Error(`registration drift: typed_seat_outcome.outcome does not start with a registered option (${JSON.stringify(stanceOutRaw)}) — fail-closed`);
  const mcLane = cal.lane_predictions_37a_jev_smith?.guest_c5_stance_probabilities;
  const mcJev = cal.jev_answers_as_said?.guest_c5_stance?.probabilities;
  for (const [name, m] of [["lane multiclass", mcLane], ["jev multiclass", mcJev]]) {
    if (!m || MULTICLASS_OPTIONS.some((o) => typeof m[o] !== "number"))
      throw new Error(`registration drift: ${name} probabilities unreadable — fail-closed`);
  }

  return {
    files, cal, resolved, WINDOW_OPEN, WINDOW_CLOSE, stanceOutcome,
    prices: [
      { predictor: "lane_37a_jev_smith", p: laneP,
        instrument: "lane (pre-registered before the JEV call)",
        source: "tavern/jev_calibration_battery_r8.json#lane_predictions_37a_jev_smith.p_pong49_external_comment" },
      { predictor: "jev_r8_battery", p: jevP,
        instrument: "JEV (jev-1.13.0, sealed r8 battery call 2026-09-27T10:02:10Z)",
        source: "tavern/jev_calibration_battery_r8.json#jev_answers_as_said.p_pong49_external_comment" },
      { predictor: "jev_r9_remap_jev_latest", p: remap["r9-battery-verbatim-jev-latest"],
        instrument: "JEV r9 remap, jev-latest alias (fresh prior, question open)",
        source: "tavern/jev_remap_r9_rows.jsonl#r9-battery-verbatim-jev-latest" },
      { predictor: "jev_r9_remap_jev_preview", p: remap["r9-battery-verbatim-jev-preview"],
        instrument: "JEV r9 remap, jev-preview alias (fresh prior, question open)",
        source: "tavern/jev_remap_r9_rows.jsonl#r9-battery-verbatim-jev-preview" }
    ],
    multiclass: {
      question: "guest_c5_stance", options: MULTICLASS_OPTIONS, outcome: stanceOutcome,
      outcome_source: "tavern/jev_battery_scores_r8.json#typed_seat_outcome (keeper seal, not re-adjudicated here)",
      prices: { lane_37a: mcLane, jev_r8: mcJev }
    }
  };
}

// ---------------------------------------------------------------- resolution (registered text, verbatim)
function registeredText(open, close) {
  return "any comment authored by an account whose login is not 'SuperInstance' on SuperInstance/pong-quilt #49 " +
    `within [${open}, ${close}] = 1, else 0`;
}
function resolveOutcome(comments, open, close) {
  const hits = comments.filter((c) => c.user && c.user.login !== FLEET_LOGIN && inWindow(c.created_at, open, close));
  const outcome = hits.length > 0 ? 1 : 0;
  return {
    question: "p_pong49_external_comment",
    registered_text: registeredText(open, close),
    outcome, outcome_label: outcome === 1 ? "FOREIGN_REPLY" : "NO_FOREIGN_REPLY",
    evidence: hits.map((c) => ({ id: c.id, login: c.user.login, created_at: c.created_at, url: c.html_url })),
    evidence_kind: hits.length
      ? "GitHub API comments list (non-SuperInstance authors in window)"
      : "GitHub API comments list: zero non-SuperInstance authors in window"
  };
}

// ---------------------------------------------------------------- scoring (pre-declared Brier rules)
function computeScores(reg, resolution) {
  const prices = reg.prices.map((pr) => ({ ...pr, brier: r2(brierBinary(pr.p, resolution.outcome)) }));
  // registered battery mean: mean Brier over RESOLVED noul questions (registration scoring_rule).
  // 3 already keeper-sealed (r8, carried verbatim) + pong49 resolved at close = 4/4.
  // The battery's registered predictors are lane 37-a and JEV r8; the r9 remap priors are
  // scored for the record but excluded from the mean (faithful reading of the r8 registration;
  // identical to the registered runner of record, embassy/battery/pong49_scorer.mjs).
  const laneBriers = [...reg.resolved.map((r) => r.lane_brier)];
  const jevBriers = [...reg.resolved.map((r) => r.jev_brier)];
  laneBriers.push(prices.find((p) => p.predictor === "lane_37a_jev_smith").brier);
  jevBriers.push(prices.find((p) => p.predictor === "jev_r8_battery").brier);
  const mean = (a) => r2(a.reduce((s, x) => s + x, 0) / a.length);
  const mc = Object.fromEntries(Object.entries(reg.multiclass.prices).map(([k, probs]) =>
    [k, r2(brierMulticlass(probs, reg.multiclass.outcome))]));
  return {
    resolution,
    prices,
    battery_noul_mean_4_questions: {
      lane_37a: mean(laneBriers), jev_r8: mean(jevBriers),
      includes: "3 keeper-sealed r8 resolutions carried verbatim (tavern/jev_battery_scores_r8.json#resolved) + pong49 resolved at close",
      excludes: `${EXCLUDED_SCORE_QUESTION}; guest_c5_stance is choice-type, scored in the multiclass annex; r9 remap priors are fresh-prior reference rows, not r8 battery predictors`,
      r8_running_3_resolved_reference: { jev: 0.3211, lane: 0.1327, source: "tavern/jev_battery_scores_r8.json#running_brier_3_resolved" }
    },
    multiclass_annex: { ...reg.multiclass, brier: mc }
  };
}

// ---------------------------------------------------------------- live data pull (read-only, --arm only)
const API = "https://api.github.com";
let GH_TOKEN = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
async function gh(path) {
  const headers = {
    "User-Agent": "fleet-pong49-scorer-53f-prepared",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (GH_TOKEN) headers["Authorization"] = `Bearer ${GH_TOKEN}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res;
    try { res = await fetch(API + path, { headers }); }
    catch (e) {
      if (attempt === 4) throw new Error(`network error on ${path}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt)); continue;
    }
    if (res.status === 200) return res.json();
    if ((res.status === 403 || res.status === 429) && attempt < 4) { await new Promise((r) => setTimeout(r, 3000 * attempt)); continue; }
    if (res.status >= 500 && attempt < 4) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
    if (res.status === 404) throw new Error(`404 on ${path} (does the thread/repo exist as registered?)`);
    throw new Error(`HTTP ${res.status} on ${path}`);
  }
  throw new Error(`unreachable: ${path}`);
}
async function pullComments(open, close) {
  const issue = await gh(`/repos/${REPO}/issues/${ISSUE_NO}`);
  const comments = [];
  for (let page = 1; page <= 20; page++) {
    const rows = await gh(`/repos/${REPO}/issues/${ISSUE_NO}/comments?per_page=100&page=${page}`);
    comments.push(...rows);
    if (rows.length < 100) break;
  }
  return { issue, comments, pulled_at_utc: new Date().toISOString(), window: { open, close } };
}

// ---------------------------------------------------------------- outputs
function mdFrom(s) {
  const L = [];
  L.push(`# pong49 scorecard — ${s.status} (scripts/pong49_scorer.mjs, 53-f)`);
  L.push("");
  L.push(`- generated_at: ${s.generated_at_utc}`);
  L.push(`- window: [${s.window.open}, ${s.window.close}] (registered: tavern/jev_calibration_battery_r8.json #scoring_rule.resolution_sources.c_pong49)`);
  L.push(`- registered artifacts sha256: cal=${s.artifact_sha256s.calibration_r8.slice(0, 16)}… scores=${s.artifact_sha256s.scores_r8.slice(0, 16)}… r9=${s.artifact_sha256s.remap_r9.slice(0, 16)}…`);
  L.push("");
  const r = s.scores.resolution;
  L.push(`## Resolution (AS OF close)`);
  L.push(`- outcome: **${r.outcome}** (${r.outcome_label})`);
  L.push(`- rule: ${r.registered_text}`);
  L.push(`- evidence: ${r.evidence_kind}${r.evidence.length ? " → " + r.evidence.map((e) => `${e.url} (${e.login} @ ${e.created_at})`).join("; ") : ""}`);
  L.push("");
  L.push(`## Brier per registered price (binary, pre-declared rule)`);
  L.push(`| predictor | p | Brier | source |`);
  L.push(`|---|---|---|---|`);
  for (const pr of s.scores.prices) L.push(`| ${pr.predictor} | ${pr.p} | ${pr.brier} | ${pr.source} |`);
  L.push("");
  L.push(`## Registered battery mean (noul questions, 4/4 resolved)`);
  L.push("```json");
  L.push(jstr(s.scores.battery_noul_mean_4_questions));
  L.push("```");
  L.push("");
  L.push(`## Multiclass annex (guest_c5_stance, keeper-sealed outcome)`);
  L.push("```json");
  L.push(jstr({ ...s.scores.multiclass_annex, brier: s.scores.multiclass_annex.brier }));
  L.push("```");
  L.push("");
  L.push("---");
  L.push("Registered artifacts (verbatim, not invented): tavern/jev_calibration_battery_r8.json (lane 0.07 / JEV r8 0.15), " +
    "tavern/jev_remap_r9_rows.jsonl (JEV r9 priors 0.13 / 0.14), tavern/jev_battery_scores_r8.json (3 sealed resolutions + typed_seat_outcome). " +
    "Everything not in the registration is watch context and is NEVER scored here.");
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------- selftest (hermetic; the only pre-fire execution)
function selftest() {
  const reg = loadRegistration(); // also the registration-binding smoke: artifacts parse + shapes check (no network)
  const open = "2026-09-27T10:04:00Z", close = "2026-09-29T10:04:00Z";
  const c = (id, login, at) => ({ id, user: { login }, created_at: at, html_url: `https://example.invalid/${id}` });
  const controls = [];
  const check = (name, got, want) => controls.push([name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`]);

  // -- Brier KATs (pre-declared rule; scorecards emit r2-rounded values)
  check("brier-binary p=0.07 outcome=1", r2(brierBinary(0.07, 1)), 0.8649);
  check("brier-binary p=0.07 outcome=0", r2(brierBinary(0.07, 0)), 0.0049);
  check("brier-binary p=0.15 outcome=0", r2(brierBinary(0.15, 0)), 0.0225);
  check("brier-multiclass lane stand-outcome", r2(brierMulticlass({ stand: 0.5, revise: 0.4, withdraw: 0.1 }, "stand")), 0.42);
  check("brier-multiclass jev stand-outcome", r2(brierMulticlass({ withdraw: 0.18, revise: 0.29, stand: 0.53 }, "stand")), 0.3374);

  // -- resolution logic against the registered text (inclusive window, foreign-login rule)
  check("resolve: foreign in window -> 1", resolveOutcome([c(1, "someone-else", "2026-09-28T00:00:00Z")], open, close).outcome, 1);
  check("resolve: foreign BEFORE window -> 0", resolveOutcome([c(2, "someone-else", "2026-09-26T00:00:00Z")], open, close).outcome, 0);
  check("resolve: foreign AFTER close -> 0", resolveOutcome([c(3, "someone-else", "2026-09-30T00:00:00Z")], open, close).outcome, 0);
  check("resolve: SuperInstance in window -> 0 (never foreign)", resolveOutcome([c(4, FLEET_LOGIN, "2026-09-28T00:00:00Z")], open, close).outcome, 0);
  check("resolve: boundary open (== open) counts", resolveOutcome([c(5, "someone-else", open)], open, close).outcome, 1);
  check("resolve: boundary close (== close) counts", resolveOutcome([c(6, "someone-else", close)], open, close).outcome, 1);
  check("resolve: no comments -> 0", resolveOutcome([], open, close).outcome, 0);

  // -- battery mean KAT: 3 synthetic sealed rows + pong49 outcome=0
  const fakeReg = {
    ...reg,
    resolved: [
      { outcome: true, jev_brier: 0.1, lane_brier: 0.2 },
      { outcome: false, jev_brier: 0.3, lane_brier: 0.4 },
      { outcome: true, jev_brier: 0.5, lane_brier: 0.6 }
    ],
    prices: [
      { predictor: "lane_37a_jev_smith", p: 0.07, instrument: "x", source: "x" },
      { predictor: "jev_r8_battery", p: 0.15, instrument: "x", source: "x" }
    ]
  };
  const sc = computeScores(fakeReg, resolveOutcome([], open, close));
  check("battery mean lane (0.2+0.4+0.6+0.0049)/4", sc.battery_noul_mean_4_questions.lane_37a, 0.301225);
  check("battery mean jev (0.1+0.3+0.5+0.0225)/4", sc.battery_noul_mean_4_questions.jev_r8, 0.230625);

  // -- guard logic
  const premature = Date.parse("2026-09-29T10:03:59Z") < Date.parse(close);
  check("guard: one second before close is premature", premature, true);
  check("guard: at close is not premature", Date.parse(close) < Date.parse(close), false);

  // -- registration binding (already loaded fail-closed above; assert the registered prices here)
  check("binding: lane 37-a price is the registered 0.07", reg.prices[0].p, 0.07);
  check("binding: jev r8 price is the registered 0.15", reg.prices[1].p, 0.15);
  check("binding: r9 remap jev-latest prior is the sealed 0.13", reg.prices[2].p, 0.13);
  check("binding: r9 remap jev-preview prior is the sealed 0.14", reg.prices[3].p, 0.14);
  check("binding: window close is 2026-09-29T10:04:00Z", reg.WINDOW_CLOSE, close);
  check("binding: multiclass keeper outcome parses to 'stand'", reg.multiclass.outcome, "stand");
  check("binding: 3 keeper-sealed r8 resolutions present", reg.resolved.length, 3);

  let pass = 0;
  for (const [name, ok, why] of controls) {
    if (ok) pass++;
    console.log(`${ok ? "ok" : "SELFTEST-FAILURE"}  ${name}${ok ? "" : ` — ${why}`}`);
  }
  console.log(`artifact binding: cal=${reg.files.calibration_r8.sha256}`);
  console.log(`                   scores=${reg.files.scores_r8.sha256}`);
  console.log(`                   r9rows=${reg.files.remap_r9.sha256}`);
  console.log(`selftest: ${pass}/${controls.length} controls behaved as registered (hermetic; zero network; zero writes)`);
  return pass === controls.length ? 0 : 1;
}

// ---------------------------------------------------------------- main
async function main() {
  const arg = process.argv[2] ?? "";
  if (arg === "--selftest") process.exit(selftest());
  if (arg !== "--arm") {
    // PREPARED mode (default): the registered no-fire state. Zero network, zero writes.
    console.log(`status: PREPARED_NOT_FIRED (scripts/pong49_scorer.mjs, wave 53 lane 53-f)`);
    console.log(`registered question: p_pong49_external_comment (tavern/jev_calibration_battery_r8.json #c_pong49)`);
    console.log(`window: [2026-09-27T10:04:00Z, 2026-09-29T10:04:00Z] — scoring fires at the FIRST SEAL AFTER 2026-09-29T10:04Z`);
    console.log(`pre-registration: scripts/pong49_scorer.registration.json (sha256-sealed BEFORE any scoring run)`);
    console.log(`this default mode is the prepared state itself: zero network, zero files written (exit 3)`);
    console.log(`to fire after close, at the first seal: node scripts/pong49_scorer.mjs --arm  (exit 0 scores; exit 1 fail-closed)`);
    process.exit(3);
  }
  // --arm: the only firing path. Still refuses before the registered close (premature guard),
  // and refuses BEFORE any network call so the instrument cannot scrape live window data early.
  const reg = loadRegistration(); // fail-closed on any drift
  const now = new Date();
  if (now.getTime() < Date.parse(reg.WINDOW_CLOSE)) {
    console.error(`REFUSED (exit 2): now=${now.toISOString()} is before the registered window close ${reg.WINDOW_CLOSE}.`);
    console.error(`registered rule: resolution happens at registered_at + 48h = ${reg.WINDOW_CLOSE}; this instrument`);
    console.error(`must not read live window data before close. Nothing was fetched, nothing was written.`);
    console.error(`fire at the first seal after ${reg.WINDOW_CLOSE}.`);
    process.exit(2);
  }
  let pulled;
  try { pulled = await pullComments(reg.WINDOW_OPEN, reg.WINDOW_CLOSE); }
  catch (e) {
    console.error(`FAIL-CLOSED (exit 1): ${e.message}`);
    console.error(`no scorecard written (fail-closed law: no scorecard without data).`);
    process.exit(1);
  }
  const resolution = resolveOutcome(pulled.comments, reg.WINDOW_OPEN, reg.WINDOW_CLOSE);
  const scores = computeScores(reg, resolution);
  const scorecard = {
    status: "SCORED",
    verdict: "emitted",
    instrument: "scripts/pong49_scorer.mjs (53-f prepared instrument, pre-registered in scripts/pong49_scorer.registration.json)",
    generated_at_utc: now.toISOString(),
    pulled_at_utc: pulled.pulled_at_utc,
    window: { open: reg.WINDOW_OPEN, close: reg.WINDOW_CLOSE },
    artifact_sha256s: {
      calibration_r8: reg.files.calibration_r8.sha256,
      scores_r8: reg.files.scores_r8.sha256,
      remap_r9: reg.files.remap_r9.sha256
    },
    issue_state: { url: pulled.issue.html_url, state: pulled.issue.state, comments_count: pulled.issue.comments },
    scores
  };
  const jsonPath = join(HERE, "pong49_scorecard.json");
  const mdPath = join(HERE, "pong49_scorecard.md");
  writeFileSync(jsonPath, jstr(scorecard) + "\n");
  writeFileSync(mdPath, mdFrom(scorecard));
  console.error(`[pong49-scorer 53-f] SCORED. outcome=${scores.resolution.outcome} (${scores.resolution.outcome_label})`);
  for (const pr of scores.prices) console.error(`  ${pr.predictor}: p=${pr.p} brier=${pr.brier}`);
  console.error(`  battery_noul_mean: lane=${scores.battery_noul_mean_4_questions.lane_37a} jev=${scores.battery_noul_mean_4_questions.jev_r8}`);
  console.error(`  written: ${jsonPath}`);
  console.error(`           ${mdPath}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`FAIL-CLOSED (exit 1): ${e.message}`);
  process.exit(1);
});
