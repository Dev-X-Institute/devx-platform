# Report card PDF — design

- Date: 2026-11-18
- Branch: `feature/report-card-pdf`
- Status: awaiting approval

## Intent / why

Two related pieces of work on the Report cards screen:

1. The "Download PDF" buttons currently produce a plain-text, Courier-only PDF that is
   hand-assembled in `apps/education-web/src/demo.ts` (`downloadReport`). It looks
   unofficial, and it re-declares the student and subject data inline, so the PDF and the
   on-screen report can drift apart. We want a professional, reproducible report card PDF
   that carries the school's badge as a watermark.
2. The "Delivery to parents" card crams the student name, parent contact and status badge
   onto one line, so long names and long contact values (emails) squeeze each other and
   wrap badly. It needs a layout that reads well with long text.

The work grew from one piece to two after the first design was approved; both stay in this
document and ship on the same branch.

## Goals

- Generate a real **vector** PDF (crisp at any zoom, reproducible) instead of plain text.
- Style it to match the app: badge + school header, coloured rule, meta row, subject
  table, teacher/head remarks, footer.
- Draw the school badge as a faint **watermark** behind the content on every page.
- One shared report data model feeding both the on-screen `ReportContent` and the PDF.
- Keep both existing buttons working (`Reports` screen and the parent view).
- **Delivery card:** a two-line item layout (name on its own line, contact beneath it) that
  reads cleanly with long names and long contact values; a clear missing-contact state; and
  a contact-coverage summary surfaced on the card.

## Non-goals

- No server-side or Edge Function PDF generation.
- No real student data — the app stays a sample/demo.
- The delivery-draft CSV flow is untouched.

## Anti-goals

- No rasterised (screenshot) output — it is blurry and not reproducible.
- No heavy or native dependency.

## Constraints

- Add `pdf-lib` with `npm install pdf-lib -w education-web`; declare it in
  `apps/education-web/package.json`; justify it in the pull request.
- Branch + PR only; never commit to `main`.
- No secrets. No personal data leaves the app (no AI is involved).
- `npm run typecheck` and `npm run build` must pass before finishing.

## Approaches considered

- **A — pdf-lib vector PDF (chosen).** Real vector output, vector badge watermark, full
  layout control, no browser print dialog. Costs one dependency.
- **B — print / save-as-PDF.** No dependency and reuses existing markup, but it goes
  through the browser print dialog and gives fiddly page-break and watermark control.
- **C — html2canvas + jsPDF.** Pixel-perfect WYSIWYG, but raster (not reproducible) and
  two dependencies.

## Design (decided in conversation)

### Workstream 1 — Report card PDF

- **Badge.** Author a proper school crest as an SVG for the app and mirror the same
  geometry in the PDF. The crest is geometric (shield/roundel + monogram + motto) so
  pdf-lib can draw it with primitives / `drawSvgPath` — no raster asset, no canvas.
- **PDF layout.** A4 portrait, standard Helvetica fonts (no font files). Header with
  badge + school name + report title; brand-green rule; meta row (student, class,
  position, attendance); subject table with a shaded header row and zebra rows; two
  remark boxes; footer with generated date and a "sample data" note.
- **Watermark.** The crest drawn diagonally at low opacity (~5–8%), tiled behind the
  content, on every page.
- **Data model.** New `src/report.ts` exporting `buildReport(term, className, schoolName)`
  returning a structured report. `ReportContent` and the PDF builder both consume it;
  remove the duplicated arrays from `demo.ts` and `School.tsx`.
- **Wiring.** `downloadReport` becomes async, uses pdf-lib and the shared model; callers
  pass the school name; failures surface through the existing `notify` toast.
- **Tests.** A light Playwright check that clicking Download yields a `%PDF` payload.

### Workstream 2 — Delivery to parents card

Current markup (`screens/School.tsx`) is a single flex `.list-row` per student:
`<strong>name</strong> <span class="muted">contact</span> <Badge/>`, with the contact
pushed right by `.delivery-list .list-row > .muted { margin-left: auto }`. Name, contact
and badge compete for one line, so long values wrap badly.

Proposed item layout (name and contact on separate lines; badge pinned right):

```
Delivery to parents
Review the saved parent contacts before preparing a delivery draft.
12 of 16 parents have contact details   ▓▓▓▓▓▓▓▓▓▓▓░░░░
────────────────────────────────────────────────────────
(2) Student 2                                   [ Ready ]
    ✉ parent2@school.example
(4) Student 4                        [ Missing contact ]
    ⚠ No parent contact · add one in Students
────────────────────────────────────────────────────────
View all 16 student records
```

- **Two-line item.** A dedicated `.delivery-item` (not the shared `.list-row`): initials
  avatar + a text column (name, then contact beneath) + a status badge that is
  `flex-shrink: 0`. The text column gets `min-width: 0` and `overflow-wrap: anywhere`, so
  long names and emails wrap inside the column instead of fighting the badge.
- **Contact line.** A small mail icon plus the contact value; a missing contact renders as
  its own muted/warning line ("No parent contact · add one in Students"), not inline with
  the name.
- **Coverage summary.** Surface "N of M parents have contact details" with the existing
  `ProgressBar` on the card, instead of only inside the delivery modal.
- **Icons.** Add `mail` and `alert` to `icons.tsx` from `lucide-react` (already a
  dependency; the file is just a name → lucide map).
- **Modal + CSV** keep their current behaviour; the modal's counts now match the card.

### Shared

- **Tests.** Light Playwright checks for both: Download yields a `%PDF` payload, and the
  delivery card renders a long name/contact without horizontal overflow.

## Left to the builder

- Exact crest artwork and motto text.
- Exact table column widths and spacing.
- Whether to include signature lines.

## One open item

"something that can't be reproduced" is read here as "it can't be reproduced as a proper
official document." If it instead means the report should be hard to forge or copy (a
unique serial or verification code per report), that changes the design and must be
folded in before implementation.
