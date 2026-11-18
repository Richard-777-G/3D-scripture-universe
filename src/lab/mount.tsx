/**
 * Starts the Section V console (?ui=lab). The real wheel (#stage, with its canvas and
 * every listener) is moved into the console's viewing window, so the engine keeps
 * working untouched. The section tabs stay visible; any of them, or the reader, the map
 * or Credits, hands the screen back to the normal app (see shell.ts).
 */
import { createRoot } from "react-dom/client";
import "../ui/tokens.css";
import "./lab.css";
import type { Dataset } from "../data/loader";
import { Model, U } from "./model";
import { Lab } from "./Lab";
import { rememberStage, leaveLab, inLab } from "./shell";

export function mountLab(data: Dataset): Model {
  const model = new Model(data);
  const root = document.createElement("div");
  root.id = "lab";
  root.className = "slab"; // not "lab": the wheel's own book labels use that class
  document.body.appendChild(root);
  document.body.classList.add("su-lab");
  // The console explains the wheel itself; the first-visit intro is not needed here.
  try {
    U()?.closeIntro?.();
  } catch {
    /* intro already closed */
  }
  const stage = document.getElementById("stage")!;
  rememberStage(stage);
  // The five section tabs stay at the bottom in the console. Tapping one gives the screen
  // back to the normal app first (capture runs before the tab's own handler), so the
  // section opens exactly as it always does.
  document.getElementById("tabs")?.addEventListener(
    "click",
    () => {
      if (inLab()) leaveLab();
    },
    true,
  );
  createRoot(root).render(<Lab model={model} onView={(el) => el.appendChild(stage)} />);
  (window as unknown as { SU_LAB: Model }).SU_LAB = model;
  return model;
}
