import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import zlib from "node:zlib";
import { validateAll } from "../../pipeline/validate.mjs";

const raw = (rel: string) => zlib.gunzipSync(fs.readFileSync("data/raw/v16/" + rel)).toString("utf8");
const json = (rel: string) => JSON.parse(fs.readFileSync(rel, "utf8"));
let input: any;
const clone = () => structuredClone(input);

beforeAll(() => {
  const assetMap = json("data/raw/v16/assets.json");
  input = {
    core: JSON.parse(raw("core.json.gz")),
    kjv: raw("kjv.txt.gz").split("\n"),
    journeys: json("content/journeys.json"),
    story: json("content/story.json"),
    evidence: json("content/evidence.json"),
    qa: json("content/qa.json"),
    sources: json("data/sources.json"),
    assets: Object.fromEntries(Object.entries(assetMap).map(([k, rel]) => [k, raw(rel as string)])),
  };
});

describe("data validation", () => {
  it("passes on the shipped data", () => {
    expect(validateAll(input).errors).toEqual([]);
  });

  it("fails when a version is missing verses", () => {
    const x = clone();
    x.assets.v_asv = x.assets.v_asv.split("\n").slice(0, -5).join("\n");
    expect(validateAll(x).errors.join()).toMatch(/v_asv: 31097 verses/);
  });

  it("fails when a cross-reference points past the end of the Bible", () => {
    const x = clone();
    x.core.xrefs.te[10] = 40000;
    expect(validateAll(x).errors.join()).toMatch(/xref row 10/);
  });

  it("fails when a story step links to a journey that does not exist", () => {
    const x = clone();
    x.story[0].id = "nope";
    expect(validateAll(x).errors.join()).toMatch(/story step nope has no journey/);
  });

  it("fails when evidence has no sources", () => {
    const x = clone();
    x.evidence[0].src = [];
    expect(validateAll(x).errors.join()).toMatch(/has no sources/);
  });

  it("fails when a pack has no licence", () => {
    const x = clone();
    x.sources.datasets = x.sources.datasets.filter((d: any) => d.id !== "telugu-ov");
    expect(validateAll(x).errors.join()).toMatch(/pack v_tel has no licence/);
  });

  it("fails when Telugu text is missing", () => {
    const x = clone();
    delete x.assets.v_tel;
    expect(validateAll(x).errors.join()).toMatch(/Telugu/);
  });
});
