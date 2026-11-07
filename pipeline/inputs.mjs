/**
 * Everything the pipeline reads, in one place: the v16 snapshot, curated
 * content, the licence register, and the pinned upstream sources normalised
 * to the app's verse numbering.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadBsb, loadOpenBible, loadTheographic, loadTeluguIrv } from "./normalize.mjs";
import { loadEvidenceCentre } from "./evidence-centre.mjs";
import { buildConnections, commonWords, TIER } from "./connections.mjs";
import { verseTable } from "./validate.mjs";
import { loadStepBible } from "./stepbible.mjs";
import { loadPlaces, loadRoutes, loadBase, ERA_ORDER, CONF } from "./geo.mjs";
import { labelAll } from "./allconnections.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const raw = (rel) => zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "data/raw/v16", rel))).toString("utf8");
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

export function loadInputs() {
  const core = JSON.parse(raw("core.json.gz"));
  const assetMap = json("data/raw/v16/assets.json");
  const assets = Object.fromEntries(Object.entries(assetMap).map(([k, rel]) => [k, raw(rel)]));

  const bsb = loadBsb(core.books);
  const openbible = loadOpenBible(core.books);
  const theographic = loadTheographic(core.books);
  const irv = loadTeluguIrv(core.books);
  assets.v_bsb = bsb.data.join("\n");
  assets.v_irv = irv.data.join("\n");
  // Hebrew and Greek words and lexicons straight from pinned STEPBible files
  // (replacing the v16 snapshot), with Dodson's plain-English Greek definitions.
  const step = loadStepBible();
  for (const { book, words } of step.books) assets["w" + String(book + 1).padStart(2, "0")] = JSON.stringify(words);
  assets.lexh = JSON.stringify(step.lexh);
  assets.lexg = JSON.stringify(step.lexg);

  // The map: OpenBible places with confidence, UBS MARBLE routes, Natural Earth base.
  const geoPlaces = loadPlaces(core.books);
  const geoRoutes = loadRoutes(json("pipeline/sources.lock.json").files);
  const geo = { places: geoPlaces.data, routes: geoRoutes.data, eras: ERA_ORDER, conf: CONF };
  // Separate packs so each carries one licence: places CC BY, routes CC BY-SA, base public domain.
  assets.geo = JSON.stringify({ places: geo.places, conf: CONF });
  assets.routes = JSON.stringify({ routes: geo.routes, eras: ERA_ORDER });
  assets.geobase = JSON.stringify(loadBase());

  const kjv = raw("kjv.txt.gz").split("\n");
  const journeys = json("content/journeys.json");

  // The wheel's links: OpenBible candidates the text supports, plus sourced journey links.
  const conn = buildConnections({ openbible: openbible.data, journeys, bookOf: verseTable(core.books).bookOf, texts: [kjv, bsb.data] });
  const v16Rows = core.xrefs.fv.length;
  core.xrefs = conn.connections;
  core.th = [TIER.wording, TIER.wording, TIER.quotation, TIER.sourced];
  core.aud = { evidence: conn.stats, v16Rows };
  core.cw = commonWords(conn.df);

  // Every OpenBible link, labelled by what supports it (lazy-loaded packs).
  const all = labelAll({ openbible: openbible.data, journeys, bookOf: verseTable(core.books).bookOf, texts: [kjv, bsb.data], df: conn.df });
  assets.xon = JSON.stringify(all.xon);
  assets.xin = JSON.stringify(all.xin);
  // Every number the app shows comes from here, never typed by hand.
  core.counts = {
    best: core.xrefs.fv.length,
    otnt: all.counts.otnt,
    all: all.counts.all,
    within: all.counts.within,
    labels: all.counts.labels,
    otntLabels: all.counts.otntLabels,
    verses: kjv.length,
    books: core.books.length,
    places: geo.places.filter((p) => p.lat != null).length,
    placesNamed: geo.places.length,
    routes: geo.routes.length,
  };

  return {
    core,
    kjv,
    journeys,
    texts: { kjv, bsb: bsb.data },
    story: json("content/story.json"),
    evidence: json("content/evidence.json"),
    qa: json("content/qa.json"),
    sources: json("data/sources.json"),
    evidenceCentre: loadEvidenceCentre(),
    assets,
    openbible: openbible.data,
    theographic: theographic.data,
    geo,
    allConnections: all,
    importErrors: [...bsb.errors, ...irv.errors, ...openbible.errors, ...theographic.errors, ...step.errors, ...geoPlaces.errors, ...geoRoutes.errors],
  };
}
