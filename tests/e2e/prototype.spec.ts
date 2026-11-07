import { test as base, expect, type Page } from "@playwright/test";

/**
 * The seven usability tasks from the brief (C4), run on the redesign prototype.
 * Each task starts on Home and uses only visible, labelled controls: the same
 * taps a first-time user would make. Each must finish in under 30 seconds.
 */
const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    // Read aloud: record what would be spoken (headless browsers have no voices).
    await page.addInitScript(() => {
      (window as any).__spoken = [];
      const fake = { speak: (u: any) => { (window as any).__spoken.push(u.text); setTimeout(() => u.onstart && u.onstart(), 0); }, cancel: () => {}, getVoices: () => [] };
      Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    });
    await page.goto("prototype/#/home");
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible({ timeout: 45_000 });
    await use(page);
    expect(errors, "no page or console errors").toEqual([]);
  },
});

const timed = async (name: string, fn: () => Promise<void>) => {
  const t0 = Date.now();
  await fn();
  const s = (Date.now() - t0) / 1000;
  test.info().annotations.push({ type: "time", description: `${name}: ${s.toFixed(1)} s` });
  expect(s, `${name} took ${s.toFixed(1)} s`).toBeLessThan(30);
};

test.describe("prototype: the seven first-time tasks", () => {
  test("1. open John 3:16 @phone", async ({ app }) => {
    await timed("Open John 3:16", async () => {
      await app.getByRole("link", { name: "Search" }).click();
      await app.getByRole("searchbox").fill("John 3:16");
      await app.getByRole("link", { name: /Open John 3:16/ }).click();
      await expect(app.getByRole("dialog", { name: "John 3:16" })).toBeVisible();
      await expect(app.getByRole("dialog")).toContainText("For God so loved the world");
    });
  });

  test("2. make the text bigger @phone", async ({ app }) => {
    await timed("Make the text bigger", async () => {
      const before = await app.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      await app.getByRole("button", { name: "Text size and display" }).click();
      await app.getByRole("button", { name: "Make text bigger" }).click();
      await app.getByRole("button", { name: "Make text bigger" }).click();
      const after = await app.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      expect(after).toBeGreaterThan(before);
    });
  });

  test("3. hear it read aloud @phone", async ({ app }) => {
    await timed("Hear it read aloud", async () => {
      await app.getByRole("link", { name: /Read the Bible/ }).first().click();
      await app.getByRole("link", { name: "John", exact: true }).click();
      await app.getByRole("link", { name: "Chapter 3", exact: true }).click();
      await app.getByRole("button", { name: "Listen" }).click();
      await expect.poll(() => app.evaluate(() => (window as any).__spoken.length)).toBeGreaterThan(10);
      expect(await app.evaluate(() => (window as any).__spoken[15])).toContain("For God so loved the world");
    });
  });

  test("4. see what John 3:16 connects to in the Old Testament @phone", async ({ app }) => {
    await timed("See Old Testament connections", async () => {
      await app.getByRole("link", { name: "Search" }).click();
      await app.getByRole("searchbox").fill("John 3:16");
      await app.getByRole("link", { name: /Open John 3:16/ }).click();
      const sheet = app.getByRole("dialog", { name: "John 3:16" });
      await expect(sheet).toContainText(/connected passages/);
      await sheet.getByRole("button", { name: /Show all/ }).click();
      await expect(sheet).toContainText(/Genesis|Exodus|Numbers|Psalms|Isaiah/);
    });
  });

  test("5. find Bethlehem on the map @phone", async ({ app }) => {
    await timed("Find Bethlehem", async () => {
      await app.getByRole("link", { name: /Places & evidence/ }).first().click();
      await app.getByRole("radio", { name: "List of places" }).click();
      await app.getByRole("searchbox", { name: "Find a place" }).fill("Bethlehem");
      await app.getByRole("button", { name: /^Bethlehem/ }).first().click();
      const sheet = app.getByRole("dialog", { name: "Bethlehem" });
      await expect(sheet).toContainText("Location known");
      await expect(sheet).toContainText("Genesis 35:19");
    });
  });

  test("6. start the story @phone", async ({ app }) => {
    await timed("Start the story", async () => {
      await app.getByRole("link", { name: /Follow the story/ }).first().click();
      await app.getByRole("link", { name: "Start at step 1" }).click();
      await expect(app.getByRole("heading", { name: /Step 1 of/ })).toBeVisible();
      await expect(app.locator("main")).toContainText("Genesis 3:15");
    });
  });

  test("7. get back to Home @phone", async ({ app }) => {
    await timed("Get back to Home", async () => {
      await app.getByRole("link", { name: /Follow the story/ }).first().click();
      await app.getByRole("link", { name: "Start at step 1" }).click();
      await app.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home", exact: true }).click();
      await expect(app.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
    });
  });
});

test.describe("prototype: modes and counts", () => {
  test("Easy mode makes text and buttons bigger @phone", async ({ app }) => {
    const size = () => app.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const before = await size();
    await app.getByRole("button", { name: "Text size and display" }).click();
    await app.getByRole("radio", { name: "Easy" }).click();
    expect(await size()).toBeGreaterThan(before);
    const tap = await app.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tap").trim());
    expect(tap).toBe("56px");
  });

  test("the Connections filter shows its counts from the data", async ({ app, request }) => {
    const m = await (await request.get("data/manifest.json")).json();
    const core = await (await request.get("data/" + m.files.core.file)).json();
    await app.getByRole("link", { name: /See how it connects/ }).first().click();
    const fmt = (n: number) => n.toLocaleString("en-US");
    await expect(app.getByRole("radio", { name: `Best evidence · ${fmt(core.counts.best)}` })).toBeVisible();
    await expect(app.getByRole("radio", { name: `All connections · ${fmt(core.counts.all)}` })).toBeVisible();
    await app.getByRole("radio", { name: /All connections/ }).click();
    await expect(app.locator("canvas.arcs")).toHaveAttribute("aria-label", new RegExp(fmt(core.counts.all)));
  });

  test("every tab has a word, not only an icon @phone", async ({ app }) => {
    for (const name of ["Home", "Read", "Story", "Connections", "Places"]) await expect(app.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true })).toBeVisible();
  });
});

test.describe("prototype: accessibility", () => {
  for (const h of ["#/home", "#/read/42/3", "#/connections", "#/places/list", "#/story/0"]) {
    test(`no WCAG 2.2 AA problems on ${h}`, async ({ app }) => {
      const { AxeBuilder } = await import("@axe-core/playwright");
      await app.goto("prototype/" + h);
      await expect(app.locator(".top-title")).toBeVisible();
      await app.waitForTimeout(800);
      const r = await new AxeBuilder({ page: app }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }
});
