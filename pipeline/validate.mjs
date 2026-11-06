/**
 * Data checks that block a bad import. Every rule here maps to the handover's
 * "Validate" step: complete versions, links that point at real verses, content
 * that only references things that exist, and a licence for every pack.
 */
export const TOTAL_VERSES = 31102;
/** Versions that leave some verses empty on purpose (later manuscripts). */
const MAX_EMPTY_VERSES = 20;

export function verseTable(books) {
  const bookOf = new Uint8Array(TOTAL_VERSES);
  const chapterStart = []; // [book][chapter-1] -> global index of verse 1
  let v = 0;
  books.forEach((b, bi) => {
    chapterStart.push([]);
    b.ch.forEach((n) => {
      chapterStart[bi].push(v);
      for (let i = 0; i < n; i++) bookOf[v + i] = bi;
      v += n;
    });
  });
  return { total: v, bookOf, chapterStart };
}

const isUrl = (u) => typeof u === "string" && /^https?:\/\/\S+$/.test(u);

export function validateAll(input) {
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const { core, kjv, journeys, story, evidence, qa, sources, assets } = input;

  /* books + verse numbering */
  if (core.books.length !== 66) err(`expected 66 books, found ${core.books.length}`);
  const vt = verseTable(core.books);
  if (vt.total !== TOTAL_VERSES) err(`books add up to ${vt.total} verses, expected ${TOTAL_VERSES}`);
  core.books.forEach((b, i) => { if ((b.t === 0) !== (i < 39)) err(`book ${b.n} has wrong testament flag`); });
  const inRange = (v) => Number.isInteger(v) && v >= 0 && v < TOTAL_VERSES;

  /* complete versions */
  const versions = { kjv, ...Object.fromEntries(Object.entries(assets).filter(([k]) => k.startsWith("v_")).map(([k, t]) => [k, t.split("\n")])) };
  for (const [k, lines] of Object.entries(versions)) {
    if (lines.length !== TOTAL_VERSES) { err(`${k}: ${lines.length} verses, expected ${TOTAL_VERSES}`); continue; }
    const empty = lines.reduce((n, l) => n + (l.trim() ? 0 : 1), 0);
    if (empty > MAX_EMPTY_VERSES) err(`${k}: ${empty} empty verses (max ${MAX_EMPTY_VERSES})`);
    else if (empty) warn(`${k}: ${empty} empty verses`);
  }
  if (!versions.v_tel) err("Telugu version (v_tel) is missing");

  /* cross-references: every link points at a real verse, OT on one end and NT on the other */
  const X = core.xrefs, n = X.fv.length;
  for (const k of ["ts", "te", "vo", "d"]) if (X[k].length !== n) err(`xrefs.${k} has ${X[k].length} rows, expected ${n}`);
  let badX = 0;
  for (let i = 0; i < n; i++) {
    const ok = inRange(X.fv[i]) && inRange(X.ts[i]) && inRange(X.te[i]) && X.ts[i] <= X.te[i] &&
      (X.d[i] === 0 || X.d[i] === 1) && Number.isFinite(X.vo[i]);
    const ot = X.d[i] ? X.ts[i] : X.fv[i], nt = X.d[i] ? X.fv[i] : X.ts[i];
    if (!ok || vt.bookOf[ot] >= 39 || vt.bookOf[nt] < 39) { if (badX++ < 5) err(`xref row ${i} is invalid`); }
  }
  if (badX > 5) err(`...and ${badX - 5} more invalid xref rows`);
  for (const v of core.vn) if (!inRange(v)) { err(`vn has out-of-range verse ${v}`); break; }

  /* journeys */
  const srcIds = new Set(journeys.sources.map((s) => s.id));
  journeys.sources.forEach((s) => { if (!isUrl(s.url)) err(`journey source ${s.id} has no valid url`); });
  const metaIds = new Set(journeys.meta.map((m) => m.id));
  const jIds = new Set();
  for (const it of journeys.items) {
    if (jIds.has(it.id)) err(`duplicate journey id ${it.id}`);
    jIds.add(it.id);
    if (!metaIds.has(it.j)) err(`journey ${it.id} has unknown group ${it.j}`);
    for (const side of ["ot", "nt"]) {
      if (!it[side]?.length) err(`journey ${it.id} has no ${side} passage`);
      for (const r of it[side] || []) {
        if (!inRange(r.s) || !inRange(r.e) || r.s > r.e) err(`journey ${it.id} has a bad ${side} range`);
        else if (vt.bookOf[r.s] !== r.b || vt.bookOf[r.e] !== r.b) err(`journey ${it.id}: ${side} range is not in book ${r.b}`);
        else if ((side === "ot") !== (r.b < 39)) err(`journey ${it.id}: ${side} passage is in the wrong testament`);
      }
    }
    for (const s of it.src) if (!srcIds.has(s)) err(`journey ${it.id} cites missing source ${s}`);
    if (!it.title || !it.text) err(`journey ${it.id} is missing title or text`);
  }
  for (const k of Object.keys(journeys.jv)) if (!inRange(+k)) err(`journeys.jv has bad verse key ${k}`);

  /* evidence */
  const bookNames = new Set(core.books.map((b) => b.n));
  const evIds = new Set();
  for (const e of evidence) {
    if (evIds.has(e.id)) err(`duplicate evidence id ${e.id}`);
    evIds.add(e.id);
    if (!["ot", "jesus", "church", "apostles"].includes(e.layer)) err(`evidence ${e.id} has unknown layer ${e.layer}`);
    if (!e.src?.length) err(`evidence ${e.id} has no sources`);
    for (const s of e.src || []) if (!isUrl(s.u)) err(`evidence ${e.id} has a source with no valid url`);
    for (const b of e.books || []) if (!bookNames.has(b)) err(`evidence ${e.id} names unknown book ${b}`);
  }

  /* story */
  if (story.length !== 16) warn(`story has ${story.length} steps (v16 had 16)`);
  for (const s of story) {
    if (!jIds.has(s.id)) err(`story step ${s.id} has no journey`);
    for (const e of s.ev) if (!evIds.has(e)) err(`story step ${s.id} links missing evidence ${e}`);
  }

  /* Q&A */
  for (const a of qa) {
    for (const i of a.items) if (!jIds.has(i)) err(`Q&A ${a.id} links missing journey ${i}`);
    for (const e of a.ev) if (!evIds.has(e)) err(`Q&A ${a.id} links missing evidence ${e}`);
    if (!a.src?.length) err(`Q&A ${a.id} has no sources`);
    for (const s of a.src || []) if (!isUrl(s.u)) err(`Q&A ${a.id} has a source with no valid url`);
  }

  /* Hebrew and Greek words */
  const lex = { lexh: JSON.parse(assets.lexh || "{}"), lexg: JSON.parse(assets.lexg || "{}") };
  let words = 0, noLex = 0;
  for (let b = 0; b < 66; b++) {
    const key = "w" + String(b + 1).padStart(2, "0");
    if (!assets[key]) { err(`words pack ${key} is missing`); continue; }
    const W = JSON.parse(assets[key]), L = lex[b < 39 ? "lexh" : "lexg"];
    for (const [cv, list] of Object.entries(W)) {
      const [c, v] = cv.split(":").map(Number);
      // Psalms: verse 0 holds the title line ("A Psalm of David"), numbered separately in Hebrew.
      const minV = b === 18 ? 0 : 1;
      if (!(c >= 1 && c <= core.books[b].ch.length && v >= minV && v <= core.books[b].ch[c - 1])) {
        err(`${key}: verse key ${cv} does not exist in ${core.books[b].n}`);
        continue;
      }
      for (const w of list) { words++; if (w[3] && !L[w[3]]) noLex++; }
    }
  }
  if (noLex / Math.max(words, 1) > 0.02) err(`${noLex} of ${words} words have no lexicon entry (over 2%)`);
  else if (noLex) warn(`${noLex} of ${words} words have no lexicon entry`);

  /* licences: every pack must be covered by a dataset in data/sources.json */
  const covered = new Set(sources.datasets.flatMap((d) => d.packs));
  for (const d of sources.datasets) if (!d.licence) err(`dataset ${d.id} has no licence`);
  const packs = ["core", "kjv", "journeys", "story", "evidence", "qa", ...Object.keys(assets)];
  for (const p of packs) {
    const group = /^w\d\d$/.test(p) ? "words" : /^lex/.test(p) ? "lex" : p;
    if (!covered.has(group) && !covered.has(p)) err(`pack ${p} has no licence entry in data/sources.json`);
  }

  return { errors, warnings };
}
