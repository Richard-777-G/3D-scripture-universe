/**
 * Section V: one state model drives the whole console (brief V3).
 *
 * The wheel engine stays the source of truth for what a person taps; this model mirrors it
 * every frame (selection, threads drawn, camera) and adds the console's own state (camera
 * preset, filter, story step, section). Every number it gives out is computed from the data
 * packs, never typed.
 */
import type { Dataset } from "../data/loader";
import type { Book } from "../data/verse";

type Uni = Record<string, any>;
export const U = (): Uni => (window as unknown as { UNI: Uni }).UNI;

export type Camera = "hero" | "front" | "side" | "top" | "inside";
export type Filter = "best" | "otnt" | "all";
export type Tier = "sourced" | "wording" | "shared";

/** The canonical sections of the Protestant Bible, by first book index (0-based). */
export const SECTIONS: { name: string; call: string; many: boolean; from: number; to: number; t: 0 | 1 }[] = [
  { name: "Law", call: "the Law", many: false, from: 0, to: 4, t: 0 },
  { name: "History", call: "the History books", many: true, from: 5, to: 16, t: 0 },
  { name: "Poetry and Wisdom", call: "Poetry and Wisdom", many: true, from: 17, to: 21, t: 0 },
  { name: "Major Prophets", call: "the Major Prophets", many: true, from: 22, to: 26, t: 0 },
  { name: "Minor Prophets", call: "the Minor Prophets", many: true, from: 27, to: 38, t: 0 },
  { name: "Gospels", call: "the Gospels", many: true, from: 39, to: 42, t: 1 },
  { name: "Acts", call: "Acts", many: false, from: 43, to: 43, t: 1 },
  { name: "Paul's Letters", call: "Paul's Letters", many: true, from: 44, to: 56, t: 1 },
  { name: "General Letters", call: "the General Letters", many: true, from: 57, to: 64, t: 1 },
  { name: "Revelation", call: "Revelation", many: false, from: 65, to: 65, t: 1 },
];

/**
 * One colour per section, for the schematic and the dial. The six tile accents come first,
 * so the console keeps one palette; four more in the same printed-ink family complete the ten.
 */
export const ACCENT = { books: "#c8641e", chapters: "#2f6fb0", verses: "#5b8a3a", threads: "#d4a017", best: "#a2452e", places: "#2e8b84" };
export const SECTION_COLOURS = [ACCENT.books, ACCENT.chapters, ACCENT.verses, ACCENT.threads, ACCENT.best, ACCENT.places, "#6b4fa0", "#3b5f7a", "#8a6d3b", "#b0466e"];

export interface State {
  /** selected book (0-based), chapter number (1-based) and verse index, or null */
  book: number | null;
  chapter: number | null;
  verse: number | null;
  /** the two books of a selected pair, Old then New */
  pair: { o: number; n: number } | null;
  filter: Filter;
  step: number | null;
  section: number | null;
  camera: Camera;
  /** Exploded view (the rings pulled apart) and X-ray (see-through covers) */
  exploded: boolean;
  xray: boolean;
  /** threads the wheel is drawing right now (from the engine: links summed over its drawn lines) */
  drawn: number;
}

export interface Metric {
  key: string;
  label: string;
  value: number;
  unit: string;
  accent: string;
}

export class Model {
  readonly books: Book[];
  readonly counts: Record<string, any>;
  readonly firstOT: number;
  /** first verse index of each book, and one past the last */
  private readonly bookStart: number[] = [];
  /** best-evidence links per book, per pair (o*100+n) and per tier per book */
  readonly links: number[];
  readonly pairs = new Map<number, number>();
  readonly tiers: Record<Tier, number>[];
  private readonly fv: number[];
  private readonly ts: number[];
  private readonly vo: number[];
  private placeVerses: number[][] | null = null;
  state: State = { book: null, chapter: null, verse: null, pair: null, filter: "best", step: null, section: null, camera: "hero", exploded: false, xray: false, drawn: 0 };
  private subs = new Set<() => void>();

  constructor(private readonly data: Dataset) {
    const core = data.core as unknown as Record<string, any>;
    this.books = core.books;
    this.counts = core.counts ?? {};
    this.firstOT = this.books.findIndex((b) => b.t === 1);
    let v = 0;
    for (const b of this.books) {
      this.bookStart.push(v);
      v += b.ch.reduce((a, n) => a + n, 0);
    }
    this.bookStart.push(v);
    this.fv = core.fv;
    this.ts = core.ts;
    this.vo = core.vo;
    this.links = this.books.map(() => 0);
    this.tiers = this.books.map(() => ({ sourced: 0, wording: 0, shared: 0 }));
    for (let i = 0; i < this.fv.length; i++) {
      const o = this.bookOf(this.fv[i]), n = this.bookOf(this.ts[i]);
      this.links[o]++;
      this.links[n]++;
      const k = o * 100 + n;
      this.pairs.set(k, (this.pairs.get(k) ?? 0) + 1);
      const t = tierOf(this.vo[i]);
      this.tiers[o][t]++;
      this.tiers[n][t]++;
    }
  }

  bookOf(v: number): number {
    let lo = 0, hi = this.books.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.bookStart[mid] <= v) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  versesIn(b: number): number {
    return this.bookStart[b + 1] - this.bookStart[b];
  }
  get totalVerses(): number {
    return this.bookStart[this.books.length];
  }
  get totalChapters(): number {
    return this.books.reduce((a, b) => a + b.ch.length, 0);
  }

  /** books on the other side joined to book b, busiest first */
  partners(b: number): { b: number; n: number }[] {
    const out: { b: number; n: number }[] = [];
    for (const [k, n] of this.pairs) {
      const o = Math.floor(k / 100), t = k % 100;
      if (o === b) out.push({ b: t, n });
      else if (t === b) out.push({ b: o, n });
    }
    return out.sort((x, y) => y.n - x.n);
  }

  /** the section (index into SECTIONS) a book belongs to */
  sectionOf(b: number): number {
    return SECTIONS.findIndex((x) => b >= x.from && b <= x.to);
  }

  /** best-evidence threads of a section (each thread has one end in each Testament, so the sum is exact) */
  sectionLinks(k: number): number {
    const x = SECTIONS[k];
    let n = 0;
    for (let b = x.from; b <= x.to; b++) n += this.links[b];
    return n;
  }

  /** books in the other Testament joined to a section, busiest first */
  sectionPartners(k: number): { b: number; n: number }[] {
    const x = SECTIONS[k], tally = new Map<number, number>();
    for (let b = x.from; b <= x.to; b++) for (const p of this.partners(b)) tally.set(p.b, (tally.get(p.b) ?? 0) + p.n);
    return [...tally].map(([b, n]) => ({ b, n })).sort((a, c) => c.n - a.n);
  }

  /** the books with the most best-evidence links */
  busiest(k: number): number[] {
    return this.links.map((n, b) => ({ n, b })).sort((x, y) => y.n - x.n).slice(0, k).map((x) => x.b);
  }

  /** links of one chapter (1-based) of book b */
  chapterLinks(b: number, c: number): { total: number; tiers: Record<Tier, number> } {
    const lo = this.bookStart[b] + this.books[b].ch.slice(0, c - 1).reduce((a, n) => a + n, 0);
    const hi = lo + this.books[b].ch[c - 1];
    const tiers = { sourced: 0, wording: 0, shared: 0 };
    let total = 0;
    for (let i = 0; i < this.fv.length; i++) {
      if ((this.fv[i] >= lo && this.fv[i] < hi) || (this.ts[i] >= lo && this.ts[i] < hi)) {
        total++;
        tiers[tierOf(this.vo[i])]++;
      }
    }
    return { total, tiers };
  }

  /** The place pack loads once, on first need, so the console starts fast. */
  async loadPlaces(): Promise<void> {
    if (this.placeVerses) return;
    const url = this.data.assets.geo;
    if (!url) return;
    const g = await (await fetch(url)).json();
    this.placeVerses = (g.places as { v: number[] }[]).map((p) => p.v);
    // A new state object, so every view that reads the model draws again with the places.
    this.state = { ...this.state };
    this.emit();
  }

  /** places named in the current selection, or null while the place pack loads */
  placesNamed(): number | null {
    const s = this.state;
    if (s.book === null && s.pair === null) return Number(this.counts.placesNamed ?? 0) || null;
    if (!this.placeVerses) return null;
    const inSel = (v: number) => {
      const b = this.bookOf(v);
      return s.pair ? b === s.pair.o || b === s.pair.n : b === s.book;
    };
    return this.placeVerses.filter((vs) => vs.some(inSel)).length;
  }

  metrics(): Metric[] {
    const s = this.state;
    const placed = this.placesNamed();
    if (s.book === null && s.pair === null)
      return [
        { key: "books", label: "Books", value: this.books.length, unit: "on the wheel", accent: ACCENT.books },
        { key: "chapters", label: "Chapters", value: this.totalChapters, unit: "in all", accent: ACCENT.chapters },
        { key: "verses", label: "Verses", value: this.totalVerses, unit: "in all", accent: ACCENT.verses },
        { key: "threads", label: "Threads shown", value: s.drawn, unit: "drawn now", accent: ACCENT.threads },
        { key: "best", label: "Best evidence", value: Number(this.counts.best ?? 0), unit: "links", accent: ACCENT.best },
        { key: "places", label: "Places named", value: placed ?? 0, unit: "with a location", accent: ACCENT.places },
      ];
    const books = s.pair ? [s.pair.o, s.pair.n] : [s.book!];
    const b = books[0];
    const chapters = s.chapter !== null && !s.pair ? 1 : books.reduce((a, x) => a + this.books[x].ch.length, 0);
    const verses = s.chapter !== null && !s.pair ? this.books[b].ch[s.chapter - 1] : books.reduce((a, x) => a + this.versesIn(x), 0);
    const best = s.pair
      ? this.pairs.get(s.pair.o * 100 + s.pair.n) ?? 0
      : s.chapter !== null
        ? this.chapterLinks(b, s.chapter).total
        : this.links[b];
    const lit = s.pair ? 2 : 1 + this.partners(b).length;
    return [
      { key: "books", label: "Books", value: lit, unit: s.pair ? "the pair" : "lit on the wheel", accent: ACCENT.books },
      { key: "chapters", label: "Chapters", value: chapters, unit: s.chapter !== null && !s.pair ? `chapter ${s.chapter}` : "in the selection", accent: ACCENT.chapters },
      { key: "verses", label: "Verses", value: verses, unit: "in the selection", accent: ACCENT.verses },
      { key: "threads", label: "Threads shown", value: s.drawn, unit: "drawn now", accent: ACCENT.threads },
      { key: "best", label: "Best evidence", value: best, unit: "links", accent: ACCENT.best },
      { key: "places", label: "Places named", value: placed ?? 0, unit: placed === null ? "loading" : "in these books", accent: ACCENT.places },
    ];
  }

  /** best-evidence threads lit by the current selection (all of them when nothing is chosen) */
  lit(): number {
    const s = this.state;
    if (s.pair) return this.pairs.get(s.pair.o * 100 + s.pair.n) ?? 0;
    if (s.book !== null) return s.chapter !== null ? this.chapterLinks(s.book, s.chapter).total : this.links[s.book];
    if (s.section !== null) return this.sectionLinks(s.section);
    return Number(this.counts.best ?? 0);
  }

  /** The plain paragraph for the current selection; every number from the data. */
  paragraph(): { title: string; text: string } {
    const s = this.state, B = (i: number) => this.books[i].n, f = (n: number) => n.toLocaleString("en-US");
    const nt = this.books.length - this.firstOT;
    if (s.pair) {
      const k = this.pairs.get(s.pair.o * 100 + s.pair.n) ?? 0;
      return {
        title: `How does ${B(s.pair.o)} point to ${B(s.pair.n)}?`,
        text: `${B(s.pair.o)} and ${B(s.pair.n)} share ${f(k)} best-evidence ${k === 1 ? "thread" : "threads"}. Each one joins a passage in ${B(s.pair.o)} to a passage in ${B(s.pair.n)} that quotes it, repeats its words or shares its rare words. Tap a thread's verse in the reader to see the words side by side.`,
      };
    }
    if (s.book !== null) {
      const b = s.book, other = b < this.firstOT ? "New" : "Old";
      const top = this.partners(b)[0];
      const t = s.chapter !== null ? this.chapterLinks(b, s.chapter).tiers : this.tiers[b];
      const n = s.chapter !== null ? this.chapterLinks(b, s.chapter).total : this.links[b];
      const where = s.chapter !== null ? `${B(b)} ${s.chapter}` : B(b);
      if (!n) return { title: `How does ${where} connect?`, text: `${where} has no best-evidence thread to the ${other} Testament. Its links are in the All Old ↔ New set; open it in the reader to see them.` };
      return {
        title: b < this.firstOT ? `How does ${where} point to Jesus?` : `How does ${where} connect to the Old Testament?`,
        text: `${where} is joined to the ${other} Testament by ${f(n)} best-evidence ${n === 1 ? "thread" : "threads"}: ${f(t.sourced)} sourced ${t.sourced === 1 ? "prophecy" : "prophecies"}, ${f(t.wording)} with the same wording and ${f(t.shared)} sharing rare words.${top && s.chapter === null ? ` The most run to ${B(top.b)} (${f(top.n)}).` : ""}`,
      };
    }
    if (s.section !== null) {
      const x = SECTIONS[s.section], n = this.sectionLinks(s.section), top = this.sectionPartners(s.section)[0];
      const span = x.from === x.to ? B(x.from) : `${B(x.from)} to ${B(x.to)}`;
      const count = x.to - x.from + 1;
      const what = x.from === x.to ? "" : ` (${count} books, ${span})`;
      const Call = x.call[0].toUpperCase() + x.call.slice(1);
      return {
        title: x.t === 0 ? `How ${x.many ? "do" : "does"} ${x.call} point to Jesus?` : `How ${x.many ? "do" : "does"} ${x.call} connect to the Old Testament?`,
        text: `${Call}${what} ${x.many ? "have" : "has"} ${f(n)} best-evidence ${n === 1 ? "thread" : "threads"} to the ${x.t === 0 ? "New" : "Old"} Testament.${top ? ` The most run to ${B(top.b)} (${f(top.n)}).` : ""} Tap a book to see its own.`,
      };
    }
    return {
      title: "How does the Old Testament point to Jesus?",
      text: `The lower ring holds the ${this.firstOT} books of the Old Testament, the upper ring the ${nt} of the New. Each thread joins an Old Testament passage to a New Testament one where the evidence is strongest: a sourced prophecy, the same wording, or rare words they share. ${f(Number(this.counts.best ?? 0))} threads in all. Tap a book to see its own.`,
    };
  }

  /** Mirror the engine into the model; returns true when anything changed. */
  sync(): boolean {
    const u = U();
    if (!u) return false;
    const book: number | null = u.sel ?? null;
    const g = u.selChap;
    const chapter = g != null && u.chs?.[g] && u.chs[g].b === book ? u.chs[g].c : null;
    const pair = u.pair ? { o: u.pair.o, n: u.pair.n } : null;
    let drawn = 0;
    const M = u.M?.() as Float32Array | undefined;
    // Each drawn line can carry several links; the sum is the number of threads on the wheel.
    if (M) for (let i = 0; i < M.length; i++) drawn += M[i];
    drawn = Math.round(drawn);
    const s = this.state;
    const changed = s.book !== book || s.chapter !== chapter || (s.pair?.o ?? -1) !== (pair?.o ?? -1) || (s.pair?.n ?? -1) !== (pair?.n ?? -1) || s.drawn !== drawn;
    if (changed) {
      const section = book !== null && book !== s.book ? this.sectionOf(book) : s.section;
      this.state = { ...s, book, chapter, pair, drawn, section };
      if ((book !== null || pair) && !this.placeVerses) void this.loadPlaces();
      this.emit();
    }
    return changed;
  }

  set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }
  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  private emit(): void {
    for (const fn of this.subs) fn();
  }
}

export function tierOf(vo: number): Tier {
  return vo >= 30 ? "sourced" : vo >= 20 ? "wording" : "shared";
}
