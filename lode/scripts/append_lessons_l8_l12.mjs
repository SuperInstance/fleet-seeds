// append_lessons_l8_l12.mjs — wave-62 keeper fold: M2 lesson-objects (GEPA
// reflective lessons + prime-agent Continual Harness). Five lessons: two from
// wave-61's receipted honest catches (queue item 6), three from wave-62 itself.
// Append-only, validated with --against.
import { readFileSync, copyFileSync, appendFileSync } from 'node:fs';

const rows = [
  {
    id: 'L8',
    ts: '2026-09-29T15:50:00Z',
    cls: 'gates-work',
    claim: 'A schema/law gate that REJECTS an append pre-push is the system working, not a failure: roll back byte-exact from the pre-backup, fix the row, re-seal. The M11 first-append rejection by lode_validate (nearest_prior must be a mine ID) proved the M1 gate live before any bad row reached the ledger.',
    evidence: 'wave-61: M11 append rejected -> rolled back from .pre-m11 byte-exact -> re-sealed; lode_validate selftest 7/7; THE GATE WORKS receipted',
    status: 'standing',
  },
  {
    id: 'L9',
    ts: '2026-09-29T15:50:00Z',
    cls: 'keyscan-false-positive-class',
    claim: 'Key-scan hits on raw web pages can be coincidental substrings inside base64url bundles (charset includes "~"): do not delete evidence and do not commit raw — extract the clean text, leave the raw page uncommitted with a provenance note + sha256, receipt the exclusion.',
    evidence: 'wave-61: dwarkesh raw page flagged on "sk-azu77…" inside a web-bundle; extracted transcript 80,041 chars committed CLEAN; .gitignore entry receipts the exclusion',
    status: 'standing',
  },
  {
    id: 'L10',
    ts: '2026-09-29T15:50:00Z',
    cls: 'credential-store-ephemeral',
    claim: 'The sandbox can roll back /home/z/my-project/.env between incarnations (wave-62 start: only DATABASE_URL survived). Credentials must be re-verified at wave start (names-only, never values); recovery path = surviving .git/config remotes verified live vs api.github.com before re-arm; a token that lived only in conversation context is LOST on compaction — keep .env authoritative.',
    evidence: 'wave-62: .env found bare; GITHUB_TOKEN re-armed from a surviving .git/config (verified login=SuperInstance, never echoed); moth+typesafe restored from w56_recover_creds.mjs; unauthenticated API fire attempt fail-closed HTTP 403 before re-arm',
    status: 'standing',
  },
  {
    id: 'L11',
    ts: '2026-09-29T15:50:00Z',
    cls: 'marker-channel-mismatch',
    claim: 'Dedup/exclusion markers must be matched in a CHANNEL-INDEPENDENT form: colon-form arXiv markers ("arxiv:ID") never match URL-form refs ("arxiv.org/abs/ID"); a law can hold everywhere it is testable and still be structurally violated on an untested channel. Match on normalized bare ids extracted from both channels, and receipt source+ref in every exclusion.',
    evidence: 'wave-62 engine run-5: QRNG drew c3 = arXiv:2609.26457 = already-mined M3/M4/M7 (colon marker vs URL ref); root cause + fix receipted in run-5 review-c3-assessment.md; run-6 history.json is the regression test',
    status: 'fixed-in-engine',
  },
  {
    id: 'L12',
    ts: '2026-09-29T15:50:00Z',
    cls: 'overlay-mode-noise',
    claim: 'The container overlay filesystem reports file modes (0644/0755) nondeterministically between git invocations, producing phantom dirty trees (166 -> 44 entries between two commands with zero writes). Set core.fileMode=false per lane and classify diffs by --numstat content before any restore; never trust mode-only diffs as evidence of work.',
    evidence: 'wave-62: all four lanes showed mass mode flips with 0 insertions/deletions; core.fileMode=false set; content verified clean via --numstat',
    status: 'mitigated',
  },
];

const f = 'lode/lessons.jsonl';
copyFileSync(f, f + '.pre-l12');
for (const r of rows) appendFileSync(f, JSON.stringify(r) + '\n');
console.log('L8-L12 appended');
