import { test, expect, uni } from "./fixtures";

test.describe("landing", () => {
  test("loads the app from the data packs with no errors @phone", async ({ app }) => {
    await expect(app.locator("#boot")).toHaveCount(0);
    const version = await app.evaluate(() => (window as any).SU_DATA_VERSION);
    expect(version).toMatch(/^[0-9a-f]{12}$/);
  });

  test("shows the brand and the Start the story button @phone", async ({ app }) => {
    await expect(app.locator("#brand")).toContainText("Scripture Universe");
    await expect(app.locator("#brand")).toContainText("How the whole Bible points to Jesus");
    await expect(app.locator("#cta")).toBeVisible();
    await expect(app.locator("#cta")).toContainText("Start the story here");
  });

  test("starts with the panel hidden so the wheel is the first thing seen", async ({ app }) => {
    expect(await uni(app, (U) => U.panelHidden)).toBe(true);
    expect(await uni(app, (U) => U.uiMode)).toBe("none");
  });

  test("has the five section tabs @phone", async ({ app }) => {
    for (const t of ["Story", "Explore", "Evidence", "Search", "Library"]) {
      await expect(app.locator("#tabs").getByRole("button", { name: t })).toBeVisible();
    }
  });

  test("builds 66 books on two rings", async ({ app }) => {
    const r = await uni(app, (U) => ({ n: U.books.length, ot: U.books.filter((b: any) => b.ot).length, meshes: U.meshes.length }));
    expect(r.n).toBe(66);
    expect(r.ot).toBe(39);
    expect(r.meshes).toBeGreaterThanOrEqual(66);
  });

  test("draws only links backed by the text (quotation, shared wording, sourced)", async ({ app }) => {
    const r = await uni(app, (U) => ({ L: U.L, curves: U.curves, total: Array.from(U.M() as Float32Array).reduce((a, b) => a + b, 0) }));
    expect(r.L).toBeGreaterThan(3000);
    expect(r.L).toBeLessThan(10_000);
    expect(r.total).toBe(r.L);
  });

  test("labels links by evidence, never by votes @phone", async ({ app }) => {
    await uni(app, (U) => U.select(39)); // Matthew
    const t = await app.locator("#pc").innerText();
    expect(t).not.toMatch(/cross-referenced|votes?/i);
    expect(t).toMatch(/Same wording|Shared words|Sourced prophecy link/);
  });

  test("renders frames and book labels", async ({ app }) => {
    await expect.poll(() => uni(app, (U) => U.frames)).toBeGreaterThan(5);
    await expect.poll(() => uni(app, (U) => U.labs().length)).toBeGreaterThan(5);
  });

  test("the 3D canvas has a screen-reader description", async ({ app }) => {
    await expect(app.locator("#gl")).toHaveAttribute("aria-label", /Old Testament books.*New Testament books/);
  });

  test("the help button opens the 3-screen intro", async ({ app }) => {
    await uni(app, (U) => U.openIntro());
    await expect(app.locator("#intro")).toBeVisible();
    await uni(app, (U) => U.closeIntro());
    await expect(app.locator("#intro")).toBeHidden();
  });

  test("has no horizontal scroll on a phone @phone", async ({ app }) => {
    const r = await app.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    expect(r.sw).toBeLessThanOrEqual(r.w);
  });
});

test.describe("loading and offline", () => {
  test("shows a retry screen when the data cannot load, and recovers", async ({ page }) => {
    await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    let fail = true;
    await page.route("**/data/manifest.json", (r) => (fail ? r.abort("internetdisconnected") : r.continue()));
    await page.goto("./");
    await expect(page.locator("#boot-msg")).toContainText("Could not load the Bible data");
    await expect(page.locator("#boot-retry")).toBeVisible();
    fail = false;
    await page.locator("#boot-retry").click();
    await page.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
  });

  test("serves every pack listed in the manifest", async ({ request }) => {
    const m = await (await request.get("data/manifest.json")).json();
    expect(Object.keys(m.files).length).toBeGreaterThanOrEqual(81);
    for (const k of ["core", "kjv", "journeys", "story", "evidence", "qa", "sources", "v_tel", "lexh", "lexg", "w01", "w66"]) {
      const res = await request.head("data/" + m.files[k].file);
      expect(res.status(), k).toBe(200);
    }
  });
});
