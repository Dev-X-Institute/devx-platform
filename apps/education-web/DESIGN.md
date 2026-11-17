# DevX Education design system

The application keeps the supplied screens’ green school identity, with Manrope typography, Lucide icons and locally authored SVG illustrations. Task controls, readable lesson content and school records guide the layout.

## Tokens and components

`src/styles/tokens.css` defines primitive palette/spacing/type values, semantic roles, and component contracts. Use semantic names such as `--color-action`, `--color-text-muted`, `--color-surface`, `--color-warning` and `--color-danger` for new UI. Existing green/mint/ink aliases resolve to those same roles. Cards, controls, focus rings and borders consume component tokens. Decorative illustrations may retain their own artwork colors.

| Component | Contract |
| --- | --- |
| Button | 48px standard height; 44px compact minimum; visible focus; disabled state; immediate press feedback |
| Field | Visible label; inline error referenced through `aria-describedby`; first invalid field receives focus; 16px text on touch devices |
| Card | Shared surface, border, radius and spacing; content can shrink and wrap |
| Badge | Text communicates status alongside color |
| Progress | Values bounded to 0–100 and exposed through ARIA |
| Empty state | Explains the missing records and offers an applicable next action |
| Table | Headers and captions; student/payment rows become labeled groups on phones; report tables scroll within their cards |
| Analytics | Local-record chart, concise summary, filters, CSV export and equivalent data table; no animated data changes |
| Modal/menu | Labeled dialog, keyboard containment and restored focus |
| Notification | Ten-second lifetime paused while hovered/focused; dismissible; undo refuses conflicting later edits |

## Mobile and motion

The lesson picker starts collapsed on phones. Selecting a lesson closes it, focuses the lesson heading and scrolls that heading into view. Lesson actions stay above the role navigation; content includes room below them. Navigation menus contain scrolling and lock the page underneath. Safe-area padding and dynamic modal height accommodate mobile browser chrome. Inputs preserve browser zoom and request suitable keyboards.

Hover styles apply only to mouse-capable pointers. Press feedback uses a short transform; reduced motion removes transitions. Charts and diagrams change directly without decorative movement. Light mode is the supported palette.

## Local records and verification

The backend is unavailable. The store persists synthetic normal-session records, migrates prior preview saves, validates record shapes, and recalculates balances from recorded payments. Student 2 is the current learner/parent record. Only science completion and quiz records are interactive; other course progress and terminal report scores remain labeled samples.

Development-only Preview tools provide temporary worst-case, empty, single and 1,000-record data plus loading/error states and a component gallery. Browser tests exercise interaction, persistence, exports, recovery, pagination, enlarged text and 320–1440px layouts. Those checks use Chrome desktop and phone emulation. Physical iOS/Android keyboard, browser-bar, safe-area and touch testing remains a device check.
