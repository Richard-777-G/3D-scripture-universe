import { useSyncExternalStore } from "react";

/** Tiny hash router: #/home, #/read/42/3/16, #/story/2, #/connections, #/places, #/places/evidence, #/search/john%203%3A16 */
export type Route =
  | { tab: "home" }
  | { tab: "read"; b?: number; c?: number; v?: number }
  | { tab: "story"; step?: number }
  | { tab: "connections" }
  | { tab: "places"; sub?: "map" | "list" | "evidence"; place?: string }
  | { tab: "search"; q: string };

export function parse(hash: string): Route {
  const p = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  switch (p[0]) {
    case "read": return { tab: "read", b: p[1] ? +p[1] : undefined, c: p[2] ? +p[2] : undefined, v: p[3] ? +p[3] : undefined };
    case "story": return { tab: "story", step: p[1] ? +p[1] : undefined };
    case "connections": return { tab: "connections" };
    case "places": return { tab: "places", sub: (p[1] as any) || "map", place: p[2] };
    case "search": return { tab: "search", q: p[1] || "" };
    default: return { tab: "home" };
  }
}

export function href(r: Route): string {
  switch (r.tab) {
    case "read": return "#/read" + (r.b != null ? `/${r.b}` : "") + (r.c != null ? `/${r.c}` : "") + (r.v != null ? `/${r.v}` : "");
    case "story": return "#/story" + (r.step != null ? `/${r.step}` : "");
    case "places": return `#/places/${r.sub || "map"}` + (r.place ? `/${encodeURIComponent(r.place)}` : "");
    case "search": return `#/search/${encodeURIComponent(r.q)}`;
    default: return `#/${r.tab}`;
  }
}

export const go = (r: Route) => { location.hash = href(r); };

export function useRoute(): Route {
  const hash = useSyncExternalStore((f) => { addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, () => location.hash);
  return parse(hash);
}
