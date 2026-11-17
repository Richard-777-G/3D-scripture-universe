/**
 * The new reader and connections panel (docs/DESIGN.md, brief U7 step 2).
 * Shown only with ?ui=new; the classic reader stays the default until Richard says yes.
 *
 * It sits beside the wheel, never on top of it: a bottom sheet on phones (the wheel
 * shrinks above it) and a 420 px right-hand panel on desktop (the wheel shrinks left).
 * Every number on it comes from the data packs.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Label,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from "react-aria-components";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  Moon,
  Orbit,
  Plus,
  Quote,
  ScrollText,
  Square,
  Sun,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { LABELS, VERSIONS, strongest, type Link, type LinkSet, type ReaderData, type Word, type Lex } from "./data";

export interface Host {
  /** open a chapter through the classic app, so the wheel follows */
  open(b: number, c: number, verse?: number): void;
  back(): void;
  canGoBack(): boolean;
  close(): void;
  /** show one Best-evidence link on the wheel */
  showOnWheel(i: number): void;
  pickPassage(): void;
}

export interface Prefs {
  theme: "auto" | "night" | "light";
  size: number;
  version: string;
}

const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many = one + "s") => `${fmt(n)} ${n === 1 ? one : many}`;
const PAGE = 20;
const SIZES = [0.89, 1, 1.12, 1.25, 1.4];

const BADGE_ICON: Record<string, ReactNode> = {
  sourced: <ScrollText aria-hidden size={16} />,
  wording: <Quote aria-hidden size={16} />,
  shared: <Link2 aria-hidden size={16} />,
  tsk: <BookOpen aria-hidden size={16} />,
  readers: <Users aria-hidden size={16} />,
};

export function Reader(props: {
  data: ReaderData;
  host: Host;
  b: number;
  c: number;
  verse: number | null;
  nonce: number;
  prefs: Prefs;
  setPrefs(p: Prefs): void;
  dark: boolean;
}) {
  const { data, host, b, c, prefs, setPrefs } = props;
  const N = data.books[b].ch.length;
  const v0 = data.start(b, c), n = data.books[b].ch[c - 1];
  const name = `${data.books[b].n} ${c}`;
  const [verse, setVerse] = useState<number | null>(props.verse);
  const [full, setFull] = useState(false);
  const [lines, setLines] = useState<string[]>(data.kjv);
  const [textState, setTextState] = useState<"ok" | "loading" | "failed">("ok");
  const [textTry, setTextTry] = useState(0);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const speakRun = useRef(0);
  const ver = VERSIONS.find((x) => x[0] === prefs.version) ?? VERSIONS[0];
  const telugu = ver[0] === "tel" || ver[0] === "irv";

  // A new chapter (or a passage opened from a link) resets the view.
  useEffect(() => {
    setVerse(props.verse);
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, c, props.nonce]);

  useEffect(() => {
    let live = true;
    if (prefs.version === "kjv") {
      setLines(data.kjv);
      setTextState("ok");
      return;
    }
    setTextState("loading");
    data.text(prefs.version).then(
      (t) => live && (setLines(t), setTextState("ok")),
      () => live && (setLines(data.kjv), setTextState("failed")),
    );
    return () => {
      live = false;
    };
  }, [data, prefs.version, textTry]);

  // Keep the place: the chapter opens at the top; going back from a verse returns to it.
  const lastVerse = useRef<number | null>(null);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    if (verse !== null) {
      el.scrollTop = 0;
      lastVerse.current = verse;
    } else if (lastVerse.current !== null) {
      el.querySelector<HTMLElement>(`[data-v="${lastVerse.current}"]`)?.scrollIntoView({ block: "center" });
      el.querySelector<HTMLElement>(`[data-v="${lastVerse.current}"]`)?.focus({ preventScroll: true });
      lastVerse.current = null;
    } else el.scrollTop = 0;
  }, [verse, b, c]);

  useEffect(() => () => stopSpeaking(), []);

  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  function stopSpeaking() {
    speakRun.current++;
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeaking(null);
  }
  function speak(from: number, to: number) {
    if (!canSpeak) return;
    stopSpeaking();
    const run = speakRun.current;
    const say = (v: number) => {
      if (run !== speakRun.current) return;
      if (v > to) return setSpeaking(null);
      const u = new SpeechSynthesisUtterance(lines[v] ?? data.kjv[v]);
      u.lang = telugu ? "te-IN" : "en-GB";
      u.rate = 0.95;
      u.onend = () => say(v + 1);
      u.onerror = () => run === speakRun.current && setSpeaking(null);
      setSpeaking(v);
      window.speechSynthesis.speak(u);
    };
    say(from);
  }

  const chapterLinks = useMemo(() => {
    let total = 0;
    const per: number[] = [];
    for (let k = 0; k < n; k++) {
      const m = data.best(v0 + k).length;
      per.push(m);
      total += m;
    }
    return { per, total };
  }, [data, v0, n]);

  const prev = c > 1 ? [b, c - 1] : b > 0 ? [b - 1, data.books[b - 1].ch.length] : null;
  const next = c < N ? [b, c + 1] : b < data.books.length - 1 ? [b + 1, 1] : null;
  const title = verse === null ? name : data.label(verse);
  const reading = speaking !== null && verse === null;

  return (
    <div className={"rp-in" + (full ? " r-full" : "")} data-full={full}>
      <header className="rp-head">
        {verse === null ? (
          host.canGoBack() ? (
            <Button className="r-q r-back" onPress={() => host.back()} aria-label="Go back">
              <ChevronLeft aria-hidden size={22} />
              <span className="r-back-t">Back</span>
            </Button>
          ) : null
        ) : (
          <Button className="r-q r-back" onPress={() => setVerse(null)} aria-label={`Back to ${name}`}>
            <ChevronLeft aria-hidden size={22} />
            <span className="r-ell r-back-t">{name}</span>
          </Button>
        )}
        <Heading level={2} className="rp-title" id="rp-title" tabIndex={-1}>
          {verse === null ? (
            <Button className="rp-pick" onPress={() => host.pickPassage()} aria-label={`${name}. Choose another book or chapter`}>
              <span className="r-ell">{name}</span>
              <ChevronDown aria-hidden size={18} />
            </Button>
          ) : (
            title
          )}
        </Heading>
        <TextAndDisplay prefs={prefs} setPrefs={setPrefs} dark={props.dark} />
        <Button className="r-q r-icon r-only-phone" onPress={() => setFull(!full)} aria-label={full ? "Make the reader smaller" : "Make the reader bigger"}>
          {full ? <Minimize2 aria-hidden size={20} /> : <Maximize2 aria-hidden size={20} />}
        </Button>
        <Button className="r-q r-icon" onPress={() => host.close()} aria-label="Close the reader">
          <X aria-hidden size={22} />
        </Button>
      </header>

      {verse === null && (
        <div className="rp-tools" role="toolbar" aria-label="Chapter">
          <Button className="r-s r-icon" isDisabled={!prev} onPress={() => prev && host.open(prev[0], prev[1])} aria-label={prev ? `Previous chapter, ${data.books[prev[0]].n} ${prev[1]}` : "Previous chapter"}>
            <ChevronLeft aria-hidden size={22} />
          </Button>
          <VersionPicker prefs={prefs} setPrefs={setPrefs} />
          {canSpeak && (
            <Button className="r-s r-icon" onPress={() => (reading ? stopSpeaking() : speak(v0, v0 + n - 1))} aria-label={reading ? "Stop reading aloud" : `Listen to ${name}`}>
              {reading ? <Square aria-hidden size={18} /> : <Volume2 aria-hidden size={20} />}
            </Button>
          )}
          <Button className="r-s r-icon" isDisabled={!next} onPress={() => next && host.open(next[0], next[1])} aria-label={next ? `Next chapter, ${data.books[next[0]].n} ${next[1]}` : "Next chapter"}>
            <ChevronRight aria-hidden size={22} />
          </Button>
        </div>
      )}

      <div className="rp-body" ref={body}>
        {textState === "loading" && <Notice>Loading {ver[2]}…</Notice>}
        {textState === "failed" && (
          <Notice tone="bad">
            {ver[2]} could not be loaded right now, so this shows the King James Version.{" "}
            <Button className="r-q r-inline" onPress={() => setTextTry(textTry + 1)}>
              Try again
            </Button>
          </Notice>
        )}
        {verse === null ? (
          <>
            <div className="rp-intro">
              <h3 className="rp-h">{name}</h3>
              <p className="rp-sub">
                {ver[2]} · {plural(n, "verse")} · {plural(chapterLinks.total, "connected verse")} with the best evidence
              </p>
              <p className="rp-hint">Tap a verse to see the verses it connects to.</p>
            </div>
            <ol className="rp-verses" aria-label={`${name}, ${plural(n, "verse")}`}>
              {Array.from({ length: n }, (_, k) => {
                const v = v0 + k, m = chapterLinks.per[k];
                return (
                  <li key={v}>
                    <Button
                      className={"rp-verse" + (speaking === v ? " r-spoken" : "") + (telugu ? " r-te" : "")}
                      data-v={v}
                      onPress={() => setVerse(v)}
                      aria-label={`Verse ${k + 1}${m ? `, ${plural(m, "connected verse")}` : ""}: ${lines[v] ?? ""}`}
                    >
                      <span className="r-no" aria-hidden>
                        {k + 1}
                      </span>
                      <span className="r-tx">{lines[v]}</span>
                      {m > 0 && (
                        <span className="r-cnt" aria-hidden>
                          <Link2 size={14} />
                          {m}
                        </span>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ol>
            <nav className="rp-foot" aria-label="Next and previous chapter">
              {prev ? (
                <Button className="r-s" onPress={() => host.open(prev[0], prev[1])}>
                  <ChevronLeft aria-hidden size={20} />
                  <span className="r-ell">
                    {data.books[prev[0]].n} {prev[1]}
                  </span>
                </Button>
              ) : (
                <span />
              )}
              {next && (
                <Button className="r-p" onPress={() => host.open(next[0], next[1])}>
                  <span className="r-ell">
                    {data.books[next[0]].n} {next[1]}
                  </span>
                  <ChevronRight aria-hidden size={20} />
                </Button>
              )}
            </nav>
          </>
        ) : (
          <VerseSheet
            key={verse}
            data={data}
            host={host}
            v={verse}
            lines={lines}
            telugu={telugu}
            version={ver[1]}
            speaking={speaking === verse}
            onSpeak={() => (speaking === verse ? stopSpeaking() : speak(verse, verse))}
            canSpeak={canSpeak}
          />
        )}
      </div>
    </div>
  );
}

function VerseSheet(props: {
  data: ReaderData;
  host: Host;
  v: number;
  lines: string[];
  telugu: boolean;
  version: string;
  speaking: boolean;
  canSpeak: boolean;
  onSpeak(): void;
}) {
  const { data, host, v, lines } = props;
  const bestNow = data.best(v);
  // Never open on an empty tab: with no Best links, the sheet waits for the next set that has some.
  const [set, setSet] = useState<LinkSet | null>(bestNow.length ? "best" : null);
  const [autoNote, setAutoNote] = useState("");
  const [links, setLinks] = useState<Link[] | null>(bestNow.length ? bestNow : null);
  const [state, setState] = useState<"ok" | "loading" | "failed">(bestNow.length ? "ok" : "loading");
  const [counts, setCounts] = useState<Partial<Record<LinkSet, number>>>({ best: bestNow.length });
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  const [retry, setRetry] = useState(0);
  const ot = data.bookOf(v) < 39;

  // Every tab shows its count: Old <-> New and All load in the background.
  useEffect(() => {
    let live = true;
    data
      .links(v, "otnt")
      .then((l) => {
        if (live) setCounts((c) => ({ ...c, otnt: l.length }));
        return data.links(v, "all");
      })
      .then((l) => live && setCounts((c) => ({ ...c, all: l.length })))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [data, v]);

  // With no Best links, open on Old <-> New, then All, and say so plainly.
  useEffect(() => {
    if (set !== null) return;
    let live = true;
    (async () => {
      try {
        for (const k of ["otnt", "all"] as const) {
          const l = await data.links(v, k);
          if (!live) return;
          if (l.length) {
            setAutoNote(
              k === "otnt"
                ? `No best-evidence links for this verse. Showing all ${plural(l.length, "Old ↔ New link")}.`
                : `No best-evidence or Old ↔ New links for this verse. Showing all ${plural(l.length, "link")}.`,
            );
            setSet(k);
            return;
          }
        }
        if (live) setSet("best");
      } catch {
        if (live) setState("failed");
      }
    })();
    return () => {
      live = false;
    };
  }, [data, v, set, retry]);

  // Load the chosen set.
  useEffect(() => {
    if (set === null) return;
    let live = true;
    if (set === "best") {
      setLinks(data.best(v));
      setState("ok");
    } else {
      setState("loading");
      data.links(v, set).then(
        (l) => {
          if (!live) return;
          setLinks(l);
          setCounts((c) => ({ ...c, [set]: l.length }));
          setState("ok");
        },
        () => live && setState("failed"),
      );
    }
    return () => {
      live = false;
    };
  }, [data, v, set, retry]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`“${lines[v]}” — ${data.label(v)} (${props.version})`);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
    setTimeout(() => setCopied(""), 2500);
  }

  const setName = (k: LinkSet) => (k === "best" ? "Best evidence" : k === "otnt" ? "All Old ↔ New" : "All");
  return (
    <div className="r-vs">
      <blockquote className={"r-vs-text" + (props.telugu ? " r-te" : "")}>
        <span className="r-no" aria-hidden>
          {data.verseNo(v)}
        </span>
        {lines[v]}
      </blockquote>
      <div className="r-vs-actions">
        {props.canSpeak && (
          <Button className="r-s" onPress={props.onSpeak}>
            {props.speaking ? <Square aria-hidden size={18} /> : <Volume2 aria-hidden size={20} />}
            {props.speaking ? "Stop" : "Listen"}
          </Button>
        )}
        <Button className="r-s" onPress={copy}>
          {copied === "yes" ? <Check aria-hidden size={20} /> : <Copy aria-hidden size={18} />}
          {copied === "yes" ? "Copied" : "Copy"}
        </Button>
        <span role="status" className="r-sr">
          {copied === "yes" ? "Verse copied" : copied === "no" ? "Could not copy the verse" : ""}
        </span>
      </div>

      <Tabs className="r-vs-tabs">
        <TabList aria-label="About this verse" className="r-tablist">
          <Tab id="links" className="r-tab">
            Connected verses
          </Tab>
          <Tab id="words" className="r-tab">
            {ot ? "Hebrew" : "Greek"} words
          </Tab>
        </TabList>
        <TabPanel id="links" className="r-tabpanel">
          <ToggleButtonGroup
            className="r-seg"
            aria-label="Which connections to show"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={set ? [set] : []}
            onSelectionChange={(k) => {
              setAutoNote("");
              setSet([...k][0] as LinkSet);
            }}
          >
            {(["best", "otnt", "all"] as LinkSet[]).map((k) => (
              <ToggleButton key={k} id={k} className="r-seg-b" aria-label={counts[k] !== undefined ? `${setName(k)}, ${plural(counts[k]!, "verse")}` : setName(k)}>
                <span className="r-seg-n">{k === "best" ? "Best" : k === "otnt" ? "Old ↔ New" : "All"}</span>
                <span className="r-seg-c" aria-hidden>
                  {counts[k] !== undefined ? fmt(counts[k]!) : " "}
                </span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {autoNote && state === "ok" && <Notice>{autoNote}</Notice>}
          <p className="rp-hint">
            {set === null
              ? "Finding the connected verses…"
              : set === "best"
              ? "Links the wheel draws: sourced prophecies, and passages whose words match."
              : set === "otnt"
                ? "Every listed link between this verse and the other Testament, labelled by what supports it."
                : "Every listed link, including ones inside the same Testament."}
          </p>
          {state === "loading" && <Notice>Loading connected verses…</Notice>}
          {state === "failed" && (
            <Notice tone="bad">
              The connected verses could not be loaded.{" "}
              <Button className="r-q r-inline" onPress={() => setRetry(retry + 1)}>
                Try again
              </Button>
            </Notice>
          )}
          {state === "ok" && links && set && (
            <Groups
              data={data}
              host={host}
              links={links}
              lines={lines}
              set={set}
              onWider={set !== "all" ? () => setSet(set === "best" ? "otnt" : "all") : undefined}
            />
          )}
        </TabPanel>
        <TabPanel id="words" className="r-tabpanel">
          <Words data={data} v={v} ot={ot} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

function Groups(props: { data: ReaderData; host: Host; links: Link[]; lines: string[]; set: LinkSet; onWider?: () => void }) {
  const { links } = props;
  const groups = LABELS.map((lab, i) => ({ lab, rows: links.filter((k) => strongest(k.l) === i) })).filter((g) => g.rows.length);
  if (!links.length)
    return (
      <Notice>
        No connected verses are recorded for this verse in this set.
        {props.onWider && (
          <>
            {" "}
            <Button className="r-q r-inline" onPress={props.onWider}>
              Show {props.set === "best" ? "all Old ↔ New" : "all"}
            </Button>
          </>
        )}
      </Notice>
    );
  return (
    <div className="r-groups">
      {groups.map((g) => (
        <Group key={g.lab.key} {...props} title={g.lab.name} kind={g.lab.key} rows={g.rows} />
      ))}
    </div>
  );
}

function Group(props: { data: ReaderData; host: Host; lines: string[]; title: string; kind: string; rows: Link[] }) {
  const { data, host, rows } = props;
  const [shown, setShown] = useState(PAGE);
  return (
    <section className="r-group" aria-label={`${props.title}, ${plural(rows.length, "verse")}`}>
      <h4 className="r-group-h">
        <span className={"r-badge r-" + props.kind}>
          {BADGE_ICON[props.kind]}
          {props.title}
        </span>
        <span className="r-group-n">{fmt(rows.length)}</span>
      </h4>
      <ul className="r-links">
        {rows.slice(0, shown).map((k) => (
          <li key={k.s + ":" + k.e} className="r-link">
            <Button
              className="r-link-main"
              onPress={() => host.open(data.bookOf(k.s), data.chapterOf(k.s), k.s)}
              aria-label={`Open ${data.range(k.s, k.e)}: ${props.lines[k.s] ?? ""}`}
            >
              <span className="r-link-ref">{data.range(k.s, k.e)}</span>
              <span className="r-link-tx">
                {props.lines[k.s]}
                {k.e > k.s ? " …" : ""}
              </span>
              {k.words && <span className="r-link-why">Shared words: {k.words}</span>}
            </Button>
            <div className="r-link-foot">
              <span className="r-badges">
                {LABELS.filter((x) => k.l & x.bit).map((x) => (
                  <span key={x.key} className={"r-badge r-sm r-" + x.key}>
                    {BADGE_ICON[x.key]}
                    {x.key === "readers" && k.votes > 0 ? `${x.name} · ${plural(k.votes, "vote")}` : x.name}
                  </span>
                ))}
              </span>
              {k.wheel !== undefined && (
                <Button className="r-q r-sm" onPress={() => host.showOnWheel(k.wheel!)} aria-label={`See ${data.range(k.s, k.e)} on the wheel`}>
                  <Orbit aria-hidden size={18} />
                  See on the wheel
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {rows.length > shown && (
        <Button className="r-s r-wide" onPress={() => setShown(rows.length)}>
          Show all {fmt(rows.length)}
        </Button>
      )}
    </section>
  );
}

function Words(props: { data: ReaderData; v: number; ot: boolean }) {
  const { data, v } = props;
  const [words, setWords] = useState<Word[] | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    data.wordsOf(v).then((w) => live && setWords(w), () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [data, v, retry]);
  if (failed)
    return (
      <Notice tone="bad">
        The {props.ot ? "Hebrew" : "Greek"} words could not be loaded.{" "}
        <Button className="r-q r-inline" onPress={() => setRetry(retry + 1)}>
          Try again
        </Button>
      </Notice>
    );
  if (words === undefined) return <Notice>Loading the {props.ot ? "Hebrew" : "Greek"} words…</Notice>;
  if (!words?.length) return <Notice>No original-language words are recorded for this verse.</Notice>;
  return (
    <>
      <p className="rp-hint">Each word as it was first written, with how it sounds and what it means. Tap a word for its full meaning.</p>
      <ul className="r-words">
        {words.map((w, i) => (
          <li key={i} className="r-word">
            <Button className="r-word-b" onPress={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className={"r-word-o" + (props.ot ? " r-he" : " r-gr")} lang={props.ot ? "he" : "grc"} dir={props.ot ? "rtl" : "ltr"}>
                {w[0]}
              </span>
              <span className="r-word-t">{w[1]}</span>
              <span className="r-word-g">{w[2]}</span>
            </Button>
            {open === i && <Meaning data={data} strong={w[3]} />}
          </li>
        ))}
      </ul>
      <p className="rp-credit">Words: STEPBible (CC BY 4.0), Tyndale House Cambridge.</p>
    </>
  );
}

function Meaning(props: { data: ReaderData; strong: string }) {
  const [lex, setLex] = useState<Lex | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    props.data.meaning(props.strong).then((l) => live && setLex(l), () => live && setLex(null));
    return () => {
      live = false;
    };
  }, [props.data, props.strong]);
  if (lex === undefined) return <p className="r-meaning">Loading the meaning…</p>;
  if (!lex) return <p className="r-meaning">No dictionary entry is recorded for {props.strong}.</p>;
  const def = lex[3].length > 600 ? lex[3].slice(0, 600).replace(/\s\S*$/, "") + " …" : lex[3];
  return (
    <div className="r-meaning">
      <p>
        <b>{lex[2]}</b> · {lex[1]} · <span className="r-strong">{props.strong}</span>
      </p>
      <p className="r-def">{def}</p>
    </div>
  );
}

function VersionPicker(props: { prefs: Prefs; setPrefs(p: Prefs): void }) {
  return (
    <Select
      className="r-ver"
      aria-label="Bible version"
      selectedKey={props.prefs.version}
      onSelectionChange={(k) => props.setPrefs({ ...props.prefs, version: String(k) })}
    >
      <Button className="r-s">
        <SelectValue className="r-ell" />
        <ChevronDown aria-hidden size={18} />
      </Button>
      <Popover className={"su-ui r-pop " + themeClass()} placement="bottom end">
        <ListBox className="r-opts">
          {VERSIONS.map(([k, short, name]) => (
            <ListBoxItem key={k} id={k} className="r-opt" textValue={`${short}, ${name}`}>
              <span className="r-opt-s">{short}</span>
              <span className="r-opt-n">{name}</span>
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}

function TextAndDisplay(props: { prefs: Prefs; setPrefs(p: Prefs): void; dark: boolean }) {
  const { prefs, setPrefs } = props;
  const i = SIZES.findIndex((s) => Math.abs(s - prefs.size) < 0.01);
  return (
    <DialogTrigger>
      <Button className="r-q aa" aria-label="Text and display">
        <span aria-hidden>Aa</span>
      </Button>
      <Popover className={"su-ui r-pop " + themeClass()} placement="bottom end">
        <Dialog className="aa-d" aria-label="Text and display">
          <Heading slot="title" className="aa-h">
            Text and display
          </Heading>
          <div className="aa-row">
            <Label className="aa-l" id="aa-size">
              Text size
            </Label>
            <div className="aa-size" role="group" aria-labelledby="aa-size">
              <Button className="r-s r-icon" isDisabled={i <= 0} onPress={() => setPrefs({ ...prefs, size: SIZES[Math.max(0, i - 1)] })} aria-label="Smaller text">
                <Minus aria-hidden size={20} />
              </Button>
              <span className="aa-v">{Math.round(prefs.size * 100)}%</span>
              <Button className="r-s r-icon" isDisabled={i >= SIZES.length - 1} onPress={() => setPrefs({ ...prefs, size: SIZES[Math.min(SIZES.length - 1, i + 1)] })} aria-label="Bigger text">
                <Plus aria-hidden size={20} />
              </Button>
            </div>
          </div>
          <div className="aa-row r-col">
            <span className="aa-l" id="aa-theme">
              Colours
            </span>
            <ToggleButtonGroup
              className="r-seg"
              aria-labelledby="aa-theme"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[prefs.theme]}
              onSelectionChange={(k) => setPrefs({ ...prefs, theme: [...k][0] as Prefs["theme"] })}
            >
              <ToggleButton id="night" className="r-seg-b r-row">
                <Moon aria-hidden size={18} />
                Night
              </ToggleButton>
              <ToggleButton id="light" className="r-seg-b r-row">
                <Sun aria-hidden size={18} />
                Light
              </ToggleButton>
              <ToggleButton id="auto" className="r-seg-b r-row">
                <Monitor aria-hidden size={18} />
                Phone
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

/** Popovers are drawn outside the panel, so they carry the theme class themselves. */
function themeClass(): string {
  return document.getElementById("rp")?.classList.contains("su-light") ? "su-light" : "";
}

function Notice(props: { children: ReactNode; tone?: "bad" }) {
  return (
    <div className={"r-notice" + (props.tone ? " r-" + props.tone : "")} role="status">
      {props.children}
    </div>
  );
}
