-- Evidence Centre: six pillars of evidence, each item sourced and reviewed.
-- Items are drafts until a named reviewer publishes them; the public can read
-- published items only (row-level security).

create type evidence_pillar as enum ('spiritual', 'historical', 'scientific', 'theological', 'archaeological', 'geographical');
create type evidence_strength as enum ('strong', 'moderate', 'preliminary', 'debated', 'tradition', 'testimony');

create table evidence_pillars (
  id        evidence_pillar primary key,
  ord       smallint not null unique,
  title     text not null,
  question  text not null,
  scope     text not null
);

create table evidence_items (
  id           text primary key check (id ~ '^[a-z0-9-]+$'),
  pillar       evidence_pillar not null,
  kind         text not null,
  title        text not null,
  summary      text not null,
  shows        text not null,
  limits       text not null check (length(limits) >= 20),   -- every item says what it does not show
  era          text not null,
  year_from    integer,                                      -- negative = BC
  year_to      integer,
  discovered   smallint,
  place        text,
  strength     evidence_strength not null,
  status       review_status not null default 'draft',
  reviewed_by  text,
  reviewed_at  timestamptz,
  check (status <> 'published' or reviewed_by is not null)
);
create index evidence_items_pillar_idx on evidence_items (pillar, status);

create table evidence_item_sources (
  item_id    text not null references evidence_items (id) on delete cascade,
  ord        smallint not null,
  title      text not null,
  publisher  text not null,
  url        text not null check (url ~ '^https://'),
  primary key (item_id, ord)
);

create table evidence_item_verses (
  item_id    text not null references evidence_items (id) on delete cascade,
  ord        smallint not null,
  start_key  verse_key not null,
  end_key    verse_key not null,
  primary key (item_id, ord),
  check (start_key <= end_key)
);

create table evidence_item_videos (
  item_id    text not null references evidence_items (id) on delete cascade,
  ord        smallint not null,
  title      text not null,
  channel    text not null,
  url        text not null check (url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  primary key (item_id, ord)
);

-- The v16 evidence cards keep their table; this records their pillar.
alter table evidence add column pillar evidence_pillar;

-- User-submitted testimonies, for later: moderated, with explicit consent, deletable.
-- Nothing is collected until accounts exist (see the privacy checklist).
create table testimonies (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users (id) on delete cascade,
  display_name  text,
  body          text not null check (length(body) between 50 and 5000),
  consent_publish boolean not null,
  consent_at    timestamptz not null default now(),
  status        review_status not null default 'draft',
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['evidence_pillars','evidence_item_sources','evidence_item_verses','evidence_item_videos']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
  end loop;
end $$;
alter table evidence_items enable row level security;
create policy evidence_items_read on evidence_items for select using (status = 'published');
alter table testimonies enable row level security;
create policy testimonies_read on testimonies for select using (status = 'published' and consent_publish);
create policy testimonies_own on testimonies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
