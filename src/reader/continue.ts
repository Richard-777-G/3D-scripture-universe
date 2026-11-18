/**
 * Daily use: "carry on where I stopped". The reader remembers the last chapter read on this
 * device; on the home wheel a returning reader gets one button, "Continue reading · John 3",
 * in the place where first-time visitors see "Start the story here".
 */
const KEY = "su-last";

export interface LastRead {
  b: number;
  c: number;
}

export function saveLastRead(b: number, c: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ b, c, t: Date.now() }));
  } catch {
    /* private mode: nothing is remembered */
  }
}

export function loadLastRead(books: { n: string; ch: number[] }[]): LastRead | null {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!o || !Number.isInteger(o.b) || !Number.isInteger(o.c)) return null;
    if (o.b < 0 || o.b >= books.length || o.c < 1 || o.c > books[o.b].ch.length) return null;
    return { b: o.b, c: o.c };
  } catch {
    return null;
  }
}

/**
 * The button lives in the wheel's stage, like the classic call to action. It shows only on the
 * home wheel (nothing chosen, no panel open) and never in the console (?ui=lab).
 */
export function mountContinue(books: { n: string; ch: number[] }[], open: (b: number, c: number) => void): void {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "su-cont-btn";
  btn.hidden = true;
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v13.5"/></svg><span><small>Continue reading</small><b></b></span>';
  stage.appendChild(btn);
  let last: LastRead | null = null;
  btn.addEventListener("click", () => {
    if (last) open(last.b, last.c);
  });

  const update = () => {
    last = loadLastRead(books);
    const u = (window as unknown as { UNI?: Record<string, any> }).UNI;
    const panelOpen = document.getElementById("panel")?.classList.contains("on") && !u?.panelMin;
    // Right after a panel closes the classic "Show guide" button takes this spot; step aside then.
    const pshow = document.getElementById("pshow");
    const guideShown = !!pshow && getComputedStyle(pshow).display !== "none";
    const home = !!u && u.uiMode === "none" && u.sel == null && !panelOpen && !guideShown;
    const show = !!last && home && !document.body.classList.contains("su-lab") && !document.body.classList.contains("su-nr");
    if (last) {
      const name = `${books[last.b].n} ${last.c}`;
      btn.querySelector("b")!.textContent = name;
      btn.setAttribute("aria-label", `Continue reading ${name}`);
    }
    btn.hidden = !show;
    document.body.classList.toggle("su-cont", show);
  };
  update();
  // The classic app has no change event to listen to; a light check twice a second is enough.
  setInterval(update, 500);
  addEventListener("storage", update);
}
