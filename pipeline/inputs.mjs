/**
 * Everything the pipeline reads, in one place: the v16 snapshot, curated
 * content, the licence register, and the pinned upstream sources normalised
 * to the app's verse numbering.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadBsb, loadOpenBible, loadTheographic, loadTeluguIrv } from "./normalize.mjs";
import { loadEvidenceCentre } from "./evidence-centre.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const raw = (rel) => zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "data/raw/v16", rel))).toString("utf8");
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

export function loadInputs() {
  const core = JSON.parse(raw("core.json.gz"));
  const assetMap = json("data/raw/v16/assets.json");
  const assets = Object.fromEntries(Object.entries(assetMap).map(([k, rel]) => [k, raw(rel)]));

  const bsb = loadBsb(core.books);
  const openbible = loadOpenBible(core.books);
  const theographic = loadTheographic(core.books);
  const irv = loadTeluguIrv(core.books);
  assets.v_bsb = bsb.data.join("\n");
  assets.v_irv = irv.data.join("\n");

  return {
    core,
    kjv: raw("kjv.txt.gz").split("\n"),
    journeys: json("content/journeys.json"),
    story: json("content/story.json"),
    evidence: json("content/evidence.json"),
    qa: json("content/qa.json"),
    sources: json("data/sources.json"),
    evidenceCentre: loadEvidenceCentre(),
    assets,
    openbible: openbible.data,
    theographic: theographic.data,
    importErrors: [...bsb.errors, ...irv.errors, ...openbible.errors, ...theographic.errors],
  };
}
