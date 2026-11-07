/**
 * The Treasury of Scripture Knowledge (about 1880; CrossWire SWORD module "TSK" 1.4,
 * DistributionLicense=Public Domain), read from the pinned module files and turned
 * into verse-to-verse links in the app's KJV numbering.
 *
 * Each verse's entry lists a key word, then references, in TSK's short form:
 *   "Lu 2:14; Ro 5:8; 2Co 5:19-21; 1Jo 4:9,10,19"
 * A reference without a book stays in the book last named (or the verse's own book),
 * "C:V" sets the chapter, and a bare number is a verse in the current chapter:
 *   in John 3:16, "1:14,18" is John 1:14 and 1:18, and "15" is John 3:15.
 * The chapter outline at the top of each chapter (references with a passage="..."
 * attribute) only lists that chapter's own sections, so it is not counted as links.
 */
import path from "node:path";
import fs from "node:fs";
import { readZText } from "./sword.mjs";
import { OSIS } from "./normalize.mjs";
import { verseTable } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

/** TSK's book abbreviations, in Bible order (all 66 seen in the module). */
export const TSK_BOOKS = ["Ge", "Ex", "Le", "Nu", "De", "Jos", "Jud", "Ru", "1Sa", "2Sa", "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Ne", "Es", "Job", "Ps", "Pr", "Ec", "So", "Isa", "Jer", "La", "Eze", "Da", "Ho", "Joe", "Am", "Ob", "Jon", "Mic", "Na", "Hab", "Zep", "Hag", "Zec", "Mal",
  "Mt", "Mr", "Lu", "Joh", "Ac", "Ro", "1Co", "2Co", "Ga", "Eph", "Php", "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jas", "1Pe", "2Pe", "1Jo", "2Jo", "3Jo", "Jude", "Re"];
const BOOK = new Map(TSK_BOOKS.map((b, i) => [b, i]));

/**
 * Parse one <scripRef> list. ctx = { b, c } (0-based book, chapter) of the verse.
 * Returns [{ b, c, v, c2, v2 }] and the parts it could not read.
 */
export function parseRefs(list, ctx) {
  const out = [], bad = [];
  let b = ctx.b, c = ctx.c;
  for (let part of list.split(/[;,]/)) {
    part = part.replace(/\*[^:]*:?/g, " ").trim(); // margin notes such as "*marg:" or "*Gr:"
    if (!part) continue;
    const m = /^(?:([1-3]?[A-Z][a-z]+)\s+)?(?:(\d+):)?(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/.exec(part);
    if (!m) { bad.push(part); continue; }
    const [, book, ch, v, ch2, v2] = m;
    if (book) {
      if (!BOOK.has(book)) { bad.push(part); continue; }
      b = BOOK.get(book);
      if (!ch) { bad.push(part); continue; } // "Ps 23" alone (a whole chapter) is not a verse link
    }
    if (ch) c = +ch;
    const end = v2 ? { c2: ch2 ? +ch2 : c, v2: +v2 } : { c2: c, v2: +v };
    out.push({ b, c, v: +v, ...end });
    if (ch2) c = +ch2;
  }
  return { refs: out, bad };
}

export function loadTsk(books) {
  const vt = verseTable(books);
  const versification = { ot: books.slice(0, 39).map((b, i) => [OSIS[i], b.ch]), nt: books.slice(39).map((b, i) => [OSIS[i + 39], b.ch]) };
  const kjvOsis = [], where = [];
  books.forEach((bk, bi) => bk.ch.forEach((n, ci) => { for (let v = 1; v <= n; v++) { kjvOsis.push(`${OSIS[bi]}.${ci + 1}.${v}`); where.push({ b: bi, c: ci + 1 }); } }));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "pipeline/sources.lock.json"), "utf8"));
  const version = lock.files.find((f) => f.id === "tsk").version;
  const { lines, errors } = readZText(path.join(ROOT, "data/raw/tsk", version), versification, kjvOsis, {}, { raw: true });
  const at = (b, c, v) => (b >= 0 && b < 66 && c >= 1 && c <= books[b].ch.length && v >= 1 && v <= books[b].ch[c - 1] ? vt.chapterStart[b][c - 1] + v - 1 : -1);
  const links = new Map(); // "a|s|e" -> { a, s, e }
  let refs = 0, unreadable = 0, offBible = 0, self = 0;
  const unreadableSamples = [];
  lines.forEach((entry, a) => {
    for (const m of entry.matchAll(/<scripRef>([\s\S]*?)<\/scripRef>/g)) {
      const { refs: rs, bad } = parseRefs(m[1].replace(/<[^>]+>/g, " "), where[a]);
      unreadable += bad.length;
      if (bad.length && unreadableSamples.length < 12) unreadableSamples.push(`${kjvOsis[a]}: ${bad.join(" | ")}`);
      for (const r of rs) {
        refs++;
        const s = at(r.b, r.c, r.v), e = at(r.b, r.c2, r.v2);
        if (s < 0 || e < 0 || e < s) { offBible++; continue; }
        if (s <= a && a <= e && s === e) { self++; continue; }
        links.set(`${a}|${s}|${e}`, { a, s, e });
      }
    }
  });
  const errs = errors.map((e) => "TSK: " + e);
  if (offBible > refs * 0.005) errs.push(`TSK: ${offBible} of ${refs} references point at verses that do not exist`);
  if (unreadable > refs * 0.005) errs.push(`TSK: ${unreadable} reference parts could not be read`);
  return { links: [...links.values()], stats: { refs, links: links.size, unreadable, offBible, self }, unreadableSamples, errors: errs };
}
