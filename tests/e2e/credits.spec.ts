import { test, expect, uni } from "./fixtures";

test.describe("credits and licences", () => {
  test("the menu opens a Credits screen listing every source and its licence @phone", async ({ app }) => {
    await app.locator("#mbtn").click();
    await app.locator("#pop").getByRole("button", { name: "Credits and licences" }).click();
    const sc = app.locator("#sc");
    await expect(app.locator("#sheet")).toHaveClass(/open/);
    await expect(sc).toContainText("Credits and licences");
    for (const t of ["OpenBible.info cross-references", "STEPBible", "Berean Standard Bible", "Theographic", "Telugu Bible"]) await expect(sc).toContainText(t);
    await expect(sc).toContainText("CC BY-SA 4.0");
    await expect(sc).toContainText("share-alike");
  });

  test("every source in the licence register appears on the Credits screen", async ({ app, request }) => {
    const m = await (await request.get("data/manifest.json")).json();
    const sources = await (await request.get("data/" + m.files.sources.file)).json();
    await uni(app, (U) => U.credits());
    for (const s of sources) await expect(app.locator("#sc")).toContainText(s.name);
  });

  test("source links open outside the app safely", async ({ app }) => {
    await uni(app, (U) => U.credits());
    const links = app.locator("#sc a");
    expect(await links.count()).toBeGreaterThan(3);
    for (const l of await links.all()) {
      await expect(l).toHaveAttribute("target", "_blank");
      await expect(l).toHaveAttribute("rel", /noopener/);
    }
  });
});

test.describe("Phase 2 data packs", () => {
  test("people, places and events are published", async ({ request }) => {
    const m = await (await request.get("data/manifest.json")).json();
    const people = await (await request.get("data/" + m.files.people.file)).json();
    const places = await (await request.get("data/" + m.files.places.file)).json();
    const events = await (await request.get("data/" + m.files.events.file)).json();
    expect(people.length).toBeGreaterThan(3000);
    expect(places.length).toBeGreaterThan(1200);
    expect(events.length).toBeGreaterThan(400);
    expect(people.find((p: any) => p.id === "abraham_58").children).toContain("isaac_616");
  });
});
