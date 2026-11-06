import { describe, it, expect } from "vitest";
import fs from "node:fs";
import zlib from "node:zlib";
import { VerseIndex, verseKey, parseVerseKey, TOTAL_VERSES } from "../../src/data/verse";

const core = JSON.parse(zlib.gunzipSync(fs.readFileSync("data/raw/v16/core.json.gz")).toString());
const idx = new VerseIndex(core.books);

describe("verse keys", () => {
  it("John 3:16 is 43003016, as in the handover", () => {
    expect(verseKey({ book: 43, chapter: 3, verse: 16 })).toBe(43003016);
    expect(parseVerseKey(43003016)).toEqual({ book: 43, chapter: 3, verse: 16 });
  });

  it("maps the first and last verse of the Bible", () => {
    expect(idx.key(0)).toBe(1001001);
    expect(idx.label(0)).toBe("Genesis 1:1");
    expect(idx.label(TOTAL_VERSES - 1)).toBe("Revelation 22:21");
    expect(idx.key(TOTAL_VERSES - 1)).toBe(66022021);
  });

  it("round-trips every verse", () => {
    for (let v = 0; v < TOTAL_VERSES; v++) expect(idx.fromKey(idx.key(v))).toBe(v);
  });

  it("matches the v16 index for John 3:16", () => {
    const v = idx.index({ book: 43, chapter: 3, verse: 16 })!;
    const kjv = zlib.gunzipSync(fs.readFileSync("data/raw/v16/kjv.txt.gz")).toString().split("\n");
    expect(kjv[v]).toMatch(/^For God so loved the world/);
  });

  it("rejects verses that do not exist", () => {
    expect(idx.index({ book: 43, chapter: 3, verse: 37 })).toBeNull();
    expect(idx.index({ book: 67, chapter: 1, verse: 1 })).toBeNull();
    expect(idx.fromKey(1001000)).toBeNull();
    expect(() => idx.ref(TOTAL_VERSES)).toThrow(RangeError);
  });
});
