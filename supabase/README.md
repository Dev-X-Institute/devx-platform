# Supabase

- **Tooling:** Supabase CLI is pinned as a development dependency in `@devx/backend-tools`. From the repository root, run `npm run supabase --workspace @devx/backend-tools -- <command>` (for example, `... -- --version`, `... -- start`, or `... -- functions serve`). `supabase start` requires a compatible local container runtime such as Docker Desktop. Initialize local CLI configuration with `supabase init` when setting up the project locally.
- `migrations/`: SQL files, one per change, named `YYYYMMDDHHMM_description.sql`.
- `functions/education-ai/`: authenticated education AI endpoint. It dispatches the `quiz.generate` and `lesson.explain` features, validates bounded text inputs, enforces education role claims, validates quiz output, and returns drafts without persisting or publishing them.
- Edge Functions run on Deno. Put function-specific runtime dependencies/configuration in that function's `deno.json`; don't add provider SDKs to frontend packages. The AI provider is not selected yet, so no model SDK is installed. Once provider/privacy eligibility is approved, add only the needed server-side dependency and document why.
- Frontend apps access Supabase through `createBackend()` from `@devx/core`, which declares `@supabase/supabase-js` as its own runtime dependency.
- The function checks `user.app_metadata.education_role` (`student`, `teacher`, or `admin`) from a verified Supabase Auth user. Assign this claim through a trusted admin path; never accept a role from the request body. Course/enrollment tables do not exist yet, so course-level access checks remain a prerequisite before pilot use with real lesson records.
- The function sends lesson text and (for `lesson.explain`) the question to the configured model; it does not send the authenticated user's ID. Callers must supply instructional content without student names, contact details, grades, or other identifying records. Durable per-user quotas and course/enrollment authorization still need backend data support before production rollout.
- Local function secrets can be based on `functions/.env.example`; copy it to the ignored `functions/.env.local`. Keep `AI_PROVIDER_APPROVED=false` until provider age, geography, retention, and data-use terms are approved. When approved, set the OpenAI-compatible endpoint URL, secret key, and model name there locally, and set the same values as Supabase Edge Function secrets in the target project. Never commit populated env files.
- From the repo root, serve the local function with `npm run supabase --workspace @devx/backend-tools -- functions serve education-ai --env-file supabase/functions/.env.local`. A successful request also requires a valid local Supabase Auth JWT and the trusted education role claim.
- Run the isolated Edge Function tests with `npm run test:education-ai --workspace @devx/backend-tools`. They mock Supabase Auth and the provider HTTP endpoint, so they need no project credentials, model key, network access, or personal data.
- The endpoint is `POST /functions/v1/education-ai`; callers include the Supabase access token as `Authorization: Bearer ...` and the project anon/publishable key as `apikey`. Request bodies use one of these allowlisted feature shapes:

  ```json
  { "feature": "quiz.generate", "lessonText": "...", "count": 5 }
  { "feature": "lesson.explain", "lessonText": "...", "question": "..." }
  ```

  Quiz generation requires `teacher` or `admin`; lesson explanations allow any of the three education roles. Responses use `{ "ok": true, "requestId": "...", "data": ... }`; quiz data includes `reviewRequired: true`. The endpoint never publishes generated questions. The configured AI URL must implement the OpenAI-compatible chat completions format and JSON mode for quiz requests.
- Deploy after configuring approved project secrets with `npm run supabase --workspace @devx/backend-tools -- functions deploy education-ai`.

Environments on the free plan (2 projects): **staging** and **production**.
Local development uses the Supabase CLI. Donald owns this folder.

Every table that holds user data must have Row Level Security turned on.
