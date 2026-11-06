#!/usr/bin/env node
/**
 * Step 1 of the pipeline: fetch each pinned upstream file.
 *
 *   node pipeline/fetch.mjs            download what is missing, verify every sha256
 *   node pipeline/fetch.mjs --update   record sha256 for entries that have none yet
 *
 * Git-pinned files are stored gzipped at data/raw/<id>/<commit12>/<basename>.gz.
 * Files marked `manual` were supplied by hand and are stored as-is at
 * data/raw/<id>/<version>/<name>; they are only verified, never downloaded.
 * Nothing in data/raw is edited by hand. Downloads use curl so the proxy settings apply.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LOCK = path.join(ROOT, "pipeline/sources.lock.json");
const update = process.argv.includes("--update");
const lock = JSON.parse(fs.readFileSync(LOCK, "utf8"));

export const rawPath = (f) =>
  f.manual
    ? path.join(ROOT, "data/raw", f.id, f.version, f.path)
    : path.join(ROOT, "data/raw", f.id, f.commit.slice(0, 12), path.basename(f.path) + ".gz");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

let changed = false, failed = 0;
for (const f of lock.files) {
  const out = rawPath(f);
  let body;
  if (f.manual) {
    if (!fs.existsSync(out)) { console.error(`missing hand-supplied file ${out}`); failed++; continue; }
    body = fs.readFileSync(out);
  } else if (fs.existsSync(out)) {
    body = zlib.gunzipSync(fs.readFileSync(out));
  } else {
    const url = `https://raw.githubusercontent.com/${f.repo}/${f.commit}/${f.path}`;
    console.log(`fetch ${url}`);
    body = execFileSync("curl", ["-fsSL", "--retry", "4", "--retry-delay", "2", url], { maxBuffer: 1 << 30 });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, zlib.gzipSync(body, { level: 9 }));
  }
  const h = sha(body);
  if (!f.sha256) {
    if (update) { f.sha256 = h; changed = true; console.log(`recorded ${f.path} ${h.slice(0, 16)}…`); }
    else { console.error(`no sha256 recorded for ${f.path}; run with --update`); failed++; }
  } else if (f.sha256 !== h) {
    console.error(`sha256 mismatch for ${f.path}: expected ${f.sha256}, got ${h}`);
    failed++;
  }
}
if (changed) fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1) + "\n");
if (failed) process.exit(1);
console.log(`${lock.files.length} upstream files present and verified`);
