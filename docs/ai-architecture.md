# Platform AI architecture

**Status:** A Python/LlamaIndex worker scaffold with a mock provider, the shared `ai_tasks` lifecycle table, and a durable Supabase `ai_tasks` queue are in place. Queue consumption, app enqueue functions, a production AI provider, and worker deployment remain pending.

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
| Supabase Edge Functions | Authenticate requests, authorize the caller and feature, validate/limit payloads, invoke server-side AI service, return a typed result, record safe usage metadata | Trusting caller-supplied role or user ID, returning secrets, unreviewed writes to learning records |
| Server-side AI service | Shared provider interface/implementations, model configuration, timeouts, retries, output parsing, safety and cost controls | Education-specific decisions or business rules |
| App feature policy | Feature-specific prompts, allowed inputs/outputs, role rules, review requirements, evaluation cases | Shared provider implementation |

The frontend continues to obtain its Supabase client through `createBackend()` in `@devx/core`. Supabase Auth supplies the user's access token when the frontend calls an Edge Function. The function verifies the JWT, obtains the trusted user identity, and checks permissions before doing any AI work. Database access uses the caller's scoped identity and RLS where possible; service-role access is reserved for narrowly justified server tasks and never sent to the browser.

## Request path

1. An app screen calls an app-owned feature client (or the shared `@devx/ai` transport helper) with a typed, minimal feature payload.
2. The client invokes a named Supabase Edge Function using the `createBackend()` client. It does not call an AI vendor directly.
3. The function authenticates the request, checks the app/feature and role, validates schema and size, applies rate/usage limits, and removes fields not needed for inference.
4. The function calls the server-side AI service through a provider-neutral interface. The service loads credentials from function secrets, applies the feature's prompt/configuration, calls the selected provider, and parses the result against a strict schema.
5. The function returns a stable success/error envelope. It stores usage and feedback metadata as needed, without logging raw prompts or answers by default.
6. The frontend handles loading, retryable errors, and result review. App rules determine whether output is a draft, an explanation, or eligible for a later human-approved action.

This synchronous path is for bounded work that should finish within the Edge Function request budget. Do not keep a function invocation open while an agent performs a long task or waits on external systems.

```text
App screen
  -> @devx/ai browser-safe contract/client
  -> @devx/core createBackend() Supabase client
  -> Supabase Auth JWT + named Edge Function
  -> authenticate / authorize / validate / limit / minimize
  -> server-side AI service -> provider adapter -> model provider
  <- schema-checked result + request id / safe error
```

## Long-running and agentic tasks

For long-running or multi-step work, use an event-driven worker rather than treating an Edge Function as a persistent agent runtime. The selected direction is a shared Python worker using LlamaIndex Workflows for orchestration and Supabase Queues (`pgmq`) for durable message delivery. The app still owns its entry point and policy: `education-ai` authorizes an education task and enqueues it; another app uses its own function and app-specific checks. The worker/harness can be shared infrastructure, but it must retain the task's app and feature context and enforce that feature's tool and data policy. LlamaIndex workflow state is currently in-memory; durable task state belongs in Supabase, with workflow checkpoint/resume to be added if a feature needs it.

```text
App frontend
  -> app-specific Edge Function (authenticate, authorize, validate)
  -> create task record + enqueue task ID
  <- accepted + task ID

Queue/event -> worker or agent harness
                -> load task and minimal authorized inputs
                -> run bounded steps with allowlisted tools
                -> save result/status and usage metadata

Frontend <- task status via RLS-protected read, Realtime, or polling
```

Recommended lifecycle:

1. The frontend submits a typed request to the app's Edge Function. The function authenticates the caller, verifies app-specific access and idempotency, applies quotas, stores a task record with an owner and `queued` status, and publishes a queue message containing the task ID (and only essential routing metadata). It returns an accepted response with the task ID; it does not run the agent inline.
2. A worker claims the task, loads its input through a trusted server path, and rechecks that the task is valid, not cancelled, and within limits. Give each task a deadline, maximum steps, token/cost budget, and allowlisted tools. Require confirmation for consequential actions such as publishing content or messaging users.
3. The worker records progress and ends in a terminal state such as `succeeded`, `failed`, `cancelled`, or `needs_review`. Persist typed results and concise status messages; keep raw chain-of-thought and provider internals out of task records and logs.
4. The frontend reads task status through an authenticated, owner-scoped/RLS-protected endpoint or subscription. Realtime is an optional notification path, not an authorization mechanism; clients must still be permitted to read the task. Polling can be the initial fallback.
5. Retry only transient failures, with bounded backoff and idempotent task effects. After the retry limit, move the task to a dead-letter/review state and expose a safe failure message. Support cancellation and stale-task cleanup.

Supabase Queues is pull-based, so the Python worker runs as a separate process/container and claims work from `pgmq`; the Edge Function only accepts, authorizes, records, and enqueues. The durable `ai_tasks` queue is provisioned by `20261122130000_ai_tasks_queue.sql`, but no producer or consumer is connected yet. Keep each message to `{ "task_id": "<uuid>" }`; the task row is the source of truth. Do not expose queue operations through the Data API or to browser clients. The worker uses server-side credentials with the minimum access needed and never exposes service-role or provider secrets to the app. App-specific function entry points remain the only public initiation boundary; do not expose a generic client-callable agent runner. The initial scaffold and local/hosted setup notes are in [`services/ai-worker/`](../services/ai-worker/README.md).

Use this pattern only when work exceeds a short request/response interaction or needs durable retries, progress, external tools, or multiple coordinated model steps. A quiz draft or lesson explanation that fits within the synchronous limits should stay on the direct Edge Function path.

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
- **AI provider calls:** No provider has been approved yet. Start with the server-side provider interface and standard `fetch` if the approved provider exposes a suitable HTTP API. Add a provider SDK only after provider/privacy eligibility is settled, and declare it in the Edge Function's `deno.json` or the specific server-side package that imports it. Do not add a model SDK to the frontend or shared browser package.
- **Runtime validation:** Define and validate request and response schemas at the function boundary. Add a schema library only if its runtime benefit justifies a dependency shared across functions; otherwise use small explicit validators for the narrow initial contract.

The Supabase CLI is a development tool, so it belongs in the backend tooling workspace's `devDependencies`. Provider SDKs are runtime code and belong with the server function that imports them, not in the CLI/tooling package. The exact dependency rationale is recorded here so future provider choices can be reviewed before installation.

## Edge Function organization

Use app- and capability-specific function entry points, such as `education-ai` for education features, rather than exposing an unrestricted `generate(prompt)` endpoint. Each entry point maps a small allowlist of feature IDs to server-owned policy/configuration. It must not accept arbitrary system prompts, model names, provider URLs, or tool instructions from the caller.

Keep provider implementation behind a server-only interface, for example `generate(input, config)`. The first provider can live in a shared server-only module if multiple functions need it. Do not import that module from `@devx/ai` or frontend bundles. Give each app its own Edge Function entry point (and add separate functions by capability when useful); keep function-specific authorization and prompt construction close to the owning app function. Share only infrastructure that remains identical across apps. A shared background worker may dispatch by app/feature, but it must load and apply the owning app's trusted policy rather than accepting policy from the event payload.

## Contract and failure behavior

Each feature has a versioned input/output schema and explicit limits: text length, item count, output size, timeout, and allowed role. A response should have a predictable shape, for example:

```ts
type AiResult<T> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId?: string; error: { code: string; retryable: boolean } };
```

Do not expose provider error text, keys, stack traces, or internal prompts to clients. Treat malformed or schema-invalid model output as a controlled failure; do not silently publish it. Retries must be bounded and limited to transient failures. Set an idempotency strategy before enabling actions that create persistent records.

## Privacy, security, and operations

- Never place provider keys in `VITE_*` variables, source code, or client-visible configuration. Use Supabase Edge Function secrets.
- Authenticate every request and enforce authorization server-side. A UI role toggle is not authorization.
- Send only the content required for the feature. Avoid names, email addresses, student IDs, grades, and other identifying or sensitive records unless an approved provider and explicit feature requirement justify them.
- Do not send personal data to a free-tier AI provider. Check provider age, region, retention, training, and contractual terms before pilot use; an edge-function proxy does not change provider terms.
- Do not log raw lesson text, student questions, generated responses, tokens, or credentials by default. Log request ID, app/feature, actor ID or pseudonymous key as appropriate, outcome, duration, token/cost estimate, and model/version only as policy permits.
- Apply per-user and per-feature quotas, payload limits, timeouts, and budget alerts. Return a useful unavailable/rate-limited state when limits are reached.
- For queued agent tasks, enforce task ownership on reads, deadlines and step/tool budgets in the worker, bounded retries, cancellation, and idempotent side effects. Require human approval before externally visible or consequential actions.
- Store AI feedback separately from protected student records or with explicit RLS and retention rules. Do not use feedback for provider training without an approved policy.
- Use database RLS for persisted app data and verify edge-function authorization in tests before exposing real student data.

## Education app as the first implementation

The education app is the first consumer, not the owner of the shared AI transport or provider layer. Its first features can be:

1. **Teacher quiz draft generation:** lesson text in, structured question drafts out. The teacher edits and approves before students can see or take the quiz. The endpoint checks teacher/course access; generated content is never auto-published.
2. **Student lesson helper:** lesson-scoped question in, short explanation grounded in the supplied lesson content. The endpoint checks enrollment/access and sends no student identity. The answer should state when the lesson does not contain enough information rather than inventing a citation or fact.

Prompts, education permissions, lesson-scoped grounding, teacher approval, student-facing copy, and education-specific evaluation examples belong to the education feature/function. The common request envelope, authentication pattern, provider adapter, output validation mechanics, rate limits, and operational metadata can be reused by other apps.

The current `MockAiProvider` still supports the quiz generator's local preview. A server-side `education-ai` Edge Function scaffold accepts `quiz.generate` and `lesson.explain`, verifies Supabase Auth, checks active roles from `school_memberships`, applies input/output bounds, and requires an explicit provider approval flag before calling an OpenAI-compatible endpoint. A separate Python/LlamaIndex worker scaffold demonstrates task routing and an offline mock provider; the current Edge Function does not enqueue to it. The provider is still unselected and unconfigured, and the frontend is not wired to this function yet. The current task payload accepts caller-supplied lesson text, so production use with real student records still requires server-side lesson resolution and course-scoped authorization.

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
3. Add a server-only provider interface and one provider implementation in Supabase Edge Functions; store credentials as function secrets.
4. Implement one narrow education function and feature end to end (quiz drafts), including authentication, authorization, validation, limits, safe usage logging, and teacher review.
5. Evaluate against a curated, non-identifying set of examples; record quality, malformed-output, latency, and cost results. Add the study helper only after its grounding and privacy behavior are acceptable.
6. Add feedback/usage views and operational budget controls before pilot rollout; repeat provider and privacy review before real student use.
7. Extend the Python/LlamaIndex scaffold with a Supabase queue consumer and protected task repository; add an education-specific enqueue path with task state access, retries, cancellation, tool allowlists, and human approval before enabling agent actions. The lifecycle table and durable queue are provisioned, but no producer/consumer currently publishes messages or persists worker transitions.

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
