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
  /** region and sea names written across the map, and river names */
  names: L.LayerGroup; rivers: { n: string; at: [number, number] }[];
  /** land shapes with their bounding boxes, to tell sea from land when placing sea names */
  land: { ring: [number, number][]; box: [number, number, number, number] }[];
  /** places drawn inside a numbered group (for the test hook and the summary) */
  grouped: number;
  /** where circles and dots are drawn, so names never sit on top of them: lat, lon, radius in px */
  spots: [number, number, number][];
  /** the name beside each numbered circle: lat, lon, circle radius, name, which side */
  capts: [number, number, number, string, Side][];
}

type Side = "below" | "above" | "right" | "left";
/** Width of a group name in the font it is drawn in (12 px Inter, semibold). */
const measurer = document.createElement("canvas").getContext("2d")!;
const textWidth = (t: string) => {
  measurer.font = "600 12px Inter, system-ui, sans-serif";
  return Math.ceil(measurer.measureText(t).width);
};

/** Regions and seas are written across the map as names, not drawn as dots. */
const isArea = (p: Place) => p.t === "region" || p.t === "body of water";
/** Grouping: places within this many pixels of a busier place join its numbered circle until you zoom in.
 *  Circles are at most 42 px wide, so groups this far apart never touch. */
const GROUP_PX = 58;
const GROUP_UNTIL_ZOOM = 9;

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
  shown: state.places.filter(visible).length, dots: state.marks.size, grouped: state.grouped,
  names: state.names.getLayers().length, select: (id: string) => { const p = state!.places.find((x) => x.id === id || x.n === id); if (p) selectPlace(p, true); },
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
    const [[g, r, b], relief] = await Promise.all([
      Promise.all(["geo", "routes", "geobase"].map((k) => ctx.loadAsset(k).then((t) => JSON.parse(t)))),
      reliefLayer(),
    ]);
    const map = L.map(root!.querySelector("#mapc") as HTMLElement, {
      renderer: L.canvas({ padding: 0.5, tolerance: 6 }),
      zoomControl: true, attributionControl: true, minZoom: 3, maxZoom: 12, zoomSnap: 0.5,
      maxBounds: L.latLngBounds([[2, -20], [52, 70]]), maxBoundsViscosity: 0.8, preferCanvas: true,
    });
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution("Places: OpenBible.info (CC BY) · Routes: UBS MARBLE (CC BY-SA) · Map: Natural Earth");
    if (relief) relief.addTo(map);
    const rivers = drawBase(map, b as Base, !!relief);
    state = {
      ctx, map, places: (g.places as Place[]).sort((a, b) => a.n.localeCompare(b.n)), routes: r.routes, eras: r.eras,
      view: "places", tm: "all", sel: null, route: null, q: "",
      layer: L.layerGroup().addTo(map), marks: new Map(), extra: L.layerGroup().addTo(map), anim: 0,
      names: L.layerGroup().addTo(map), rivers, grouped: 0, spots: [], capts: [],
      land: (b as Base).land.map((ring) => ({ ring, box: ring.reduce((a, [la, lo]) => [Math.min(a[0], la), Math.min(a[1], lo), Math.max(a[2], la), Math.max(a[3], lo)], [90, 180, -90, -180] as [number, number, number, number]) })),
    };
    // Open on the whole Bible world, then glide in to the Holy Land (straight there with reduced motion).
    const home: L.LatLngBoundsExpression = [[29.4, 33.9], [33.4, 36.6]];
    if (reduced()) map.fitBounds(home);
    else {
      map.fitBounds([[22, 12], [42, 56]], { animate: false });
      setTimeout(() => map.flyToBounds(home, { duration: 2.2, easeLinearity: 0.2 }), 450);
    }
    // Groups depend on the zoom; names depend on what is on screen.
    map.on("zoomend", () => drawPlaces());
    map.on("moveend", () => labels());
    if (pendingView) { state.view = pendingView; pendingView = null; syncTabs(); }
    drawPlaces();
    renderHome();
  } catch (e) {
    console.error(e);
    loading.textContent = "Could not load the map. Check your connection and try again.";
    return;
  }
  loading.hidden = true;
}

/** The painted relief (Natural Earth I), re-projected to line up with everything else; null if it cannot load. */
async function reliefLayer(): Promise<L.ImageOverlay | null> {
  try {
    const base = import.meta.env.BASE_URL + "data/";
    const m = await (await fetch(base + "manifest.json", { cache: "no-cache" })).json();
    if (!m.files.relief || !m.files.reliefmeta) return null;
    const meta = await (await fetch(base + m.files.reliefmeta.file)).json();
    return L.imageOverlay(base + m.files.relief.file, meta.bounds, { interactive: false, className: "mrelief", alt: "" });
  } catch {
    return null;
  }
}

/**
 * Coastline, lakes and rivers drawn sharp over the painted relief (or, if it could not load,
 * a plain land-and-sea map in its place). Returns where to write river names.
 */
function drawBase(map: L.Map, b: Base, painted: boolean): { n: string; at: [number, number] }[] {
  map.getContainer().style.background = "#8bbddf";
  L.polygon(b.land, painted
    ? { stroke: true, color: "#5b7f95", weight: 0.8, opacity: 0.55, fill: false, interactive: false }
    : { stroke: true, color: "#5b7f95", weight: 1, fillColor: "#e9dcc2", fillOpacity: 1, interactive: false }).addTo(map);
  if (!painted) L.polygon(b.lakes, { stroke: true, color: "#5b7f95", weight: 0.8, fillColor: "#8bbddf", fillOpacity: 1, interactive: false }).addTo(map);
  // The longest stretch of each named river carries its name.
  const best = new Map<string, { len: number; at: [number, number] }>();
  for (const r of b.rivers) {
    L.polyline(r.c, { color: "#3f86c2", weight: r.r <= 3 ? 1.8 : 1.1, opacity: 0.9, interactive: false }).addTo(map);
    if (!r.n || r.c.length < 2) continue;
    const len = r.c.length;
    if ((best.get(r.n)?.len ?? 0) < len) best.set(r.n, { len, at: r.c[Math.floor(r.c.length / 2)] });
  }
  return [...best].map(([n, v]) => ({ n, at: v.at }));
}

const visible = (p: Place) => p.lat != null && (state!.tm === "all" || (state!.tm === "ot" ? p.ot : p.nt));

function dotFor(p: Place): L.CircleMarker {
  const c = colorOf(p);
  const big = Math.min(9, 3.5 + Math.log2(1 + p.v.length) * 0.8);
  return p.b === "debated"
    ? L.circleMarker([p.lat!, p.lon!], { radius: big + 1, color: c, weight: 1.6, dashArray: "3 3", fill: true, fillOpacity: 0.05 })
    : p.b === "likely"
      ? L.circleMarker([p.lat!, p.lon!], { radius: big, color: c, weight: 2, fillColor: c, fillOpacity: 0.35 })
      : L.circleMarker([p.lat!, p.lon!], { radius: big, color: "#05070d", weight: 1, fillColor: c, fillOpacity: 0.95 });
}

/**
 * Places, grouped: places that would sit on top of each other become one numbered circle
 * ("12 places around Jerusalem") until you zoom in. Regions and seas are names, not dots.
 */
function drawPlaces() {
  const s = state!;
  s.layer.clearLayers();
  s.marks.clear();
  s.grouped = 0;
  if (s.view === "journeys") return labels();
  s.spots = [];
  s.capts = [];
  const z = s.map.getZoom();
  // Busiest places first: each starts a group, and quieter places nearby join it.
  const list = s.places.filter((p) => visible(p) && !isArea(p)).sort((a, b) => b.v.length - a.v.length);
  const groups: { pt: L.Point; members: Place[] }[] = [];
  const singles: Place[] = [];
  for (const p of list) {
    if (z >= GROUP_UNTIL_ZOOM || (s.sel && p.id === s.sel.id)) { singles.push(p); continue; }
    const pt = s.map.project([p.lat!, p.lon!], z);
    const g = groups.find((g) => g.pt.distanceTo(pt) < GROUP_PX);
    if (g) g.members.push(p);
    else groups.push({ pt, members: [p] });
  }
  // Group names: busiest first; a name that would touch another name or circle is left out (the circle still says it on tap).
  const circleBox = (g: { pt: L.Point; members: Place[] }) => {
    const r = (28 + Math.min(14, Math.log2(g.members.length) * 3)) / 2;
    return [g.pt.x - r, g.pt.y - r, g.pt.x + r, g.pt.y + r] as [number, number, number, number];
  };
  const taken: [number, number, number, number][] = groups.filter((g) => g.members.length > 1).map(circleBox);
  const clash = (b: [number, number, number, number]) => taken.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const showName = new Map<{ pt: L.Point; members: Place[] }, Side>();
  for (const g of groups) {
    if (g.members.length < 2) continue;
    const cb = circleBox(g), w = textWidth(g.members[0].n) + 6, cy = g.pt.y;
    const at: Record<Side, [number, number, number, number]> = {
      below: [g.pt.x - w / 2, cb[3] + 1, g.pt.x + w / 2, cb[3] + 17],
      above: [g.pt.x - w / 2, cb[1] - 17, g.pt.x + w / 2, cb[1] - 1],
      right: [cb[2] + 3, cy - 8, cb[2] + 3 + w, cy + 8],
      left: [cb[0] - 3 - w, cy - 8, cb[0] - 3, cy + 8],
    };
    const side = (["below", "above", "right", "left"] as Side[]).find((k) => !clash(at[k]));
    if (side) { taken.push(at[side]); showName.set(g, side); }
  }
  for (const g of groups) {
    const group = g.members;
    if (group.length === 1) { singles.push(group[0]); continue; }
    s.grouped += group.length;
    const head = group[0];
    const n = group.length, size = Math.round(28 + Math.min(14, Math.log2(n) * 3));
    s.spots.push([head.lat!, head.lon!, size / 2 + 4]);
    const side = showName.get(g);
    if (side) s.capts.push([head.lat!, head.lon!, size / 2, head.n, side]);
    const name = `${n} places around ${head.n}. Tap to zoom in.`;
    const m = L.marker([head.lat!, head.lon!], {
      icon: L.divIcon({ className: "mcl", html: `<b class="mcl-in"></b><span aria-hidden="true">${n}</span>${side ? `<em class="${side}" aria-hidden="true">${esc(head.n)}</em>` : ""}`, iconSize: [size, size] }),
      title: name, alt: name, keyboard: true, riseOnHover: true,
    });
    m.on("click", () => s.map.flyToBounds(L.latLngBounds(group.map((p) => [p.lat!, p.lon!] as [number, number])).pad(0.35), { maxZoom: Math.max(z + 2, GROUP_UNTIL_ZOOM), duration: reduced() ? 0 : 0.6 }));
    m.addTo(s.layer);
  }
  // Most-mentioned last so the busy places sit on top.
  singles.sort((a, b) => a.v.length - b.v.length);
  for (const p of singles) {
    const m = dotFor(p);
    s.spots.push([p.lat!, p.lon!, (m.options.radius ?? 6) + 1]);
    m.on("click", () => selectPlace(p, false));
    m.bindTooltip(esc(p.n), { direction: "top", offset: [0, -6], className: "mtip" });
    m.addTo(s.layer);
    s.marks.set(p.id, m);
  }
  labels();
}

const onLand = (lat: number, lon: number) =>
  state!.land.some(({ ring, box }) => {
    if (lat < box[0] || lat > box[2] || lon < box[1] || lon > box[3]) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ai, oi] = ring[i], [aj, oj] = ring[j];
      if (oi > lon !== oj > lon && lat < ((aj - ai) * (lon - oi)) / (oj - oi) + ai) inside = !inside;
    }
    return inside;
  });

/** For the Great Sea when its own spot is off screen or crowded: open water on screen, nearest first. */
function seaSpots(p: Place): [number, number][] {
  const s = state!;
  // Only the Great Sea (the Mediterranean) reaches across the map. The Salt Sea and the Sea of Galilee
  // are lakes and the Red Sea is a separate gulf, so they are named only at their own point.
  if (p.d !== "Mediterranean Sea") return [];
  const size = s.map.getSize(), pt = s.map.latLngToContainerPoint([p.lat!, p.lon!]);
  const out: [number, number, number][] = [];
  for (let y = 30; y < size.y - 30; y += 24)
    for (let x = 60; x < size.x - 60; x += 24) {
      const ll = s.map.containerPointToLatLng([x, y]);
      // North of the Gulf of Suez's head (about 30°N), so the name never lands in the Red Sea's gulfs.
      if (ll.lat < 30.6 || Math.abs(ll.lat - p.lat!) > 8 || Math.abs(ll.lng - p.lon!) > 12) continue;
      if (onLand(ll.lat, ll.lng) || onLand(ll.lat + 0.15, ll.lng) || onLand(ll.lat - 0.15, ll.lng)) continue;
      out.push([ll.lat, ll.lng, (x - pt.x) ** 2 + (y - pt.y) ** 2]);
    }
  return out.sort((a, b) => a[2] - b[2]).slice(0, 40).map(([a, b]) => [a, b]);
}

/** Region, sea and river names across the map: the most-mentioned first, never on top of each other. */
function areaNames(): [number, number, number, number][] {
  const s = state!;
  s.names.clearLayers();
  const size = s.map.getSize(), z = s.map.getZoom();
  // Circles and dots come first: a name is left out rather than written on top of one.
  const boxes: [number, number, number, number][] = s.spots.map(([lat, lon, r]) => {
    const pt = s.map.latLngToContainerPoint([lat, lon]);
    return [pt.x - r, pt.y - r, pt.x + r, pt.y + r];
  });
  for (const [lat, lon, r, n, side] of s.capts) {
    const pt = s.map.latLngToContainerPoint([lat, lon]);
    const w = textWidth(n) + 6;
    boxes.push(
      side === "below" ? [pt.x - w / 2, pt.y + r, pt.x + w / 2, pt.y + r + 17]
      : side === "above" ? [pt.x - w / 2, pt.y - r - 17, pt.x + w / 2, pt.y - r]
      : side === "right" ? [pt.x + r + 3, pt.y - 8, pt.x + r + 3 + w, pt.y + 8]
      : [pt.x - r - 3 - w, pt.y - 8, pt.x - r - 3, pt.y + 8],
    );
  }
  const fits = (b: [number, number, number, number]) => b[0] >= 2 && b[1] >= 2 && b[2] <= size.x - 2 && b[3] <= size.y - 2 && !boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const said = new Set<string>();
  const put = (text: string, at: [number, number], cls: string, px: number, spacing: number, onTap?: () => void) => {
    // Each name once (the data has two places called Sharon, for example; the one named more often wins).
    if (said.has(text)) return false;
    const p0 = s.map.latLngToContainerPoint(at);
    const w = Math.round(text.length * px * (0.62 + spacing) + 8), h = Math.round(px * 1.4);
    // Where it belongs first, then a little above, below or to the side, never far from it.
    const tries: [number, number][] = [[0, 0], [0, -h - 4], [0, h + 4], [-w / 3, 0], [w / 3, 0], [0, -2 * h - 8], [0, 2 * h + 8]];
    let pt: L.Point | null = null, b: [number, number, number, number] = [0, 0, 0, 0];
    for (const [dx, dy] of tries) {
      const q = L.point(p0.x + dx, p0.y + dy);
      b = [q.x - w / 2, q.y - h / 2, q.x + w / 2, q.y + h / 2];
      if (fits(b)) { pt = q; break; }
    }
    if (!pt) return false;
    said.add(text);
    boxes.push(b);
    const m = L.marker(s.map.containerPointToLatLng(pt), {
      icon: L.divIcon({ className: "mname " + cls, html: `<span style="font-size:${px}px">${esc(text)}</span>`, iconSize: [w, h] }),
      interactive: !!onTap, keyboard: !!onTap, title: onTap ? `${text}: read the verses that name it` : "",
    });
    if (onTap) m.on("click", onTap);
    m.addTo(s.names);
    return true;
  };
  const areas = s.places.filter((p) => visible(p) && isArea(p)).sort((a, b) => b.v.length - a.v.length);
  // Seas and lakes first (they hold the map together), then regions; bigger names for places named more often.
  // A sea whose named point is off screen is still named where its water shows.
  for (const p of areas.filter((p) => p.t === "body of water")) {
    const px = Math.min(16, 12 + z * 0.3), tap = () => selectPlace(p, false);
    if (put(p.n, [p.lat!, p.lon!], "water", px, 0.06, tap)) continue;
    for (const at of seaSpots(p)) if (put(p.n, at, "water", px, 0.06, tap)) break;
  }
  for (const p of areas.filter((p) => p.t === "region")) {
    const px = Math.round(Math.min(17, Math.max(11, 9 + Math.log2(1 + p.v.length) * 1.1)));
    put(p.n.toUpperCase(), [p.lat!, p.lon!], "region", px, 0.22, () => selectPlace(p, false));
  }
  // Rivers by name; modern canals are not part of the Bible's world.
  for (const r of s.rivers) if (!/canal/i.test(r.n)) put(r.n, r.at, "river", 12, 0.04);
  return boxes;
}

/** Permanent names for the most-mentioned places; more appear as you zoom in. */
function labels() {
  const s = state!;
  const byId = new Map(s.places.map((p) => [p.id, p]));
  // Most-mentioned places first; a name is shown only where it does not overlap one already shown.
  const order = [...s.marks.keys()].map((id) => byId.get(id)!).sort((a, b) => b.v.length - a.v.length);
  if (s.sel && s.marks.has(s.sel.id)) order.unshift(s.sel);
  const size = s.map.getSize();
  const boxes: [number, number, number, number][] = s.view === "list" ? [] : areaNames();
  const top = new Set<string>();
  for (const p of order) {
    if (top.has(p.id)) continue;
    const pt = s.map.latLngToContainerPoint([p.lat!, p.lon!]);
    if (pt.x < 0 || pt.y < 0 || pt.x > size.x || pt.y > size.y) continue;
    const w = p.n.length * 7 + 8, h = 16;
    const b: [number, number, number, number] = [pt.x - w / 2, pt.y - 12 - h, pt.x + w / 2, pt.y - 12];
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
</div><div class="mleg"><span><i class="c" style="background:${COL.ot}"></i>Old Testament</span><span><i class="c" style="background:${COL.nt}"></i>New Testament</span><span><i class="c" style="background:${COL.both}"></i>Both</span></div>
<div class="mleg"><span><i class="g">12</i>Several places close together: tap to zoom in</span><span><b class="rn">GALILEE</b>Regions and seas are named on the map</span></div>`;
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
    // A pulsing ring marks the chosen place (still with reduced motion).
    L.marker([p.lat, p.lon!], { icon: L.divIcon({ className: "mpulse", html: "<i></i><i></i>", iconSize: [34, 34] }), interactive: false, keyboard: false }).addTo(s.extra);
    if (fly) s.map.flyTo([p.lat, p.lon!], Math.max(s.map.getZoom(), 8), { duration: reduced() ? 0 : 0.6 });
  }
  drawPlaces(); // the chosen place is always drawn on its own, never inside a group
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
  drawPlaces();
  renderHome();
}

/** A tab tapped while the map is still loading, applied once it is ready. */
let pendingView: View | null = null;

function onClick(e: Event) {
  const t = e.target as HTMLElement;
  if (!state) {
    const tab = t.closest<HTMLElement>("[data-mv]");
    if (tab) {
      pendingView = tab.dataset.mv as View;
      root!.querySelectorAll("[data-mv]").forEach((b) => b.setAttribute("aria-selected", String(b === tab)));
    }
    return;
  }
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
