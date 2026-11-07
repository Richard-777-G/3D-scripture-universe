import { useEffect, useMemo, useState } from "react";
import { SearchField, Input, Label } from "react-aria-components";
import { TopBar } from "../ui";
import { type AppData } from "../data";
import { href } from "../router";

const ALIAS: Record<string, string> = {
  gen: "Genesis", ex: "Exodus", exo: "Exodus", lev: "Leviticus", num: "Numbers", deut: "Deuteronomy", dt: "Deuteronomy", josh: "Joshua", judg: "Judges",
  sam: "Samuel", kgs: "Kings", ps: "Psalms", psa: "Psalms", psalm: "Psalms", prov: "Proverbs", pr: "Proverbs", eccl: "Ecclesiastes", song: "Song of Solomon",
  isa: "Isaiah", jer: "Jeremiah", lam: "Lamentations", ezek: "Ezekiel", dan: "Daniel", hos: "Hosea", mic: "Micah", zech: "Zechariah", mal: "Malachi",
  mt: "Matthew", matt: "Matthew", mk: "Mark", mrk: "Mark", lk: "Luke", luk: "Luke", jn: "John", jhn: "John", acts: "Acts", rom: "Romans", ro: "Romans",
  cor: "Corinthians", gal: "Galatians", eph: "Ephesians", phil: "Philippians", col: "Colossians", thess: "Thessalonians", tim: "Timothy", heb: "Hebrews",
  jas: "James", pet: "Peter", rev: "Revelation", revelations: "Revelation",
};

/** "John 3:16", "jn 3 16", "1 cor 13" -> book, chapter, verse */
export function parseRef(d: AppData, q: string): { b: number; c: number; v?: number } | null {
  const m = /^\s*([1-3]?\s*[a-z][a-z .]*?)\.?\s+(\d{1,3})(?:\s*[:. ]\s*(\d{1,3}))?\s*$/i.exec(q);
  if (!m) return null;
  let name = m[1].toLowerCase().replace(/\s+/g, " ").trim();
  const num = /^([1-3])\s?(.*)$/.exec(name);
  const stem = num ? num[2] : name;
  const full = ALIAS[stem] || stem;
  name = (num ? num[1] + " " : "") + full.toLowerCase();
  const b = d.books.findIndex((bk) => bk.n.toLowerCase() === name) >= 0 ? d.books.findIndex((bk) => bk.n.toLowerCase() === name)
    : d.books.findIndex((bk) => bk.n.toLowerCase().startsWith(name));
  if (b < 0) return null;
  const c = +m[2], v = m[3] ? +m[3] : undefined;
  if (c < 1 || c > d.books[b].ch.length || (v && v > d.books[b].ch[c - 1])) return null;
  return { b, c, v };
}

export function Search({ d, q0 }: { d: AppData; q0: string }) {
  const [q, setQ] = useState(q0);
  const [places, setPlaces] = useState<{ id: string; n: string; v: number[] }[]>([]);
  useEffect(() => { d.pack("geo").then((g) => setPlaces(g.places)); }, [d]);
  const ref = parseRef(d, q);
  const words = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 3 || ref) return [];
    const out: number[] = [];
    for (let v = 0; v < d.ds.kjv.length && out.length < 30; v++) if (d.ds.kjv[v].toLowerCase().includes(t)) out.push(v);
    return out;
  }, [q, d, ref]);
  const placeHits = q.trim().length >= 3 ? places.filter((p) => p.n.toLowerCase().startsWith(q.trim().toLowerCase())).slice(0, 5) : [];
  return (
    <>
      <TopBar title="Search" back={{ label: "Home", to: { tab: "home" } }} />
      <main className="screen" id="main">
        <SearchField value={q} onChange={setQ} className="search" autoFocus aria-label="Search the Bible">
          <Label className="seg-label">Search for a verse, a word or a place</Label>
          <Input placeholder="For example, John 3:16 or shepherd or Bethlehem" />
        </SearchField>
        {ref && (
          <a className="card result" href={href({ tab: "read", b: ref.b, c: ref.c, v: ref.v })}>
            <b>Open {d.books[ref.b].n} {ref.c}{ref.v ? `:${ref.v}` : ""}</b>
            {ref.v && <span className="read">{d.text(d.vi.index({ book: ref.b + 1, chapter: ref.c, verse: ref.v })!)}</span>}
          </a>
        )}
        {placeHits.length > 0 && (
          <section><h3 className="sub">Places</h3>
            <ul className="rows">{placeHits.map((p) => <li key={p.id}><a className="row" href={href({ tab: "places", sub: "map", place: p.id })}><b>{p.n}</b><span>{p.v.length} verses · show on the map</span></a></li>)}</ul>
          </section>
        )}
        {words.length > 0 && (
          <section><h3 className="sub">Verses with “{q.trim()}”</h3>
            <ul className="linklist">{words.map((v) => { const r = d.vi.ref(v); return <li key={v}><a href={href({ tab: "read", b: r.book - 1, c: r.chapter, v: r.verse })}><b>{d.label(v)}</b><span className="read small">{d.text(v)}</span></a></li>; })}</ul>
          </section>
        )}
        {q.trim().length >= 3 && !ref && !words.length && !placeHits.length && <p className="hint">Nothing found. Try another word, or a reference such as “Psalm 23”.</p>}
      </main>
    </>
  );
}
