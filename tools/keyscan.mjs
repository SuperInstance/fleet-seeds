#!/usr/bin/env node
// keyscan.mjs — the fleet's widened class-of-secret scanner (fleet table-read
// "compile next" item: the published class list was teaching its own bypass).
//
//   node tools/keyscan.mjs staged          # scan `git diff --cached` (pre-commit)
//   node tools/keyscan.mjs tree [ref]      # scan the whole tree at ref (default HEAD)
//   node tools/keyscan.mjs files <f>...    # scan explicit files
//
// Exit 0 = clean (or allowlisted doc-class only, each printed for eyeballing).
// Exit 1 = credential-class hit(s) — DO NOT PUSH. Names the file, line, class.
// Never prints the secret material itself, only the match shape and location.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// The widened classes (fleet table-read, unlocked door #2): the old list only
// caught exact prefixes we had already leaked. These catch the families.
const CLASSES = [
  { name: "groq", re: /gsk_[A-Za-z0-9]{20,}/ },
  { name: "openai-style", re: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "openai-project", re: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: "github-pat", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "github-fine", re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: "cloudflare", re: /cfut_[A-Za-z0-9_-]{20,}/ },
  { name: "mothquantum", re: /(?<![A-Za-z0-9_-])moth_[A-Za-z0-9]{22}(?![A-Za-z0-9_-])/ },
  { name: "typesafe", re: /apikey_[A-Za-z0-9_]{20,}/ },
  { name: "aws-access-key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "slack-token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "google-api", re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: "deepinfra", re: /sk-di-[A-Za-z0-9_-]{20,}/ },
  { name: "bearer-header", re: /Bearer\s+[A-Za-z0-9._-]{25,}/ },
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
];
// doc-class allowlist: matches that are the fleet talking ABOUT scanning, not
// secrets. Each is still printed so a human eyeballs the delta.
const DOC_CLASS = [
  /gsk_\|sk-\|ghp_\|apikey_\|cfut_\|moth_/,
  /sk-`-substring|`sk-` false-positive|scan-pattern|key-scan|keyscan/i,
  /disk-level|Task-|ta\*\*sk-s\*\*uggested/,
  /^(#|\/\/|\*)/ && /class-of-secret|secret-shape|credential-class/,
];

const scan = (text, source) => {
  const hits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const c of CLASSES) {
      const m = lines[i].match(c.re);
      if (!m) continue;
      if (DOC_CLASS.some((d) => d.test(lines[i]))) {
        hits.push({ source, line: i + 1, class: "DOC (allowlisted)", snippet: lines[i].trim().slice(0, 90) });
      } else {
        hits.push({ source, line: i + 1, class: `CREDENTIAL (${c.name})`, snippet: lines[i].trim().slice(0, 40) + "…[redacted]" });
      }
    }
  }
  return hits;
};

const mode = process.argv[2];
let targets = [];
if (mode === "staged") {
  const diff = execSync("git diff --cached --unified=0", { encoding: "utf8", maxBuffer: 1 << 28 });
  targets.push(["staged-diff", diff]);
} else if (mode === "tree") {
  const ref = process.argv[3] ?? "HEAD";
  const files = execSync(`git ls-tree -r ${ref} --name-only`, { encoding: "utf8" }).split("\n").filter(Boolean);
  for (const f of files) {
    try { targets.push([f, execSync(`git show ${ref}:${JSON.stringify(f)}`, { encoding: "utf8", maxBuffer: 1 << 26 })]); }
    catch { /* binary or gone — skip */ }
  }
} else if (mode === "files") {
  for (const f of process.argv.slice(3)) {
    try { targets.push([f, fs.readFileSync(f, "utf8")]); }
    catch (e) { console.error(`skip ${f}: ${e.message.slice(0, 60)}`); }
  }
} else {
  console.error("usage: keyscan.mjs staged | tree [ref] | files <f>...");
  process.exit(2);
}

const all = targets.flatMap(([src, text]) => scan(text, src));
const cred = all.filter((h) => h.class.startsWith("CREDENTIAL"));
const doc = all.filter((h) => h.class === "DOC (allowlisted)");
for (const h of doc) console.log(`DOC      ${h.source}:${h.line}  ${h.snippet}`);
for (const h of cred) console.error(`CRED     ${h.source}:${h.line}  ${h.class}  ${h.snippet}`);
if (cred.length) {
  console.error(`\nREFUSED: ${cred.length} credential-class hit(s). Do not push. Rotate if already pushed.`);
  process.exit(1);
}
console.log(`\nCLEAN (0 credential-class hits; ${doc.length} doc-class allowlisted, eyeball above).`);
