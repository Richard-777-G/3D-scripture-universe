import { test, expect, uni } from "./fixtures";

/**
 * Engine hook for the Section V console (?ui=lab), Phase 2: UNI.explode(k) pulls the
 * Old and New Testament rings apart (books keep their size, threads stay attached),
 * UNI.xray(on) makes the book covers see-through. Both are off until called, and turning
 * them off puts every book back exactly where it was.
 */
const place = (U: any) => U.books.map((b: any) => [b.pos.x, b.pos.y, b.pos.z]);

test("exploded view opens the rings and closes back exactly @phone", async ({ app }) => {
  await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
  expect(await uni(app, (U) => U.exploded)).toBe(0);
  const before = await uni(app, place);

  await uni(app, (U) => U.explode(1));
  expect(await uni(app, (U) => U.exploded)).toBe(1);
  const open = await uni(app, place);
  // Genesis (OT ring) goes down, Matthew (NT ring) goes up: the rings are further apart.
  const gap0 = before[39][1] - before[0][1];
  const gap1 = open[39][1] - open[0][1];
  expect(gap1).toBeGreaterThan(gap0 + 5);
  // The wheel also widens a little.
  expect(Math.hypot(open[0][0], open[0][2])).toBeGreaterThan(Math.hypot(before[0][0], before[0][2]));

  // Selecting a book while open still works, and rebuilding the threads keeps it open.
  await uni(app, (U) => U.select(22));
  await uni(app, (U) => U.clearSel?.());

  await uni(app, (U) => U.explode(0));
  const after = await uni(app, place);
  for (let i = 0; i < 66; i++) for (let k = 0; k < 3; k++) expect(after[i][k]).toBeCloseTo(before[i][k], 5);

  const f0 = await uni(app, (U) => U.frames);
  await expect.poll(() => uni(app, (U) => U.frames)).toBeGreaterThan(f0 + 5);
});

/** Mean brightness of the wheel around the front-facing books, read straight after a frame is drawn. */
const coverLight = (U: any) =>
  new Promise<number>((done) =>
    requestAnimationFrame(() => {
      const c = document.getElementById("gl") as HTMLCanvasElement;
      const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext;
      const k = c.width / c.clientWidth, px = new Uint8Array(4 * 10 * 10);
      let sum = 0, n = 0;
      for (let i = 0; i < 66; i++) {
        const p = U.screenOf(i);
        if (p.z > 1 || p.x < 10 || p.y < 10 || p.x > c.clientWidth - 10 || p.y > c.clientHeight - 10) continue;
        gl.readPixels(Math.round(p.x * k) - 5, Math.round(c.height - p.y * k) - 5, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, px);
        for (let j = 0; j < px.length; j += 4) sum += px[j] + px[j + 1] + px[j + 2];
        n += 100;
      }
      done(n ? sum / n : -1);
    }),
  );

test("x-ray makes the covers see-through and switches back @phone", async ({ app }) => {
  await expect.poll(() => uni(app, (U) => U.intro)).toBeFalsy();
  expect(await uni(app, (U) => U.xrayOn)).toBe(false);
  await uni(app, (U) => U.setView({ th: 0.4, el: 0.35, rad: 34 }));
  await app.waitForTimeout(300);
  const solid = await uni(app, coverLight);
  expect(solid).toBeGreaterThan(0);
  await uni(app, (U) => U.xray(true));
  expect(await uni(app, (U) => U.xrayOn)).toBe(true);
  const clear = await uni(app, coverLight);
  expect(clear).toBeLessThan(solid * 0.8);
  await uni(app, (U) => U.xray(false));
  expect(await uni(app, (U) => U.xrayOn)).toBe(false);
  const back = await uni(app, coverLight);
  expect(back).toBeGreaterThan(clear);
});
