-- Phase 2: richer Theographic people, places and events (CC BY-SA 4.0).
-- Data derived from Theographic must stay under CC BY-SA; the sources table records that.

alter table sources add column share_alike boolean not null default false;

alter table people
  add column birth_year integer,          -- negative = BCE
  add column death_year integer;

alter table places
  add column feature_type text,
  add column comment text,
  add constraint places_lat_check check (latitude between -90 and 90),
  add constraint places_lon_check check (longitude between -180 and 180);

alter table events
  add column duration text;

create type person_relation as enum ('father', 'mother', 'partner', 'child', 'sibling');

create table person_relations (
  person_id   text not null references people (id) on delete cascade,
  relation    person_relation not null,
  related_id  text not null references people (id) on delete cascade,
  primary key (person_id, relation, related_id)
);
create index person_relations_related_idx on person_relations (related_id);

create table person_places (
  person_id  text not null references people (id) on delete cascade,
  kind       text not null check (kind in ('birth', 'death')),
  place_id   text not null references places (id) on delete cascade,
  primary key (person_id, kind, place_id)
);

create table event_participants (
  event_id   text not null references events (id) on delete cascade,
  person_id  text not null references people (id) on delete cascade,
  primary key (event_id, person_id)
);

-- Look up who and where a verse mentions.
create index people_verses_idx on people using gin (verse_keys);
create index places_verses_idx on places using gin (verse_keys);
create index events_verses_idx on events using gin (verse_keys);

do $$
declare t text;
begin
  foreach t in array array['person_relations','person_places','event_participants']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
  end loop;
end $$;
