import { test, expect, uni, panelText } from "./fixtures";

test.describe("evidence", () => {
  test("the Evidence tab lists the historical evidence @phone", async ({ app }) => {
    await app.locator("#tab-evidence").click();
    await expect(app.locator("#pttl")).toHaveText("Historical evidence");
    const t = await panelText(app);
    expect(t).toContain("Real inscriptions, manuscripts, places and ancient writers");
    expect(t).not.toContain("went wrong");
  });

  test("there are 26 evidence items, each with sources", async ({ app }) => {
    const r = await uni(app, (U) => ({ n: U.EVD.length, noSrc: U.EVD.filter((e: any) => !e.src.length).length }));
    expect(r.n).toBe(26);
    expect(r.noSrc).toBe(0);
  });

  test("opening an evidence item shows what it is, what it shows and its limits", async ({ app }) => {
    await app.locator("#tab-evidence").click();
    await app.locator("#pc").getByText("Israel named in Egypt", { exact: false }).first().click();
    const t = await panelText(app);
    expect(t).toContain("Merneptah");
    expect(t).not.toContain("went wrong");
  });

  test("every evidence item opens without an error", async ({ app }) => {
    await app.locator("#tab-evidence").click();
    const ids = await app.$$eval("#pc button.evc[data-ev]", (b) => b.map((x) => (x as HTMLElement).dataset.ev).filter((x) => x && x !== "undefined"));
    expect(new Set(ids).size).toBe(26);
    for (const id of ids) {
      await app.locator("#tab-evidence").click();
      await app.locator(`#pc button.evc[data-ev="${id}"]`).first().click();
      await expect(app.locator("#pc"), `item ${id}`).not.toContainText("went wrong");
    }
  });
});

test.describe("search", () => {
  async function search(app: any, q: string) {
    await app.locator("#tab-search").click();
    const box = app.locator("#qin");
    await box.fill(q);
    await box.press("Enter");
  }

  test("shows example searches before typing", async ({ app }) => {
    await app.locator("#tab-search").click();
    await expect(app.locator("#pc")).toContainText("Alpha and Omega");
  });

  test("finds 'lamb of God' in John 1 @phone", async ({ app }) => {
    await search(app, "lamb of God");
    await expect(app.locator("#pc")).toContainText("John 1:29");
  });

  test("finds Matthew 1:23 and Luke 1:27 for 'virgin'", async ({ app }) => {
    await search(app, "virgin");
    await expect.poll(() => uni(app, (U) => U.lastHits.length)).toBeGreaterThan(0);
    await expect(app.locator("#pc")).toContainText("Matthew 1:23");
    await expect(app.locator("#pc")).toContainText("Luke 1:27");
  });

  test("a theme search finds the sourced journeys", async ({ app }) => {
    await search(app, "pierced");
    await expect.poll(() => uni(app, (U) => U.lastHits.filter((h: any) => h.d.k === "j").length)).toBeGreaterThan(0);
    await expect(app.locator("#pc")).toContainText("Zechariah 12:10");
  });

  test("a reference like John 3:16 is understood", async ({ app }) => {
    const r = await uni(app, (U) => U.refQuery("John 3:16"));
    expect(r).toBeTruthy();
    await search(app, "John 3:16");
    await app.locator("#pc").getByText("Go to John 3:16").click();
    // v16 behaviour: opens the book of John with chapter 3 selected in the 3D view.
    await expect.poll(() => uni(app, (U) => U.sel)).toBe(42);
    const g = await uni(app, (U) => U.chs.findIndex((c: any) => c.b === 42 && c.c === 3));
    await expect.poll(() => uni(app, (U) => U.selChap)).toBe(g);
  });

  test("book names and short forms work (gen 1:1, Psalm 22, 1 cor 15)", async ({ app }) => {
    for (const q of ["gen 1:1", "Psalm 22", "1 cor 15", "song of songs 2"]) {
      expect(await app.evaluate((q) => (window as any).UNI.refQuery(q), q), q).toBeTruthy();
    }
  });

  test("a search with no matches says so instead of failing", async ({ app }) => {
    await search(app, "zzzxqqv");
    await expect(app.locator("#pc")).not.toContainText("went wrong");
  });
});
