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
- `apps/education_web.py`: example app-owned feature validation, prompt
  construction, and result validation.
- `cli.py`: offline demo task to exercise the workflow.

The demo payload includes synthetic lesson text to make the example runnable.
Production queue messages should contain only a task ID and minimal routing
metadata. A worker repository should load the trusted task record and its
authorized source references. The `ai_tasks` lifecycle table exists, but the
queue consumer, Supabase adapter, task persistence integration, retries,
cancellation, and deployment packaging are not implemented yet.

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

Expected result includes `status: succeeded` and a mock explanation. The only
runtime dependency is `llama-index-core`, which provides LlamaIndex Workflows;
provider integrations are intentionally absent until a model provider is
approved.

The scaffold defaults to `AI_PROVIDER=mock`. The factory rejects any other
provider value until a real adapter is deliberately added.

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

For `education-ai`, keep short `lesson.explain` and quiz requests on the current
direct Edge Function path while they fit its request budget. For future
long-running education work, the Edge Function should authenticate the user,
check the active `school_memberships` and course scope, create a protected
`ai_tasks` row, and enqueue only its task ID. The worker then loads that task,
rechecks status and scope, dispatches `(education-web, feature_key)` to the
education handler, and persists a typed draft/status. Teachers must approve
generated assessment content before it is published. See
[`education-ai`](../../supabase/functions/education-ai/README.md) and the
[platform AI architecture](../../docs/ai-architecture.md).

## Supabase connection design

The queue and task adapters are the next integration step; this scaffold does
not connect to Supabase yet. Keep the same worker code and vary only its
server-side environment and network access:

### Local Supabase

1. Start the stack from the repository root with `supabase start`; get the API
   URL and local keys with `supabase status`.
2. Apply the migration that creates the protected `ai_tasks` table, then add a
   durable `pgmq` queue. Queue messages should contain `{ "task_id": "..." }`
   only.
3. For a PostgREST queue adapter, create the `pgmq_public` wrappers and expose
   `pgmq_public` in `supabase/config.toml`, then restart the local stack. Keep
   queue RPC permissions server-only. Alternatively, a direct Postgres adapter
   can use a dedicated worker database role.
4. Set worker-only credentials in an ignored local env file. Never put the
   service-role key in `VITE_*`, frontend config, or the Edge Function response.
5. Run the worker on the host or as a sibling container; use the host-reachable
   local API/DB address (`127.0.0.1` from the host, the Supabase service name
   from a container on the same Docker network).

### Supabase platform

1. Apply the `ai_tasks` migration and enable Supabase Queues/`pgmq`; create the
   durable queue through migrations or the project dashboard.
2. Deploy the app-specific Edge Function. It writes the task row and enqueues
   only the task ID; clients cannot publish directly to the worker queue.
3. Deploy this worker as a separate container or persistent worker service with
   network access to the Supabase project. Set the project URL and a
   server-only queue/database credential through the compute platform's secret
   manager. Use a dedicated least-privilege database role where possible; if a
   service-role key is temporarily required, keep it only in the worker and
   explicitly recheck task ownership, school, feature, and status.
4. Configure health checks, concurrency, graceful shutdown, visibility timeout,
   retry/dead-letter handling, and independent scaling for that worker service.

Supabase Queues is pull-based, so a separate consumer process is required. If
using the PostgREST API, Supabase documents `pgmq_public.read`, `delete`, and
`archive`; local CLI deployments must also expose the `pgmq_public` schema.
Queue messages are delivery signals, while the protected task row is the
durable source of truth. See the Supabase [Queues API](https://supabase.com/docs/guides/queues/api),
[local/self-hosted setup](https://supabase.com/docs/guides/queues/expose-self-hosted-queues),
and [LlamaIndex Workflows](https://developers.llamaindex.ai/python/llamaagents/workflows/).
