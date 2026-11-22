-- Durable delivery queue for long-running shared AI tasks.
-- Queue messages are wake-up signals only; public.ai_tasks is the source of
-- truth for authorization, lifecycle, retries, and result references.

create extension if not exists pgmq;

select pgmq.create('ai_tasks');

comment on extension pgmq is
  'Postgres-native queue used to deliver IDs for durable AI tasks.';
