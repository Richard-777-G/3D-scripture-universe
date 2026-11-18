import "./styles.css";
import { loadDataset, DataLoadError } from "./data/loader";

const boot = document.getElementById("boot")!;
const msg = document.getElementById("boot-msg")!;
const retry = document.getElementById("boot-retry") as HTMLButtonElement;

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

let appStarted = false;

/**
 * The new reader is the default (Richard said yes on PR #22). The classic reader stays
 * one switch away (brief Section S): ?ui=classic keeps it for this browser, ?ui=new undoes that.
 */
function newUi(): boolean {
  const q = new URLSearchParams(location.search).get("ui");
  try {
    if (q === "classic") localStorage.setItem("su-ui", "classic");
    if (q === "new") localStorage.removeItem("su-ui");
    return localStorage.getItem("su-ui") !== "classic";
  } catch {
    return q !== "classic";
  }
}

/**
 * Section V console (brief V7): only while ?ui=lab is in the link, until Richard approves it
 * as the default. It is never remembered; an older build remembered it (su-lab), so that
 * stored switch is cleared here and the plain link always opens the normal app.
 */
function labUi(): boolean {
  try {
    localStorage.removeItem("su-lab");
  } catch {
    /* private mode: nothing stored */
  }
  return new URLSearchParams(location.search).get("ui") === "lab";
}

async function run(): Promise<void> {
  // The app code is not built to start twice; if it failed part-way, start clean.
  if (appStarted) return location.reload();
  if (!hasWebGL()) {
    boot.remove();
    document.getElementById("err")!.style.display = "flex";
    return;
  }
  retry.hidden = true;
  msg.textContent = "Loading the Bible…";
  boot.classList.remove("boot-failed");
  try {
    const [data, app] = await Promise.all([loadDataset(), import("./legacy/app.js")]);
    appStarted = true;
    app.start(data);
    (window as unknown as { SU_DATA_VERSION: string }).SU_DATA_VERSION = data.version;
    if (labUi()) {
      import("./lab/mount")
        .then((m) => m.mountLab(data))
        .catch((e) => console.error("The console could not start; the wheel still works.", e));
    }
    if (newUi()) {
      import("./reader/mount")
        .then((m) => m.mountReader(data))
        .catch((e) => console.error("The new reader could not start; the classic reader still works.", e));
    }
    boot.classList.add("boot-done");
    setTimeout(() => boot.remove(), 400);
  } catch (e) {
    console.error(e);
    boot.classList.add("boot-failed");
    msg.textContent =
      e instanceof DataLoadError || !navigator.onLine
        ? "Could not load the Bible data. Check your connection and try again."
        : "Something went wrong while starting the app.";
    retry.hidden = false;
  }
}

retry.addEventListener("click", () => void run());
void run();
