/**
 * Everything the new reader reads, straight from the data packs (never typed by hand).
 *
 * - Best evidence: the wheel's links in core.xrefs (OT range fv..fe, NT range ts..te, tier vo).
 * - All Old <-> New: the xon pack; All: xon plus xin (every OpenBible + TSK link, labelled).
 * - Words: the wNN packs (STEPBible), meanings from lexh / lexg.
 * Big packs load only when someone asks for them.
 */
import type { Dataset } from "../data/loader";
import type { Book } from "../data/verse";

export const VERSIONS: [key: string, short: string, name: string][] = [
  ["kjv", "KJV", "King James Version (1769)"],
  ["bsb", "BSB", "Berean Standard Bible, modern English"],
  ["asv", "ASV", "American Standard Version (1901)"],
  ["bbe", "BBE", "Bible in Basic English, simple words"],
  ["ylt", "YLT", "Young’s Literal Translation (1898), word for word"],
  ["darby", "Darby", "Darby Translation (1890)"],
  ["webster", "Webster", "Webster’s Bible (1833)"],
  ["tel", "తెలుగు", "Telugu Bible, Old Version"],
  ["irv", "తెలుగు IRV", "Telugu, Indian Revised Version 2019"],
];

/** Evidence labels, strongest first (bit flags from pipeline/allconnections.mjs). */
export const LABELS = [
  { bit: 1, key: "sourced", name: "Sourced prophecy" },
  { bit: 2, key: "wording", name: "Same wording" },
  { bit: 4, key: "shared", name: "Shared rare words" },
  { bit: 8, key: "tsk", name: "Listed in TSK" },
  { bit: 16, key: "readers", name: "Listed by readers" },
] as const;
export type LabelKey = (typeof LABELS)[number]["key"];

export interface Link {
  /** first and last verse of the other passage */
  s: number;
  e: number;
  /** label bit flags */
  l: number;
  /** reader votes on OpenBible (0 if none) */
  votes: number;
  /** index into the wheel's links, when this is a Best-evidence link (for "See it on the wheel") */
  wheel?: number;
  /** words both passages share, from the evidence test */
  words?: string;
}

export type LinkSet = "best" | "otnt" | "all";

interface Pack {
  f: number[];
  t: number[];
  n: number[];
  v: number[];
  l: number[];
}

/** Word row: original, transliteration, English, Strong's number, grammar, dictionary word. */
export type Word = [string, string, string, string, string, string];
/** Lexicon row: lemma, transliteration, short gloss, definition. */
export type Lex = [string, string, string, string];

export class ReaderData {
  readonly books: Book[];
  readonly kjv: string[];
  readonly counts: Record<string, unknown>;
  private readonly chapterStart: number[][] = [];
  private readonly bookOfV: Uint8Array;
  private readonly chapOfV: Uint16Array;
  private readonly bestBy = new Map<number, Link[]>();
  private readonly texts = new Map<string, Promise<string[]>>();
  private readonly packs = new Map<string, Promise<Map<number, Link[]>>>();
  private readonly words = new Map<number, Promise<Record<string, Word[]>>>();
  private readonly lex = new Map<string, Promise<Record<string, Lex>>>();

  constructor(private readonly data: Dataset) {
    const core = data.core as unknown as Record<string, any>;
    this.books = core.books;
    this.kjv = data.kjv;
    this.counts = core.counts ?? {};
    this.bookOfV = new Uint8Array(data.kjv.length);
    this.chapOfV = new Uint16Array(data.kjv.length);
    let v = 0;
    this.books.forEach((b, bi) => {
      const starts: number[] = [];
      b.ch.forEach((n, ci) => {
        starts.push(v);
        this.bookOfV.fill(bi, v, v + n);
        this.chapOfV.fill(ci + 1, v, v + n);
        v += n;
      });
      this.chapterStart.push(starts);
    });
    // Best evidence: one wheel link joins an OT range and an NT range; list it under every verse of each side.
    const fv: number[] = core.fv, fe: number[] = core.fe ?? core.fv, ts: number[] = core.ts, te: number[] = core.te, vo: number[] = core.vo;
    const mw: string[] = core.mw ?? [];
    const add = (at: number, link: Link) => {
      const list = this.bestBy.get(at);
      if (list) list.push(link);
      else this.bestBy.set(at, [link]);
    };
    for (let i = 0; i < fv.length; i++) {
      const l = vo[i] >= 30 ? 1 : vo[i] >= 20 ? 2 : 4;
      for (let x = fv[i]; x <= fe[i]; x++) add(x, { s: ts[i], e: te[i], l, votes: 0, wheel: i, words: mw[i] || undefined });
      for (let x = ts[i]; x <= te[i]; x++) add(x, { s: fv[i], e: fe[i], l, votes: 0, wheel: i, words: mw[i] || undefined });
    }
  }

  get bestCount(): number {
    return Number(this.counts.best ?? 0);
  }

  bookOf(v: number): number {
    return this.bookOfV[v];
  }
  chapterOf(v: number): number {
    return this.chapOfV[v];
  }
  /** first verse of book b (0-based), chapter c (1-based) */
  start(b: number, c: number): number {
    return this.chapterStart[b][c - 1];
  }
  verseNo(v: number): number {
    return v - this.chapterStart[this.bookOf(v)][this.chapterOf(v) - 1] + 1;
  }
  label(v: number): string {
    return `${this.books[this.bookOf(v)].n} ${this.chapterOf(v)}:${this.verseNo(v)}`;
  }
  /** "Acts 8:32–33", "Isaiah 53:4–6", "Matthew 1:23", "John 1:1–2:3" */
  range(s: number, e: number): string {
    if (e <= s) return this.label(s);
    if (this.bookOf(s) === this.bookOf(e) && this.chapterOf(s) === this.chapterOf(e)) return `${this.label(s)}–${this.verseNo(e)}`;
    if (this.bookOf(s) === this.bookOf(e)) return `${this.label(s)}–${this.chapterOf(e)}:${this.verseNo(e)}`;
    return `${this.label(s)} – ${this.label(e)}`;
  }

  /** Bible text in one version; KJV is already loaded. */
  text(version: string): Promise<string[]> {
    if (version === "kjv") return Promise.resolve(this.kjv);
    let p = this.texts.get(version);
    if (!p) {
      p = this.fetchText("v_" + version).then((t) => t.split("\n"));
      p.catch(() => this.texts.delete(version));
      this.texts.set(version, p);
    }
    return p;
  }

  best(v: number): Link[] {
    return dedupe(this.bestBy.get(v) ?? []);
  }

  /** Links for a verse in the chosen set; "best" answers at once, the others load their packs first. */
  async links(v: number, set: LinkSet): Promise<Link[]> {
    if (set === "best") return this.best(v);
    const on = await this.pack("xon");
    const own = on.get(v) ?? [];
    if (set === "otnt") return dedupe(own);
    const within = await this.pack("xin");
    return dedupe([...own, ...(within.get(v) ?? [])]);
  }

  /** true once the pack a set needs is in memory (so its count can be shown) */
  ready(set: LinkSet): boolean {
    if (set === "best") return true;
    return this.packs.has("xon") && (set === "otnt" || this.packs.has("xin"));
  }

  private pack(key: "xon" | "xin"): Promise<Map<number, Link[]>> {
    let p = this.packs.get(key);
    if (!p) {
      p = this.fetchJson<Pack>(key).then(indexPack);
      p.catch(() => this.packs.delete(key));
      this.packs.set(key, p);
    }
    return p;
  }

  /** Hebrew or Greek words for one verse (null if the pack has none for it). */
  async wordsOf(v: number): Promise<Word[] | null> {
    const b = this.bookOf(v);
    let p = this.words.get(b);
    if (!p) {
      p = this.fetchJson<Record<string, Word[]>>("w" + String(b + 1).padStart(2, "0"));
      p.catch(() => this.words.delete(b));
      this.words.set(b, p);
    }
    const all = await p;
    return all[`${this.chapterOf(v)}:${this.verseNo(v)}`] ?? null;
  }

  async meaning(strong: string): Promise<Lex | null> {
    const key = strong.startsWith("H") ? "lexh" : "lexg";
    let p = this.lex.get(key);
    if (!p) {
      p = this.fetchJson<Record<string, Lex>>(key);
      p.catch(() => this.lex.delete(key));
      this.lex.set(key, p);
    }
    const all = await p;
    return all[strong] ?? all[strong.replace(/[A-Z]$/, "")] ?? null;
  }

  private async fetchText(key: string): Promise<string> {
    const url = this.data.assets[key];
    if (!url) throw new Error(`no ${key} pack`);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${key}: HTTP ${r.status}`);
    return r.text();
  }
  private async fetchJson<T>(key: string): Promise<T> {
    return JSON.parse(await this.fetchText(key)) as T;
  }
}

/** Index a labelled pack by every verse on either side of each link. */
function indexPack(p: Pack): Map<number, Link[]> {
  const by = new Map<number, Link[]>();
  const add = (at: number, link: Link) => {
    const list = by.get(at);
    if (list) list.push(link);
    else by.set(at, [link]);
  };
  let a = 0;
  for (let i = 0; i < p.f.length; i++) {
    a += p.f[i];
    const s = a + p.t[i], e = s + p.n[i];
    add(a, { s, e, l: p.l[i], votes: p.v[i] });
    // Long ranges (whole chapters) are listed under their first verse only, so one verse does not drown in them.
    if (e - s <= 30) for (let x = s; x <= e; x++) add(x, { s: a, e: a, l: p.l[i], votes: p.v[i] });
    else add(s, { s: a, e: a, l: p.l[i], votes: p.v[i] });
  }
  return by;
}

/** One row per passage: merge labels and keep the highest vote count. */
function dedupe(list: Link[]): Link[] {
  const by = new Map<string, Link>();
  for (const k of list) {
    const id = k.s + ":" + k.e;
    const had = by.get(id);
    if (!had) by.set(id, { ...k });
    else {
      had.l |= k.l;
      had.votes = Math.max(had.votes, k.votes);
      had.wheel ??= k.wheel;
      had.words ??= k.words;
    }
  }
  return [...by.values()].sort((x, y) => strongest(x.l) - strongest(y.l) || y.votes - x.votes || x.s - y.s);
}

/** position of the strongest label (0 = Sourced prophecy) */
export function strongest(l: number): number {
  const i = LABELS.findIndex((x) => l & x.bit);
  return i < 0 ? LABELS.length : i;
}
