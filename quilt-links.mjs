#!/usr/bin/env node
// quilt-links.mjs — render the Reader's Fold. Zero dependencies. Node >=18.
//   node quilt-links.mjs                 # rewrite this repo's README block from .quilt/links.yml
//   node quilt-links.mjs --graph ./fleet # scan a dir of clones -> FLEET.md + graph.mmd
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ORG = "https://github.com/SuperInstance";
const url = r => r.includes("/") ? `https://github.com/${r}` : `${ORG}/${r}`;

// --- tiny YAML subset parser: flat map -> (scalar | nested map | list of flat maps | list of scalars) ---
// list-vs-map is decided lazily by the first child, so `upstream:` (a map) and `substrate:` (a list) both parse.
function parseLinks(text) {
  const out = {}; let key = null, item = null;
  for (let raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "").replace(/^#.*$/, "");
    if (!line.trim()) continue;
    const top = line.match(/^(\w+):\s*(.*)$/);          // `key:` or `key: value` (column 0)
    if (top) { key = top[1]; const v = top[2].trim(); item = null; out[key] = v || undefined; continue; }
    const li = line.match(/^\s*-\s*(\w+):\s*(.*)$/);     // `- k: v` — first field of a list item
    if (li && key) { if (!Array.isArray(out[key])) out[key] = []; item = { [li[1]]: li[2].trim() }; out[key].push(item); continue; }
    const scalar = line.match(/^\s*-\s*(.+)$/);          // `- value` — scalar list item
    if (scalar && key) { if (!Array.isArray(out[key])) out[key] = []; out[key].push(scalar[1].trim()); item = null; continue; }
    const kv = line.match(/^\s+(\w+):\s*(.*)$/);         // `  k: v` — later list-item field OR map field
    if (kv && key) {
      if (item) item[kv[1]] = kv[2].trim();             // later field of the current list item
      else { if (typeof out[key] !== "object" || out[key] === null || Array.isArray(out[key])) out[key] = {}; out[key][kv[1]] = kv[2].trim(); }
      continue;
    }
  }
  return out;   // lenient: unknown keys pass through, missing lists/maps are absent
}

function render(m) {
  const L = [];
  L.push(`## Cross-pollination — the Reader's Fold\n`);
  L.push(`*Part of the **${m.family || "quilt"}** family. Under [Law 6](${ORG}/jev-quilt), this repo carries no verdicts about its neighbors — only content-addressed pointers you fold under your own weights.*\n`);
  if (m.upstream?.repo) L.push(`**Folded from** — [${m.upstream.repo}](${url(m.upstream.repo)})${m.upstream.why ? ` — ${m.upstream.why}` : ""}\n`);
  const subs = (m.substrate || []).map(s => `[${s.repo}](${url(s.repo)})${s.at ? ` \`@${s.at}\`` : ""}`);
  if (subs.length) L.push(`**Grown on** — ${subs.join(", ")}\n`);
  if ((m.provides || []).length) L.push(`**Provides** (fold these from here)\n` + m.provides.map(p => `- \`${p.id}\` — ${p.what || ""}`).join("\n") + "\n");
  if ((m.consumes || []).length) L.push(`**Consumes** (folded from elsewhere)\n` + m.consumes.map(c => `- [${c.repo}](${url(c.repo)})${c.at ? ` \`@${c.at}\`` : ""} — ${c.what || ""}`).join("\n") + "\n");
  if ((m.related || []).length) L.push(`**Related** (1-hop siblings — Law 7)\n` + m.related.map(r => `- [${r.repo}](${url(r.repo)}) — ${r.why || ""}`).join("\n") + "\n");
  L.push(`<sub>Regenerate: \`node quilt-links.mjs\` · Fleet map: [FLEET.md](${ORG}/fleet-seeds/blob/main/FLEET.md)</sub>`);
  return L.join("\n");
}

const START = "<!-- QUILT:LINKS:START — generated from .quilt/links.yml by quilt-links.mjs. Do not edit by hand. -->";
const END = "<!-- QUILT:LINKS:END -->";

function writeBlock() {
  if (!existsSync(".quilt/links.yml")) { console.log("no manifest, nothing to render"); return; }
  const m = parseLinks(readFileSync(".quilt/links.yml", "utf8"));
  if (!m.repo) { console.error("FATAL: .quilt/links.yml has no `repo:` — nothing changed"); process.exit(1); }
  const block = `${START}\n${render(m)}\n${END}`;
  let md = existsSync("README.md") ? readFileSync("README.md", "utf8") : "# " + m.repo + "\n";
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (re.test(md)) md = md.replace(re, block);
  else if (/^## License/m.test(md)) md = md.replace(/^## License/m, block + "\n\n## License");
  else md = md.replace(/\s*$/, "\n\n") + block + "\n";
  writeFileSync("README.md", md);
  console.log(`rendered ${((m.substrate||[]).length + (m.consumes||[]).length + (m.related||[]).length)} edges into README.md`);
}

function graph(dir) {
  const nodes = new Set(), edges = [];
  for (const d of readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory())) {
    const p = join(dir, d.name, ".quilt/links.yml");
    if (!existsSync(p)) { nodes.add(d.name); continue; }   // island: node only
    const m = parseLinks(readFileSync(p, "utf8")); const self = m.repo || d.name; nodes.add(self);
    for (const s of m.substrate || []) { nodes.add(s.repo); edges.push([self, s.repo, "==>", "grown on"]); }
    for (const c of m.consumes || []) { nodes.add(c.repo); edges.push([self, c.repo, "-.->", "consumes"]); }
    for (const r of m.related || []) { nodes.add(r.repo); edges.push([self, r.repo, "---", "related"]); }
    if (m.upstream?.repo) { nodes.add(m.upstream.repo); edges.push([self, m.upstream.repo, "===>", "fork of"]); }
  }
  const id = s => s.replace(/[^\w]/g, "_");
  const mmd = ["graph LR", ...[...nodes].map(n => `  ${id(n)}["${n}"]`),
    ...edges.map(([a, b, e, l]) => `  ${id(a)} ${e}|${l}| ${id(b)}`)].join("\n");
  writeFileSync("graph.mmd", mmd);
  const rows = edges.map(([a, b, , l]) => `| ${a} | ${l} | ${b} |`).join("\n");
  writeFileSync("FLEET.md", `# Fleet map — the quilt fold\n\n${nodes.size} repos, ${edges.length} edges. Regenerated by \`quilt-links.mjs --graph\`.\n\n\`\`\`mermaid\n${mmd}\n\`\`\`\n\n| from | edge | to |\n|---|---|---|\n${rows}\n`);
  console.log(`graph: ${nodes.size} nodes, ${edges.length} edges -> FLEET.md, graph.mmd`);
}

const gi = process.argv.indexOf("--graph");
if (gi >= 0) graph(process.argv[gi + 1] || ".");
else writeBlock();
