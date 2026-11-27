# Education data model and AI interaction plan

**Status:** The education foundation, shared task lifecycle table, durable queue, `education-ai` enqueue RPC, Python queue consumer, worker authorization, and education task result table are implemented. The production provider and frontend task-status UI remain planned.

This plan describes the education data that should exist before AI features use real school records, and how the `education-ai` enqueue function and shared worker interact with it. The initial schema is in migrations; later feature tables still require decisions about tenancy, role, retention, and product behavior.

## Current function boundary

[`supabase/functions/education-ai/index.ts`](../supabase/functions/education-ai/index.ts) authenticates the Supabase user, validates `lesson.explain` and `quiz.generate` inputs, and invokes the restricted enqueue RPC using a server-only service-role client. It does not read education data, check school roles, or call a provider. The RPC accepts the owner ID only from that trusted function path, creates the task, stores a short-lived feature input in `private.education_ai_task_inputs`, and queues only the task ID. The worker must resolve the lesson and its school/course, confirm the user's current access for that specific feature, load content, and then call the provider. A global role claim alone cannot represent a user who has different roles in different schools.

## Proposed logical model

Use `auth.users` as the identity source. Do not duplicate passwords, auth credentials, or personal profile fields into application tables. Every school-owned record carries a `school_id`; links between records should enforce that both sides belong to the same school (for example with composite foreign keys involving `(school_id, id)`). Prefer explicit `created_at`/`updated_at` timestamps, stable UUID identifiers, and restrictive delete behavior for academic and audit records.

### Identity, tenancy, and learning records

| Entity | Purpose and key relationships |
| --- | --- |
| `profiles` | Minimal app profile keyed by `user_id` referencing `auth.users.id`. Store only fields needed by the product; keep school membership and authorization separate. |
| `schools` | Tenant root and school-level settings. |
| `school_memberships` | `(school_id, user_id)` membership, status, and school-scoped role such as student, teacher, administrator, or parent/guardian. A person may have memberships in multiple schools. |
| `student_guardians` | Explicit, active relationship between a student and guardian, with relationship/consent or notification preferences where required. Parent access is granted through this link, not by role alone. |
| `courses` | School-owned course/class metadata and responsible teacher relationship. |
| `course_memberships` | Enrollment/teaching relationship between users and courses, with status and effective dates. It is the basis for lesson and student-record scope. |
| `lessons` | Course-owned lesson metadata and content reference. Include a revision/version identifier so generated work can identify the source revision. Consider storing large content separately if access/retention needs differ. |
| `assessments` and `assessment_items` | Teacher-owned assessment definitions and versioned questions. Generated questions begin as drafts and become assessment items only through an explicit teacher approval/publish action. |
| `assessment_attempts` | Student attempt, answers or normalized answer references, score, submission time, and assessment version. Protect student-level rows with strict RLS. |
| `attendance_records` | Later deterministic attendance events, with source, event time, correction/audit fields, and school/course/student scope. Add when attendance workflows are designed. |
| `fee_accounts` / `fee_obligations` | Later source-of-truth balances and due dates, owned by finance rules. An AI model must never calculate balances or choose recipients. Add only with the fee workflow design. |

This is a staged model, not a requirement to create every table at once. The initial database foundation should settle schools/memberships, courses/enrollments, lessons, and the assessment/draft lifecycle. Add attendance and fee entities only when their deterministic workflows and permissions are specified.

### AI operational and draft records

| Entity | Purpose and boundary |
| --- | --- |
| `ai_tasks` | Implemented in `20261122120000_ai_tasks.sql`. One row per accepted operation: task and request IDs, optional idempotency key, app/feature/schema identifiers, optional school scope, creator, lifecycle status, source and result references, prompt/provider/model identifiers, bounded usage metadata, a safe failure code, attempt limits, deadlines, and lifecycle timestamps. It intentionally stores references rather than prompts, full lesson bodies, student names, generated prose, or chain-of-thought. |
| `private.education_ai_task_inputs` | Implemented in `20261123090000_education_ai_enqueue.sql`. Holds only the lesson ID and bounded feature input until worker processing; the table is outside the Data API and has no client grants. Worker must delete the row after terminal processing. It must not be used for lesson bodies, names, or generated prose. |
| `education_ai_task_results` | Implemented in `20261123100000_education_ai_task_results.sql`. Stores the typed answer/quiz output separately from generic task metadata. RLS lets the task owner read it only while they retain active school access. Quiz output remains review-required and unpublished. |
| `quiz_drafts` and `report_comment_drafts` | Domain-specific editable output, linked to `ai_tasks` and source records. Include review state, creator/reviewer, reviewed/published timestamps, and the final destination reference. The generated text lives here if it must be retained; avoid duplicating it in generic task JSON. |
| `ai_reviews` (optional) | Reviewer action and structured feedback category linked to the task/draft. Avoid free-form student data in feedback. Define access and retention before enabling this table. |
| `notification_outbox` (later) | Durable delivery state for fee/attendance notifications: recipient relationship, approved template/version, minimal message parameters, idempotency key, due/sent times, attempts, and provider delivery ID. Keep it separate from AI tasks because message scheduling and delivery are deterministic operations. |
| `performance_flags` (later) | Deterministic decline indicators with metric/window/rule version, evidence references, status, and review resolution. Store the measured evidence and rule; do not store a model's unsupported judgment as a flag. |

For an explanation request, persistence can be opt-in or omitted: return the answer and request ID without retaining the learner's question/answer. For durable work, store only source references plus versions and the minimal result required by the product. If a worker must process an immutable snapshot, define a protected, short-lived snapshot store and retention period explicitly rather than putting source text in the queue or ordinary logs.

## Authorization and row-level security

Treat school membership and relationship tables as the authorization source. The JWT identifies the user. The enqueue function passes the verified user ID into a server-only RPC; the worker then checks active membership and role for the relevant `school_id`, course, lesson, and student before reading source data. The current global `education_role` claim may be a coarse early scaffold, but should not authorize school-specific data by itself.

- Enable RLS for all user- or school-scoped tables. Include `school_id` checks and active membership checks in policies.
- Students can read their own permitted learning records. Teachers can access learners only through courses they teach. School administrators are scoped to their own school.
- Guardians can read only the records allowed by an active `student_guardians` link and the school's guardian policy; do not grant broad access to all students in a school.
- Clients must not directly insert or update AI task status, generated drafts, approvals, or published assessment records. Route these transitions through the authorized Edge Function or a narrowly scoped server path.
- The current `ai_tasks` read policies allow an owner with an active school membership to read their own school-scoped task, and an active school admin to read tasks for that school. Non-school tasks are owner-readable. Client insert/update/delete privileges are withheld.
- The enqueue function should use the caller JWT to verify identity. The worker may use a service-role or dedicated database credential; it must recheck task ownership, school scope, and current authorization in trusted code and never expose its credential to the browser.
- Add indexes for common policy predicates and access paths: `(school_id, user_id, status)` on memberships, `(school_id, course_id, user_id, status)` on course memberships, `(school_id, student_id, submitted_at)` on attempts, and `(school_id, created_by, created_at)` on AI tasks. Confirm actual query plans when implementation begins.

RLS policies and worker-side authorization checks are complementary. Realtime subscriptions are only a delivery mechanism; they do not grant permission to read a row.

## `education-ai` enqueue and worker interaction

The planned request should identify the feature and source record, not carry trusted content or authorization claims. For example:

```json
{
  "feature": "quiz.generate",
  "lessonId": "<lesson UUID>",
  "count": 5,
  "idempotencyKey": "<client-generated key>"
}
```

The current enqueue flow is:

1. Authenticate the Supabase access token and derive `user_id` from the verified session.
2. Validate feature, lesson ID, feature parameters, body size, and optional idempotency key. Ignore client-supplied user ID, school ID, role, provider/model, and prompt.
3. Call `enqueue_education_ai_task` from the Edge Function using its server-only service-role client. The RPC repeats input validation, accepts the verified owner ID from the trusted function, creates the `queued` task, stores minimal inputs in the private short-lived input table, and enqueues only `{ task_id }` in the same transaction. Browser roles cannot execute this RPC.
4. Return `202 Accepted` with task and request IDs. Do not load school data or call a provider in the Edge Function.

The worker must then load the task and private input, check cancellation/deadline and the owner's current school/course/lesson permissions, retrieve the latest authorized lesson revision, and prepare a minimized provider request. It validates provider output, records safe usage and task state, writes a review-required quiz draft when applicable, and deletes the short-lived input after terminal processing. Duplicate queue delivery must not repeat side effects. The task read endpoint remains protected by RLS; the frontend polls or subscribes until the status is terminal.

## Long-running tasks and related features

All model work uses `ai_tasks` as the durable lifecycle record, even a single bounded provider call. The enqueue function creates the owner-bound task and queues only its ID. A worker loads the task and minimum source records, verifies scope/status, executes under a deadline/step/cost budget, then writes the result and terminal state. The frontend reads status and drafts through RLS-protected queries or an authorized endpoint. Queue delivery and task processing must be idempotent.

Use the same education data foundation differently by feature:

- **Performance summaries:** server queries the authorized assessment/progress window and produces a minimal evidence payload. The model drafts wording; source facts and time period remain visible, and a teacher reviews before saving/sharing.
- **Declining performance:** compute trend flags deterministically from assessment attempts and progress. A teacher-facing flag points to its metric, window, rule version, and evidence; the model is not the detector.
- **Report-card comments:** provide only teacher-selected evidence and rubric context to the model. Save as a review-required `report_comment_drafts` record; never publish automatically.
- **Fee reminders:** calculate balance, recipient, timing, and message eligibility from fee and guardian records. Create a deduplicated outbox item and send an approved template through a worker; AI is optional for wording only after privacy approval, not for amounts or recipient selection.
- **Parent/admin assistant:** retrieve through allowlisted, role-scoped queries. Parent retrieval is limited to actively linked children; administrators remain school-scoped. A general database query tool is not exposed to the model.
- **Attendance notifications:** attendance state changes drive deterministic outbox entries. The AI system does not decide whether a student was absent or whether a guardian should be notified.

## Next decisions before app workflow integration

1. Can users belong to multiple schools, and what roles can they hold per school/course?
2. What guardian verification, consent, and contact preferences control child-record access and notifications?
3. Which lesson content and assessment facts may be sent to which approved provider, for which user ages and regions?
4. Which AI outputs are retained, for how long, and who can view or delete them? Are explanations ephemeral by default?
5. What is the official approval/publishing lifecycle for generated assessments and report comments?
6. What are the retention and correction rules for attempts, attendance, fees, AI metadata, and delivery records?
7. Which operations run synchronously, and which require a queue/worker, cancellation, retries, or review state?

Resolve these in feature-specific decisions before connecting real student data to a model provider. Queue messages contain only a `task_id`; the `ai_tasks` row remains the lifecycle source of truth. The worker consumer and education authorization path are implemented, but the worker deployment and frontend status/result flow remain. The input table's `expires_at` is not an automatic deletion policy; add an orphan-input cleanup job before production.
