# DevX Education frontend

The ten supplied PNG references are implemented as responsive React screens. The refined interface retains DevX’s green identity and uses locally hosted Manrope, Lucide icons, subject and learning SVG illustrations, clearer navigation, and consistent card, form and table styles. The lesson panel opens an example reading. Progress, student records and teacher draft review are additional supporting screens.

From the repository root, run `npm run dev:education`. Open `http://localhost:5173`. The sign-in screen and sidebar have an **Explore screens** selector covering all 13 screens. Each screen has a direct hash URL: `#sign-in`, `#student-home`, `#course`, `#quiz`, `#teacher`, `#admin`, `#fees`, `#shop`, `#reports`, `#parent`, `#progress`, `#students`, `#teacher-quizzes`.

Without backend environment values, the app remains a frontend preview with sample records. Role selection only changes preview screens; it does not authenticate. Lesson completion, quiz scores, fee edits, inventory, orders and draft quiz approval persist in local storage under `devx-education-demo-v2`. Clear that key to reset the preview. Parent access previews a page without secure-link verification, and sample data must not be treated as school records.

To use the authentication foundation, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (copy `.env.example`). The app signs in or creates an Auth account through `createBackend()` in `@devx/core`, then reads the user's active school memberships under RLS. A new account has no school access until a trusted administrator provisions a membership. Authenticated users currently see a workspace shell; sample preview screens are not presented as live school data. Database migration and local Auth redirects are configured in the repository's Supabase setup.

Report downloads produce a text-only sample PDF. Fee exports and delivery drafts are CSV files. Screens use sample amounts and scores in place of the numerical placeholders in the source images.

Run `npm run typecheck`, `npm run build`, and `npm run test:ui -w education-web`. The browser checks use installed Google Chrome and cover all 13 screens at 1440px and 375px, local persistence, quiz scoring, forms, draft review, inventory, demo payments, downloads, workspace navigation and chart interactions. Playwright saves screen captures under the ignored `test-results` directory.

Learning activity, class performance and fee collection use lazy-loaded Recharts. Values are derived from the shared local student, study, quiz attempt and payment records. Date filters support today, seven days and thirty days; class filters and fee sorting update the chart and accessible data table together. CSV export includes the filtered values. Reading sessions record elapsed time when reading closes or the lesson screen is left. Quiz attempts update class averages, completion updates the roster, and fee edits preserve recorded payments while recalculating balances. Seed history is synthetic and uses UTC dates relative to today. Payments, authentication and report scores remain previews until the backend is connected.

All six refinement areas are implemented:

1. Mobile learning: persistent bottom navigation, a collapsible lesson list, focus on the selected lesson, safe-area spacing, and completion/quiz actions above navigation.
2. Analytics: local-record derivation, date/class filters, CSV exports, tooltips and accessible tables.
3. Layout resilience: responsive payment/student rows, wrapped long names and contacts, pagination at 20 students/payments and 10 orders.
4. Feedback: inline validation and first-invalid-field focus, loading/error recovery, storage retry, and ten-second undo notifications that pause on hover/focus. Undo restores only the affected records and refuses to replace later changes.
5. Interactive SVG diagrams: states of matter, energy transfers, balanced/unbalanced forces, and an open/closed electric circuit, with keyboard controls and live explanations.
6. Shared design system: three-layer tokens in `src/styles/tokens.css`, common cards/buttons/fields/badges/empty states, and a development component gallery. See [DESIGN.md](DESIGN.md).

Development builds expose **Preview tools** below the workspace: Demo data, Worst case, Empty, One record, 1,000 records, Loading and Error. Scenario edits are temporary and never replace normal saved records. Switching back to Demo data restores the normal session; reloading exits a scenario. Production builds exclude the preview tools and fixtures. The browser matrix exercises these scenarios at 320, 375, 768 and 1440px, plus enlarged text. Browser emulation does not prove iOS keyboard, safe-area or touch behavior on physical devices.

Dependencies added for this UI work (include these reasons in the pull request):

- `recharts`: React charts and interactive analytics with accessible table alternatives.
- `lucide-react`: a consistent SVG icon family for navigation and actions.
- `@fontsource-variable/manrope`: locally hosted variable typography without external font requests.
- `@playwright/test` (existing development dependency): browser and responsive verification.

Design guidance uses UI/UX Pro Max, frontend-design, Taste, Emil Kowalski’s design engineering, mobile-native, break-ui, design-system, and Vercel React best practices. Taste’s typography, alignment and restrained interaction guidance applies to these application screens; its marketing website section/dealer gate was not used. The application’s task layouts and explicit demo labels take priority. UI transitions respect reduced motion, hover feedback is limited to mouse-capable devices, and touch targets are at least 44px. Mobile menus contain keyboard focus and return it to the menu button when dismissed.

Dependencies, builds, browser captures, caches, local skill state and environment/credential files are ignored at the repository root. Keep the package lockfile and sanitized environment examples in version control. This work does not configure an AI gateway or send personal data to an AI provider.
