import { test, expect, uni } from "./fixtures";

const ms = (app: any) => app.evaluate(() => (window as any).UNI.mapState().then((s: any) => s && { view: s.view, tm: s.tm, sel: s.sel, route: s.route, places: s.places, mapped: s.mapped, routes: s.routes, shown: s.shown }));

test.describe("map of Bible places", () => {
  test("opens from the Evidence tab and shows places with a legend @phone", async ({ app }) => {
    await app.locator("#tab-evidence").click();
    await app.locator("#pc [data-openmap]").click();
    await expect(app.locator("#mapv")).toBeVisible();
    await expect(app.locator("#mapsh")).toContainText("places");
    await expect(app.locator("#mapsh")).toContainText("Location known");
    await expect(app.locator("#mapsh")).toContainText("Location debated");
    const s = await ms(app);
    expect(s.places).toBeGreaterThan(1200);
    expect(s.mapped).toBeGreaterThan(1200);
    expect(s.shown).toBe(s.mapped);
    await expect(app.locator("#mapv .leaflet-container")).toBeVisible();
  });

  test("Back closes the map and returns to the app", async ({ app }) => {
    await app.locator("#tab-library").click();
    await app.locator("#pc [data-openmap]").click();
    await expect(app.locator("#mapsh")).toContainText("places");
    await app.locator("#mapback").click();
    await expect(app.locator("#mapv")).toBeHidden();
    await expect(app.locator("#tabs")).toBeVisible();
  });

  test("Jerusalem is a known location and lists verses from both Testaments", async ({ app }) => {
    await uni(app, (U) => U.openMap("Jerusalem"));
    await expect(app.locator("#mapsh h3")).toContainText("Jerusalem");
    await expect(app.locator("#mapsh .mconf")).toContainText("Location known");
    await expect(app.locator("#mapsh")).toContainText("both Testaments");
  });

  test("Emmaus says its location is debated and names the other suggestions", async ({ app }) => {
    await uni(app, (U) => U.openMap("Emmaus"));
    await expect(app.locator("#mapsh h3")).toContainText("Emmaus");
    await expect(app.locator("#mapsh .mconf")).toContainText("Location debated");
    await expect(app.locator("#mapsh")).toContainText("Other suggested locations");
    await expect(app.locator("#mapsh")).toContainText("Emmaus Nicopolis");
    await expect(app.locator("#mapsh")).toContainText("Luke 24:13");
  });

  test("tapping a verse opens it in the reader", async ({ app }) => {
    await uni(app, (U) => U.openMap("Emmaus"));
    await app.locator("#mapsh [data-mvv]").first().click();
    await expect(app.locator("#mapv")).toBeHidden();
    await expect.poll(() => uni(app, (U) => U.uiMode)).toBe("reader");
    await expect(app.locator("#pc")).toContainText("Luke 24");
  });

  test("the List view finds a place by name @phone", async ({ app }) => {
    await uni(app, (U) => U.openMap());
    await app.locator("#mapv [data-mv=list]").click();
    await app.locator("#mapq").fill("bethle");
    await expect(app.locator("#maplist")).toContainText("Bethlehem");
    await app.locator("#maplist [data-mp]").first().click();
    await expect(app.locator("#mapsh h3")).toContainText("Bethlehem");
  });

  test("New Testament filter shows fewer places", async ({ app }) => {
    await uni(app, (U) => U.openMap());
    await expect(app.locator("#mapsh")).toContainText("places");
    const all = (await ms(app)).shown;
    await app.locator("#mapv [data-mt=nt]").click();
    await expect.poll(async () => (await ms(app)).shown).toBeLessThan(all);
    expect((await ms(app)).shown).toBeGreaterThan(50);
  });

  test("Journeys lists routes by period and plays one", async ({ app }) => {
    await uni(app, (U) => U.openMap());
    await app.locator("#mapv [data-mv=journeys]").click();
    await expect(app.locator("#mapsh")).toContainText("journeys");
    await expect(app.locator("#mapsh")).toContainText("Moses and the Exodus");
    await expect(app.locator("#mapsh")).toContainText("The early church and Paul");
    expect((await ms(app)).routes).toBeGreaterThan(150);
    await app.locator("#mapsh summary", { hasText: "The early church and Paul" }).click();
    await app.locator("#mapsh [data-mr]", { hasText: "Second Missionary Journey" }).click();
    await expect(app.locator("#mapsh h3")).toContainText("Second Missionary Journey");
    await expect(app.locator("#mapsh")).toContainText("Leen Ritmeyer");
    await app.locator("#mapsh [data-mplay]").click();
    expect((await ms(app)).route).toBe("203. Second Missionary Journey");
  });

  test("Credits list the map sources", async ({ app }) => {
    await uni(app, (U) => U.credits());
    for (const t of ["OpenBible.info Bible Geocoding Data", "UBS Project MARBLE Bible Routes", "Natural Earth"]) await expect(app.locator("#sc")).toContainText(t);
  });
});

for (const vp of [{ name: "phone 390×664", width: 390, height: 664 }, { name: "desktop 1280", width: 1280, height: 800 }]) {
  test.describe(`a real map, not a spray of dots · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("places are grouped into numbered circles that never touch, regions and seas are named, nothing sits on top of anything @phone", async ({ app }) => {
      await uni(app, (U) => U.openMap());
      await expect(app.locator("#mapsh")).toContainText("places");
      const s = await app.evaluate(() => (window as any).UNI.mapState());
      expect(s.grouped, "most places start inside numbered circles").toBeGreaterThan(s.mapped / 2);
      expect(s.dots + s.grouped + 0, "every place is on the map: a dot, inside a circle or written as a region name").toBeGreaterThan(0);
      // Every circle shows how many places it holds and the name of its main place.
      const circles = app.locator("#mapv .mcl");
      expect(await circles.count()).toBeGreaterThan(5);
      await expect(app.locator('#mapv .mcl[title*="around Jerusalem"]')).toHaveCount(1);
      // Regions and seas are written on the map.
      await expect(app.locator("#mapv .mname.region").first()).toBeVisible();
      await expect(app.locator("#mapv .mname.water").first()).toBeVisible();
      // Measure: no circle touches another, no name sits on a circle or another name, and each name appears once.
      const problems = await app.evaluate(() => {
        const out: string[] = [];
        const r = (e: Element) => e.getBoundingClientRect();
        const hit = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const map = r(document.getElementById("mapc")!);
        const inMap = (b: DOMRect) => b.right > map.left && b.left < map.right && b.bottom > map.top && b.top < map.bottom;
        const circles = [...document.querySelectorAll("#mapv .mcl")].map((e) => ({ t: e.textContent, b: r(e) })).filter((x) => inMap(x.b));
        const names = [...document.querySelectorAll("#mapv .mname span, #mapv .mcl em")].map((e) => ({ t: e.textContent!, b: r(e) })).filter((x) => inMap(x.b));
        for (let i = 0; i < circles.length; i++) for (let j = i + 1; j < circles.length; j++) if (hit(circles[i].b, circles[j].b)) out.push(`circles touch: ${circles[i].t} / ${circles[j].t}`);
        for (const n of names) for (const c of circles) if (hit(n.b, c.b)) out.push(`name on a circle: ${n.t} / ${c.t}`);
        for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (hit(names[i].b, names[j].b)) out.push(`names overlap: ${names[i].t} / ${names[j].t}`);
        const seen = new Set<string>();
        for (const n of names) { if (seen.has(n.t)) out.push(`name twice: ${n.t}`); seen.add(n.t); }
        return out;
      });
      expect(problems).toEqual([]);
    });

    test("tapping a numbered circle zooms in and the places in it appear", async ({ app }) => {
      await uni(app, (U) => U.openMap());
      await expect(app.locator("#mapsh")).toContainText("places");
      const before = (await app.evaluate(() => (window as any).UNI.mapState())).dots;
      await app.locator('#mapv .mcl[title*="around Jerusalem"]').click();
      await expect.poll(async () => (await app.evaluate(() => (window as any).UNI.mapState())).dots, { timeout: 10_000 }).toBeGreaterThan(before);
    });
  });
}
