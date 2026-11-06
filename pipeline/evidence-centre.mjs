/**
 * Evidence Centre content: the six pillars and their items (content/evidence-centre/).
 * Items are drafts until a named reviewer signs them off; validation enforces the
 * honesty rules: every item has sources, says what it does not show, and links
 * only to verses that exist.
 */
import fs from "node:fs";
import path from "node:path";
import { verseTable } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "content/evidence-centre");

export const PILLARS = ["spiritual", "historical", "scientific", "theological", "archaeological", "geographical"];
export const STRENGTHS = ["strong", "moderate", "preliminary", "debated", "tradition", "testimony"];
export const KINDS = ["prophecy", "testimony", "text", "manuscript", "study", "argument", "artifact", "inscription", "site", "tomb"];
export const STATUSES = ["draft", "in_review", "published"];

export function loadEvidenceCentre() {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  return { pillars: read("pillars.json"), items: read("items.json"), existingMap: read("existing-map.json") };
}

/** "2 Kings 18:13-16", "John 19:41", "Revelation 21:1-4", "Genesis 23:17-2:3" -> [first, last] verse positions, or null. */
export function parseRef(ref, books) {
  const m = /^(.+?) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/.exec(ref.trim());
  if (!m) return null;
  const b = books.findIndex((x) => x.n === m[1]);
  if (b < 0) return null;
  const { chapterStart } = verseTable(books);
  const at = (c, v) => (c >= 1 && c <= books[b].ch.length && v >= 1 && v <= books[b].ch[c - 1] ? chapterStart[b][c - 1] + v - 1 : -1);
  const c1 = +m[2], v1 = +m[3];
  const c2 = m[4] ? +m[4] : c1, v2 = m[5] ? +m[5] : v1;
  const s = at(c1, v1), e = at(c2, v2);
  return s < 0 || e < 0 || e < s ? null : [s, e];
}

const isUrl = (u) => typeof u === "string" && /^https:\/\/[^\s]+\.[^\s]+/.test(u);
const text = (x, min = 1) => typeof x === "string" && x.trim().length >= min;

export function validateEvidenceCentre(ec, { books, evidence }) {
  const errors = [], warnings = [];
  const err = (m) => errors.push("Evidence Centre: " + m);

  const pillarIds = ec.pillars.map((p) => p.id);
  if (JSON.stringify([...pillarIds].sort()) !== JSON.stringify([...PILLARS].sort())) err(`pillars must be exactly ${PILLARS.join(", ")}`);

  const existingIds = new Set(evidence.map((e) => e.id));
  for (const id of existingIds) if (!PILLARS.includes(ec.existingMap[id])) err(`existing evidence ${id} has no pillar in existing-map.json`);
  for (const id of Object.keys(ec.existingMap)) if (!id.startsWith("_") && !existingIds.has(id)) err(`existing-map.json names unknown evidence ${id}`);

  const ids = new Set();
  for (const it of ec.items) {
    const at = `item ${it.id}`;
    if (!/^[a-z0-9-]+$/.test(it.id || "")) err(`${at}: id must be lower-case words joined by hyphens`);
    if (ids.has(it.id) || existingIds.has(it.id)) err(`${at}: duplicate id`);
    ids.add(it.id);
    if (!PILLARS.includes(it.pillar)) err(`${at}: unknown pillar ${it.pillar}`);
    if (!KINDS.includes(it.kind)) err(`${at}: unknown kind ${it.kind}`);
    if (!STRENGTHS.includes(it.strength)) err(`${at}: unknown strength ${it.strength}`);
    if (!STATUSES.includes(it.status)) err(`${at}: unknown status ${it.status}`);
    if (it.status === "published" && !text(it.reviewedBy)) err(`${at}: published items need a named reviewer`);
    for (const f of ["title", "summary", "shows", "era"]) if (!text(it[f])) err(`${at}: missing ${f}`);
    // The brand promise: every item says plainly what it does NOT show.
    if (!text(it.limits, 20)) err(`${at}: "limits" must say what the evidence does not show`);
    if (["debated", "preliminary"].includes(it.strength) && !/disput|debat|prelim|not (yet|confirmed)|argue|unconfirmed/i.test(it.limits)) {
      err(`${at}: a ${it.strength} item must say so in "limits"`);
    }
    if (!Array.isArray(it.sources) || it.sources.length < 2) err(`${at}: needs at least 2 sources`);
    for (const s of it.sources || []) {
      if (!text(s.title) || !text(s.publisher)) err(`${at}: every source needs a title and publisher`);
      if (!isUrl(s.url)) err(`${at}: source URL must be https: ${s.url}`);
    }
    for (const r of it.verses || []) if (!parseRef(r, books)) err(`${at}: verse "${r}" does not exist`);
    for (const k of ["yearFrom", "yearTo", "discovered"]) {
      if (it[k] !== null && !Number.isInteger(it[k])) err(`${at}: ${k} must be a whole year or null`);
    }
    if (it.discovered !== null && (it.discovered < 1700 || it.discovered > new Date().getFullYear())) err(`${at}: discovered year out of range`);
    for (const v of it.videos || []) if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v.url || "")) err(`${at}: videos must be YouTube links`);
  }
  for (const p of PILLARS) {
    const n = ec.items.filter((i) => i.pillar === p).length + Object.values(ec.existingMap).filter((x) => x === p).length;
    if (n < 2) warnings.push(`Evidence Centre: pillar "${p}" has only ${n} item(s)`);
  }
  return { errors, warnings };
}
