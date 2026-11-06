#!/usr/bin/env node
/**
 * Export the validated data and content as COPY files for Postgres/Supabase.
 *
 *   node pipeline/export-db.mjs [outDir=build/db]
 *   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f build/db/load.sql
 *
 * load.sql runs in one transaction and tags the import with the pack version.
 * Curated content is loaded as 'published', because v16 already shows it to users;
 * the reviewer columns stay empty until someone signs each item off.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { verseTable, validateAll } from "./validate.mjs";
import { loadInputs } from "./inputs.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "build/db"));
const input = loadInputs();
const report = validateAll(input);
if (report.errors.length) {
  console.error(report.errors.join("\n"));
  process.exit(1);
}

const { core } = input;
const vt = verseTable(core.books);
const chapterOf = new Uint16Array(vt.total);
core.books.forEach((b, bi) => vt.chapterStart[bi].forEach((s, ci) => chapterOf.fill(ci + 1, s, s + b.ch[ci])));
const keyOf = (i) => {
  const b = vt.bookOf[i], c = chapterOf[i];
  return (b + 1) * 1e6 + c * 1e3 + (i - vt.chapterStart[b][c - 1] + 1);
};
const version = crypto.createHash("sha256").update(JSON.stringify(input.sources) + input.kjv.length + core.xrefs.fv.length).digest("hex").slice(0, 12);

/* COPY text format */
const cell = (v) => {
  if (v === null || v === undefined) return "\\N";
  if (Array.isArray(v)) return "{" + v.map((x) => (typeof x === "number" ? x : '"' + String(x).replace(/["\\]/g, "\\$&") + '"')).join(",") + "}";
  return String(v).replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
};
fs.mkdirSync(OUT, { recursive: true });
const tables = [];
function table(name, cols, rows) {
  const file = `${name}.tsv`;
  const fd = fs.openSync(path.join(OUT, file), "w");
  let n = 0;
  for (const r of rows) {
    fs.writeSync(fd, r.map(cell).join("\t") + "\n");
    n++;
  }
  fs.closeSync(fd);
  tables.push({ name, cols, file, n });
}

const VERSIONS = [
  ["kjv", "King James Version (1769)", "en", "kjv"],
  ["bsb", "Berean Standard Bible", "en", "bsb"],
  ["asv", "American Standard Version (1901)", "en", "asv"],
  ["bbe", "Bible in Basic English", "en", "bbe"],
  ["ylt", "Young's Literal Translation (1898)", "en", "ylt"],
  ["darby", "Darby Translation (1890)", "en", "darby"],
  ["webster", "Webster's Bible (1833)", "en", "webster"],
  ["tel", "Telugu Bible, Old Version", "te", "telugu-ov"],
  ["irv", "Telugu Indian Revised Version 2019", "te", "telugu-irv"],
];
const srcById = Object.fromEntries(input.sources.datasets.map((d) => [d.id, d]));

table("dataset_versions", ["id", "notes"], [[version, "v16 snapshot, Phase 1 migration"]]);
table("sources", ["id", "name", "url", "licence", "attribution", "origin", "dataset_version", "share_alike"],
  input.sources.datasets.map((d) => [d.id, d.name, d.url || null, d.licence, d.attribution || "", d.origin || null, version, !!d.shareAlike]));
table("books", ["id", "name", "testament", "chapters", "verse_counts"],
  core.books.map((b, i) => [i + 1, b.n, i < 39 ? "OT" : "NT", b.ch.length, b.ch]));
table("versions", ["code", "name", "language", "licence", "source_id"],
  VERSIONS.map(([code, name, lang, src]) => [code, name, lang, srcById[src].licence, src]));
table("verses", ["version_code", "verse_key", "text"], (function* () {
  for (const [code] of VERSIONS) {
    const lines = code === "kjv" ? input.kjv : input.assets["v_" + code].split("\n");
    for (let i = 0; i < lines.length; i++) if (lines[i].trim()) yield [code, keyOf(i), lines[i]];
  }
})());
// The full OpenBible set (about 345,000 links, both Testaments). The wheel's
// 42,732 rows are the OT<->NT subset with 3+ votes; validate.mjs checks that.
const OB = input.openbible;
table("cross_refs", ["from_key", "to_start", "to_end", "votes", "source_id", "dataset_version"], (function* () {
  for (let i = 0; i < OB.from.length; i++) yield [keyOf(OB.from[i]), keyOf(OB.ts[i]), keyOf(OB.te[i]), OB.votes[i], "openbible-xrefs", version];
})());

const lexRows = [];
for (const [k, lang] of [["lexh", "hbo"], ["lexg", "grc"]]) {
  for (const [strongs, e] of Object.entries(JSON.parse(input.assets[k]))) lexRows.push([strongs, lang, e[0], e[1], e[2], e[3], e[4], e[5] ?? null]);
}
// Some Strong's numbers appear in both lexicons (Greek entries for Hebrew names); keep the first.
const seen = new Set();
table("lexicon", ["strongs", "language", "lemma", "translit", "gloss", "definition", "morph", "occurrences"],
  lexRows.filter((r) => (seen.has(r[0]) ? false : seen.add(r[0]))));
table("words", ["verse_key", "position", "word", "translit", "gloss", "strongs"], (function* () {
  for (let b = 0; b < 66; b++) {
    const W = JSON.parse(input.assets["w" + String(b + 1).padStart(2, "0")]);
    for (const [cv, list] of Object.entries(W)) {
      const [c, v] = cv.split(":").map(Number);
      const key = (b + 1) * 1e6 + c * 1e3 + v;
      for (let p = 0; p < list.length; p++) yield [key, p + 1, list[p][0], list[p][1], list[p][2], list[p][3] || null];
    }
  }
})());

/* curated content */
const J = input.journeys;
table("citations", ["id", "name", "url"], J.sources.map((s) => [String(s.id), s.name, s.url]));
table("journey_groups", ["id", "name", "color", "blurb", "ord"], J.meta.map((m, i) => [m.id, m.name, m.color, m.blurb, i]));
table("journeys", ["id", "group_id", "ord", "title", "text", "christian_reading", "other_views", "status"],
  J.items.map((it, i) => [it.id, it.j, i, it.title, it.text, it.christian || null, it.views || null, "published"]));
table("journey_passages", ["journey_id", "side", "ord", "start_key", "end_key"],
  J.items.flatMap((it) => ["ot", "nt"].flatMap((s) => it[s].map((r, k) => [it.id, s.toUpperCase(), k, keyOf(r.s), keyOf(r.e)]))));
table("journey_citations", ["journey_id", "citation_id"], J.items.flatMap((it) => it.src.map((s) => [it.id, String(s)])));
table("evidence", ["id", "ord", "layer", "title", "kid", "place", "grade", "what", "shows", "limits", "faith", "icon", "see", "status"],
  input.evidence.map((e, i) => [e.id, i, e.layer, e.title, e.kid, e.place, e.grade, e.what, e.shows, e.limits, e.faith, e.icon, e.see, "published"]));
table("evidence_sources", ["evidence_id", "ord", "title", "url"], input.evidence.flatMap((e) => e.src.map((s, k) => [e.id, k, s.t, s.u])));
const bookId = Object.fromEntries(core.books.map((b, i) => [b.n, i + 1]));
table("evidence_books", ["evidence_id", "book_id"], input.evidence.flatMap((e) => [...new Set(e.books || [])].map((b) => [e.id, bookId[b]])));
table("stories", ["id", "title"], [["main", "The story of Jesus, Genesis to Revelation"]]);
table("story_steps", ["story_id", "step", "journey_id", "chapter_title", "kid_text", "evidence_ids", "status"],
  input.story.map((s, i) => ["main", i + 1, s.id, s.chapter, s.kid, s.ev, "published"]));
table("qa", ["id", "ord", "question", "answer", "general", "journey_ids", "evidence_ids", "status"],
  input.qa.map((a, i) => [a.id, i, a.q, a.a, !!a.gen, a.items, a.ev, "published"]));
table("qa_sources", ["qa_id", "ord", "title", "url"], input.qa.flatMap((a) => a.src.map((s, k) => [a.id, k, s.t, s.u])));

/* Theographic people, places and events */
const TG = input.theographic, keys = (vs) => vs.map(keyOf);
table("people", ["id", "name", "gender", "birth_year", "death_year", "verse_keys", "source_id"],
  TG.people.map((p) => [p.id, p.name, p.gender, p.birthYear, p.deathYear, keys(p.verses), "theographic"]));
table("places", ["id", "name", "latitude", "longitude", "feature_type", "comment", "verse_keys", "source_id"],
  TG.places.map((p) => [p.id, p.name, p.lat, p.lon, p.type, p.comment, keys(p.verses), "theographic"]));
table("events", ["id", "title", "start_year", "duration", "verse_keys", "source_id"],
  TG.events.map((e) => [e.id, e.title, e.startYear, e.duration, keys(e.verses), "theographic"]));
const REL = { father: "father", mother: "mother", partners: "partner", children: "child", siblings: "sibling" };
table("person_relations", ["person_id", "relation", "related_id"],
  TG.people.flatMap((p) => Object.entries(REL).flatMap(([k, r]) => [...new Set(p[k])].map((x) => [p.id, r, x]))));
table("person_places", ["person_id", "kind", "place_id"],
  TG.people.flatMap((p) => [...[...new Set(p.birthPlace)].map((x) => [p.id, "birth", x]), ...[...new Set(p.deathPlace)].map((x) => [p.id, "death", x])]));
table("event_participants", ["event_id", "person_id"], TG.events.flatMap((e) => [...new Set(e.participants)].map((x) => [e.id, x])));

/* load script: one transaction, in dependency order */
const sql = [
  "\\set ON_ERROR_STOP on",
  "begin;",
  ...tables.map((t) => `\\copy ${t.name} (${t.cols.join(", ")}) from '${t.file}'`),
  "commit;",
  "",
].join("\n");
fs.writeFileSync(path.join(OUT, "load.sql"), sql);
fs.writeFileSync(path.join(OUT, "counts.json"), JSON.stringify(Object.fromEntries(tables.map((t) => [t.name, t.n])), null, 1) + "\n");
console.log(`dataset ${version}: ` + tables.map((t) => `${t.name} ${t.n}`).join(", "));
