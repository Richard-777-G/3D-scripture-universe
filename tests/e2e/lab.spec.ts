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
      // Numbers count up to their value, so read them once they settle.
      await expect.poll(() => num(app, "Chapters")).toBe(d.chapters);
      await expect.poll(() => num(app, "Verses")).toBe(d.verses);
      await expect.poll(() => num(app, "Best evidence")).toBe(d.best);
      await expect.poll(() => num(app, "Places named")).toBe(d.places);
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
      await expect.poll(() => num(app, "Best evidence")).toBe(isa);
      await expect(tile(app, "Places named")).not.toHaveText("0", { timeout: 20_000 });
      // The main callout is pinned to Isaiah and shows its count.
      await expect(app.locator(".lab-tag.on")).toContainText("Isaiah");
      await expect(app.locator(".lab-tag.on")).toHaveCSS("opacity", "1");
      // Read opens the reader on Isaiah 1 (on phones the paragraph's buttons sit below the fold).
      await app.locator(".lab-acts").getByRole("button", { name: "Read Isaiah 1" }).scrollIntoViewIfNeeded();
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
        const views = r(document.querySelector(".lab-views")!);
        if (hit(views, fig)) out.push("the view buttons cover the figure label");
        tags.forEach((t, i) => {
          const b = r(t);
          if (hit(b, bar)) out.push(`tag ${t.textContent} covers the camera bar`);
          if (hit(b, views)) out.push(`tag ${t.textContent} covers the view buttons`);
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


for (const vp of [{ name: "desktop 1600", width: 1600, height: 900 }, { name: "phone 390×664", width: 390, height: 664 }]) {
  test.describe(`console polish · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("the wheel fills about 70% of its window and stays inside it; every name appears once @phone", async ({ app }) => {
      await openLab(app);
      // Let the idle wheel settle to its fill distance.
      await app.waitForTimeout(2500);
      const fill = await app.evaluate(() => {
        const U = (window as any).UNI;
        const w = document.querySelector(".lab-stage")!.getBoundingClientRect();
        const pts = U.books.map((_: unknown, i: number) => U.screenOf(i)).filter((p: any) => p && p.z < 1);
        const xs = pts.map((p: any) => p.x), ys = pts.map((p: any) => p.y);
        const st = document.getElementById("stage")!.getBoundingClientRect();
        const box = { l: Math.min(...xs) + st.left, r: Math.max(...xs) + st.left, t: Math.min(...ys) + st.top, b: Math.max(...ys) + st.top };
        return { wShare: (box.r - box.l) / w.width, hShare: (box.b - box.t) / w.height, inside: box.l >= w.left && box.r <= w.right && box.t >= w.top && box.b <= w.bottom };
      });
      expect(Math.max(fill.wShare, fill.hShare), "the wheel fills its window").toBeGreaterThan(0.6);
      expect(fill.inside, "no book is cut off at the window's edge").toBe(true);
      // Names: the callouts are the only book names; none twice, no faded half-names.
      await app.evaluate(() => (window as any).UNI.select(39));
      await app.waitForTimeout(2000);
      const names = await app.evaluate(() => {
        const vis = (e: Element) => getComputedStyle(e).display !== "none" && getComputedStyle(e).opacity !== "0" && e.getBoundingClientRect().width > 0;
        const engine = [...document.querySelectorAll("#labels .lab")].filter(vis).map((e) => e.textContent!.trim());
        const tags = [...document.querySelectorAll(".lab-tag")].filter(vis).map((e) => e.childNodes[1]?.textContent?.trim() ?? "");
        return { engine, tags };
      });
      const all = [...names.engine, ...names.tags].map((n) => n.toLowerCase());
      expect(new Set(all).size, `each name once: ${all.join(", ")}`).toBe(all.length);
      for (const n of names.engine) expect(["new testament", "old testament"].some((r) => n.toLowerCase().includes(r)) || /\d/.test(n), `only ring captions or a chapter tag from the engine, got "${n}"`).toBe(true);
    });

    test("tiles do what they say: Places opens the map, Chapters opens the reader", async ({ app }) => {
      await openLab(app);
      await app.locator(".lab-metric", { hasText: "Places named" }).click();
      await expect(app.locator("#mapv")).toBeVisible();
      await app.locator("#mapback").click();
      await app.locator(".lab-metric", { hasText: "Chapters" }).click();
      await expect.poll(() => uni(app, (U) => U.uiMode)).toBe("reader");
    });
  });
}

test.describe("console on a phone · order and fit", () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test("title and number, then the wheel (55% of the screen), then the tiles, then the words; bar and callouts fully on screen @phone", async ({ app }) => {
    await openLab(app);
    await uni(app, (U) => U.select(22));
    await app.waitForTimeout(2500);
    const g = await app.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const tags = [...document.querySelectorAll(".lab-tag")].filter((e) => getComputedStyle(e).opacity !== "0").map((e) => e.getBoundingClientRect());
      return { id: r(".lab-id"), stage: r(".lab-stage"), metrics: r(".lab-metrics"), para: r(".lab-para"), cams: r(".lab-cams"), tags: tags.map((t) => [t.left, t.right, t.top, t.bottom]), vw: innerWidth, vh: innerHeight };
    });
    expect(g.id.bottom).toBeLessThanOrEqual(g.stage.top + 1);
    expect(g.stage.bottom).toBeLessThanOrEqual(g.metrics.top + 1);
    expect(g.metrics.bottom).toBeLessThanOrEqual(g.para.top + 1);
    expect(g.stage.height).toBeGreaterThanOrEqual(g.vh * 0.55 - 1);
    // The camera bar sits fully on screen without scrolling.
    expect(g.cams.left).toBeGreaterThanOrEqual(0);
    expect(g.cams.right).toBeLessThanOrEqual(g.vw);
    expect(g.cams.bottom).toBeLessThanOrEqual(g.vh);
    for (const [l, r, t, b] of g.tags) {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(g.vw);
      expect(t).toBeGreaterThanOrEqual(g.stage.top);
      expect(b).toBeLessThanOrEqual(g.cams.top + 1);
    }
    // The paragraph opens with "Read more".
    await app.locator(".lab-more").click();
    await expect(app.locator(".lab-more")).toHaveText(/Show less/);
  });
});

test.describe("console with reduced motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1600, height: 900 } });
  test("numbers go straight to their value and nothing keeps moving", async ({ app }) => {
    await openLab(app);
    await uni(app, (U) => U.select(22));
    await expect(app.locator(".lab-big b")).not.toHaveText("1,911");
    const v = (await app.locator(".lab-big b").innerText()).trim();
    await app.waitForTimeout(150);
    expect((await app.locator(".lab-big b").innerText()).trim()).toBe(v);
    const anim = await app.evaluate(() => getComputedStyle(document.querySelector(".lab-metric")!, "::after").animationName);
    expect(anim).toBe("none");
  });
});
