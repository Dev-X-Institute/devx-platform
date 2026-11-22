-- Shared AI task lifecycle metadata for app-specific Edge Functions and workers.
-- Store source/result references and safe operational metadata, not prompts,
-- lesson bodies, student identity data, or generated prose.

create type public.ai_task_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'needs_review'
);

create table public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique default gen_random_uuid(),
  idempotency_key text check (
    idempotency_key is null or length(idempotency_key) between 1 and 200
  ),
  app_id text not null check (
    app_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(app_id) <= 80
  ),
  feature_key text not null check (
    feature_key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
    and length(feature_key) <= 120
  ),
  schema_version text not null default 'v1' check (
    length(schema_version) between 1 and 32
  ),
  school_id uuid references public.schools (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  status public.ai_task_status not null default 'queued',
  source_refs jsonb not null default '{}'::jsonb check (
    jsonb_typeof(source_refs) = 'object'
  ),
  result_refs jsonb not null default '{}'::jsonb check (
    jsonb_typeof(result_refs) = 'object'
  ),
  provider_key text check (provider_key is null or length(provider_key) <= 100),
  model_key text check (model_key is null or length(model_key) <= 120),
  prompt_version text check (
    prompt_version is null or length(prompt_version) <= 100
  ),
  usage_metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(usage_metadata) = 'object'
  ),
  failure_code text check (
    failure_code is null or failure_code ~ '^[A-Z0-9_]{1,64}$'
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  deadline_at timestamptz,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attempt_count <= max_attempts)
);

comment on table public.ai_tasks is
  'Shared AI task lifecycle metadata. Keep prompts and generated prose in feature-owned storage, not this table.';
comment on column public.ai_tasks.source_refs is
  'JSON object of authorized source record IDs/revisions only; never raw source content.';
comment on column public.ai_tasks.result_refs is
  'JSON object of feature-owned result record IDs only; never generated prose.';
comment on column public.ai_tasks.usage_metadata is
  'Bounded operational usage metadata such as token counts and duration; no prompts or provider response bodies.';

create unique index ai_tasks_idempotency_idx
  on public.ai_tasks (
    created_by, app_id, feature_key, school_id, idempotency_key
  ) nulls not distinct
  where idempotency_key is not null;
create index ai_tasks_owner_created_idx
  on public.ai_tasks (created_by, created_at desc);
create index ai_tasks_school_created_idx
  on public.ai_tasks (school_id, created_at desc)
  where school_id is not null;
create index ai_tasks_queued_idx
  on public.ai_tasks (queued_at)
  where status = 'queued';

create trigger ai_tasks_set_updated_at before update on public.ai_tasks
  for each row execute function public.set_updated_at();

alter table public.ai_tasks enable row level security;

create policy "Users read their active school AI tasks"
  on public.ai_tasks for select to authenticated
  using (
    created_by = (select auth.uid())
    and (
      school_id is null
      or public.has_active_school_role(school_id)
    )
  );

create policy "School admins read school AI tasks"
  on public.ai_tasks for select to authenticated
  using (
    school_id is not null
    and public.has_active_school_role(
      school_id,
      array['admin']::public.education_role[]
    )
  );

-- Clients can inspect permitted task status only. Task creation and lifecycle
-- transitions must use a trusted Edge Function or worker server credential.
revoke all on public.ai_tasks from anon, authenticated;
grant select on public.ai_tasks to authenticated;
grant select, insert, update on public.ai_tasks to service_role;
