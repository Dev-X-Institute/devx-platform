# Report Card Manual Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let teachers enter subject marks by hand, let admins manage subjects, grading schemes and fees, and produce an admin-approved report card PDF from real demo data.

**Architecture:** A pure `src/school/` domain module holds types, seeds, commands, selectors and migration; `DemoState` extends `SchoolState` and persists it under a versioned localStorage key. Screens and `buildReport()` go only through that module, leaving one boundary for a future `createBackend()` adapter. Role rules live only in the command functions.

**Tech Stack:** TypeScript, React, Vite, Playwright, pdf-lib (already installed), npm workspaces.

**Spec:** `docs/superpowers/specs/2026-11-27-report-card-manual-marks-design.md`

## Global Constraints

- Work on `main` per the human partner's standing instruction; do not create a feature branch.
- Run all npm commands from the repository root; use `npm run <script> -w <workspace>` for workspace scripts.
- Run Playwright from the root as `npx playwright test --config apps/education-web/playwright.config.ts <test-file> --reporter=line`; every Playwright command in this plan uses that form.
- Use `import type` for `EducationRole` from `@devx/core` so pure domain tests run in Node without resolving the workspace package at runtime.
- Install dependencies only with `npm install <pkg> -w <workspace>`, and state why in the PR description. No new dependency is expected.
- Every package must declare every dependency it imports.
- Backend access, when live work starts, goes through `createBackend()` in `@devx/core`; the demo module must not import Supabase.
- Never commit secrets. No personal data to free-tier AI providers.
- `npm run typecheck` and `npm run build` must pass before finishing.
- Keep pdf-lib behind the dynamic import in `downloadReport`; do not make it a first-load chunk.

## Review Focus

- Empty marks: a subject with no recorded components must render `—`, not `NaN` or a fabricated grade. Pin with `computeSubjectScore with no marks returns null score` in Task 3 and nullable `ReportRow` values in Task 4.
- Out-of-range marks: a score above `max` or below zero must be rejected rather than skew the class score. Pin with `setMark rejects score above max and negative score` in Task 2.
- Migrated saves: a v1 localStorage record with none of the new slices must load without crashing. Pin with `v1 save migrates with seeded school slices` in Task 1.
- Already-approved reports: a second approval or a mark edit must fail. Pin with `commands refuse changes after approval` in Task 2.
- Teacher with no assignments: must not be able to enter any mark. Pin with `unassigned teacher cannot set any mark` in Task 2.
- Long or non-Latin text must survive from the report draft into the PDF model unchanged. Pin with `PDF renders long conduct and promotion text` in Task 4 and a download smoke test in Task 6.

---

### Task 1: School state types, seeds, migration and v2 persistence

**Files:**
- Create: `apps/education-web/src/school/types.ts`
- Create: `apps/education-web/src/school/seed.ts`
- Create: `apps/education-web/src/school/actors.ts`
- Create: `apps/education-web/src/school/migrate.ts`
- Create: `apps/education-web/src/school/index.ts`
- Modify: `apps/education-web/src/records.ts` (optional fee fields)
- Modify: `apps/education-web/src/demo.ts` (`DemoState extends SchoolState`, storage v2, migration)
- Test: `apps/education-web/tests/school.spec.ts`

**Interfaces:**
- Consumes: `SchoolRecords` and `StudentRecord` from `src/records.ts`; `EducationRole` from `@devx/core` as a type-only import.
- Produces: `SchoolState`, `Actor`, `Subject`, `TeacherAssignment`, `FormMasterAssignment`, `TeacherProfile`, `Mark`, `MarkComponent`, `ReportDraft`, `ReportStatus`, `Promotion`, `GradingScheme`, `GradeBand`, `PaymentMethod`, `seedSchoolState()`, `seededTeachers`, `actorFor(role, userId)`, `migrateSchoolState(raw: unknown, seed: SchoolState): SchoolState`.

- [ ] **Step 1: Write the failing test for the school types and seeds**

In `tests/school.spec.ts`, import from `../src/school` and assert: `seedSchoolState().subjects.length === 5`; `teachers.length === 3`; two schemes exist with different `weights.classScore` values; `formMasters` contains one assignment for `"JHS 2"`; and `migrateSchoolState({ payments: [] }, seedSchoolState()).subjects` equals the seeded subjects.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line`
Expected: FAIL — module `../src/school` not found.

- [ ] **Step 3: Define the domain types in `src/school/types.ts`**

`SchoolState extends SchoolRecords` with slices `subjects`, `teacherAssignments`, `formMasters`, `teachers`, `marks`, `reports`, `gradingSchemes`. `Actor { role: EducationRole; userId: string }`. `MarkComponent = "assignment" | "homework" | "quiz" | "exam"`; `Mark` carries `id: string, studentId: number, subjectId: string, component: MarkComponent, score: number, max: number, term: string, className: string, enteredBy: string, updatedAt: string`. `ReportStatus = "draft" | "approved"`; `Promotion = "promoted" | "not-promoted" | "repeat"`; `ReportDraft` carries `id: string` (composed `studentId:term`), `studentId: number, term: string, className: string, status: ReportStatus, teacherRemark: string, headRemark: string, conduct: string, promotion: Promotion, positionOverride: number | null, attendanceOverride: string | null, position: number | null, approvedBy?: string, approvedAt?: string`. `GradingScheme` carries `id: string, name: string, appliesTo: string[], weights: { classScore: number; exam: number }, termDays: number, bands: GradeBand[]`; `GradeBand = { min: number; max: number; grade: string; remark: string }`. `PaymentMethod = "cash" | "bank-transfer" | "mobile-money" | "other"`; add optional `method?: PaymentMethod`, `reference?: string`, `recordedBy?: string` to `PaymentRecord` in `records.ts`.

- [ ] **Step 4: Seed the demo school in `src/school/seed.ts` and `actors.ts`**

`seedSchoolState()` spreads `seedRecords()` and returns five subjects, three teachers, teacher assignments covering the five subjects, one JHS 2 form master, no marks, and one draft report per student. JHS scheme: `appliesTo: ["JHS"]`, `weights { classScore: 40, exam: 60 }`, `termDays: 60`, bands A1 81–100, A2 71–80, B3 61–70, B4 51–60, C5 41–50, C6 35–40, D7 30–34, E8 25–29, F9 0–24. SHS scheme: `appliesTo: ["SHS"]`, `weights { classScore: 30, exam: 70 }`, `termDays: 60`, bands A1 90–100, A2 80–89, B3 70–79, C4 60–69, D5 50–59, E6 40–49, F7 0–39, each with a remark. `seededTeachers` exports the three profiles; `actorFor(role, userId)` returns an `Actor`.

- [ ] **Step 5: Extend `DemoState` and migrate storage in `src/demo.ts`**

Change `DemoState extends SchoolState` and make `initialDemo()` spread `seedSchoolState()`. Rename the key to `devx-education-demo-v2`; `readDemo()` reads v2, falling back to the v1 key, and passes the saved value plus `initialDemo()` through `migrateSchoolState()`. Keep every existing validation and add validation for each new slice, resetting an invalid slice to seed data rather than dropping the whole save. Persist to v2 on the first write.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line`
Expected: PASS — five assertions.

- [ ] **Step 7: Commit**

```bash
git add apps/education-web/src/school apps/education-web/src/demo.ts apps/education-web/src/records.ts apps/education-web/tests/school.spec.ts
git commit -m "feat: add school domain types, seeds and v2 demo persistence"
```

---

### Task 2: Commands with role enforcement

**Files:**
- Create: `apps/education-web/src/school/commands.ts`
- Modify: `apps/education-web/src/school/index.ts`
- Test: `apps/education-web/tests/school.spec.ts`

**Interfaces:**
- Consumes: all Task 1 types and `seedSchoolState()`.
- Produces: `addSubject(state, actor, name: string): SchoolState`, `assignTeacherToSubject(state, actor, subjectId: string, teacherId: string): SchoolState`, `assignFormMaster(state, actor, className: string, teacherId: string): SchoolState`, `setMark(state, actor, input): SchoolState` where `input` is `{ studentId: number; subjectId: string; component: MarkComponent; score: number; max: number; term: string; className: string }` and replaces an existing mark with the same student, subject, component and term; `setReportField(state, actor, reportId: string, field, value: string): SchoolState` where `field` is `"teacherRemark" | "headRemark" | "conduct" | "promotion"`; `approveReport(state, actor, reportId: string, position: number | null): SchoolState`; `recordInPersonPayment(state, actor, input): SchoolState` where `input` is `{ studentId: number; amount: number; date: string; method: PaymentMethod; reference?: string }`; `saveGradingScheme(state, actor, scheme: GradingScheme): SchoolState`.

- [ ] **Step 1: Write failing tests for the permission matrix**

Add to `tests/school.spec.ts`: `unassigned teacher cannot set any mark` (expect throw); `assigned teacher sets a mark` (expect mark stored with `enteredBy` equal to actor id); `setMark rejects score above max and negative score`; `non-admin cannot addSubject, assignTeacherToSubject, assignFormMaster or approveReport`; `non-admin cannot saveGradingScheme or recordInPersonPayment`; `non-form-master cannot edit another class report`; `commands refuse changes after approval` (approve, then expect `setMark`, `setReportField` and a second `approveReport` to throw).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line`
Expected: FAIL — command exports not found.

- [ ] **Step 3: Implement `commands.ts`**

Every function returns a new `SchoolState` and throws `Error` with a stable message on rejection. `setMark` checks: report for that student+term is not approved; actor is admin or assigned to the subject; `score >= 0 && score <= max`; then upserts the mark. `setReportField` checks: report not approved; admin may edit any field; teacher may edit `teacherRemark`, `conduct`, `promotion` only when they are the form master for that report's class; `headRemark` is admin-only. `approveReport` requires admin, sets `status`, `approvedBy`, `approvedAt` and the frozen `position`. `recordInPersonPayment` requires admin, appends to `payments` with `method`, `reference` and `recordedBy`, and reduces `balance` when `studentId === 2` (matching the existing `recordPayment` behaviour). `saveGradingScheme` requires admin.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line`
Expected: PASS — all permission assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/education-web/src/school/commands.ts apps/education-web/src/school/index.ts apps/education-web/tests/school.spec.ts
git commit -m "feat: add school commands with role and approval guards"
```

---

### Task 3: Scoring, grading and position selectors

**Files:**
- Create: `apps/education-web/src/school/selectors.ts`
- Modify: `apps/education-web/src/school/index.ts`
- Test: `apps/education-web/tests/school.spec.ts`

**Interfaces:**
- Consumes: `SchoolState`, `GradingScheme`, `Mark` from Task 1.
- Produces: `selectGradingScheme(state, schoolName: string, className: string): GradingScheme`; `computeSubjectScore(state, studentId: number, subjectId: string, term: string): SubjectScore | null` where `SubjectScore { classScore: number; exam: number; total: number; grade: string; remark: string }`; `computeTermAverage(state, studentId: number, term: string): number | null`; `computePosition(state, className: string, term: string, studentId: number): number | null`; `attendanceFor(student: StudentRecord, scheme: GradingScheme, override: string | null): string`. `SubjectScore` exported from `selectors.ts`.

- [ ] **Step 1: Write failing tests for scoring and scheme resolution**

Add to `tests/school.spec.ts`: `computeSubjectScore with no marks returns null`; marks of 20/25 assignment, 10/10 homework and 15/20 quiz plus 48/60 exam produce `classScore 34, exam 48, total 82, grade "A1"` under the JHS scheme; `changing the scheme changes the grade` (the same marks under the SHS scheme yield `grade "A2"` with `total 82`); `computePosition ranks students by term average`; `selectGradingScheme prefers a level match over the default`; `attendanceFor uses override when present`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line`
Expected: FAIL — selector exports not found.

- [ ] **Step 3: Implement `selectors.ts`**

Average recorded component percentages within each group, multiply by scheme weights, round to whole marks, and resolve the grade from the matching band. `computePosition` ranks all students in the class with at least one recorded mark for the term and returns a 1-based rank. Return `null` when there is no usable input. `selectGradingScheme` resolves school+level, then level, then the first scheme.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line`
Expected: PASS — all selector assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/education-web/src/school/selectors.ts apps/education-web/src/school/index.ts apps/education-web/tests/school.spec.ts
git commit -m "feat: add grading scheme scoring and position selectors"
```

---

### Task 4: Report model and PDF from real data

**Files:**
- Modify: `apps/education-web/src/report.ts`
- Modify: `apps/education-web/src/pdf.ts`
- Modify: `apps/education-web/src/demo.ts` (`downloadReport` signature)
- Modify: `apps/education-web/src/screens/School.tsx` (`ReportContent` meta and call sites)
- Test: `apps/education-web/tests/school.spec.ts`

**Interfaces:**
- Consumes: `SchoolState`, `computeSubjectScore`, `computePosition`, `selectGradingScheme`, `attendanceFor` from Task 3.
- Produces: `buildReport(state: SchoolState, studentId: number, term: string, generatedOn?: string): ReportModel`; `downloadReport(state: SchoolState, studentId: number, term: string, schoolName?: string)`. `ReportModel` gains `conduct: string`, `promotion: string`, `daysPresent: number`, `daysPossible: number`; `ReportRow.classScore`, `exam`, `total` and `ReportModel.average` become `number | null` so unmarked subjects display `—`.

- [ ] **Step 1: Write the failing PDF text test**

Add to `tests/school.spec.ts`: `PDF renders long conduct and promotion text` — start from `seedSchoolState()`, set a report draft's `conduct` to a 90-character string and `promotion` to `"promoted"`, call `buildReport(state, studentId, "Term 1")`, and assert the model's `conduct` and `promotion` match those values exactly.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line -g "long conduct"`
Expected: FAIL — `buildReport` signature and fields not yet implemented.

- [ ] **Step 3: Rewrite `buildReport` in `src/report.ts`**

Derive student and class from `state`, call the selectors per subject, set `position` from `computePosition` or the report's frozen `position`, set `attendance` via `attendanceFor`, and carry `conduct`, `promotion`, `daysPresent` and `daysPossible` from the scheme and report draft. Return null values for numeric fields when no marks exist.

- [ ] **Step 4: Render the new fields in `src/pdf.ts` and the on-screen report**

Add Conduct, Promotion and Attendance rows to both the on-screen `<dl className="report-meta">` in `ReportContent` and the PDF meta layout using Helvetica only; render `—` for null numeric values and empty text. Update `downloadReport` to the new signature and switch `ReportContent`, both reports-screen call sites and ParentView to the new signature.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/school.spec.ts --reporter=line -g "long conduct"` then `npm run typecheck && npm run build`
Expected: PASS for the test; clean typecheck and build.

- [ ] **Step 6: Commit**

```bash
git add apps/education-web/src/report.ts apps/education-web/src/pdf.ts apps/education-web/src/demo.ts apps/education-web/src/screens/School.tsx apps/education-web/tests/school.spec.ts
git commit -m "feat: build report cards from school state and render new fields"
```

---

### Task 5: Subjects, grading, marks and acting-as screens

**Files:**
- Create: `apps/education-web/src/screens/Subjects.tsx`
- Create: `apps/education-web/src/screens/Grading.tsx`
- Create: `apps/education-web/src/screens/Marks.tsx`
- Create: `apps/education-web/src/school/ActorPicker.tsx`
- Modify: `apps/education-web/src/App.tsx`
- Test: `apps/education-web/tests/screens.spec.ts`

**Interfaces:**
- Consumes: all commands and selectors; `Demo` from `src/demo.ts`.
- Produces: screens `subjects`, `grading`, `marks`; `ActorPicker` exporting `ActorPicker({ demo }: { demo: Demo })`.

- [ ] **Step 1: Write failing UI tests for role-scoped screens**

Add to `tests/screens.spec.ts`: `teacher sees only assigned subjects in marks` — select a teacher actor, open `marks`, assert only their assigned subject appears; `admin can add a subject and assign a teacher`; `admin can assign a form master to a class`; `admin edits a grading scheme and the preview grade changes`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/screens.spec.ts --reporter=line -g "assigned subjects|add a subject|form master|grading scheme"`
Expected: FAIL — screens not routed.

- [ ] **Step 3: Build `ActorPicker` and the three screens**

`ActorPicker` writes the selected actor into demo state and is visible in the sidebar for every role. `Subjects` is admin-only and calls `addSubject`, `assignTeacherToSubject` and `assignFormMaster` (with a class selector). `Grading` is admin-only and edits scheme weights, term days, bands and `appliesTo`, calling `saveGradingScheme`. `Marks` lists only subjects assigned to the current actor unless the actor is admin, and calls `setMark` per component per student.

- [ ] **Step 4: Extend routing and navigation in `App.tsx`**

Add the three screens to `screens`, `roleFor`, `allowedFor`, `navIcons`, both `navigate` and `hashchange` role-setting lists, and `ScreenPicker`. Teachers must not receive `subjects` or `grading`; `marks` resolves to the teacher role but is also allowed for admin.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/screens.spec.ts --reporter=line -g "assigned subjects|add a subject|form master|grading scheme"`
Expected: PASS — all four tests.

- [ ] **Step 6: Commit**

```bash
git add apps/education-web/src/screens/Subjects.tsx apps/education-web/src/screens/Grading.tsx apps/education-web/src/screens/Marks.tsx apps/education-web/src/school/ActorPicker.tsx apps/education-web/src/App.tsx apps/education-web/tests/screens.spec.ts
git commit -m "feat: add subject, grading and marks screens with role scoping"
```

---

### Task 6: Reports approval and in-person fee payment

**Files:**
- Modify: `apps/education-web/src/screens/School.tsx` (Reports and Fees sections)
- Modify: `apps/education-web/src/school/ActorPicker.tsx` (fee actor)
- Test: `apps/education-web/tests/screens.spec.ts`

**Interfaces:**
- Consumes: `setReportField`, `approveReport`, `recordInPersonPayment`, `buildReport`, `downloadReport`.
- Produces: report editor with `approve` action; fee form with `recordInPersonPayment`.

- [ ] **Step 1: Write failing UI tests for approval and fees**

Add to `tests/screens.spec.ts`: `teacher cannot approve a report` — assert the approve button is absent for a teacher actor; `admin approves and report becomes read-only` — approve, then assert fields are disabled; `in-person fee payment reduces balance` — record GHS 200 cash with a reference and assert the balance drops and a payment row appears; `admin downloads a PDF with the recorded report fields` — set a long conduct value through the editor, click Download PDF and assert the download's bytes begin with `%PDF`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/screens.spec.ts --reporter=line -g "approve|fee payment reduces|downloads a PDF"`
Expected: FAIL — controls not present.

- [ ] **Step 3: Extend the Reports section**

Add a student selector, editable teacher remark, conduct and promotion for the form master, head remark for admin, approve button rendered only for admin, and read-only fields once approved. Call `buildReport` and `downloadReport` with the selected student.

- [ ] **Step 4: Extend the Fees section**

Add an admin-only "Record in-person payment" form with amount, date, method and reference; call `recordInPersonPayment` and show the updated balance.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test --config apps/education-web/playwright.config.ts apps/education-web/tests/screens.spec.ts --reporter=line -g "approve|fee payment reduces|downloads a PDF"`
Expected: PASS — all four tests.

- [ ] **Step 6: Commit**

```bash
git add apps/education-web/src/screens/School.tsx apps/education-web/src/school/ActorPicker.tsx apps/education-web/tests/screens.spec.ts
git commit -m "feat: add report approval and in-person fee recording"
```

---

### Task 7: Fix stale sign-in labels and final verification

**Files:**
- Modify: `apps/education-web/tests/experience.spec.ts`
- Modify: `apps/education-web/tests/screens.spec.ts`

**Interfaces:**
- Consumes: current sign-in labels `"Preview as student"` and `"Preview as administrator"` from `src/screens/Learning.tsx`.
- Produces: no new interfaces.

- [ ] **Step 1: Update the two stale test selectors**

Replace `"Sign in as student"` with `"Preview as student"` in `experience.spec.ts:9` and `"Sign in as administrator"` with `"Preview as administrator"` in `screens.spec.ts:23`.

- [ ] **Step 2: Run the previously failing tests**

Run: `npx playwright test --config apps/education-web/playwright.config.ts --project=desktop apps/education-web/tests/experience.spec.ts:9 apps/education-web/tests/screens.spec.ts:23 --reporter=line`
Expected: PASS — two tests.

- [ ] **Step 3: Run the whole UI suite with a fresh dev server**

Stop any process listening on 5173, then run: `npm run test:ui -w education-web`
Expected: PASS — all tests, no stale-server timeouts.

- [ ] **Step 4: Run the Deno AI tests**

Run: `npm run test:education-ai -w @devx/backend-tools`
Expected: PASS — 6 passed, 0 failed.

- [ ] **Step 5: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS — clean.

- [ ] **Step 6: Commit**

```bash
git add apps/education-web/tests/experience.spec.ts apps/education-web/tests/screens.spec.ts
git commit -m "test: align sign-in selectors with preview role labels"
```
