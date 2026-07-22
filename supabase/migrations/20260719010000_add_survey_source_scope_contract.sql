alter table survey_ops.survey_analysis_export
  add column if not exists source_district_id uuid references survey_ops.districts(id),
  add column if not exists source_library_id uuid references survey_ops.libraries(id),
  add column if not exists source_campaign_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'survey_analysis_export_source_campaign_nonblank'
      and conrelid = 'survey_ops.survey_analysis_export'::regclass
  ) then
    alter table survey_ops.survey_analysis_export
      add constraint survey_analysis_export_source_campaign_nonblank
      check (source_campaign_id is null or btrim(source_campaign_id) <> '');
  end if;
end
$$;

create or replace function survey_ops.validate_survey_analysis_source_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_library_id is not null and new.source_district_id is null then
    raise exception 'source_district_id is required when source_library_id is set';
  end if;
  if new.source_library_id is not null and not exists (
    select 1
    from survey_ops.libraries l
    where l.id = new.source_library_id
      and l.district_id = new.source_district_id
  ) then
    raise exception 'source_library_id does not belong to source_district_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_survey_analysis_source_scope on survey_ops.survey_analysis_export;
create trigger trg_validate_survey_analysis_source_scope
before insert or update of source_district_id, source_library_id
on survey_ops.survey_analysis_export
for each row execute function survey_ops.validate_survey_analysis_source_scope();

create index if not exists idx_survey_ops_export_source_district_received
  on survey_ops.survey_analysis_export (source_district_id, received_at desc)
  where source_district_id is not null;
create index if not exists idx_survey_ops_export_source_library_received
  on survey_ops.survey_analysis_export (source_library_id, received_at desc)
  where source_library_id is not null;
create index if not exists idx_survey_ops_export_source_campaign
  on survey_ops.survey_analysis_export (source_campaign_id)
  where source_campaign_id is not null;

comment on column survey_ops.survey_analysis_export.source_district_id is
  'Server-resolved collection district. Never infer from respondent SQ3.';
comment on column survey_ops.survey_analysis_export.source_library_id is
  'Optional server-resolved collection library. Never infer from respondent SQ4.';
comment on column survey_ops.survey_analysis_export.source_campaign_id is
  'Server-controlled survey deployment or campaign identifier.';
