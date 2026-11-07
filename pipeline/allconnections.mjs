/**
 * Every OpenBible cross-reference (all 344,799 rows: OT↔NT, OT↔OT and NT↔NT),
 * each labelled with what supports it. Nothing is deleted; the label says how
 * strong the evidence is, and the app lets people choose which set to see.
 *
 * Labels are bit flags, so one link can carry several:
 */
export const LABEL = {
  sourced: 1,   // a curated prophecy link with published citations (content/journeys.json)
  wording: 2,   // same wording: the passages share key words in the same order
  shared: 4,    // at least two distinctive (rare) words in both passages
  tsk: 8,       // listed in the Treasury of Scripture Knowledge (not imported yet: needs an approved source)
  openbible: 16, // listed by OpenBible.info users (with its vote count)
};
export const LABEL_NAMES = {
  1: "Sourced prophecy",
  2: "Same wording",
  4: "Shared distinctive words",
  8: "Listed in TSK",
  16: "Listed by OpenBible users",
};

import { judge } from "./connections.mjs";

/**
 * openbible: { from, ts, te, votes }, journeys: content/journeys.json,
 * bookOf: verse -> book, texts: [kjv, bsb], df: document frequency.
 * Returns two packs (OT↔NT and within one Testament) plus counts.
 */
export function labelAll({ openbible, journeys, bookOf, texts, df }) {
  const ob = openbible;
  // Sourced journey pairs as [otStart, otEnd, ntStart, ntEnd].
  const pairs = [];
  for (const it of journeys.items) for (const o of it.ot) for (const n of it.nt) pairs.push([o.s, o.e, n.s, n.e]);
  const sourcedAt = (a, s, e) => pairs.some(([o0, o1, n0, n1]) =>
    (a >= o0 && a <= o1 && s <= n1 && e >= n0) || (a >= n0 && a <= n1 && s <= o1 && e >= o0));

  const rows = [];
  for (let i = 0; i < ob.from.length; i++) {
    const a = ob.from[i], s = ob.ts[i], e = ob.te[i];
    let l = LABEL.openbible;
    const cross = (bookOf[a] < 39) !== (bookOf[s] < 39);
    if (cross && sourcedAt(a, s, e)) l |= LABEL.sourced;
    if (e - s <= 6) {
      // The evidence test reads the first passage as "ot" and the second as "nt";
      // for links inside one Testament the same wording rule applies either way.
      const [ot, nt] = cross && bookOf[a] >= 39 ? [[s, e], [a, a]] : [[a, a], [s, e]];
      const j = judge(ot, nt, texts, df);
      if (j.tier >= 20) l |= LABEL.wording;
      if (j.words.length >= 2) l |= LABEL.shared;
    }
    rows.push({ a, s, e, v: ob.votes[i], l, cross });
  }
  rows.sort((x, y) => x.a - y.a || x.s - y.s || x.e - y.e);

  // Compact pack: from as deltas, target as an offset from the source verse.
  const pack = (list) => {
    const f = [], t = [], n = [], v = [], l = [];
    let prev = 0;
    for (const r of list) { f.push(r.a - prev); prev = r.a; t.push(r.s - r.a); n.push(r.e - r.s); v.push(r.v); l.push(r.l); }
    return { f, t, n, v, l };
  };
  const cross = rows.filter((r) => r.cross), within = rows.filter((r) => !r.cross);
  const count = (list, bit) => list.filter((r) => r.l & bit).length;
  const counts = {
    all: rows.length,
    otnt: cross.length,
    within: within.length,
    labels: Object.fromEntries(Object.entries(LABEL).map(([k, b]) => [k, count(rows, b)])),
    otntLabels: Object.fromEntries(Object.entries(LABEL).map(([k, b]) => [k, count(cross, b)])),
  };
  return { xon: pack(cross), xin: pack(within), counts, rows };
}

/** Expand a pack back into rows (used by tests and the database export). */
export function unpack(p) {
  const out = [];
  let a = 0;
  for (let i = 0; i < p.f.length; i++) {
    a += p.f[i];
    const s = a + p.t[i];
    out.push({ a, s, e: s + p.n[i], v: p.v[i], l: p.l[i] });
  }
  return out;
}
