#!/usr/bin/env node
/**
 * Validate the raw data and curated content, then write versioned data packs.
 *
 *   node pipeline/build-packs.mjs [--check]      (--check validates only)
 *
 * Output: public/data/manifest.json plus public/data/<name>.<hash>.<ext>.
 * The manifest is fetched fresh; every pack file is immutable, so the app only
 * downloads a pack again when its content changes.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { validateAll } from "./validate.mjs";
import { loadInputs } from "./inputs.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public/data");
const checkOnly = process.argv.includes("--check");

const input = loadInputs();

const report = validateAll(input);
for (const w of report.warnings) console.warn("warn:", w);
if (report.errors.length) {
  for (const e of report.errors) console.error("error:", e);
  console.error(`\n${report.errors.length} validation error(s). No packs written.`);
  process.exit(1);
}
console.log(`validation passed (${report.warnings.length} warnings)`);
if (checkOnly) process.exit(0);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const files = {};
const put = (key, ext, text) => {
  const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 10);
  const name = `${key}.${hash}.${ext}`;
  fs.writeFileSync(path.join(OUT, name), text);
  files[key] = { file: name, bytes: Buffer.byteLength(text) };
};

put("core", "json", JSON.stringify(input.core));
put("kjv", "txt", input.kjv.join("\n"));
for (const k of ["journeys", "story", "evidence", "qa"]) put(k, "json", JSON.stringify(input[k]));
put("sources", "json", JSON.stringify(input.sources.datasets));
put("evidence-centre", "json", JSON.stringify(input.evidenceCentre));
for (const [k, text] of Object.entries(input.assets)) put(k, k.startsWith("v_") ? "txt" : "json", text);
// Theographic people, places and events (loaded on demand by later features)
for (const k of ["people", "places", "events"]) put(k, "json", JSON.stringify(input.theographic[k]));

const version = crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex").slice(0, 12);
fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify({ version, schema: 1, built: new Date().toISOString(), files }, null, 1) + "\n",
);
const total = Object.values(files).reduce((a, f) => a + f.bytes, 0);
console.log(`wrote ${Object.keys(files).length} packs, ${(total / 1e6).toFixed(1)} MB, version ${version}`);
