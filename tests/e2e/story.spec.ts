import { test, expect, uni, panelText } from "./fixtures";

test.describe("story", () => {
  test("Start the story opens the story home with all 16 steps @phone", async ({ app }) => {
    await app.locator("#cta").click();
    await expect(app.locator("#pttl")).toHaveText("The story");
    await expect(app.locator("#pc")).toContainText("Follow it in 16 steps");
    await expect(app.locator("#pc button.jstep")).toHaveCount(16);
  });

  test("step 1 shows the first promise with its verses", async ({ app }) => {
    await app.locator("#cta").click();
    await app.getByRole("button", { name: "Start at step 1" }).click();
    await expect(app.locator("#pttl")).toHaveText("Story · 1 of 16");
    const t = await panelText(app);
    expect(t).toContain("The first promise");
    expect(t).toContain("Genesis 3:15");
    expect(t).toContain("I will put enmity between thee and the woman");
  });

  test("Next and Previous move through the steps", async ({ app }) => {
    await app.locator("#cta").click();
    await app.getByRole("button", { name: "Start at step 1" }).click();
    await app.locator("#pft").getByRole("button", { name: /Next/ }).click();
    await expect(app.locator("#pttl")).toHaveText("Story · 2 of 16");
    await expect(app.locator("#pc")).toContainText("God will provide a lamb");
    await app.locator("#pft").getByRole("button", { name: /Previous/ }).click();
    await expect(app.locator("#pttl")).toHaveText("Story · 1 of 16");
  });

  test("every step has a promise and a fulfilment passage", async ({ app }) => {
    for (let k = 0; k < 16; k++) {
      await uni(app, (U) => U.storyGo(0));
      await app.evaluate((k) => (window as any).UNI.storyGo(k), k);
      await expect(app.locator("#pttl")).toHaveText(`Story · ${k + 1} of 16`);
      const t = await panelText(app);
      expect(t, `step ${k + 1}`).toMatch(/The promise:/);
      expect(t, `step ${k + 1}`).not.toContain("went wrong");
    }
  });

  test("the last step is about his return", async ({ app }) => {
    await app.evaluate(() => (window as any).UNI.storyGo(15));
    await expect(app.locator("#pttl")).toHaveText("Story · 16 of 16");
    await expect(app.locator("#pc")).toContainText("new heaven");
  });

  test("Back returns from a step to the story home", async ({ app }) => {
    await app.locator("#cta").click();
    await app.getByRole("button", { name: "Start at step 1" }).click();
    await app.locator("#pback").click();
    await expect(app.locator("#pttl")).toHaveText("The story");
  });

  test("a step's Why · Q&A tab explains the link", async ({ app }) => {
    await app.evaluate(() => (window as any).UNI.storyGo(5));
    await app.locator("#pc").getByRole("tab", { name: /^Why/ }).click();
    await expect(app.locator("#pc").getByRole("tab", { name: /^Why/ })).toHaveAttribute("aria-selected", "true");
    await expect(app.locator("#pc")).not.toContainText("went wrong");
  });
});

test.describe("panel controls", () => {
  test("minimise shows the 3D view and the restore button brings the panel back @phone", async ({ app }) => {
    await app.locator("#cta").click();
    await app.locator("#pmin").click();
    expect(await uni(app, (U) => U.panelMin)).toBe(true);
    await expect(app.locator("#prest")).toBeVisible();
    await app.locator("#prest").click();
    expect(await uni(app, (U) => U.panelMin)).toBe(false);
  });

  test("the expand button makes the panel full height", async ({ app }) => {
    await app.locator("#cta").click();
    const before = await uni(app, (U) => U.sheet);
    await app.locator("#pexp").click();
    await expect.poll(() => uni(app, (U) => U.sheet)).not.toBe(before);
  });

  test("Close returns to the clean wheel", async ({ app }) => {
    await app.locator("#tab-explore").click();
    await app.locator("#clr").click();
    await expect.poll(() => uni(app, (U) => U.panelHidden || U.uiMode === "none")).toBe(true);
  });
});
