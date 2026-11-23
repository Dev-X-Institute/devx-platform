# Platform AI architecture

**Status:** The shared task table and durable Supabase queue are in place. `education-ai` authenticates, validates, and enqueues requests; the Python/LlamaIndex worker has an education queue consumer, lesson authorization, mock-provider execution, and result persistence. A production AI provider, frontend task-status flow, and worker deployment remain pending.

## Goals

- Give every DevX app one predictable, provider-neutral way to request AI work.
- Keep provider credentials, provider selection, and provider-specific code on the server.
- Keep app features, prompts, authorization rules, and user experience with the app that owns them.
- Make privacy, cost controls, review, and evaluation part of each feature's design.

## Boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| App frontend | Collect feature input, call the app's Supabase Edge Function, validate/display the result, collect review or feedback | Provider keys, provider SDK calls, privileged database access, trust decisions based only on UI state |
| `@devx/ai` | Browser-safe shared contracts, feature identifiers/types, and (if useful) a frontend client adapter around the backend client | Secrets, provider SDKs, prompts containing app policy, direct provider calls |
| Supabase Edge Functions | Authenticate the caller, validate/limit app-owned feature requests, create tasks and enqueue IDs, return accepted/task IDs | Trusting caller-supplied role or user ID, provider calls, loading school data, returning secrets |
| Shared worker | Load tasks, recheck feature authorization, retrieve minimum source data, execute app handlers and provider adapters, validate results, persist safe lifecycle updates | Trusting queue payloads as authorization, unreviewed writes to learning records |
| App feature policy | Feature-specific prompts, allowed inputs/outputs, role rules, review requirements, evaluation cases | Shared provider implementation |

The frontend continues to obtain its Supabase client through `createBackend()` in `@devx/core`. Supabase Auth supplies the user's access token when the frontend calls an Edge Function. The function verifies the JWT and obtains the trusted user identity before creating a task. The worker checks current school, course, lesson, and feature permissions before loading education data or invoking a provider. Worker service credentials never reach the browser.

## Request path

1. An app screen calls an app-owned feature client (or the shared `@devx/ai` transport helper) with a typed, minimal feature payload.
2. The client invokes a named Supabase Edge Function using the `createBackend()` client. It does not call an AI vendor directly.
3. The function authenticates the request, validates its app-owned feature schema and size, and invokes a restricted enqueue RPC. The RPC creates the task and queue message atomically.
4. The function returns `202 Accepted` with the task ID immediately after enqueue. The frontend reads task status through an authenticated RLS-protected query or endpoint.
5. The worker claims the task ID, reloads the task and short-lived feature input, checks current school/course/lesson authorization, and loads the minimum source data.
6. The worker calls the server-side AI provider through a provider-neutral interface, validates the result against the feature schema, and records a safe outcome. It never trusts a role or user ID from the queue payload. The frontend handles draft review when the result is ready.

```text
App screen
  -> @devx/ai browser-safe contract/client
  -> @devx/core createBackend() Supabase client
  -> Supabase Auth JWT + named Edge Function
  -> authenticate / validate / limit
  -> atomically create task + enqueue task ID
  <- accepted + task ID

Queue -> worker authorizes task owner and source -> feature handler
      -> provider adapter -> validate/persist result
```

## AI task execution path

All AI tasks use the shared worker, including bounded features such as lesson explanations and quiz drafts. Supabase Edge Functions remain short-lived app-specific enqueue boundaries. The shared Python worker uses LlamaIndex Workflows for orchestration and Supabase Queues (`pgmq`) for delivery. Each app keeps its own function entry point and feature policy. The worker dispatches using trusted task fields and enforces the owning app's data and tool policy. LlamaIndex workflow state is currently in memory; durable task state belongs in Supabase, with checkpoint/resume added if a feature needs it.

```text
App frontend
  -> app-specific Edge Function (authenticate, validate)
  -> create task record + short-lived input + enqueue task ID
  <- accepted + task ID

Queue/event -> worker or agent harness
                -> load task and short-lived input
                -> recheck current user, school, course, and source access
                -> run bounded steps with allowlisted tools
                -> save result/status and usage metadata

Frontend <- task status via RLS-protected read, Realtime, or polling
```

Recommended lifecycle:

1. The frontend submits a typed request to the app's Edge Function. The function authenticates the caller and validates feature fields. A restricted database RPC, callable only with the server-side service-role key, receives the verified user ID, stores the queued task and short-lived feature input, and enqueues only the task ID in the same transaction. It returns an accepted response; it does not authorize school data or run inference inline.
2. A worker claims the task, rechecks that it is valid and not cancelled, confirms the owner's current app-specific access, and loads source records through a trusted server path. Give each task a deadline, maximum steps, token/cost budget, and allowlisted tools. Require confirmation for consequential actions such as publishing content or messaging users.
3. The worker records progress and ends in a terminal state such as `succeeded`, `failed`, `cancelled`, or `needs_review`. Persist typed results and concise status messages; keep raw chain-of-thought and provider internals out of task records and logs.
4. The frontend reads task status through an authenticated, owner-scoped/RLS-protected endpoint or subscription. Realtime is an optional notification path, not an authorization mechanism; clients must still be permitted to read the task. Polling can be the initial fallback.
5. Retry only transient failures, with bounded backoff and idempotent task effects. After the retry limit, move the task to a dead-letter/review state and expose a safe failure message. Support cancellation and stale-task cleanup.

Supabase Queues is pull-based, so the Python worker runs as a separate process/container and claims work from `pgmq`. `education-ai` atomically creates the task and enqueues `{ "task_id": "<uuid>" }` through the restricted `enqueue_education_ai_task` RPC. Short-lived feature inputs live in a private table, not in queue messages or generic task metadata. The worker removes inputs after terminal processing, verifies education access before loading lessons, persists results in a table with owner-scoped RLS reads, and archives terminal messages. Do not expose queue operations or the private schema through the Data API. App-specific function entry points remain the only public initiation boundary; do not expose a generic client-callable agent runner. Setup notes are in [`services/ai-worker/`](../services/ai-worker/README.md).

Every AI feature follows this queue/worker path. The task can still be a single bounded provider call; the Edge Function never runs inference inline.

## Shared package contract

`@devx/ai` is the app-facing contract, not the place where the model runs. Keep it independent of a vendor and safe to bundle into browser apps. It may provide:

- Common types for request IDs, error codes, usage metadata, and feature invocation results.
- Feature payload/result types where they are genuinely shared; otherwise app-owned types can remain in each app.
- A small invocation adapter that accepts an already-created Supabase client and calls a function by name.
- The current mock provider for local UI previews, clearly marked as mock-only.

Apps should depend on this contract instead of importing provider SDKs or duplicating transport/error conventions. Keep prompts and education-specific data types out of the shared package unless a second app has the same semantics. Any dependency imported by `packages/ai` belongs in `packages/ai/package.json` and needs a documented reason.

## Backend and AI tooling

- **Supabase CLI and Deno test runner:** `@devx/backend-tools` owns pinned `supabase` and `deno` development dependencies. Run Supabase commands from the repository root with `npm run supabase --workspace @devx/backend-tools -- <command>`. Run the education function suite with `npm run test:education-ai --workspace @devx/backend-tools`. This keeps backend tooling out of browser app bundles.
- **Frontend/backend client:** `@supabase/supabase-js` is already declared by `@devx/core`, which exposes `createBackend()`. Apps use that shared client rather than importing Supabase directly.
- **Edge Function runtime:** Supabase Edge Functions run on Deno. Keep their imports and runtime configuration in each function's `deno.json` (or supported import map), as recommended by Supabase. Do not add server-only function dependencies to the browser-facing `@devx/ai` package.
- **AI provider calls:** No provider has been approved yet. Start with the worker's server-side provider interface and standard `fetch` if the approved provider exposes a suitable HTTP API. Add a provider SDK only after provider/privacy eligibility is settled, and declare it in the worker package that imports it. Do not add a model SDK to the Edge Function or shared browser package.
- **Runtime validation:** Define and validate request and response schemas at the function boundary. Add a schema library only if its runtime benefit justifies a dependency shared across functions; otherwise use small explicit validators for the narrow initial contract.

The Supabase CLI is a development tool, so it belongs in the backend tooling workspace's `devDependencies`. Provider SDKs are runtime code and belong with the server function that imports them, not in the CLI/tooling package. The exact dependency rationale is recorded here so future provider choices can be reviewed before installation.

## Edge Function organization

Use app- and capability-specific function entry points, such as `education-ai` for education features, rather than exposing an unrestricted `generate(prompt)` endpoint. Each entry point maps a small allowlist of feature IDs to server-owned policy/configuration. It must not accept arbitrary system prompts, model names, provider URLs, or tool instructions from the caller.

Keep provider implementation behind a server-only interface, for example `generate(input, config)`. Provider adapters and app handlers run in the worker, never in `@devx/ai`, frontend bundles, or the enqueue function. Give each app its own Edge Function entry point (and add separate functions by capability when useful); keep request validation in the function and feature authorization, source loading, and prompt construction in the owning app's worker handler. Share only infrastructure that remains identical across apps. The worker dispatches by trusted task fields and never accepts policy from the queue payload.

## Contract and failure behavior

Each feature has a versioned input/output schema and explicit limits: text length, item count, output size, timeout, and allowed role. A response should have a predictable shape, for example:

```ts
type AiResult<T> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId?: string; error: { code: string; retryable: boolean } };
```

Do not expose provider error text, keys, stack traces, or internal prompts to clients. Treat malformed or schema-invalid model output as a controlled failure; do not silently publish it. Retries must be bounded and limited to transient failures. Set an idempotency strategy before enabling actions that create persistent records.

## Privacy, security, and operations

- Never place provider keys in `VITE_*` variables, source code, or client-visible configuration. Store the service-role key in Edge Function secrets and provider keys in the worker's secret manager.
- Authenticate every request and enforce authorization server-side. A UI role toggle is not authorization.
- Send only the content required for the feature. Avoid names, email addresses, student IDs, grades, and other identifying or sensitive records unless an approved provider and explicit feature requirement justify them.
- Do not send personal data to a free-tier AI provider. Check provider age, region, retention, training, and contractual terms before pilot use; an edge-function proxy does not change provider terms.
- Do not log raw lesson text, student questions, generated responses, tokens, or credentials by default. Log request ID, app/feature, actor ID or pseudonymous key as appropriate, outcome, duration, token/cost estimate, and model/version only as policy permits.
- Apply per-user and per-feature quotas, payload limits, timeouts, and budget alerts. Return a useful unavailable/rate-limited state when limits are reached.
- For queued agent tasks, enforce task ownership on reads, deadlines and step/tool budgets in the worker, bounded retries, cancellation, and idempotent side effects. Require human approval before externally visible or consequential actions.
- Store AI feedback separately from protected student records or with explicit RLS and retention rules. Do not use feedback for provider training without an approved policy.
- Use database RLS for persisted app data and verify both enqueue authentication and worker-side authorization before exposing real student data.

## Education app as the first implementation

The education app is the first consumer, not the owner of the shared AI transport or provider layer. Its first features can be:

1. **Teacher quiz draft generation:** lesson ID and bounded options in, structured question drafts out. The worker confirms teacher/course access, loads the lesson, and drafts questions. The teacher edits and approves before students can see or take the quiz; generated content is never auto-published.
2. **Student lesson helper:** lesson ID and question in, short explanation grounded in the authorized lesson content. The worker checks enrollment/access and sends no student identity. The answer should state when the lesson does not contain enough information rather than inventing a citation or fact.

Prompts, education permissions, lesson-scoped grounding, teacher approval, student-facing copy, and education-specific evaluation examples belong to the education worker handler. The common request envelope, enqueue authentication pattern, provider adapter, output validation mechanics, rate limits, and operational metadata can be reused by other apps.

`education-ai` verifies Supabase Auth, validates `quiz.generate` and `lesson.explain` request bounds, and atomically creates/enqueues a task. The Python/LlamaIndex worker consumes the queue, checks current school/course permissions, runs both handlers with the mock provider, validates results, and persists task status and owner-readable output. The production provider and frontend task-status flow are not implemented yet. The request accepts a lesson ID rather than caller-supplied lesson text; the worker loads the lesson only after confirming the task owner's current access.

## Other education features under consideration

**Planning only:** the items below are proposals for discovery and product decisions. They are not implementation commitments. Several are ordinary backend workflows and should not use a language model just because they appear on an AI feature list.

| Proposed feature | Recommended approach | Important boundary / review |
| --- | --- | --- |
| Generate student performance summaries | AI draft from a minimal, server-prepared set of assessment and progress facts | Show the time period and source facts; distinguish measured facts from generated wording. Teacher reviews before sharing or saving as an official record. |
| Identify students whose performance is declining | Deterministic trend rules over validated scores/progress, with configurable time windows and thresholds | Return the evidence and rule that triggered the flag. Treat it as a review prompt, not a diagnosis or automated intervention. Teacher confirms next steps. |
| Send automated school-fee reminders | Deterministic balance lookup, schedule, and approved message template | The backend computes the amount and recipient. Require correct guardian-to-student links, deduplication, delivery status, and an appropriate approval policy. Do not use an LLM to calculate balances or decide whom to contact. |
| Generate draft report-card comments | AI draft grounded in teacher-selected evidence and an agreed rubric | Teacher edits and approves every comment. Do not infer traits, behavior, causes, or achievement that are absent from the supplied evidence. Preserve the evidence period and draft provenance. |
| AI assistant for parents and school administrators | Authenticated retrieval assistant with separate parent and admin policies and allowlisted read tools | Parent access is limited to linked children; admin access follows school scope. Retrieve only permitted records. Require confirmation for writes or messages; never expose a general-purpose database or agent tool. |
| Automate attendance notifications | Deterministic event-driven workflow triggered by attendance state changes | Verify guardian and contact preferences, deduplicate retries, record delivery outcomes, and define correction/escalation handling. The model must not decide attendance status or trigger messages. |

### Shared foundation these features may reuse

- Reuse the Supabase Auth boundary, app-owned Edge Function entry points, validated contracts, safe operational metadata, provider adapter, and provider approval gate described above.
- Build sensitive insights from server-side queries that enforce school, role, and student relationships. Send a minimal prepared payload to a model only when the approved provider and data policy allow it; never let the model query the database directly.
- Keep generated prose separate from source facts. Return structured output that can be displayed alongside its time range and evidence; require the appropriate human review before a result becomes an official record or is sent externally.
- Use a queue/worker for scheduled or durable work. Store an idempotency key and task/message state so retries cannot create duplicate drafts, flags, or notifications. The queue is an execution tool; deterministic feature rules remain app-owned.
- Keep parent and administrator assistants as separate permission profiles even if they share the same retrieval and model infrastructure. The caller's role and record scope come from trusted backend state, never from prompt text or a client-supplied role.

### Suggested discovery order

1. **Specify the deterministic workflows first:** define attendance state transitions and fee-reminder rules, recipients, timing, deduplication, opt-out/correction behavior, approvals, and audit requirements. These provide clear acceptance criteria without a model.
2. **Specify declining-performance flags:** agree the exact metrics, comparison period, minimum data requirements, thresholds, missing-data behavior, and who may view/clear a flag. Validate that thresholds support review rather than high-impact automatic decisions.
3. **Design teacher-facing AI drafts:** define the evidence schema, rubric, tone, input minimization, review/edit/save flow, and a non-identifying evaluation set for summaries and report-card comments. Confirm provider eligibility before using real student data.
4. **Scope role-specific assistants last:** list parent and administrator tasks separately, identify each permitted data source and tool, then define refusal behavior and human confirmation for every write or external action. Start with read-only answers to bounded questions before considering agentic workflows.

Before selecting any of these for a pilot, record a feature owner, authorized roles, data fields, output destination, review/approval gate, evaluation cases, failure behavior, and retention policy. No new model provider or runtime dependency is selected by this plan.

## Delivery sequence

1. Agree provider eligibility, privacy terms, and whether the pilot can use real student data. If not approved, keep mock data or defer live AI.
2. Stabilize the shared browser-safe request/result contract and mock behavior in `@devx/ai`.
3. Add the worker's server-side provider interface and provider implementation; store credentials in the worker's secret manager.
4. Implement one narrow education flow end to end (quiz drafts), including enqueueing, worker-side authorization, validation, limits, safe usage logging, task status, and teacher review.
5. Evaluate against a curated, non-identifying set of examples; record quality, malformed-output, latency, and cost results. Add the study helper only after its grounding and privacy behavior are acceptable.
6. Add feedback/usage views and operational budget controls before pilot rollout; repeat provider and privacy review before real student use.
7. Harden the Python/LlamaIndex worker for deployment: add metrics/health checks, cancellation, stale-input cleanup, reviewed provider configuration, and explicit database grants for a least-privilege worker role. The initial queue consumer, education authorization/loading, retries, and task/result persistence are implemented.

## Decisions to settle before production

- Which provider and account tier meet the app's user age, geography, data-use, and retention needs?
- Are model/provider settings global or configurable per app and feature?
- Which usage metadata is retained, for how long, and who can inspect it?
- What request quotas and monthly spend limits apply per user, app, and environment?
- Which outputs may be persisted, and which require human approval?
- What is the supported behavior when AI is unavailable: retry, queue, mock/demo mode, or feature disabled?
- Where will the shared Python worker run, and which least-privilege credential path will it use to claim queue messages and access task records?
- Which agent tools and side effects are allowed per app, and which require human approval?
- What task retention, progress visibility, cancellation, retry, and dead-letter behavior does each app require?
