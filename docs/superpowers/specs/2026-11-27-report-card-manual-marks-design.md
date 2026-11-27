# Report card manual marks, grading schemes, and school operations — design

Date: 2026-11-27
Status: draft for approval

## Intent and why

A term report is not only a quiz score. In a Ghanaian school a subject result is
made up of continuous assessment (class assignments, homework, class tests and
quiz work) plus a separate exam. Teachers need to enter those marks by hand,
admins (headteachers) need to correct and sign off the final report, and admins
need to record fees paid in person.

The product is a demo now and will move to live Supabase later. The app is also
expected to serve both JHS and SHS schools, whose grading conventions differ.
So no grading rule may be hardcoded to one school.

## Goals

- Teachers enter and revise marks by hand, per subject, only for subjects
  assigned to them.
- Admins can add subjects, assign teachers to subjects, assign form masters to
  classes, edit any mark, and edit any report field.
- Report cards move from draft to approved. Only an admin can approve, and
  approval locks the report's mark and remark fields.
- Reports carry class position, attendance, conduct, and a promotion decision
  in addition to subject marks and the two remarks.
- Admins can record an in-person fee payment against a student, which reduces
  that student's balance.
- Grading weights and grade bands are configurable per school/level, with
  seeded JHS and SHS schemes.
- The merged vector PDF renderer produces the final report from real demo data.

## Non-goals

- No Supabase tables, RLS policies, auth wiring, or live backend adapter in
  this piece.
- No real payment processing or receipt delivery.
- No AI-generated remarks (separate work already described in
  `docs/ai-architecture.md`).
- No multi-school switcher beyond the single demo school.

## Anti-goals

- A teacher being able to enter or change a mark for a subject they do not
  teach.
- Anyone other than an admin approving a report, or a report staying editable
  after approval.
- Baking one school's 40/60 split or A1–F9 bands into calculation code.

## Constraints

- Demo state currently lives in `useDemoData` (`apps/education-web/src/demo.ts`)
  and persists under `devx-education-demo-v1`. Existing tests cover migration
  of older saves, so the storage key must be versioned and migrated, not
  silently replaced.
- `report.ts` currently builds a hardcoded `ReportModel`; `pdf.ts` renders it
  and is dynamically imported to keep pdf-lib out of first load. That seam
  stays.
- `@devx/core.createBackend()` is the only backend access point when live work
  starts. The demo module must not import Supabase directly.
- Every package must declare the dependencies it imports. No new dependency
  is expected for this work.
- The auth merge renamed the sign-in submit labels to "Preview as student" and
  "Preview as administrator", but two Playwright tests still look for "Sign in
  as student" / "Sign in as administrator". Those tests currently fail on
  `main` and are fixed as part of this work.

## Approaches considered

1. **Extend `DemoState` directly.** Add the new slices and wire forms straight
   to `demo.update()`. Fastest, but screens become coupled to the demo shape
   and every screen must be edited again when live arrives.
2. **First-class school module with commands (chosen).** Define domain types
   and pure command/selector functions in `apps/education-web/src/school/`.
   State remains in `DemoState`, but screens and `buildReport()` read and write
   only through those functions. The same signatures can later be backed by
   `createBackend()`.
3. **Repository interface with demo and Supabase adapters.** Cleanest live
   swap, but the most scaffolding before the demo shape has settled.

Option 2 was chosen. It keeps permission rules in one place, avoids a live
adapter that is not needed yet, and leaves one boundary to replace later.

## Decisions made in conversation

- Demo now, live later; shape records as real records so the later change is a
  data-source swap.
- Class score is 40% and exam is 60%. Assignments, homework, and quiz work
  accumulate into the class-score portion. This becomes the seeded default,
  not a constant in code.
- A subject teacher may only enter marks for subjects assigned to them.
- Admins may edit any mark and any report field.
- Only admins approve. Approval locks the report.
- The form master is the class teacher who oversees a class and writes the
  class teacher's remark. The headteacher (headmaster/principal) is the admin,
  writes the head's remark, and approves.
- Admins add subjects, assign teachers to subjects, and assign form masters to
  classes.
- Admins record in-person fee payments.
- JHS and SHS schools, and individual schools, may use different grading
  conventions; the app must support that through configuration.
- The PDF work from `feature/report-card-pdf` is on `main` and is the renderer
  to build on.

## Design

### Domain module (`src/school/`)

Types:

- `Subject { id, name }`
- `TeacherAssignment { subjectId, teacherId }`
- `FormMasterAssignment { className, teacherId }`
- `MarkComponent = "assignment" | "homework" | "quiz" | "exam"`
- `Mark { id, studentId, subjectId, component, score, max, term, className, enteredBy, updatedAt }`
- `ReportStatus = "draft" | "approved"`
- `ReportDraft { id, studentId, term, className, status, teacherRemark, headRemark, conduct, promotion, positionOverride, attendanceOverride, approvedBy?, approvedAt? }`
- `FeePayment { id, studentId, date, amount, method, reference?, recordedBy }`
- `GradingScheme { id, name, appliesTo: string[], weights: { classScore, exam }, bands: Array<{ min, max, grade, remark }> }`

Commands and selectors (pure over the new state slices):

- `addSubject`, `assignTeacherToSubject`, `assignFormMaster`
- `setMark` — rejects a mark whose `enteredBy` is not assigned to that subject
  unless the actor is an admin
- `selectMarks`, `computeSubjectScore` — averages recorded component
  percentages, applies scheme weights, returns class score, exam, total, grade
  and remark
- `setReportField`, `approveReport` — the latter rejects non-admins and
  refuses to change an already-approved report
- `recordInPersonPayment` — appends a payment with method and reference and
  recomputes the student's balance
- `selectGradingScheme`, `saveGradingScheme`, `gradeFor`

The only place role rules are encoded is this module. Screens call commands and
show the returned error rather than deciding permissions themselves.

### State and persistence

`DemoState` gains `subjects`, `teacherAssignments`, `formMasters`, `marks`,
`reports`, `feePayments`, and `gradingSchemes`. Storage key moves to
`devx-education-demo-v2`; `readDemo()` migrates v1 saves, validates every new
slice as it already validates payments and attempts, and falls back to seed
data on malformed input. The existing undo mechanism keeps working because new
slices are patched through `demo.update()`.

### Grading schemes

Two schemes are seeded: a JHS 40/60 scheme with A1–F9 bands and an SHS scheme
with different weights and bands, so both conventions are exercised in the
demo. An admin screen edits weights and bands and chooses which scheme applies
to a level or school. All score and grade calculation calls
`selectGradingScheme`; nothing reads a weight or band literal.

### Screens and routes

- `subjects` (admin): add subject, assign teachers to subjects, assign form
  masters to classes.
- `marks` (teacher and admin): choose class and subject; a teacher sees only
  their assigned subjects; enter class-assignment, homework, quiz and exam
  marks per student with a live 40/60 preview from the active scheme.
- `reports` (admin and teacher): select student and term; form master edits the
  class teacher's remark, conduct and promotion; admin edits any field, writes
  the head's remark, approves, and downloads the PDF. Approved reports are
  read-only. The PDF is built from the same `ReportModel` used on screen.
- `fees` (admin): record an in-person payment with amount, date, method and
  reference; balance updates immediately.
- `grading` (admin): edit schemes, weights and bands.

`App.tsx` route lists, `roleFor`, `allowedFor`, nav links, and the screen picker
are extended for the new screens. Teacher routes never expose `subjects`,
`grading`, or admin fee entry.

### Report fields beyond marks

- Position is computed from the average of approved subject totals across the
  class and term; `positionOverride` lets a form master correct it.
- Attendance comes from the student's attendance record as days present of days
  possible, with `attendanceOverride` for corrections.
- Conduct and promotion are typed by the form master; the head may amend them.

### Tests

Playwright coverage added for: teacher sees only assigned subjects and cannot
mark another subject; admin edits any mark; non-admin approval is rejected and
approved reports are read-only; the PDF contains entered marks and the new
fields; changing a scheme changes a computed grade; an in-person payment
reduces the balance; and the two stale sign-in label tests pass again.

## Builder-check resolutions (my calls)

These were gaps a fresh builder would otherwise have to guess at. Each is
settled here; correct any at approval time.

1. **Acting user in demo.** Every command takes an explicit
   `actor: { role: EducationRole; userId: string }`. Screens get the role from
   the existing preview state and a new "Acting as" control listing seeded
   teachers; admin and parent use fixed seeded ids. Playwright tests switch
   identity through that control. Three seeded teachers carry the subject and
   form-master assignments used by the role tests.
2. **`setReportField` enforcement.** The assigned form master may edit
   `teacherRemark`, `conduct` and `promotion` for their own class only. An
   admin may edit any report field on any draft. Nobody edits an approved
   report. The same guard that blocks post-approval mark changes blocks these.
3. **Scheme resolution.** `appliesTo` entries are school names or level
   prefixes (`"JHS"`, `"SHS"`). `selectGradingScheme(schoolName, className)`
   resolves school+level, then level, then the default scheme. `gradeFor`
   takes the total and the resolved scheme.
4. **Fee source of truth.** There is no separate `feePayments` slice. The
   existing `payments` array is extended with optional `method`, `reference`
   and `recordedBy`; `recordInPersonPayment` appends there, and balances stay
   derived exactly as they are today. Migrated v1 payments simply lack the new
   optional fields, so analytics and existing fee tests keep working.
5. **Approval lock.** Approving a report freezes that student's marks and
   report fields for that term. Admins edit before approval; there is no
   reopen path in this pass.
6. **Non-mark report fields.** `ReportModel` gains `conduct`, `promotion`,
   `daysPresent` and `daysPossible`, rendered in both the on-screen report and
   the PDF. Term days default to 60 and are configurable on the grading scheme.
7. **Position.** Computed live over all students in the class and term who
   have at least one recorded mark. On approval the computed rank is stored on
   the report so it freezes; drafts show the live rank.
8. **Report call sites.** `buildReport` becomes `buildReport(state, studentId,
   term)`. All call sites switch: the reports screen uses a student selector,
   the class buttons act on the selected student, and ParentView uses its
   linked student. Bulk per-class PDF export is out of scope.

## What is left to the builder

- Exact defaults for the SHS seeded scheme, as long as they differ from the
  JHS one and are editable.
- Whether within-class-score components are weighted equally or given
  per-component weights in the first pass; equal weighting is the default
  proposal.
- Styling and layout of the new panels within the existing design system.
- Fixture names and values for tests, provided they exercise the role matrix.
