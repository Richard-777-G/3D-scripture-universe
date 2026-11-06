# Data notes

## What ships today

| Data | Size | Source |
|---|---|---|
| Bible versions | 9 versions × 31,102 verses: KJV, BSB, ASV, BBE, YLT, Darby, Webster, Telugu Old Version, Telugu IRV 2019 | Public domain (BSB: CC0); Telugu IRV: CC BY-SA 4.0 |
| Cross-references (wheel) | 42,732 OT↔NT rows with 3+ votes, shown as 40,099 threads | OpenBible.info (CC BY) |
| Cross-references (database) | 344,794 links across the whole Bible, dated 2024-11-04 | OpenBible.info (CC BY) |
| People, places, events | 3,067 people with 8,436 family links, 1,298 places with coordinates, 450 dated events | Theographic (CC BY-SA 4.0) |
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

## Pipeline

1. **Fetch** (`npm run fetch`): `pipeline/sources.lock.json` pins every upstream file to a commit and a sha256. Files are stored gzipped in `data/raw/<source>/<commit>/` and never edited by hand. CI re-checks every hash.
2. **Normalise** (`pipeline/normalize.mjs`): BSB, OpenBible and Theographic are mapped onto the app's verse numbering. A reference that can't be placed is reported, never guessed.
3. **Validate** (`pipeline/validate.mjs`): the checks below.
4. **Packs** (`npm run packs`) and **database** (`npm run export-db`, `npm run test:db`).

## Where the numbers come from

- **42,732 and 40,099 are both right.** The wheel shows every OpenBible link between the Old and New Testaments with 3 or more votes: 42,732 rows. Some pairs are listed in both directions; once the app merges them there are 40,099 threads. The build fails if the wheel's links ever stop matching OpenBible exactly.
- **5 of 344,799 OpenBible links can't be placed** because they cite 3 John 1:15, which the KJV numbering doesn't have (it ends 3 John at verse 14). They are left out and reported.

## Known gaps

Items 2 and 5 from Phase 1 are resolved for the new sources and the cross-reference count.

1. **Two KJV editions are mixed.** v16 embedded a KJV text for about 20,000 verses and a second, slightly different KJV for the rest (for example "without form, and void" against "without form and void"). 5,043 verses differ between them. The packs keep v16's exact display (the first text where it exists, the second otherwise). Phase 2 should replace both with one pinned KJV source.
2. **Upstream files for the v16 versions and STEPBible data were not recorded.** BSB, OpenBible and Theographic are now pinned. KJV, ASV, BBE, YLT, Darby, Webster, Telugu and the STEPBible words still come from the v16 snapshot. The next step is to pin them the same way.
3. **Empty verses.** ASV and BBE have 16 empty verses each, Darby 3, Telugu 1. Most are verses that modern critical texts leave out (for example Matthew 17:21). They should be checked against the source.
4. **3,178 words (0.7%) have no lexicon entry.** Most are Strong's variants. They show without a definition.
5. **The cross-reference count:** resolved, see above.
6. **Search behaviour (same as v16).**
   - Searching "virgin" returns verses (Luke 1:27, Matthew 1:23) but not the sourced Isaiah 7:14 journey.
   - "Go to John 3:16" opens the book of John with chapter 3 selected, not the verse.
   - "Ps 22" is not understood; "Psalm 22" is.
7. **The Explain button needs a backend.** The AI explanations only work inside Claude (`window.claude`). On the website they say the feature is unavailable. A server-side endpoint that answers only from this database, with citations, is planned for Phase 5.
8. **Telugu IRV 2019:** imported from the eBible.org SWORD module supplied by hand (`data/raw/telirv/36.43/`, sha256 in the lock file). It uses NRSV numbering; the two verses KJV numbering doesn't have (3 John 1:15, Revelation 12:18) are joined to 3 John 1:14 and Revelation 13:1, and the Credits screen says so.
9. **TSK.** The handover lists TSK through scrollmapper. The cross-reference file scrollmapper provides is OpenBible's, so that's what is imported. A separate TSK layer would need its own source.
