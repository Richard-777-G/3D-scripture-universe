import { BookOpen, Map, Network, Route as RouteIcon, Play } from "lucide-react";
import { BigCard, TopBar } from "../ui";
import { fmt, type AppData } from "../data";
import { href } from "../router";
import { useSettings } from "../settings";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

/** A verse for today: the promise verses of the 16 story steps, in turn by date. */
function verseOfDay(d: AppData) {
  const steps = d.story.filter((s) => s.ot.length);
  const day = Math.floor(Date.now() / 86400000);
  const s = steps[day % steps.length];
  return { v: s.ot[0].s, e: Math.min(s.ot[0].e, s.ot[0].s + 1), step: d.story.indexOf(s) };
}

export function Home({ d }: { d: AppData }) {
  const set = useSettings();
  const vod = verseOfDay(d);
  const kids = set.mode === "kids";
  const cards = [
    { to: { tab: "read" as const }, icon: <BookOpen />, title: "Read the Bible", text: `All ${d.counts.books} books, in clear text you can make bigger or hear aloud.`, tone: "var(--action)" },
    { to: { tab: "story" as const }, icon: <RouteIcon />, title: "Follow the story", text: `${d.story.length} short steps, from the first promise to Jesus and his return.`, tone: "var(--accent)" },
    { to: { tab: "connections" as const }, icon: <Network />, title: "See how it connects", text: `How the Old and New Testaments point to each other, with the reason for every link.`, tone: "var(--lbl-shared)" },
    { to: { tab: "places" as const }, icon: <Map />, title: "Places & evidence", text: `${fmt(d.counts.places)} Bible places on a map, and real finds from history.`, tone: "var(--ok)" },
  ];
  if (kids) cards.unshift(cards.splice(1, 1)[0]);
  return (
    <>
      <TopBar title="Home" />
      <main className="screen home" id="main">
        <h2 className="greet">{greeting()}</h2>
        <p className="lead">{kids ? "What would you like to do?" : "What would you like to do today?"}</p>
        <div className="cards">{cards.map((c) => <BigCard key={c.title} {...c} />)}</div>
        {set.last && (
          <a className="continue" href={href({ tab: "read", b: set.last.b, c: set.last.c })}>
            <Play aria-hidden /> <span><b>Continue reading</b><br />{d.books[set.last.b].n} {set.last.c}</span>
          </a>
        )}
        <section className="vod" aria-labelledby="vod-h">
          <h3 id="vod-h" className="sub">Verse for today</h3>
          <blockquote className="read">{d.text(vod.v)}{vod.e > vod.v ? " " + d.text(vod.e) : ""}</blockquote>
          <p className="vod-ref">{d.range(vod.v, vod.e)} · from the story, step {vod.step + 1}</p>
          <a className="btn secondary" href={href({ tab: "story", step: vod.step })}>Open this step</a>
        </section>
      </main>
    </>
  );
}
