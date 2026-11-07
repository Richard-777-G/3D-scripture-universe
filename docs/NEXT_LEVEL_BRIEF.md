# Next-level brief: Scripture Universe for every age

Owner: Richard. Written 2026-11-06. This is the working spec for the next stage. Order: C (redesign, design-first with Richard's approval) and D (all connections) are now top priority; A is done (PRs #8, #9); B continues alongside; then stages 1–8 inside the new design. Each numbered stage is its own pull request (or a short series), merged only when green.

The goal: a 7-year-old, a busy adult, and an 80-year-old with poor eyesight can each open the app and use it without help. The data stays honest and sourced, and the 3D wheel stays the heart of the app.

---

## 0. Rules that apply to every PR

1. **Update, never replace.** Build on the current Vite + TypeScript app. No rewrites of working screens, no removing features, no renaming files unless required. Existing tests, including the 194 v16 screen comparisons, must keep passing. When a design change is intended, update the reference screenshots on purpose in the same PR and say why.
2. **Small PRs.** One feature per PR, with a plain-English description: what changed, why, screenshots (phone and desktop), and the Vercel preview link.
3. **Check the preview yourself before asking for a merge.** Load the Vercel preview and check the wheel, every tab, the reader (BSB, KJV, Telugu OV, Telugu IRV), Credits and any new screen. Do it at 360 px phone width and on desktop, and confirm zero console errors.
4. **Auto-merge:** turn it on for every PR you open. Richard is enabling the repo setting.
5. **After every merge:** confirm the production deployment on scripture-universe.vercel.app is READY and the live site works. If it broke, roll back in Vercel first, then fix.
6. **Data honesty:** nothing enters `data/` unless it is pinned in the sources lock file with a checksum, its licence is recorded, and it is credited on the Credits screen. Use `docs/RESOURCE_AUDIT.md`: Tier 1 sources only, unless Richard approves another. Never import tiers 4–7. No invented testimonies, quotes, numbers or sources.
7. **Performance budget:** first screen interactive in under 3 s on a mid-range Android over 4G. No new code on the home screen route over 50 KB gzipped. Lazy-load the map, the evidence data, the lexicons and JARVIS.
8. **Secrets:** nothing secret in the front end, the repo or the logs. The Anthropic key lives only in Vercel environment variables.

## C. Redesign: a real app, simple enough for a first-time 75-year-old (top priority, with D)

Richard's verdict on 2026-11-07: the sections and dashboard look AI-generated, are hard to understand for a new user, and the map is a mess. He is right. These are the causes, checked in the code:

- **The whole interface is one hand-built file.** `src/legacy/app.js` is 777 lines, with single lines up to 2,304 characters. It builds HTML as strings, has no components, no design tokens and no shared layout rules. Every screen invents its own look.
- **The map has no base map.** `src/map/map.ts` draws Natural Earth coastlines locally with Leaflet, then puts up to 1,285 dots on top. There are no terrain, labels, roads, clustering or sense of place, so it reads as a cloud of dots.

### C1. Technology (approved by Richard: "if it requires tech, do it")
- **UI framework:** React 18 + TypeScript, with **React Aria Components** (Adobe's accessibility-first component library) for buttons, dialogs, tabs, lists, sliders and menus. Accessibility for elders and screen readers comes built in, not bolted on.
- **Design tokens** as CSS variables for colour, type scale, spacing, radius and elevation, in Standard, Easy and Kids themes plus light and dark. No hard-coded colours or sizes in components.
- **The 3D wheel** becomes one React component wrapping the existing three.js code, so its behaviour is unchanged.
- **Map:** MapLibre GL JS with real vector tiles that need no API key. Use a Protomaps PMTiles extract of the Bible lands, served as a static file from this Vercel project, so it is free, fast, offline-capable and has no vendor lock-in. Include:
  - labels in English and Telugu
  - terrain shading
  - place clustering that splits as you zoom
  - a starting view on the Holy Land
  - a tap opening a bottom sheet, not a tooltip
  - the plain list view kept alongside
- **Migrate screen by screen** (strangler pattern): each new screen replaces its legacy one only when it passes its tests and Richard approves the preview. The legacy screen stays until then. Nothing working is lost in between.
- **Size limit:** framework plus components under 120 KB gzipped on first load. Everything else is lazy-loaded.

### C2. Design first, code second
1. **Design system:** write `docs/DESIGN.md`, using `website-design:web-design-system`, `design-skills:design-systems` and `frontend-design`. Study 3–4 real, well-regarded reading and Bible apps for patterns (no copying their branding), and record the type scale, colours, spacing, components, icon set and motion rules.
2. **Clickable prototype:** build one on a preview branch, never merged, of these screens in Standard and Easy mode, at phone and desktop size:
   - Home
   - Read
   - Connections
   - Map
   - Evidence
   - Story
3. **Approval gate:** send Richard the preview link and screenshots, then **wait for his approval**. Only then start migrating.

### C3. Information architecture: what a new user sees
- **Home:** a calm screen with a greeting and the four things people come for, as big labelled cards with an icon, a title and one plain sentence each:
  1. **Read the Bible**
  2. **Follow the story** (the 16 steps)
  3. **See how it connects** (the wheel)
  4. **Places & evidence**

  Below them sit "Continue where you left off" and a verse of the day. The 3D wheel is a destination, not the first screen.
- **Navigation:** a bottom bar on phones and a side bar on desktop, with five labelled tabs (icon **and** word): Home · Read · Story · Connections · Places. Evidence lives inside Places and inside every verse. Search is always reachable from the top bar.
- **One job per screen.** Every screen has one main action and a visible Back button. There are no floating panels over the 3D view on phones, and no hidden gestures.
- **Plain words everywhere.** Use "Connected verses", not "cross-references", and "Original language", not "lexicon". Reading age 9 in Easy mode. Use `zizi-skills:plain-language` and `design-skills:ux-writing`.
- **Sizes:** base text 18 px (22 px in Easy mode), line height 1.6, and tap targets at least 48 px (56 px in Easy mode).

### C4. Usability test before each screen ships
Write these as Playwright tasks, and also as a checklist Richard can run with an older family member. A first-time user must finish each in under 30 seconds without help:
1. Open John 3:16.
2. Make the text bigger.
3. Hear it read aloud.
4. See what it connects to in the Old Testament.
5. Find Bethlehem on the map.
6. Start the story.
7. Get back to Home.

Report the time and any place they got stuck. Use `ux-ui-audit:ux-ui-audit`, the `fairmind-design` accessibility agents and `design-skills:design-critique` on every screen.

## D. Keep every connection in the database, and show them honestly

Richard wants every connection the Bible's reference tradition records, not a cut-down set. "63,000+" is the well-known figure from Chris Harrison's 2008 visualisation of the cross-references (63,779). The data the app already has is larger: OpenBible.info lists **344,799** cross-references across the whole Bible, **73,313** of them between the Old and New Testaments.

- **D1. Store everything.**
  - **OpenBible:** keep all 344,799 rows in the database and in lazy-loaded packs: OT↔NT, OT↔OT and NT↔NT. Nothing is deleted.
  - **TSK:** add the *Treasury of Scripture Knowledge* (1836, public domain) as a second source. First find a digitised copy whose licence is verified as public domain or CC0, pin it with a checksum, and map it to the app's verse numbering. Report the exact count and the source, then merge it with OpenBible, recording which source(s) list each link. Do not import an unverified file.
- **D2. Label every link with what supports it:**
  - **Sourced prophecy**
  - **Quotation / same wording**
  - **Shared distinctive words**
  - **Listed in TSK**
  - **Listed by OpenBible users** (with its vote count)

  A link can carry several labels. Nothing is presented as stronger than its evidence.
- **D3. Show all of them, filtered by evidence.**
  - **Connections screen:** a clear filter with "Best evidence" (the current 4,278 text-supported links, the default), "All in Old ↔ New Testament" and "All connections", each showing its live count from the data.
  - **Wheel:** draws whichever set is chosen. Use merged or instanced geometry so 70,000+ threads stay smooth on a mid-range phone, falling back to the strongest links when the phone is slow.
  - **Reader:** shows every connected verse for the open verse, grouped by label.
- **D4. Numbers come from the data.** Every count in the interface, the meta description, the intro, the help text and the store listings is generated at build time from the packs. A test fails if any hard-coded count is found.

## A. Fix wrong connections and word meanings (do this before anything else)

Richard reported wrong threads, connections caused by common words, odd Greek "translations" and too little Hebrew. These are the causes, checked in the code and data on 2026-11-06:

1. **Most threads are weak.** The wheel shows every OpenBible OT↔NT link with 3+ votes: 42,732 rows. OpenBible votes are crowd-sourced. Of all 73,313 OT↔NT links: 937 have 50+ votes, 2,609 have 20–49, 5,514 have 10–19, **33,672 have only 3–9**, and 30,162 have 0–2. So about 79% of what the wheel shows today rests on 3–9 votes.
2. **"Why two passages connect" highlights any shared word.** Shared everyday words ("the Lord", "said", "day") get highlighted, which makes weak links look meaningful.
3. **The key-word panel picks rare words, not important ones,** and shows the raw lexicon entry (src/legacy/app.js `keyWords()` / `keyWordsHtml()`):
   - **Ranking:** words are ranked by TF-IDF, so obscure words win.
   - **Raw definitions:** the 4th field is a scholarly lexicon dump. For Greek it is unreadable for normal users ("Α, α, ἄλφα (which see), τό, indecl.…"). For people's names it is a genealogy.
   - **Mixed lexicons:** at least one Hebrew key sits in the Greek lexicon (`lexg["H0175"]`, Aaron). The lexicons need validating by language.
   - **Unclear origin:** the word data came from the v16 snapshot and is not yet pinned to STEPBible upstream (`docs/DATA.md`, known gap 2).

Fix, as separate small PRs:

- **A1. Connection tiers from real evidence.** Every thread gets one label, computed at build time and stored in the pack:
  - **Quotation:** the NT verse repeats the OT verse. Detect this as a run of 4+ consecutive content words (stop-words removed, after stemming) shared by the two verses in BSB **or** KJV, **and** an OpenBible link exists. Store the matched phrase.
  - **Strong:** 20+ OpenBible votes.
  - **Related:** 10–19 votes.
  - **Weak:** 3–9 votes. Hidden by default and shown only after "Show more connections"; never in Kids or Easy mode.
  - The wheel shows Quotation + Strong by default. The legend says in plain words what each tier means and that votes come from OpenBible users.
  - Test fixtures of well-known quotations must come out as **Quotation**:
    - Matthew 1:23 ← Isaiah 7:14
    - Matthew 2:6 ← Micah 5:2
    - Matthew 27:46 ← Psalm 22:1
    - Acts 8:32–33 ← Isaiah 53:7–8
    - Matthew 4:4 ← Deuteronomy 8:3
    - Romans 1:17 ← Habakkuk 2:4
    - Hebrews 1:5 ← Psalm 2:7
    - John 19:36 ← Exodus 12:46
  - Add a test that common-word-only pairs are never labelled Quotation.
  - Update the 194 v16 reference screenshots **on purpose** in this PR, and explain the change.
- **A2. Honest highlighting.** "Why these connect" highlights only the matched quotation phrase, or for non-quotations the shared *rare content words* (Strong's-based where possible), never stop-words. When there is no textual overlap, say: "Linked by OpenBible users (N votes); no shared wording."
- **A3. Pin the words and lexicons to their source.**
  - **Words:** re-import Hebrew (TAHOT) and Greek (TAGNT) from STEPBible/STEPBible-Data at a pinned commit with checksums, replacing the v16 snapshot.
  - **Lexicons:** validate that every `H…` key is Hebrew and every `G…` key Greek.
  - **Greek definitions:** use the Dodson Greek lexicon (CC0) for short Greek definitions, with STEPBible's TBESG only as a "full entry" link.
  - **Hebrew definitions:** use STEPBible's TBESH short gloss, plus the Enhanced BDB (unfoldingWord, CC BY) for the full entry.
- **A4. Show the Bible's words, in context.**
  - **Interlinear view:** in the reader, each original word shows its contextual gloss, the English the translation actually uses there (already in the data, e.g. "he created"), as the main line. Below it go the transliteration and a 1-line simple meaning. The long definition sits behind "More".
  - **Hebrew is first-class:** every Old Testament chapter gets the same Hebrew word study the New Testament gets in Greek. Show it right to left with correct fonts and pronunciation help.
  - **Key words:** rank by theological weight and frequency **in this chapter** (count ≥ 2, not stop-words, not names), not by rarity. Name people and places separately, linking to their Theographic entries.
- **A5. Data truth tests in CI.**
  - Every displayed connection must trace to a source row.
  - Every gloss must trace to a lexicon or word row.
  - No Greek text appears in a Hebrew panel or the reverse.
  - The build fails otherwise.

## B. Use every usable resource in the PDF

Richard's instruction: use the whole resource directory, not a short list. `docs/RESOURCE_AUDIT.md` sorts all 137 entries. Handle them like this:

- **Tiers 1, 2 and 3 (clean licence):** integrate all of them. Each one feeds a named feature below, is pinned with a checksum, and is credited.
- **Tier 8 (later):** integrate each one whose licence is clean when it fits a feature below. Do not add a heavy library (Cesium, deck.gl, G6) without measuring bundle size and getting Richard's OK.
- **Tier 7 (link only):** add each as an outbound "See it at the source" link on the matching evidence item, place, manuscript or inscription. Never copy their images or text.
- **Tiers 4–6 (non-commercial, GPL code, no licence):** do not import. Where the same content exists under a clean licence, use that instead. For example, for Strong's, Tischendorf or Abbott-Smith (public-domain texts), use STEPBible or Dodson. List what was skipped and why on the Credits screen's "Sources we chose not to use" section.

Feature map (sources by PDF number):

| Feature | Sources |
|---|---|
| Wheel connections and tiers | 001 OpenBible; 003 scrollmapper (MIT) for cross-checks; 004 trekhleb (MIT) to cross-check counts; 016 ETCBC parallels code (MIT; data only if its licence is clean) for OT↔OT parallels such as Samuel–Kings–Chronicles |
| Who is speaking | 014 Clear-Bible speaker-quotations (CC BY) |
| Word study (Hebrew & Greek) | 094 STEPBible; 095/096 MACULA Hebrew/Greek; 015 Clear-Bible Alignments; 077 OpenScriptures morphhb; 080 UXLC; 085 SBLGNT (CC BY 4.0); 103 Dodson; 101 Enhanced BDB; 100 OpenScriptures BDB (public domain); 091 CNTR (verify licence first) |
| People, places, events | 009/010 Theographic; 011 bradystephenson bible-data (CC BY) |
| Map and journeys | 025/026 OpenBible geocoding; 027 UBS MARBLE routes; 031/032 Pleiades; 043 AWMC; 049 Natural Earth; 039 Vici (CC BY-SA); 044 DARE (CC BY-SA); 046 Syriaca (CC BY); 047 MAPA (CC BY-SA); 119 MapLibre or 121 Leaflet |
| Evidence Centre images & records | 065 Met Open Access (CC0 images only); 068 Open Context (CC BY); 059 papyri.info (CC BY); 054 ORACC (CC BY-SA, for Assyrian/Babylonian records that name Bible people) |
| Manuscript viewer | 128 OpenSeadragon / 127 Mirador, only for IIIF images whose licence allows display, otherwise a link |
| Search | 122 Bible Passage Reference Parser; 132 MiniSearch or 133 FlexSearch; 134 Fuse for the book/name picker |
| Graph analysis | 113 Graphology for centrality (which passages are most connected), computed at build time |
| Offline data | 135 sql.js or 137 DuckDB-Wasm, only if measured faster than the current packs |

Each integration PR states: source number, licence, what the user now sees, and how its data was checked.

## 1. Ease of use for every age

A **"How do you like to read?"** choice on first open, which can be changed any time from the menu. Remember the choice locally.

| Mode | For | What changes |
|---|---|---|
| **Standard** | adults | the current app |
| **Easy** | elders, low vision, first-time phone users | text 125–150% larger; high contrast; buttons at least 56 px with icon **and** word labels; one action per screen; no gestures required (everything also has a button); slower, reduced motion; a "Read aloud" button on every verse and card |
| **Kids** | about 6–12 | plain words (reading age 8); big friendly picture cards; the 16-step "Story" as a guided path with "Next" buttons; the 3D wheel spins gently and responds to taps; no debated or disturbing content in this mode; a short "What did you learn?" check after each story step, made with the quiz pattern below |

Across all modes:
- **Text size slider** (A– / A+) and a **light/dark/high-contrast** switch in the menu.
- **Read aloud** using the browser's built-in speech (Web Speech API, free), in English and Telugu where the device supports it. Highlight the line being read. If a voice is missing, say so plainly.
- **Simple view:** a 2D list of books → chapters → connections, for devices without WebGL or for people who find 3D confusing. Every 3D feature must have a non-3D path.
- **Telugu interface option** for all menu and button text, not only the Bible text.
- **Gentle onboarding:** three screens at most, skippable, with a "Show me again" option in the menu.
- **Forgiving controls:** a visible Back button on every screen, an Undo after anything destructive, and no tiny "×" as the only way out.
- **Standard:** meet WCAG 2.2 AA: contrast, keyboard use, screen-reader labels, focus order, `prefers-reduced-motion`, 44 px minimum targets (56 px in Easy mode), and no information shown by colour alone.

Done when: an automated accessibility check (axe) passes on every screen in all three modes, keyboard-only use works, and Playwright tests cover mode switching, text size and read aloud (mocked).

## 2. Evidence Centre screens

Data from PR #4 (approved).
- **Six pillar cards**, each opening its items list.
- **Item detail:** summary; "What this does not show"; a status badge (Verified / Debated); sources as links; linked verses that open the reader; a "View at source" link for copyrighted images (Tier 7: never copy them).
- **"Latest discoveries"**: newest first, with the discovery date and source.
- **Evidence images:** only CC0 or public-domain images, for example from the Met Open Access collection (Tier 1, #065), each credited.
- **Keep filling** the thin Spiritual and Theological pillars with verified items, under the same rules.

## 3. Map of the Bible world

- **Map library:** MapLibre GL JS with free tiles and correct attribution. Use no paid map keys. If a free vector tile source is not reliable, fall back to Leaflet.
- **Places:** from OpenBible Bible-Geocoding-Data (Tier 1, #025), with its confidence scores. Show uncertain places as a circle, not a pin, and say "location debated" in words.
- **Journeys:** UBS MARBLE routes (#027: Exodus, Abraham, Paul's journeys) as animated lines, each with a "Play journey" button that tells the story in steps, kid-friendly in Kids mode.
- **Ancient context (optional layer):** Pleiades (#031/#032) and AWMC coastlines (#043, ODbL: credit and share-alike for the derived layer).
- **Tapping a place** shows its verses, people, events and evidence items.
- **Filters:** Old or New Testament, person, event, journey.
- **Easy mode:** a plain list of places as an alternative to the map.

## 4. Word study

Upgrade the existing Hebrew and Greek feature using STEPBible TAHOT/TAGNT/TBESH/TBESG (#094), MACULA Hebrew and Greek (#095/#096), and the Clear-Bible Alignments (#015):
- **Tap a word** in the English reader to see the original word, its transliteration, a simple meaning and other verses using it.
- **Speaker colouring:** an option to colour text by speaker (God, Jesus, prophets) using Clear-Bible speaker-quotations (#014). Off by default; in Kids mode it is labelled "Who is talking?".
- **Load on demand**, one book at a time, cached for offline use.

## 5. Search that understands people

- **Reference parsing:** use Bible Passage Reference Parser (#122), so "jn 3 16", "John3:16" and "Genesis 1-2" all work.
- **Word search:** MiniSearch (#132), with the index built at build time and loaded only when search opens. Typo-tolerant, with Telugu supported.
- **Voice search:** a microphone button using the browser's speech recognition where available.

## 6. JARVIS guide (back end only)

- **Endpoint:** a Vercel serverless function, `/api/jarvis`, that reads `ANTHROPIC_API_KEY` on the server only. Model: Claude Haiku 5.5.
- **Answers:** only from the app's own data (verses, cross-references, evidence items, places), citing them. If the data does not support an answer, it says so. Kids mode gets simple language; Easy mode gets short answers plus read aloud.
- **Limits:** a rate limit per visitor, input and output length caps, and a friendly message when a limit is hit. Log usage counts only, never what people typed.
- **Without the key** the button shows "Coming soon" and nothing else breaks.
- **Tests:** mock the API and test the citation check and the refusal path.

## 7. Offline and app stores (prepare, don't publish)

- **Offline:** a PWA with an offline shell plus the last-read book and the user's chosen versions.
- **Store builds:** set up Capacitor for Android and iOS. Make sure it is a real app experience (offline reading, read aloud, settings), not just a wrapped website, because Apple guideline 4.2 rejects wrappers.
- **Assets:** prepare store screenshots, a privacy policy page and a data-safety answer sheet, all in `docs/store/`. Do not submit; Richard will.

## 8. Quality bar for everything above

- **Tests:** unit tests for data and logic; Playwright for each screen in all three modes; and accessibility checks with axe.
- **CI:** lint and format check in CI (its own small PR, first).
- **Speed:** a Lighthouse check on the preview, with mobile scores of Performance ≥ 85 and Accessibility ≥ 95, and the results posted in the PR.
- **Engineering look:** consistent spacing, type scale and colour tokens taken from the current design. No generic template look, and no emoji as icons.

## Skills and tools to use (if your session has them)

Use whichever of these are installed; skip any that aren't, and say which you used in each PR.

- **Planning and delivery:** `agent-engineering:plan-change`, `deliver-change`, `review-change`, `verify-change`; `zizi-skills:git-sync`.
- **Accessibility and all-ages UX:**
  - `ui-consistency` phases (finding-patterns → planning → implementing → verifying) and `ui-consistency:accessibility`
  - `design-skills:accessibility-audit`, `design:accessibility-review`, `agentic-council:a11y-audit`
  - `design-skills:ux-writing` / `design:ux-copy` and `zizi-skills:plain-language` for kid and elder wording
  - `zizi-skills:i18n` for the Telugu interface
- **Front end and design:** `zizi-skills:frontend`, `zizi-skills:design-guide`, `design-skills:design-critique`, `modern-web-guidance`, `frontend-design`.
- **Quality:**
  - `mattpocock-skills:tdd` or `zizi-skills:tdd-skill`
  - `craftsman-e2e-testing`
  - `mattpocock-skills:code-review` / `engineering:code-review`
  - `tuner-performance-audit`
  - `cloudflare:web-perf` (performance ideas only; we host on Vercel)
- **Data and back end:**
  - `zizi-skills:database-optimization` and `source-driven-development`
  - `oracle-rag-architecture` and `oracle-prompt-engineering` for JARVIS
  - `zizi-skills:security-and-hardening` and `skeptic-threat-model` for `/api/jarvis`
- **Stores and SEO:** `zizi-skills:app-store` and `pathfinder-platform-audit` for stage 7; `searchfit-seo:technical-seo` and `schema-markup` for the web pages.
- **Connectors:** Vercel (deploy status, logs, env), and Supabase (only if a hosted database becomes needed; ask first, since it costs nothing on the free tier but pauses when idle).
