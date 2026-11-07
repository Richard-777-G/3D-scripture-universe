import { describe, it, expect, beforeAll } from "vitest";
import { validateAll } from "../../pipeline/validate.mjs";
import { loadInputs } from "../../pipeline/inputs.mjs";
import { routeTitle, clipRing, band } from "../../pipeline/geo.mjs";

let input: any;
const clone = () => structuredClone(input);
const place = (x: any, n: string) => x.geo.places.find((p: any) => p.n === n && p.v.length > 5) || x.geo.places.find((p: any) => p.n === n);

beforeAll(() => {
  input = loadInputs();
});

describe("map data", () => {
  it("places come with the source's confidence", () => {
    const j = place(input, "Jerusalem");
    expect(j.b).toBe("known");
    expect(j.s).toBe(1000);
    const e = place(input, "Emmaus");
    expect(e.b).toBe("debated");
    expect(e.alt.map((a: any) => a.d)).toContain("Emmaus Nicopolis");
  });

  it("place verses point at the verses that name the place", () => {
    const e = place(input, "Emmaus");
    const kjv = input.kjv as string[];
    expect(e.v.length).toBe(3);
    for (const v of e.v) expect(kjv[v]).toMatch(/Emmaus|village|them/i);
    expect(kjv[e.v[0]]).toContain("Emmaus");
  });

  it("every place in the pack is named in the Bible", () => {
    expect(input.geo.places.every((p: any) => p.v.length > 0)).toBe(true);
    expect(input.geo.places.length).toBeGreaterThan(1200);
  });

  it("fails when a place shows more confidence than the source gives", () => {
    const x = clone();
    place(x, "Emmaus").b = "known";
    expect(validateAll(x).errors.join()).toMatch(/confidence the source does not give/);
  });

  it("fails when a place points at a verse that does not exist", () => {
    const x = clone();
    place(x, "Emmaus").v.push(99999);
    expect(validateAll(x).errors.join()).toMatch(/not real verses/);
  });

  it("fails when a route leaves the Bible world", () => {
    const x = clone();
    x.geo.routes[0].c[0][0] = [-40, 120];
    expect(validateAll(x).errors.join()).toMatch(/route points sit outside/);
  });

  it("routes are grouped by period with readable titles", () => {
    const names = input.geo.routes.map((r: any) => r.n);
    expect(names).toContain("Second Missionary Journey");
    expect(names).toContain("Genesis 22: Gerar to Moriah");
    expect(new Set(names).size).toBe(names.length);
    expect(routeTitle("ubs-bible-routes/GeoJsonRoutes/083. Michmash battle_1.geojson").title).toBe("Michmash battle (part 1)");
    expect(input.geo.routes.find((r: any) => r.n === "Exodus Route1").era).toBe("Moses and the Exodus");
  });

  it("bands follow OpenBible's scale out of 1000", () => {
    expect([band(1000), band(800), band(799), band(500), band(499)]).toEqual(["known", "known", "likely", "likely", "debated"]);
  });

  it("clips land to the Bible world", () => {
    const r = clipRing([[0, 0], [100, 0], [100, 60], [0, 60]]);
    for (const [x, y] of r) { expect(x).toBeLessThanOrEqual(62); expect(y).toBeLessThanOrEqual(47); }
  });
});
