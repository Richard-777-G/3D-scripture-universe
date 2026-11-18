/**
 * The console sits on top of the normal app; it never replaces it. Every way out of the
 * console (the five section tabs, the reader, the map, Credits) goes through leaveLab(),
 * which puts the wheel back where the app keeps it and shows the normal app again, so
 * each section opens exactly as it does without the console.
 */
let home: { stage: HTMLElement; parent: Node; next: Node | null } | null = null;
let left = false;

/** Remember where the app keeps the wheel before the console borrows it. */
export function rememberStage(stage: HTMLElement): void {
  if (!home) home = { stage, parent: stage.parentNode!, next: stage.nextSibling };
}

export function inLab(): boolean {
  return !left && document.body.classList.contains("su-lab");
}

/** Step the console aside and give the screen back to the normal app. */
export function leaveLab(): void {
  if (left) return;
  left = true;
  if (home) home.parent.insertBefore(home.stage, home.next);
  document.body.classList.remove("su-lab");
  const root = document.getElementById("lab");
  if (root) root.hidden = true;
  // The wheel's own view settings were tuned for the console; hand back the normal ones.
  try {
    const u = (window as unknown as { UNI?: Record<string, any> }).UNI;
    u?.explode?.(0);
    u?.xray?.(false);
    u?.setMin?.(true);
    u?.setMin?.(false);
  } catch {
    /* the wheel keeps working */
  }
  dispatchEvent(new Event("resize"));
}
