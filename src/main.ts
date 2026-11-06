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
