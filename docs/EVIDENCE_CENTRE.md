# Evidence Centre: proposal

Status: **proposal for review**. The data model, validation and first batch of content are in this branch; the screens are built after the content is approved.

## What it is

A section of the app that answers "is the Bible true?" through six pillars of evidence. Every item is sourced, every item says plainly what it does **not** show, and debated claims are labelled as debated. JARVIS (see `docs/JARVIS.md`) explains any item in more depth, answering only from this data. The whole centre is free, with no paywall.

| # | Pillar | The question it answers |
|---|---|---|
| 1 | Spiritual | Did what the Bible promised come true, and does it change lives? |
| 2 | Historical | Do writers outside the Bible confirm its people and events? |
| 3 | Scientific | What do scientific methods say about the Bible's world? |
| 4 | Theological | Does the Bible hold together as one story? |
| 5 | Archaeological | Has the ground confirmed the Bible's people and places? |
| 6 | Geographical | Where did it happen? Can I see it on a map? |

## Data model

Content lives in `content/evidence-centre/` and goes through the same pipeline as everything else (validation, packs, database, Credits).

| File | Holds |
|---|---|
| `pillars.json` | The six pillars: title, question, scope |
| `items.json` | Evidence items (below) |
| `existing-map.json` | The pillar for each of the 26 evidence cards already in the app |

Each item has:

| Field | Meaning |
|---|---|
| `id`, `pillar`, `kind` | Kind is one of prophecy, testimony, text, manuscript, study, argument, artifact, inscription, site, tomb |
| `title`, `summary` | Plain-language description, written for this app |
| `shows` | What the evidence supports |
| `limits` | What it does **not** show (required, at least 20 characters) |
| `era`, `yearFrom`, `yearTo` | Date in words, and as years (negative for BC) only where a source gives them |
| `discovered` | Year of discovery or publication, for the "latest discoveries" view |
| `place` | Place name; matched to the 1,298 Theographic places for the map |
| `verses` | Linked passages, e.g. `"2 Kings 18:13-16"` (each one is checked to exist) |
| `strength` | strong, moderate, preliminary, debated, tradition or testimony |
| `sources` | At least two, each with title, publisher and https URL |
| `videos` | YouTube documentaries (empty until curated, see below) |
| `status`, `reviewedBy` | draft, in_review or published; publishing requires a named reviewer |

Database: `supabase/migrations/0004_evidence_centre.sql` adds `evidence_items` with its sources, verses and videos. The public can read published items only. It also adds a `testimonies` table for later: user-submitted, moderated, with recorded consent, deletable, and unused until accounts exist.

Fulfilled prophecies use the existing `prophecies` table, seeded from the 41 sourced journeys already in the app. `years_before` stays empty unless a source gives it.

## The rules the build enforces

`pipeline/evidence-centre.mjs` fails the build if any item:

- has fewer than two sources, or a source without a title, publisher or https URL
- has no `limits`, or is marked debated or preliminary without saying so
- links to a verse that doesn't exist
- is published without a named reviewer
- has a video link that isn't YouTube

## First batch for review: 56 items

`docs/evidence-review.md` lists every item with its sources (regenerate with `npm run evidence:review`).

- **26 existing** evidence cards, now assigned to pillars.
- **30 new drafts**, each written from sources found and checked in November 2026:

| Pillar | New items |
|---|---|
| Historical (7) | Tacitus; Josephus on James; Josephus' Testimonium (debated); Josephus on John the Baptist; Pliny; Suetonius (debated); 5,800+ New Testament manuscripts |
| Archaeological (10) | Garden under the Holy Sepulchre (2025, preliminary); Hezekiah's seal (2015); Pilgrimage Road (2019); crucified man's heel bone; Sennacherib's prism; Jehoiachin's ration tablets; Galilee boat; Magdala synagogue; Babylonian Chronicle of 597 BC; Mount Ebal tablet (debated) |
| Geographical (8) | Tomb in the Holy Sepulchre dated (2016); Herod's tomb (debated); El-Araj/Bethsaida (debated); Shiloh (preliminary); Capernaum; Cave of the Patriarchs; Garden Tomb (debated); Rachel's Tomb |
| Scientific (3) | Hezekiah's tunnel dated in the lab; Dead Sea Scrolls radiocarbon dating; the universe's beginning (data plus argument, labelled as argument) |
| Theological (1) | One story across both Testaments |
| Spiritual (1) | Augustine's Confessions (published testimony) |

### What was left out, and why

- **"About 40 authors over 1,500 years."** A search found this only on devotional and apologetics pages, with no academic source. It needs a reference work before it goes in.
- **Answered-prayer stories.** None in the first batch. They'll be added only as real, published, attributable accounts with a source link, or later as moderated user testimonies with consent.
- **Scientific claims beyond dating.** Fine-tuning and similar arguments need careful sourcing on both sides. They are planned for the next batch, labelled as arguments.
- **Claims that have been rejected** (for example sensational "tomb of Jesus" announcements) are not presented as evidence. If they're added at all, it will be as "claims we don't rely on, and why".

## Places, tombs and the latest discoveries

The Geographical pillar is where "all Bible places" lives:

1. **Every place on a map.** All 1,298 Theographic places with coordinates are already in the data, from Ur and Babylon to Corinth and Patmos. Each is linked to the verses that mention it, and the people and events connected to it.
2. **Curated site histories** for iconic places and tombs, written as evidence items. Each one says whether the identification rests on excavation or on tradition. The first batch covers Jerusalem's tombs, Hebron, Bethlehem, Capernaum, Bethsaida, Shiloh and Herodium. Next batches go region by region: Jerusalem and Judea, Galilee, Samaria, the coast, Egypt and Sinai, Mesopotamia, Asia Minor, Greece and Rome.
3. **Latest discoveries.** A view sorted by `discovered` year, newest first. Each new find is added through the same review process; preliminary finds are labelled as preliminary until published.

## Videos

Each item can hold YouTube links. None are included yet: a video should be checked by a person for accuracy before it is attached to an item. The plan is to prefer channels of museums, universities and excavation teams, record the channel and title, and play videos only when the user taps (no autoplay, no tracking before consent). The video list is a review step for you.

## Screens (after approval)

Mobile-first and in the existing style:

- **Evidence tab.** Six pillar cards, each collapsible, showing a count, the key items and a "strength" badge.
- **Item page.** Summary, "What it shows", "What it doesn't show", era, place (opens the map), verses (open the reader), sources, video, and an "Ask JARVIS" button.
- **Map.** All places, filterable by period and by pillar items.
- **Latest discoveries.** Newest finds first.

Each screen gets Playwright tests, and the v16 screen comparison keeps running.

## Review workflow

1. Read `docs/evidence-review.md`.
2. For each item: approve, edit the text in `content/evidence-centre/items.json`, or remove it.
3. To publish, set `"status": "published"` and `"reviewedBy": "<name>"`. The build refuses a published item without a reviewer.
