/**
 * Hebrew and Greek words and their meanings, read directly from STEPBible
 * (TAHOT, TAGNT, TBESH, TBESG; CC BY 4.0) and the Dodson Greek lexicon (CC0),
 * all pinned in pipeline/sources.lock.json.
 *
 * Output, in the shape the reader already uses:
 *   words[book] = { "chapter:verse": [[original, transliteration, gloss here, Strong's, grammar, dictionary meaning], ...] }
 *   lexh / lexg = { "H1254A": [lemma, transliteration, short meaning, definition, part of speech, uses], ... }
 * Verse numbers are the English (KJV) ones; Psalm titles are verse 0.
 */
import { upstream } from "./normalize.mjs";

const TAHOT = ["Gen-Deu", "Jos-Est", "Job-Sng", "Isa-Mal"].map((r) => `Translators Amalgamated OT+NT/TAHOT ${r} - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`);
const TAGNT = ["Mat-Jhn", "Act-Rev"].map((r) => `Translators Amalgamated OT+NT/TAGNT ${r} - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`);
const TBESH = "Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt";
const TBESG = "Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt";

const REF = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+=(\S+)$/;

/** STEPBible's own definition text: line breaks kept, markup removed. */
export function plainText(html) {
  return (html || "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();
}

/** "{H7225G=רֵאשִׁית=: beginning»first:1_beginning}" -> "beginning" */
function hebrewMeaning(expanded, strong) {
  const m = new RegExp(`\\{${strong}=[^=]*=([^}]*)\\}`).exec(expanded || "");
  if (!m) return "";
  return m[1].replace(/^[:\s]+/, "").split(/[»@]/)[0].replace(/_/g, " ").trim();
}

/** Books in the order the files list them, mapped to the app's 0-65 numbering. */
function parseRows(paths, isHebrew, bookBase, errors) {
  const order = [], books = [];
  for (const p of paths) {
    for (const line of upstream(p).split("\n")) {
      const cols = line.split("\t");
      const m = REF.exec(cols[0]);
      if (!m) continue;
      const [, abbr, c, v, type] = m;
      // Hebrew: leave out the written-but-not-read ketiv forms (K...); keep the read text.
      // Greek: keep words found in Nestle-Aland (N) or the KJV's Greek text (K), in either case.
      if (isHebrew ? /^K/.test(type) : !/[NnKk]/.test(type)) continue;
      let bi = order.indexOf(abbr);
      if (bi < 0) { order.push(abbr); bi = order.length - 1; books.push({}); }
      const key = `${+c}:${+v}`;
      let w;
      if (isHebrew) {
        const strong = (/\{(H\d+[A-Za-z]?)\}/.exec(cols[4]) || /(H\d+[A-Za-z]?)(?!.*H\d)/.exec(cols[4]) || [])[1] || "";
        w = [cols[1].replace(/[/\\]/g, ""), cols[2].replace(/[/\\.]/g, ""), cols[3].replace(/\/\s*/g, " ").trim(), strong, cols[5] || "", hebrewMeaning(cols[11], strong)];
      } else {
        const gm = /^(.*?)\s*\((.*)\)$/.exec(cols[1]) || [, cols[1], ""];
        const [strong, grammar = ""] = (cols[3] || "").split("=");
        const [, lemmaGloss = ""] = (cols[4] || "").split("=");
        w = [gm[1].trim(), gm[2].trim(), (cols[2] || "").trim(), strong.trim(), grammar.trim(), lemmaGloss.trim()];
      }
      if (!w[0]) continue; // STEPBible marks a few textual gaps with an empty "[ ]" row
      (books[bi][key] ||= []).push(w);
    }
  }
  if (order.length !== (isHebrew ? 39 : 27)) errors.push(`STEPBible: found ${order.length} ${isHebrew ? "Old" : "New"} Testament books`);
  return books.map((b, i) => ({ book: bookBase + i, words: b }));
}

function lexicon(path, prefix, errors) {
  const out = {};
  for (const line of upstream(path).split("\n")) {
    const c = line.split("\t");
    if (!/^[HG]\d/.test(c[0] || "") || !c[1]) continue;
    const key = (c[1] || "").split(/\s/)[0]; // "H1254A =" -> H1254A (column 3 can be a cross-reference)
    if (!key.startsWith(prefix)) { errors.push(`STEPBible lexicon ${prefix}: entry ${key} is not ${prefix === "H" ? "Hebrew" : "Greek"}`); continue; }
    if (!out[key]) out[key] = [c[3] || "", c[4] || "", (c[6] || "").trim(), plainText(c[7]), c[5] || "", 0];
  }
  return out;
}

/** Dodson (CC0): plain English Greek definitions, keyed by Strong's number. */
function dodson() {
  const rows = upstream("dodson.csv").split("\n").slice(1);
  const out = new Map();
  for (const r of rows) {
    const c = r.split("\t").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"'));
    if (/^\d+$/.test(c[0] || "")) out.set("G" + c[0].padStart(4, "0"), { brief: c[3] || "", longer: c[4] || "" });
  }
  return out;
}

export function loadStepBible() {
  const errors = [];
  const books = [...parseRows(TAHOT, true, 0, errors), ...parseRows(TAGNT, false, 39, errors)];
  const lexh = lexicon(TBESH, "H", errors), lexg = lexicon(TBESG, "G", errors);

  // Greek definitions: Dodson's plain English in place of the long scholarly entry.
  const dod = dodson();
  for (const [k, e] of Object.entries(lexg)) {
    const d = dod.get(k.replace(/[A-Za-z]$/, ""));
    e[3] = d ? (d.longer || d.brief) : "";
    if (!e[2] && d) e[2] = d.brief;
  }
  // Uses in the Bible, counted from the words themselves.
  for (const { book, words } of books) {
    const lx = book < 39 ? lexh : lexg;
    for (const list of Object.values(words)) for (const w of list) if (lx[w[3]]) lx[w[3]][5]++;
  }
  return { books, lexh, lexg, errors };
}
