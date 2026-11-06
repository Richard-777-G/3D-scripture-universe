# Data notes

## What ships today (from v16)

| Data | Size | Source |
|---|---|---|
| Bible versions | 7 versions × 31,102 verses: KJV, ASV, BBE, YLT, Darby, Webster, Telugu Old Version | Public domain |
| Cross-references | 42,732 OT↔NT rows with vote scores (merged by the app into the threads shown) | OpenBible.info |
| Hebrew and Greek words | 441,550 words for every verse, with transliteration, gloss and Strong's number | STEPBible TAHOT, TAGNT |
| Lexicons | 16,801 entries | STEPBible TBESH, TBESG |
| Journeys | 41 sourced OT→NT connections in 4 groups, 15 citations | Own content |
| Story | 16 steps | Own content |
| Evidence | 26 items, each with sources | Own content |
| Q&A | 10 answers, each with sources | Own content |

## Verse numbering

The app indexes verses by position (Genesis 1:1 = 0, Revelation 22:21 = 31101). The database uses the handover's key, `book*1,000,000 + chapter*1,000 + verse`. `src/data/verse.ts` converts between them. Verse 0 is allowed in Psalms: the Hebrew text numbers the psalm titles ("A Psalm of David") separately.

## Checks that block a bad import (`pipeline/validate.mjs`)

- 66 books adding up to 31,102 verses
- every version has 31,102 lines; at most 20 may be empty
- Telugu is present
- every cross-reference points at a real verse, with the Old Testament on one end and the New Testament on the other
- every journey passage is in the right book and Testament, and every citation exists
- every story step, Q&A item and evidence link points at something that exists
- every evidence item and Q&A answer has at least one source with a valid URL
- Hebrew/Greek word keys exist in their book; under 2% of words may lack a lexicon entry
- every pack is covered by a licence in `data/sources.json`

## Known gaps found in Phase 1 (to fix in Phase 2)

1. **Two KJV editions are mixed.** v16 embedded a KJV text for about 20,000 verses and a second, slightly different KJV for the rest (for example "without form, and void" against "without form and void"). 5,043 verses differ between them. The packs keep v16's exact display (the first text where it exists, the second otherwise). Phase 2 should replace both with one pinned KJV source.
2. **Upstream files were not recorded.** The v16 data files don't say which release of each source they came from. Phase 2 fetches each source from a pinned release into `data/raw/<source>/<date>/`.
3. **Empty verses.** ASV and BBE have 16 empty verses each, Darby 3, Telugu 1. Most are verses that modern critical texts leave out (for example Matthew 17:21). They should be checked against the source.
4. **3,178 words (0.7%) have no lexicon entry.** Most are Strong's variants. They show without a definition.
5. **The cross-reference count.** The handover says 40,099; the data has 42,732 rows. The app merges duplicate pairs, so the number of threads it shows is lower than the row count. Phase 2 should state one agreed count, measured the same way everywhere.
6. **Search behaviour (same as v16).**
   - Searching "virgin" returns verses (Luke 1:27, Matthew 1:23) but not the sourced Isaiah 7:14 journey.
   - "Go to John 3:16" opens the book of John with chapter 3 selected, not the verse.
   - "Ps 22" is not understood; "Psalm 22" is.
7. **The Explain button needs a backend.** The AI explanations only work inside Claude (`window.claude`). On the website they say the feature is unavailable. A server-side endpoint that answers only from this database, with citations, is planned for Phase 5.
