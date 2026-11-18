import { test, expect, uni } from "./fixtures";

/**
 * Daily use: carry on where I stopped. A first-time visitor sees "Start the story here"; after
 * reading a chapter, the first screen offers "Continue reading · <chapter>" and one tap opens it.
 */
for (const vp of [{ name: "phone 390×664", width: 390, height: 664 }, { name: "desktop 1600×900", width: 1600, height: 900 }]) {
  test.describe(`continue reading · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("after reading Psalm 23, the first screen opens it again in one tap @phone", async ({ app }) => {
      // First visit: the story invitation, no Continue button.
      await expect(app.locator("#cta")).toBeVisible();
      await expect(app.getByRole("button", { name: /Continue reading/ })).toBeHidden();

      await uni(app, (U) => U.openReader(18, 23));
      await expect(app.locator("#rp-title")).toContainText("Psalms 23");

      // Come back later: the first screen offers the chapter.
      await app.reload();
      await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
      const cont = app.getByRole("button", { name: "Continue reading Psalms 23" });
      await expect(cont).toBeVisible();
      await expect(app.locator("#cta")).toBeHidden();
      // Fully on screen, above the tabs.
      const r = await cont.boundingBox(), tabs = await app.locator("#tabs").boundingBox();
      expect(r!.x).toBeGreaterThanOrEqual(0);
      expect(r!.x + r!.width).toBeLessThanOrEqual(vp.width);
      expect(r!.y + r!.height).toBeLessThanOrEqual(tabs!.y);

      await cont.click();
      await expect(app.locator("#rp-title")).toContainText("Psalms 23");
      await expect(cont).toBeHidden();
    });
  });
}

test("a damaged saved place is ignored, not shown @phone", async ({ app }) => {
  await app.evaluate(() => localStorage.setItem("su-last", '{"b":99,"c":1}'));
  await app.reload();
  await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
  await expect(app.getByRole("button", { name: /Continue reading/ })).toBeHidden();
  await expect(app.locator("#cta")).toBeVisible();
});
