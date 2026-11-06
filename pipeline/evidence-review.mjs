#!/usr/bin/env node
/**
 * Write docs/evidence-review.md: every Evidence Centre item with its sources,
 * grouped by pillar, for a human reviewer to sign off. Re-run after editing
 * content/evidence-centre/items.json (npm run evidence:review).
 */
import fs from "node:fs";
import path from "node:path";
import { loadEvidenceCentre } from "./evidence-centre.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ec = loadEvidenceCentre();
const existing = JSON.parse(fs.readFileSync(path.join(ROOT, "content/evidence.json"), "utf8"));
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

const out = ["# Evidence Centre: review sheet", "",
  "Generated from `content/evidence-centre/` by `npm run evidence:review`. Do not edit by hand.", "",
  "Every new item below is a **draft**. To publish one, a named reviewer checks the summary, the limits and each source, then sets `status` to `published` and `reviewedBy` to their name.", ""];
for (const p of ec.pillars.sort((a, b) => a.ord - b.ord)) {
  const items = ec.items.filter((i) => i.pillar === p.id);
  const old = existing.filter((e) => ec.existingMap[e.id] === p.id);
  out.push(`## ${p.ord}. ${p.title}`, "", `*${p.question}*`, "", p.scope, "");
  if (items.length) {
    out.push("| Item | Strength | Era | Verses | Does not show | Sources |", "|---|---|---|---|---|---|");
    for (const i of items) {
      const src = i.sources.map((s) => `[${cell(s.publisher)}](${s.url})`).join("<br>");
      out.push(`| **${cell(i.title)}**<br>${cell(i.summary)} | ${i.strength} | ${cell(i.era)}${i.discovered ? `<br>found ${i.discovered}` : ""} | ${cell(i.verses.join("; "))} | ${cell(i.limits)} | ${src} |`);
    }
    out.push("");
  }
  if (old.length) out.push(`Already in the app (reviewed in v16): ${old.map((e) => e.title).join("; ")}.`, "");
}
const n = ec.items.length + existing.length;
out.push(`**Total: ${ec.items.length} new draft items + ${existing.length} existing = ${n}.**`, "");
fs.writeFileSync(path.join(ROOT, "docs/evidence-review.md"), out.join("\n"));
console.log(`docs/evidence-review.md: ${n} items`);
