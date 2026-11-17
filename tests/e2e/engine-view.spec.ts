import { test, expect, uni } from "./fixtures";

/**
 * Engine hook for the Section V console (?ui=lab): UNI.view reads the camera and
 * UNI.setView sets it. Additive only; the wheel must look and behave as before.
 */
test("the console can read and set the camera, and the wheel keeps drawing @phone", async ({ app }) => {
  await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
  const v0 = await uni(app, (U) => U.view);
  expect(typeof v0.th).toBe("number");
  await uni(app, (U) => U.setView({ th: 1.2, el: 1.3, rad: 40 }));
  const v1 = await uni(app, (U) => U.view);
  expect(v1.th).toBeCloseTo(1.2, 1);
  expect(v1.el).toBeCloseTo(1.3, 2);
  expect(v1.rad).toBeCloseTo(40, 0);
  // Out-of-range values are held to safe limits.
  await uni(app, (U) => U.setView({ el: 5, rad: 1000 }));
  const v2 = await uni(app, (U) => U.view);
  expect(v2.el).toBeLessThanOrEqual(1.45);
  expect(v2.rad).toBeLessThanOrEqual(100);
  // Still 66 books and still drawing.
  expect(await uni(app, (U) => U.books.length)).toBe(66);
  const f0 = await uni(app, (U) => U.frames);
  await expect.poll(() => uni(app, (U) => U.frames)).toBeGreaterThan(f0 + 5);
});
