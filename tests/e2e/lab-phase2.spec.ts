import { test, expect, uni } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Section V console, Phase 2 (?ui=lab): Exploded and X-ray views, the section dial and the
 * schematic. The buttons drive the real wheel, and every number still comes from the data.
 */
async function openLab(page: Page) {
  await page.goto("./?ui=lab");
  await page.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot") && !!(window as any).SU_LAB, null, { timeout: 45_000 });
  await expect.poll(() => uni(page, (U) => U.intro)).toBeFalsy();
}

/** Best-evidence threads with one end in books from..to, counted straight from the data pack. */
const countFromPack = (page: Page, from: number, to: number) =>
  page.evaluate(
    async ([from, to]) => {
      const m = await (await fetch("data/manifest.json")).json();
      const core = await (await fetch("data/" + m.files.core.file)).json();
      let start = 0;
      const starts: number[] = [];
      for (const b of core.books) { starts.push(start); start += b.ch.reduce((x: number, y: number) => x + y, 0); }
      const bookOf = (v: number) => { let k = 0; while (k + 1 < starts.length && starts[k + 1] <= v) k++; return k; };
      const inSec = (b: number) => b >= from && b <= to;
      let n = 0;
      for (let i = 0; i < core.xrefs.fv.length; i++) if (inSec(bookOf(core.xrefs.fv[i])) || inSec(bookOf(core.xrefs.ts[i]))) n++;
      return n;
    },
    [from, to],
  );

for (const vp of [{ name: "desktop 1600", width: 1600, height: 900 }, { name: "phone 390×664", width: 390, height: 664 }]) {
  test.describe(`console phase 2 · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("Exploded and X-ray drive the real wheel, and the opened wheel stays in its window @phone", async ({ app }) => {
      await openLab(app);
      const exploded = app.getByRole("button", { name: "Exploded" });
      const xray = app.getByRole("button", { name: "X-ray" });
      await expect(exploded).toHaveAttribute("aria-pressed", "false");
      await exploded.click();
      await expect(exploded).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => uni(app, (U) => U.exploded), { timeout: 5000 }).toBe(1);
      await xray.click();
      await expect.poll(() => uni(app, (U) => U.xrayOn)).toBe(true);
      // Let the idle wheel settle to its new fill distance: every book inside the window.
      await app.waitForTimeout(3000);
      const inside = await app.evaluate(() => {
        const U = (window as any).UNI;
        const w = document.querySelector(".lab-stage")!.getBoundingClientRect(), st = document.getElementById("stage")!.getBoundingClientRect();
        return U.books.every((_: unknown, i: number) => {
          const p = U.screenOf(i);
          if (!p || p.z >= 1) return true;
          const x = p.x + st.left, y = p.y + st.top;
          return x >= w.left && x <= w.right && y >= w.top && y <= w.bottom;
        });
      });
      expect(inside, "no book of the opened wheel is cut off").toBe(true);
      await exploded.click();
      await xray.click();
      await expect.poll(() => uni(app, (U) => U.exploded), { timeout: 5000 }).toBe(0);
      await expect.poll(() => uni(app, (U) => U.xrayOn)).toBe(false);
    });

    test("the section dial chooses a section, turns the wheel and counts from the data @phone", async ({ app }) => {
      await openLab(app);
      await expect(app.locator(".lab-dial-out")).toHaveText("Turn to choose");
      const th0 = await uni(app, (U) => U.view.th);
      await app.getByRole("button", { name: "Next section" }).click();
      await expect(app.locator(".lab-dial-out")).toHaveText("Law");
      const law = await countFromPack(app, 0, 4);
      await expect(app.locator(".lab-para h2")).toHaveText("How does the Law point to Jesus?");
      await expect(app.locator(".lab-para")).toContainText(`${law.toLocaleString("en-US")} best-evidence threads`);
      await expect(app.locator(".lab-big b")).toHaveText(law.toLocaleString("en-US"));
      await expect(app.locator(".lab-big")).toContainText("Law");
      await expect(app.locator(".lab-schem-svg")).toHaveAttribute("aria-label", /Law and the books it is joined to/);
      // The wheel turns to face the Law (the camera moves).
      await expect.poll(async () => Math.abs((await uni(app, (U) => U.view.th)) - th0), { timeout: 5000 }).toBeGreaterThan(0.01);
      // The keyboard turns the dial too.
      await app.getByRole("slider", { name: "Section" }).focus();
      await app.keyboard.press("ArrowRight");
      await expect(app.locator(".lab-dial-out")).toHaveText("History");
      await expect(app.locator(".lab-para h2")).toHaveText("How do the History books point to Jesus?");
      // Back to the whole Bible.
      await app.locator(".lab-para").getByRole("button", { name: "The whole Bible" }).click();
      await expect(app.locator(".lab-dial-out")).toHaveText("Turn to choose");
      await expect(app.locator(".lab-para h2")).toHaveText("How does the Old Testament point to Jesus?");
    });

    test("the schematic draws all 66 books; tapping a bar chooses that book and the dial follows @phone", async ({ app }) => {
      await openLab(app);
      await expect(app.locator(".lab-bar")).toHaveCount(66);
      await app.locator('.lab-bar[data-b="22"]').dispatchEvent("click");
      await expect.poll(() => uni(app, (U) => U.sel)).toBe(22);
      await expect(app.locator(".lab-dial-out")).toHaveText("Major Prophets");
      await expect(app.locator(".lab-schem-svg")).toHaveAttribute("aria-label", /Isaiah and the \d+ books it is joined to/);
      // Every partner of Isaiah is lit, every other book dimmed.
      const lit = await app.evaluate(() => [...document.querySelectorAll(".lab-bar")].filter((e) => e.getAttribute("opacity") === "1").length);
      const partners = await app.evaluate(() => (window as any).SU_LAB.partners(22).length);
      expect(lit).toBe(partners + 1);
    });
  });
}

test.describe("console phase 2 · phone first screen", () => {
  test.use({ viewport: { width: 390, height: 664 } });
  test("view buttons sit inside the window, clear of the figure label; the dial comes straight after the tiles @phone", async ({ app }) => {
    await openLab(app);
    const g = await app.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return { views: r(".lab-views"), fig: r(".lab-fig"), stage: r(".lab-stage"), metrics: r(".lab-metrics"), dial: r(".lab-dial"), para: r(".lab-para"), vw: innerWidth };
    });
    expect(g.views.left).toBeGreaterThanOrEqual(g.stage.left);
    expect(g.views.right).toBeLessThanOrEqual(Math.min(g.stage.right, g.vw));
    expect(g.views.top).toBeGreaterThanOrEqual(g.stage.top);
    expect(g.views.left).toBeGreaterThan(g.fig.right);
    expect(g.metrics.bottom).toBeLessThanOrEqual(g.dial.top + 1);
    expect(g.dial.bottom).toBeLessThanOrEqual(g.para.top + 1);
  });
});
