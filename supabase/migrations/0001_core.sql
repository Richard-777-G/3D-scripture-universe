-- Scripture Universe core schema (Phase 1).
-- One source of truth for every version of the app. Verse keys follow the
-- handover: book(1-66)*1,000,000 + chapter*1,000 + verse (John 3:16 = 43003016).
-- Verse 0 is allowed for the Psalm titles that the Hebrew text numbers separately.

create domain verse_key as integer
  check (value / 1000000 between 1 and 66 and (value / 1000) % 1000 between 1 and 150 and value % 1000 between 0 and 176);

create type testament as enum ('OT', 'NT');
create type review_status as enum ('draft', 'in_review', 'published');

-- Every import is tagged, so a bad dataset can be found and rolled back.
create table dataset_versions (
  id          text primary key,              -- e.g. the pack manifest version
  created_at  timestamptz not null default now(),
  notes       text
);

-- Licences and attribution for every dataset (the in-app Credits screen reads this).
create table sources (
  id               text primary key,
  name             text not null,
  url              text,
  licence          text not null check (licence <> ''),
  attribution      text not null default '',
  origin           text,
  dataset_version  text references dataset_versions (id)
);

create table books (
  id            smallint primary key check (id between 1 and 66),
  name          text not null unique,
  testament     testament not null,
  genre         text,
  chapters      smallint not null,
  verse_counts  smallint[] not null,
  check (cardinality(verse_counts) = chapters),
  check ((id <= 39) = (testament = 'OT'))
);

create table versions (
  code       text primary key,                -- kjv, asv, tel ...
  name       text not null,
  language   text not null,                   -- BCP 47: en, te ...
  licence    text not null,
  source_id  text not null references sources (id)
);

create table verses (
  version_code  text not null references versions (code),
  verse_key     verse_key not null,
  text          text not null,
  primary key (version_code, verse_key)
);
create index verses_key_idx on verses (verse_key);
-- 'simple' works for every language, Telugu included; English stemming can be added per version later.
create index verses_fts_idx on verses using gin (to_tsvector('simple', text));

-- Verse-to-verse links (OpenBible today, TSK in Phase 2). `votes` ranks thread strength.
create table cross_refs (
  id          bigint generated always as identity primary key,
  from_key    verse_key not null,
  to_start    verse_key not null,
  to_end      verse_key not null,
  votes       integer not null,
  source_id   text not null references sources (id),
  dataset_version text references dataset_versions (id),
  check (to_start <= to_end)
);
create index cross_refs_from_idx on cross_refs (from_key);
create index cross_refs_to_idx on cross_refs (to_start);

-- STEPBible original-language words and lexicons.
create table lexicon (
  strongs      text primary key,               -- H0430G, G3056 ...
  language     text not null check (language in ('hbo', 'grc')),
  lemma        text not null,
  translit     text,
  gloss        text,
  definition   text,
  morph        text,
  occurrences  integer
);

create table words (
  verse_key  verse_key not null,
  position   smallint not null,
  word       text not null,
  translit   text,
  gloss      text,
  strongs    text,                             -- not a foreign key: about 0.7% have no lexicon entry
  primary key (verse_key, position)
);
create index words_strongs_idx on words (strongs);

/* ---------- curated content (reviewed before it goes live) ---------- */

create table citations (
  id    text primary key,
  name  text not null,
  url   text not null
);

create table journey_groups (
  id     text primary key,
  name   text not null,
  color  text not null,
  blurb  text not null,
  ord    smallint not null
);

-- A sourced Old Testament -> New Testament connection (the app's "journeys").
create table journeys (
  id                 text primary key,
  group_id           text not null references journey_groups (id),
  ord                smallint not null,
  title              text not null,
  text               text not null,
  christian_reading  text,
  other_views        text,
  status             review_status not null default 'draft',
  reviewed_by        text,
  reviewed_at        timestamptz
);

create table journey_passages (
  journey_id  text not null references journeys (id) on delete cascade,
  side        testament not null,
  ord         smallint not null,
  start_key   verse_key not null,
  end_key     verse_key not null,
  primary key (journey_id, side, ord),
  check (start_key <= end_key)
);

create table journey_citations (
  journey_id   text not null references journeys (id) on delete cascade,
  citation_id  text not null references citations (id),
  primary key (journey_id, citation_id)
);

-- Curated promise -> fulfilment pairs for Prophecy mode (Phase 5), separate from raw links.
create table prophecies (
  id            text primary key,
  ot_start      verse_key not null,
  ot_end        verse_key not null,
  nt_start      verse_key not null,
  nt_end        verse_key not null,
  title         text not null,
  years_before  integer,
  note          text,
  journey_id    text references journeys (id),
  status        review_status not null default 'draft',
  reviewed_by   text,
  reviewed_at   timestamptz
);

create table evidence (
  id      text primary key,
  ord     smallint not null,
  layer   text not null check (layer in ('ot', 'jesus', 'church', 'apostles')),
  title   text not null,
  kid     text,
  place   text,
  grade   text not null,
  what    text,
  shows   text,
  limits  text,
  faith   text,
  icon    text,
  see     text,
  status       review_status not null default 'draft',
  reviewed_by  text,
  reviewed_at  timestamptz
);

create table evidence_sources (
  evidence_id  text not null references evidence (id) on delete cascade,
  ord          smallint not null,
  title        text not null,
  url          text not null,
  primary key (evidence_id, ord)
);

create table evidence_books (
  evidence_id  text not null references evidence (id) on delete cascade,
  book_id      smallint not null references books (id),
  primary key (evidence_id, book_id)
);

create table stories (
  id     text primary key,
  title  text not null
);

create table story_steps (
  story_id       text not null references stories (id) on delete cascade,
  step           smallint not null,
  journey_id     text not null references journeys (id),
  chapter_title  text not null,
  kid_text       text not null,
  evidence_ids   text[] not null default '{}',
  status         review_status not null default 'draft',
  reviewed_by    text,
  reviewed_at    timestamptz,
  primary key (story_id, step)
);

create table qa (
  id           text primary key,
  ord          smallint not null,
  question     text not null,
  answer       text not null,
  general      boolean not null default false,
  journey_ids  text[] not null default '{}',
  evidence_ids text[] not null default '{}',
  status       review_status not null default 'draft',
  reviewed_by  text,
  reviewed_at  timestamptz
);

create table qa_sources (
  qa_id  text not null references qa (id) on delete cascade,
  ord    smallint not null,
  title  text not null,
  url    text not null,
  primary key (qa_id, ord)
);

-- UI and content translations (English and Telugu first).
create table i18n (
  key   text not null,
  lang  text not null,
  text  text not null,
  primary key (key, lang)
);

/* ---------- Theographic people, places and events (filled in Phase 2) ---------- */

create table people (
  id          text primary key,
  name        text not null,
  gender      text,
  verse_keys  integer[] not null default '{}',
  source_id   text references sources (id)
);

create table places (
  id          text primary key,
  name        text not null,
  latitude    double precision,
  longitude   double precision,
  verse_keys  integer[] not null default '{}',
  source_id   text references sources (id)
);

create table events (
  id          text primary key,
  title       text not null,
  start_year  integer,               -- negative = BCE
  verse_keys  integer[] not null default '{}',
  source_id   text references sources (id)
);
