#!/usr/bin/env node
// embassy/battery/pong49_scorer.mjs — pong49 battery scorer, lane 42-d (pong-scorer)
// Sealed registration: tavern/jev_calibration_battery_r8.json (wave 37, lane 37-a, registered
// 2026-09-27T10:04:00Z) + tavern/jev_remap_r9_rows.jsonl (JEV r9 fresh priors, wave 40-b).
// Scoring rule: pre-declared in the registration (binary Brier for noul questions; multiclass
// Brier for guest_c5_stance). The keeper runs this AFTER the window closes.
//
// HARD GUARD: refuses to emit a verdict before WINDOW_CLOSE (exit 2 + PREMATURE receipt with
// interim state). Read-only GitHub API. Zero foreign writes. Zero LLM spend. No deps (node >=18).
//
// Exit codes: 0 = scored (scorecard.json + .md written)
//             2 = PREMATURE (before window close; scorecard carries interim state, verdict null)
//             1 = fail-closed (API/data error; nothing written)
//
// Usage: GH_TOKEN optional (higher rate limit). node embassy/battery/pong49_scorer.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- registered constants (verbatim)
const WINDOW_OPEN = "2026-09-27T10:04:00Z";  // battery registered_at (tavern/jev_calibration_battery_r8.json)
const WINDOW_CLOSE = "2026-09-29T10:04:00Z"; // registered_at + 48h (resolution_sources.c_pong49)
const FLEET_LOGIN = "SuperInstance";         // comments by this login never count as foreign replies
const REPO = "SuperInstance/pong-quilt";
const ISSUE_NO = 49;
const OUR_LAST_WAVE41_COMMENT = 5858861919;  // wave-41 pong #49 comment (stone P1 consumer impact)

// Registered prices for the ONE pong49 outcome the registration actually contains:
//   p_pong49_external_comment = P(any comment authored by a non-SuperInstance GitHub account
//   on SuperInstance/pong-quilt #49 within [WINDOW_OPEN, WINDOW_CLOSE]).
const PRICES = [
  { predictor: "lane_37a_jev_smith", p: 0.07, instrument: "lane (pre-registered before the JEV call)",
    source: "tavern/jev_calibration_battery_r8.json#lane_predictions_37a_jev_smith.p_pong49_external_comment" },
  { predictor: "jev_r8_battery", p: 0.15, instrument: "JEV (jev-1.13.0, sealed r8 battery call 2026-09-27T10:02:10Z)",
    source: "tavern/jev_calibration_battery_r8.json#jev_answers_as_said.p_pong49_external_comment" },
  { predictor: "jev_r9_remap_jev_latest", p: 0.13, instrument: "JEV r9 remap, jev-latest alias (fresh prior, question open)",
    source: "tavern/jev_remap_r9_rows.jsonl#r9-battery-verbatim-jev-latest" },
  { predictor: "jev_r9_remap_jev_preview", p: 0.14, instrument: "JEV r9 remap, jev-preview alias (fresh prior, question open)",
    source: "tavern/jev_remap_r9_rows.jsonl#r9-battery-verbatim-jev-preview" }
];

// Keeper-sealed r8 resolutions for the other three noul questions (carried VERBATIM; this script
// does NOT re-adjudicate them — it only folds them into the registered battery mean).
const R8_SEALED_RESOLVED = [
  { question: "p_eq8_artifact", outcome: true,  jev_p: 0.39, jev_brier: 0.3721, lane_p: 0.66, lane_brier: 0.1156,
    source: "tavern/jev_battery_scores_r8.json#resolved[0] (keeper seal)" },
  { question: "p_scn001_survives", outcome: false, jev_p: 0.27, jev_brier: 0.0729, lane_p: 0.35, lane_brier: 0.1225,
    source: "tavern/jev_battery_scores_r8.json#resolved[1] (keeper seal)" },
  { question: "p_guest_stands_c5", outcome: true, jev_p: 0.28, jev_brier: 0.5184, lane_p: 0.6, lane_brier: 0.16,
    source: "tavern/jev_battery_scores_r8.json#resolved[2] (keeper seal)" }
];

// Multiclass annex — pre-declared rule d_choice_multiclass in the registration; outcome keeper-sealed.
const MULTICLASS_ANNEX = {
  question: "guest_c5_stance",
  options: ["stand", "revise", "withdraw"],
  outcome: "stand",
  outcome_source: "tavern/jev_battery_scores_r8.json#typed_seat_outcome (keeper seal, not re-adjudicated here)",
  prices: {
    lane_37a: { stand: 0.5, revise: 0.4, withdraw: 0.1 },
    jev_r8:   { stand: 0.53, revise: 0.29, withdraw: 0.18 }
  },
  note: "Annex only: applies the registration's own pre-declared rule to the keeper-sealed outcome."
};

// ---------------------------------------------------------------- helpers
const brierBinary = (p, outcome01) => (p - outcome01) ** 2;
const brierMulticlass = (probs, outcome) =>
  MULTICLASS_ANNEX.options.reduce((s, o) => s + ((probs[o] ?? 0) - (o === outcome ? 1 : 0)) ** 2, 0);
const r2 = (x) => Math.round(x * 1e6) / 1e6;
const jstr = (o) => JSON.stringify(o, null, 2);

let GH_TOKEN = (process.env.GH_TOKEN || "").trim();
const API = "https://api.github.com";

async function gh(path) {
  const headers = {
    "User-Agent": "fleet-pong49-scorer-42d",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (GH_TOKEN) headers["Authorization"] = `Bearer ${GH_TOKEN}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res;
    try {
      res = await fetch(API + path, { headers });
    } catch (e) {
      if (attempt === 4) throw new Error(`network error on ${path}: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      continue;
    }
    if (res.status === 200) return res.json();
    if (res.status === 403 || res.status === 429) {
      if (attempt === 4) throw new Error(`rate-limited on ${path} after retries (status 403/429)`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
      continue;
    }
    if (res.status === 404) throw new Error(`404 on ${path} (does the thread/repo exist as assumed?)`);
    if (res.status >= 500 && attempt < 4) { await new Promise(r => setTimeout(r, 2000 * attempt)); continue; }
    throw new Error(`HTTP ${res.status} on ${path}`);
  }
  throw new Error(`unreachable: ${path}`);
}

async function ghAllComments(repo, issueNo) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const rows = await gh(`/repos/${repo}/issues/${issueNo}/comments?per_page=100&page=${page}`);
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
}

const inWindow = (iso) => {
  const t = Date.parse(iso);
  return t >= Date.parse(WINDOW_OPEN) && t <= Date.parse(WINDOW_CLOSE);
};

// ---------------------------------------------------------------- data pull (read-only)
async function pullState() {
  const issue = await gh(`/repos/${REPO}/issues/${ISSUE_NO}`);
  const comments = await ghAllComments(REPO, ISSUE_NO);
  const pongRepo = await gh(`/repos/${REPO}`);
  const pongHead = await gh(`/repos/${REPO}/commits/${pongRepo.default_branch}`);
  const stoneRepo = await gh(`/repos/SuperInstance/quilt-stone`);
  const stoneHead = await gh(`/repos/SuperInstance/quilt-stone/commits/${stoneRepo.default_branch}`);
  let stoneRecent = [];
  try { stoneRecent = await gh(`/repos/SuperInstance/quilt-stone/commits?per_page=15`); } catch {}
  let stonePRs = [];
  try { stonePRs = await gh(`/repos/SuperInstance/quilt-stone/pulls?state=all&per_page=20&sort=created&direction=desc`); } catch {}
  return { issue, comments, pongRepo, pongHead, stoneRepo, stoneHead, stoneRecent, stonePRs };
}

function interimStateFrom({ issue, comments, pongRepo, pongHead, stoneRepo, stoneHead, stoneRecent, stonePRs }) {
  const foreign = comments.filter(c => c.user && c.user.login !== FLEET_LOGIN);
  const afterOurLast = comments.filter(c => Number(c.id) > OUR_LAST_WAVE41_COMMENT);
  const foreignInWindow = foreign.filter(c => inWindow(c.created_at));
  const pemTouches = stoneRecent.filter(c =>
    /edverify|pem|sign|verify|key/i.test(`${c.commit.message}`));
  const pemPRs = stonePRs.filter(p =>
    /edverify|pem|sign|verify|key/i.test(`${p.title} ${p.body ?? ""}`));
  return {
    pulled_at_utc: new Date().toISOString(),
    pong49_issue: {
      url: issue.html_url, state: issue.state, comments_count: issue.comments,
      updated_at: issue.updated_at, title: issue.title
    },
    pong49_comments_total: comments.length,
    pong49_authors: [...new Set(comments.map(c => c.user && c.user.login))],
    pong49_foreign_comments_ever: foreign.length,
    pong49_foreign_in_registered_window: foreignInWindow.map(c => ({
      id: c.id, login: c.user.login, created_at: c.created_at, url: c.html_url
    })),
    comments_after_our_wave41_5858861919: afterOurLast.map(c => ({
      id: c.id, login: c.user.login, created_at: c.created_at, url: c.html_url
    })),
    pong_replied_since_5858861919: afterOurLast.some(c => c.user && c.user.login === FLEET_LOGIN && Number(c.id) !== OUR_LAST_WAVE41_COMMENT),
    pong_main: {
      default_branch: pongRepo.default_branch, sha: pongHead.sha, date: pongHead.commit.author.date,
      message: pongHead.commit.message.split("\n")[0],
      moved_past_wave41_base_1da41be: !pongHead.sha.startsWith("1da41be"),
      html_url: pongHead.html_url
    },
    quilt_stone: {
      default_branch: stoneRepo.default_branch, issues_enabled: stoneRepo.has_issues,
      open_issues_count: stoneRepo.open_issues_count, pushed_at: stoneRepo.pushed_at,
      head: stoneHead.sha, head_message: stoneHead.commit.message.split("\n")[0], head_date: stoneHead.commit.author.date,
      recent_commits_touching_edverify_pem_sign: pemTouches.map(c => ({
        sha: c.sha.slice(0, 12), date: c.commit.author.date, message: c.commit.message.split("\n")[0]
      })),
      prs_touching_edverify_pem_sign: pemPRs.map(p => ({
        no: p.number, state: p.state, merged_at: p.merged_at, title: p.title, html_url: p.html_url
      }))
    }
  };
}

// ---------------------------------------------------------------- verdict (only AFTER close)
function resolveOutcome(state) {
  const hits = state.pong49_foreign_in_registered_window;
  const outcome = hits.length > 0 ? 1 : 0;
  return {
    question: "p_pong49_external_comment",
    registered_text: "any comment authored by an account whose login is not 'SuperInstance' on SuperInstance/pong-quilt #49 within [2026-09-27T10:04:00Z, 2026-09-29T10:04:00Z] = 1, else 0",
    outcome, outcome_label: outcome === 1 ? "FOREIGN_REPLY" : "NO_FOREIGN_REPLY",
    evidence: hits,
    evidence_kind: hits.length ? "GitHub API comments list (non-SuperInstance authors in window)" : "GitHub API comments list: zero non-SuperInstance authors in window"
  };
}

function computeScores(state) {
  const res = resolveOutcome(state);
  const prices = PRICES.map(pr => ({ ...pr, brier: r2(brierBinary(pr.p, res.outcome)) }));
  // registered battery mean: mean Brier over RESOLVED noul questions (registration scoring_rule):
  // 3 already keeper-sealed (r8) + this one resolved at close = 4/4.
  const laneBriers = [...R8_SEALED_RESOLVED.map(r => r.lane_brier)];
  const jevBriers = [...R8_SEALED_RESOLVED.map(r => r.jev_brier)];
  const lanePong = prices.find(p => p.predictor === "lane_37a_jev_smith").brier;
  const jevPong = prices.find(p => p.predictor === "jev_r8_battery").brier;
  laneBriers.push(lanePong); jevBriers.push(jevPong);
  const mean = (a) => r2(a.reduce((s, x) => s + x, 0) / a.length);
  const mc = Object.fromEntries(Object.entries(MULTICLASS_ANNEX.prices).map(([k, probs]) =>
    [k, r2(brierMulticlass(probs, MULTICLASS_ANNEX.outcome))]));
  return {
    resolution: res,
    prices,
    battery_noul_mean_4_questions: {
      lane_37a: mean(laneBriers), jev_r8: mean(jevBriers),
      includes: "3 keeper-sealed r8 resolutions carried verbatim + pong49 resolved at close",
      excludes: "guest_surviving_standing (score type; keeper: unresolvable — excluded per registered unresolved_policy); guest_c5_stance is choice-type, scored in the multiclass annex",
      r8_running_3_resolved_reference: { jev: 0.3211, lane: 0.1327, source: "tavern/jev_battery_scores_r8.json#running_brier_3_resolved" }
    },
    multiclass_annex: { ...MULTICLASS_ANNEX, brier: mc }
  };
}

// ---------------------------------------------------------------- outputs
function mdFrom(scorecard) {
  const s = scorecard;
  const L = [];
  L.push(`# pong49 scorecard — ${s.status}`);
  L.push("");
  L.push(`- generated_at: ${s.generated_at_utc}`);
  L.push(`- window: [${WINDOW_OPEN}, ${WINDOW_CLOSE}] (registered in tavern/jev_calibration_battery_r8.json #scoring_rule.resolution_sources.c_pong49)`);
  L.push(`- runner: lane 42-d (pong-scorer); scorer: embassy/battery/pong49_scorer.mjs (no deps, read-only API, zero foreign writes)`);
  L.push("");
  if (s.status === "PREMATURE") {
    L.push(`**VERDICT WITHHELD — PREMATURE.** Now = ${s.now_utc} is before window close ${WINDOW_CLOSE}. Exit code 2. No outcome resolved, no Brier emitted; interim state below is read-only observation, not a verdict.`);
    L.push("");
    L.push("## Interim state (receipt)");
    L.push("```json");
    L.push(jstr(s.interim_state));
    L.push("```");
  } else {
    const r = s.scores.resolution;
    L.push(`## Resolution (AS OF close)`);
    L.push(`- outcome: **${r.outcome}** (${r.outcome_label})`);
    L.push(`- rule: ${r.registered_text}`);
    L.push(`- evidence: ${r.evidence_kind}${r.evidence.length ? " → " + r.evidence.map(e => `${e.url} (${e.login} @ ${e.created_at})`).join("; ") : ""}`);
    L.push("");
    L.push(`## Brier per predictor (binary, pre-declared rule)`);
    L.push(`| predictor | p | Brier | source |`);
    L.push(`|---|---|---|---|`);
    for (const pr of s.scores.prices) L.push(`| ${pr.predictor} | ${pr.p} | ${pr.brier} | ${pr.source} |`);
    L.push("");
    L.push(`## Registered battery mean (noul questions, now 4/4 resolved)`);
    L.push("```json");
    L.push(jstr(s.scores.battery_noul_mean_4_questions));
    L.push("```");
    L.push("");
    L.push(`## Multiclass annex (guest_c5_stance, keeper-sealed outcome)`);
    L.push("```json");
    L.push(jstr({ ...s.scores.multiclass_annex, brier: s.scores.multiclass_annex.brier }));
    L.push("```");
  }
  L.push("");
  L.push("---");
  L.push(`Registered artifacts (verbatim, not invented): tavern/jev_calibration_battery_r8.json (lane 0.07 / JEV r8 0.15), tavern/jev_remap_r9_rows.jsonl (JEV r9 priors 0.13 / 0.14). Everything not in the registration (sign-lane fix landed, letter acknowledged, …) is watch context only and is NEVER scored here.`);
  return L.join("\n") + "\n";
}

function writeScorecard(scorecard) {
  const jsonPath = join(HERE, "pong49_scorecard.json");
  const mdPath = join(HERE, "pong49_scorecard.md");
  writeFileSync(jsonPath, jstr(scorecard) + "\n");
  writeFileSync(mdPath, mdFrom(scorecard));
  return { jsonPath, mdPath };
}

// ---------------------------------------------------------------- main
async function main() {
  const now = new Date();
  const nowIso = now.toISOString();
  const premature = now.getTime() < Date.parse(WINDOW_CLOSE);

  console.error(`[pong49-scorer 42-d] now=${nowIso} window_close=${WINDOW_CLOSE} premature=${premature}`);

  let state;
  try {
    state = await pullState();
  } catch (e) {
    console.error(`[pong49-scorer 42-d] FAIL-CLOSED: ${e.message}`);
    console.error(`[pong49-scorer 42-d] no scorecard written (fail-closed law: no scorecard without data).`);
    process.exit(1);
  }

  const interim = interimStateFrom(state);

  if (premature) {
    const scorecard = {
      status: "PREMATURE",
      verdict: null,
      generated_at_utc: nowIso,
      now_utc: nowIso,
      window: { open: WINDOW_OPEN, close: WINDOW_CLOSE },
      premature_receipt: {
        guard: "hard-coded WINDOW_CLOSE 2026-09-29T10:04:00Z; this run refused to resolve the outcome or emit any Brier because now < close",
        exit_code: 2,
        keeper_instruction: "re-run AFTER 2026-09-29T10:04:00Z to score (exit 0). Interim state below is observation only.",
        registration_note: "the registration contains exactly ONE pong49 outcome (p_pong49_external_comment) priced by lane 37-a (0.07) and JEV r8 (0.15), with r9 remap priors 0.13/0.14. No 'sign-lane fix landed' / 'letter acknowledged' outcome was ever registered — nothing else will be scored."
      },
      interim_state: interim
    };
    const { jsonPath, mdPath } = writeScorecard(scorecard);
    console.error(`[pong49-scorer 42-d] PREMATURE receipt written (verdict withheld):`);
    console.error(`  ${jsonPath}`);
    console.error(`  ${mdPath}`);
    console.error(`[pong49-scorer 42-d] interim: #49 comments=${interim.pong49_comments_total} authors=${JSON.stringify(interim.pong49_authors)} foreign_in_window=${interim.pong49_foreign_in_registered_window.length} after_5858861919=${interim.comments_after_our_wave41_5858861919.length} pong_main=${interim.pong_main.sha.slice(0, 7)} stone_main=${interim.quilt_stone.head.slice(0, 7)}`);
    process.exit(2);
  }

  // after close: resolve + score
  const scores = computeScores(interim);
  const scorecard = {
    status: "SCORED",
    verdict: "emitted",
    generated_at_utc: nowIso,
    window: { open: WINDOW_OPEN, close: WINDOW_CLOSE },
    resolved_at_utc: nowIso,
    scores,
    interim_state_at_resolution: interim
  };
  const { jsonPath, mdPath } = writeScorecard(scorecard);
  console.error(`[pong49-scorer 42-d] SCORED. outcome=${scores.resolution.outcome} (${scores.resolution.outcome_label})`);
  for (const pr of scores.prices) console.error(`  ${pr.predictor}: p=${pr.p} brier=${pr.brier}`);
  console.error(`  battery_noul_mean: lane=${scores.battery_noul_mean_4_questions.lane_37a} jev=${scores.battery_noul_mean_4_questions.jev_r8}`);
  console.error(`  written: ${jsonPath}`);
  console.error(`           ${mdPath}`);
  process.exit(0);
}

main().catch(e => {
  console.error(`[pong49-scorer 42-d] FAIL-CLOSED: ${e.message}`);
  process.exit(1);
});
