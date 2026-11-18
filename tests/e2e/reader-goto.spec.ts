import { test, expect } from "./fixtures";

/**
 * Daily use: someone heard John 3:16 in church and looks it up. Search → "Go to John 3:16"
 * must show that verse at once (two taps plus typing), and "Back" reads around it.
 */
test.describe("find a verse heard in church", () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test("Go to John 3:16 opens the verse itself, then Back shows the chapter at that verse @phone", async ({ app }) => {
    await app.locator("#tabs").getByRole("button", { name: "Search" }).click();
    await app.locator("#qin").fill("John 3:16");
    await app.locator("#pc").getByText("Go to John 3:16").click();
    const rp = app.locator("#rp");
    await expect(rp).toBeVisible();
    await expect(rp.locator("#rp-title")).toHaveText("John 3:16");
    await expect(rp).toContainText("For God so loved the world");
    // The verse is on screen, not below the fold.
    const box = await rp.getByText("For God so loved the world").boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(664);
    await rp.getByRole("button", { name: /Back to John 3/ }).click();
    await expect(rp.locator("#rp-title")).toContainText("John 3");
    await expect(rp.locator('[data-v]').filter({ hasText: "For God so loved" })).toBeInViewport();
  });

  test("a verse found by its words opens that verse @phone", async ({ app }) => {
    await app.locator("#tabs").getByRole("button", { name: "Search" }).click();
    await app.locator("#qin").fill("Alpha and Omega");
    const first = app.locator("#pc [data-vs]").first();
    const ref = (await first.locator("b").innerText()).trim();
    await first.click();
    await expect(app.locator("#rp #rp-title")).toHaveText(ref);
    await expect(app.locator("#rp")).toContainText("Alpha and Omega");
  });
});
