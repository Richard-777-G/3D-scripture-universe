#!/usr/bin/env node
/**
 * One-off migration from the v16 single-file app (commit db8e23e) to the
 * Phase 1 layout. It is kept in the repo so the split can be re-checked.
 *
 *   node pipeline/migrate-v16.mjs <v16-index.html> <v16-data-dir>
 *
 * Writes:
 *   content/*.json          curated content (journeys, story, evidence, Q&A)
 *   data/raw/v16/*.gz        v16 data snapshot as plain gzip (no base64)
 *   src/legacy/app.js        the v16 app code with the embedded data removed
 * It does not touch index.html or src/styles.css.
 *
 * Nothing in the text, numbers or ordering of the data is changed.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [, , htmlPath, dataDir] = process.argv;
if (!htmlPath || !dataDir) {
  console.error("usage: migrate-v16.mjs <v16-index.html> <v16-data-dir>");
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const html = fs.readFileSync(htmlPath, "utf8");
const lines = html.split("\n");
const at = (n) => lines[n - 1]; // 1-based, as in the v16 file

const expectStart = (n, s) => {
  if (!at(n).startsWith(s)) throw new Error(`line ${n} should start with ${JSON.stringify(s)}`);
};
expectStart(264, 'if(typeof THREE==="undefined")');
expectStart(265, "const D=");
expectStart(273, "D.J.items.forEach(");
expectStart(274, "const STORY=");
expectStart(728, "const EVD=");
expectStart(729, "EVD.splice(");
expectStart(799, 'const KJVZ="');
expectStart(800, "setTimeout(async()=>{try{if(!(\"DecompressionStream\"");
expectStart(802, "const QA=");
expectStart(870, "const AST=");
expectStart(872, "function loadAsset(k)");
if (at(1004) !== "</script>") throw new Error("line 1004 should close the script");

/* ---------- 1. evaluate the embedded content exactly as v16 did ---------- */
// The content array is followed, in the same statement, by small lookup tables
// (EGR, EOV, ELC, ELN on line 728; PHOTO and others on line 802) that stay in the code.
// Cut at the first top-level "],NAME=" after the array.
const arrayEnd = (line) => {
  const m = line.match(/\],([A-Za-z_$][\w$]*)=/);
  if (!m) throw new Error("content boundary not found");
  return m.index + 1; // keep the "]" with the array, the "," with the rest
};
const l728 = at(728), elc = arrayEnd(l728);
const l802 = at(802), photo = arrayEnd(l802);
if (!l728.slice(elc).startsWith(",EGR=") || !l802.slice(photo).startsWith(",PHOTO=")) throw new Error("unexpected content boundary");
const evalSrc = `(()=>{${at(265)}\n${at(273)}\n${at(274)}\n${l728}\n${at(729)}\n${l802.slice(0, photo)};\nreturn {D,STORY,EVD,QA};})()`;
const { D, STORY, EVD, QA } = (0, eval)(evalSrc);

const kjvz = at(799).match(/^const KJVZ="([^"]+)"/)[1];
const fullKjv = zlib.gunzipSync(Buffer.from(kjvz, "base64")).toString("utf8").split("\n");
if (fullKjv.length !== 31102) throw new Error(`KJV has ${fullKjv.length} lines, expected 31102`);

// v16 shows D.vt first and falls back to the full KJV. Fold D.vt into the full
// text so one file gives the same text for every verse.
const kjv = fullKjv.slice();
D.vn.forEach((v, i) => { kjv[v] = D.vt[i]; });

const core = {
  books: D.books,
  th: D.th,
  aud: D.aud,
  xrefs: { fv: D.fv, ts: D.ts, te: D.te, vo: D.vo, d: D.d },
  vn: D.vn,
};

/* ---------- 2. write content + raw data ---------- */
const w = (rel, data) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};
const gz = (s) => zlib.gzipSync(Buffer.from(s, "utf8"), { level: 9 });
w("content/journeys.json", JSON.stringify(D.J, null, 1) + "\n");
w("content/story.json", JSON.stringify(STORY, null, 1) + "\n");
w("content/evidence.json", JSON.stringify(EVD, null, 1) + "\n");
w("content/qa.json", JSON.stringify(QA, null, 1) + "\n");
w("data/raw/v16/core.json.gz", gz(JSON.stringify(core)));
w("data/raw/v16/kjv.txt.gz", gz(kjv.join("\n")));

// the lazily loaded packs: base64(gzip(text)) -> gzip(text)
const AST = JSON.parse(at(870).slice("const AST=".length, at(870).indexOf("}") + 1));
const assetOut = {};
for (const [key, rel] of Object.entries(AST)) {
  const text = zlib.gunzipSync(Buffer.from(fs.readFileSync(path.join(dataDir, path.basename(rel)), "utf8").trim(), "base64"));
  const out = key.startsWith("v_") ? `${key}.txt.gz` : key.startsWith("lex") ? `lex/${key}.json.gz` : `words/${key}.json.gz`;
  w(`data/raw/v16/${out}`, zlib.gzipSync(text, { level: 9 }));
  assetOut[key] = out;
}
w("data/raw/v16/assets.json", JSON.stringify(assetOut, null, 1) + "\n");

/* ---------- 3. the app code without the data ---------- */
const code = lines.slice(263, 1003); // lines 264..1003
const set = (n, s) => { code[n - 264] = s; };
set(264, "export function start(DATA){");
set(265, "const D=DATA.core;");
set(273, "");
set(274, "const STORY=DATA.story;");
set(728, "const EVD=DATA.evidence" + l728.slice(elc));
set(729, "");
set(799, "let FULL=DATA.kjv;");
set(800, "");
set(802, "const QA=DATA.qa" + l802.slice(photo));
const l870 = at(870);
set(870, "const AST=DATA.assets" + l870.slice(l870.indexOf("}") + 1));
const l872 = at(872);
if (!l872.includes(".then(unz)")) throw new Error("loadAsset changed");
set(872, l872.replace(".then(unz)", ""));
const app =
  "// @ts-nocheck\n" +
  "/* Scripture Universe v16 app code, moved here unchanged except for where its data comes from.\n" +
  "   Data now arrives in start(DATA) from the versioned packs (see src/data/loader.ts). */\n" +
  'import * as THREE from "three";\n' +
  code.join("\n") +
  "\n";
w("src/legacy/app.js", app);

/* The page shell (index.html) and src/styles.css were split from the v16 file once,
   in the Phase 1 commit, and are edited by hand from then on. */

console.log("journeys", D.J.items.length, "story", STORY.length, "evidence", EVD.length, "qa", QA.length);
console.log("xrefs", D.fv.length, "kjv verses", kjv.length, "assets", Object.keys(assetOut).length);
