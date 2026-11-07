import { lazy, Suspense, useEffect, useState } from "react";
import { NavBar } from "./ui";
import { loadAppData, type AppData } from "./data";
import { useRoute } from "./router";
import { Home } from "./screens/Home";
// Only Home loads with the app; every other screen loads when first opened.
const Read = lazy(() => import("./screens/Read").then((m) => ({ default: m.Read })));
const Story = lazy(() => import("./screens/Story").then((m) => ({ default: m.Story })));
const Connections = lazy(() => import("./screens/Connections").then((m) => ({ default: m.Connections })));
const Places = lazy(() => import("./screens/Places").then((m) => ({ default: m.Places })));
const Search = lazy(() => import("./screens/Search").then((m) => ({ default: m.Search })));

export function App() {
  const route = useRoute();
  const [d, setD] = useState<AppData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadAppData().then(setD).catch((e) => { console.error(e); setErr("Could not load the Bible. Check your connection and try again."); }); }, []);
  // Each screen change starts at the top and moves focus to its title, for screen readers.
  useEffect(() => { window.scrollTo(0, 0); const h = document.querySelector<HTMLElement>(".top-title"); h?.setAttribute("tabindex", "-1"); h?.focus({ preventScroll: true }); }, [route.tab, (route as any).b, (route as any).c, (route as any).step, (route as any).sub]);
  const tab = route.tab === "search" ? "home" : route.tab;
  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <NavBar current={tab} />
      <div className="content">
        <Suspense fallback={<main className="screen"><p className="loading" role="status">Loading…</p></main>}>
        {err ? <main className="screen"><p className="lead">{err}</p><button className="btn primary" onClick={() => location.reload()}>Try again</button></main>
          : !d ? <main className="screen"><p className="loading" role="status">Loading the Bible…</p></main>
            : route.tab === "read" ? <Read d={d} b={route.b} c={route.c} v={route.v} />
              : route.tab === "story" ? <Story d={d} step={route.step} />
                : route.tab === "connections" ? <Connections d={d} />
                  : route.tab === "places" ? <Places d={d} sub={route.sub} place={route.place} />
                    : route.tab === "search" ? <Search d={d} q0={route.q} />
                      : <Home d={d} />}
        </Suspense>
      </div>
    </div>
  );
}
