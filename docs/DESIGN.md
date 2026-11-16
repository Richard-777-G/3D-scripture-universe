# Scripture Universe design system

Status: **draft for Richard's approval** (brief step 2). Nothing on screen changes until he says yes. After that, each section of the live app moves onto this system in its own PR (reader and connections first), with the 3D wheel always visible and `wheel-safety.spec.ts` green.

The rule: **keep the look people already know** (deep night sky, warm text, gold) and make it consistent, readable and calm for every age.

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
- **Themes:** **Night** (default: today's look), **Day** (warm paper, for reading in daylight) and **High contrast**.

## 3. Tokens

There are three tiers. Components use only the **semantic** names, never raw values. Everything lives in one CSS file of custom properties, `src/ui/tokens.css`, added in the first section PR.

### 3.1 Colour (semantic tokens)

| Token | Night (default) | Day | Role |
|---|---|---|---|
| `--bg` | `#05070d` | `#f7f4ec` | Behind everything; the wheel's sky |
| `--surface` | `#10141d` | `#ffffff` | Panels, bars, sheets |
| `--surface-2` | `#141a26` | `#efe9dc` | Cards, selected rows, inputs |
| `--line` | `#2a2f3a` | `#d9d1c0` | Borders, dividers |
| `--ink` | `#f1eee6` | `#1b1a17` | Main text (Night 15.9:1 on surface) |
| `--ink-2` | `#cfc8b8` | `#4d483e` | Secondary text (11:1 / 9:1) |
| `--ink-3` | `#9a9486` | `#6a6457` | Hints, captions (6.1:1 / 5.9:1); never for anything you must read to act |
| `--gold` | `#f2d47a` | `#7a5400` | Brand: titles, the selected tab, highlights, the "start" call to action |
| `--action` | `#9bc7ff` | `#1d4f91` | Links, focus ring, secondary buttons (10.5:1 / 8.1:1) |
| `--on-gold` / `--on-action` | `#05070d` | `#ffffff` | Text on filled gold or blue |
| `--ot` / `--nt` | `#25b7ff` / `#f2d47a` | `#1d4f91` / `#7a5400` | Old and New Testament, in data views only (the wheel keeps its own colours) |
| `--ok` / `--warn` / `--bad` | `#8fe3b5` / `#ffc46b` / `#ff9e8a` | `#1f6b45` / `#8a5200` / `#9b2c1f` | Location known / likely / debated; success / caution / error messages |

- **High contrast:** pure black and white, with gold and blue at 7:1 or more.
- **Contrast checked:** every text pair above meets WCAG 2.2 AA, and the main text meets AAA.
- **Never colour alone:** every colour that carries meaning also has a word or an icon.

**Evidence labels** (connections) are badges, each with an icon and its words:

| Label | Icon | Colour |
|---|---|---|
| Sourced prophecy | scroll | `--ok` |
| Same wording | quote marks | `--action` |
| Shared rare words | link | teal (`#5eead4` Night, `#0f6b62` Day) |
| Listed in TSK | book | violet (`#c4b5fd` Night, `#5b3f99` Day) |
| Listed by readers (n votes) | people | `--ink-2` |

### 3.2 Type

| Use | Family | Today |
|---|---|---|
| Brand name | Cormorant Garamond | already used for "Scripture Universe" |
| Interface | Inter | already loaded |
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

- **Weights:** 400 for text, 600 for titles, buttons and the selected tab.
- **Line length:** reading text is held at 65 characters or fewer.

### 3.3 Space, shape, depth, motion

- **Space:** 4 px steps: `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 48.
- **Screen padding:** 16 px on phones and 24 px on desktop panels.
- **Tap targets:** `--tap` is 48 px (56 in Easy and Kids), at least 8 px apart.
- **Corners:** `--r-sm` 8 (inputs, badges), `--r-md` 12 (buttons, cards), `--r-lg` 20 (sheets), `--r-full` (pills and chips). These replace the 10 values in use today.
- **Depth:** one shadow, `--e1: 0 8px 24px rgb(0 0 0 / .45)`, for sheets and popovers over the wheel. Cards use a border instead.
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
| **Button** | `Button` | primary (filled gold, one per panel), secondary (outlined blue), quiet (text) | States: hover, pressed, focus (3 px blue ring, 2 px gap), disabled, loading (spinner plus "Loading…") |
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
