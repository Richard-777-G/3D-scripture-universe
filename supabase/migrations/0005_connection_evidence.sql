-- Every cross-reference carries what supports it, as bit flags
-- (pipeline/allconnections.mjs LABEL). A link can carry several:
--   1  sourced prophecy (curated journey link with published citations)
--   2  same wording (key words shared in the same order)
--   4  shared distinctive words (two or more rare words in both passages)
--   8  listed in the Treasury of Scripture Knowledge
--  16  listed by OpenBible.info users (see votes)
alter table cross_refs add column evidence smallint not null default 16;
alter table cross_refs add constraint cross_refs_evidence_bits check (evidence between 0 and 31);
create index cross_refs_evidence_idx on cross_refs (evidence) where evidence <> 16;
comment on column cross_refs.evidence is 'Bit flags: 1 sourced prophecy, 2 same wording, 4 shared distinctive words, 8 TSK, 16 OpenBible users';
