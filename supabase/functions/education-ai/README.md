# education-ai local mock provider

The function supports `AI_PROVIDER=mock` for local end-to-end checks. It
returns deterministic quiz questions or explanations without calling an
external AI provider or requiring an AI key. The normal authentication,
authorization, request validation, and response validation still run.

## Run locally

1. Start the local Supabase stack with `supabase start`.
2. Copy `.env.example` to `supabase/.env.local` and run
   `supabase functions serve education-ai --env-file supabase/.env.local`.
3. Sign in as a local user whose **app metadata** contains
   `education_role: "student"`, `"teacher"`, or `"admin"`. Quiz generation
   requires `teacher` or `admin`.
4. POST to `http://127.0.0.1:54321/functions/v1/education-ai` with the access
   token as a Bearer token and one of these JSON bodies:

   ```json
   {
     "feature": "lesson.explain",
     "lessonText": "Plants use sunlight, water, and carbon dioxide to make sugar.",
     "question": "What does sunlight help the plant do?"
   }
   ```

   ```json
   {
     "feature": "quiz.generate",
     "lessonText": "Plants use sunlight, water, and carbon dioxide to make sugar.",
     "count": 2
   }
   ```

The mock explanation is `Mock explanation for: <question>`. Quiz mode returns
the requested number of four-option questions marked `reviewRequired: true`.
Do not set `AI_PROVIDER=mock` in a deployed environment.
