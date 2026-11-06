/**
 * Which Old <-> New Testament links the app shows, decided by evidence in the
 * text, not by reader votes.
 *
 *   sourced    a curated journey link with published citations (content/journeys.json)
 *   quotation  the New Testament passage repeats the Old Testament wording:
 *              key words shared in the same order, either a long close match or a
 *              shorter one where the New Testament says it is quoting ("it is written")
 *   wording    the passages share at least two distinctive words (words rare in the Bible)
 *
 * A candidate link that has none of these is not shown. Candidates come from the
 * OpenBible.info cross-reference list (every vote count), so no link is invented here.
 * Matching runs on both the KJV and the BSB, so old and modern wording both count.
 */

export const TIER = { sourced: 30, quotation: 20, wording: 10 };

// Words that carry no meaning on their own (including KJV forms such as "hath", "thee").
const STOP = new Set(("a an and are as at be been but by for from had has have he her him his i in is it its me my not of on or our out " +
  "shall she so that the thee their them then there they thou thy to unto up upon us was we were what when which who will with ye you " +
  "your all also did do even every hath into let made man may men no now o said say saith thus one this those through came come go went " +
  "wilt shalt hast art doth dost thine mine yea nay cometh goeth thereof therefore wherefore again day days great things thing make " +
  "say know see seek find fell face set give take put bring brought am if than these being would could should might").split(" "));

// Irregular KJV and modern verb forms, so "broken" matches "break".
const IRREGULAR = {
  broken: "break", brake: "break", spake: "speak", spoken: "speak", gave: "give", given: "give", born: "bear", bare: "bear",
  begat: "beget", slain: "slay", slew: "slay", written: "write", wrote: "write", saw: "see", seen: "see", knew: "know",
  known: "know", took: "take", taken: "take",
};

export const stem = (w) => IRREGULAR[w] || w.replace(/(eth|est|ing|ed|es|s)$/, "");
export const tokens = (text) => (text || "").toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter((w) => w.length > 1);
export const contentStems = (text) => tokens(text).filter((w) => !STOP.has(w)).map(stem);
export const isStopWord = (w) => STOP.has(w);

/** A word is distinctive if it appears in at most this many KJV verses. */
export const DISTINCTIVE_MAX_VERSES = 150;
const QUOTE_FORMULA = /it is written|was written|were written|spoken by|spoken of|spake by|was spoken|fulfilled|the scripture|scripture saith|scriptures|as he saith|he saith|saith the lord|as it is said|in the prophets|by the prophet|the prophet|moses said|moses wrote|david saith|david himself|esaias|isaiah said|isaiah says|jeremy|jeremiah the prophet/i;

/** Longest common subsequence length of two token arrays. */
function lcs(a, b) {
  const row = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const t = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(row[j], row[j - 1]);
      prev = t;
    }
  }
  return row[b.length];
}

/** How many KJV verses each content stem appears in. */
export function documentFrequency(verses) {
  const df = new Map();
  for (const v of verses) for (const w of new Set(contentStems(v))) df.set(w, (df.get(w) || 0) + 1);
  return df;
}

/**
 * Judge one Old Testament range against one New Testament range.
 * texts: one or more translations, each an array of verse strings by position.
 * Returns { tier, words } where words are the distinctive words both passages use.
 */
export function judge(ot, nt, texts, df) {
  const join = (T, [s, e]) => T.slice(s, e + 1).join(" ");
  let best = { l: 0, cov: 0 }, formula = false;
  const shared = new Map(); // stem -> a display word
  for (const T of texts) {
    const A = contentStems(join(T, ot)), N = contentStems(join(T, nt));
    const l = lcs(A, N), cov = l / Math.max(1, Math.min(new Set(A).size, new Set(N).size));
    if (l > best.l || (l === best.l && cov > best.cov)) best = { l, cov };
    // The quoting formula may sit in the verse before ("for thus it is written by the prophet").
    if (QUOTE_FORMULA.test(join(T, [Math.max(0, nt[0] - 1), nt[1]]))) formula = true;
    const inN = new Set(N);
    for (const w of tokens(join(T, ot))) {
      const s = stem(w);
      if (!STOP.has(w) && inN.has(s) && (df.get(s) || 0) <= DISTINCTIVE_MAX_VERSES && !shared.has(s)) shared.set(s, w);
    }
  }
  const quotation = (best.l >= 4 && best.cov >= 0.5) || (best.l >= 3 && best.cov >= 0.4 && formula);
  const words = [...shared.values()];
  return { tier: quotation ? TIER.quotation : words.length >= 2 ? TIER.wording : 0, words };
}

/**
 * Build the wheel's links: every OpenBible Old<->New Testament candidate that the
 * text supports, plus every curated journey pair. Returns arrays in the shape the
 * app reads (fv, ts, te, d, vo) with vo holding the evidence tier, and mw the
 * shared words per row.
 */
export function buildConnections({ openbible, journeys, bookOf, texts }) {
  const df = documentFrequency(texts[0]);
  const rows = new Map(); // "ot0|ot1|nt0|nt1" -> row
  const put = (ot, nt, tier, words) => {
    const k = `${ot[0]}|${ot[1]}|${nt[0]}|${nt[1]}`;
    const r = rows.get(k);
    if (!r || tier > r.tier) rows.set(k, { ot, nt, tier, words });
  };
  const stats = { candidates: 0, quotation: 0, wording: 0, sourced: 0, unsupported: 0, longRanges: 0 };
  for (let i = 0; i < openbible.from.length; i++) {
    const fromOT = bookOf[openbible.from[i]] < 39, toOT = bookOf[openbible.ts[i]] < 39;
    if (fromOT === toOT) continue;
    stats.candidates++;
    const ot = fromOT ? [openbible.from[i], openbible.from[i]] : [openbible.ts[i], openbible.te[i]];
    const nt = fromOT ? [openbible.ts[i], openbible.te[i]] : [openbible.from[i], openbible.from[i]];
    if (ot[1] - ot[0] > 6 || nt[1] - nt[0] > 6) { stats.longRanges++; continue; } // whole chapters are not wording matches
    const j = judge(ot, nt, texts, df);
    if (!j.tier) { stats.unsupported++; continue; }
    stats[j.tier === TIER.quotation ? "quotation" : "wording"]++;
    put(ot, nt, j.tier, j.words);
  }
  for (const it of journeys.items) {
    for (const o of it.ot) for (const n of it.nt) {
      stats.sourced++;
      put([o.s, o.e], [n.s, n.e], TIER.sourced, judge([o.s, o.e], [n.s, n.e], texts, df).words);
    }
  }
  // fv..fe is the Old Testament range, ts..te the New Testament range (d=0 throughout).
  const out = { fv: [], fe: [], ts: [], te: [], d: [], vo: [], mw: [] };
  for (const r of rows.values()) {
    out.fv.push(r.ot[0]); out.fe.push(r.ot[1]); out.ts.push(r.nt[0]); out.te.push(r.nt[1]); out.d.push(0);
    out.vo.push(r.tier);
    out.mw.push(r.words.slice(0, 8).join(" "));
  }
  return { connections: out, stats, df };
}

/** The common words list the app uses so its highlighting follows the same rule. */
export function commonWords(df) {
  const common = [...STOP];
  for (const [w, n] of df) if (n > DISTINCTIVE_MAX_VERSES) common.push(w);
  return common.sort();
}
