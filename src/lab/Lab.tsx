/**
 * Section V console, Phase 1 (?ui=lab): the wheel is the machine; this explains it.
 * Big live number, plain paragraph, numbered callouts pinned to real books, camera moves,
 * and a strip of six live metric tiles. Everything reads from the one Model.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { BookOpen, Box, Eye, MoveHorizontal, ArrowDownToLine, Orbit, RotateCcw } from "lucide-react";
import { Model, U, type Camera } from "./model";

const fmt = (n: number) => n.toLocaleString("en-US");
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

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

/** A smooth camera move: ease in and out over 1.4 s, along the shorter way round. */
function fly(to: { th: number; el: number; rad: number }) {
  const u = U();
  const from = u.view as { th: number; el: number; rad: number };
  let dth = ((to.th - from.th + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (reduced()) return u.setView({ th: from.th + dth, el: to.el, rad: to.rad });
  const t0 = performance.now(), D = 1400;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const k = ease(Math.min(1, (now - t0) / D));
    u.setView({ th: from.th + dth * k, el: from.el + (to.el - from.el) * k, rad: from.rad + (to.rad - from.rad) * k });
    if (k < 1) requestAnimationFrame(step);
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
    let id = 0;
    const tick = () => {
      m.sync();
      const u = U();
      if (!hero.current && u && !u.intro && u.view) hero.current = { ...u.view };
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [m]);

  const metrics = m.metrics();
  const lit = m.lit();
  const all = Number(m.counts.best ?? 0);
  const para = m.paragraph();
  const sel = state.pair ? `${m.books[state.pair.o].n} ↔ ${m.books[state.pair.n].n}` : state.book !== null ? `${m.books[state.book].n}${state.chapter !== null ? " " + state.chapter : ""}` : "The whole Bible";

  return (
    <div className="lab-in">
      <header className="lab-head">
        <div className="lab-id">
          <p className="lab-kicker">
            <span>AN-001</span>
            <span>Scripture Universe · How it works</span>
          </p>
          <h1 className="lab-title">The Wheel</h1>
          <p className="lab-big" aria-live="polite">
            <b>{fmt(lit)}</b>
            <span>
              {state.book === null && !state.pair ? "best-evidence threads" : `of ${fmt(all)} threads lit`}
              <small>{sel}</small>
            </span>
          </p>
        </div>
        <div className="lab-para">
          <h2>{para.title}</h2>
          <p>{para.text}</p>
          <div className="lab-acts">
            {state.book !== null && (
              <Button className="lab-btn lab-btn-p" onPress={() => U().openReader(state.book, state.chapter ?? 1)}>
                <BookOpen size={16} aria-hidden />
                Read {m.books[state.book].n} {state.chapter ?? 1}
              </Button>
            )}
            {(state.book !== null || state.pair) && (
              <Button className="lab-btn" onPress={() => U().clearSel()}>
                <RotateCcw size={16} aria-hidden />
                The whole Bible
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="lab-stage" aria-label="The wheel, live 3D">
        <div className="lab-view" ref={view} />
        <p className="lab-fig" aria-hidden>
          <span>Fig. 1</span> The wheel · live 3D
        </p>
        <Callouts model={m} />
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

      <section className="lab-metrics" aria-label="Live numbers for the selection">
        {metrics.map((x) => (
          <div key={x.key} className="lab-metric" style={{ ["--acc" as string]: x.accent }}>
            <b>{fmt(x.value)}</b>
            <span className="lab-m-l">{x.label}</span>
            <span className="lab-m-u">{x.unit}</span>
          </div>
        ))}
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
      else setTags(m.busiest(k + 1).map((b) => ({ b, n: m.links[b] })));
    }
  }, [m, state.book, state.pair]);

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
      // Place each side's tags inside the window first (clear of the "Fig. 1" label and the
      // camera bar), then space them 34 px apart, pushing back up from the bottom if needed;
      // a tag that still cannot fit is left out rather than drawn on top of another.
      const TOP = 44, BOTTOM = H - 74, GAP = 34;
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
        lab.style.transform = `translate(${p.side < 0 ? gx : gx}px, ${ty}px) translate(${p.side < 0 ? "0" : "-100%"}, -50%)`;
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
            <polyline fill="none" />
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
