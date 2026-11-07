/**
 * Read a SWORD "zText" Bible module (the format eBible.org and CrossWire publish)
 * and return one plain-text string per verse in the app's KJV numbering.
 *
 * File layout, per testament (ot / nt), all integers little-endian:
 *   *.bzs  block index:  [offset u32, compressed size u32, uncompressed size u32]
 *   *.bzv  verse index:  [block u32, offset in block u32, length u16]
 *   *.bzz  zlib-compressed blocks of text
 * Verse-index entries follow the versification with heading slots: two at the
 * start of each testament, one per book and one per chapter (as in pysword).
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

/** Verse-index position of every verse for a versification: Map "Osis.c.v" -> [testament, slot]. */
function verseSlots(versification) {
  const slots = new Map();
  for (const testament of ["ot", "nt"]) {
    let book = 2; // after the two testament heading slots
    for (const [osis, chapters] of versification[testament]) {
      let before = 0;
      chapters.forEach((n, ci) => {
        const chapterStart = book + before + (ci + 1) + 1; // + chapter headings so far + book heading
        for (let v = 1; v <= n; v++) slots.set(`${osis}.${ci + 1}.${v}`, [testament, chapterStart + v - 1]);
        before += n;
      });
      book += chapters.reduce((a, b) => a + b, 0) + chapters.length + 1;
    }
  }
  return slots;
}

/** OSIS markup -> plain verse text: drop notes and headings, keep the words. */
export function osisToText(xml) {
  return xml
    .replace(/<note\b[^>]*\/>/g, "")
    .replace(/<note\b[\s\S]*?<\/note>/g, "")
    .replace(/<title\b[\s\S]*?<\/title>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function readTestament(dir, t) {
  const bzs = fs.readFileSync(path.join(dir, `${t}.bzs`));
  const bzv = fs.readFileSync(path.join(dir, `${t}.bzv`));
  const bzz = fs.readFileSync(path.join(dir, `${t}.bzz`));
  const blocks = new Map();
  const block = (i) => {
    if (!blocks.has(i)) {
      const off = bzs.readUInt32LE(i * 12), size = bzs.readUInt32LE(i * 12 + 4);
      blocks.set(i, zlib.inflateSync(bzz.subarray(off, off + size)));
    }
    return blocks.get(i);
  };
  return (slot) => {
    if ((slot + 1) * 10 > bzv.length) return "";
    const b = bzv.readUInt32LE(slot * 10), o = bzv.readUInt32LE(slot * 10 + 4), n = bzv.readUInt16LE(slot * 10 + 8);
    return n ? block(b).subarray(o, o + n).toString("utf8") : "";
  };
}

/**
 * @param dir         folder holding ot.bz? and nt.bz?
 * @param kjvOsis     the 31,102 KJV verse refs in order ("Gen.1.1" ...)
 * @param versificationFile  a JSON file path, or the versification object itself
 * @param mergeInto   module verses that KJV numbering folds into a neighbour: { "Rev.12.18": ["Rev.13.1", "before"] }
 */
export function readZText(dir, versificationFile, kjvOsis, mergeInto = {}, { raw = false } = {}) {
  const versification = typeof versificationFile === "string" ? JSON.parse(fs.readFileSync(path.join(ROOT, versificationFile), "utf8")) : versificationFile;
  const slots = verseSlots(versification);
  const read = { ot: readTestament(dir, "ot"), nt: readTestament(dir, "nt") };
  const text = (ref) => { const s = slots.get(ref); if (!s) return null; const t = read[s[0]](s[1]); return raw ? t : osisToText(t); };
  const errors = [];
  const lines = kjvOsis.map((ref) => {
    const t = text(ref);
    if (t === null) errors.push(`${ref} is not in the module's versification`);
    return t ?? "";
  });
  const index = new Map(kjvOsis.map((r, i) => [r, i]));
  for (const [ref, [target, where]] of Object.entries(mergeInto)) {
    const t = text(ref), i = index.get(target);
    if (t === null || i === undefined) { errors.push(`cannot merge ${ref} into ${target}`); continue; }
    if (t) lines[i] = where === "before" ? `${t} ${lines[i]}`.trim() : `${lines[i]} ${t}`.trim();
  }
  for (const ref of slots.keys()) if (!index.has(ref) && !(ref in mergeInto)) errors.push(`${ref} has no place in KJV numbering`);
  return { lines, errors };
}
