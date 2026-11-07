/**
 * Data for the prototype: the same versioned packs the live app uses.
 * Nothing here is made up; every list and count is read from the packs.
 */
import { loadDataset, type Dataset } from "../data/loader";
import { VerseIndex } from "../data/verse";

export const LABEL = { sourced: 1, wording: 2, shared: 4, tsk: 8, openbible: 16 } as const;
export const LABEL_ORDER: { bit: number; key: string; name: string; plain: string }[] = [
  { bit: LABEL.sourced, key: "sourced", name: "Sourced prophecy", plain: "Published sources say this passage points to the other." },
  { bit: LABEL.wording, key: "wording", name: "Same wording", plain: "One passage repeats the other’s words." },
  { bit: LABEL.shared, key: "shared", name: "Shared rare words", plain: "Both use words that are rare in the Bible." },
  { bit: LABEL.tsk, key: "tsk", name: "Listed in TSK", plain: "The Treasury of Scripture Knowledge (about 1880) lists this link." },
  { bit: LABEL.openbible, key: "openbible", name: "Listed by readers", plain: "Readers of OpenBible.info suggested this link." },
];

export interface Counts {
  best: number; otnt: number; all: number; within: number; openbible: number; verses: number; books: number;
  places: number; placesNamed: number; routes: number;
  labels: Record<string, number>; otntLabels: Record<string, number>;
  tsk: { links: number; matchedOpenBible: number; newLinks: number; references: number };
}

export interface Link { a: number; s: number; e: number; v: number; l: number }
export interface StoryStep { id: string; chapter: string; kid: string; title: string; text: string; ot: { s: number; e: number; b: number }[]; nt: { s: number; e: number; b: number }[] }
export interface Place {
  id: string; n: string; k: string; slug: string; t: string; lat: number | null; lon: number | null; s: number | null;
  b: "known" | "likely" | "debated" | "unknown"; d: string; alt: { d: string; s: number; lat: number; lon: number }[]; v: number[]; ot: boolean; nt: boolean;
}
export interface Evidence { id: string; title: string; kid: string; place: string; grade: string; what: string; shows: string; notShow?: string; books: string[]; src: { t: string; u: string }[] }

export interface AppData {
  ds: Dataset;
  vi: VerseIndex;
  books: { n: string; t: 0 | 1; ch: number[] }[];
  counts: Counts;
  story: StoryStep[];
  evidence: Evidence[];
  text(v: number): string;
  label(v: number): string;
  range(s: number, e: number): string;
  chapter(b: number, c: number): number[];
  bestLinks: Link[];
  pack(k: string): Promise<any>;
}

let cache: Promise<AppData> | null = null;

export function loadAppData(): Promise<AppData> {
  return (cache ||= (async () => {
    const ds = await loadDataset(import.meta.env.BASE_URL + "data/");
    const core = ds.core as any;
    const books = core.books;
    const vi = new VerseIndex(books);
    const assets = ds.assets;
    const packs = new Map<string, Promise<any>>();
    const pack = (k: string) => {
      if (!assets[k]) return Promise.reject(new Error(`no pack ${k}`));
      if (!packs.has(k)) packs.set(k, fetch(assets[k]).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return k.startsWith("v_") ? r.text() : r.json(); }).catch((e) => { packs.delete(k); throw e; }));
      return packs.get(k)!;
    };
    const label = (v: number) => vi.label(v);
    const range = (s: number, e: number) => {
      if (s === e) return label(s);
      const a = vi.ref(s), b = vi.ref(e);
      if (a.book !== b.book) return `${label(s)} – ${label(e)}`;
      return a.chapter === b.chapter ? `${label(s)}–${b.verse}` : `${label(s)}–${b.chapter}:${b.verse}`;
    };
    // Best evidence links: the wheel's set (Old Testament range -> New Testament range).
    const X = core.xrefs || core;
    const bestLinks: Link[] = X.fv.map((fv: number, i: number) => ({ a: fv, s: X.ts[i], e: X.te[i], v: X.vo[i], l: 0, fe: X.fe ? X.fe[i] : fv }));
    const J = ds.core.J as any;
    const storyMeta = ds.story as any[];
    const story: StoryStep[] = storyMeta.map((m) => {
      const it = J.items.find((x: any) => x.j === "story" && x.id === m.id) || {};
      return { id: m.id, chapter: m.chapter, kid: m.kid, title: it.title || m.chapter, text: it.text || "", ot: it.ot || [], nt: it.nt || [] };
    });
    return {
      ds, vi, books, counts: core.counts, story, evidence: ds.evidence as Evidence[],
      text: (v) => ds.kjv[v] || "", label, range,
      chapter: (b, c) => { const start = vi.index({ book: b + 1, chapter: c, verse: 1 })!; return Array.from({ length: books[b].ch[c - 1] }, (_, i) => start + i); },
      bestLinks, pack,
    };
  })());
}

/** Expand a lazily loaded link pack (see pipeline/allconnections.mjs). */
export function unpack(p: { f: number[]; t: number[]; n: number[]; v: number[]; l: number[] }): Link[] {
  const out: Link[] = [];
  let a = 0;
  for (let i = 0; i < p.f.length; i++) { a += p.f[i]; const s = a + p.t[i]; out.push({ a, s, e: s + p.n[i], v: p.v[i], l: p.l[i] }); }
  return out;
}

/** Every connected verse for one verse, from all links, grouped by its strongest label. */
export async function connectedTo(d: AppData, v: number): Promise<{ other: [number, number]; l: number; votes: number }[]> {
  const [xon, xin] = await Promise.all([d.pack("xon").then(unpack), d.pack("xin").then(unpack)]);
  const out = new Map<string, { other: [number, number]; l: number; votes: number }>();
  const add = (s: number, e: number, l: number, votes: number) => {
    const k = `${s}|${e}`;
    const o = out.get(k);
    if (o) { o.l |= l; o.votes = Math.max(o.votes, votes); } else out.set(k, { other: [s, e], l, votes });
  };
  for (const r of [...xon, ...xin]) {
    if (r.a === v) add(r.s, r.e, r.l, r.v);
    else if (r.s <= v && v <= r.e) add(r.a, r.a, r.l, r.v);
  }
  return [...out.values()];
}

export const strongest = (l: number) => LABEL_ORDER.find((x) => l & x.bit) || LABEL_ORDER[4];
export const fmt = (n: number) => n.toLocaleString("en-US");
