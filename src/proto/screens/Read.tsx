import { useEffect, useMemo, useState } from "react";
import { Button } from "react-aria-components";
import { ChevronLeft, ChevronRight, Volume2, Square, Link2, Languages, Copy } from "lucide-react";
import { Sheet, TopBar, LabelBadges, Loading, Segmented } from "../ui";
import { connectedTo, fmt, LABEL_ORDER, strongest, type AppData } from "../data";
import { go, href } from "../router";
import { setSettings, speak, stopSpeaking, useSettings } from "../settings";

export function Read({ d, b, c, v }: { d: AppData; b?: number; c?: number; v?: number }) {
  if (b == null) return <BookPicker d={d} />;
  if (c == null) return <ChapterPicker d={d} b={b} />;
  return <Chapter d={d} b={b} c={c} v={v} />;
}

function BookPicker({ d }: { d: AppData }) {
  const ot = d.books.map((bk, i) => ({ bk, i })).filter((x) => x.bk.t === 0), nt = d.books.map((bk, i) => ({ bk, i })).filter((x) => x.bk.t === 1);
  return (
    <>
      <TopBar title="Read the Bible" back={{ label: "Home", to: { tab: "home" } }} />
      <main className="screen" id="main">
        <p className="lead">Choose a book.</p>
        {[["Old Testament", ot, "Written before Jesus"], ["New Testament", nt, "About Jesus and the first Christians"]].map(([name, list, sub]: any) => (
          <section key={name} aria-labelledby={`h-${name}`}>
            <h2 className="section-h" id={`h-${name}`}>{name} <small>{list.length} books · {sub}</small></h2>
            <div className="grid-books">
              {list.map(({ bk, i }: any) => <a key={i} className="tile" href={href({ tab: "read", b: i })}>{bk.n}</a>)}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}

function ChapterPicker({ d, b }: { d: AppData; b: number }) {
  const n = d.books[b].ch.length;
  useEffect(() => { if (n === 1) go({ tab: "read", b, c: 1 }); }, [b, n]);
  return (
    <>
      <TopBar title={d.books[b].n} back={{ label: "All books", to: { tab: "read" } }} />
      <main className="screen" id="main">
        <p className="lead">Choose a chapter of {d.books[b].n}.</p>
        <div className="grid-ch">
          {Array.from({ length: n }, (_, i) => <a key={i} className="tile num" href={href({ tab: "read", b, c: i + 1 })} aria-label={`Chapter ${i + 1}`}>{i + 1}</a>)}
        </div>
      </main>
    </>
  );
}

function Chapter({ d, b, c, v }: { d: AppData; b: number; c: number; v?: number }) {
  const set = useSettings();
  const verses = useMemo(() => d.chapter(b, c), [d, b, c]);
  const [bsb, setBsb] = useState<string[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const n = d.books[b].ch.length;

  useEffect(() => { setSettings({ last: { b, c } }); }, [b, c]);
  useEffect(() => { if (set.version === "bsb" && !bsb) d.pack("v_bsb").then((t: string) => setBsb(t.split("\n"))); }, [set.version, bsb, d]);
  useEffect(() => {
    if (v == null) return;
    const id = d.chapter(b, c)[v - 1];
    setTimeout(() => document.getElementById(`v${id}`)?.scrollIntoView({ block: "center" }), 50);
    setOpen(id);
  }, [b, c, v, d]);
  useEffect(() => () => stopSpeaking(), [b, c]);

  const text = (x: number) => (set.version === "bsb" && bsb ? bsb[x] : d.text(x));
  const listen = () => {
    if (speaking != null) { stopSpeaking(); setSpeaking(null); return; }
    const ok = speak(verses.map(text), (i) => { setSpeaking(verses[i]); document.getElementById(`v${verses[i]}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, () => setSpeaking(null));
    if (!ok) alert("Read aloud is not available in this browser.");
  };

  return (
    <>
      <TopBar title={`${d.books[b].n} ${c}`} back={{ label: d.books[b].n, to: { tab: "read", b } }} />
      <main className="screen reading" id="main">
        <div className="readbar">
          <Button className="btn primary" onPress={listen}>{speaking != null ? <><Square aria-hidden /> Stop</> : <><Volume2 aria-hidden /> Listen</>}</Button>
          <span className="readbar-ver">{set.version === "bsb" ? "Berean Standard Bible" : "King James Version"}</span>
        </div>
        <p className="tip">Tap a verse to see what it connects to.</p>
        <ol className="verses" aria-label={`${d.books[b].n} chapter ${c}`}>
          {verses.map((x, i) => (
            <li key={x} id={`v${x}`}>
              <button className={`verse${speaking === x ? " speaking" : ""}${open === x ? " open" : ""}`} onClick={() => setOpen(x)} aria-label={`Verse ${i + 1}: ${text(x)}`}>
                <sup aria-hidden>{i + 1}</sup><span aria-hidden>{text(x)}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="chapnav">
          {c > 1 ? <a className="btn secondary" href={href({ tab: "read", b, c: c - 1 })}><ChevronLeft aria-hidden /> Chapter {c - 1}</a> : <span />}
          {c < n ? <a className="btn secondary" href={href({ tab: "read", b, c: c + 1 })}>Chapter {c + 1} <ChevronRight aria-hidden /></a> : <span />}
        </div>
      </main>
      {open != null && (
        <Sheet title={d.label(open)} isOpen onOpenChange={(o) => { if (!o) { setOpen(null); if (v != null) history.replaceState(null, "", href({ tab: "read", b, c })); } }}>
          <VerseSheet d={d} v={open} text={text(open)} />
        </Sheet>
      )}
    </>
  );
}

type Tab = "links" | "words";
function VerseSheet({ d, v, text }: { d: AppData; v: number; text: string }) {
  const set = useSettings();
  const [tab, setTab] = useState<Tab>("links");
  return (
    <div className="vsheet">
      <blockquote className="read">{text}</blockquote>
      <div className="actions">
        <Button className="btn secondary" onPress={() => speak([text])}><Volume2 aria-hidden /> Listen</Button>
        <Button className="btn secondary" onPress={() => navigator.clipboard?.writeText(`${text} (${d.label(v)})`)}><Copy aria-hidden /> Copy</Button>
      </div>
      {set.mode !== "kids" && (
        <Segmented label="Show" value={tab} onChange={(k) => setTab(k as Tab)} options={[["links", <><Link2 aria-hidden /> Connected verses</>], ["words", <><Languages aria-hidden /> Original words</>]]} />
      )}
      {tab === "links" ? <Connected d={d} v={v} /> : <Words d={d} v={v} />}
    </div>
  );
}

function Connected({ d, v }: { d: AppData; v: number }) {
  const set = useSettings();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof connectedTo>> | null>(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setRows(null); connectedTo(d, v).then(setRows); }, [d, v]);
  if (!rows) return <Loading what="connected verses" />;
  if (!rows.length) return <p className="hint">No connected verses are recorded for this verse.</p>;
  const testament = (x: number) => (d.vi.ref(x).book <= 39 ? 0 : 1);
  const mine = testament(v);
  // Group by the strongest evidence; other-Testament links first.
  const sorted = [...rows].sort((a, b) => {
    const sa = LABEL_ORDER.indexOf(strongest(a.l)), sb = LABEL_ORDER.indexOf(strongest(b.l));
    return sa - sb || (testament(a.other[0]) !== mine ? -1 : 1) - (testament(b.other[0]) !== mine ? -1 : 1) || b.votes - a.votes;
  });
  const limit = set.mode === "standard" ? 12 : 6;
  const shown = showAll ? sorted : sorted.slice(0, limit);
  const groups = LABEL_ORDER.map((L) => ({ L, list: shown.filter((r) => strongest(r.l) === L) })).filter((g) => g.list.length);
  return (
    <div className="connected">
      <p className="hint">{fmt(rows.length)} connected {rows.length === 1 ? "passage" : "passages"}, strongest evidence first.</p>
      {groups.map(({ L, list }) => (
        <section key={L.key}>
          <h4 className={`grp lbl-${L.key}`}>{L.name}<small>{L.plain}</small></h4>
          <ul className="linklist">
            {list.map((r) => {
              const ref = d.vi.ref(r.other[0]);
              return (
                <li key={r.other.join("-")}>
                  <a href={href({ tab: "read", b: ref.book - 1, c: ref.chapter, v: ref.verse })}>
                    <b>{d.range(r.other[0], r.other[1])}</b>
                    <span className="read small">{d.text(r.other[0])}</span>
                    {set.mode === "standard" && <LabelBadges l={r.l} votes={r.votes} />}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!showAll && sorted.length > limit && <Button className="btn secondary wide" onPress={() => setShowAll(true)}>Show all {fmt(sorted.length)}</Button>}
    </div>
  );
}

function Words({ d, v }: { d: AppData; v: number }) {
  const r = d.vi.ref(v);
  const he = r.book <= 39;
  const [words, setWords] = useState<any[] | null>(null);
  useEffect(() => { setWords(null); d.pack("w" + String(r.book).padStart(2, "0")).then((w) => setWords(w[`${r.chapter}:${r.verse}`] || [])); }, [d, v]);
  if (!words) return <Loading what="original words" />;
  if (!words.length) return <p className="hint">No original-language words are recorded for this verse.</p>;
  return (
    <div>
      <p className="hint">Each word in the original {he ? "Hebrew" : "Greek"}, with what it means here. From STEPBible (CC BY).</p>
      <ul className="words" dir={he ? "rtl" : "ltr"}>
        {words.map((w, i) => (
          <li key={i} className="word">
            <span className={he ? "orig he" : "orig"} lang={he ? "he" : "grc"}>{w[0]}</span>
            <span className="translit" dir="ltr">{w[1]}</span>
            <span className="gloss" dir="ltr">{String(w[2]).replace(/<([^>]+)>/g, "($1)")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
