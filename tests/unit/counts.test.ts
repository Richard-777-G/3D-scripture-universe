import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Every number the app states (links, books, steps, places) must come from the data.
// This fails if a count is typed into the interface by hand.
const ROOT = path.resolve(__dirname, "../..");
const files = ["index.html", "src/legacy/app.js", ...fs.readdirSync(path.join(ROOT, "src/map")).map((f) => "src/map/" + f)];
const COUNT_CLAIM = /\b\d{1,3}(,\d{3})+\+?\s*(cross|links|connections|connected|verses|threads|places|people|journeys|references)|\b\d+\s*\+\s*(cross|links|connections)|\b(16|66|39|27)\s+(steps|books|Old Testament books|New Testament books)\b|\b\d+-step\b/i;

describe("counts come from the data", () => {
  for (const f of files) {
    it(`${f} has no hand-typed counts`, () => {
      const text = fs.readFileSync(path.join(ROOT, f), "utf8");
      const lines = text.split("\n").map((l, i) => [i + 1, l] as const).filter(([, l]) => COUNT_CLAIM.test(l));
      expect(lines.map(([n, l]) => `${n}: ${l.match(COUNT_CLAIM)![0]}`)).toEqual([]);
    });
  }
});
