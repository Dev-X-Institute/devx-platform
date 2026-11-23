# `education-ai` enqueue function

This function is the `education-web` entry point for background AI work. It
verifies the caller's Supabase access token, validates the feature request, and
calls `enqueue_education_ai_task` with a server-only service-role client. That
database function atomically creates the `ai_tasks` row, writes the short-lived
feature input, and publishes a queue
message containing only `{ "task_id": "<uuid>" }`.

The function does not read school data, authorize lesson access, call a model,
or return generated content. The worker must reload the task, confirm that the
lesson still exists and that the task owner has current course/school access,
then load lesson content and process the feature. The Edge Function returns
`202 Accepted` with `taskId`, `requestId`, and `status: "queued"`.

## Request shapes

Explanation:

```json
{
  "feature": "lesson.explain",
  "lessonId": "<lesson UUID>",
  "question": "What does sunlight help the plant do?",
  "idempotencyKey": "<optional client-generated key>"
}
```

Quiz draft:

```json
{
  "feature": "quiz.generate",
  "lessonId": "<lesson UUID>",
  "count": 2,
  "idempotencyKey": "<optional client-generated key>"
}
```

The function verifies the Supabase user before parsing the body. The database
RPC is executable only by `service_role`, repeats the feature/input bounds,
and receives `created_by` from the function's verified user result. It enqueues
in the same transaction as task creation. Reusing an
idempotency key for the same user and feature returns the existing task.

## Local setup

1. Apply all migrations with the Supabase CLI. This adds the protected task
   table, private short-lived input table, queue, and enqueue RPC.
2. Start the local Edge Function with `supabase functions serve education-ai`.
   Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` for the local function. The service-role key is
   used only server-side for the restricted enqueue RPC; no AI provider secret
   is needed here.
3. Sign in as any authenticated local user and send one of the request shapes
   above to `http://127.0.0.1:54321/functions/v1/education-ai` with a Bearer
   token.
4. Confirm the response is `202` and inspect `public.ai_tasks` and the private
   `pgmq` queue using a trusted local database session.

The request will remain queued until the separate Python worker consumer is
implemented and running. Task input rows carry a 24-hour `expires_at` value;
that value does not delete rows automatically. The worker must delete inputs
after terminal processing, and production needs cleanup for orphaned expired
inputs. Do not expose the `private` schema or queue functions to browser
clients.
