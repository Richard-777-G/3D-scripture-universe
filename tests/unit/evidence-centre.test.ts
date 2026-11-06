import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import zlib from "node:zlib";
import { loadEvidenceCentre, validateEvidenceCentre, parseRef } from "../../pipeline/evidence-centre.mjs";

const books = JSON.parse(zlib.gunzipSync(fs.readFileSync("data/raw/v16/core.json.gz")).toString()).books;
const evidence = JSON.parse(fs.readFileSync("content/evidence.json", "utf8"));
let ec: any;
const check = (mutate: (x: any) => void) => {
  const x = structuredClone(ec);
  mutate(x);
  return validateEvidenceCentre(x, { books, evidence }).errors.join("\n");
};

beforeAll(() => {
  ec = loadEvidenceCentre();
});

describe("Evidence Centre", () => {
  it("the draft batch passes every rule", () => {
    expect(validateEvidenceCentre(ec, { books, evidence }).errors).toEqual([]);
  });

  it("covers all six pillars and every v16 evidence card", () => {
    expect(ec.pillars.map((p: any) => p.id).sort()).toEqual(["archaeological", "geographical", "historical", "scientific", "spiritual", "theological"]);
    for (const e of evidence) expect(ec.existingMap[e.id], e.id).toBeTruthy();
  });

  it("starts every new item as an unreviewed draft", () => {
    for (const i of ec.items) {
      expect(i.status, i.id).toBe("draft");
      expect(i.reviewedBy, i.id).toBeNull();
    }
  });

  it("parses verse references the way editors write them", () => {
    expect(parseRef("John 3:16", books)).toEqual([26136, 26136]);
    expect(parseRef("2 Kings 18:13-16", books)![1] - parseRef("2 Kings 18:13-16", books)![0]).toBe(3);
    expect(parseRef("Genesis 1:31-2:3", books)).toEqual([30, 33]);
    expect(parseRef("John 3:37", books)).toBeNull();
    expect(parseRef("Jhn 3:16", books)).toBeNull();
  });

  it("rejects an item that does not say what it fails to show", () => {
    expect(check((x) => (x.items[0].limits = ""))).toMatch(/must say what the evidence does not show/);
  });

  it("rejects an item with fewer than two sources", () => {
    expect(check((x) => x.items[0].sources.pop())).toMatch(/at least 2 sources/);
  });

  it("rejects a link to a verse that does not exist", () => {
    expect(check((x) => x.items[0].verses.push("Malachi 5:1"))).toMatch(/does not exist/);
  });

  it("rejects a debated item that hides the debate", () => {
    expect(check((x) => {
      const i = x.items.find((y: any) => y.strength === "debated");
      i.limits = "The object is small and hard to read in photographs.";
    })).toMatch(/must say so/);
  });

  it("rejects publishing without a named reviewer", () => {
    expect(check((x) => (x.items[0].status = "published"))).toMatch(/named reviewer/);
  });

  it("only accepts YouTube links for videos", () => {
    expect(check((x) => (x.items[0].videos = [{ title: "t", channel: "c", url: "https://example.com/v" }]))).toMatch(/YouTube/);
  });
});
