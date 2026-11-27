-- Typed education task outputs are separate from generic AI lifecycle metadata.
create table public.education_ai_task_results (
  task_id uuid primary key
    references public.ai_tasks (id) on delete cascade,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.education_ai_task_results is
  'Education-owned AI output for a task. Quiz drafts remain review-required and are never published by the worker.';

alter table public.education_ai_task_results enable row level security;

create policy "Task owners read their education AI results"
  on public.education_ai_task_results for select to authenticated
  using (
    exists (
      select 1
      from public.ai_tasks t
      where t.id = education_ai_task_results.task_id
        and t.created_by = (select auth.uid())
        and (
          t.school_id is null
          or public.has_active_school_role(t.school_id)
        )
    )
  );

revoke all on public.education_ai_task_results from anon, authenticated;
grant select on public.education_ai_task_results to authenticated;
grant select, insert, update, delete
  on public.education_ai_task_results to service_role;
