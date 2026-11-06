import { test as base, expect, type Page } from "@playwright/test";

/** The test hook the app exposes as window.UNI (see the end of src/legacy/app.js). */
export type Uni = Record<string, any>;

export const test = base.extend<{ app: Page; errors: string[] }>({
  errors: async ({}, use) => {
    await use([]);
  },
  app: async ({ page, errors }, use) => {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    // Fonts come from Google; tests must not depend on them.
    await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await page.goto("./");
    await page.waitForFunction(() => !!(window as any).UNI && !document.getElementById("boot"), null, { timeout: 45_000 });
    await use(page);
    // Every test also checks that nothing threw along the way.
    expect(errors, "no page or console errors").toEqual([]);
  },
});

export { expect };

export const panelText = (page: Page) => page.locator("#pc").innerText();

/** Run a function against window.UNI in the page. */
export function uni<T>(page: Page, fn: (U: Uni) => T | Promise<T>): Promise<T> {
  return page.evaluate(`(${fn.toString()})(window.UNI)`) as Promise<T>;
}
