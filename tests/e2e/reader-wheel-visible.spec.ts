import { test, expect, uni } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Bug fix (Richard, 17 Nov): on a phone, opening a chapter pushed the 3D wheel off screen,
 * leaving only floating book labels, and the reader opened as a white sheet over dark space.
 * The wheel must stay visible above the reader, and the reader follows the app's theme (Night).
 *
 * "Visible" is measured, not assumed: the chosen book is drawn inside the space above the
 * sheet, most of the 66 books project inside that space, and the canvas there is not blank.
 */

async function wheelInView(page: Page) {
  return page.evaluate(() => {
    const U = (window as any).UNI;
    const s = document.getElementById("stage")!.getBoundingClientRect();
    const rp = document.getElementById("rp")!.getBoundingClientRect();
    const top = s.top, bottom = Math.min(s.bottom, rp.top);
    const inside = (p: { x: number; y: number; z: number }) => p && p.z < 1 && p.x >= s.left + 4 && p.x <= s.right - 4 && p.y >= top + 4 && p.y <= bottom - 4;
    let n = 0;
    for (let i = 0; i < U.books.length; i++) if (inside(U.screenOf(i))) n++;
    return { share: n / U.books.length, selected: inside(U.screenOf(U.sel)), stageHeight: Math.round(bottom - top) };
  });
}

/** Share of lit pixels in the visible part of the canvas (a blank wheel area is near 0). */
async function litShare(page: Page) {
  const png = (await page.locator("#stage").screenshot()).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 150) lit++;
    return lit / (d.length / 16);
  }, png);
}

for (const vp of [
  { name: "phone 360×640", width: 360, height: 640 },
  { name: "phone 390×664 (iPhone with browser bars)", width: 390, height: 664 },
  { name: "phone 390×844", width: 390, height: 844 },
  { name: "phone 412×780", width: 412, height: 780 },
]) {
  test.describe(`wheel stays visible with the reader open · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: "light" });

    test("tap Mark, chapter 1, Read: the wheel is still drawn above the sheet, at both sheet sizes @phone", async ({ app }, info) => {
      await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
      // The path a person takes: pick the book, pick the chapter, tap Read.
      await uni(app, (U) => U.select(40));
      await app.locator("#pc").getByRole("button", { name: /^Chapter 1, / }).click();
      await app.locator("#pc").getByRole("button", { name: "Read Mark 1" }).click();
      await expect(app.locator("#rp-title")).toHaveText("Mark 1");
      // The reader follows the app's theme: Night, even when the phone is set to light.
      await expect.soft(app.locator("#rp")).not.toHaveClass(/su-light/);

      await expect.soft.poll(async () => (await wheelInView(app)).selected, { message: "the chosen book is on screen above the sheet", timeout: 10_000 }).toBe(true);
      await expect.soft.poll(async () => (await wheelInView(app)).share, { message: "most of the wheel is on screen above the sheet", timeout: 10_000 }).toBeGreaterThanOrEqual(0.8);
      expect.soft(await litShare(app), "the wheel is drawn, not blank").toBeGreaterThan(0.02);
      await app.screenshot({ path: info.outputPath("reader-half.png") });

      // The bigger sheet still leaves the wheel in view.
      await app.locator("#rp").getByRole("button", { name: "Make the reader bigger" }).click();
      const v = await wheelInView(app);
      expect.soft(v.stageHeight, "room for the wheel above the bigger sheet").toBeGreaterThanOrEqual(160);
      await expect.poll(async () => (await wheelInView(app)).selected, { timeout: 10_000 }).toBe(true);
      await expect.poll(async () => (await wheelInView(app)).share, { timeout: 10_000 }).toBeGreaterThanOrEqual(0.8);
      await app.screenshot({ path: info.outputPath("reader-full.png") });
    });
  });
}

test.describe("reader theme", () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "light" });

  test("settings saved before Night became the default open in Night; a Light chosen in Aa is kept", async ({ app }) => {
    await app.evaluate(() => localStorage.setItem("su-reader-prefs", JSON.stringify({ theme: "auto", size: 1.12, version: "kjv" })));
    await app.reload();
    await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
    await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
    await uni(app, (U) => U.openReader(42, 3));
    await expect(app.locator("#rp")).toBeVisible();
    await expect(app.locator("#rp")).not.toHaveClass(/su-light/);
    // The text size they chose is kept.
    expect(await app.locator("#rp").evaluate((e) => (e as HTMLElement).style.getPropertyValue("--size"))).toBe("1.12");
    // Choosing Light in Aa sticks.
    await app.locator("#rp").getByRole("button", { name: "Text and display" }).click();
    await app.getByRole("dialog", { name: "Text and display" }).getByRole("radio", { name: "Light" }).click();
    await expect(app.locator("#rp")).toHaveClass(/su-light/);
    await app.reload();
    await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
    await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
    await uni(app, (U) => U.openReader(42, 3));
    await expect(app.locator("#rp")).toHaveClass(/su-light/);
  });
});
