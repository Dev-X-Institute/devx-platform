# Report Card PDF & Delivery Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text report PDF with a styled, reproducible vector report card carrying the school crest as a watermark, and rebuild the "Delivery to parents" card so it reads well with long names and contact values.

**Architecture:** One shared report data model (`src/report.ts`) feeds both the on-screen report and a new pdf-lib renderer (`src/pdf.ts`). A shared crest geometry module (`src/crest.ts`) is rendered by a React component (`src/crest.tsx`) on screen and by pdf-lib in the PDF. The delivery card becomes a two-line item list backed by the same student records.

**Tech Stack:** React 19 + TypeScript, Vite, pdf-lib (new), lucide-react (existing), Playwright (existing, `test:ui`).

**Spec:** `docs/superpowers/specs/2026-11-18-report-card-pdf-design.md`

## Global Constraints

- Install the dependency only as `npm install pdf-lib -w education-web` from the repository root. Never install from a sub-folder.
- Declare `pdf-lib` in `apps/education-web/package.json` and justify it in the pull request.
- Never commit directly to `main`; work stays on `feature/report-card-pdf` and lands via PR.
- No secrets. No personal data to any AI provider (no AI is used in this feature).
- `npm run typecheck` and `npm run build` must pass from the repository root before finishing.
- PDF must be a real vector document (pdf-lib), not a rasterised screenshot, and the crest watermark must appear on the page.
- The existing download filename `student-report.pdf` is preserved.

## Review Focus

- **Long, unbroken contact values** (emails with no spaces) must wrap inside the delivery item and must not push the status badge out of the card or cause horizontal page overflow.
- **Missing contact (`null`)** must render the explicit missing state, never the literal text `null` or a blank line.
- **A class with zero students** must show the delivery empty state; the coverage percentage must not be computed (no divide-by-zero, no `NaN%`).
- **School name or student name outside WinAnsi** (e.g. the cedi sign `₵`) must not crash pdf-lib's standard-font `drawText`; the download must still produce a valid `%PDF-` file.
- **Long term or class strings** must not overflow the PDF header or the on-screen report header.

---

### Task 1: Shared report data model

**Files:**
- Create: `apps/education-web/src/report.ts`
- Modify: `apps/education-web/src/demo.ts` (remove the `subjects` declaration at line 8)
- Modify: `apps/education-web/src/screens/School.tsx` (import `subjects`/`buildReport` from `../report`; rewrite `ReportContent`)
- Test: `apps/education-web/tests/screens.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ReportRow { subject: string; classScore: number; exam: number; total: number; grade: string; remark: string }`
  - `interface ReportModel { schoolName: string; term: string; className: string; year: number; student: string; position: string; attendance: string; monogram: string; rows: ReportRow[]; average: number; teacherRemark: string; headRemark: string; generatedOn: string }`
  - `const subjects: string[]`
  - `function buildReport(term: string, className: string, schoolName: string, generatedOn?: string): ReportModel`
  - `function initials(name: string): string` (up to three initials, uppercased)

- [ ] **Step 1: Write the failing test** in `apps/education-web/tests/screens.spec.ts`

```ts
test("report card renders model-driven subject rows", async ({ page }) => {
  await page.goto("/#reports");
  await expect(page.locator(".report-table tbody tr")).toHaveCount(5);
  await expect(page.locator(".report-table tbody tr").first()).toContainText("Mathematics");
  await expect(page.locator(".report-table tbody tr").first()).toContainText("85");
  await expect(page.locator(".report-document")).toContainText("DevX Demo School");
});
```

- [ ] **Step 2: Run the test and record its baseline**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts -g "model-driven"`
Expected: **PASSES before the change too.** This task is a pure refactor (the on-screen
report must render identically), so there is no behaviour to drive out with a failing test.
The test is a **characterization guard**: it pins the rendered output so the refactor cannot
silently change it. Record the passing baseline in your report; do not invent a fake RED.
The genuine proof of this task is that the guard still passes afterwards and `npm run typecheck` is clean.

- [ ] **Step 3: Implement `apps/education-web/src/report.ts`**

Define the interfaces above. `subjects = ["Mathematics", "English Language", "Integrated Science", "Social Studies", "ICT"]`. Scores per index: `classScore = [27,24,26,25,28][i]`, `exam = [58,52,55,54,60][i]`, `total = classScore + exam`, `grade = (i===1||i===3) ? "B2" : "A1"`, `remark = (i===1||i===3) ? "Very good" : "Excellent"`. `average = Math.round((sum of totals / subjects.length) * 10) / 10` (expect `81.8`).

**TypeScript gotcha — this repo sets `noUncheckedIndexedAccess`.** `[27,24,26,25,28][i]` has
type `number | undefined`, so `classScore + exam` will not compile. Build the rows from a
single explicitly typed source of truth instead of index arithmetic, for example:

```ts
const rows: ReportRow[] = [
  { subject: "Mathematics", classScore: 27, exam: 58 },
  { subject: "English Language", classScore: 24, exam: 52 },
  { subject: "Integrated Science", classScore: 26, exam: 55 },
  { subject: "Social Studies", classScore: 25, exam: 54 },
  { subject: "ICT", classScore: 28, exam: 60 },
].map((row, i) => ({ ...row, total: row.classScore + row.exam, grade: i === 1 || i === 3 ? "B2" : "A1", remark: i === 1 || i === 3 ? "Very good" : "Excellent" }));
```

`subjects` must still be exported (as `subjects = rows.map(r => r.subject)` or a literal) because
`ReportContent` and the PDF both iterate it. `initials(name)` must not index unchecked: split,
take the first three parts, and map each part's first character (guard the empty string). Fixed values: `student = "Student 2"`, `position = "4 of 34"`, `attendance = "58 of 60 days"`, `teacherRemark = "A strong term. Keep practising regularly."`, `headRemark = "Well done. Keep up the good work."`, `year = 2026`. `monogram = initials(schoolName)`; `generatedOn` defaults to `new Date().toISOString().slice(0, 10)`.

- [ ] **Step 4: Rewire `ReportContent`** in `apps/education-web/src/screens/School.tsx`

Compute `const report = buildReport(term, className, name)` and render every value from `report` (meta `dd`s, `report.rows` map, remarks). Remove the inline `subjects`/score arrays from `ReportContent`. Update the import on line 3 so `subjects` and `buildReport` come from `../report` and the rest still comes from `../demo`.

Remove `export const subjects = [...]` from `apps/education-web/src/demo.ts`, **but
`demo.ts` still needs it**: `downloadReport` (the old hand-rolled generator) references
`subjects` on its own line and is not rewritten until Task 3. Add `import { subjects } from
"./report";` to `demo.ts` so the package keeps compiling. Task 3 will remove that import when
it rewrites `downloadReport`. Do not leave the build broken between the two tasks.

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts`
Expected: PASS (including the pre-existing `reports renders without errors or page overflow`).

- [ ] **Step 6: Commit**

```bash
git add apps/education-web/src/report.ts apps/education-web/src/demo.ts apps/education-web/src/screens/School.tsx apps/education-web/tests/screens.spec.ts
git commit -m "refactor: share one report data model between screen and PDF"
```

---

### Task 2: School crest (shared geometry + React component)

**Files:**
- Create: `apps/education-web/src/crest.ts`
- Create: `apps/education-web/src/crest.tsx`
- Modify: `apps/education-web/src/screens/School.tsx` (the `.crest` span inside `ReportContent`)
- Modify: `apps/education-web/src/index.css` (`.crest` rule at line 166)
- Test: `apps/education-web/tests/screens.spec.ts`

**Interfaces:**
- Consumes: `initials` from `./report`.
- Produces:
  - `type CrestShape = { kind: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number } | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; fill?: string; stroke?: string; strokeWidth?: number } | { kind: "text"; value: string; x: number; y: number; size: number; fill: string; bold?: boolean; center?: boolean }`
  - `const crestSize = 96` (a 96×96 box, origin top-left, y grows downward)
  - `const crestShapes: CrestShape[]`
  - `function Crest({ label, size, className }: { label: string; size?: number; className?: string })` (React, renders an `<svg viewBox="0 0 96 96" role="img" aria-label="School crest">`)

- [ ] **Step 1: Write the failing test** in `apps/education-web/tests/screens.spec.ts`

```ts
test("report header shows the school crest", async ({ page }) => {
  await page.goto("/#reports");
  await expect(page.locator('.report-document .crest svg[aria-label="School crest"]')).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts -g "school crest"`
Expected: FAIL — the `.crest` today holds the lucide `school` icon (`aria-hidden="true"`, no
`aria-label`), so the `[aria-label="School crest"]` selector matches nothing. Asserting on the
`aria-label` (not just `svg`) is deliberate: a bare `.crest svg` would already pass today.

- [ ] **Step 3: Implement `apps/education-web/src/crest.ts`**

Palette: ring/ink `#0b7053`, field `#e2f1ea`, ribbon `#0b7053`, ribbon text `#ffffff`. Starting geometry (tune visually): ring `{ kind: "circle", cx: 48, cy: 46, r: 44, stroke: "#0b7053", strokeWidth: 4 }`; field `{ kind: "circle", cx: 48, cy: 46, r: 40, fill: "#e2f1ea" }`; monogram text `{ kind: "text", value: "", x: 48, y: 54, size: 24, fill: "#0b7053", bold: true, center: true }` (the `value` is replaced at render time by the `label`); ribbon `{ kind: "rect", x: 14, y: 66, width: 68, height: 18, rx: 9, fill: "#0b7053" }`; motto `{ kind: "text", value: "EST. 2026", x: 48, y: 78, size: 8, fill: "#ffffff", center: true }`.

- [ ] **Step 4: Implement `apps/education-web/src/crest.tsx`**

Map `crestShapes` to `<circle>`/`<rect>`/`<text>`. For the monogram shape, use the `label` prop as its text and render it with `textAnchor="middle"` when `center` is true; render motto text the same way. Import `initials` only if needed for a default label; the component requires `label`.

- [ ] **Step 5: Use it in `ReportContent`** — replace `<span className="crest"><Icon name="school" size={30} /></span>` with `<span className="crest"><Crest label={report.monogram} size={56} /></span>`. In `apps/education-web/src/index.css`, change `.crest` to a plain sized wrapper (`display: grid; place-items: center; flex-shrink: 0; width: 56px; height: 56px;` — drop the background, colour, font-size and font-weight).

- [ ] **Step 6: Run the tests and make sure they pass**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/education-web/src/crest.ts apps/education-web/src/crest.tsx apps/education-web/src/screens/School.tsx apps/education-web/src/index.css apps/education-web/tests/screens.spec.ts
git commit -m "feat: add a shared school crest rendered on screen"
```

---

### Task 3: Vector PDF renderer with crest watermark

**Files:**
- Create: `apps/education-web/src/pdf.ts`
- Modify: `apps/education-web/src/demo.ts` (`downloadReport`; add `downloadBytes`)
- Modify: `apps/education-web/src/screens/School.tsx` (`Reports` and `ParentView` call sites)
- Modify: `apps/education-web/package.json` (adds `pdf-lib` via install)
- Modify: `apps/education-web/tests/screens.spec.ts` (relax the header assertion; add the WinAnsi test)
- Modify: `package-lock.json` (regenerated by install)

**Interfaces:**
- Consumes: `buildReport`, `ReportModel` from `./report`; `crestShapes`, `crestSize` from `./crest`.
- Produces:
  - `function renderReportPdf(model: ReportModel): Promise<Uint8Array>`
  - `function downloadBytes(name: string, bytes: Uint8Array, type?: string): void` in `./demo`
  - `function downloadReport(term?: string, className?: string, schoolName?: string): Promise<void>` in `./demo`

- [ ] **Step 1: Install the dependency**

Run from the repository root: `npm install pdf-lib -w education-web`
Expected: `apps/education-web/package.json` lists `pdf-lib` and `package-lock.json` updates.

- [ ] **Step 2: Write the failing tests** in `apps/education-web/tests/screens.spec.ts`

In the existing test **`report download is a PDF and fee export is a CSV`** (it navigates to
`/#parent`), replace the exact line
`expect(content.subarray(0, 8).toString()).toBe("%PDF-1.4");`
with these two assertions:

```ts
  expect(content.subarray(0, 5).toString()).toBe("%PDF-");
  expect(content.includes("Helvetica")).toBe(true);
```

The second assertion is the real RED: the old generator embeds `/BaseFont /Courier` only, so
`Helvetica` is absent until pdf-lib renders the page. (`%PDF-` alone would already pass.)

Add:

```ts
test("report download survives a school name outside the PDF font character set", async ({ page }) => {
  await page.goto("/#reports");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("devx-education-demo-v1")!);
    saved.schoolName = "DevX GH₵ Academy";
    localStorage.setItem("devx-education-demo-v1", JSON.stringify(saved));
  });
  await page.reload();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).first().click();
  const pdf = await event;
  const bytes = await readFile((await pdf.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts -g "report download"`
Expected: the existing test now FAILs on `expect(content.includes("Helvetica")).toBe(true)`
(the old PDF contains only Courier) — that is the RED. The new WinAnsi test **passes before the
change too** (the old generator hardcodes the school name and still emits `%PDF-`), so treat it
as a regression guard for the sanitizer, not as RED; confirm it is collected and keep it green
after Step 4. Record both outcomes in your report.

- [ ] **Step 4: Implement `apps/education-web/src/pdf.ts`**

Page: `const A4 = { width: 595.28, height: 841.89 }`. Fonts: `StandardFonts.Helvetica` and `StandardFonts.HelveticaBold`, embedded once. Draw the watermark first, then content, using a margin of `48`.

Sanitise every string before `drawText` so standard-font encoding never throws:

```ts
const safeText = (text: string) => text.replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "?");
```

Crest geometry is authored top-left origin, y-down. Convert to PDF coordinates (origin bottom-left, y-up) with this helper, where `(boxLeft, boxBottom)` is the crest box's bottom-left on the page and `scale = size / crestSize`:

```ts
const toY = (boxBottom: number, y: number, scale: number) => boxBottom + (crestSize - y) * scale;
// circle:  center = (boxLeft + cx * scale, toY(boxBottom, cy, scale)), radius = r * scale
// rect:    x = boxLeft + x * scale, y = toY(boxBottom, y + height, scale), width/height * scale
// text:    x = boxLeft + x * scale (minus half the measured width when center),
//          baseline y = toY(boxBottom, y, scale)
```

Expose an internal `drawCrest(page, fonts, { boxLeft, boxBottom, size, opacity, label })` that maps each `CrestShape` to `page.drawCircle` / `page.drawRectangle` / `page.drawText`, substituting `label` for the monogram shape's `value`, and centering text with `font.widthOfTextAtSize(value, size)`. `renderReportPdf` draws:

- **Watermark:** a tiled grid of `drawCrest` calls (3 columns × 5 rows, `size: 150`, `opacity: 0.05`) covering the page, behind everything.
- **Header:** `drawCrest` at `size: 64`, then the school name (bold, 20) and the title "Terminal Report" / `${term} · ${model.year}`.
- **Rule:** a 2pt brand-green `drawRectangle` under the header.
- **Meta:** two rows of label/value pairs (Student, Class, Position, Attendance).
- **Table:** header row (brand-green fill, white bold labels: Subject, Class score, Exam, Total, Grade, Remark), five subject rows with a light zebra tint, right-aligned numeric columns.
- **Remarks:** two bordered boxes (Class teacher's remark, Head's remark).
- **Footer:** `Generated ${model.generatedOn} · Sample data`.

Use `rgb()` with the brand green `rgb(0.043, 0.439, 0.325)` (≈ `#0b7053`) and a light `rgb(0.93, 0.96, 0.95)` for tints. Return `await doc.save()`.

- [ ] **Step 5: Wire `downloadReport` and add `downloadBytes`** in `apps/education-web/src/demo.ts`

```ts
export function downloadBytes(name: string, bytes: Uint8Array, type = "application/pdf") {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadReport(term = "Term 1", className = "JHS 2", schoolName = school) {
  const { buildReport } = await import("./report");
  const { renderReportPdf } = await import("./pdf");
  downloadBytes("student-report.pdf", await renderReportPdf(buildReport(term, className, schoolName)));
}
```

(If `tsc` rejects the `BlobPart` cast under this TypeScript version, use `new Blob([bytes.slice().buffer], { type })` instead.)

- [ ] **Step 6: Update the call sites** in `apps/education-web/src/screens/School.tsx`

In `Reports`, both buttons: `onClick={() => { void downloadReport(term, className, demo.data.schoolName).then(() => notify(...)).catch(() => notify("The report could not be generated.")); }}`. In `ParentView`, the Download PDF button: `onClick={() => void downloadReport("Term 1", student?.className ?? "JHS 2", demo.data.schoolName)}`.

- [ ] **Step 7: Run the tests and make sure they pass**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts`
Expected: PASS, including `report download is a PDF` and the WinAnsi test.

- [ ] **Step 8: Verify the PDF visually** — run the app, click Download PDF, open the file, and confirm: header crest is upright, the watermark is faint and behind the text, the table aligns, and text is selectable (vector, not an image).

- [ ] **Step 9: Commit**

```bash
git add apps/education-web/src/pdf.ts apps/education-web/src/demo.ts apps/education-web/src/screens/School.tsx apps/education-web/package.json package-lock.json apps/education-web/tests/screens.spec.ts
git commit -m "feat: render a styled vector report card PDF with a crest watermark"
```

---

### Task 4: Delivery to parents card for long text

**Files:**
- Modify: `apps/education-web/src/icons.tsx` (add `mail`, `alert`)
- Modify: `apps/education-web/src/screens/School.tsx` (the delivery `Card` inside `Reports`)
- Modify: `apps/education-web/src/index.css` (replace `.delivery-list .list-row*` rules at lines 181–183)
- Test: `apps/education-web/tests/screens.spec.ts`

**Interfaces:**
- Consumes: `Badge`, `ProgressBar`, `EmptyState`, `Icon`; `StudentRecord` from `./records`.
- Produces: no new exports; adds DOM contracts `.delivery-coverage`, `.delivery-item`, `.delivery-avatar`, `.delivery-copy`, `.delivery-contact`, `.delivery-missing`.

- [ ] **Step 1: Write the failing test** in `apps/education-web/tests/screens.spec.ts`

```ts
test("delivery card handles long names and contacts without overflow", async ({ page }) => {
  await page.goto("/#reports");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("devx-education-demo-v1")!);
    saved.students[1].name = "Aleksandra-Beatrice Nkrumah-Mensah";
    saved.students[1].contact = "aleksandra.beatrice.nkrumah.mensah.parent@very-long-domain.school.example";
    localStorage.setItem("devx-education-demo-v1", JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByText("3 of 4 parents have contact details")).toBeVisible();
  const item = page.locator(".delivery-item").filter({ hasText: "Aleksandra" });
  await expect(item.locator(".delivery-copy strong")).toHaveText("Aleksandra-Beatrice Nkrumah-Mensah");
  await expect(item.locator(".delivery-contact")).toContainText("@very-long-domain.school.example");
  await expect(page.locator(".delivery-item").filter({ hasText: "Student 4" }).locator(".delivery-missing")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts -g "delivery card handles long"`
Expected: FAIL — the current markup has no `.delivery-item`/`.delivery-contact`/`.delivery-missing` and no coverage summary.

- [ ] **Step 3: Add icons** in `apps/education-web/src/icons.tsx` — import `Mail, TriangleAlert` from `lucide-react` and add `mail: Mail, alert: TriangleAlert` to the `icons` map.

- [ ] **Step 4: Rebuild the delivery card** in `apps/education-web/src/screens/School.tsx` (the second `Card` in `Reports`)

Heading row with `<h2>Delivery to parents</h2>` and a `<span className="demo-label">Local contact preview</span>`; keep the existing `delivery-description` paragraph. Then, only when `students.length > 0`, a `.delivery-coverage` block: `<span>{contacts} of {students.length} parents have contact details</span>` and `<ProgressBar value={(contacts / students.length) * 100} label="Parent contact coverage" />`. Then a `<ul className="delivery-list">` of `students.slice(0, 5)`:

```tsx
<li className="delivery-item" key={s.id}>
  <span className="delivery-avatar" aria-hidden="true">{initials(s.name)}</span>
  <div className="delivery-copy">
    <strong dir="auto">{s.name}</strong>
    {s.contact
      ? <span className="delivery-contact"><Icon name="mail" size={15} />{s.contact}</span>
      : <span className="delivery-missing"><Icon name="alert" size={15} />No parent contact on file</span>}
  </div>
  <Badge tone={s.contact ? "green" : "red"}>{s.contact ? "Ready" : "Needs contact"}</Badge>
</li>
```

Keep the empty state, the `View all …` button, and the trailing `demo-label`. Import `initials` from `../report` and `ProgressBar` from `../components`.

- [ ] **Step 5: Style it** in `apps/education-web/src/index.css` — delete `.delivery-list .list-row*` (lines 181–183) and add:

```css
.delivery-list { list-style: none; margin: 12px 0 0; padding: 0; }
.delivery-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-top: 1px solid var(--border); }
.delivery-item > .badge { flex-shrink: 0; margin-left: auto; }
.delivery-avatar { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background: var(--mint); color: var(--green); display: grid; place-items: center; font-size: 13px; font-weight: 700; }
.delivery-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.delivery-copy strong { overflow-wrap: anywhere; }
.delivery-contact, .delivery-missing { display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-size: 14px; overflow-wrap: anywhere; }
.delivery-contact { color: var(--muted); }
.delivery-missing { color: var(--color-danger); }
.delivery-coverage { margin: 12px 0 4px; }
.delivery-coverage-head { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; margin-bottom: 6px; }
```

Use `.delivery-coverage-head` for the coverage row.

- [ ] **Step 6: Run the tests and make sure they pass**

Run: `npm run test:ui -w education-web -- tests/screens.spec.ts`
Expected: PASS on desktop and mobile projects.

- [ ] **Step 7: Commit**

```bash
git add apps/education-web/src/icons.tsx apps/education-web/src/screens/School.tsx apps/education-web/src/index.css apps/education-web/tests/screens.spec.ts
git commit -m "feat: redesign the delivery-to-parents card for long text"
```

---

### Task 5: Whole-branch validation and pull request

**Files:**
- Delete: `apps/education-web/_audit-shots.mjs` (temporary audit script)
- Modify: `docs/superpowers/specs/2026-11-18-report-card-pdf-design.md` (mark approved/shipped)

**Interfaces:** none.

- [ ] **Step 1: Remove the temporary script** — `git rm --cached` is unnecessary (it is untracked); delete the file `apps/education-web/_audit-shots.mjs`.

- [ ] **Step 2: Run the full gates from the repository root**

Run: `npm run typecheck` → Expected: PASS (all workspaces).
Run: `npm run build` → Expected: PASS.
Run: `npm run test:ui -w education-web` → Expected: PASS on both projects.

- [ ] **Step 3: Commit the docs/cleanup**

```bash
git add -A
git commit -m "chore: finalise report card PDF and delivery card work"
```

- [ ] **Step 4: Push and open the pull request**

```bash
git push -u origin feature/report-card-pdf
```

Open a PR against `main`, fill in the template, and in the description justify `pdf-lib` (vector PDF generation with an embedded vector crest watermark, pure JS, no native build; ~150 KB, dynamically imported so it does not affect first load).
