# Scripture Universe

An interactive 3D map of how the whole Bible points to Jesus Christ. The 66 books sit on two rings, with the Old Testament below and the New Testament above, and more than 40,000 cross-references link them. It includes a guided 16-step story, historical evidence, and a Bible reader with several versions (including Telugu) and the original Hebrew and Greek words.

**Status:** Phase 1 (Foundation) of the production plan in the handover document. The app behaves exactly as v16; underneath, it is now a Vite + TypeScript project with its data in versioned packs, a validated data pipeline, a Postgres schema and automated tests.

## Run it

Needs Node 22.

```bash
npm install
npm run dev          # builds the data packs, then serves on http://localhost:5173
```

## Build and test

```bash
npm run build        # validate data -> write packs -> typecheck -> bundle into dist/
npm test             # unit tests: verse keys and data validation
npm run test:e2e     # Playwright: 66 use-case tests on desktop and phone (run build first)
npm run test:db      # Postgres: apply schema, load all data, run checks
```

The first time you run the end-to-end tests on your own computer, install the browser with `npx playwright install chromium`.

GitHub Actions runs all of these on every pull request (`.github/workflows/ci.yml`).

## Deploy

Vercel builds the site with `npm run build` and serves `dist/` (see `vercel.json`). Data packs are named by content hash and cached for a year; `data/manifest.json` is always checked fresh, so a data change reaches users without a new app release.

## How it is organised

| Path | What it holds |
|---|---|
| `index.html`, `src/styles.css` | The page and styles, split out of v16 unchanged |
| `src/main.ts` | Start-up: loads the data, shows a retry screen if it can't |
| `src/data/loader.ts` | Reads `data/manifest.json` and the packs |
| `src/data/verse.ts` | Verse numbering and the database verse key (John 3:16 = 43003016) |
| `src/legacy/app.js` | The v16 app code (3D scene, panels, story, evidence, search, library, reader), unchanged apart from where its data comes from |
| `content/*.json` | Curated content, edited by hand: journeys, story, evidence, Q&A |
| `data/raw/v16/` | The v16 data snapshot (Bible versions, cross-references, Hebrew/Greek words, lexicons) |
| `data/sources.json` | Licence and attribution for every dataset. The build fails if a pack has none |
| `pipeline/` | `build-packs.mjs` (validate + write packs), `validate.mjs` (the checks), `export-db.mjs` (Postgres load files), `migrate-v16.mjs` (the one-off split of v16) |
| `supabase/migrations/` | Postgres schema: reference data, curated content with review status, people/places/events, optional user tables with row-level security |
| `tests/` | `unit/`, `e2e/`, `db/`, and `parity/` (compares every screen with v16) |

See `docs/DATA.md` for data notes and known gaps.

## Data sources

- Cross-references: OpenBible.info (CC BY)
- Hebrew/Greek: STEPBible TAHOT/TAGNT and lexicons (CC BY 4.0)
- Texts: KJV, ASV, BBE, YLT, Darby, Webster and Telugu (Old Version), all public domain
