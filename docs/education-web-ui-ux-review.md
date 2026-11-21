# education-web UI/UX review

Date: 2026-11-18
Scope: `apps/education-web/src` (13 routes), reviewed at 1440px and 375px, plus a long-text ("worst case") pass.
Method: static source review + automated DOM/CSS measurement in headless Chrome. See [Evidence](#evidence).

## How to read this

Every finding is labelled with how it was established:

- **code-verified** — read directly in the source (with `file:line`) and/or measured in the running app.
- **visual-impression** — a judgement about how something *looks*.

There are **no visual-impression findings in this document**. The reviewing model cannot read images, so no
subjective visual pass was possible. Anything that would normally be a visual call (spacing rhythm, colour
harmony, illustration quality) is out of scope here and should be confirmed by a human looking at
`.artifacts/ui-refinement/*.png`. Everything below is derived from source code and measured DOM/CSS, and is
reproducible with the scripts in [Evidence](#evidence).

Severity: **Moderate** (worth fixing soon) · **Minor** (polish) · **Informational** (note only).

## Summary

| # | Finding | Severity | Verified |
| --- | --- | --- | --- |
| A1 | `quiz` answering state renders no `<h1>` | Minor | code-verified |
| A2 | `shop` heading order skips a level (h1 → h3 → h2) | Minor | code-verified |
| A3 | `outline: none` on two programmatic focus targets, no replacement | Minor | code-verified |
| A4 | `Modal` hardcodes `id="modal-title"` (duplicate-id risk) | Minor | code-verified |
| A5 | Form `aria-label` only exists after a failed validation | Informational | code-verified |
| A6 | Quiz exit button's accessible name is `"× Exit quiz"` | Informational | code-verified |
| T1 | 11px text bypasses the `--font-sm` token (13px) | Minor | code-verified |
| T2 | Numeric table columns lack `tabular-nums` | Minor | code-verified |
| F1 | Missing `autoComplete="off"` on non-auth fields | Minor | code-verified |
| F2 | Placeholders don't end with `…` | Informational | code-verified |
| N1 | Filters / sort / page state not reflected in the URL | Minor | code-verified |
| L1 | Raw ISO date (`2026-11-15`) shown to users | Minor | code-verified |
| L2 | Hardcoded due-date copy | Informational | code-verified |

No moderate-severity findings. Nothing found blocks WCAG 2.2 AA: no overflow, no clipped text, no unnamed
interactive elements, no unlabeled form controls, no low-contrast text detected.

---

## Accessibility and semantics

### A1 — `quiz` has no top-level heading (Minor, code-verified)

The answering state renders a header with a button, a `<strong>` and a `<span>` — no heading — and the
question is a `<legend>`:

- `apps/education-web/src/screens/Learning.tsx:70` — `.quiz-header` (text button + `<strong>` + `<span>`)
- `apps/education-web/src/screens/Learning.tsx:73` — `<fieldset><legend>{question.question}</legend>`
- The only `<h1>` is `apps/education-web/src/screens/Learning.tsx:71`, inside the *finished* result card.

Measured: `h1=0` on `#quiz` at both 1440 and 375. Screen-reader users get no page-level heading while
answering. Fix: promote the quiz title to an `<h1>` (or add a visually-hidden `<h1>`).

### A2 — `shop` heading order skips a level (Minor, code-verified)

- `apps/education-web/src/screens/School.tsx:55` — `<h1>School shop</h1>` (via `PageHeader`, `components.tsx:13`)
- `apps/education-web/src/screens/School.tsx:55` — product names as `<h3 dir="auto">{p.name}</h3>`
- `apps/education-web/src/screens/School.tsx:56` — `<h2>Recent orders</h2>`

The outline is h1 → h3 → h2. Fix: make product names `<h2>`, or add a `<h2>` group heading for the grid and
demote product names to `<h3>`.

### A3 — `outline: none` on programmatic focus targets (Minor, code-verified)

- `apps/education-web/src/index.css:26` — `main:focus { outline: none; }`
- `apps/education-web/src/index.css:528` — `.lesson-detail > div[tabindex]:focus { outline: none; }`

Both are focus destinations that are *deliberately* focused in script:

- `apps/education-web/src/App.tsx:101` — the skip link focuses `main` (`tabIndex={-1}` at `App.tsx:113`)
- `apps/education-web/src/screens/Learning.tsx:55` — `<div ref={heading} tabIndex={-1}>` is focused on lesson change

Suppressing the ring here is defensible (neither is an interactive control), but the global ring lives on
`:focus-visible` (`index.css:25`), so the intent could be expressed by leaving `:focus-visible` alone and
targeting only `:focus`. Low risk; flagging because the guidelines say never `outline: none` without a
replacement.

### A4 — `Modal` hardcodes `id="modal-title"` (Minor / latent, code-verified)

`apps/education-web/src/components.tsx:46` renders `<h2 id="modal-title">` and `aria-labelledby="modal-title"`.
Two dialogs rendered at once would produce duplicate ids and ambiguous labelling. In the current screens every
modal is gated by its own boolean (e.g. `School.tsx:39`, `School.tsx:105`, `School.tsx:106`), so at most one
renders today — but nothing enforces it. Fix: derive the id from `useId()`.

### A5 — Form `aria-label` appears only after a failed validation (Informational, code-verified)

`apps/education-web/src/forms.tsx:15` reads `labels.current[name]`, which is only populated inside
`validate()` at `apps/education-web/src/forms.tsx:10`. Before the first submit the `aria-label` prop is
`undefined`. This is not a defect in practice: every such field is wrapped in a `<label>`
(`SchoolEditors.tsx:7`, `SchoolEditors.tsx:12`, `School.tsx:103`), and the measured audit found **zero**
unlabeled controls on any route. Noted only so it isn't mistaken for a gap.

### A6 — Quiz exit button name (Informational, code-verified)

`apps/education-web/src/screens/Learning.tsx:70` — `>× Exit quiz<`. The accessible name becomes
`"× Exit quiz"`. It is a text button, so it is labelled; the `×` glyph just reads awkwardly. Fix (optional):
drop the glyph or wrap it in a `<span aria-hidden="true">`.

---

## Typography and contrast

### T1 — 11px text bypasses the design token (Minor, code-verified)

`apps/education-web/src/styles/tokens.css:7` defines `--font-sm: .8125rem` (13px) as the smallest type step,
but these rules set 11px directly:

| Rule | Text |
| --- | --- |
| `index.css:282` `.nav-label` | sidebar section label |
| `index.css:292` `.hero-progress > span` | "50% complete" |
| `index.css:295` `.due-label` | "Due Friday" |
| `index.css:305` `.course-progress-label` | "Course progress" |
| `index.css:327` `.chart-unit` | chart unit |
| `index.css:334` `.chart-note` | "Derived from local preview records…" |
| `index.css:560` `.bottom-nav a` | mobile tab labels |

Measured: 6 occurrences on `student-home@1440`, 9 on `student-home@375` (`.tmp/ui-audit.mjs`). This is not a
WCAG failure (WCAG sets no minimum font size) — it is a design-system deviation and the only typography
outlier found. Fix: use `var(--font-sm)` (13px) or add an explicit 11px token if the size is intended.

### T2 — Numeric table columns lack `tabular-nums` (Minor, code-verified)

`font-variant-numeric: tabular-nums` is applied to stat values, course progress, balances and product prices
(`index.css:287`, `index.css:306`, `index.css:508`) but **not** to the tables: the report table
(`index.css:170`–`176`), the students / fees tables (`index.css:139`–`151`) and the chart data table
(`index.css:333`). Score, percentage and balance columns therefore use proportional figures and don't align
vertically. Fix: add `tabular-nums` to `table td`, or to the numeric columns.

---

## Forms

### F1 — Missing `autoComplete="off"` on non-auth fields (Minor, code-verified)

Only the sign-in fields set autocomplete (`Learning.tsx:21`–`22`). The product, fee, stock and payment fields
have a `name` but no `autoComplete` (`SchoolEditors.tsx:7`, `SchoolEditors.tsx:12`, `School.tsx:103`), so
browsers and password managers may offer autofill on fields that don't want it. Fix: `autoComplete="off"` on
non-auth inputs.

### F2 — Placeholders don't end with `…` (Informational, code-verified)

`Teaching.tsx:29` (`"Paste or write lesson content here"`), `Teaching.tsx:50`
(`"Search by student name"`), `PreviewTools.tsx:9` (`"Example field"`). The sign-in email placeholder
(`Learning.tsx:21`, `"you@school.edu.gh"`) is a good example pattern. Fix: append `…` or drop the placeholder
where a visible label already exists.

### Positive — form behaviour

`noValidate` + custom validation with inline errors, `aria-invalid` / `aria-describedby` on failure
(`forms.tsx:15`), `role="alert"` on submit errors (`Teaching.tsx:29`), correct `type` / `inputMode`
(`SchoolEditors.tsx:7`, `SchoolEditors.tsx:12`), labels wrap their controls, and the submit button stays
enabled with a `…`-suffixed loading label (`Teaching.tsx:29`). The quiz radio shares its hit target with the
whole `.quiz-option` label (measured `686×62` vs the `21×21` radio) — see [Non-findings](#non-findings-false-positives).

---

## Navigation and state

### N1 — Filters, sort and pagination are not in the URL (Minor, code-verified)

The route is in the URL (`App.tsx:18`–`19`, hash routing; links are real `<a href="#…">` at `App.tsx:109`,
`App.tsx:117`). But the analytics metric / sort / date range / class (`Analytics.tsx:11`–`14`) and screen
pagination are component state, so a filtered view can't be linked or shared. Acceptable for the demo shell;
flagged as a follow-up rather than a bug.

### Positive — navigation and state

- Skip link: `App.tsx:101` with `.skip-link` styles at `index.css:270`–`271`.
- `aria-current="page"` on both navigations: `App.tsx:109`, `App.tsx:117`.
- Mobile drawer is `inert` when closed and gets `role="dialog"` + `aria-modal` when open, with focus
  returned to the toggle on close: `App.tsx:103`, `App.tsx:104`, `App.tsx:106`.
- Destructive-ish actions are reversible: `demo.update()` returns an undo, and the toast offers "Undo"
  (`App.tsx:119`).
- Toasts are `role="status"` and pause on hover/focus (`App.tsx:119`).

---

## Locale and formatting

### L1 — Raw ISO date shown to users (Minor, code-verified)

`records.ts:7` `dateKey()` returns `YYYY-MM-DD`; `School.tsx:16` renders `{p.date}` verbatim inside
`<small className="demo-label">`. Users see `2026-11-15`. The codebase already knows the right pattern —
`analytics-data.ts:8` uses `Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" })`. Fix: format the
date with `Intl.DateTimeFormat`.

### L2 — Hardcoded due-date copy (Informational, code-verified)

`School.tsx:103` — `"Balance due by 30 November 2026"`. Fine for the demo, but it will silently rot. Fix:
derive from data or `Intl.DateTimeFormat`.

### Positive — formatting

Currency is locale-aware: `demo.ts:8` `money()` uses `toLocaleString("en-GH", …)`. Record counts use
`toLocaleString()` (`components.tsx:30`). The document declares its language and theme
(`apps/education-web/index.html:2` `lang="en"`, `:6` `theme-color`, `:7` `color-scheme: light`).

---

## Content handling and layout

### Positive — long text (verified)

Long names, a 65-character email, CJK and Arabic names, a long school name and a long product name were all
driven through the app with the `worst` preview fixture, at 1440px and 375px. Result: **no horizontal
overflow and no clipped text on any of the 12 routes.**

This is backed by source:

- `index.css:506` — `overflow-wrap: anywhere` on `h1, h2, h3, p, td, th, .list-row > span, .brand > span:last-child`
- `index.css:186`–`187` — `.delivery-copy strong`, `.delivery-contact`, `.delivery-missing`
- `index.css:113`, `index.css:508`, `index.css:546` — `.stat-value`, `.balance-amount` / `.product-price`, `.toast > span`
- `index.css:507` — `min-width: 0` on flex children (`.brand`, `.list-row > span`, `.report-brand > div`)

The delivery list specifically handles the worst case: at 375px the `.delivery-contact` email and the name
`<strong>` both carry `overflow-wrap: anywhere`, and `li.delivery-item` measures `scrollWidth === clientWidth`
(301 = 301) — i.e. the content wraps instead of pushing the card wide.

Wide tables fall back to a stacked card layout below 700px (`index.css:583`–`588`) rather than overflowing.

### Positive — motion

- `prefers-reduced-motion` is honoured: `index.css:488`–`490` disables transition/animation.
- No `transition: all`; properties are listed explicitly (`index.css:24`).
- recharts animations are off (`Analytics.tsx:38`, `Analytics.tsx:42`).
- Touch/interaction contract: `touch-action: manipulation` (`index.css:502`), intentional tap highlight and
  `overscroll-behavior: none` on `html` (`index.css:501`), `overscroll-behavior: contain` in the drawer and
  modal (`index.css:556`, `index.css:581`), and safe-area insets on the mobile chrome (`index.css:555`–`581`).

### Positive — charts and data

Charts carry `accessibilityLayer` (`Analytics.tsx:34`, `Analytics.tsx:39`), a live summary
(`Analytics.tsx:31`), a labelled `role="group"` region (`Analytics.tsx:32`) and a screen-reader data table
with a caption inside a `<details>` (`Analytics.tsx:46`). Keyboard tooltip navigation was confirmed working
(`Fri / Study time : 42 min`).

### Positive — performance and assets

- Analytics and the PDF builder are code-split: `AnalyticsPanel.tsx:4` (`lazy(() => import("./Analytics"))`)
  and `demo.ts:105` (`const { renderReportPdf } = await import("./pdf")` inside `downloadReport`).
- No `<img>` elements — all artwork is inline SVG with explicit `viewBox` and either `role="img"` +
  `aria-label` (`SchoolCrest.tsx:8`, `components.tsx:49`) or `aria-hidden` (`icons.tsx:7`,
  `illustrations.tsx:2`), so there is no CLS risk from missing dimensions.
- Long lists are paginated (students 20/page, orders 10/page) rather than rendered whole.

---

## Non-findings (false positives)

These were flagged by the automated pass and investigated; they are **not** issues:

- **"SVGs missing `aria-hidden`" on student-home / progress.** These are the inner `<svg>` of `SubjectArt`;
  the wrapping `<span class="subject-art">` already has `aria-hidden="true"`. Confirmed by probing the DOM
  (`.tmp/ui-probe2.mjs`).
- **"4 small targets" on `quiz`.** The `21×21` radios sit inside `.quiz-option` labels measured `686×62`; the
  whole row is the hit target, which satisfies WCAG 2.2 target size (`.tmp/ui-probe.mjs`).
- **"long token" warnings on `reports`.** An artefact of concatenating `textContent` across sibling elements;
  the real elements have `overflow-wrap: anywhere` and no overflow (`li.scrollWidth === li.clientWidth`).
  Confirmed with `.tmp/ui-probe3.mjs`.
- **No low-contrast text detected** anywhere, at either width.

---

## Evidence

Scripts (in `.tmp/`, git-ignored):

| Script | What it measures |
| --- | --- |
| `.tmp/inspect-ui.mjs` | 8 routes × 5 widths: overflow, loaded font, chart presence, keyboard tooltip, console errors. Output: `.artifacts/ui-refinement/*.png` |
| `.tmp/ui-audit.mjs` | 13 routes × {1440, 375}: headings, accessible names, target sizes, contrast, unlabeled controls, clipping, overflow, console errors |
| `.tmp/ui-worst.mjs` | 12 routes × {1440, 375} with the `worst` long-text fixture: overflow, clipping, past-viewport elements |
| `.tmp/ui-probe.mjs`, `.tmp/ui-probe2.mjs`, `.tmp/ui-probe3.mjs` | targeted probes for the false positives above |

Measured results (`.tmp/ui-audit.mjs`, 13 routes × 2 widths):

- horizontal overflow: **none**
- console errors: **none**
- interactive elements without an accessible name: **none**
- form controls without a label: **none**
- text below 4.5:1 / 3:1 contrast: **none**
- clipped text: **none**
- sub-12px text: present (see T1)
- heading problems: `quiz` (A1), `shop` (A2)

Long-text pass (`.tmp/ui-worst.mjs`, 12 routes × 2 widths): no overflow, no clipping; the only flags were the
`textContent` artefact described above.

The full Playwright suite is the behavioural evidence for the PR #9 changes: `npm run test:ui -w education-web`
→ **92 passed, 4 skipped, 0 failed**.

### What this review cannot tell you

- Anything visual: spacing rhythm, colour harmony, illustration quality, whether a screen "looks right". The
  model has no image input, so the screenshots in `.artifacts/ui-refinement/` were not reviewed here.
- Anything requiring a real assistive technology: screen-reader output, switch control, screen magnification.
  The findings above are static/DOM evidence, not AT testing.
- Real-data behaviour: all measurements use the demo and synthetic fixtures.
