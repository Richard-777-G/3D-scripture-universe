/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

/** Numbers in index.html come from the built data packs, never typed by hand. */
function countsFromData(): Plugin {
  return {
    name: "counts-from-data",
    transformIndexHtml(html) {
      const dir = path.resolve(__dirname, "public/data");
      const m = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
      const core = JSON.parse(fs.readFileSync(path.join(dir, m.files.core.file), "utf8"));
      const story = JSON.parse(fs.readFileSync(path.join(dir, m.files.story.file), "utf8"));
      const c = core.counts, fmt = (n: number) => n.toLocaleString("en-US");
      return html.replaceAll("%BOOKS%", fmt(c.books)).replaceAll("%LINKS%", fmt(c.all)).replaceAll("%STEPS%", fmt(story.length));
    },
  };
}

export default defineConfig({
  plugins: [countsFromData(), react()],
  build: {
    target: "es2022", // MapLibre's map worker needs native class fields
    rollupOptions: { input: { main: path.resolve(__dirname, "index.html"), prototype: path.resolve(__dirname, "prototype/index.html") } },
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
