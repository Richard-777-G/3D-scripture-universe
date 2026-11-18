/**
 * Puts the new reader beside the wheel and keeps it in step with the classic app.
 *
 * The classic app (src/legacy, read-only for UI work) still decides *when* the reader
 * is open and which chapter: this file only watches it through window.UNI and its
 * panel, and asks it to move (open a chapter, go back, close, show a link on the wheel)
 * through the same buttons and functions people and tests already use.
 */
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "../ui/tokens.css";
import "./reader.css";
import type { Dataset } from "../data/loader";
import { ReaderData } from "./data";
import { Reader, type Host, type Prefs } from "./Reader";
import { mountContinue, saveLastRead } from "./continue";

type Uni = Record<string, any>;
const U = (): Uni => (window as unknown as { UNI: Uni }).UNI;
const PREFS = "su-reader-prefs";

function loadPrefs(): Prefs {
  // Night by default, like the rest of the app (the 3D space is dark); Light or "follow the phone" is a choice in Aa.
  const d: Prefs = { theme: "night", size: 1, version: "kjv" };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS) || "{}");
    // Settings saved before Night became the default (no v) kept "follow the phone" without anyone
    // choosing it; move them to Night once. A choice made in Aa from now on is kept as made.
    if (saved.v !== 2) saved.theme = "night";
    return { ...d, ...saved, v: 2 };
  } catch {
    return d;
  }
}

interface View {
  b: number;
  c: number;
  verse: number | null;
  nonce: number;
}

export function mountReader(dataset: Dataset): { sync(): void } {
  const data = new ReaderData(dataset);
  const el = document.createElement("aside");
  el.id = "rp";
  el.className = "su-ui rp";
  el.setAttribute("aria-labelledby", "rp-title");
  el.hidden = true;
  document.body.insertBefore(el, document.getElementById("tabs"));
  const root = createRoot(el);

  let view: View | null = null;
  let pending: { b: number; c: number; verse: number } | null = null;
  let nonce = 0;

  const host: Host = {
    open(b, c, verse) {
      pending = verse === undefined ? null : { b, c, verse };
      U().openReader(b, c);
      sync();
    },
    back: () => U().navBack(),
    canGoBack: () => (U().navDepth ?? 0) > 0,
    // The classic Close button: it clears the wheel and hides the panel exactly as before.
    close: () => document.getElementById("clr")?.click(),
    showOnWheel(i) {
      // The classic panel already handles "show this link on the wheel" for any [data-xo] button inside it.
      const pc = document.getElementById("pc");
      if (!pc) return;
      const b = document.createElement("button");
      b.dataset.xo = String(i);
      b.hidden = true;
      pc.appendChild(b);
      b.click();
      b.remove();
    },
    pickPassage: () => U().openRefPicker(),
  };

  function render() {
    root.render(view ? <App data={data} host={host} view={view} /> : null);
  }

  function sync() {
    const u = U();
    if (!u) return;
    const ch = u.uiMode === "reader" && u.selChap != null ? u.chs[u.selChap] : null;
    if (!ch) {
      if (view) {
        view = null;
        el.hidden = true;
        document.body.classList.remove("su-nr");
        render();
      }
      return;
    }
    const opening = !view;
    const verse = pending && pending.b === ch.b && pending.c === ch.c ? pending.verse : null;
    pending = null;
    if (!opening && view!.b === ch.b && view!.c === ch.c && verse === null) return;
    view = { b: ch.b, c: ch.c, verse, nonce: ++nonce };
    saveLastRead(ch.b, ch.c);
    el.hidden = false;
    document.body.classList.add("su-nr");
    render();
    if (opening) requestAnimationFrame(() => document.getElementById("rp-title")?.focus({ preventScroll: true }));
  }

  // Keep the whole wheel in view above the reader. The classic app re-fits its camera when the
  // space for the wheel changes only while no book is selected; with the reader open a book is
  // selected, so after the sheet opens or changes size we ask it to re-fit through setMin, the
  // public switch whose only effect here is its re-fit (the classic panel is hidden meanwhile).
  let refitTimer = 0;
  new ResizeObserver(() => {
    if (!view) return;
    clearTimeout(refitTimer);
    refitTimer = window.setTimeout(() => {
      const u = U();
      if (!view || !u?.setMin) return;
      u.setMin(true);
      u.setMin(false);
    }, 60);
  }).observe(document.getElementById("stage")!);

  // Watch the classic panel: it re-renders whenever the screen changes.
  const panel = document.getElementById("panel")!;
  const obs = new MutationObserver(() => sync());
  obs.observe(panel, { attributes: true, attributeFilter: ["class"] });
  obs.observe(document.getElementById("pc")!, { childList: true });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.defaultPrevented && !(e.target as HTMLElement).closest("[role=dialog],[role=listbox]")) host.close();
  });
  sync();
  mountContinue(data.books, (b, c) => host.open(b, c));
  return { sync };
}

function App(props: { data: ReaderData; host: Host; view: View }) {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [systemLight, setSystemLight] = useState(() => matchMedia("(prefers-color-scheme: light)").matches);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: light)");
    const on = () => setSystemLight(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const light = prefs.theme === "light" || (prefs.theme === "auto" && systemLight);
  useEffect(() => {
    const el = document.getElementById("rp")!;
    el.classList.toggle("su-light", light);
    el.style.setProperty("--size", String(prefs.size));
  }, [light, prefs.size]);
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    try {
      localStorage.setItem(PREFS, JSON.stringify({ ...p, v: 2 }));
    } catch {
      /* private mode: the choice lasts until the page closes */
    }
  };
  const { view } = props;
  return <Reader data={props.data} host={props.host} b={view.b} c={view.c} verse={view.verse} nonce={view.nonce} prefs={prefs} setPrefs={setPrefs} dark={!light} />;
}
