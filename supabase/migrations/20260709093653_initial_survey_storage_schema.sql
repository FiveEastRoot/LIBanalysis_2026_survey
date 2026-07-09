-- Initial survey storage schema for LIBanalysis 2026.
-- Source of truth: Supabase. Google Sheets is a backup/export target only.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create table public.survey_analysis_export (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  received_at timestamptz not null default now(),
  submitted_at timestamptz,
  analysis_payload jsonb not null default '{}'::jsonb,
  constraint survey_analysis_export_request_id_key unique (request_id),
  constraint survey_analysis_export_analysis_payload_object_check
    check (jsonb_typeof(analysis_payload) = 'object')
);

create table public.survey_pii (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.survey_analysis_export(id) on delete cascade,
  request_id text not null,
  received_at timestamptz not null default now(),
  submitted_at timestamptz,
  consent_value text not null,
  phone_hash text not null,
  phone_encrypted text not null,
  phone_encryption_version text not null default 'v1',
  constraint survey_pii_submission_id_key unique (submission_id),
  constraint survey_pii_request_id_key unique (request_id),
  constraint survey_pii_phone_hash_key unique (phone_hash),
  constraint survey_pii_phone_encryption_version_check
    check (phone_encryption_version in ('v1'))
);

create table public.survey_submission_log (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  received_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_fields integer,
  total_fields integer,
  client_path text,
  user_agent text,
  event_type text not null,
  message text,
  constraint survey_submission_log_event_type_check
    check (event_type in ('submitted', 'duplicate_rejected', 'validation_failed', 'storage_failed')),
  constraint survey_submission_log_progress_check
    check (
      completed_fields is null
      or total_fields is null
      or (
        completed_fields >= 0
        and total_fields >= 0
        and completed_fields <= total_fields
      )
    )
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  is_active boolean not null default true,
  constraint districts_name_key unique (name),
  constraint districts_code_key unique (code)
);

create table public.libraries (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete restrict,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  constraint libraries_district_id_name_key unique (district_id, name),
  constraint libraries_district_id_code_key unique (district_id, code)
);

create table public.dashboard_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null,
  district_id uuid references public.districts(id) on delete restrict,
  library_id uuid references public.libraries(id) on delete restrict,
  created_by uuid references public.dashboard_users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_users_auth_user_id_key unique (auth_user_id),
  constraint dashboard_users_role_check
    check (role in ('staff', 'district_admin', 'system_admin')),
  constraint dashboard_users_scope_check
    check (
      (role = 'staff' and district_id is not null and library_id is not null)
      or (role = 'district_admin' and district_id is not null and library_id is null)
      or (role = 'system_admin' and district_id is null and library_id is null)
    )
);

create unique index dashboard_users_email_lower_key
  on public.dashboard_users (lower(email));

create trigger dashboard_users_set_updated_at
before update on public.dashboard_users
for each row
execute function public.set_updated_at();

create table public.admin_export_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.dashboard_users(id) on delete restrict,
  action_type text not null,
  created_at timestamptz not null default now(),
  row_count integer not null default 0,
  result_status text not null,
  message text,
  constraint admin_export_log_action_type_check
    check (action_type in ('backup_google_sheets', 'export_analysis_csv', 'export_pii_csv', 'export_combined_csv')),
  constraint admin_export_log_result_status_check
    check (result_status in ('success', 'failed')),
  constraint admin_export_log_row_count_check
    check (row_count >= 0)
);

insert into public.districts (name, code, is_active)
values
  ('노원구', 'nowon', true),
  ('성북구', 'seongbuk', true),
  ('도봉구', 'dobong', true),
  ('중랑구', 'jungnang', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

with nowon as (
  select id from public.districts where code = 'nowon'
)
insert into public.libraries (district_id, name, code, is_active)
select nowon.id, library.name, library.code, true
from nowon
cross join (
  values
    ('노원중앙도서관', 'nowon_central'),
    ('마들이음도서관', 'madeul_ieum'),
    ('상계도서관', 'sanggye'),
    ('노원어린이도서관', 'nowon_children'),
    ('불암도서관', 'buram'),
    ('화랑도서관', 'hwarang'),
    ('월계도서관', 'wolgye'),
    ('월계어린이도서관', 'wolgye_children'),
    ('하계어린이도서관', 'hagye_children')
) as library(name, code)
on conflict (district_id, code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

create index survey_analysis_export_received_at_idx
  on public.survey_analysis_export (received_at desc);

create index survey_pii_submission_id_idx
  on public.survey_pii (submission_id);

create index survey_pii_received_at_idx
  on public.survey_pii (received_at desc);

create index survey_submission_log_request_id_idx
  on public.survey_submission_log (request_id);

create index survey_submission_log_received_at_idx
  on public.survey_submission_log (received_at desc);

create index survey_submission_log_event_type_idx
  on public.survey_submission_log (event_type);

create index libraries_district_id_idx
  on public.libraries (district_id);

create index dashboard_users_district_id_idx
  on public.dashboard_users (district_id);

create index dashboard_users_library_id_idx
  on public.dashboard_users (library_id);

create index dashboard_users_created_by_idx
  on public.dashboard_users (created_by);

create index admin_export_log_admin_user_id_idx
  on public.admin_export_log (admin_user_id);

create index admin_export_log_created_at_idx
  on public.admin_export_log (created_at desc);

alter table public.survey_analysis_export enable row level security;
alter table public.survey_pii enable row level security;
alter table public.survey_submission_log enable row level security;
alter table public.districts enable row level security;
alter table public.libraries enable row level security;
alter table public.dashboard_users enable row level security;
alter table public.admin_export_log enable row level security;

-- Explicit grants are required for newer Supabase Data API defaults.
-- No anon grants: the public survey form submits only through Netlify Functions.
revoke all on table public.survey_analysis_export from anon, authenticated;
revoke all on table public.survey_pii from anon, authenticated;
revoke all on table public.survey_submission_log from anon, authenticated;
revoke all on table public.districts from anon, authenticated;
revoke all on table public.libraries from anon, authenticated;
revoke all on table public.dashboard_users from anon, authenticated;
revoke all on table public.admin_export_log from anon, authenticated;

grant select, insert, update, delete on table public.survey_analysis_export to service_role;
grant select, insert, update, delete on table public.survey_pii to service_role;
grant select, insert, update, delete on table public.survey_submission_log to service_role;
grant select, insert, update, delete on table public.districts to service_role;
grant select, insert, update, delete on table public.libraries to service_role;
grant select, insert, update, delete on table public.dashboard_users to service_role;
grant select, insert, update, delete on table public.admin_export_log to service_role;

grant select on table public.districts to authenticated;
grant select on table public.libraries to authenticated;
grant select on table public.dashboard_users to authenticated;

create policy "authenticated users can read active districts"
on public.districts
for select
to authenticated
using (is_active = true);

create policy "authenticated users can read active libraries"
on public.libraries
for select
to authenticated
using (is_active = true);

create policy "dashboard users can read own profile"
on public.dashboard_users
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  and is_active = true
);

comment on table public.survey_analysis_export is
  'Analysis-only survey responses. Does not store raw phone numbers or encrypted phone values.';

comment on table public.survey_pii is
  'Separated PII table. Stores consent, phone_hash, phone_encrypted, and phone_encryption_version only.';

comment on table public.survey_submission_log is
  'Operational submission log for submitted, duplicate_rejected, validation_failed, and storage_failed events.';

comment on table public.dashboard_users is
  'Dashboard authorization profile. Supabase Auth handles login; this table handles business role and scope.';

comment on table public.admin_export_log is
  'Audit log for admin CSV exports and Google Sheets backup actions.';
