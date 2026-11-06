-- Checks run after a full load. Each query returns rows only when something is wrong.
\set ON_ERROR_STOP on
create temp table problems (check_name text, detail text);

insert into problems select 'complete versions', v.code || ' has ' || count(x.*) || ' verses'
  from versions v left join verses x on x.version_code = v.code
  group by v.code having count(x.*) < 31082;  -- up to 20 deliberately empty verses

insert into problems select 'xref targets exist', 'cross_ref ' || c.id
  from cross_refs c left join verses v on v.version_code = 'kjv' and v.verse_key = c.to_start
  where v.verse_key is null;

insert into problems select 'xref sources exist', 'cross_ref ' || c.id
  from cross_refs c left join verses v on v.version_code = 'kjv' and v.verse_key = c.from_key
  where v.verse_key is null;

insert into problems select 'passages exist', p.journey_id
  from journey_passages p left join verses v on v.version_code = 'kjv' and v.verse_key = p.end_key
  where v.verse_key is null;

insert into problems select 'story steps published', s.journey_id
  from story_steps s join journeys j on j.id = s.journey_id where j.status <> 'published';

insert into problems select 'every source has a licence', id from sources where coalesce(licence, '') = '';

insert into problems select 'telugu for every verse', count(*)::text
  from verses k left join verses t on t.version_code = 'tel' and t.verse_key = k.verse_key
  where k.version_code = 'kjv' and t.verse_key is null having count(*) > 1;

insert into problems select 'john 3:16', coalesce(min(text), 'missing')
  from verses where version_code = 'kjv' and verse_key = 43003016 having coalesce(min(text), '') not like 'For God so loved the world%';

insert into problems select 'genesis 1:1 hebrew', coalesce(string_agg(translit, ' ' order by position), 'missing')
  from words where verse_key = 1001001 having string_agg(translit, ' ' order by position) not like 'bereShit baRa'' ''EloHim%';

insert into problems select 'bsb john 3:16', coalesce(min(text), 'missing')
  from verses where version_code = 'bsb' and verse_key = 43003016 having coalesce(min(text), '') not like 'For God so loved the world%';

insert into problems select 'full openbible loaded', count(*)::text from cross_refs having count(*) < 340000;

insert into problems select 'wheel subset', count(*)::text
  from cross_refs c
  where c.votes >= 3 and ((c.from_key < 40000000) <> (c.to_start < 40000000))
  having count(*) <> 42732;

insert into problems select 'abraham', coalesce(string_agg(r.related_id, ','), 'missing')
  from person_relations r where r.person_id = 'abraham_58' and r.relation = 'child'
  having not bool_or(r.related_id = 'isaac_616') or count(*) = 0;

insert into problems select 'jerusalem on the map', coalesce(min(name), 'missing')
  from places where name = 'Jerusalem' having min(latitude) is null or abs(min(latitude) - 31.78) > 0.2;

insert into problems select 'share-alike recorded', id from sources where id = 'theographic' and not share_alike;

select * from problems;
do $$ begin
  if exists (select 1 from problems) then raise exception 'database check found % problem(s)', (select count(*) from problems); end if;
end $$;
select 'verses' t, count(*) from verses union all select 'cross_refs', count(*) from cross_refs
union all select 'words', count(*) from words union all select 'lexicon', count(*) from lexicon
union all select 'journeys', count(*) from journeys union all select 'evidence', count(*) from evidence
union all select 'people', count(*) from people union all select 'places', count(*) from places
union all select 'events', count(*) from events union all select 'person_relations', count(*) from person_relations;
