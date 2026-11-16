# Scripture Universe design system

Status: **version 2, draft for Richard's approval** (brief Section U, step 2). Version 2 applies Richard's answer of 16 Nov 2026: **both Night and Light themes, and a fresher, cleaner, more professional and official look.** Nothing on screen changes until he says yes. After that, each section of the live app moves onto this system in its own PR (reader and connections first), with the 3D wheel always visible and `wheel-safety.spec.ts` green.

The rule: **keep the soul people already know** (deep space, glowing threads, gold) and dress everything around it like an official, well-made product: crisp surfaces, one clear accent, quiet type, generous space, consistent for every age.

## 1. Why: what the live app uses today

An audit of `src/styles.css` on 16 Nov 2026 (240 lines) found:

| What | In use today | In this system |
|---|---|---|
| Colours | about 40 different values | 12 roles per theme |
| Font sizes | 18 sizes, mostly 11–15 px | 7 steps, body 18 px or larger |
| Corner sizes | 10 | 4 |
| Spacing | written by hand on each element | one 4 px scale |
| Buttons | about 6 hand-made styles (chips, pills, `.btn`, `.btn.p`, `.photo`, `.vnote a`) | 3 kinds and 1 chip |

That is why screens feel made one at a time. Body text of 11–15 px is also too small for older readers; the brief asks for at least 18 px.

## 2. Who it is for

**Children** (7–12), **young people**, **adults** and **elders** (75+, often with weak eyesight), by touch, mouse, keyboard, voice control or screen reader. Everyone gets the same app. A **reading mode** changes size and how much each screen shows, never what is available:

| Mode | Body text | Tap targets | What changes |
|---|---|---|---|
| **Standard** | 18 px | 48 px | All details on screen |
| **Easy** | 22 px | 56 px | One main action per screen; a Listen button on every verse; shorter words (reading age about 9); connections as a list first, the wheel one tap away |
| **Kids** | 20 px | 56 px | Story first; simplest words (reading age 7–9); original-language detail only when asked |

- **Text size** (A− / A+, 90 % to 180 %) is separate from mode and theme. Changing one never resets the others.
- **Themes: Night and Light, both first-class**, plus **High contrast**.
  - **Night:** deep space panels, today's soul, made cleaner.
  - **Light:** crisp white panels on a cool, near-white page, like an official reading app; best in daylight and for printing.
  - **Default:** the app follows the phone's own light or dark setting the first time, and one tap in **Aa** switches it. The choice is remembered.
  - **The 3D universe stays deep space in both themes** (the stars, wheel and threads need the dark). In Light, the panels, menus, reader and Simple view turn light.

## 3. Tokens

There are three tiers. Components use only the **semantic** names, never raw values. Everything lives in one CSS file of custom properties, `src/ui/tokens.css`, added in the first section PR.

### 3.1 Colour (semantic tokens)

| Token | Night | Light | Role |
|---|---|---|---|
| `--bg` | `#070a12` | `#f6f7f9` | Page background (the 3D space stays dark in both) |
| `--surface` | `#0e131d` | `#ffffff` | Panels, bars, sheets |
| `--surface-2` | `#151b27` | `#eef1f5` | Cards, selected rows, inputs |
| `--line` | `#263042` | `#d8dde5` | Borders and dividers, one pixel |
| `--ink` | `#f4f1ea` | `#111827` | Main text (16.5:1 / 17.7:1 on surface) |
| `--ink-2` | `#c9c3b6` | `#374151` | Secondary text (10.6:1 / 10.3:1) |
| `--ink-3` | `#98a0ae` | `#5b6472` | Hints and captions (7.1:1 / 6.0:1); never for anything you must read to act |
| `--gold` | `#f0cf74` | `#8a6200` | Brand: the name, the selected tab, verse numbers, the one primary button per panel (Night) |
| `--action` | `#8fbcff` | `#1e4fa3` | Links, focus ring, secondary buttons; the primary button in Light (9.6:1 / 7.8:1) |
| `--on-gold` / `--on-action` | `#070a12` | `#ffffff` | Text on a filled gold or blue button |
| `--ot` / `--nt` | `#5fb3ff` / `#f0cf74` | `#1e4fa3` / `#8a6200` | Old and New Testament, in data views only (the wheel keeps its own colours) |
| `--ok` / `--warn` / `--bad` | `#7fd8a6` / `#f5c26b` / `#ff9b8a` | `#1f6b45` / `#8a5200` / `#a3261a` | Location known / likely / debated; success / caution / error messages |

**Why it now looks more official:**
- **One accent per theme.** Gold leads in Night; a deep, trustworthy blue leads in Light, with gold kept for the brand and verse numbers.
- **Neutral greys** with a hint of blue, instead of warm browns, for a crisp, modern feel.
- **Flat surfaces.** Hairline borders, no glows or gradients on panels; light stays in the 3D scene, where it belongs.
- **Serif headings** for a calm, book-like authority (see Type).

- **High contrast:** pure black and white, with gold and blue at 7:1 or more.
- **Contrast checked:** every text pair above meets WCAG 2.2 AA, and the main text meets AAA.
- **Never colour alone:** every colour that carries meaning also has a word or an icon.

**Evidence labels** (connections) are badges, each with an icon and its words:

| Label | Icon | Colour |
|---|---|---|
| Sourced prophecy | scroll | `--ok` |
| Same wording | quote marks | `--action` |
| Shared rare words | link | teal (`#5eead4` Night, `#0f6b62` Light) |
| Listed in TSK | book | violet (`#c4b5fd` Night, `#5b3f99` Light) |
| Listed by readers (n votes) | people | `--ink-2` |

### 3.2 Type

| Use | Family | Today |
|---|---|---|
| Brand name | Cormorant Garamond | already used for "Scripture Universe" |
| Headings (screen, book, chapter, section titles) | Source Serif 4, semibold | already loaded; gives an official, book-like voice |
| Interface (buttons, labels, body of panels) | Inter | already loaded |
| Bible text | Source Serif 4 | already loaded; a calm book face with a large x-height |
| Hebrew | Noto Serif Hebrew (right to left) | already loaded |
| Telugu | Noto Sans Telugu | already loaded |

The scale is in `rem` on a root size set by the mode: Standard 18 px, Easy 22 px, Kids 20 px, multiplied by the text-size setting. So both the in-app A+ and the phone's own text size work.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--t-xs` | 0.78rem (14 px) | 1.4 | Badges, map credits; the smallest text anywhere |
| `--t-sm` | 0.89rem (16 px) | 1.5 | Secondary lines, captions |
| `--t-base` | 1rem (18 px) | 1.6 | Body and Bible text |
| `--t-md` | 1.125rem | 1.5 | Card and list titles |
| `--t-lg` | 1.33rem | 1.3 | Panel titles |
| `--t-xl` | 1.6rem | 1.25 | Book and chapter headings |
| `--t-2xl` | 2rem | 1.2 | Verse of the day, Kids headings |

- **Weights:** 400 for text, 600 for headings, buttons and the selected tab. No all-capitals headings except the small section labels (`--t-xs`, letter-spaced).
- **Line length:** reading text is held at 65 characters or fewer.

### 3.3 Space, shape, depth, motion

- **Space:** 4 px steps: `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 48.
- **Screen padding:** 16 px on phones and 24 px on desktop panels.
- **Tap targets:** `--tap` is 48 px (56 in Easy and Kids), at least 8 px apart.
- **Corners:** `--r-sm` 8 (inputs, badges), `--r-md` 12 (buttons, cards), `--r-lg` 20 (sheets), `--r-full` (pills and chips). These replace the 10 values in use today.
- **Depth:** one shadow, `--e1` (Night `0 8px 24px rgb(0 0 0 / .45)`, Light `0 8px 24px rgb(17 24 39 / .12)`), for sheets and popovers over the wheel. Cards use a one-pixel border instead.
- **Motion:** 160–200 ms ease-out; no bounce.
  - With `prefers-reduced-motion`, the wheel stops its slow turn, the camera jumps instead of gliding, and "Play journey" shows the whole route at once.
  - The gold "Start" glow is the only looping animation, and it stops after three loops.

## 4. Layout

- **The wheel stays the main screen.** On desktop it fills the left; panels open on the right (420 px wide) so the wheel stays in view. On phones, panels are bottom sheets with two heights (half and full) and a visible **Close**. The wheel stays behind them, one tap away.
- **Phone navigation:** a bottom bar with five labelled tabs (icon **and** word) that never move: **Home · Read · Story · Connections · Places**.
  - Search and **Aa** (text and display) sit at the top of every panel.
  - Evidence lives inside Places and inside every verse.
- **Desktop navigation:** the same five tabs in a slim left rail.
- **Every panel** has one main action and a **Back** that says where it goes ("‹ Isaiah").
- **No hidden gestures.** Every drag or pinch on the wheel also has a button: turn, zoom in, zoom out, reset view.

## 5. Components

The interactive parts come from **React Aria Components**. They supply focus handling, keyboard support, screen-reader names, and touch behaviour that does not fire while scrolling. We supply the look, from the tokens above. Each section PR adds only the components it uses.

| Component | Built on | Variants | Notes |
|---|---|---|---|
| **Button** | `Button` | primary (filled: gold in Night, blue in Light; one per panel), secondary (outlined blue), quiet (text) | States: hover, pressed, focus (3 px blue ring, 2 px gap), disabled, loading (spinner plus "Loading…") |
| **Chip** | `ToggleButton` | — | Choices such as chapters or books. Its spoken name is written out ("Chapter 53, 16 connections"), fixing today's "5316" |
| **Segmented choice** | `ToggleButtonGroup` | — | "Best evidence · 4,278 / All Old ↔ New / All", Testament filters, modes; each option shows its live count from the data |
| **Panel / sheet** | `Modal` + `Dialog` | — | Title, Back, Close; Esc closes it; focus moves in and returns to where it was |
| **List row** | `GridList` | — | At least 56 px tall; arrow keys move between rows; used for verses, places and connections |
| **Verse** | `Button` | — | Number in gold, text in Source Serif; tapping opens the verse sheet; the spoken verse is highlighted |
| **Badge** | `span` | — | Evidence labels, location confidence; icon plus word |
| **Search field** | `SearchField` | — | Clear button; accepts "John 3:16", "jn 3 16", "Bethlehem", "shepherd" |
| **Text and display (Aa)** | `Dialog` | — | A− / A+, mode, theme, Bible version |
| **Notice** | `div role=status` | — | Loading, empty, error and offline messages, always in words with a next step ("Try again") |

**States every screen must have:** loading, empty ("No connected verses are recorded for this verse"), error (what happened and a Try again button) and offline (what still works).

## 6. Icons and pictures

- **Icons:** Lucide (ISC licence), 24 px outline, always beside a word.
- **Book covers:** the existing original drawings.
- **Photos and videos:** only where the licence allows copying (CC0 or public domain, for example the Met Open Access), each credited. Otherwise a labelled "See it at the source" link.
- **Kids pictures:** simple original illustrations made for this app. No emoji as icons.

## 7. Words

- **Plain words:**

  | Use | Not |
  |---|---|
  | Connected verses | cross-references |
  | Original language | lexicon |
  | Same wording | quotation tier |
  | How sure scholars are | confidence score |

- **Buttons say what happens:** "Read Isaiah 53", "Play journey", "Show all 112". Every number comes from the data.
- **Back buttons name their destination:** "‹ Home", "‹ Isaiah 53".

## 8. Accessibility checklist (every PR)

- WCAG 2.2 AA, with the contrast figures and target sizes above.
- Every action works by touch, mouse, keyboard (visible focus) and screen reader (names, roles, live updates).
- The layout holds at 200 % zoom and with the phone's large text, with no sideways scrolling at 320 px.
- The seven first-time tasks (open John 3:16, bigger text, read aloud, Old Testament connections, find Bethlehem, start the story, back to Home), each under 30 seconds.
- An axe scan with no serious problems; `wheel-safety.spec.ts` green.

## 9. How it is kept consistent

- **Tokens in one file.** A test fails if a component file contains a raw colour or pixel size.
- **One component per job.** A new component needs a written purpose, its states and its keyboard behaviour here before it is built.
- **Changes start here.** Any change to the system starts in this file, in its own PR, and is then applied to the screens.
