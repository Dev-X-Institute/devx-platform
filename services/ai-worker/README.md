# Shared AI worker scaffold

This Python service is the shared execution harness for durable, multi-step AI
tasks across DevX apps. It uses LlamaIndex Workflows for event-driven
orchestration and starts with a deterministic mock provider. No provider key,
Supabase credential, network call, or student record is needed for the demo.

## What is in this scaffold

- `contracts.py`: shared task and provider request envelopes plus the future
  queue adapter boundary.
- `workflow.py`: LlamaIndex Workflow validation, app/feature routing, and result
  handling.
- `providers/`: server-only provider interface and mock implementation.
- `apps/education_web.py`: education-owned feature validation, prompt
  construction, and result validation for lesson explanations and quiz drafts.
- `cli.py`: offline demo task to exercise the workflow.

The demo payload includes synthetic lesson text to make the example runnable.
Production queue messages contain only a task ID. A worker repository must
load the trusted task (including its database `created_by` identity) and private
short-lived input, recheck the user's current school/course/lesson
authorization, and hydrate `authorized_context` before
dispatching a handler. The `ai_tasks` lifecycle table, durable queue,
education enqueue RPC, worker consumer, lesson authorization, retry handling,
and result persistence are implemented. The worker is mock-provider-only;
production provider approval, frontend status/result integration, orphan-input
cleanup, and deployment packaging remain to be done.

LlamaIndex Workflow state is currently in memory for one execution. The
Supabase queue and task record are intended to provide durable task delivery
and status; workflow checkpointing/resume is a later reliability enhancement.

## Run the offline demo

From the repository root, using Python 3.11 or later:

```powershell
cd services/ai-worker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
python -m devx_ai_worker
```

## Run worker tests

With the worker's Python dependencies installed, run from this directory:

```powershell
$env:PYTHONPATH = "src"
python -m unittest discover -s tests -v
```

The unit tests use fake database cursors, and workflow integration tests exercise
lesson explanation and quiz drafting through LlamaIndex with the deterministic
mock provider. They do not connect to Supabase or send lesson data to an
external model.

Expected result includes `status: succeeded` and a mock explanation. The AI
dependency is `llama-index-core`, which provides LlamaIndex Workflows;
`psycopg` connects the worker to Supabase Postgres. Provider integrations are
intentionally absent until a model provider is approved.

The scaffold defaults to `AI_PROVIDER=mock`. The factory rejects any other
provider value until a real adapter is deliberately added.

## Run the Supabase queue consumer

After applying migrations and starting local Supabase, set `DATABASE_URL` to a
server-side Postgres connection with access to `pgmq`, `public.ai_tasks`,
`private.education_ai_task_inputs`, the education membership/lesson tables,
and `public.education_ai_task_results`. For local development, Supabase's
`postgres` database role can be used. Production should use a dedicated role
with only the required grants; never put its connection string in frontend
configuration.

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
python -m devx_ai_worker.worker
```

The consumer claims messages with a five-minute visibility timeout, rechecks
the task owner's current lesson/course access, runs the bounded LlamaIndex
workflow, writes a typed result and terminal status in one transaction, deletes
the short-lived input, and archives terminal messages. Retryable failures
return the task to `queued` and leave the message for redelivery. Quiz results
end in `needs_review`; explanations end in `succeeded`. Both use the mock
provider until a production provider is approved and configured.

## Add another app or feature

1. Add an app-owned handler that validates that feature's payload and creates a
   minimal `ProviderRequest` with app-owned instructions.
2. Validate and parse the provider response into a typed result in that handler.
3. Register it in `apps/<app>.py` under `(app_id, feature_key)` and add that
   registry to the workflow router.
4. Add authorization and data loading to the app's Supabase Edge Function or
   trusted task repository. Never accept app policy, role, provider/model,
   system prompt, or tool permissions from the queue message.
5. Add bounded retries, deadlines, idempotency, audit metadata, and a human
   review state before allowing persistent writes or external actions.

For `education-ai`, all lesson explanation and quiz requests enter the worker
path. The Edge Function authenticates the user, validates the request, creates
a protected `ai_tasks` row, stores a short-lived input in the private schema,
and atomically enqueues only its task ID. The worker must load that task,
recheck status and current school/course scope, load the authorized lesson,
dispatch `(education-web, feature_key)` to the education handler, and persist a
typed result/status. Teachers must approve generated assessment content
before it is published. See
[`education-ai`](../../supabase/functions/education-ai/README.md) and the
[platform AI architecture](../../docs/ai-architecture.md).

## Supabase connection design

Migrations provision the `pgmq` extension, a durable `ai_tasks` queue, the
private feature-input table, the server-only `education-ai` enqueue RPC, and
the owner-readable education result table. The queue and `private` input
schema are not exposed through the Data API. Connect the worker using a
trusted server-side Postgres adapter. Keep the same worker code and vary only
its server-side environment and network access:

### Local Supabase

1. Start the stack from the repository root with `supabase start`; get the API
   URL and local keys with `supabase status`.
2. Apply the migrations for the protected `ai_tasks` table, durable queue,
   private feature-input table, and enqueue RPC. Queue messages contain only
   `{ "task_id": "<uuid>" }`.
3. Set `DATABASE_URL` for the worker to the local Postgres connection. The
   `postgres` role is convenient for local development; production should use a
   dedicated least-privilege database role. Do not expose `pgmq` or `private`
   through `supabase/config.toml`.
4. Set worker-only credentials in an ignored local env file. Never put the
   database connection string or service-role key in `VITE_*`, frontend config,
   or the Edge Function response.
5. Run the worker on the host or as a sibling container; use the host-reachable
   local API/DB address (`127.0.0.1` from the host, the Supabase service name
   from a container on the same Docker network).

### Supabase platform

1. Apply the migrations to provision the lifecycle table, durable queue,
   private feature-input table, enqueue RPC, and owner-readable result table.
   The queue and private schema are not exposed through the Data API.
2. Deploy the app-specific Edge Function. It authenticates and validates the
   request, then calls the RPC to atomically write the task and enqueue only
   the task ID; clients cannot publish directly to the worker queue.
3. Deploy this worker as a separate container or persistent worker service with
   network access to the Supabase project. Set `DATABASE_URL` through the
   compute platform's secret manager and use a dedicated least-privilege
   database role. The worker rechecks task ownership, school, feature, and
   status before loading lesson data.
4. Configure health checks, concurrency, graceful shutdown, visibility timeout,
   retry/dead-letter handling, and independent scaling for that worker service.

Supabase Queues is pull-based, so the separately deployed consumer process is
required. It reads with a visibility timeout, atomically claims the task row,
and rechecks authorization and task status. It loads the lesson only after
validating the user's current school and course membership. On success, it
persists the result and terminal task state before archiving the queue message.
On retryable failure, it stores a safe failure code and lets the message become
visible again; after the task's bounded retry limit, it marks the task failed
and archives the message. Duplicate deliveries are handled idempotently.
Queue messages are delivery signals, while the protected task row is the
durable source of truth. See the Supabase [Queues API](https://supabase.com/docs/guides/queues/api),
[local/self-hosted setup](https://supabase.com/docs/guides/queues/expose-self-hosted-queues),
and [LlamaIndex Workflows](https://developers.llamaindex.ai/python/llamaagents/workflows/).
