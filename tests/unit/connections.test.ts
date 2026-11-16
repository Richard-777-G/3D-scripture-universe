import { describe, it, expect, beforeAll } from "vitest";
import { loadInputs } from "../../pipeline/inputs.mjs";
import { parseRef } from "../../pipeline/evidence-centre.mjs";
import { judge, wordFrequency, stem, TIER, DISTINCTIVE_MAX_VERSES } from "../../pipeline/connections.mjs";

let input: any, df: Map<string, number>, texts: string[][];
const pair = (nt: string, ot: string) => judge(parseRef(ot, input.core.books)!, parseRef(nt, input.core.books)!, texts, df);
const shown = (nt: string, ot: string) => {
  const [o0, o1] = parseRef(ot, input.core.books)!, [n0, n1] = parseRef(nt, input.core.books)!, X = input.core.xrefs;
  for (let i = 0; i < X.fv.length; i++) if (X.fv[i] <= o1 && X.fe[i] >= o0 && X.ts[i] <= n1 && X.te[i] >= n0) return X.vo[i];
  return 0;
};

beforeAll(() => {
  input = loadInputs();
  texts = [input.texts.kjv, input.texts.bsb];
  df = wordFrequency(texts);
});

describe("connections come from textual evidence, not votes", () => {
  // Well-known New Testament quotations of the Old Testament (docs/NEXT_LEVEL_BRIEF.md, A1).
  for (const [nt, ot] of [
    ["Matthew 1:23", "Isaiah 7:14"],
    ["Matthew 2:6", "Micah 5:2"],
    ["Matthew 27:46", "Psalms 22:1"],
    ["Acts 8:32-33", "Isaiah 53:7-8"],
    ["Matthew 4:4", "Deuteronomy 8:3"],
    ["Romans 1:17", "Habakkuk 2:4"],
    ["Hebrews 1:5", "Psalms 2:7"],
  ]) {
    it(`${nt} quotes ${ot}`, () => {
      expect(pair(nt, ot).tier).toBe(TIER.quotation);
      expect(shown(nt, ot)).toBeGreaterThanOrEqual(TIER.quotation);
    });
  }

  it("John 19:36 and Exodus 12:46 share little English wording, so they show as a sourced prophecy link", () => {
    expect(pair("John 19:36", "Exodus 12:46").tier).toBeLessThan(TIER.quotation);
    expect(shown("John 19:36", "Exodus 12:46")).toBe(TIER.sourced);
  });

  it("common words alone never make a link", () => {
    expect(pair("Matthew 1:1", "Genesis 1:1").tier).toBe(0);
    expect(pair("John 3:16", "Genesis 22:2").tier).toBe(0);
    const w = pair("Revelation 7:12", "Psalms 41:13");
    expect(w.tier).not.toBe(TIER.quotation);
  });

  it("treats every form of a word as one word, and never cuts a word to a stub", () => {
    for (const w of ["praise", "praised", "praises", "praiseth", "praising"]) expect(stem(w)).toBe(stem("praise"));
    for (const w of ["bless", "blessed", "blesseth", "blessing"]) expect(stem(w)).toBe("bless");
    expect(stem("saviour")).toBe(stem("savior"));
    expect(stem("favour")).toBe(stem("favor"));
    expect(stem("sing")).toBe("sing");
    expect(stem("test")).toBe("test");
    expect(stem("priest")).toBe("priest");
  });

  it("words of worship that run through the whole Bible are never distinctive", () => {
    for (const w of ["god", "lord", "praise", "bless", "worship", "prayer", "grace", "thank", "joy", "glory", "holy", "faith", "love", "believe", "mercy", "peace", "rejoice", "show", "forever"]) {
      expect(df.get(stem(w)) || 0, w).toBeGreaterThan(DISTINCTIVE_MAX_VERSES);
    }
  });

  it("one word in two translations counts once (saviour / savior, brimstone / sulfur)", () => {
    const X = input.core.xrefs;
    for (let i = 0; i < X.fv.length; i++) {
      if (X.vo[i] !== TIER.wording) continue;
      const ws = X.mw[i].split(" ");
      expect(new Set(ws.map(stem)).size, X.mw[i]).toBeGreaterThanOrEqual(2);
      // Both words must be found together in one translation.
      const one = texts.some((T) => {
        const a = new Set(T.slice(X.fv[i], X.fe[i] + 1).join(" ").toLowerCase().match(/[a-z']+/g)!.map(stem));
        const b = new Set(T.slice(X.ts[i], X.te[i] + 1).join(" ").toLowerCase().match(/[a-z']+/g)!.map(stem));
        return ws.filter((w: string) => a.has(stem(w)) && b.has(stem(w))).length >= 2;
      });
      expect(one, X.mw[i]).toBe(true);
    }
  });

  it("every shared-wording link names at least two distinctive words", () => {
    const X = input.core.xrefs;
    for (let i = 0; i < X.fv.length; i++) if (X.vo[i] === TIER.wording) expect(X.mw[i].split(" ").length).toBeGreaterThanOrEqual(2);
  });

  it("drops links whose passages share no distinctive wording", () => {
    const s = input.core.aud.evidence;
    expect(s.unsupported).toBeGreaterThan(60000);
    expect(s.quotation + s.wording).toBeLessThan(6000);
  });
});
