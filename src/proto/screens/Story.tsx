import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import { ChevronLeft, ChevronRight, Volume2, Square } from "lucide-react";
import { TopBar } from "../ui";
import { type AppData } from "../data";
import { href } from "../router";
import { speak, stopSpeaking, useSettings } from "../settings";

export function Story({ d, step }: { d: AppData; step?: number }) {
  if (step == null) return <StoryHome d={d} />;
  return <StoryStep d={d} k={Math.max(0, Math.min(d.story.length - 1, step))} />;
}

function StoryHome({ d }: { d: AppData }) {
  const s = useSettings();
  return (
    <>
      <TopBar title="The story" back={{ label: "Home", to: { tab: "home" } }} />
      <main className="screen" id="main">
        <p className="lead">The Bible tells one story in {d.story.length} steps: God’s promise, and how Christians see it kept in Jesus.</p>
        <a className="btn primary wide" href={href({ tab: "story", step: 0 })}>Start at step 1</a>
        <ol className="steps">
          {d.story.map((st, i) => (
            <li key={st.id}>
              <a className="step" href={href({ tab: "story", step: i })}>
                <span className="step-n" aria-hidden>{i + 1}</span>
                <span><b>{st.title}</b><span>{s.mode === "kids" ? st.kid : st.chapter}</span></span>
              </a>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}

function StoryStep({ d, k }: { d: AppData; k: number }) {
  const s = useSettings();
  const st = d.story[k];
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopSpeaking(), [k]);
  const passage = (r: { s: number; e: number }) => {
    const vs = Array.from({ length: Math.min(r.e - r.s + 1, 4) }, (_, i) => r.s + i);
    return vs.map((v) => d.text(v)).join(" ") + (r.e - r.s >= 4 ? " …" : "");
  };
  const listen = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    const parts = [st.title, s.mode === "kids" ? st.kid : st.text, ...st.ot.slice(0, 1).map((r) => `${d.range(r.s, r.e)}. ${passage(r)}`), ...st.nt.slice(0, 1).map((r) => `${d.range(r.s, r.e)}. ${passage(r)}`)];
    setSpeaking(speak(parts, undefined, () => setSpeaking(false)));
  };
  const Ref = ({ r, kind }: { r: { s: number; e: number }; kind: string }) => {
    const x = d.vi.ref(r.s);
    return (
      <figure className={`passage ${kind}`}>
        <figcaption><span className="pill">{kind === "ot" ? "The promise" : "Kept in Jesus"}</span> <a href={href({ tab: "read", b: x.book - 1, c: x.chapter, v: x.verse })}>{d.range(r.s, r.e)}</a></figcaption>
        <blockquote className="read">{passage(r)}</blockquote>
      </figure>
    );
  };
  return (
    <>
      <TopBar title={`Step ${k + 1} of ${d.story.length}`} back={{ label: "All steps", to: { tab: "story" } }} />
      <main className="screen story" id="main">
        <p className="kicker">{st.chapter}</p>
        <h2 className="h2">{st.title}</h2>
        <p className="lead">{s.mode === "kids" ? st.kid : st.text}</p>
        <Button className="btn secondary" onPress={listen}>{speaking ? <><Square aria-hidden /> Stop</> : <><Volume2 aria-hidden /> Listen to this step</>}</Button>
        {st.ot.slice(0, s.mode === "standard" ? 3 : 1).map((r, i) => <Ref key={"o" + i} r={r} kind="ot" />)}
        {st.nt.slice(0, s.mode === "standard" ? 3 : 1).map((r, i) => <Ref key={"n" + i} r={r} kind="nt" />)}
        <nav className="stepnav" aria-label="Story steps">
          {k > 0 ? <a className="btn secondary" href={href({ tab: "story", step: k - 1 })}><ChevronLeft aria-hidden /> Previous</a> : <span />}
          <span className="hint">{k + 1} / {d.story.length}</span>
          {k < d.story.length - 1 ? <a className="btn primary" href={href({ tab: "story", step: k + 1 })}>Next <ChevronRight aria-hidden /></a> : <a className="btn primary" href={href({ tab: "story" })}>Finish</a>}
        </nav>
      </main>
    </>
  );
}
