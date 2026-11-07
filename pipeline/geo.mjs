/**
 * The map of the Bible world, built only from pinned sources:
 *
 *   places   OpenBible.info Bible Geocoding Data (CC BY 4.0): every identifiable place,
 *            its verses, and how confident scholarship is about where it was
 *   routes   UBS Project MARBLE Bible routes by Dr Leen Ritmeyer (CC BY-SA 4.0)
 *   base     Natural Earth land, lakes and rivers (public domain), cut to the Bible world
 *
 * Confidence comes straight from the source: each identification carries a score
 * out of 1000 (OpenBible's time-weighted score, "1000 represents very high
 * confidence"). The app shows the top identification and says how sure it is.
 */
import { upstream, verseIndexer } from "./normalize.mjs";

/** The part of the world the Bible's events cover (lon/lat). */
export const BBOX = { w: -10, e: 62, s: 8, n: 47 };

/** Confidence bands, from the source's score out of 1000. */
export const CONF = { known: 800, likely: 500 };
export const band = (score) => (score >= CONF.known ? "known" : score >= CONF.likely ? "likely" : "debated");

const r4 = (x) => Math.round(x * 1e4) / 1e4;
const r3 = (x) => Math.round(x * 1e3) / 1e3;
const strip = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const lonlat = (s) => {
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(s || "");
  return m ? [+m[1], +m[2]] : null;
};

/* ---------- places ---------- */

export function loadPlaces(books) {
  const { fromOsis, vt } = verseIndexer(books);
  const rows = upstream("data/ancient.jsonl").trim().split("\n").map((l) => JSON.parse(l));
  const errors = [];
  let unplacedRefs = 0, outsideBible = 0;
  const places = [];
  for (const r of rows) {
    const extra = JSON.parse(r.extra || "{}");
    const verses = [];
    const refs = new Set([...(extra.osises || []), ...(r.verses || []).map((x) => x.osis)]);
    // A few entries are places from outside the Bible text (e.g. Adulis); they have no verses.
    if (!refs.size) { outsideBible++; continue; }
    for (const o of refs) {
      const v = fromOsis(o);
      if (v < 0) { unplacedRefs++; continue; }
      verses.push(v);
    }
    verses.sort((a, b) => a - b);
    // Each identification is one scholarly proposal for where the place was, best first.
    const cands = [];
    for (const id of r.identifications || []) {
      const res = (id.resolutions || []).find((x) => lonlat(x.lonlat));
      const score = id.score ? id.score.time_total : 0;
      if (!res || id.id_source === "special") continue;
      const [lon, lat] = lonlat(res.lonlat);
      cands.push({ d: strip(id.description), s: score, lat: r4(lat), lon: r4(lon) });
    }
    const top = (r.identifications || [])[0];
    const topScore = top && top.score ? top.score.time_total : 0;
    // Only map a place when the best identification itself has a location.
    const best = cands.length && top && top.id_source !== "special" && cands[0].s === topScore ? cands[0] : null;
    places.push({
      id: r.id,
      // OpenBible numbers places that share a name ("Bethel 1"); the app shows the name and tells them apart by context.
      n: r.friendly_id.replace(/ \d+$/, ""),
      k: r.friendly_id,
      slug: r.url_slug,
      t: (r.types || []).join(", "),
      lat: best ? best.lat : null,
      lon: best ? best.lon : null,
      s: best ? best.s : null,
      b: best ? band(best.s) : "unknown",
      d: best ? best.d : strip(top && top.description),
      // other proposals with some scholarly support, shown as rings when the place is opened
      alt: cands.slice(best ? 1 : 0).filter((c) => c.s > 0).slice(0, 4),
      v: verses,
      ot: verses.some((v) => vt.bookOf[v] < 39),
      nt: verses.some((v) => vt.bookOf[v] >= 39),
    });
  }
  if (rows.length < 1200) errors.push(`OpenBible geocoding: only ${rows.length} places`);
  if (unplacedRefs > 20) errors.push(`OpenBible geocoding: ${unplacedRefs} verse references could not be placed`);
  return { data: places, unplacedRefs, outsideBible, errors };
}

/* ---------- geometry helpers ---------- */

const inside = ([x, y]) => x >= BBOX.w && x <= BBOX.e && y >= BBOX.s && y <= BBOX.n;

/** Sutherland-Hodgman: clip one polygon ring to the box. */
export function clipRing(ring) {
  const edges = [
    [(p) => p[0] >= BBOX.w, (a, b) => [BBOX.w, a[1] + ((b[1] - a[1]) * (BBOX.w - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= BBOX.e, (a, b) => [BBOX.e, a[1] + ((b[1] - a[1]) * (BBOX.e - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= BBOX.s, (a, b) => [a[0] + ((b[0] - a[0]) * (BBOX.s - a[1])) / (b[1] - a[1]), BBOX.s]],
    [(p) => p[1] <= BBOX.n, (a, b) => [a[0] + ((b[0] - a[0]) * (BBOX.n - a[1])) / (b[1] - a[1]), BBOX.n]],
  ];
  let out = ring;
  for (const [ok, cut] of edges) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
      if (ok(b)) { if (!ok(a)) out.push(cut(a, b)); out.push(b); }
      else if (ok(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

/** Douglas-Peucker simplification (tolerance in degrees). */
export function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [f, l] = [pts[0], pts[pts.length - 1]];
  if (f[0] === l[0] && f[1] === l[1]) {
    // A closed loop has equal end points; simplify its two halves separately.
    const h = pts.length >> 1;
    return [...simplify(pts.slice(0, h + 1), tol), ...simplify(pts.slice(h), tol).slice(1)];
  }
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1e-12;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** [lon,lat] list -> [lat,lon] list rounded, consecutive duplicates removed (Leaflet order). */
const toLatLon = (pts, r) => {
  const out = [];
  for (const [x, y] of pts) {
    const p = [r(y), r(x)];
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  return out;
};

const polygons = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const lines = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);

/** Split a line into the runs that lie inside the box. */
function clipLine(pts) {
  const runs = [];
  let cur = [];
  for (const p of pts) {
    if (inside(p)) cur.push(p);
    else if (cur.length) { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

/* ---------- base map (Natural Earth) ---------- */

export function loadBase() {
  const read = (n) => JSON.parse(upstream(`geojson/${n}.geojson`)).features;
  const land = [], lakes = [], rivers = [];
  const addPolys = (features, out, tol) => {
    for (const f of features) for (const poly of polygons(f.geometry)) {
      const outer = clipRing(poly[0]);
      if (outer.length < 4) continue;
      const ring = toLatLon(simplify([...outer, outer[0]], tol), r3);
      if (ring.length >= 4) out.push(ring);
    }
  };
  addPolys(read("ne_10m_land"), land, 0.01);
  addPolys(read("ne_10m_lakes"), lakes, 0.005);
  for (const f of read("ne_10m_rivers_lake_centerlines")) {
    const p = f.properties || {};
    if (p.featurecla && !/River|Lake Centerline/i.test(p.featurecla)) continue;
    for (const l of lines(f.geometry)) for (const run of clipLine(l)) {
      const pts = toLatLon(simplify(run, 0.005), r3);
      if (pts.length > 1) rivers.push({ n: p.name_en || p.name || "", r: p.scalerank ?? 9, c: pts });
    }
  }
  return { bbox: BBOX, land, lakes, rivers };
}

/* ---------- routes (UBS Project MARBLE) ---------- */

/** Eras by the route file numbers, which follow the order of the Bible story. */
const ERAS = [
  [38, "Abraham, Isaac, Jacob and Joseph"],
  [52, "Moses and the Exodus"],
  [75, "Joshua, the judges and Ruth"],
  [98, "Samuel, Saul and David"],
  [113, "Solomon and the divided kingdom"],
  [151, "Prophets, kings and exile"],
  [196, "Jesus"],
  [999, "The early church and Paul"],
];
// A few files sit out of story order; these follow the book they come from.
const ERA_FIX = { 154: "Moses and the Exodus", 155: "Prophets, kings and exile" };

const BOOKS = { GEN: "Genesis" };
// Files named only "David"; UBS's own metadata.csv lists their maps as David's Kingdom 4 and 5.
const TITLE_FIX = { "093. David": "David's Kingdom (part 4)", "094. David": "David's Kingdom (part 5)" };
export function routeTitle(file) {
  const base = file.replace(/^.*\//, "").replace(/\.geojson$/i, "");
  const m = /^(\d+)([a-z]?)\.?\s*(.*)$/.exec(base);
  const num = m ? +m[1] : 0;
  let t = TITLE_FIX[base] || (m ? m[3] : base).trim().replace(/\.+$/, "").replace(/_cont$/, " (continued)").replace(/_(\d+)$/, " (part $1)").replace(/_/g, " ");
  t = t.replace(/^([A-Z]{3}) (\d+) /, (_, b, c) => `${BOOKS[b] || b} ${c}: `);
  t = t.replace(/\bIsraelitas\b/, "Israelites").replace(/\bNothern\b/, "Northern").replace(/\bJeroboams\b/, "Jeroboam’s").replace(/\bSennacheribs\b/, "Sennacherib’s").replace(/Zerah the Ethiopian/, "Zerah the Cushite");
  return { num, title: t };
}

export function loadRoutes(lockFiles) {
  const errors = [];
  const routes = [];
  const files = lockFiles.filter((f) => f.id === "ubs-routes" && f.path.endsWith(".geojson"));
  for (const f of files) {
    const { num, title } = routeTitle(f.path);
    if (!title) continue; // "100.geojson" has no name; its story title is not stated in the file
    let gj;
    try { gj = JSON.parse(upstream(f.path)); } catch (e) { errors.push(`UBS route ${f.path}: not valid GeoJSON`); continue; }
    const feats = gj.type === "FeatureCollection" ? gj.features || [] : gj.type === "Feature" ? [gj] : [{ geometry: gj }];
    const parts = [];
    for (const ft of feats) for (const l of lines((ft && ft.geometry) || {})) {
      const pts = toLatLon(simplify(l, 0.002), r3);
      if (pts.length > 1) parts.push(pts);
    }
    if (!parts.length) { errors.push(`UBS route ${f.path}: no line`); continue; }
    const era = ERA_FIX[num] || ERAS.find(([max]) => num <= max)[1];
    routes.push({ id: f.path.replace(/^.*\//, "").replace(/\.geojson$/i, ""), num, n: title, era, c: parts });
  }
  routes.sort((a, b) => a.num - b.num || a.id.localeCompare(b.id));
  // Same title twice ("David") -> number them so each is distinct.
  const seen = new Map();
  for (const r of routes) seen.set(r.n, (seen.get(r.n) || 0) + 1);
  const k = new Map();
  for (const r of routes) if (seen.get(r.n) > 1) { const i = (k.get(r.n) || 0) + 1; k.set(r.n, i); r.n = `${r.n} (${i})`; }
  if (routes.length < 150) errors.push(`UBS routes: only ${routes.length} routes`);
  return { data: routes, errors };
}

export const ERA_ORDER = ERAS.map(([, n]) => n);
