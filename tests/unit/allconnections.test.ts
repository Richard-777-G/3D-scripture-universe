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
    const ob = [...xon, ...xin].filter((r) => r.l & LABEL.openbible);
    expect(input.openbible.from.length).toBe(344799);
    expect(ob.length).toBe(344799);
    expect(xon.filter((r) => r.l & LABEL.openbible).length).toBe(73313);
    expect(input.core.counts).toMatchObject({ all: xon.length + xin.length, openbible: 344799, otnt: xon.length, best: input.core.xrefs.fv.length });
  });

  it("adds the Treasury of Scripture Knowledge, with every link it lists", () => {
    const c = input.core.counts.tsk;
    expect(c.references).toBeGreaterThan(380000);
    expect(c.matchedOpenBible + c.newLinks).toBe(c.links);
    // John 3:16 in TSK lists Romans 5:8.
    const jn = ref(42, 3, 16), ro = ref(44, 5, 8);
    const rows = unpack(JSON.parse(input.assets.xin)).filter((r) => r.a === jn && r.s <= ro && r.e >= ro);
    expect(rows.some((r) => r.l & LABEL.tsk)).toBe(true);
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

  it("every link comes from OpenBible or TSK, and TSK-only links have no votes", () => {
    const rows = unpack(JSON.parse(input.assets.xin));
    expect(rows.every((r) => r.l & (LABEL.openbible | LABEL.tsk))).toBe(true);
    expect(rows.filter((r) => !(r.l & LABEL.openbible)).every((r) => r.v === 0 && r.l & LABEL.tsk)).toBe(true);
  });

  it("fails when a link claims wording the text does not have", () => {
    const x = clone();
    const p = JSON.parse(x.assets.xin);
    const i = p.l.findIndex((l: number) => l === LABEL.openbible && true);
    p.l[i] |= LABEL.wording;
    x.assets.xin = JSON.stringify(p);
    expect(validateAll(x).errors.join()).toMatch(/label the text does not support/);
  });

  it("fails when a link says TSK but TSK does not list it", () => {
    const x = clone();
    const p = JSON.parse(x.assets.xon);
    const i = p.l.findIndex((l: number, k: number) => k % 25 === 0 && !(l & LABEL.tsk));
    p.l[i] |= LABEL.tsk;
    x.assets.xon = JSON.stringify(p);
    expect(validateAll(x).errors.join()).toMatch(/TSK does not list them/);
  });

  it("fails when an OpenBible link is dropped", () => {
    const x = clone();
    const rows = unpack(JSON.parse(x.assets.xin));
    rows.splice(rows.findIndex((r) => r.l & LABEL.openbible), 1);
    const p = { f: [] as number[], t: [] as number[], n: [] as number[], v: [] as number[], l: [] as number[] };
    let prev = 0;
    for (const r of rows) { p.f.push(r.a - prev); prev = r.a; p.t.push(r.s - r.a); p.n.push(r.e - r.s); p.v.push(r.v); p.l.push(r.l); }
    x.assets.xin = JSON.stringify(p);
    expect(validateAll(x).errors.join()).toMatch(/links kept, OpenBible has/);
  });
});
