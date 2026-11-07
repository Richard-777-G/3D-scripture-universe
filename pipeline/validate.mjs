/**
 * Data checks that block a bad import. Every rule here maps to the handover's
 * "Validate" step: complete versions, links that point at real verses, content
 * that only references things that exist, and a licence for every pack.
 */
import { validateEvidenceCentre } from "./evidence-centre.mjs";
import { documentFrequency, judge, TIER } from "./connections.mjs";
import { unpack, LABEL } from "./allconnections.mjs";

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
  for (const e of input.importErrors || []) err(e);

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
  if (X.fe && X.fe.length !== n) err(`xrefs.fe has ${X.fe.length} rows, expected ${n}`);
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
  // Truth checks for the word study: right script, right dictionary, a traceable meaning.
  const HEB = /[\u0590-\u05FF]/, GRK = /[\u0370-\u03FF\u1F00-\u1FFF]/;
  for (const [k, prefix, name] of [["lexh", "H", "Hebrew"], ["lexg", "G", "Greek"]]) {
    const wrong = Object.keys(lex[k]).filter((s) => !s.startsWith(prefix));
    if (wrong.length) err(`${name} lexicon holds ${wrong.length} entries from the other language (e.g. ${wrong[0]})`);
  }
  let wrongScript = 0, noMeaning = 0;
  for (let b = 0; b < 66; b++) {
    const key = "w" + String(b + 1).padStart(2, "0");
    if (!assets[key]) continue;
    for (const list of Object.values(JSON.parse(assets[key]))) for (const w of list) {
      const ok = b < 39 ? HEB.test(w[0]) && !GRK.test(w[0]) : GRK.test(w[0]) && !HEB.test(w[0]);
      if (!ok) wrongScript++;
      if (w.length >= 6 && !w[5] && !(lex[b < 39 ? "lexh" : "lexg"][w[3]] || [])[2]) noMeaning++;
    }
  }
  if (wrongScript) err(`${wrongScript} words are in the wrong script for their Testament`);
  if (noMeaning > 100) err(`${noMeaning} words have no meaning from STEPBible or the lexicon`);
  if (noLex / Math.max(words, 1) > 0.02) err(`${noLex} of ${words} words have no lexicon entry (over 2%)`);
  else if (noLex) warn(`${noLex} of ${words} words have no lexicon entry`);

  /* provenance: every link the app shows is an OpenBible candidate or a sourced journey
     link, and re-judging it against the text gives the same evidence level. */
  if (input.openbible && input.texts) {
    const ob = input.openbible, cand = new Set();
    for (let i = 0; i < ob.from.length; i++) {
      const a = vt.bookOf[ob.from[i]] < 39;
      if (a === vt.bookOf[ob.ts[i]] < 39) continue;
      cand.add(a ? `${ob.from[i]}|${ob.from[i]}|${ob.ts[i]}|${ob.te[i]}` : `${ob.ts[i]}|${ob.te[i]}|${ob.from[i]}|${ob.from[i]}`);
    }
    const journeyPairs = new Set(journeys.items.flatMap((it) => it.ot.flatMap((o) => it.nt.map((n) => `${o.s}|${o.e}|${n.s}|${n.e}`))));
    const df = documentFrequency(input.texts.kjv), texts = [input.texts.kjv, input.texts.bsb];
    let unsourced = 0, wrong = 0;
    for (let i = 0; i < n; i++) {
      const fe = X.fe ? X.fe[i] : X.fv[i], k = `${X.fv[i]}|${fe}|${X.ts[i]}|${X.te[i]}`;
      if (X.vo[i] === TIER.sourced) { if (!journeyPairs.has(k)) unsourced++; continue; }
      if (!cand.has(k)) { unsourced++; continue; }
      if (judge([X.fv[i], fe], [X.ts[i], X.te[i]], texts, df).tier !== X.vo[i]) wrong++;
    }
    if (unsourced) err(`${unsourced} links are neither OpenBible candidates nor sourced journey links`);
    if (wrong) err(`${wrong} links carry an evidence level the text does not support`);
    if (ob.from.length < 340000) err(`OpenBible has only ${ob.from.length} links`);
    if (ob.unplaced) err(`OpenBible: ${ob.unplaced} links could not be placed on a verse`);
  }

  /* Theographic: family, places and participants must point at records that exist */
  if (input.theographic) {
    const { people, places, events } = input.theographic;
    const pIds = new Set(people.map((p) => p.id)), plIds = new Set(places.map((p) => p.id));
    let broken = 0;
    for (const p of people) {
      for (const k of ["father", "mother", "partners", "children", "siblings"]) for (const r of p[k]) if (!pIds.has(r)) broken++;
      for (const k of ["birthPlace", "deathPlace"]) for (const r of p[k]) if (!plIds.has(r)) broken++;
    }
    for (const e of events) for (const r of e.participants) if (!pIds.has(r)) broken++;
    if (broken) err(`Theographic: ${broken} links to people or places that do not exist`);
    if (people.length < 3000 || places.length < 1200 || events.length < 400) err("Theographic: fewer records than expected");
    const noVerse = people.filter((p) => !p.verses.length).length;
    if (noVerse) warn(`Theographic: ${noVerse} people have no verses`);
  }

  /* All connections: every OpenBible row is kept, every TSK link is present, and every label is earned */
  if (input.openbible && input.texts && assets.xon && assets.xin) {
    const xon = unpack(JSON.parse(assets.xon)), xin = unpack(JSON.parse(assets.xin));
    const ob = input.openbible, tskLinks = (input.tsk && input.tsk.links) || [];
    const key = (a, s, e) => `${a}|${s}|${e}`;
    const obKeys = new Map();
    for (let i = 0; i < ob.from.length; i++) obKeys.set(key(ob.from[i], ob.ts[i], ob.te[i]), ob.votes[i]);
    const tskKeys = new Set(tskLinks.map((t) => key(t.a, t.s, t.e)));
    const tskFrom = new Map();
    for (const t of tskLinks) { if (!tskFrom.has(t.a)) tskFrom.set(t.a, []); tskFrom.get(t.a).push(t); }
    // A row is "listed in TSK" when a TSK link joins the same verses, in either direction.
    const inTsk = (r) => (tskFrom.get(r.a) || []).some((t) => t.s <= r.e && t.e >= r.s) ||
      (r.e - r.s <= 200 && Array.from({ length: r.e - r.s + 1 }, (_, k) => r.s + k).some((x) => (tskFrom.get(x) || []).some((t) => t.s <= r.a && t.e >= r.a)));
    const df = documentFrequency(input.texts.kjv), texts = [input.texts.kjv, input.texts.bsb];
    let obRows = 0, notOb = 0, badVotes = 0, badSide = 0, notTsk = 0, wrongLabel = 0, tskWrong = 0, tskSeen = 0;
    const check = (rows, cross) => rows.forEach((r, i) => {
      if (r.l & LABEL.openbible) {
        obRows++;
        if (!obKeys.has(key(r.a, r.s, r.e))) notOb++;
        else if (obKeys.get(key(r.a, r.s, r.e)) !== r.v) badVotes++;
      } else if (!(r.l & LABEL.tsk) || r.v !== 0 || !tskKeys.has(key(r.a, r.s, r.e))) notTsk++;
      if (r.l & LABEL.tsk) { tskSeen++; if ((i % 25 === 0 || !(r.l & LABEL.openbible)) && !inTsk(r)) tskWrong++; }
      if (((vt.bookOf[r.a] < 39) !== (vt.bookOf[r.s] < 39)) !== cross) badSide++;
      if (!cross && r.l & LABEL.sourced) wrongLabel++;
      // Re-judge every link that claims wording evidence, and a sample of the rest.
      if ((r.l & (LABEL.wording | LABEL.shared)) || i % 40 === 0) {
        if (r.e - r.s > 6) { if (r.l & (LABEL.wording | LABEL.shared)) wrongLabel++; return; }
        const [ot, nt] = cross && vt.bookOf[r.a] >= 39 ? [[r.s, r.e], [r.a, r.a]] : [[r.a, r.a], [r.s, r.e]];
        const j = judge(ot, nt, texts, df);
        if (!!(r.l & LABEL.wording) !== (j.tier >= 20) || !!(r.l & LABEL.shared) !== (j.words.length >= 2)) wrongLabel++;
      }
    });
    check(xon, true);
    check(xin, false);
    if (obRows !== ob.from.length) err(`All connections: ${obRows} links kept, OpenBible has ${ob.from.length}`);
    if (notOb) err(`All connections: ${notOb} links are not in OpenBible`);
    if (badVotes) err(`All connections: ${badVotes} links carry the wrong vote count`);
    if (notTsk) err(`All connections: ${notTsk} links are in neither OpenBible nor TSK`);
    if (badSide) err(`All connections: ${badSide} links are in the wrong Testament pack`);
    if (!tskLinks.length && tskSeen) err(`All connections: ${tskSeen} links say "Listed in TSK" but no TSK source is imported`);
    else if (tskWrong) err(`All connections: ${tskWrong} links say "Listed in TSK" but TSK does not list them`);
    if (wrongLabel) err(`All connections: ${wrongLabel} links carry a label the text does not support`);
    const c = core.counts;
    if (!c || c.all !== xon.length + xin.length || c.otnt !== xon.length || c.openbible !== ob.from.length || c.best !== X.fv.length) err("All connections: the counts the app shows do not match the data");
  }

  /* Map: every place and route is where the sources put it, and says how sure it is */
  if (input.geo) {
    const { places, routes, conf } = input.geo;
    const inBox = (lat, lon) => lat > 0 && lat < 55 && lon > -15 && lon < 70;
    let badPos = 0, badBand = 0, badVerse = 0;
    for (const p of places) {
      if (p.lat != null && !inBox(p.lat, p.lon)) badPos++;
      const b = p.s == null ? "unknown" : p.s >= conf.known ? "known" : p.s >= conf.likely ? "likely" : "debated";
      if (b !== p.b) badBand++;
      for (const v of p.v) if (!(v >= 0 && v < TOTAL_VERSES)) badVerse++;
    }
    if (badPos) err(`Map: ${badPos} places sit outside the Bible world`);
    if (badBand) err(`Map: ${badBand} places show a confidence the source does not give`);
    if (badVerse) err(`Map: ${badVerse} place verse references are not real verses`);
    const noVerse = places.filter((p) => !p.v.length).length;
    if (noVerse > 10) err(`Map: ${noVerse} places have no verses`);
    let badRoute = 0;
    for (const r of routes) for (const part of r.c) for (const [lat, lon] of part) if (!inBox(lat, lon)) badRoute++;
    if (badRoute) err(`Map: ${badRoute} route points sit outside the Bible world`);
  }

  /* Evidence Centre drafts and pillars */
  if (input.evidenceCentre) {
    const r = validateEvidenceCentre(input.evidenceCentre, { books: core.books, evidence });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  /* licences: every pack must be covered by a dataset in data/sources.json */
  const covered = new Set(sources.datasets.flatMap((d) => d.packs));
  for (const d of sources.datasets) if (!d.licence) err(`dataset ${d.id} has no licence`);
  const packs = ["core", "kjv", "journeys", "story", "evidence", "qa", ...Object.keys(assets), ...(input.theographic ? ["people", "places", "events"] : [])];
  for (const p of packs) {
    const group = /^w\d\d$/.test(p) ? "words" : /^lex/.test(p) ? "lex" : p;
    if (!covered.has(group) && !covered.has(p)) err(`pack ${p} has no licence entry in data/sources.json`);
  }

  return { errors, warnings };
}
