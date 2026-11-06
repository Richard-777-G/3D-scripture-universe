-- Read access and the optional per-user tables.
-- The launch build collects no personal data; these tables are used only after
-- accounts are added with consent. Deleting the auth user deletes all their rows.

-- Public, read-only access to reference data. Curated content is visible only once published.
do $$
declare t text;
begin
  foreach t in array array['dataset_versions','sources','books','versions','verses','cross_refs','lexicon','words',
                           'citations','journey_groups','journey_passages','journey_citations','evidence_sources',
                           'evidence_books','stories','qa_sources','i18n','people','places','events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
  end loop;
  foreach t in array array['journeys','prophecies','evidence','story_steps','qa']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (status = ''published'')', t || '_read', t);
  end loop;
end $$;

create table user_bookmarks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  verse_key   verse_key not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, verse_key)
);

create table user_highlights (
  user_id     uuid not null references auth.users (id) on delete cascade,
  verse_key   verse_key not null,
  color       text not null default 'gold',
  created_at  timestamptz not null default now(),
  primary key (user_id, verse_key)
);

create table user_notes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  verse_key   verse_key not null,
  body        text not null check (length(body) <= 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index user_notes_user_idx on user_notes (user_id, verse_key);

create table user_reading_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  plan_id     text not null,
  day         smallint not null,
  done_at     timestamptz not null default now(),
  primary key (user_id, plan_id, day)
);

do $$
declare t text;
begin
  foreach t in array array['user_bookmarks','user_highlights','user_notes','user_reading_progress']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end $$;
