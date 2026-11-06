import { test, expect, uni, panelText } from "./fixtures";

test.describe("library and reader", () => {
  test("the Library lists all 66 books by section @phone", async ({ app }) => {
    await app.locator("#tab-library").click();
    await expect(app.locator("#pttl")).toHaveText("Read the Bible");
    const t = await panelText(app);
    for (const s of ["LAW", "HISTORY", "POETRY & WISDOM"]) expect(t).toContain(s);
    for (const b of ["Genesis", "Malachi", "Matthew", "Revelation"]) await expect(app.locator("#pc").getByRole("button", { name: b, exact: true })).toBeVisible();
  });

  test("picking a book in the Library opens the reader", async ({ app }) => {
    await app.locator("#tab-library").click();
    await app.locator("#pc").getByRole("button", { name: "Ruth", exact: true }).click();
    await expect.poll(() => uni(app, (U) => U.uiMode)).toBe("reader");
    await expect(app.locator("#pc")).toContainText("Ruth 1");
  });

  test("reads John 3 in the KJV", async ({ app }) => {
    await uni(app, (U) => U.openReader(42, 3));
    await expect(app.locator("#pc")).toContainText("King James Version (1769) · 36 verses");
    await expect(app.locator("#pc")).toContainText("For God so loved the world");
  });

  test("shows the key Greek words for a New Testament chapter", async ({ app }) => {
    await uni(app, (U) => U.openReader(42, 3));
    await expect(app.locator("#pc")).toContainText("Key Greek words in this chapter");
  });

  test("shows the key Hebrew words for an Old Testament chapter", async ({ app }) => {
    await uni(app, (U) => U.openReader(0, 1));
    await expect(app.locator("#pc")).toContainText("Key Hebrew words in this chapter");
  });

  test("full KJV text is available for every verse", async ({ app }) => {
    const missing = await uni(app, (U) => { let n = 0; for (let v = 0; v < 31102; v++) if (!U.vtext(v)) n++; return n; });
    expect(missing).toBe(0);
  });

  for (const [label, key, sample] of [
    ["ASV", "asv", "In the beginning was the Word"],
    ["BBE", "bbe", "From the first he was the Word"],
    ["YLT", "ylt", "In the beginning was the Word"],
    ["Darby", "darby", "In [the] beginning was the Word"],
    ["Webster", "webster", "In the beginning was the Word"],
  ] as const) {
    test(`switches the reader to ${label}`, async ({ app }) => {
      await uni(app, (U) => U.openReader(42, 1));
      await uni(app, (U) => U.openVpk("main"));
      await app.locator("#vpkb button").filter({ hasText: new RegExp("^" + label.replace(/[[\]]/g, "\\$&")) }).first().click();
      await expect.poll(() => uni(app, (U) => U.rdVer)).toBe(key);
      await expect(app.locator("#pc")).toContainText(sample);
    });
  }

  test("reads the Telugu Bible in Telugu script", async ({ app }) => {
    await uni(app, (U) => U.openReader(42, 1));
    await uni(app, (U) => U.openVpk("main"));
    await app.locator("#vpkb button").filter({ hasText: "తెలుగు" }).first().click();
    await expect.poll(() => uni(app, (U) => U.rdVer)).toBe("tel");
    await expect.poll(() => panelText(app)).toMatch(/[ఀ-౿]{3,}/);
  });

  test("loads Hebrew words for Genesis 1:1 from STEPBible", async ({ app }) => {
    await uni(app, (U) => U.openReader(0, 1));
    await expect.poll(() => uni(app, (U) => typeof U.WCACHE[0])).toBe("object");
    const w = await uni(app, (U) => U.WCACHE[0]["1:1"].map((x: any) => x[1]));
    expect(w[0]).toBe("bereShit");
    await expect.poll(() => uni(app, (U) => typeof U.LEX.lexh)).toBe("object");
    expect(await uni(app, (U) => U.LEX.lexh["H0430G"][2])).toBe("God");
  });

  test("loads Greek words for John 1:1", async ({ app }) => {
    await uni(app, (U) => U.openReader(42, 1));
    await expect.poll(() => uni(app, (U) => typeof U.WCACHE[42])).toBe("object");
    const w = await uni(app, (U) => U.WCACHE[42]["1:1"].map((x: any) => x[1]));
    expect(w).toContain("logos");
  });

  test("Back leaves the reader", async ({ app }) => {
    await app.locator("#tab-library").click();
    await app.locator("#pc").getByRole("button", { name: "Genesis", exact: true }).click();
    await expect.poll(() => uni(app, (U) => U.uiMode)).toBe("reader");
    await uni(app, (U) => U.navBack());
    await expect.poll(() => uni(app, (U) => U.uiMode)).not.toBe("reader");
  });
});
