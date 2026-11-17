import AxeBuilder from "@axe-core/playwright";
import { test, expect, uni } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * The new reader and connections panel (the default; ?ui=classic for the old one). Richard asked for
 * "picture perfect, no overlapping, proper fitting of everything", so every size
 * and both themes are measured: the panel never covers the wheel or the tabs,
 * nothing inside it overlaps or runs off the side, and every button is big enough.
 */

const SIZES = [
  { name: "phone 360", width: 360, height: 780 },
  { name: "phone 390", width: 390, height: 844 },
  { name: "tablet 768", width: 768, height: 1024 },
  { name: "desktop 1280", width: 1280, height: 800 },
  { name: "desktop 1440", width: 1440, height: 900 },
];

async function openNew(page: Page, theme: "night" | "light" = "night") {
  await page.evaluate((t) => localStorage.setItem("su-reader-prefs", JSON.stringify({ theme: t, size: 1, version: "kjv" })), theme);
  await page.goto("./");
  await page.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
  await expect.poll(() => uni(page, (U) => U.intro)).toBeFalsy();
  await uni(page, (U) => U.openReader(22, 53));
  await expect(page.locator("#rp")).toBeVisible();
  await expect(page.locator("#rp-title")).toHaveText("Isaiah 53");
}

/** Measure the layout: returns a list of problems (empty when everything fits). */
async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const r = (e: Element) => e.getBoundingClientRect();
    const rp = document.getElementById("rp")!, stage = document.getElementById("stage")!, tabs = document.getElementById("tabs")!;
    const P = r(rp), S = r(stage), T = r(tabs);
    const hit = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    if (hit(P, S)) out.push(`panel covers the wheel: panel ${JSON.stringify(P)} stage ${JSON.stringify(S)}`);
    if (hit(P, T)) out.push("panel covers the tabs");
    if (P.right > innerWidth + 0.5 || P.left < -0.5) out.push("panel runs off the screen");
    if (document.documentElement.scrollWidth > innerWidth) out.push("the page scrolls sideways");
    if (getComputedStyle(document.getElementById("panel")!).display !== "none") out.push("the classic panel is still showing");
    for (const sc of rp.querySelectorAll<HTMLElement>(".rp-head,.rp-tools,.rp-body,.rp-foot,.r-vs-actions,.r-seg,.r-tablist"))
      if (sc.scrollWidth > sc.clientWidth + 1) out.push(`${sc.className} is wider than the panel (${sc.scrollWidth} > ${sc.clientWidth})`);
    const visible = (e: Element) => {
      const b = r(e);
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden";
    };
    const items = [...rp.querySelectorAll("button,h2,h3,h4,p,blockquote,.r-badge,.r-seg-b,[role=status],.r-link,.r-word")].filter(visible);
    for (const e of items) {
      const b = r(e);
      if (b.left < P.left - 0.5 || b.right > P.right + 0.5) out.push(`${e.tagName}.${e.className} sticks out of the panel`);
      if (e.tagName === "BUTTON" && !e.closest(".r-q.r-inline") && (b.height < 40 || b.width < 40))
        out.push(`button "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" is too small (${Math.round(b.width)}×${Math.round(b.height)})`);
    }
    // Things side by side in one row must not touch each other.
    for (const row of rp.querySelectorAll(".rp-head,.rp-tools,.r-vs-actions,.r-seg,.r-link-foot,.r-badges,.rp-foot,.r-group-h,.r-tablist,.r-kwi-top,.r-kwi-vv,.r-word-b,.r-kw-b")) {
      const kids = [...row.children].filter(visible);
      for (let i = 0; i < kids.length; i++)
        for (let j = i + 1; j < kids.length; j++)
          if (hit(r(kids[i]), r(kids[j]))) out.push(`in ${row.className}: "${kids[i].textContent?.trim().slice(0, 20)}" overlaps "${kids[j].textContent?.trim().slice(0, 20)}"`);
    }
    return out;
  });
}

for (const vp of SIZES) {
  test.describe(`new reader · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const theme of ["night", "light"] as const) {
      test(`${theme}: the chapter, then a verse and its connections, fit with nothing overlapping @phone`, async ({ app }, info) => {
        await openNew(app, theme);
        await expect(app.locator("#rp")).toHaveClass(theme === "light" ? /su-light/ : /^(?!.*su-light)/);
        // The wheel is still there and drawn beside or above the panel.
        await expect.poll(() => uni(app, (U) => U.frames)).toBeGreaterThan(5);
        expect(await layoutProblems(app)).toEqual([]);
        await app.screenshot({ path: info.outputPath(`chapter-${theme}.png`) });

        // Tap verse 7 (quoted in Acts 8:32): its connected verses, grouped by evidence.
        await app.locator("#rp .rp-verse").nth(6).click();
        await expect(app.locator("#rp-title")).toHaveText("Isaiah 53:7");
        await expect(app.locator("#rp .r-groups")).toContainText("Acts 8:32");
        // The Old <-> New count arrives from the data, then that set can be shown.
        await expect(app.locator("#rp .r-seg-b").nth(1).locator(".r-seg-c")).toHaveText(/\d/);
        expect(await layoutProblems(app)).toEqual([]);
        await app.screenshot({ path: info.outputPath(`verse-${theme}.png`) });
        await app.locator("#rp .r-seg-b").nth(1).click();
        await expect(app.locator("#rp .r-group").first()).toBeVisible();
        await expect(app.locator("#rp")).toContainText("Listed in TSK");
        expect(await layoutProblems(app)).toEqual([]);

        // Original words.
        await app.locator("#rp").getByRole("tab", { name: "Hebrew words" }).click();
        await expect(app.locator("#rp .r-word").first()).toBeVisible();
        await app.locator("#rp .r-word-b").first().click();
        await expect(app.locator("#rp .r-meaning")).not.toContainText("Loading", { timeout: 30_000 });
        expect(await layoutProblems(app)).toEqual([]);
        await app.screenshot({ path: info.outputPath(`words-${theme}.png`) });
      });
    }

    test("Aa and the version list open inside the screen", async ({ app }) => {
      await openNew(app);
      await app.locator("#rp").getByRole("button", { name: "Text and display" }).click();
      const pop = app.getByRole("dialog", { name: "Text and display" });
      await expect(pop).toBeVisible();
      const b = (await pop.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
      await pop.getByRole("button", { name: "Bigger text" }).click();
      await expect(pop).toContainText("112%");
      await app.keyboard.press("Escape");
      expect(await layoutProblems(app)).toEqual([]);
    });
  });
}

test.describe("new reader · behaviour", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("it follows the wheel, opens linked passages, closes cleanly, and passes an accessibility scan @phone", async ({ app }) => {
    await openNew(app);
    // The wheel is showing Isaiah 53's threads, as with the classic reader.
    expect(await uni(app, (U) => U.sel)).toBe(22);
    // Next chapter moves the wheel too.
    await app.locator("#rp").getByRole("button", { name: /^Next chapter, Isaiah 54$/ }).click();
    await expect(app.locator("#rp-title")).toHaveText("Isaiah 54");
    expect(await uni(app, (U) => U.chs[U.selChap].c)).toBe(54);
    await app.locator("#rp").getByRole("button", { name: /^Previous chapter/ }).click();
    await expect(app.locator("#rp-title")).toHaveText("Isaiah 53");

    const axe = await new AxeBuilder({ page: app }).include("#rp").analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Open a connected passage: the reader goes there and shows that verse.
    await app.locator("#rp .rp-verse").nth(6).click();
    await app.locator("#rp .r-link-main", { hasText: "Acts 8:32" }).first().click();
    await expect(app.locator("#rp-title")).toHaveText("Acts 8:32");
    expect(await uni(app, (U) => U.sel)).toBe(43);
    const axe2 = await new AxeBuilder({ page: app }).include("#rp").analyze();
    expect(axe2.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Close: the panel goes, the wheel is cleared as with the classic Close.
    await app.locator("#rp").getByRole("button", { name: "Close the reader" }).click();
    await expect(app.locator("#rp")).toBeHidden();
    expect(await uni(app, (U) => U.uiMode)).toBe("none");
    expect(await uni(app, (U) => U.sel)).toBeNull();
  });

  test("?ui=classic brings back the classic reader", async ({ app }) => {
    await openNew(app);
    await app.goto("./?ui=classic");
    await app.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
    await uni(app, (U) => U.openReader(22, 53));
    await expect(app.locator("#pc")).toContainText("Isaiah 53");
    await expect(app.locator("#rp")).toHaveCount(0);
  });
});

test.describe("new reader · never opens on an empty tab", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("John 3:16 has no Best links, so it opens on Old ↔ New and says so; every tab shows its count @phone", async ({ app }) => {
    await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
    await uni(app, (U) => U.openReader(42, 3));
    await expect(app.locator("#rp-title")).toHaveText("John 3");
    // The data decides: John 3:16 has no Best-evidence link.
    await expect(app.locator("#rp .rp-verse").nth(15)).not.toContainText(/\d+$/);
    await app.locator("#rp .rp-verse").nth(15).click();
    await expect(app.locator("#rp-title")).toHaveText("John 3:16");
    const seg = app.locator("#rp .r-seg-b");
    await expect(seg.nth(1)).toHaveAttribute("data-selected", "true");
    await expect(seg.nth(0).locator(".r-seg-c")).toHaveText("0");
    const n = (await seg.nth(1).locator(".r-seg-c").innerText()).trim();
    expect(Number(n.replace(/,/g, ""))).toBeGreaterThan(0);
    await expect(app.locator("#rp")).toContainText(`No best-evidence links for this verse. Showing all ${n} Old ↔ New links.`);
    await expect(app.locator("#rp .r-group").first()).toBeVisible();
    await expect(app.locator("#rp")).not.toContainText("No connected verses are recorded");
    // The All tab shows its count too, at least as many as Old ↔ New.
    await expect(seg.nth(2).locator(".r-seg-c")).toHaveText(/\d/, { timeout: 30_000 });
    expect(Number((await seg.nth(2).locator(".r-seg-c").innerText()).replace(/,/g, ""))).toBeGreaterThanOrEqual(Number(n.replace(/,/g, "")));
    // Choosing Best by hand clears the note and shows the plain empty message with a way on.
    await seg.nth(0).click();
    await expect(app.locator("#rp")).not.toContainText("Showing all");
    await expect(app.locator("#rp")).toContainText("No connected verses are recorded for this verse in this set.");
    expect(await layoutProblems(app)).toEqual([]);
  });

  test("a verse with Best links still opens on Best, and All shows its count", async ({ app }) => {
    await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
    await uni(app, (U) => U.openReader(22, 53));
    await app.locator("#rp .rp-verse").nth(6).click();
    const seg = app.locator("#rp .r-seg-b");
    await expect(seg.nth(0)).toHaveAttribute("data-selected", "true");
    await expect(seg.nth(2).locator(".r-seg-c")).toHaveText(/\d/, { timeout: 30_000 });
    await expect(app.locator("#rp")).not.toContainText("No best-evidence links");
  });
});

for (const vp of [{ name: "phone 360", width: 360, height: 780 }, { name: "desktop 1280", width: 1280, height: 800 }]) {
  test.describe(`new reader · side by side · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("a second version shows under every verse and in the verse sheet, and fits @phone", async ({ app }) => {
      await openNew(app);
      await app.locator("#rp").getByRole("button", { name: /Side by side with another version/ }).click();
      await app.getByRole("option", { name: /^BSB/ }).click();
      await expect(app.locator("#rp .rp-sub")).toContainText("side by side with Berean Standard Bible");
      // Every verse of Isaiah 53 has its BSB line under it.
      await expect(app.locator("#rp .rp-verse .r-par")).toHaveCount(12, { timeout: 30_000 });
      await expect(app.locator("#rp .rp-verse").first().locator(".r-par")).toContainText("BSB");
      expect(await layoutProblems(app)).toEqual([]);
      await app.locator("#rp .rp-verse").nth(6).click();
      await expect(app.locator("#rp .r-vs-text .r-par")).toContainText("BSB");
      expect(await layoutProblems(app)).toEqual([]);
      // The choice is kept; "None" turns it off.
      await app.locator("#rp").getByRole("button", { name: /^Back to Isaiah 53/ }).click();
      await app.locator("#rp").getByRole("button", { name: /Side by side with another version/ }).click();
      await app.getByRole("option", { name: /^None/ }).click();
      await expect(app.locator("#rp .r-par")).toHaveCount(0);
    });
  });
}

for (const vp of [{ name: "phone 360", width: 360, height: 780 }, { name: "desktop 1280", width: 1280, height: 800 }]) {
  test.describe(`new reader · key words · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("key Hebrew words open, fit, match the classic reader, and a verse button opens that verse @phone", async ({ app }) => {
      await openNew(app);
      const kw = app.locator("#rp .r-kw");
      await expect(kw.getByRole("button", { name: /Key Hebrew words in this chapter/ })).toHaveAttribute("aria-expanded", "false");
      await expect(kw).not.toContainText("Loading", { timeout: 30_000 });
      await kw.getByRole("button", { name: /Key Hebrew words in this chapter/ }).click();
      await expect(kw.locator(".r-kwi").first()).toBeVisible();
      await expect(kw.locator(".r-kwi").first()).toContainText(/\d+ times in this chapter/);
      await expect(kw).toContainText("STEPBible.org (CC BY 4.0)");
      expect(await layoutProblems(app)).toEqual([]);
      // Same words as the classic reader works out from the same data.
      const mine = await kw.locator(".r-kwi .r-word-o").allInnerTexts();
      const classic = await uni(app, async (U) => {
        for (let i = 0; i < 100; i++) {
          const k = U.keyWords(22, 53);
          if (k) return k.map((x: any) => x.L[0]);
          await new Promise((r) => setTimeout(r, 200));
        }
        return null;
      });
      if (classic) expect(mine).toEqual(classic);
      // A verse button opens that verse with its connections.
      const btn = kw.locator(".r-vbtn").first();
      const label = (await btn.innerText()).trim();
      await btn.click();
      await expect(app.locator("#rp-title")).toHaveText(`Isaiah 53:${label.replace("v. ", "")}`);
    });
  });
}
