# DevX Solutions: Education System Milestone Plan

Prepared by David (Team Coordinator) · Draft v1 · For approval by the Founder

## 1. Starting Point and Planning Assumptions

- The education system app is at the **idea and planning stage**. Nothing is built yet.
- Each team member can give **under 10 hours per week**. For planning we commit **8 hours per person per sprint** and keep about 20% as buffer for review, meetings and surprises. That is roughly 24 team hours per sprint.
- Sprints are **1 week**: Monday to Sunday.
- David splits his 8 hours between frontend work (about 5) and coordination, reporting and reviews (about 3). If coordination takes more, frontend scope shrinks, not the reporting.
- Sprint 1 and Sprint 2 are **baseline sprints**. Numerical delivery targets are set after them, using actual hours and completed work, as the operations manual requires.
- Proposed start: **Monday 9 November 2026**. The plan runs 12 weeks to a working pilot, then the 90-day review. Week 7 falls in the festive period and is a deliberate light buffer sprint.

## 2. Ownership

| Area | Owner | Reviewer |
| --- | --- | --- |
| Frontend (UI, user flows, integration) | David | Donald (API integration) |
| Backend (database, APIs, auth, hosting) | Donald | David (API contract) |
| AI features (design, prompts, models, evaluation) | Godfred | Donald (integration and security) |
| Board, reporting, scope control, delay follow-up | David | Founder |
| Milestone acceptance and scope decisions | Founder | n/a |

Every piece of work gets reviewed by a second person before it counts as done.

## 3. Milestone Overview

| Milestone | Sprints | Dates | Outcome |
| --- | --- | --- | --- |
| M0: Discovery and scope | 1-2 | 9-22 Nov | Signed-off MVP scope, wireframes, tech stack, data model draft, AI feature spec |
| M1: Platform foundation | 3-5 | 23 Nov-13 Dec | Login with roles, teacher creates courses, student enrolls and views lessons (on staging) |
| M2: Core learning features | 6-8 | 14 Dec-3 Jan | Assignments, quizzes, grading and progress tracking, with a buffer week |
| M3: AI integration | 9-10 | 4-17 Jan | AI features working inside the product with logging and teacher controls |
| M4: Pilot readiness | 11-12 | 18-31 Jan | Tested, deployed, piloted with a small real group, 30-day report and next-quarter roadmap |

## 4. Sprint-by-Sprint Plan

Each cell is sized to fit within about 8 hours for that person.

### Milestone 0: Discovery and Scope

| Sprint | David (Frontend + Coordination) | Donald (Backend) | Godfred (AI) | Exit check |
| --- | --- | --- | --- | --- |
| S1 (9-15 Nov) | Set up board, reporting routine and cards. Gather requirements. Define user roles (student, teacher, admin). List MVP feature candidates | Compare stack options. Create repo, environments and branch rules | List AI feature candidates. Check model/API options, data needs and rough costs | Board live, kickoff note written, actual hours recorded |
| S2 (16-22 Nov) | User flows and wireframes for the 5 key screens | Draft data model and API outline | Spec the top 2 AI features: inputs, outputs, limits, safety | **Founder signs off MVP scope.** Targets set from S1-S2 actuals |

### Milestone 1: Platform Foundation

| Sprint | David | Donald | Godfred | Exit check |
| --- | --- | --- | --- | --- |
| S3 (23-29 Nov) | App shell, routing, base components, login and signup screens | Database, authentication, roles, CI to staging | AI service skeleton. Build a set of 20 sample test inputs for evaluation | Sign up and log in works on staging |
| S4 (30 Nov-6 Dec) | Student and teacher dashboards connected to the API | User, profile, course and class endpoints | Prototype AI feature #1 standalone, with test results written up | Teacher can create a course |
| S5 (7-13 Dec) | Course and lesson pages, enrollment flow | Lessons, enrollment, file upload endpoints | Wrap AI feature #1 as a documented API endpoint with error handling | **M1 demo:** student enrolls and opens a lesson |

### Milestone 2: Core Learning Features

| Sprint | David | Donald | Godfred | Exit check |
| --- | --- | --- | --- | --- |
| S6 (14-20 Dec) | Assignment and quiz screens | Assignments, quizzes, submissions, grading endpoints | Improve AI feature #1 using test results. Draft prompts for feature #2 | Student can submit a quiz and get a score |
| S7 (21-27 Dec) **Buffer** | Clear carry-over. Fix UI bugs. Update docs | Clear carry-over. Tech debt, backups, API docs | Clear carry-over. Evaluation notes | All earlier sprints' work is closed or logged. Light load only (about 4 hrs each) |
| S8 (28 Dec-3 Jan) | Progress views, teacher reports | Progress tracking and reporting endpoints | Prototype AI feature #2 standalone | **M2 demo:** full learning loop works end to end |

### Milestone 3: AI Integration

| Sprint | David | Donald | Godfred | Exit check |
| --- | --- | --- | --- | --- |
| S9 (4-10 Jan) | UI for AI feature #1, including loading, error and review states | Rate limits, usage logging, permissions for AI calls | Productionize feature #1: speed, cost, safe outputs | Teacher or student uses AI feature #1 in the app |
| S10 (11-17 Jan) | UI for AI feature #2 and a feedback button on AI outputs | Store AI feedback, admin view of usage | Integrate feature #2. Run evaluation against the 20+ test inputs | **M3 demo:** both AI features live on staging |

### Milestone 4: Pilot Readiness

| Sprint | David | Donald | Godfred | Exit check |
| --- | --- | --- | --- | --- |
| S11 (18-24 Jan) | UI polish, mobile responsiveness, bug fixing | Security checks, performance, production deployment | AI safety review, edge-case testing | Production deployment passes a smoke test |
| S12 (25-31 Jan) | Run pilot with a small real group, collect feedback | Monitor and fix issues | Review AI output quality in real use | **Pilot demo,** 30-day performance report, next-quarter roadmap |

## 5. Weekly Operating Rhythm

- **Monday (30 min): Sprint planning.** Confirm tasks, owners, hour estimates and due dates. Nobody commits above 8 hours.
- **Daily (async): update in the team chat by end of day.** Three lines: Done, Doing next, Blocked. On a day with no hours, post "no hours today" and mention any blocker.
- **Friday (45 min): Sprint review.** Each owner demos finished work. David records what was accepted, what carried over and why.
- **Friday evening: Weekly report** from David to the Founder (template below).
- **Wednesday check:** David asks anyone at risk of missing the sprint to say so now, not on Friday.

## 6. Task Board Rules

**Columns:** Backlog, Sprint Ready, In Progress, In Review, Blocked, Done.

- Every card has an **owner**, an **hour estimate**, a **due date**, a **milestone label** and **acceptance criteria**.
- No card enters In Progress without an owner.
- Each person holds at most **2 cards in progress**.
- Cards are moved the same day the status changes.
- Anything not on the board is not counted as progress.

## 7. Definition of Done

A task is Done only when:

1. It meets its acceptance criteria.
2. A second team member has reviewed it.
3. It works on staging.
4. It is documented (README, API note or short usage note).
5. It was shown at the Friday review and accepted by David.

Milestone exit checks are accepted by the Founder.

## 8. Delays and Escalation

- Work that will slip by more than 1 day: flag it **the same day**.
- Blocked for 24 hours: tell David.
- Blocked for 48 hours, or the block threatens a sprint or milestone date: David escalates to the Founder with options.
- Every delay is entered in the **Delay Log**: task, owner, cause, impact, new date, follow-up.
- A task that carries over two sprints in a row triggers a short re-plan of scope or capacity.
- The Founder's decisions go in a **Decision Log**, with a target response time of 48 hours.

## 9. KPI Tracking

| KPI | How we measure it | Provisional target (confirm after S2) |
| --- | --- | --- |
| Task ownership | Share of active cards with an owner | 100% |
| Task tracking | Board matches reality at Friday review | Board current every day worked |
| Reporting | Daily updates and weekly reports submitted | All weekly reports on time. Daily updates on every day worked |
| Delivery | Share of sprint commitments completed | Baseline S1-S2, then aim for 80% or higher |
| Accountability | Delays with a log entry | Every delay logged within 1 working day |
| Quality | Deliverables reviewed before acceptance | 100% |
| Communication | Time from blocker to escalation | Within 24 hours |
| Product visibility | Progress record updated for the education app | Updated weekly. One-page status records for the other four apps follow the company's 30-day plan |

## 10. Templates

**Daily update:** Done: ... · Next: ... · Blocked: ... · Hours today: ...

**Weekly report:**

1. Sprint goal and result (met, partly met, missed)
2. Completed this week
3. Carried over, with reasons
4. Overdue items and delay log entries
5. Blockers
6. Decisions needed from the Founder
7. Next sprint's key deliverables
8. Hours committed vs hours used, per person

**Delay log row:** Date · Task · Owner · Cause · Impact · New date · Follow-up done (Y/N)

## 11. Main Risks

| Risk | Mitigation |
| --- | --- |
| Part-time capacity is lower than planned | Record real hours from S1. Re-plan after S2. Cut scope, never quality checks |
| Frontend waits on backend | Agree the API contract in S2. Build against mock data until endpoints exist |
| Scope creep | MVP scope locked in S2. New ideas go to a parked list for the next quarter |
| AI accuracy, cost or student-data privacy | Evaluation test set from S3. Teacher review of AI outputs. Minimal data sent to AI services. Usage limits |
| Festive-period availability | Week 7 buffer. Confirm leave dates in S1 |
| One person unavailable | Each area has a named reviewer who understands the basics |
| Slow decisions | Decision Log with a 48-hour response expectation |

## 12. Founder Decisions Needed

1. Confirm the start date (9 November 2026).
2. Approve the MVP scope at the end of Sprint 2.
3. Choose the pilot group for Sprint 12.
4. Approve a monthly budget for AI usage and hosting.

## Appendix A: Proposed Product Specifications and Tech Stack

Proposed by David for team review in Sprint 1. Free services only for now. Free-tier limits below were checked on 3 November 2026 and **must be re-checked in Sprint 1**, because providers change them often.

### A1. MVP Product Specification

**Users and roles:** Student, Teacher, Admin.

| Role | MVP features |
| --- | --- |
| Student | Sign up and log in. Join a course with a course code. Read lessons. Take quizzes and submit assignments. See scores and own progress. Use the AI study helper |
| Teacher | Create courses and lessons (text, links, PDF upload). Create quizzes (multiple choice, auto-graded) and assignments. See class progress. Review and approve AI-generated content |
| Admin | Manage users and courses. View AI usage and feedback |

**Proposed AI features (to be confirmed at the end of Sprint 2):**

1. **AI quiz generator.** A teacher pastes or selects lesson text and gets draft questions. The teacher edits and approves before students see them.
2. **AI study helper.** A student asks questions about a lesson and gets short explanations based only on that lesson's content.

**Non-functional requirements:**

- Mobile-first and light on data, since many users will be on phones and limited bandwidth.
- Text-first content. Small file uploads only.
- Each user sees only their own data (enforced in the database, not only in the UI).
- No identifiable student data is sent to a free AI service.

**Out of scope for the MVP:** payments, live video classes, native mobile apps, parent portal, offline mode.

### A2. Proposed Tech Stack

| Layer | Choice | Owner | Why |
| --- | --- | --- | --- |
| Frontend | React with TypeScript and Vite, React Router, Tailwind CSS | David | Team already agreed on React. Vite keeps builds fast and simple |
| Frontend hosting | Cloudflare Pages (free) | David | Free plan allows commercial use and does not meter bandwidth. Vercel's free Hobby plan is restricted to non-commercial use, which could be a problem for a company product |
| Database, auth, file storage | Supabase (Postgres, Auth, Storage, Row Level Security) | Donald | One free service covers most of the backend, which suits part-time capacity |
| Server logic | Supabase Edge Functions | Donald and Godfred | Keeps the AI key on the server, never in the browser |
| AI | Gemini API free tier (Flash or Flash-Lite models), behind a small adapter so the provider can be swapped | Godfred | Free text models are available without billing |
| Code, CI, board | GitHub, GitHub Actions, GitHub Projects (or Trello) | David | Free, and keeps code and tasks together |
| Design | Figma free plan | David | Wireframes and screens |

**Environments:** Local development (Supabase CLI), one Supabase project for staging, one for production. That uses both free projects.

**If Donald prefers a different backend** (for example Node/Express or Python/FastAPI), we can swap it in during Sprint 1. The catch on free hosting is cold starts and sleeping servers, so Supabase is the lowest-effort option.

### A3. Free-Tier Limits That Affect the Plan

| Service | What to watch | Mitigation |
| --- | --- | --- |
| Supabase Free | About 500 MB database, 50,000 monthly active users, 1 GB file storage (sources differ between 500 MB and 1 GB), 5 GB egress per month, 2 active projects. **Projects pause after 7 days of inactivity** | Scheduled keep-alive request through GitHub Actions. Keep uploads small. Check usage every Friday |
| Gemini API Free | Rate limits are per project and are shown in Google AI Studio, not fully published in the docs. Free-tier Pro models were removed in 2026. **Google may use free-tier inputs and outputs to improve its products** | Use only Flash-class models. Cache AI results. Cap requests per user. Do not send student names or personal data. Plan a paid or privacy-safe option before the pilot uses real student data |
| Cloudflare Pages | Few limits for a project this size | Review in Sprint 11 |

### A4. Adjustments to the Sprint Plan

- **Sprint 1, Donald:** Instead of comparing stacks, confirm this stack, create the Supabase and Cloudflare accounts, and set up the keep-alive job.
- **Sprint 1, Godfred:** Add a check of Gemini free-tier limits in AI Studio and a one-page note on what data may be sent.
- **Sprint 2:** Confirm the two AI features against what the free tier can support.
- **Sprint 11:** Add a review of free-tier usage and a go or no-go on whether the pilot can stay on free plans.
- **Founder decision 4** becomes: confirm what we do if a free tier runs out or if the pilot needs real student data (paid plan or reduced AI features).
