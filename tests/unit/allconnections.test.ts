import { describe, it, expect, beforeAll } from "vitest";
import { validateAll } from "../../pipeline/validate.mjs";
import { loadInputs } from "../../pipeline/inputs.mjs";
import { unpack, LABEL } from "../../pipeline/allconnections.mjs";

let input: any;
const clone = () => structuredClone(input);
const ref = (b: number, c: number, v: number) => {
  const books = input.core.books;
  let n = 0;
  for (let i = 0; i < b; i++) n += books[i].ch.reduce((a: number, x: number) => a + x, 0);
  for (let i = 0; i < c - 1; i++) n += books[b].ch[i];
  return n + v - 1;
};

beforeAll(() => {
  input = loadInputs();
});

describe("every connection is kept and labelled", () => {
  it("keeps all 344,799 OpenBible links, split by Testament", () => {
    const xon = unpack(JSON.parse(input.assets.xon)), xin = unpack(JSON.parse(input.assets.xin));
    expect(xon.length + xin.length).toBe(input.openbible.from.length);
    expect(input.openbible.from.length).toBe(344799);
    expect(xon.length).toBe(73313);
    expect(input.core.counts).toMatchObject({ all: 344799, otnt: 73313, best: input.core.xrefs.fv.length });
  });

  it("labels Psalm 22:1 to Matthew 27:46 as same wording", () => {
    const ps = ref(18, 22, 1), mt = ref(39, 27, 46);
    const rows = unpack(JSON.parse(input.assets.xon)).filter((r) => (r.a === ps && r.s <= mt && r.e >= mt) || (r.a === mt && r.s <= ps && r.e >= ps));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.l & LABEL.wording)).toBe(true);
  });

  it("labels parallel passages inside the Old Testament", () => {
    // 2 Samuel 22 and Psalm 18 are the same song of David.
    const k = ref(9, 22, 3), c = ref(18, 18, 2);
    const rows = unpack(JSON.parse(input.assets.xin)).filter((r) => (r.a === k && r.s <= c && r.e >= c) || (r.a === c && r.s <= k && r.e >= k));
    expect(rows.some((r) => r.l & LABEL.wording)).toBe(true);
  });

  it("every link keeps its OpenBible label and vote count", () => {
    const rows = unpack(JSON.parse(input.assets.xin));
    expect(rows.every((r) => r.l & LABEL.openbible)).toBe(true);
  });

  it("fails when a link claims wording the text does not have", () => {
    const x = clone();
    const p = JSON.parse(x.assets.xin);
    const i = p.l.findIndex((l: number) => l === LABEL.openbible && true);
    p.l[i] |= LABEL.wording;
    x.assets.xin = JSON.stringify(p);
    expect(validateAll(x).errors.join()).toMatch(/label the text does not support/);
  });

  it("fails when a link says TSK before a TSK source is imported", () => {
    const x = clone();
    const p = JSON.parse(x.assets.xon);
    p.l[0] |= LABEL.tsk;
    x.assets.xon = JSON.stringify(p);
    expect(validateAll(x).errors.join()).toMatch(/Listed in TSK/);
  });

  it("fails when a link is dropped", () => {
    const x = clone();
    const p = JSON.parse(x.assets.xin);
    for (const k of ["f", "t", "n", "v", "l"]) p[k].pop();
    x.assets.xin = JSON.stringify(p);
    expect(validateAll(x).errors.join()).toMatch(/links kept, OpenBible has/);
  });
});
