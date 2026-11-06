import { test, expect, uni, panelText } from "./fixtures";

test.describe("explore the wheel", () => {
  test("Explore explains the two rings and the threads", async ({ app }) => {
    await app.locator("#tab-explore").click();
    await expect(app.locator("#pttl")).toHaveText("Explore");
    const t = await panelText(app);
    expect(t).toContain("Lower ring: the 39 Old Testament books");
    expect(t).toContain("Upper ring: the 27 New Testament books");
  });

  test("selecting a book shows its details and its link count", async ({ app }) => {
    await uni(app, (U) => U.select(22)); // Isaiah
    expect(await uni(app, (U) => U.sel)).toBe(22);
    const t = await panelText(app);
    expect(t).toContain("Isaiah");
    expect(t).not.toContain("went wrong");
    expect(await uni(app, (U) => U.cntBook(22))).toBeGreaterThan(0);
  });

  test("every one of the 66 books opens without an error", async ({ app }) => {
    for (let b = 0; b < 66; b++) {
      await app.evaluate((b) => { const U = (window as any).UNI; U.clearSel(); U.select(b); }, b);
      const t = await panelText(app);
      expect(t, `book ${b}`).not.toContain("went wrong");
    }
  });

  test("tapping a book on the canvas selects it", async ({ app }) => {
    await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
    // The wheel slowly turns, so re-measure the book's position on each attempt.
    await expect(async () => {
      const pt = await uni(app, (U) => U.screenOf(42));
      await app.mouse.click(pt.x, pt.y);
      expect(await uni(app, (U) => U.sel)).not.toBeNull();
    }).toPass({ timeout: 20_000 });
  });

  test("Surprise me picks a connection", async ({ app }) => {
    await app.locator("#tab-explore").click();
    await app.locator("#pc").getByRole("button", { name: "Surprise me" }).click();
    await expect(app.locator("#pc")).not.toContainText("went wrong");
  });

  test("the vote threshold changes how many threads are counted", async ({ app }) => {
    const n = await uni(app, (U) => Array.from(U.M() as Float32Array).reduce((a, b) => a + b, 0));
    expect(n).toBeGreaterThan(1000);
  });

  test("journey groups list their sourced prophecy links", async ({ app }) => {
    const groups = await uni(app, (U) => U.J.meta.map((m: any) => m.id));
    expect(groups).toContain("first");
    expect(groups).toContain("story");
    for (const g of groups) {
      await app.evaluate((g) => (window as any).UNI.openJourney(g), g);
      await expect(app.locator("#pc")).not.toContainText("went wrong");
    }
  });

  test("each journey link cites at least one verse on each side", async ({ app }) => {
    const bad = await uni(app, (U) => U.J.items.filter((it: any) => !it.ot.length || !it.nt.length).map((it: any) => it.id));
    expect(bad).toEqual([]);
  });

  test("a chapter can be selected to show its own threads", async ({ app }) => {
    await uni(app, (U) => U.select(22));
    const g = await uni(app, (U) => U.chs.findIndex((c: any) => c.b === 22 && c.c === 53));
    await app.evaluate((g) => (window as any).UNI.selectChapter(g), g);
    expect(await uni(app, (U) => U.selChap)).toBe(g);
  });
});
