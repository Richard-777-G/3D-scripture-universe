/**
 * Section V console (?ui=lab): the wheel is the machine; this explains it.
 * Phase 1: big live number, plain paragraph, numbered callouts pinned to real books, camera
 * moves, and a strip of six live metric tiles. Phase 2: Exploded and X-ray views, a section
 * dial that turns the wheel, and a 2D schematic of the 66 books. Everything reads from the
 * one Model.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, ToggleButton, ToggleButtonGroup, Slider, SliderTrack, SliderThumb, SliderOutput, Label } from "react-aria-components";
import { BookOpen, Box, Eye, MoveHorizontal, ArrowDownToLine, Orbit, RotateCcw, ChevronDown, ChevronLeft, ChevronRight, UnfoldVertical, ScanEye } from "lucide-react";
import { Model, U, SECTIONS, SECTION_COLOURS, type Camera } from "./model";
import type React from "react";

const fmt = (n: number) => n.toLocaleString("en-US");
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts to its new value (straight there with reduced motion). */
function Count(props: { value: number }) {
  const [shown, setShown] = useState(props.value);
  const from = useRef(props.value);
  useEffect(() => {
    const a = from.current, b = props.value;
    if (a === b) return;
    if (reduced()) { from.current = b; setShown(b); return; }
    const t0 = performance.now(), D = 700;
    let id = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (b - a) * e);
      from.current = v;
      setShown(v);
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [props.value]);
  return <>{fmt(shown)}</>;
}

/**
 * The camera distance at which the whole wheel fills about 70% of its window.
 * The engine's own fit leaves room for the classic panels; the console has none.
 */
function fillDistance(): number {
  const r = document.getElementById("stage")!.getBoundingClientRect();
  const asp = r.width / Math.max(1, r.height);
  const engineFit = Math.min(95, Math.max(30, 27 / (2 * Math.tan((22.5 * Math.PI) / 180) * Math.min(asp, 1.6))));
  return Math.max(22, engineFit * (asp > 1.2 ? 0.82 : 1.02) * (1 + 0.62 * openK));
}

/** How far the rings are pulled apart right now (0 closed, 1 fully exploded). */
let openK = 0;
/** Open or close the rings over 0.9 s (at once with reduced motion). */
function explodeTo(target: number) {
  const u = U(), from = openK, t0 = performance.now(), D = 900;
  if (reduced()) { openK = target; u.explode(target); return; }
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / D);
    openK = from + (target - from) * ease(k);
    u.explode(openK);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** The camera angle that faces the middle of a section on the wheel (a circular mean of its books). */
function sectionAngle(k: number): number {
  const x = SECTIONS[k], bs = U().books as { a: number }[];
  let cx = 0, cz = 0;
  for (let b = x.from; b <= x.to; b++) { cx += Math.cos(bs[b].a); cz += Math.sin(bs[b].a); }
  return Math.atan2(cz, cx);
}

/** Camera presets, relative to the hero view the wheel opens with. */
function presetFor(c: Camera, hero: { th: number; el: number; rad: number }) {
  switch (c) {
    case "hero": return hero;
    case "front": return { th: hero.th, el: 0.06, rad: hero.rad * 1.02 };
    case "side": return { th: hero.th + Math.PI / 2, el: 0.22, rad: hero.rad };
    case "top": return { th: hero.th, el: 1.42, rad: hero.rad * 1.38 };
    case "inside": return { th: hero.th, el: 0.12, rad: 16 };
  }
}
const CAMS: { id: Camera; name: string; icon: JSX.Element }[] = [
  { id: "hero", name: "Hero", icon: <Orbit size={16} aria-hidden /> },
  { id: "front", name: "Front", icon: <Eye size={16} aria-hidden /> },
  { id: "side", name: "Side", icon: <MoveHorizontal size={16} aria-hidden /> },
  { id: "top", name: "Top", icon: <ArrowDownToLine size={16} aria-hidden /> },
  { id: "inside", name: "Inside", icon: <Box size={16} aria-hidden /> },
];

let flying = false;
/** A smooth camera move: ease in and out over 1.4 s, along the shorter way round. */
function fly(to: { th: number; el: number; rad: number }) {
  const u = U();
  const from = u.view as { th: number; el: number; rad: number };
  let dth = ((to.th - from.th + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (reduced()) return u.setView({ th: from.th + dth, el: to.el, rad: to.rad });
  const t0 = performance.now(), D = 1400;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  flying = true;
  const step = (now: number) => {
    const k = ease(Math.min(1, (now - t0) / D));
    u.setView({ th: from.th + dth * k, el: from.el + (to.el - from.el) * k, rad: from.rad + (to.rad - from.rad) * k });
    if (k < 1) requestAnimationFrame(step);
    else flying = false;
  };
  requestAnimationFrame(step);
}

export function Lab(props: { model: Model; onView(el: HTMLElement): void }) {
  const m = props.model;
  const state = useSyncExternalStore((f) => m.subscribe(f), () => m.state);
  const view = useRef<HTMLDivElement>(null);
  const hero = useRef<{ th: number; el: number; rad: number } | null>(null);

  // The stage (the real wheel) is laid over this window.
  useLayoutEffect(() => {
    if (view.current) props.onView(view.current);
  }, []);

  // Mirror the engine every frame; remember the opening view as "Hero".
  useEffect(() => {
    let id = 0, touched = 0;
    const touch = () => (touched = performance.now());
    const opts = { passive: true, capture: true } as AddEventListenerOptions;
    addEventListener("pointerdown", touch, opts);
    addEventListener("wheel", touch, opts);
    addEventListener("keydown", touch, opts);
    const tick = () => {
      id = requestAnimationFrame(tick);
      m.sync();
      const u = U();
      if (!u || u.intro || !u.view) return;
      if (!hero.current) hero.current = { ...u.view };
      // With nothing chosen, keep the whole wheel filling the window. The engine's own slow
      // turn carries on; a touch, a camera move or a choice takes over at once.
      const s = m.state;
      // Exploded, the opened wheel is taller than the engine's own framing of a book, so the
      // console keeps all of it in view then too.
      if ((openK > 0 || (s.book === null && !s.pair)) && s.camera === "hero" && !flying && performance.now() - touched > 1200) {
        const want = fillDistance(), r = u.view.rad;
        hero.current!.rad = want;
        if (Math.abs(r - want) > 0.3) u.setView({ rad: r + (want - r) * 0.08 });
      }
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      removeEventListener("pointerdown", touch, opts);
      removeEventListener("wheel", touch, opts);
      removeEventListener("keydown", touch, opts);
    };
  }, [m]);

  const metrics = m.metrics();
  const lit = m.lit();
  const all = Number(m.counts.best ?? 0);
  const para = m.paragraph();
  const sel = state.pair ? `${m.books[state.pair.o].n} ↔ ${m.books[state.pair.n].n}` : state.book !== null ? `${m.books[state.book].n}${state.chapter !== null ? " " + state.chapter : ""}` : state.section !== null ? SECTIONS[state.section].name : "The whole Bible";

  return (
    <div className="lab-in">
      <header className="lab-id">
        <p className="lab-kicker">
          <span>AN-001</span>
          <span>Scripture Universe · How it works</span>
        </p>
        <div className="lab-idrow">
          <h1 className="lab-title">The Wheel</h1>
          <p className="lab-big" aria-live="polite">
            <b>
              <Count value={lit} />
            </b>
            <span>
              {state.book === null && !state.pair && state.section === null ? "best-evidence threads" : `of ${fmt(all)} threads lit`}
              <small>{sel}</small>
            </span>
          </p>
        </div>
      </header>
      <Para title={para.title} text={para.text}>
        {state.book !== null && (
          <Button className="lab-btn lab-btn-p" onPress={() => U().openReader(state.book, state.chapter ?? 1)}>
            <BookOpen size={16} aria-hidden />
            Read {m.books[state.book].n} {state.chapter ?? 1}
          </Button>
        )}
        {(state.book !== null || state.pair || state.section !== null) && (
          <Button
            className="lab-btn"
            onPress={() => {
              m.set({ section: null });
              if (state.book !== null || state.pair) U().clearSel();
            }}
          >
            <RotateCcw size={16} aria-hidden />
            The whole Bible
          </Button>
        )}
      </Para>

      <section className="lab-stage" aria-label="The wheel, live 3D">
        <div className="lab-view" ref={view} />
        <p className="lab-fig" aria-hidden>
          <span>Fig. 1</span> The wheel<em> · live 3D</em>
        </p>
        <Callouts model={m} />
        <div className="lab-views" role="group" aria-label="View">
          <ToggleButton
            className="lab-cam"
            isSelected={state.exploded}
            onChange={(on) => {
              m.set({ exploded: on });
              explodeTo(on ? 1 : 0);
            }}
          >
            <UnfoldVertical size={16} aria-hidden />
            Exploded
          </ToggleButton>
          <ToggleButton
            className="lab-cam"
            isSelected={state.xray}
            onChange={(on) => {
              m.set({ xray: on });
              U().xray(on);
            }}
          >
            <ScanEye size={16} aria-hidden />
            X-ray
          </ToggleButton>
        </div>
        <ToggleButtonGroup
          className="lab-cams"
          aria-label="Camera"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[state.camera]}
          onSelectionChange={(k) => {
            const c = [...k][0] as Camera;
            m.set({ camera: c });
            if (hero.current) fly(presetFor(c, hero.current));
          }}
        >
          {CAMS.map((c) => (
            <ToggleButton key={c.id} id={c.id} className="lab-cam">
              {c.icon}
              {c.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </section>

      <aside className="lab-side">
        <Dial model={m} onTurn={(k) => hero.current && fly({ th: sectionAngle(k), el: hero.current.el, rad: U().view.rad })} />
        <Schematic model={m} />
      </aside>

      <section className="lab-metrics" aria-label="Live numbers for the selection">
        {metrics.map((x) => {
          const act = tileAction(x.key, state);
          const loading = x.unit === "loading";
          const body = (
            <>
              <b>
                <Count value={x.value} />
              </b>
              <span className="lab-m-l">{x.label}</span>
              <span className="lab-m-u">{act ? act.hint : x.unit}</span>
            </>
          );
          const cls = "lab-metric" + (loading ? " loading" : "") + (act ? " act" : "");
          return act ? (
            <Button key={x.key} className={cls} style={{ ["--acc" as string]: x.accent }} onPress={act.go} aria-label={`${x.label}: ${fmt(x.value)} ${x.unit}. ${act.hint}`}>
              {body}
            </Button>
          ) : (
            <div key={x.key} className={cls} style={{ ["--acc" as string]: x.accent }}>
              {body}
            </div>
          );
        })}
      </section>
      <p className="lab-foot">
        <span>Every number is counted from the data</span>
        <Button className="lab-link" onPress={() => U().credits()}>
          Sources and credits
        </Button>
      </p>
    </div>
  );
}

/** The plain paragraph: in full on desktop, two lines with "Read more" on phones. */
function Para(props: { title: string; text: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [props.text]);
  return (
    <section className={"lab-para" + (open ? " open" : "")} aria-label="How it works">
      <h2>{props.title}</h2>
      <p id="lab-para-text">{props.text}</p>
      <Button className="lab-more" onPress={() => setOpen(!open)} aria-expanded={open} aria-controls="lab-para-text">
        {open ? "Show less" : "Read more"}
        <ChevronDown size={14} aria-hidden />
      </Button>
      <div className="lab-acts">{props.children}</div>
    </section>
  );
}

/** Tiles that do something when tapped (the others are numbers only). */
function tileAction(key: string, s: Model["state"]): { hint: string; go(): void } | null {
  const u = U();
  if (key === "places") return { hint: "Tap for the map", go: () => u.openMap() };
  if (key === "chapters") return { hint: s.book !== null ? `Tap to read ${s.chapter ? "chapter " + s.chapter : "chapter 1"}` : "Tap to read Genesis 1", go: () => u.openReader(s.book ?? 0, s.chapter ?? 1) };
  if (key === "best") {
    // The wheel always draws the best-evidence set; from a chapter or a journey, this goes back to it.
    if (s.chapter !== null && s.book !== null) return { hint: "Tap for all of the book's", go: () => u.select(s.book) };
    return null;
  }
  return null;
}

/**
 * Numbered callouts with thin leader lines, pinned to real books in 3D and moved every frame.
 * Tags sit outside the wheel on the side their book is on, and never overlap each other.
 */
function Callouts(props: { model: Model }) {
  const m = props.model;
  const svg = useRef<SVGSVGElement>(null);
  const [tags, setTags] = useState<{ b: number; n: number }[]>([]);
  const state = useSyncExternalStore((f) => m.subscribe(f), () => m.state);

  useEffect(() => {
    if (state.pair) setTags([{ b: state.pair.o, n: m.pairs.get(state.pair.o * 100 + state.pair.n) ?? 0 }, { b: state.pair.n, n: m.pairs.get(state.pair.o * 100 + state.pair.n) ?? 0 }]);
    else {
      // Phones: just the main callout, so tags never cover the wheel's own chapter badges.
      const k = innerWidth < 520 ? 0 : 3;
      if (state.book !== null) setTags([{ b: state.book, n: m.links[state.book] }, ...m.partners(state.book).slice(0, k)]);
      else if (state.section !== null) {
        const x = SECTIONS[state.section], inSec: number[] = [];
        for (let b = x.from; b <= x.to; b++) inSec.push(b);
        setTags(inSec.sort((a, b) => m.links[b] - m.links[a]).slice(0, k + 1).map((b) => ({ b, n: m.links[b] })));
      } else setTags(m.busiest(k + 1).map((b) => ({ b, n: m.links[b] })));
    }
  }, [m, state.book, state.pair, state.section]);

  useEffect(() => {
    let id = 0;
    const draw = () => {
      id = requestAnimationFrame(draw);
      const el = svg.current, u = U();
      if (!el || !u?.screenOf) return;
      const stage = document.getElementById("stage")!.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const W = box.width, H = box.height, cx = W / 2;
      const narrow = W < 520;
      const placed: { b: number; n: number; i: number; x: number; y: number; side: number; ty: number }[] = [];
      tags.forEach((t, i) => {
        const p = u.screenOf(t.b);
        if (!p || p.z >= 1) return;
        const x = p.x - (box.left - stage.left), y = p.y - (box.top - stage.top);
        if (x < 0 || x > W || y < 0 || y > H) return;
        placed.push({ ...t, i, x, y, side: x < cx ? -1 : 1, ty: y });
      });
      // Place each side's tags inside the window first (clear of the "Fig. 1" label, the view
      // buttons and the camera bar), then space them 34 px apart, pushing back up from the
      // bottom if needed; a tag that still cannot fit is left out rather than drawn on top.
      const TOP = 70, BOTTOM = H - 74, GAP = 34;
      for (const side of [-1, 1]) {
        const col = placed.filter((p) => p.side === side).sort((a, b) => a.y - b.y);
        for (const c of col) c.ty = Math.max(TOP, Math.min(BOTTOM, c.y - (narrow ? 0 : 46)));
        for (let k = 1; k < col.length; k++) if (col[k].ty - col[k - 1].ty < GAP) col[k].ty = col[k - 1].ty + GAP;
        for (let k = col.length - 1; k >= 0; k--) col[k].ty = Math.min(col[k].ty, k === col.length - 1 ? BOTTOM : col[k + 1].ty - GAP);
        for (const c of col) if (c.ty < TOP) placed.splice(placed.indexOf(c), 1);
      }
      const lines = el.querySelectorAll<SVGPolylineElement>("polyline");
      const dots = el.querySelectorAll<SVGCircleElement>("circle");
      const labels = el.parentElement!.querySelectorAll<HTMLElement>(".lab-tag");
      labels.forEach((lab, k) => {
        const p = placed.find((q) => q.i === k);
        const line = lines[k], dot = dots[k];
        if (!p) {
          lab.style.opacity = "0";
          line?.setAttribute("points", "");
          dot?.setAttribute("r", "0");
          return;
        }
        const gx = narrow ? (p.side < 0 ? 10 : W - 10) : p.side < 0 ? Math.max(14, p.x - 150) : Math.min(W - 14, p.x + 150);
        const ty = p.ty;
        line.setAttribute("points", `${p.x},${p.y} ${p.x + (gx - p.x) * 0.35},${ty} ${gx},${ty}`);
        dot.setAttribute("cx", String(p.x));
        dot.setAttribute("cy", String(p.y));
        dot.setAttribute("r", "3.5");
        lab.style.opacity = "1";
        // Fully inside the window: measure the tag and keep 8 px clear of each edge.
        const tw = lab.offsetWidth;
        const left = Math.max(8, Math.min(W - 8 - tw, p.side < 0 ? gx : gx - tw));
        lab.style.transform = `translate(${left}px, ${ty}px) translate(0, -50%)`;
        const end = p.side < 0 ? left : left + tw;
        line.setAttribute("points", `${p.x},${p.y} ${p.x + (end - p.x) * 0.35},${ty} ${end},${ty}`);
      });
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [tags]);

  return (
    <div className="lab-callouts" aria-hidden>
      <svg ref={svg} className="lab-leaders">
        {tags.map((t) => (
          <g key={t.b}>
            <polyline fill="none" pathLength={1} className="lab-draw" />
            <circle r="0" />
          </g>
        ))}
      </svg>
      {tags.map((t, i) => (
        <span key={t.b} className={"lab-tag" + (i === 0 && (m.state.book !== null || m.state.pair) ? " on" : "")}>
          <i>{i + 1}</i>
          {m.books[t.b].n}
          <small>{fmt(t.n)}</small>
        </span>
      ))}
    </div>
  );
}

/**
 * Fig. 2, the section dial (brief V5): a tape of the ten sections under a fixed needle.
 * Turning it chooses a section, turns the wheel to face it and lights it in the schematic.
 */
function Dial(props: { model: Model; onTurn(k: number): void }) {
  const m = props.model;
  const state = useSyncExternalStore((f) => m.subscribe(f), () => m.state);
  const k = state.section;
  const choose = (n: number) => {
    const v = Math.max(0, Math.min(SECTIONS.length - 1, n));
    if (state.book !== null || state.pair) U().clearSel();
    m.set({ section: v });
    props.onTurn(v);
  };
  return (
    <section className="lab-dial" aria-label="Sections">
      <p className="lab-cap">
        <span>Fig. 2</span> Sections
      </p>
      <div className="lab-dial-row">
        <Button className="lab-btn lab-ico" aria-label="Previous section" onPress={() => choose(k === null ? SECTIONS.length - 1 : k - 1)} isDisabled={k === 0}>
          <ChevronLeft size={18} aria-hidden />
        </Button>
        <Slider
          className={"lab-dial-s" + (k === null ? " idle" : "")}
          minValue={0}
          maxValue={SECTIONS.length - 1}
          step={1}
          value={k ?? 0}
          onChange={(v) => choose(v as number)}
        >
          <div className="lab-dial-head">
            <Label className="lab-sr">Section</Label>
            <SliderOutput className="lab-dial-out">{() => (k === null ? "Turn to choose" : SECTIONS[k].name)}</SliderOutput>
          </div>
          <SliderTrack className="lab-dial-track">
            <div className="lab-dial-tape" aria-hidden>
              {SECTIONS.map((x, i) => (
                <span key={x.name} className={"lab-dial-seg" + (i === k ? " on" : "")} style={{ ["--c" as string]: SECTION_COLOURS[i] }}>
                  {Array.from({ length: x.to - x.from + 1 }, (_, j) => (
                    <i key={j} />
                  ))}
                </span>
              ))}
            </div>
            <SliderThumb className="lab-dial-needle" aria-label="Section" />
          </SliderTrack>
        </Slider>
        <Button className="lab-btn lab-ico" aria-label="Next section" onPress={() => choose(k === null ? 0 : k + 1)} isDisabled={k === SECTIONS.length - 1}>
          <ChevronRight size={18} aria-hidden />
        </Button>
      </div>
    </section>
  );
}

/**
 * Fig. 3, the schematic (brief V4): the wheel redrawn in 2D from the same model. New Testament
 * above, Old Testament below, each book a bar as tall as its best-evidence links, grouped by
 * section in the dial's colours. The threads of the selection run between the rows.
 */
function Schematic(props: { model: Model }) {
  const m = props.model;
  const state = useSyncExternalStore((f) => m.subscribe(f), () => m.state);
  const W = 400, GAP = 5, NT_BASE = 116, OT_BASE = 226, TALL = 84;
  const layout = useRef<{ x: number; w: number }[] | null>(null);
  if (!layout.current) {
    const pos: { x: number; w: number }[] = [];
    for (const t of [0, 1] as const) {
      const secs = SECTIONS.filter((x) => x.t === t);
      const n = secs.reduce((a, x) => a + x.to - x.from + 1, 0);
      const w = (W - GAP * (secs.length - 1)) / n;
      let x0 = 0;
      for (const sx of secs) {
        for (let b = sx.from; b <= sx.to; b++, x0 += w) pos[b] = { x: x0, w };
        x0 += GAP;
      }
    }
    layout.current = pos;
  }
  const L = layout.current;
  const max = Math.max(...m.links);
  const ot = (b: number) => b < m.firstOT;
  const cx = (b: number) => L[b].x + L[b].w / 2;
  const s = state;

  // What is lit, and the threads to draw: a book, a pair, a section, or section to section.
  const lit = new Set<number>();
  const flows: { a: number; b: number; ax: number; bx: number; n: number; c: string }[] = [];
  const secOf = (b: number) => m.sectionOf(b);
  const fromSection = (k: number) => {
    const x = SECTIONS[k];
    return (L[x.from].x + L[x.to].x + L[x.to].w) / 2;
  };
  if (s.pair) {
    lit.add(s.pair.o).add(s.pair.n);
    flows.push({ a: s.pair.o, b: s.pair.n, ax: cx(s.pair.o), bx: cx(s.pair.n), n: m.pairs.get(s.pair.o * 100 + s.pair.n) ?? 1, c: SECTION_COLOURS[secOf(s.pair.o)] });
  } else if (s.book !== null) {
    lit.add(s.book);
    for (const p of m.partners(s.book)) {
      lit.add(p.b);
      flows.push({ a: s.book, b: p.b, ax: cx(s.book), bx: cx(p.b), n: p.n, c: SECTION_COLOURS[secOf(s.book)] });
    }
  } else if (s.section !== null) {
    const x = SECTIONS[s.section];
    for (let b = x.from; b <= x.to; b++) lit.add(b);
    for (const p of m.sectionPartners(s.section)) {
      lit.add(p.b);
      flows.push({ a: x.from, b: p.b, ax: fromSection(s.section), bx: cx(p.b), n: p.n, c: SECTION_COLOURS[s.section] });
    }
  } else {
    const tally = new Map<number, number>();
    for (const [k, n] of m.pairs) {
      const key = secOf(Math.floor(k / 100)) * 100 + secOf(k % 100);
      tally.set(key, (tally.get(key) ?? 0) + n);
    }
    for (const [key, n] of tally) {
      const a = Math.floor(key / 100), b = key % 100;
      flows.push({ a: SECTIONS[a].from, b: SECTIONS[b].from, ax: fromSection(a), bx: fromSection(b), n, c: SECTION_COLOURS[a] });
    }
  }
  const top = Math.max(1, ...flows.map((f) => f.n));
  const any = lit.size > 0;
  const label =
    s.pair ? `${m.books[s.pair.o].n} and ${m.books[s.pair.n].n} joined` :
    s.book !== null ? `${m.books[s.book].n} and the ${m.partners(s.book).length} books it is joined to` :
    s.section !== null ? `${SECTIONS[s.section].name} and the books it is joined to` : "every section joined to every other";

  return (
    <section className="lab-schem" aria-label="Schematic">
      <p className="lab-cap">
        <span>Fig. 3</span> Schematic
      </p>
      <svg
        className="lab-schem-svg"
        viewBox={`0 0 ${W} 336`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Schematic of the 66 books by section: ${label}. Bar height is a book's best-evidence links.`}
        onClick={(e) => {
          const b = Number((e.target as Element).getAttribute("data-b"));
          if (!Number.isNaN(b) && (e.target as Element).hasAttribute("data-b")) U().select(b);
        }}
      >
        <text x="0" y="9" className="lab-schem-t">New Testament</text>
        <text x="0" y="334" className="lab-schem-t">Old Testament</text>
        <g className="lab-flows">
          {flows.map((f, i) => {
            const yo = OT_BASE + 2, yn = NT_BASE - 2, mid = (yo + yn) / 2;
            const [xo, xn] = ot(f.a) ? [f.ax, f.bx] : [f.bx, f.ax];
            return (
              <path
                key={`${f.a}-${f.b}-${i}`}
                d={`M${xo},${yo} C${xo},${mid} ${xn},${mid} ${xn},${yn}`}
                stroke={f.c}
                strokeWidth={0.6 + 4.4 * Math.sqrt(f.n / top)}
                fill="none"
                pathLength={1}
              />
            );
          })}
        </g>
        {m.books.map((bk, b) => {
          const h = 3 + TALL * Math.sqrt(m.links[b] / max);
          const y = ot(b) ? OT_BASE : NT_BASE - h;
          const on = !any || lit.has(b);
          const main = b === s.book || (s.pair && (b === s.pair.o || b === s.pair.n));
          return (
            <rect
              key={b}
              data-b={b}
              x={L[b].x + 0.6}
              y={y}
              width={Math.max(1, L[b].w - 1.2)}
              height={h}
              rx={1}
              fill={main ? "#16181d" : SECTION_COLOURS[secOf(b)]}
              opacity={on ? 1 : 0.22}
              className="lab-bar"
            >
              <title>{`${bk.n}: ${fmt(m.links[b])} best-evidence links`}</title>
            </rect>
          );
        })}
        {s.section !== null && (() => {
          const x = SECTIONS[s.section], x0 = L[x.from].x, x1 = L[x.to].x + L[x.to].w, y = x.t === 0 ? OT_BASE + TALL + 8 : NT_BASE - TALL - 8;
          return <path className="lab-bracket" d={x.t === 0 ? `M${x0},${y - 3} V${y} H${x1} V${y - 3}` : `M${x0},${y + 3} V${y} H${x1} V${y + 3}`} />;
        })()}
      </svg>
      <p className="lab-schem-key">
        <span>Bar height: best-evidence links</span>
        <span>Tap a bar to choose the book</span>
      </p>
    </section>
  );
}
