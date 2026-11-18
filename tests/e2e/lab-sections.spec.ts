import { test, expect, uni } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * The console (?ui=lab) must never take Richard's sections away. The five section tabs stay
 * visible at the bottom, and each opens its section exactly as it does in the normal app.
 * ?ui=lab is never remembered: the plain link always opens the normal app.
 */
async function openLab(page: Page) {
  await page.goto("./?ui=lab");
  await page.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot") && !!(window as any).SU_LAB, null, { timeout: 45_000 });
  await expect.poll(() => uni(page, (U) => U.intro)).toBeFalsy();
}

const TABS: { name: string; mode: string }[] = [
  { name: "Story", mode: "storyhome" },
  { name: "Explore", mode: "none" },
  { name: "Evidence", mode: "evidence" },
  { name: "Search", mode: "search" },
  { name: "Library", mode: "library" },
];

for (const vp of [{ name: "phone 390×664", width: 390, height: 664 }, { name: "desktop 1600×900", width: 1600, height: 900 }]) {
  test.describe(`sections in the console · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("all five section tabs are visible, on screen and clear of the console @phone", async ({ app }) => {
      await openLab(app);
      const tabs = app.locator("#tabs");
      await expect(tabs).toBeVisible();
      for (const t of TABS) await expect(tabs.getByRole("button", { name: t.name })).toBeVisible();
      const g = await app.evaluate(() => {
        const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return { tabs: r("#tabs"), lab: r("#lab"), vh: innerHeight, vw: innerWidth };
      });
      expect(g.tabs.bottom).toBeLessThanOrEqual(g.vh + 1);
      expect(g.tabs.left).toBeGreaterThanOrEqual(0);
      expect(g.tabs.right).toBeLessThanOrEqual(g.vw + 1);
      // The console ends where the tabs begin: nothing of it hides under them.
      expect(g.lab.bottom).toBeLessThanOrEqual(g.tabs.top + 1);
    });

    for (const t of TABS) {
      test(`${t.name} opens its section exactly as in the normal app @phone`, async ({ app }) => {
        await openLab(app);
        await app.locator("#tabs").getByRole("button", { name: t.name }).click();
        await expect.poll(() => uni(app, (U) => U.uiMode)).toBe(t.mode);
        // The console has stepped aside: the normal app and its wheel are back.
        await expect(app.locator("#lab")).toBeHidden();
        await expect.poll(() => app.evaluate(() => document.body.classList.contains("su-lab"))).toBe(false);
        await expect.poll(() => app.evaluate(() => !document.getElementById("stage")!.closest(".lab-view"))).toBe(true);
        await expect(app.locator("#gl")).toBeVisible();
        await expect(app.locator("#tabs").getByRole("button", { name: t.name })).toHaveAttribute("aria-pressed", "true");
        if (t.mode !== "none") {
          await expect(app.locator("#panel")).toBeVisible();
          await expect(app.locator("#pc")).not.toBeEmpty();
        }
      });
    }
  });
}

test("an older remembered console switch is cleared: the plain link opens the normal app with its tabs @phone", async ({ app }) => {
  await app.evaluate(() => localStorage.setItem("su-lab", "1"));
  await app.goto("./");
  await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
  await expect(app.locator("#lab")).toHaveCount(0);
  expect(await app.evaluate(() => localStorage.getItem("su-lab"))).toBeNull();
  for (const t of TABS) await expect(app.locator("#tabs").getByRole("button", { name: t.name })).toBeVisible();
});
