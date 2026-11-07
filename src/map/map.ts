/**
 * Map of the Bible world. Loaded only when someone opens it.
 *
 *  - Places: OpenBible.info Bible Geocoding Data, with the source's own confidence.
 *    A place whose location is debated is drawn as an open ring, never a solid dot,
 *    and the panel says so in words.
 *  - Journeys: UBS Project MARBLE routes, with "Play journey".
 *  - Base: Natural Earth coastlines, lakes and rivers, drawn locally (no map tiles,
 *    no keys, works offline once loaded).
 *  - List: every place as a plain, searchable list, for anyone who prefers not to use a map.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";

export interface MapCtx {
  loadAsset(key: string): Promise<string>;
  /** "Luke 24:13" */
  ref(v: number): string;
  /** verse text in the KJV */
  text(v: number): string;
  /** close the map and open the reader at this verse */
  openVerse(v: number): void;
  onClose(): void;
}

interface Alt { d: string; s: number; lat: number; lon: number }
export interface Place {
  id: string; n: string; k: string; slug: string; t: string;
  lat: number | null; lon: number | null; s: number | null;
  b: "known" | "likely" | "debated" | "unknown"; d: string; alt: Alt[];
  v: number[]; ot: boolean; nt: boolean;
}
interface Route { id: string; num: number; n: string; era: string; c: [number, number][][] }
interface Base { land: [number, number][][]; lakes: [number, number][][]; rivers: { n: string; r: number; c: [number, number][] }[] }

type View = "places" | "journeys" | "list";
type Testament = "all" | "ot" | "nt";

const BAND: Record<Place["b"], { word: string; long: string }> = {
  known: { word: "Location known", long: "Scholars agree where this place was." },
  likely: { word: "Likely location", long: "Most scholars place it here, but not all." },
  debated: { word: "Location debated", long: "Scholars disagree about where this place was. This is the most supported suggestion." },
  unknown: { word: "Location unknown", long: "No location has enough support to put it on the map." },
};
const COL = { ot: "#25b7ff", nt: "#f2d47a", both: "#9fe3b5" };
const colorOf = (p: Place) => (p.ot && p.nt ? COL.both : p.nt ? COL.nt : COL.ot);
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const pct = (s: number | null) => (s == null ? "" : `${Math.round(Math.max(0, s) / 10)}%`);

let root: HTMLElement | null = null;
let state: MapState | null = null;

interface MapState {
  ctx: MapCtx; map: L.Map; places: Place[]; routes: Route[]; eras: string[];
  view: View; tm: Testament; sel: Place | null; route: Route | null; q: string;
  layer: L.LayerGroup; marks: Map<string, L.CircleMarker>; extra: L.LayerGroup; anim: number;
}

/** Open the map. `focus` is a place id or name to open straight away. */
export async function openMap(ctx: MapCtx, focus?: string): Promise<void> {
  if (!root) build(ctx);
  root!.classList.add("on");
  root!.setAttribute("aria-hidden", "false");
  document.body.classList.add("map-on");
  setTimeout(() => (root!.querySelector("#mapback") as HTMLElement)?.focus(), 30);
  if (!state) await load(ctx);
  state!.ctx = ctx;
  state!.map.invalidateSize();
  if (focus) {
    const f = focus.toLowerCase();
    const p = state!.places.find((x) => x.id === focus || x.k.toLowerCase() === f) || state!.places.filter((x) => x.n.toLowerCase() === f).sort((a, b) => b.v.length - a.v.length)[0];
    if (p) selectPlace(p, true);
  }
}

export function closeMap(): void {
  if (!root) return;
  root.classList.remove("on");
  root.setAttribute("aria-hidden", "true");
  document.body.classList.remove("map-on");
  if (state) { cancelAnimationFrame(state.anim); state.ctx.onClose(); }
}

export const isMapOpen = () => !!root && root.classList.contains("on");

/** Test hook. */
export const mapState = () => state && {
  view: state.view, tm: state.tm, sel: state.sel && state.sel.id, route: state.route && state.route.id,
  places: state.places.length, mapped: state.places.filter((p) => p.lat != null).length, routes: state.routes.length,
  shown: state.marks.size, select: (id: string) => { const p = state!.places.find((x) => x.id === id || x.n === id); if (p) selectPlace(p, true); },
  play: (id: string) => { const r = state!.routes.find((x) => x.id === id || x.n === id); if (r) openRoute(r, true); },
};

function build(ctx: MapCtx) {
  root = document.createElement("div");
  root.id = "mapv";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Map of Bible places");
  root.innerHTML = `
<div class="mhd">
  <button class="btn" id="mapback" aria-label="Close the map">‹ Back</button>
  <h2 id="mapttl">Bible map</h2>
</div>
<div class="mtabs" role="tablist" aria-label="Map views">
  <button role="tab" class="chip" data-mv="places" aria-selected="true">Places</button>
  <button role="tab" class="chip" data-mv="journeys" aria-selected="false">Journeys</button>
  <button role="tab" class="chip" data-mv="list" aria-selected="false">List</button>
  <span class="msep"></span>
  <button class="chip" data-mt="all" aria-pressed="true">All</button>
  <button class="chip" data-mt="ot" aria-pressed="false" aria-label="Old Testament places">Old T.</button>
  <button class="chip" data-mt="nt" aria-pressed="false" aria-label="New Testament places">New T.</button>
</div>
<div id="mapc" aria-label="Map. Use the List view for a text list of every place." role="application"></div>
<div id="mapload" class="meta" role="status">Loading the map…</div>
<section id="mapsh" aria-live="polite"></section>`;
  document.body.appendChild(root);
  root.querySelector("#mapback")!.addEventListener("click", () => (state && (state.sel || state.route) ? back() : closeMap()));
  root.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") closeMap(); });
  root.addEventListener("click", onClick);
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "mapq" && state) { state.q = t.value; renderList(); }
  });
  void ctx;
}

async function load(ctx: MapCtx) {
  const loading = root!.querySelector("#mapload") as HTMLElement;
  loading.hidden = false;
  try {
    const [g, r, b] = await Promise.all(["geo", "routes", "geobase"].map((k) => ctx.loadAsset(k).then((t) => JSON.parse(t))));
    const map = L.map(root!.querySelector("#mapc") as HTMLElement, {
      renderer: L.canvas({ padding: 0.5, tolerance: 6 }),
      zoomControl: true, attributionControl: true, minZoom: 3, maxZoom: 12, zoomSnap: 0.5,
      maxBounds: L.latLngBounds([[2, -20], [52, 70]]), maxBoundsViscosity: 0.8, preferCanvas: true,
    });
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution("Places: OpenBible.info (CC BY) · Routes: UBS MARBLE (CC BY-SA) · Base: Natural Earth");
    drawBase(map, b as Base);
    state = {
      ctx, map, places: (g.places as Place[]).sort((a, b) => a.n.localeCompare(b.n)), routes: r.routes, eras: r.eras,
      view: "places", tm: "all", sel: null, route: null, q: "",
      layer: L.layerGroup().addTo(map), marks: new Map(), extra: L.layerGroup().addTo(map), anim: 0,
    };
    map.fitBounds([[29.4, 33.9], [33.4, 36.6]]);
    map.on("zoomend moveend", labels);
    drawPlaces();
    renderHome();
  } catch (e) {
    console.error(e);
    loading.textContent = "Could not load the map. Check your connection and try again.";
    return;
  }
  loading.hidden = true;
}

function drawBase(map: L.Map, b: Base) {
  map.getContainer().style.background = "#0b1a2a";
  L.polygon(b.land, { stroke: true, color: "#3a4a5c", weight: 0.8, fillColor: "#242d3b", fillOpacity: 1, interactive: false }).addTo(map);
  L.polygon(b.lakes, { stroke: true, color: "#2a4a6a", weight: 0.6, fillColor: "#0b1a2a", fillOpacity: 1, interactive: false }).addTo(map);
  for (const r of b.rivers) L.polyline(r.c, { color: "#2f5f8a", weight: r.r <= 3 ? 1.6 : 1, opacity: 0.9, interactive: false }).addTo(map);
}

const visible = (p: Place) => p.lat != null && (state!.tm === "all" || (state!.tm === "ot" ? p.ot : p.nt));

function drawPlaces() {
  const s = state!;
  s.layer.clearLayers();
  s.marks.clear();
  if (s.view === "journeys") return;
  // Most-mentioned first so the busy places sit on top.
  const list = s.places.filter(visible).sort((a, b) => a.v.length - b.v.length);
  for (const p of list) {
    const c = colorOf(p);
    const big = Math.min(9, 3.5 + Math.log2(1 + p.v.length) * 0.8);
    const m = p.b === "debated"
      ? L.circleMarker([p.lat!, p.lon!], { radius: big + 1, color: c, weight: 1.6, dashArray: "3 3", fill: true, fillOpacity: 0.05 })
      : p.b === "likely"
        ? L.circleMarker([p.lat!, p.lon!], { radius: big, color: c, weight: 2, fillColor: c, fillOpacity: 0.35 })
        : L.circleMarker([p.lat!, p.lon!], { radius: big, color: "#05070d", weight: 1, fillColor: c, fillOpacity: 0.95 });
    m.on("click", () => selectPlace(p, false));
    m.bindTooltip(esc(p.n), { direction: "top", offset: [0, -6], className: "mtip" });
    m.addTo(s.layer);
    s.marks.set(p.id, m);
  }
  labels();
}

/** Permanent names for the most-mentioned places; more appear as you zoom in. */
function labels() {
  const s = state!;
  const byId = new Map(s.places.map((p) => [p.id, p]));
  // Most-mentioned places first; a name is shown only where it does not overlap one already shown.
  const order = [...s.marks.keys()].map((id) => byId.get(id)!).sort((a, b) => b.v.length - a.v.length);
  if (s.sel && s.marks.has(s.sel.id)) order.unshift(s.sel);
  const size = s.map.getSize();
  const boxes: [number, number, number, number][] = [];
  const top = new Set<string>();
  for (const p of order) {
    if (top.has(p.id)) continue;
    const pt = s.map.latLngToContainerPoint([p.lat!, p.lon!]);
    if (pt.x < 0 || pt.y < 0 || pt.x > size.x || pt.y > size.y) continue;
    const w = p.n.length * 7 + 8, h = 16;
    const b: [number, number, number, number] = [pt.x - w / 2, pt.y - 10 - h, pt.x + w / 2, pt.y - 8];
    if (boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
    boxes.push(b);
    top.add(p.id);
    if (top.size >= 120) break;
  }
  for (const [id, m] of s.marks) {
    const want = top.has(id);
    const t = m.getTooltip()!;
    if (want && !t.options.permanent) { m.unbindTooltip(); m.bindTooltip(t.getContent() as string, { permanent: true, direction: "top", offset: [0, -6], className: "mtip lab" }); }
    else if (!want && t.options.permanent) { m.unbindTooltip(); m.bindTooltip(t.getContent() as string, { direction: "top", offset: [0, -6], className: "mtip" }); }
  }
}

/* ---------- panel ---------- */

const sheet = () => root!.querySelector("#mapsh") as HTMLElement;

function legend() {
  return `<div class="mleg">
<span><i class="d known"></i>${BAND.known.word}</span>
<span><i class="d likely"></i>${BAND.likely.word}</span>
<span><i class="d debated"></i>${BAND.debated.word}</span>
</div><div class="mleg"><span><i class="c" style="background:${COL.ot}"></i>Old Testament</span><span><i class="c" style="background:${COL.nt}"></i>New Testament</span><span><i class="c" style="background:${COL.both}"></i>Both</span></div>`;
}

function renderHome() {
  const s = state!;
  root!.querySelector("#mapttl")!.textContent = s.view === "journeys" ? "Bible journeys" : s.view === "list" ? "Bible places" : "Bible map";
  if (s.view === "list") return renderList();
  if (s.view === "journeys") return renderJourneys();
  const mapped = s.places.filter(visible).length;
  sheet().innerHTML = `<p class="meta"><b>${mapped.toLocaleString("en-US")} places</b> from the Bible, placed where scholars locate them. Tap a place to read the verses that name it.</p>${legend()}
<p class="meta">How sure we are comes from OpenBible.info, which weighs over 70 atlases, dictionaries and commentaries.</p>`;
}

function verseList(p: Place, max: number) {
  const s = state!;
  const vs = p.v.slice(0, max);
  return `<ul class="mvs">${vs.map((v) => `<li><button data-mvv="${v}"><b>${esc(s.ctx.ref(v))}</b><span>${esc(s.ctx.text(v))}</span></button></li>`).join("")}</ul>${p.v.length > max ? `<button class="btn" data-mmore="${esc(p.id)}">Show all ${p.v.length} verses</button>` : ""}`;
}

function selectPlace(p: Place, fly: boolean, all = false) {
  const s = state!;
  cancelAnimationFrame(s.anim);
  s.sel = p; s.route = null;
  s.extra.clearLayers();
  if (s.view === "journeys") { s.view = "places"; syncTabs(); drawPlaces(); }
  if (p.lat != null) {
    // other proposed locations, as small rings joined to the main one
    for (const a of p.alt) {
      L.polyline([[p.lat, p.lon!], [a.lat, a.lon]], { color: "#cfc8b8", weight: 1, dashArray: "2 4", interactive: false }).addTo(s.extra);
      L.circleMarker([a.lat, a.lon], { radius: 5, color: "#cfc8b8", weight: 1.5, dashArray: "2 2", fill: false }).bindTooltip(`${esc(a.d)} (other suggestion)`, { className: "mtip" }).addTo(s.extra);
    }
    L.circleMarker([p.lat, p.lon!], { radius: 13, color: "#fff", weight: 2, fill: false, interactive: false }).addTo(s.extra);
    if (fly) s.map.flyTo([p.lat, p.lon!], Math.max(s.map.getZoom(), 8), { duration: reduced() ? 0 : 0.6 });
  }
  labels();
  const b = BAND[p.b];
  const where = p.lat == null ? `<p class="meta">${b.long}</p>` : `<p class="mconf ${p.b}"><b>${b.word}</b> · ${esc(p.d)}${p.s != null ? ` <small>(confidence ${pct(p.s)})</small>` : ""}</p><p class="meta">${b.long}</p>`;
  const alts = p.alt.length ? `<p class="meta"><b>Other suggested locations:</b> ${p.alt.map((a) => `${esc(a.d)} (${pct(a.s)})`).join(" · ")}</p>` : "";
  root!.querySelector("#mapttl")!.textContent = p.n;
  sheet().innerHTML = `<h3 class="mh">${esc(p.n)}<small>${esc(p.t || "place")} · ${p.v.length} ${p.v.length === 1 ? "verse" : "verses"}${p.ot && p.nt ? " · both Testaments" : p.nt ? " · New Testament" : " · Old Testament"}</small></h3>
${where}${alts}
<h4 class="msub">Verses that name ${esc(p.n)}</h4>${verseList(p, all ? 9999 : 8)}
<a class="photo" href="https://www.openbible.info/geo/ancient/${esc(p.id)}/${esc(p.slug)}" target="_blank" rel="noopener noreferrer">Photos and sources at OpenBible.info ↗</a>`;
  sheet().scrollTop = 0;
}

function renderList() {
  const s = state!;
  s.sel = null; s.route = null;
  const q = s.q.trim().toLowerCase();
  const list = s.places.filter((p) => (s.tm === "all" || (s.tm === "ot" ? p.ot : p.nt)) && (!q || p.n.toLowerCase().includes(q)));
  const keep = document.activeElement && (document.activeElement as HTMLElement).id === "mapq";
  const head = sheet().querySelector("#mapq") ? null : `<label class="meta" for="mapq">Find a place</label><input id="mapq" type="search" autocomplete="off" placeholder="For example Bethlehem" value="${esc(s.q)}"><div id="maplist"></div>`;
  if (head) sheet().innerHTML = head;
  const out = sheet().querySelector("#maplist") as HTMLElement;
  out.innerHTML = `<p class="meta">${list.length.toLocaleString("en-US")} ${list.length === 1 ? "place" : "places"}</p><ul class="mpl">${list.slice(0, 300).map((p) => `<li><button data-mp="${esc(p.id)}"><b>${esc(p.n)}</b><span>${esc(p.t || "place")} · first named in ${esc(s.ctx.ref(p.v[0]))} · ${p.v.length} ${p.v.length === 1 ? "verse" : "verses"} · ${BAND[p.b].word}</span></button></li>`).join("")}</ul>${list.length > 300 ? `<p class="meta">Type a name to see more.</p>` : ""}`;
  if (keep) (sheet().querySelector("#mapq") as HTMLInputElement).focus();
}

function renderJourneys() {
  const s = state!;
  s.extra.clearLayers();
  drawAllRoutes();
  let h = `<p class="meta"><b>${s.routes.length} journeys</b> from the Bible, drawn by Dr Leen Ritmeyer for the United Bible Societies. Tap one to follow it.</p>`;
  for (const era of s.eras) {
    const rs = s.routes.filter((r) => r.era === era);
    if (!rs.length) continue;
    h += `<details class="mera"><summary>${esc(era)}<small>${rs.length}</small></summary><ul class="mpl">${rs.map((r) => `<li><button data-mr="${esc(r.id)}"><b>${esc(r.n)}</b></button></li>`).join("")}</ul></details>`;
  }
  sheet().innerHTML = h;
}

function drawAllRoutes() {
  const s = state!;
  s.layer.clearLayers();
  s.marks.clear();
  for (const r of s.routes) L.polyline(r.c, { color: "#f2d47a", weight: 1.4, opacity: 0.45 }).on("click", () => openRoute(r, false)).addTo(s.layer);
}

function openRoute(r: Route, play: boolean) {
  const s = state!;
  cancelAnimationFrame(s.anim);
  if (s.view !== "journeys") { s.view = "journeys"; syncTabs(); drawAllRoutes(); }
  s.route = r; s.sel = null;
  s.extra.clearLayers();
  const line = L.polyline(r.c, { color: "#ffc857", weight: 4, opacity: 1 }).addTo(s.extra);
  s.map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 9, animate: !reduced() });
  root!.querySelector("#mapttl")!.textContent = r.n;
  sheet().innerHTML = `<h3 class="mh">${esc(r.n)}<small>${esc(r.era)}</small></h3>
<button class="btn p" data-mplay>▶ Play journey</button>
<p class="meta">Route © United Bible Societies 2023, drawn by Dr Leen Ritmeyer for UBS Project MARBLE (CC BY-SA 4.0). Routes show the likely way travelled; the Bible does not always give every stop.</p>`;
  if (play) playRoute(r);
}

/** Draw the route bit by bit with a moving dot. */
function playRoute(r: Route) {
  const s = state!;
  cancelAnimationFrame(s.anim);
  s.extra.clearLayers();
  const pts = r.c.flat();
  if (reduced() || pts.length < 2) { L.polyline(r.c, { color: "#ffc857", weight: 4 }).addTo(s.extra); return; }
  const line = L.polyline([], { color: "#ffc857", weight: 4 }).addTo(s.extra);
  const dot = L.circleMarker(pts[0], { radius: 7, color: "#05070d", weight: 2, fillColor: "#fff", fillOpacity: 1 }).addTo(s.extra);
  const t0 = performance.now(), dur = Math.min(9000, 2500 + pts.length * 25);
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const n = Math.max(2, Math.ceil(k * pts.length));
    line.setLatLngs(pts.slice(0, n));
    dot.setLatLng(pts[n - 1]);
    if (k < 1) s.anim = requestAnimationFrame(step);
  };
  s.anim = requestAnimationFrame(step);
}

function syncTabs() {
  const s = state!;
  root!.querySelectorAll<HTMLElement>("[data-mv]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mv === s.view)));
  root!.querySelectorAll<HTMLElement>("[data-mt]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mt === s.tm)));
  root!.classList.toggle("list", s.view === "list");
  const hideT = s.view === "journeys";
  root!.querySelectorAll<HTMLElement>("[data-mt]").forEach((b) => (b.hidden = hideT));
}

function back() {
  const s = state!;
  cancelAnimationFrame(s.anim);
  s.extra.clearLayers();
  s.sel = null; s.route = null;
  labels();
  renderHome();
}

function onClick(e: Event) {
  const t = e.target as HTMLElement;
  if (!state) return;
  const s = state;
  let el: HTMLElement | null;
  if ((el = t.closest("[data-mv]"))) {
    s.view = el.dataset.mv as View; s.sel = null; s.route = null; s.q = "";
    cancelAnimationFrame(s.anim); s.extra.clearLayers();
    syncTabs(); drawPlaces(); renderHome();
    if (s.view !== "list") setTimeout(() => s.map.invalidateSize(), 0);
    return;
  }
  if ((el = t.closest("[data-mt]"))) {
    s.tm = el.dataset.mt as Testament; syncTabs(); drawPlaces();
    if (s.sel) selectPlace(s.sel, false); else renderHome();
    return;
  }
  if ((el = t.closest("[data-mp]"))) {
    const p = s.places.find((x) => x.id === el!.dataset.mp);
    if (p) {
      if (s.view === "list") { s.view = "places"; syncTabs(); drawPlaces(); setTimeout(() => s.map.invalidateSize(), 0); }
      selectPlace(p, true);
    }
    return;
  }
  if ((el = t.closest("[data-mmore]"))) { if (s.sel) selectPlace(s.sel, false, true); return; }
  if ((el = t.closest("[data-mvv]"))) { const v = +el.dataset.mvv!; closeMap(); s.ctx.openVerse(v); return; }
  if ((el = t.closest("[data-mr]"))) { const r = s.routes.find((x) => x.id === el!.dataset.mr); if (r) openRoute(r, true); return; }
  if (t.closest("[data-mplay]") && s.route) { playRoute(s.route); return; }
}
