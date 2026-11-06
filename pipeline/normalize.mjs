/**
 * Step 2 of the pipeline: turn each upstream file into the app's verse numbering.
 * Every function returns { data, errors } and never guesses: a reference that
 * cannot be placed on a real verse is reported, not silently dropped.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { verseTable } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "pipeline/sources.lock.json"), "utf8"));

/** Read a pinned upstream file (see pipeline/fetch.mjs). */
export function upstream(p) {
  const f = lock.files.find((x) => x.path === p);
  if (!f) throw new Error(`${p} is not in sources.lock.json`);
  const file = path.join(ROOT, "data/raw", f.id, f.commit.slice(0, 12), path.basename(f.path) + ".gz");
  if (!fs.existsSync(file)) throw new Error(`${file} is missing; run npm run fetch`);
  return zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
}

export const OSIS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev"];

export function verseIndexer(books) {
  const vt = verseTable(books);
  const osis = new Map(OSIS.map((o, i) => [o, i]));
  /** 0-based book, 1-based chapter/verse -> position, or -1 */
  const at = (b, c, v) => (b >= 0 && b < 66 && c >= 1 && c <= books[b].ch.length && v >= 1 && v <= books[b].ch[c - 1] ? vt.chapterStart[b][c - 1] + v - 1 : -1);
  /** "John.3.16" -> position, or -1 */
  const fromOsis = (ref) => {
    const m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(ref);
    return m && osis.has(m[1]) ? at(osis.get(m[1]), +m[2], +m[3]) : -1;
  };
  return { vt, at, fromOsis };
}

/* ---------- Berean Standard Bible (CSV: Book,Chapter,Verse,Text) ---------- */

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const roman = (n) => n.replace(/^III /, "3 ").replace(/^II /, "2 ").replace(/^I /, "1 ").replace(/^Revelation of John$/, "Revelation");

export function loadBsb(books) {
  const { at } = verseIndexer(books);
  const names = new Map(books.map((b, i) => [b.n, i]));
  const lines = new Array(31102).fill("");
  const errors = [];
  const rows = parseCsv(upstream("formats/csv/BSB.csv"));
  if (rows[0].join(",") !== "Book,Chapter,Verse,Text") errors.push("BSB: unexpected CSV header " + rows[0].join(","));
  for (const r of rows.slice(1)) {
    if (r.length === 1 && !r[0]) continue;
    const b = names.get(roman(r[0])), i = b === undefined ? -1 : at(b, +r[1], +r[2]);
    if (i < 0) { errors.push(`BSB: no verse ${r[0]} ${r[1]}:${r[2]}`); continue; }
    if (lines[i]) errors.push(`BSB: duplicate ${r[0]} ${r[1]}:${r[2]}`);
    lines[i] = r[3].trim();
  }
  return { data: lines, errors };
}

/* ---------- OpenBible.info cross-references (TSV: From, To, Votes) ---------- */

export function loadOpenBible(books) {
  const { fromOsis } = verseIndexer(books);
  const text = upstream("sources/extras/cross_references.txt").split("\n");
  const header = text[0];
  const from = [], ts = [], te = [], votes = [];
  const errors = [];
  let bad = 0;
  for (let k = 1; k < text.length; k++) {
    const line = text[k].trim();
    if (!line) continue;
    const [f, t, v] = line.split("\t");
    const [t0, t1 = t0] = (t || "").split("-");
    const a = fromOsis(f), s = fromOsis(t0), e = fromOsis(t1);
    if (a < 0 || s < 0 || e < 0 || s > e || !/^-?\d+$/.test(v)) {
      if (bad++ < 10) errors.push(`OpenBible line ${k + 1}: cannot place "${line}"`);
      continue;
    }
    from.push(a); ts.push(s); te.push(e); votes.push(+v);
  }
  return { data: { header, from, ts, te, votes, unplaced: bad }, errors: bad > 50 ? [...errors, `OpenBible: ${bad} lines could not be placed`] : [] };
}

/* ---------- Theographic people, places and events ---------- */

export function loadTheographic(books) {
  const { fromOsis } = verseIndexer(books);
  const errors = [];
  const verses = JSON.parse(upstream("json/verses.json"));
  const recVerse = new Map();
  for (const v of verses) {
    const i = fromOsis(v.fields.osisRef);
    if (i < 0) errors.push(`Theographic: verse ${v.fields.osisRef} does not exist`);
    else recVerse.set(v.id, i);
  }
  const vlist = (ids, what) => {
    const out = [];
    for (const id of ids || []) {
      const i = recVerse.get(id);
      if (i === undefined) errors.push(`Theographic: ${what} points at unknown verse record ${id}`);
      else out.push(i);
    }
    return [...new Set(out)].sort((a, b) => a - b);
  };
  const num = (x) => (x === undefined || x === null || x === "" || isNaN(+x) ? null : +x);
  const people = JSON.parse(upstream("json/people.json"));
  const places = JSON.parse(upstream("json/places.json"));
  const events = JSON.parse(upstream("json/events.json"));
  const pid = new Map(people.map((p) => [p.id, p.fields.personLookup]));
  const plid = new Map(places.map((p) => [p.id, p.fields.placeLookup]));
  const refs = (ids, map) => (ids || []).map((id) => map.get(id)).filter(Boolean);

  const P = people.map(({ fields: f }) => ({
    id: f.personLookup,
    name: f.displayTitle || f.name,
    gender: f.gender || null,
    birthYear: num(f.birthYear),
    deathYear: num(f.deathYear),
    father: refs(f.father, pid),
    mother: refs(f.mother, pid),
    partners: refs(f.partners, pid),
    children: refs(f.children, pid),
    siblings: refs(f.siblings, pid),
    birthPlace: refs(f.birthPlace, plid),
    deathPlace: refs(f.deathPlace, plid),
    verses: vlist(f.verses, "person " + f.personLookup),
  }));
  const L = places.map(({ fields: f }) => ({
    id: f.placeLookup,
    name: f.displayTitle || f.kjvName,
    type: f.featureType || null,
    lat: num(f.openBibleLat ?? f.latitude),
    lon: num(f.openBibleLong ?? f.longitude),
    comment: f.comment || null,
    verses: vlist(f.verses, "place " + f.placeLookup),
  }));
  const E = events.map(({ fields: f }) => ({
    id: "event_" + f.eventID,
    title: f.title,
    startYear: num(f.startDate),
    duration: f.duration || null,
    participants: refs(f.participants, pid),
    verses: vlist(f.verses, "event " + f.eventID),
  }));
  for (const [what, list] of [["person", P], ["place", L], ["event", E]]) {
    const seen = new Set();
    for (const x of list) {
      if (!x.id || !x.name && !x.title) errors.push(`Theographic: ${what} without id or name`);
      if (seen.has(x.id)) errors.push(`Theographic: duplicate ${what} ${x.id}`);
      seen.add(x.id);
      if (x.lat !== undefined && x.lat !== null && (x.lat < -90 || x.lat > 90 || x.lon < -180 || x.lon > 180)) errors.push(`Theographic: place ${x.id} has bad coordinates`);
    }
  }
  return { data: { people: P, places: L, events: E }, errors };
}
