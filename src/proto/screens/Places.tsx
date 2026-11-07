import { useEffect, useMemo, useRef, useState } from "react";
import { Button, SearchField, Input, Label } from "react-aria-components";
import { ExternalLink } from "lucide-react";
import maplibregl, { type GeoJSONSource, type LayerSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { TopBar, Segmented, Sheet, Loading } from "../ui";
import { fmt, type AppData, type Place, type Evidence } from "../data";
import { go, href } from "../router";
import { useSettings } from "../settings";

const BAND = {
  known: { word: "Location known", long: "Scholars agree where this place was." },
  likely: { word: "Likely location", long: "Most scholars place it here, but not all." },
  debated: { word: "Location debated", long: "Scholars disagree. This is the most supported suggestion." },
  unknown: { word: "Location unknown", long: "No location has enough support to put it on the map." },
};
const pct = (s: number | null) => (s == null ? "" : `${Math.round(Math.max(0, s) / 10)}%`);

let protocolAdded = false;

export function Places({ d, sub = "map", place }: { d: AppData; sub?: "map" | "list" | "evidence"; place?: string }) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [sel, setSel] = useState<Place | null>(null);
  const [ev, setEv] = useState<Evidence | null>(null);
  useEffect(() => { d.pack("geo").then((g) => setPlaces((g.places as Place[]).sort((a, b) => a.n.localeCompare(b.n)))); }, [d]);
  useEffect(() => {
    if (!places || !place) return;
    const p = places.find((x) => x.id === place) || places.filter((x) => x.n.toLowerCase() === place.toLowerCase()).sort((a, b) => b.v.length - a.v.length)[0];
    if (p) setSel(p);
  }, [places, place]);
  return (
    <>
      <TopBar title="Places & evidence" back={{ label: "Home", to: { tab: "home" } }} />
      <main className={`screen places sub-${sub}`} id="main">
        <Segmented label="View" value={sub} onChange={(k) => go({ tab: "places", sub: k as any })}
          options={[["map", "Map"], ["list", "List of places"], ["evidence", "Evidence"]]} />
        {sub === "evidence" ? <EvidenceList d={d} onOpen={setEv} />
          : !places ? <Loading what="places" />
            : sub === "list" ? <PlaceList places={places} onOpen={setSel} />
              : <PlaceMap places={places} sel={sel} onOpen={setSel} />}
      </main>
      {sel && <Sheet title={sel.n} isOpen onOpenChange={(o) => !o && setSel(null)}><PlaceSheet d={d} p={sel} /></Sheet>}
      {ev && <Sheet title={ev.title} isOpen onOpenChange={(o) => !o && setEv(null)}><EvidenceSheet e={ev} /></Sheet>}
    </>
  );
}

function PlaceMap({ places, sel, onOpen }: { places: Place[]; sel: Place | null; onOpen: (p: Place) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const s = useSettings();
  const night = s.theme === "night";
  const [tm, setTm] = useState<"all" | "ot" | "nt">("all");
  const [modern, setModern] = useState(false);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: places.filter((p) => p.lat != null && (tm === "all" || (tm === "ot" ? p.ot : p.nt))).map((p) => ({
      type: "Feature" as const, id: p.id,
      properties: { id: p.id, n: p.n, b: p.b, w: p.v.length, t: p.ot && p.nt ? "both" : p.nt ? "nt" : "ot" },
      geometry: { type: "Point" as const, coordinates: [p.lon!, p.lat!] },
    })),
  }), [places, tm]);

  useEffect(() => {
    if (!protocolAdded) { maplibregl.addProtocol("pmtiles", new Protocol().tile); protocolAdded = true; }
    const origin = location.origin;
    // A calm atlas palette: soft blue water, warm land (the light flavour's water is a bright cyan).
    const flavor = night ? namedFlavor("dark") : { ...namedFlavor("light"), water: "#b9d3e6", earth: "#efe9dc", background: "#efe9dc", sand: "#e8dcc0", scrub_a: "#e1e3cf", scrub_b: "#e1e3cf", wood_a: "#d7e2cc", wood_b: "#d7e2cc" };
    // A Bible atlas by default: land, water, hills and woods, with no modern names, borders or roads.
    const ATLAS = /^(background|earth|landcover|water|water_stream|water_river|landuse_park|landuse_beach|water_waterway_label|water_label_ocean|water_label_lakes|earth_label_islands)$/;
    const base = (src: string, prefix: string, withBg: boolean): LayerSpecification[] =>
      layers(src, flavor, { lang: "en" }).filter((l) => (withBg || l.type !== "background") && (modern || ATLAS.test(l.id))).map((l) => ({ ...l, id: prefix + l.id }) as LayerSpecification);
    const css = getComputedStyle(document.documentElement);
    const col = (v: string) => css.getPropertyValue(v).trim();
    const map = new maplibregl.Map({
      container: box.current!,
      style: {
        version: 8,
        glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
        sprite: `${origin}/map/sprites/${night ? "dark" : "light"}`,
        sources: {
          world: { type: "vector", url: `pmtiles://${origin}/tiles/bible-world.pmtiles`, attribution: "© OpenStreetMap contributors · Protomaps" },
          holy: { type: "vector", url: `pmtiles://${origin}/tiles/holy-land.pmtiles` },
          places: { type: "geojson", data: geojson, cluster: true, clusterMaxZoom: 8, clusterRadius: 44, attribution: "Places: OpenBible.info (CC BY)" },
        },
        layers: [
          ...base("world", "w-", true),
          ...base("holy", "h-", false),
          { id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"],
            paint: { "circle-color": col("--action"), "circle-opacity": 0.9, "circle-radius": ["step", ["get", "point_count"], 16, 20, 20, 80, 26], "circle-stroke-width": 2, "circle-stroke-color": col("--surface") } },
          { id: "cluster-n", type: "symbol", source: "places", filter: ["has", "point_count"],
            layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Medium"], "text-size": 14 }, paint: { "text-color": col("--on-action") } },
          { id: "pt", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "w"], 1, 7, 50, 10, 500, 13],
              "circle-color": ["match", ["get", "t"], "nt", col("--nt"), "both", col("--ok"), col("--ot")],
              "circle-opacity": ["match", ["get", "b"], "debated", 0, "likely", 0.45, 1],
              "circle-stroke-color": ["match", ["get", "b"], "known", col("--surface"), ["match", ["get", "t"], "nt", col("--nt"), "both", col("--ok"), col("--ot")]],
              "circle-stroke-width": ["match", ["get", "b"], "debated", 3, 2],
            } },
          { id: "pt-label", type: "symbol", source: "places", filter: ["!", ["has", "point_count"]], minzoom: 7,
            layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Medium"], "text-size": 15, "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true },
            paint: { "text-color": col("--ink"), "text-halo-color": col("--surface"), "text-halo-width": 2 } },
        ],
      },
      center: [35.3, 31.7], zoom: 6.6, minZoom: 3, maxZoom: 13,
      maxBounds: [[-20, 2], [70, 52]],
      attributionControl: { compact: false },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Leaving the map while tiles load cancels those requests; that is expected, not an error.
    map.on("error", (e) => { if ((e.error as any)?.name !== "AbortError") console.error(e.error); });
    map.on("click", "clusters", async (e) => {
      const f = e.features![0];
      const z = await (map.getSource("places") as GeoJSONSource).getClusterExpansionZoom(f.properties!.cluster_id);
      map.easeTo({ center: (f.geometry as any).coordinates, zoom: z + 0.5, duration: s.mode === "standard" ? 400 : 0 });
    });
    map.on("click", "pt", (e) => { const p = byId.get(e.features![0].properties!.id); if (p) onOpen(p); });
    for (const l of ["clusters", "pt"]) { map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer")); map.on("mouseleave", l, () => (map.getCanvas().style.cursor = "")); }
    mapRef.current = map;
    (window as any).__protoMap = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [night, modern]);

  useEffect(() => { const m = mapRef.current; const src = m && (m.getSource("places") as GeoJSONSource | undefined); if (src) src.setData(geojson); }, [geojson]);
  useEffect(() => { if (sel && sel.lat != null && mapRef.current) mapRef.current.easeTo({ center: [sel.lon!, sel.lat], zoom: Math.max(mapRef.current.getZoom(), 9), duration: 0 }); }, [sel]);

  return (
    <>
      <Segmented label="Places from" value={tm} onChange={(k) => setTm(k as any)} options={[["all", "All"], ["ot", "Old Testament"], ["nt", "New Testament"]]} />
      <div className="mapbox" ref={box} role="application" aria-label="Map of Bible places. The List of places view has the same places as text." />
      <div className="legend-row">
        <span><i className="dot known" /> Location known</span>
        <span><i className="dot likely" /> Likely</span>
        <span><i className="dot debated" /> Debated</span>
        <span><i className="dot cluster" /> Group: tap to open</span>
      </div>
      <label className="check"><input type="checkbox" checked={modern} onChange={(e) => setModern(e.target.checked)} /> Show today’s towns, roads and borders</label>
    </>
  );
}

function PlaceList({ places, onOpen }: { places: Place[]; onOpen: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const list = places.filter((p) => !q || p.n.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <SearchField value={q} onChange={setQ} className="search" aria-label="Find a place">
        <Label className="seg-label">Find a place</Label>
        <Input placeholder="For example, Bethlehem" />
      </SearchField>
      <p className="hint">{fmt(list.length)} {list.length === 1 ? "place" : "places"}</p>
      <ul className="rows">
        {list.slice(0, 200).map((p) => (
          <li key={p.id}><button className="row" onClick={() => onOpen(p)}><b>{p.n}</b><span>{p.t || "place"} · {BAND[p.b].word} · {p.v.length} {p.v.length === 1 ? "verse" : "verses"}</span></button></li>
        ))}
      </ul>
      {list.length > 200 && <p className="hint">Type a name to find more.</p>}
    </div>
  );
}

function PlaceSheet({ d, p }: { d: AppData; p: Place }) {
  const [all, setAll] = useState(false);
  const vs = all ? p.v : p.v.slice(0, 6);
  const b = BAND[p.b];
  return (
    <div>
      <p className={`conf ${p.b}`}><b>{b.word}</b>{p.lat != null && <> · {p.d} {p.s != null && <small>(scholars’ confidence {pct(p.s)})</small>}</>}</p>
      <p className="hint">{b.long}</p>
      {p.alt.length > 0 && <p className="hint"><b>Other suggestions:</b> {p.alt.map((a) => `${a.d} (${pct(a.s)})`).join(" · ")}</p>}
      <h4 className="sub">Verses that name {p.n}</h4>
      <ul className="linklist">
        {vs.map((v) => { const r = d.vi.ref(v); return <li key={v}><a href={href({ tab: "read", b: r.book - 1, c: r.chapter, v: r.verse })}><b>{d.label(v)}</b><span className="read small">{d.text(v)}</span></a></li>; })}
      </ul>
      {!all && p.v.length > 6 && <Button className="btn secondary wide" onPress={() => setAll(true)}>Show all {p.v.length} verses</Button>}
      <a className="btn quiet wide" href={`https://www.openbible.info/geo/ancient/${p.id}/${p.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden /> Photos and sources at OpenBible.info</a>
    </div>
  );
}

const GRADE: Record<string, string> = { artifact: "Physical find", manuscript: "Ancient manuscript", writer: "Ancient writers", place: "Place and tradition", text: "Bible text", tradition: "Tradition" };

function EvidenceList({ d, onOpen }: { d: AppData; onOpen: (e: Evidence) => void }) {
  const s = useSettings();
  return (
    <div>
      <p className="hint">Real objects, manuscripts and places from history that touch the Bible’s story. Each one says what it shows, and what it does not.</p>
      <ul className="evlist">
        {d.evidence.map((e) => (
          <li key={e.id}><button className="evcard" onClick={() => onOpen(e)}>
            <span className="badge">{GRADE[e.grade] || e.grade}</span>
            <b>{e.title}</b>
            <span>{s.mode === "standard" ? e.place : e.kid}</span>
          </button></li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceSheet({ e }: { e: Evidence }) {
  const s = useSettings();
  return (
    <div className="evsheet">
      <p className="lead">{e.kid}</p>
      {s.mode !== "kids" && <>
        <h4 className="sub">What was found</h4><p>{e.what}</p>
        <h4 className="sub">What it shows</h4><p>{e.shows}</p>
        {(e as any).limits && <><h4 className="sub">What it does not show</h4><p>{(e as any).limits}</p></>}
        <p className="hint">Where: {e.place}</p>
      </>}
      {e.src?.length > 0 && <>
        <h4 className="sub">Sources</h4>
        <ul className="src">{e.src.map((x) => <li key={x.u}><a href={x.u} target="_blank" rel="noopener noreferrer">{x.t} <ExternalLink aria-hidden size={14} /></a></li>)}</ul>
      </>}
    </div>
  );
}
