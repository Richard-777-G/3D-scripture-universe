import { useSyncExternalStore } from "react";

export type Mode = "standard" | "easy" | "kids";
export type Theme = "paper" | "night" | "contrast";
export interface Settings { mode: Mode; theme: Theme; zoom: number; version: "kjv" | "bsb"; last?: { b: number; c: number } }

const KEY = "su_proto_settings";
const read = (): Settings => {
  const base: Settings = { mode: "standard", theme: matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper", zoom: 1, version: "kjv" };
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return base; }
};
let current = read();
const subs = new Set<() => void>();

export function apply(s: Settings) {
  const h = document.documentElement;
  h.dataset.mode = s.mode;
  h.dataset.theme = s.theme;
  h.style.setProperty("--zoom", String(s.zoom));
}
apply(current);

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  current.zoom = Math.min(1.8, Math.max(0.9, Math.round(current.zoom * 100) / 100));
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private mode: keep in memory */ }
  apply(current);
  subs.forEach((f) => f());
}

export function useSettings(): Settings {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current);
}

/** Read aloud with the browser's own voice (free, on the device). */
export function speak(texts: string[], onVerse?: (i: number) => void, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  synth.cancel();
  texts.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t);
    u.rate = current.mode === "standard" ? 1 : 0.9;
    u.onstart = () => onVerse && onVerse(i);
    if (i === texts.length - 1) u.onend = () => onEnd && onEnd();
    synth.speak(u);
  });
  return true;
}
export const stopSpeaking = () => window.speechSynthesis && window.speechSynthesis.cancel();
