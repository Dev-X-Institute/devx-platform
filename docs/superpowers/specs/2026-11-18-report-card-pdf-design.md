# Report card PDF — design

- Date: 2026-11-18
- Branch: `feature/report-card-pdf`
- Status: awaiting approval

## Intent / why

The "Download PDF" buttons currently produce a plain-text, Courier-only PDF that is
hand-assembled in `apps/education-web/src/demo.ts` (`downloadReport`). It looks
unofficial, and it re-declares the student and subject data inline, so the PDF and the
on-screen report can drift apart. We want a professional, reproducible report card PDF
that carries the school's badge as a watermark.

## Goals

- Generate a real **vector** PDF (crisp at any zoom, reproducible) instead of plain text.
- Style it to match the app: badge + school header, coloured rule, meta row, subject
  table, teacher/head remarks, footer.
- Draw the school badge as a faint **watermark** behind the content on every page.
- One shared report data model feeding both the on-screen `ReportContent` and the PDF.
- Keep both existing buttons working (`Reports` screen and the parent view).

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

## Left to the builder

- Exact crest artwork and motto text.
- Exact table column widths and spacing.
- Whether to include signature lines.

## One open item

"something that can't be reproduced" is read here as "it can't be reproduced as a proper
official document." If it instead means the report should be hard to forge or copy (a
unique serial or verification code per report), that changes the design and must be
folded in before implementation.
