import { test, expect, uni } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Section V console, Phase 1 (?ui=lab). Every number on it must agree with the data
 * and with the wheel (brief V3 and V6), and nothing may cover what it names.
 */
async function openLab(page: Page) {
  await page.goto("./?ui=lab");
  await page.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot") && !!(window as any).SU_LAB, null, { timeout: 45_000 });
  await expect.poll(() => uni(page, (U) => U.intro)).toBeFalsy();
}
const tile = (page: Page, label: string) => page.locator(".lab-metric", { hasText: label }).locator("b");
const num = async (page: Page, label: string) => Number((await tile(page, label).innerText()).replace(/,/g, ""));

for (const vp of [{ name: "desktop 1600", width: 1600, height: 900 }, { name: "phone 390×664", width: 390, height: 664 }]) {
  test.describe(`console · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("the six live numbers agree with the data and the wheel @phone", async ({ app }) => {
      await openLab(app);
      const d = await app.evaluate(async () => {
        const m = await (await fetch("data/manifest.json")).json();
        const core = await (await fetch("data/" + m.files.core.file)).json();
        const chapters = core.books.reduce((a: number, b: any) => a + b.ch.length, 0);
        const verses = core.books.reduce((a: number, b: any) => a + b.ch.reduce((x: number, y: number) => x + y, 0), 0);
        return { books: core.books.length, chapters, verses, best: core.counts.best, places: core.counts.placesNamed };
      });
      await expect(tile(app, "Books")).toHaveText(String(d.books));
      expect(await num(app, "Chapters")).toBe(d.chapters);
      expect(await num(app, "Verses")).toBe(d.verses);
      expect(await num(app, "Best evidence")).toBe(d.best);
      expect(await num(app, "Places named")).toBe(d.places);
      // What the wheel draws is the best-evidence set, link for link.
      await expect.poll(() => num(app, "Threads shown")).toBe(d.best);
      await expect(app.locator(".lab-big b")).toHaveText(d.best.toLocaleString("en-US"));
      await expect(app.locator(".lab-para")).toContainText(`${d.best.toLocaleString("en-US")} threads in all`);
    });

    test("choosing Isaiah: the big number, paragraph and tiles follow, from the data @phone", async ({ app }) => {
      await openLab(app);
      await uni(app, (U) => U.select(22));
      // Count Isaiah's best-evidence links straight from the data pack.
      const isa = await app.evaluate(async () => {
        const m = await (await fetch("data/manifest.json")).json();
        const core = await (await fetch("data/" + m.files.core.file)).json();
        let start = 0;
        const starts: number[] = [];
        for (const b of core.books) { starts.push(start); start += b.ch.reduce((x: number, y: number) => x + y, 0); }
        const bookOf = (v: number) => { let k = 0; while (k + 1 < starts.length && starts[k + 1] <= v) k++; return k; };
        let n = 0;
        for (let i = 0; i < core.xrefs.fv.length; i++) if (bookOf(core.xrefs.fv[i]) === 22 || bookOf(core.xrefs.ts[i]) === 22) n++;
        return n;
      });
      await expect(app.locator(".lab-big b")).toHaveText(isa.toLocaleString("en-US"));
      await expect(app.locator(".lab-big")).toContainText("Isaiah");
      await expect(app.locator(".lab-para h2")).toHaveText("How does Isaiah point to Jesus?");
      await expect(app.locator(".lab-para")).toContainText(`by ${isa} best-evidence threads`);
      expect(await num(app, "Best evidence")).toBe(isa);
      await expect(tile(app, "Places named")).not.toHaveText("0", { timeout: 20_000 });
      // The main callout is pinned to Isaiah and shows its count.
      await expect(app.locator(".lab-tag.on")).toContainText("Isaiah");
      await expect(app.locator(".lab-tag.on")).toHaveCSS("opacity", "1");
      // Read opens the reader on Isaiah 1.
      await app.locator(".lab-acts").getByRole("button", { name: "Read Isaiah 1" }).click();
      await expect.poll(() => uni(app, (U) => U.uiMode)).toBe("reader");
    });

    test("camera buttons move the real camera smoothly, and nothing on the console overlaps @phone", async ({ app }) => {
      await openLab(app);
      const v0 = await uni(app, (U) => U.view);
      await app.locator(".lab-cams").getByRole("radio", { name: "Top" }).click();
      await expect.poll(() => uni(app, (U) => U.view.el), { timeout: 5000 }).toBeGreaterThan(1.3);
      await app.locator(".lab-cams").getByRole("radio", { name: "Hero" }).click();
      await expect.poll(async () => Math.abs((await uni(app, (U) => U.view.el)) - v0.el), { timeout: 5000 }).toBeLessThan(0.05);
      // Layout: tags never overlap each other, the camera bar or the "Fig. 1" label; no sideways scroll.
      await uni(app, (U) => U.select(22));
      await app.waitForTimeout(2500);
      const problems = await app.evaluate(() => {
        const out: string[] = [];
        const r = (e: Element) => e.getBoundingClientRect();
        const hit = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const tags = [...document.querySelectorAll(".lab-tag")].filter((e) => getComputedStyle(e).opacity !== "0");
        const bar = r(document.querySelector(".lab-cams")!), fig = r(document.querySelector(".lab-fig")!), stage = r(document.querySelector(".lab-stage")!);
        tags.forEach((t, i) => {
          const b = r(t);
          if (hit(b, bar)) out.push(`tag ${t.textContent} covers the camera bar`);
          if (hit(b, fig)) out.push(`tag ${t.textContent} covers the figure label`);
          if (b.left < stage.left - 1 || b.right > stage.right + 1) out.push(`tag ${t.textContent} sticks out of the window`);
          tags.slice(i + 1).forEach((u) => hit(b, r(u)) && out.push(`tags overlap: ${t.textContent} / ${u.textContent}`));
        });
        const lab = document.getElementById("lab")!;
        if (lab.scrollWidth > lab.clientWidth + 1) out.push("the console scrolls sideways");
        return out;
      });
      expect(problems).toEqual([]);
    });
  });
}

test("?ui=new turns the console off again", async ({ app }) => {
  await openLab(app);
  await app.goto("./?ui=new");
  await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
  await expect(app.locator("#lab")).toHaveCount(0);
  await expect(app.locator("#tabs")).toBeVisible();
});
