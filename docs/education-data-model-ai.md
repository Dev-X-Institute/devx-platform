# Education data model and AI interaction plan

**Status:** Planning proposal. No schema or application code is implemented by this document.

This plan describes the education data that should exist before AI features use real school records, and how the `education-ai` Edge Function should read and write that data. Names are provisional; migrations should follow only after tenancy, role, retention, and product decisions are settled.

## Current function boundary

[`supabase/functions/education-ai/index.ts`](../supabase/functions/education-ai/index.ts) currently accepts caller-supplied `lessonText`, authenticates the Supabase user, reads a global `education_role` from trusted `app_metadata`, validates the request, and calls a configured OpenAI-compatible endpoint. `quiz.generate` is limited to teacher/admin roles and returns a review-required draft; `lesson.explain` returns an answer. The function does not read or write education tables, establish course membership, persist drafts, or record AI task/usage rows.

This is adequate for a scaffold using synthetic content. Before it handles real lessons or student records, the function should accept record identifiers and bounded feature parameters, then load content server-side after checking the caller's school and record access. A global role claim alone cannot represent a user who has different roles in different schools.

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
| `ai_tasks` (or `ai_runs` for synchronous-only work) | One row per accepted AI operation: `id`, `request_id`, `school_id`, `created_by`, `feature_key`, `status`, minimal `input_refs`, source revision IDs/hashes, prompt/config version, provider/model identifier, timestamps, bounded usage metadata, and a safe failure code. Do not store raw prompts, full lesson bodies, student names, or chain-of-thought by default. Statuses should be constrained, e.g. `queued`, `running`, `succeeded`, `failed`, `cancelled`, `needs_review`. |
| `quiz_drafts` and `report_comment_drafts` | Domain-specific editable output, linked to `ai_tasks` and source records. Include review state, creator/reviewer, reviewed/published timestamps, and the final destination reference. The generated text lives here if it must be retained; avoid duplicating it in generic task JSON. |
| `ai_reviews` (optional) | Reviewer action and structured feedback category linked to the task/draft. Avoid free-form student data in feedback. Define access and retention before enabling this table. |
| `notification_outbox` (later) | Durable delivery state for fee/attendance notifications: recipient relationship, approved template/version, minimal message parameters, idempotency key, due/sent times, attempts, and provider delivery ID. Keep it separate from AI tasks because message scheduling and delivery are deterministic operations. |
| `performance_flags` (later) | Deterministic decline indicators with metric/window/rule version, evidence references, status, and review resolution. Store the measured evidence and rule; do not store a model's unsupported judgment as a flag. |

For an explanation request, persistence can be opt-in or omitted: return the answer and request ID without retaining the learner's question/answer. For durable work, store only source references plus versions and the minimal result required by the product. If a worker must process an immutable snapshot, define a protected, short-lived snapshot store and retention period explicitly rather than putting source text in the queue or ordinary logs.

## Authorization and row-level security

Treat school membership and relationship tables as the authorization source. The JWT identifies the user; the function/database then checks their active membership and role for the relevant `school_id`, course, lesson, and student. The current global `education_role` claim may be a coarse early scaffold, but should not authorize school-specific data by itself.

- Enable RLS for all user- or school-scoped tables. Include `school_id` checks and active membership checks in policies.
- Students can read their own permitted learning records. Teachers can access learners only through courses they teach. School administrators are scoped to their own school.
- Guardians can read only the records allowed by an active `student_guardians` link and the school's guardian policy; do not grant broad access to all students in a school.
- Clients must not directly insert or update AI task status, generated drafts, approvals, or published assessment records. Route these transitions through the authorized Edge Function or a narrowly scoped server path.
- A function should query with the caller's JWT/RLS context where practical. If a service-role client is needed for a worker, recheck task ownership, school scope, and current authorization in trusted code; never expose that key to the browser.
- Add indexes for common policy predicates and access paths: `(school_id, user_id, status)` on memberships, `(school_id, course_id, user_id, status)` on course memberships, `(school_id, student_id, submitted_at)` on attempts, and `(school_id, created_by, created_at)` on AI tasks. Confirm actual query plans when implementation begins.

RLS policies and Edge Function checks are complementary. Realtime subscriptions are only a delivery mechanism; they do not grant permission to read a row.

## Synchronous `education-ai` interaction

The planned request should identify the feature and source record, not carry trusted content or authorization claims. For example:

```json
{
  "feature": "quiz.generate",
  "lessonId": "<lesson UUID>",
  "count": 5,
  "idempotencyKey": "<client-generated key>"
}
```

The function flow should be:

1. Authenticate the Supabase access token and derive `user_id` from the verified session.
2. Validate the feature payload, size limits, and idempotency key. Ignore client-supplied user ID, school ID, role, provider/model, and prompt.
3. Resolve the lesson and its school/course on the server. Confirm active school membership and feature-specific access: teacher/admin course access for quiz generation; student enrollment (or teacher access) for lesson explanation.
4. Load only the lesson revision/content needed. Minimize or redact incidental personal data before inference. Apply provider eligibility/approval, rate limits, and budgets before the call.
5. Create an `ai_tasks`/`ai_runs` metadata row with a request ID and source references. Use a state that distinguishes the provider call from a persisted draft, so a failed model call cannot look successful.
6. Call the approved provider, validate the structured output, and record safe usage/outcome metadata. Do not log raw lesson text, questions, answers, or provider error bodies.
7. For quiz generation, write a `quiz_drafts` row linked to the task and lesson revision; return its ID and typed draft. Keep it unpublished until an authorized teacher reviews and explicitly approves it. For lesson explanation, return a typed answer; retain no content by default unless a separately approved feature requires it.
8. Return the stable response envelope with `requestId` and result or safe error code. Make duplicate submissions idempotent so retries do not create duplicate drafts.

This changes the current `lessonText`-in-request approach: the function must read the source record after authorization. It also means the function should not rely on client-side `@devx/ai` types as a security boundary; server validation and database policies remain authoritative.

## Long-running tasks and related features

When work needs retries, progress, scheduled execution, or multiple bounded tool steps, use `ai_tasks` as the durable lifecycle record. The function creates the authorized task and queues only its ID plus non-sensitive routing metadata. A worker loads the task and minimum source records, verifies scope/status again, executes under a deadline/step/cost budget, then writes the result and terminal state. The frontend reads status and drafts through RLS-protected queries or an authorized endpoint. Queue delivery and task processing must be idempotent.

Use the same education data foundation differently by feature:

- **Performance summaries:** server queries the authorized assessment/progress window and produces a minimal evidence payload. The model drafts wording; source facts and time period remain visible, and a teacher reviews before saving/sharing.
- **Declining performance:** compute trend flags deterministically from assessment attempts and progress. A teacher-facing flag points to its metric, window, rule version, and evidence; the model is not the detector.
- **Report-card comments:** provide only teacher-selected evidence and rubric context to the model. Save as a review-required `report_comment_drafts` record; never publish automatically.
- **Fee reminders:** calculate balance, recipient, timing, and message eligibility from fee and guardian records. Create a deduplicated outbox item and send an approved template through a worker; AI is optional for wording only after privacy approval, not for amounts or recipient selection.
- **Parent/admin assistant:** retrieve through allowlisted, role-scoped queries. Parent retrieval is limited to actively linked children; administrators remain school-scoped. A general database query tool is not exposed to the model.
- **Attendance notifications:** attendance state changes drive deterministic outbox entries. The AI system does not decide whether a student was absent or whether a guardian should be notified.

## Decisions before migrations

1. Can users belong to multiple schools, and what roles can they hold per school/course?
2. What guardian verification, consent, and contact preferences control child-record access and notifications?
3. Which lesson content and assessment facts may be sent to which approved provider, for which user ages and regions?
4. Which AI outputs are retained, for how long, and who can view or delete them? Are explanations ephemeral by default?
5. What is the official approval/publishing lifecycle for generated assessments and report comments?
6. What are the retention and correction rules for attempts, attendance, fees, AI metadata, and delivery records?
7. Which operations run synchronously, and which require a queue/worker, cancellation, retries, or review state?

Resolve these in feature-specific decisions before implementing migrations. Then implement a small initial schema, RLS policies, and authorization tests before connecting real student data to the model provider.
