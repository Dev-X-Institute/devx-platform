# Education milestone plan: review

**Reviewed:** 2026-11-08

The [original milestone plan](education-milestone-plan.md) is preserved as David's
draft for Founder approval. These notes propose changes; they do not approve
scope, change sprint commitments, or implement product features.

The ownership, baseline sprints, weekly reporting, and holiday buffer suit the
team. Treat the 31 January 2027 pilot date as a target until Sprint 2 estimates
and the following decisions are complete.

## Findings and proposed corrections

| Priority | Plan reference | Finding and proposed correction | Owner / timing |
| --- | --- | --- | --- |
| High | Sections 1 and 4 | Eight hours each means 24 gross team hours; a 20% reserve leaves 19.2 hours for planned work. David has at most five frontend hours before any additional buffer. State whether his three coordination hours include the reserve, and estimate frontend cards against his actual remaining budget. | David, S1; recalibrate after S2 |
| High | A1, A2 and A3 | The intended student ages and regions are unspecified. Gemini's published terms restrict API clients directed toward or likely to be accessed by under-18s, and require Paid Services for clients made available in the EEA, Switzerland or UK. Confirm eligibility before choosing Gemini for this product. Moving its key to an edge function or paying does not resolve the age restriction. Under the current free-only constraint, defer live AI if eligibility cannot be established. | Godfred and David, before S2 scope approval |
| High | S3 and A2 | Login/signup depends on email delivery and password recovery, which the plan does not budget. Supabase's default SMTP sends only to project team addresses and currently allows two messages per hour. Choose a verified free email delivery option or suitable supported OAuth flow, and test signup and recovery with a non-team account before accepting M1. | Donald, choose in S2 and prove in S3 |
| High | S3, S5, S9 and S11 | Security verification is mostly deferred to S11. Add authorization and Row Level Security checks when each data flow arrives: students cannot read another student's submissions or grades, teachers cannot edit another teacher's course, and role changes require authorized administration. Add private upload/download checks in S5 and AI permissions and payload checks in S9. | Donald, reviewed by David, with each feature |
| High | S6 and S10 | Assignments, quizzes, submissions and grading in one backend sprint, plus two AI features later, have no supporting estimates. Use S1-S2 actuals to size vertical slices. Proposed fallback: login, course/enrollment, lessons, one auto-graded multiple-choice quiz flow, and basic progress first; defer uploads, richer assignments/reports, and the second AI feature if capacity does not fit. Founder approval is needed to change MVP scope. | David with Donald and Godfred, S2 |
| Medium | M4 and S12 | A pilot starting 25 January cannot provide 30 days of pilot results by 31 January. Use S12 for an initial pilot report, then schedule a 30-day pilot follow-up around 24 February. If the existing report means team performance over the preceding month, name that period explicitly. Date the separate 90-day review in early February. | David and Founder, S2 |
| Medium | Sections 7 and 12; A4 | The Definition of Done applies staging and demos to discovery documents as well as software, and the monthly-budget decision conflicts with the free-only constraint. Define appropriate evidence per card: reviewed documents for discovery, staging demonstrations for software. Use A4's reduced-feature fallback when free services are insufficient; paid services remain a separate future decision. | David and Founder, S1-S2 |

The Gemini eligibility and data-handling findings above come from the
[official Gemini API terms](https://ai.google.dev/gemini-api/terms), effective
23 March 2026. They also describe processing of unpaid inputs and outputs,
including human review and regional differences. The repository's stronger
rule still applies everywhere: never send names or other personal data to a
free-tier AI provider. Review lesson text, student questions, feedback and logs,
not just account fields. Confirm permitted payloads with synthetic examples
before any real-provider integration.

The email limits above are documented in
[Supabase's SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

## Repository fit and unfinished foundation work

- The React/Vite/Tailwind scaffold exists, along with `@devx/core`, the
  `createBackend()` factory, and `@devx/ai` interfaces with a mock provider.
  Update the plan's "nothing is built yet" wording to distinguish this scaffold
  from working user features. Authentication, course flows, database migrations
  and real AI edge functions are not implemented in this checkout.
- npm workspaces and Turborepo match the team's package-manager preference.
  React Router is proposed but is not currently declared or implemented.
  Add it only as part of an authorized routing task, using
  `npm install react-router -w education-web` if that package is selected.
- The npm conversion remains incomplete: registry access was denied,
  `package-lock.json` is missing, and `npm run typecheck` and `npm run build`
  currently fail because `turbo` is not installed. Resolve installation,
  generate the lockfile, and pass both checks before accepting CI or a
  Cloudflare build. The intended Pages command is
  `npm ci && npm run build -w education-web`.
- Git metadata has since been initialized, and `origin` now points to
  [Dev-X-Institute/devx-platform](https://github.com/Dev-X-Institute/devx-platform).
  The milestone documents are on `docs/education-milestone-plan` for review.
  Protected-main settings, the board, hosted environments and deployed secrets
  remain unverified. The keep-alive workflow exists, but skips successfully when
  secrets are missing and currently names only one Supabase project. S1 should
  establish successful checks for both planned environments rather than count
  the workflow file alone as evidence.
- Native mobile apps are explicitly outside this education MVP. That is
  consistent with planning mobile apps later in the wider monorepo.

## Free-service assumptions to record in Sprint 1

Provider documentation was consulted on 8 November 2026. Project-specific
quotas, account eligibility and actual provisioned services still need team
verification.

- [Supabase pricing](https://supabase.com/pricing) lists 500 MB database size,
  1 GB file storage, 50,000 monthly active users, 5 GB egress plus 5 GB cached
  egress, two active free projects, and pausing after one week of inactivity.
  Replace the draft's ambiguous file-storage figure. Budget uploads and downloads
  against the applicable quotas and prove a backup/restore procedure before pilot.
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) and
  [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
  should be used to record the exact selected model, free eligibility and
  project quotas from AI Studio. The blanket claim that free Pro models were
  removed in 2026 was not established in this review. Define exhausted-quota
  behavior before implementing either AI feature; basic learning must continue
  when AI is unavailable.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
  include 500 builds per month on Free, one concurrent build, a 20-minute build
  timeout, and a 25 MiB limit per static asset. These are distinct from Supabase
  upload limits. Restrict unrelated app changes from triggering education builds
  when additional apps become active.
- [GitHub's scheduled-workflow documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
  says runs can be delayed or dropped and public-repository schedules disable
  after 60 days without repository activity. Monitor actual successful keep-alive
  runs and project availability; a configured schedule alone is insufficient.

## Proposed next cards

1. David: confirm start date, pilot ages/regions, gross hours versus available
   delivery hours, and the meaning and timing of each report.
2. Donald: finish reproducible npm installation and CI validation, then verify
   repository access, branch rules, and staging configuration.
3. Godfred with Donald: record Gemini eligibility, permitted synthetic payloads,
   model/quota findings, and the free-only fallback.
4. David with Donald and Godfred: estimate the smallest complete learning flow,
   agree API contracts and security acceptance checks, then take the MVP scope
   to the Founder at the end of S2.

These are proposed local cards; no external board items or messages were created.
