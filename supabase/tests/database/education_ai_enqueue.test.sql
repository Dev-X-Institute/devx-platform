begin;

select plan(4);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '29c56410-dba0-4a7a-aa85-aa161a871479', 'authenticated', 'authenticated',
  'education-ai-test@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb,
  now(), now()
);

select set_config('request.jwt.claim.role', 'service_role', true);

create temporary table education_enqueue_result as
select * from public.enqueue_education_ai_task(
  '29c56410-dba0-4a7a-aa85-aa161a871479',
  'quiz.generate',
  '{"lesson_id":"d0176a76-35d6-4ee7-87d8-6bcac8a71bf6","count":2}'::jsonb,
  'enqueue-test-once'
);

select is(
  (select status::text from education_enqueue_result),
  'queued',
  'enqueue RPC creates a queued task'
);

select is(
  (select count(*)::integer from pgmq.q_ai_tasks q
   where q.message = jsonb_build_object(
     'task_id', (select task_id from education_enqueue_result)
   )),
  1,
  'queue message contains only the task ID'
);

select is(
  (select count(*)::integer
   from pgmq.q_ai_tasks q,
        lateral jsonb_object_keys(q.message) as message_key
   where q.message ->> 'task_id' = (select task_id::text from education_enqueue_result)),
  1,
  'queue payload has exactly one field'
);

select is(
  (select app_id from public.ai_tasks
   where id = (select task_id from education_enqueue_result)),
  'education-web',
  'RPC scopes the task to education-web'
);

select * from finish();
rollback;
