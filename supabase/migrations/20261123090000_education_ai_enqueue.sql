-- Keep the Edge Function as an authenticated enqueue boundary. The worker
-- receives only task IDs and loads these minimal feature inputs server-side.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.education_ai_task_inputs (
  task_id uuid primary key
    references public.ai_tasks (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);
alter table private.education_ai_task_inputs enable row level security;

revoke all on private.education_ai_task_inputs from public, anon, authenticated;
grant select, delete on private.education_ai_task_inputs to service_role;

comment on table private.education_ai_task_inputs is
  'Short-lived education AI request fields. Treat user text as sensitive; never store lesson bodies or student names here. Worker deletes rows after terminal processing.';

create or replace function public.enqueue_education_ai_task(
  p_created_by uuid,
  p_feature_key text,
  p_payload jsonb,
  p_idempotency_key text default null
)
returns table (task_id uuid, request_id uuid, status public.ai_task_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := p_created_by;
  created_task_id uuid;
  created_request_id uuid;
  created_status public.ai_task_status;
  lesson_id_text text;
begin
  if auth.role() <> 'service_role' or caller_id is null then
    raise exception 'Trusted enqueue role required' using errcode = '42501';
  end if;
  if p_feature_key is null or p_feature_key not in ('lesson.explain', 'quiz.generate') then
    raise exception 'Unsupported education AI feature' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload must be an object' using errcode = '22023';
  end if;
  if p_idempotency_key is not null and length(p_idempotency_key) not between 1 and 200 then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;

  lesson_id_text := p_payload ->> 'lesson_id';
  if lesson_id_text is null or lesson_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'A valid lesson_id is required' using errcode = '22023';
  end if;

  if p_feature_key = 'lesson.explain' then
    if (select count(*) from jsonb_object_keys(p_payload)) <> 2
      or not (p_payload ? 'question')
      or exists (
        select 1 from jsonb_object_keys(p_payload) as keys(key)
        where key not in ('lesson_id', 'question')
      )
      or jsonb_typeof(p_payload -> 'question') <> 'string'
      or length(trim(p_payload ->> 'question')) not between 1 and 2000 then
      raise exception 'Invalid lesson explanation payload' using errcode = '22023';
    end if;
  else
    if (select count(*) from jsonb_object_keys(p_payload)) <> 2
      or not (p_payload ? 'count')
      or exists (
        select 1 from jsonb_object_keys(p_payload) as keys(key)
        where key not in ('lesson_id', 'count')
      )
      or jsonb_typeof(p_payload -> 'count') <> 'number'
      or (p_payload ->> 'count') !~ '^[0-9]+$'
      or (p_payload ->> 'count')::numeric not between 1 and 10 then
      raise exception 'Invalid quiz generation payload' using errcode = '22023';
    end if;
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      caller_id::text || ':education-web:' || p_feature_key || ':' || p_idempotency_key,
      0
    ));
    select t.id, t.request_id, t.status
      into created_task_id, created_request_id, created_status
    from public.ai_tasks t
    where t.created_by = caller_id
      and t.app_id = 'education-web'
      and t.feature_key = p_feature_key
      and t.school_id is null
      and t.idempotency_key = p_idempotency_key;
    if found then
      return query select created_task_id, created_request_id, created_status;
      return;
    end if;
  end if;

  insert into public.ai_tasks (
    app_id, feature_key, created_by, idempotency_key, source_refs
  ) values (
    'education-web', p_feature_key, caller_id, p_idempotency_key,
    jsonb_build_object('lesson_id', lesson_id_text)
  ) returning ai_tasks.id, ai_tasks.request_id, ai_tasks.status
    into created_task_id, created_request_id, created_status;

  insert into private.education_ai_task_inputs (task_id, payload)
  values (created_task_id, p_payload);

  perform pgmq.send(
    'ai_tasks', jsonb_build_object('task_id', created_task_id)
  );

  return query select created_task_id, created_request_id, created_status;
end;
$$;

revoke all on function public.enqueue_education_ai_task(uuid, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_education_ai_task(uuid, text, jsonb, text)
  to service_role;
