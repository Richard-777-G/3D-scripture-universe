# Scripture Universe design system

Status: **draft for Richard's approval** (brief Section C2). The prototype on the `proto/redesign` branch follows this file. Nothing ships to the live app until Richard approves the prototype.

## Who it is for

One app, used comfortably by:

- **Children (7–12):** big pictures and buttons, short words, the Story first.
- **Young people and adults:** fast reading, search, connections, original-language words.
- **Elders (75+, often with poor eyesight):** large clear text, big tap targets, read aloud, no hidden gestures, a Back button on every screen.
- **Anyone using a screen reader, a keyboard, voice control, or only one hand.**

Everyone gets the same app. Three **reading modes** change size and how much is shown on each screen, never what is available:

| Mode | Body text | Tap targets | What changes |
|---|---|---|---|
| Standard | 18 px | 48 px | All features on screen |
| Easy | 22 px | 56 px | One main action per screen, shorter words, a Read aloud button on every verse, connections shown as a list first, the 3D wheel on request |
| Kids | 20 px | 56 px | Story first, picture cards, simplest words (reading age 7–9), no original-language detail unless asked |

Size and mode are separate settings. Changing theme or mode never resets text size (as in Apple Books). Text size goes from 16 px to 32 px, with no low cap.

## Where the patterns come from

A research pass looked at the YouVersion Bible App, Dwell, Apple Books and the GOV.UK Design System. Its sources were search summaries of public pages; the pages themselves could not be opened from the build environment, so treat these as reported patterns, not verified ones.

- **Kept:**
  - Body text of 19 px or more in rem units (GOV.UK).
  - Small-A and large-A buttons for text size, kept separate from the theme (Apple Books, Dwell).
  - A few themes, each a complete bundle (Apple Books).
  - Read-along highlighting of the spoken verse (Dwell).
  - One short action list when a verse is tapped (YouVersion).
  - A daily verse and "continue reading" on Home (YouVersion).
  - A labelled Back link at the top (GOV.UK).
  - Narrated, picture-led stories for children (Bible App for Kids).
- **Avoided:**
  - Changing tab labels or order once people know them.
  - Hiding basic text settings several taps deep.
  - Capping text size low.
  - Streaks that make people feel guilty.
  - Paywalls.
- **Not copied:** no other app's branding, colours, illustrations or words.

## Colour

A warm neutral scale, one action colour, and one accent. The scene colours of the 3D wheel stay as they are.

| Token | Paper (light, default) | Night (dark) | Role |
|---|---|---|---|
| `--bg` | `#fbf8f2` | `#0f1218` | Page background |
| `--surface` | `#ffffff` | `#171b23` | Cards, sheets, bars |
| `--surface-2` | `#f3eee4` | `#1f2430` | Pressed and selected rows, inputs |
| `--line` | `#ddd5c6` | `#2e3442` | Borders and dividers |
| `--ink` | `#1d1b17` | `#f3efe6` | Main text (16:1 on `--bg`) |
| `--ink-2` | `#4f4a40` | `#c4bdae` | Secondary text (8:1 on `--bg`, AAA) |
| `--action` | `#1f4f8f` | `#9cc2ff` | Buttons, links, focus ring, the selected tab |
| `--on-action` | `#ffffff` | `#0b1626` | Text on action colour |
| `--accent` | `#875a0c` | `#f2d47a` | Brand gold: headings in the Story, the verse of the day, highlights |
| `--ot` | `#2a6db3` | `#5fb6ff` | Old Testament (data views only) |
| `--nt` | `#b07c12` | `#f2d47a` | New Testament (data views only) |
| `--ok` / `--warn` / `--bad` | `#2e7d4f` / `#9a5b00` / `#b3261e` | `#7fd6a0` / `#ffc46b` / `#ff8a80` | Location known / likely / debated, status messages |

- **High contrast** is a third theme: pure black on white or white on black, with the action colour at 7:1.
- **Contrast:** every text pair meets WCAG 2.2 AA; body text in Easy mode meets AAA (7:1).
- **Never colour alone:** every colour that carries meaning also has a word or an icon.

### Evidence labels (connections)
Each label is a small badge with an icon and its words. A link can carry several.

| Label | Icon | Colour (Paper) |
|---|---|---|
| Sourced prophecy | scroll | `--ok` |
| Same wording | quote marks | `--action` |
| Shared distinctive words | link | teal `#0f766e` |
| Listed in TSK | book | purple `#6b4fa0` |
| Listed by OpenBible users (n votes) | people | `--ink-2` |

## Typography

| Use | Family | Why |
|---|---|---|
| Interface | Inter | Very legible at small sizes; already loaded |
| Bible text | Source Serif 4 | A calm book face with large x-height; already loaded |
| Hebrew | Noto Serif Hebrew | Pointed Hebrew, right to left |
| Greek | Source Serif 4 (Greek glyphs) | |
| Telugu | Noto Sans Telugu | Full Telugu shaping |

The scale is in `rem` on a root size set by the mode (18 / 22 / 20 px), so the in-app size control and the phone's own text size both work.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--t-xs` | 0.78rem | 1.4 | Badges, map credits |
| `--t-sm` | 0.89rem | 1.5 | Secondary lines |
| `--t-base` | 1rem | 1.6 | Body and Bible text |
| `--t-md` | 1.125rem | 1.5 | Card titles, list titles |
| `--t-lg` | 1.33rem | 1.3 | Screen titles |
| `--t-xl` | 1.6rem | 1.25 | Home greeting, chapter headings |
| `--t-2xl` | 2rem | 1.2 | Verse of the day, Kids headings |

- **Weights:** 400 for text, 600 for titles and buttons, 700 only for the greeting.
- **Line length:** reading text is held at 65 characters or fewer; desktop centres the reading column.
- **Small text:** nothing in the interface is smaller than 0.78rem (14 px in Standard).

## Spacing, shape and depth

- **Spacing:** a 4 px base: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48, `--s8` 64.
- **Screen padding:** 16 px on phones and 32 px on desktop.
- **Tap targets:** `--tap` is 48 px in Standard and 56 px in Easy and Kids. Targets sit at least 8 px apart.
- **Radius:** `--r-sm` 8 (inputs, badges), `--r-md` 14 (cards, buttons), `--r-lg` 22 (sheets), `--r-full` (pills).
- **Depth:** two shadows only.
  - `--e1` for cards: `0 1px 2px rgb(0 0 0 / .06), 0 2px 8px rgb(0 0 0 / .05)`
  - `--e2` for sheets and dialogs: `0 8px 32px rgb(0 0 0 / .18)`
  - Night uses borders instead of shadows.

## Layout and navigation

- **Phones:**
  - A top bar with Back (always labelled, for example "‹ Genesis 3"), the screen title, Search and the text-size button (Aa).
  - A bottom bar with five tabs, each an icon **and** a word: **Home · Read · Story · Connections · Places**.
  - The labels and their order never change.
- **Desktop (900 px and wider):**
  - The same five tabs move to a left side rail.
  - Detail opens in a right-hand panel instead of a bottom sheet.
- **One job per screen.** Every screen has one main action and a visible Back.
  - There are no floating panels over the 3D view on phones.
  - There are no hidden gestures: every swipe or pinch also has a button.
- **Sheets:**
  - **Phones:** a tapped verse or place opens a bottom sheet with a title, a Close button and at most five actions. Its height steps are half and full, with no peeking strip.
  - **Desktop:** the same content opens in the side panel.
- **Search** is in the top bar on every screen. It accepts words, names and references ("John 3:16", "Jn 3 16", "Bethlehem").
- **Evidence** lives inside Places and inside every verse's sheet.

## Components (React Aria Components)

React Aria supplies focus handling, keyboard support, screen-reader labels, and touch behaviour that does not fire on scroll. We supply the look, using the tokens above.

| Component | Built on | Notes |
|---|---|---|
| Button | `Button` | Three kinds. **Primary:** filled action colour, one per screen. **Secondary:** outlined. **Quiet:** text only. Each has hover, pressed, focus (3 px action ring with 2 px offset) and disabled states. Icon buttons always carry a visible word, or an `aria-label` plus a tooltip where space is very tight. |
| Big card | `Link` | Home cards: an icon (40 px), a title and one plain sentence; the whole card is the target; at least 96 px tall. |
| Tabs (bottom bar or side rail) | `Link` with `aria-current` | Icon 24 px above a word in `--t-sm`; the selected tab uses `--action` and a top bar indicator. |
| Segmented choice | `ToggleButtonGroup` | Evidence filter ("Best evidence / All Old ↔ New / All"), Testament filter, reading mode; each option shows its live count. |
| Text size | two `Button`s (A− / A+) plus a `Slider` | In the Aa panel together with theme and mode. |
| Sheet / side panel | `Modal` + `Dialog` | Focus moves into the sheet and back again; Esc and the Close button both close it. |
| Lists | `GridList` | Verse lists, place lists, connected verses; each row at least 56 px tall; keyboard arrows move between rows. |
| Search | `SearchField` | Clear button, recent searches. |
| Disclosure | `Disclosure` | Questions and answers, "More about this word". |
| Badge | plain `span` | Evidence labels, location confidence; icon plus word. |
| Read aloud | `ToggleButton` | Uses the browser's own speech (Web Speech API, free, works on the device); the spoken verse is highlighted. |

## Icons and pictures

- **Icons:** Lucide (ISC licence), 24 px outline at 1.75 stroke, always next to a word.
- **Book covers:** the existing original cover drawings.
- **Kids pictures:** simple, original flat illustrations made for this app. No AI-generated look-alikes of other apps' characters.
- **Photos:** CC0 or public domain only (for example the Met Open Access), each credited.
- **Emoji:** never used as icons.

## Motion

- 150–200 ms ease-out for sheets and screen changes; no bouncing.
- **Reduced motion** (`prefers-reduced-motion`): the wheel stops spinning, map moves jump instead of glide, and "Play journey" shows the whole route at once.
- Nothing moves on its own except the wheel's slow turn, and that can be paused.

## Words

- Use plain words: "Connected verses" (not cross-references), "Original language" (not lexicon), "Same wording" (not quotation tier), "Where it was" (not geocode).
- Buttons say what happens: "Read John 3", "Play journey", "Show all 345,628 connections". Every number comes from the data.
- Easy mode aims for reading age 9 and Kids mode for 7–9. Use short sentences and one idea each.
- Back buttons name where they go: "‹ Home", "‹ John 3".

## Accessibility checklist (every screen)

- WCAG 2.2 AA, with the contrast and target sizes above.
- Every action works by touch, mouse, keyboard (visible focus) and screen reader (names, roles, live updates).
- Pages zoom to 200 % and the phone's own large text with no horizontal scrolling at 320 px wide.
- Seven timed tasks are run before a screen ships (brief C4).
