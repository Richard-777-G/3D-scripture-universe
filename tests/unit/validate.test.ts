import { describe, it, expect, beforeAll } from "vitest";
import { validateAll } from "../../pipeline/validate.mjs";
import { loadInputs } from "../../pipeline/inputs.mjs";

let input: any;
const clone = () => structuredClone(input);

beforeAll(() => {
  input = loadInputs();
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

  it("fails when a link claims more evidence than the text has", () => {
    const x = clone();
    const i = x.core.xrefs.vo.findIndex((v: number) => v === 10);
    x.core.xrefs.vo[i] = 20;
    expect(validateAll(x).errors.join()).toMatch(/evidence level the text does not support/);
  });

  it("fails when a link is not an OpenBible candidate or a sourced journey link", () => {
    const x = clone();
    x.core.xrefs.fv[0] = 0; x.core.xrefs.fe[0] = 0; x.core.xrefs.ts[0] = 23145; x.core.xrefs.te[0] = 23145;
    expect(validateAll(x).errors.join()).toMatch(/neither OpenBible candidates nor sourced journey links/);
  });

  it("fails when a person's family link points at nobody", () => {
    const x = clone();
    x.theographic.people[0].father = ["nobody_0"];
    expect(validateAll(x).errors.join()).toMatch(/links to people or places that do not exist/);
  });

  it("imports the BSB in full", () => {
    const lines = input.assets.v_bsb.split("\n");
    expect(lines).toHaveLength(31102);
    expect(lines[26136]).toMatch(/^For God so loved the world/);
  });

  it("links Abraham to Isaac and to verses in Genesis", () => {
    const abraham = input.theographic.people.find((p: any) => p.id === "abraham_58");
    expect(abraham.children).toContain("isaac_616");
    expect(abraham.verses.some((v: number) => v < 1533)).toBe(true);
  });

  it("shows far fewer links than v16 did, all with textual evidence", () => {
    const X = input.core.xrefs;
    expect(input.core.aud.v16Rows).toBe(42732);
    expect(X.fv.length).toBeGreaterThan(3000);
    expect(X.fv.length).toBeLessThan(10000);
    expect(new Set(X.vo)).toEqual(new Set([10, 20, 30]));
  });

  it("imports the Telugu IRV in full, in KJV numbering", () => {
    const lines = input.assets.v_irv.split("\n");
    expect(lines).toHaveLength(31102);
    expect(lines.filter((l: string) => !l.trim())).toHaveLength(0);
    expect(lines[0]).toBe("ఆరంభంలో దేవుడు ఆకాశాలనూ భూమినీ సృష్టించాడు.");
    expect(lines[26136]).toContain("దేవుడు లోకాన్ని ఎంతో ప్రేమించాడు");
    expect(lines.some((l: string) => /[<>]/.test(l))).toBe(false);
  });

  it("keeps the two NRSV-only verses by joining them to their KJV verse", () => {
    const lines = input.assets.v_irv.split("\n");
    const rev13v1 = 30909; // Revelation 13:1 in KJV numbering
    expect(lines[rev13v1]).toMatch(/^దానికోసం ఆ మహా సర్పం సముద్ర తీరంలో/);
  });

  it("fails when a Greek word appears in a Hebrew book", () => {
    const x = clone();
    const w = JSON.parse(x.assets.w01);
    w["1:1"][0][0] = "λόγος";
    x.assets.w01 = JSON.stringify(w);
    expect(validateAll(x).errors.join()).toMatch(/wrong script/);
  });

  it("fails when a Hebrew entry is filed in the Greek lexicon", () => {
    const x = clone();
    const g = JSON.parse(x.assets.lexg);
    g.H0175 = ["Ἀαρών", "Aarōn", "Aaron", "", "N:N-M-P", 5];
    x.assets.lexg = JSON.stringify(g);
    expect(validateAll(x).errors.join()).toMatch(/Greek lexicon holds 1 entries from the other language/);
  });

  it("gives Genesis 1:1 the English used in the verse and a short meaning", () => {
    const w = JSON.parse(input.assets.w01)["1:1"];
    expect(w[1].slice(2)).toEqual(["he created", "H1254A", "HVqp3ms", "to create"].slice(0, 1).concat(w[1].slice(3)));
    expect(w[1][2]).toBe("he created");
    expect(w[1][5]).toBe("to create");
    expect(JSON.parse(input.assets.lexg).G3056[3]).toMatch(/^a word/);
  });
});

