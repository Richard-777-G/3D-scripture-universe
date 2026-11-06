# Next-level brief: Scripture Universe for every age

Owner: Richard. Written 2026-11-06. This is the working spec for the next stage. Work through it in order. Each numbered stage is its own pull request (or a short series), merged only when green.

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

## 1. Ease of use for every age (do this first)

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
