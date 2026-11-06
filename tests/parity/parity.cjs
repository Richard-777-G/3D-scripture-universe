/**
 * Parity check: drives the original v16 page and the new build through the same
 * screens and compares the text each one shows.
 *
 *   V16_URL=http://localhost:8765/ NEW_URL=http://localhost:4173/ node tests/parity/parity.cjs
 *
 * Serve v16 with:  git show db8e23e:index.html > /tmp/v16/index.html  (plus its data/ folder)
 * THREE_JS=<path to three.min.js r128> serves three.js locally if the CDN is unreachable.
 */
const { chromium } = require("playwright");
const V16 = process.env.V16_URL || "http://localhost:8765/";
const NEW = process.env.NEW_URL || "http://localhost:4173/";

async function screens(page) {
  return page.evaluate(async () => {
    const U = window.UNI, out = {};
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (f, ms = 15000) => { for (let t = 0; t < ms && !f(); t += 50) await wait(50); };
    const pc = () => document.getElementById("pc").innerText + " ## " + document.getElementById("pttl").innerText + " ## " + document.getElementById("pft").innerText;
    const click = (sel) => document.querySelector(sel).click();
    await until(() => U.fullReady);
    for (const t of ["story", "explore", "evidence", "search", "library"]) { click("#tab-" + t); await wait(150); out["tab:" + t] = pc(); }
    for (let k = 0; k < 16; k++) { U.storyGo(k); await wait(120); out["story:" + k] = pc(); }
    for (let b = 0; b < 66; b++) { U.clearSel(); U.select(b); await wait(60); out["book:" + b] = pc(); }
    U.clearSel();
    for (const m of U.J.meta) {
      U.openJourney(m.id); await wait(80); out["journey:" + m.id] = pc();
      const n = U.J.items.filter((it) => it.j === m.id).length;
      for (let k = 0; k < n; k++) { U.goStep(m.id, k); await wait(60); out[`journey:${m.id}:${k}`] = pc(); }
    }
    click("#tab-evidence"); await wait(150);
    const n = document.querySelectorAll("#pc button").length;
    for (let i = 0; i < n; i++) {
      click("#tab-evidence"); await wait(100);
      const btn = document.querySelectorAll("#pc button")[i]; if (!btn) break;
      const label = btn.innerText.slice(0, 40); btn.click(); await wait(120); out["evidence:" + i + ":" + label] = pc();
    }
    click("#tab-search"); await wait(150);
    for (const q of ["lamb of God", "Isaiah 53", "virgin", "Mount of Olives", "resurrection", "John 3:16"]) {
      const inp = document.getElementById("qin"); inp.value = q; inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await wait(400); out["search:" + q] = pc();
    }
    for (const [b, c] of [[0, 1], [18, 22], [22, 53], [39, 1], [42, 3], [65, 22]]) { U.openReader(b, c); await wait(150); await until(() => !/Loading/.test(document.getElementById("pc").innerText)); await wait(100); out[`reader:${b}:${c}`] = pc(); }
    for (const v of ["ASV", "BBE", "YLT", "Darby", "Webster", "తెలుగు", "KJV"]) {
      U.openReader(42, 1); await wait(100); U.openVpk("main"); await wait(100);
      const btn = [...document.querySelectorAll("#vpkb button")].find((x) => x.innerText.trim().startsWith(v));
      if (!btn) { out["version:" + v] = "NO BUTTON"; continue; }
      btn.click(); await wait(200); await until(() => !/Loading/.test(document.getElementById("pc").innerText), 15000); await wait(200);
      out["version:" + v] = pc();
    }
    return out;
  });
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const run = async (url) => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
    if (process.env.THREE_JS) await p.route("**/three.min.js", (r) => r.fulfill({ path: process.env.THREE_JS, contentType: "application/javascript" }));
    await p.route("https://fonts.**", (r) => r.abort());
    await p.goto(url);
    await p.waitForFunction(() => !!window.UNI && !document.getElementById("boot"), null, { timeout: 60000 });
    await p.waitForTimeout(500);
    const s = await screens(p);
    await p.close();
    return { s, errors };
  };
  const [a, b] = [await run(V16), await run(NEW)];
  const keys = [...new Set([...Object.keys(a.s), ...Object.keys(b.s)])];
  const diff = keys.filter((k) => a.s[k] !== b.s[k]);
  console.log(`${keys.length} screens compared, ${keys.length - diff.length} identical, ${diff.length} different`);
  for (const k of diff) console.log(`\n--- ${k}\n v16: ${String(a.s[k]).slice(0, 300)}\n new: ${String(b.s[k]).slice(0, 300)}`);
  const bad = (t) => /went wrong/.test(t);
  const broken = keys.filter((k) => bad(String(b.s[k])));
  if (broken.length) console.log("\nscreens showing an error in the new build:", broken);
  console.log("console errors v16:", a.errors.length, "new:", b.errors.length, b.errors.slice(0, 5));
  await browser.close();
  process.exit(diff.length || broken.length || b.errors.length ? 1 : 0);
})();
