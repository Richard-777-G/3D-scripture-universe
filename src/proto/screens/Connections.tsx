import { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "lucide-react";
import { TopBar, Segmented, Loading } from "../ui";
import { fmt, unpack, LABEL_ORDER, type AppData, type Link } from "../data";
import { href } from "../router";
import { useSettings } from "../settings";

type Set = "best" | "otnt" | "all";

export function Connections({ d }: { d: AppData }) {
  const s = useSettings();
  const [set, setSet] = useState<Set>("best");
  const [links, setLinks] = useState<Link[] | null>(d.bestLinks);
  useEffect(() => {
    if (set === "best") { setLinks(d.bestLinks); return; }
    setLinks(null);
    Promise.all([d.pack("xon"), set === "all" ? d.pack("xin") : Promise.resolve(null)]).then(([on, inn]) => setLinks([...unpack(on), ...(inn ? unpack(inn) : [])]));
  }, [set, d]);
  const c = d.counts;
  const options: [string, string][] = [["best", `Best evidence · ${fmt(c.best)}`], ["otnt", `All Old ↔ New · ${fmt(c.otnt)}`], ["all", `All connections · ${fmt(c.all)}`]];
  const explain = set === "best"
    ? "Links the Bible text itself supports: the same wording, rare words both passages share, or a prophecy with published sources."
    : set === "otnt" ? "Every link between the Old and New Testaments from OpenBible.info and the Treasury of Scripture Knowledge, labelled by what supports it."
      : "Every link we hold, inside each Testament as well as between them.";
  return (
    <>
      <TopBar title="How it connects" back={{ label: "Home", to: { tab: "home" } }} />
      <main className="screen" id="main">
        <p className="lead">Each line joins two Bible passages that are linked. Pick how much to show.</p>
        <Segmented label="Show" value={set} onChange={(k) => setSet(k as Set)} options={options} />
        <p className="hint">{explain}</p>
        {links ? <ArcView d={d} links={links} /> : <Loading what={`${fmt(set === "all" ? c.all : c.otnt)} connections`} />}
        <div className="legend-row" aria-hidden>
          <span><i style={{ background: "var(--ot)" }} /> Old Testament</span>
          <span><i style={{ background: "var(--nt)" }} /> New Testament</span>
        </div>
        {links && <TopPairs d={d} links={links} max={s.mode === "standard" ? 8 : 5} />}
        <h3 className="sub">Why a link is shown</h3>
        <ul className="why">
          {LABEL_ORDER.map((L) => <li key={L.key}><span className={`badge lbl-${L.key}`}>{L.name}</span> {L.plain} <small>{fmt(c.labels[L.key] || 0)} links</small></li>)}
        </ul>
        <a className="btn secondary wide" href="/"><Box aria-hidden /> Open the 3D wheel (current app)</a>
      </main>
    </>
  );
}

/** Every book along one line, sized by its verses; each link is an arc above it. */
function ArcView({ d, links }: { d: AppData; links: Link[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const total = d.counts.verses;
  useEffect(() => {
    const cv = ref.current!;
    const draw = () => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = devicePixelRatio || 1;
      if (w < 50 || h < 80) return;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext("2d")!;
      g.scale(dpr, dpr);
      const css = getComputedStyle(document.documentElement);
      const ot = css.getPropertyValue("--ot").trim(), nt = css.getPropertyValue("--nt").trim(), ink = css.getPropertyValue("--ink-2").trim();
      const base = h - 28, x = (v: number) => 6 + (v / total) * (w - 12);
      const firstNT = d.chapter(39, 1)[0];
      const alpha = Math.max(0.008, Math.min(0.3, 4 / Math.sqrt(links.length)));
      g.lineWidth = links.length > 20000 ? 0.5 : 1;
      for (const [colour, pick] of [[ot, (l: Link) => l.a < firstNT && l.s < firstNT], [nt, (l: Link) => !(l.a < firstNT && l.s < firstNT)]] as const) {
        g.strokeStyle = colour; g.globalAlpha = alpha;
        g.beginPath();
        for (const l of links) {
          if (!pick(l)) continue;
          const x1 = x(l.a), x2 = x(l.s), r = Math.abs(x2 - x1) / 2;
          if (r < 0.5) continue;
          g.moveTo(x1, base);
          g.ellipse((x1 + x2) / 2, base, r, Math.max(1, Math.min(r, base - 8)), 0, Math.PI, 0, x1 > x2);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      // the books as a ruler
      let v0 = 0;
      d.books.forEach((b, i) => {
        const n = b.ch.reduce((a, c) => a + c, 0);
        g.fillStyle = b.t === 0 ? ot : nt;
        g.fillRect(x(v0) + 0.5, base + 4, Math.max(1, x(v0 + n) - x(v0) - 1), 8);
        v0 += n;
        void i;
      });
      g.fillStyle = ink; g.font = "12px Inter, sans-serif";
      g.fillText("Genesis", x(0), base + 26);
      g.fillText("Matthew", x(firstNT) - 20, base + 26);
      g.textAlign = "right"; g.fillText("Revelation", x(total), base + 26);
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(cv);
    return () => ro.disconnect();
  }, [links, d, total]);
  return <canvas ref={ref} className="arcs" role="img" aria-label={`${fmt(links.length)} connections drawn as arcs between the books of the Bible, from Genesis to Revelation.`} />;
}

function TopPairs({ d, links, max }: { d: AppData; links: Link[]; max: number }) {
  const top = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of links) {
      const a = d.vi.ref(l.a).book - 1, b = d.vi.ref(l.s).book - 1;
      if (a === b) continue;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m].sort((x, y) => y[1] - x[1]).slice(0, max).map(([k, n]) => { const [a, b] = k.split("|").map(Number); return { a, b, n }; });
  }, [links, d, max]);
  return (
    <section aria-labelledby="pairs-h">
      <h3 className="sub" id="pairs-h">Books most linked together</h3>
      <ol className="pairs">
        {top.map((p) => (
          <li key={`${p.a}-${p.b}`}><a href={href({ tab: "read", b: p.a, c: 1 })}><b>{d.books[p.a].n}</b> and <b>{d.books[p.b].n}</b></a><span>{fmt(p.n)} links</span></li>
        ))}
      </ol>
    </section>
  );
}
