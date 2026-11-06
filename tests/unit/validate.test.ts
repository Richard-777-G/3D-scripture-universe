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

  it("fails when the wheel's links stop matching OpenBible", () => {
    const x = clone();
    x.core.xrefs.vo[0] += 1;
    expect(validateAll(x).errors.join()).toMatch(/wheel links differ from OpenBible/);
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

  it("explains the cross-reference counts: 42,732 rows and 40,099 threads", () => {
    const X = input.core.xrefs, seen = new Set<string>();
    for (let i = 0; i < X.fv.length; i++) {
      const d = X.d[i];
      seen.add([d ? X.ts[i] : X.fv[i], d ? X.te[i] : X.fv[i], d ? X.fv[i] : X.ts[i], d ? X.fv[i] : X.te[i]].join("|"));
    }
    expect(X.fv.length).toBe(42732);
    expect(seen.size).toBe(40099);
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
});

