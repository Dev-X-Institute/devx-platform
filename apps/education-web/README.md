# DevX Education frontend

The ten supplied PNG references are implemented as responsive React screens. The refined interface retains DevX’s green identity and uses locally hosted Manrope, Lucide icons, subject and learning SVG illustrations, clearer navigation, and consistent card, form and table styles. The lesson panel opens an example reading. Progress, student records and teacher draft review are additional supporting screens.

From the repository root, run `npm run dev:education`. Open `http://localhost:5173`. The sign-in screen and sidebar have an **Explore screens** selector. Each screen has a direct hash URL: `#sign-in`, `#student-home`, `#course`, `#quiz`, `#teacher`, `#admin`, `#fees`, `#shop`, `#reports`, `#parent`.

This is a frontend preview with sample records. Sign-in accepts any valid email and nonempty password and does not authenticate. Lesson completion, quiz scores, fee edits, inventory, orders and draft quiz approval persist in local storage under `devx-education-demo-v1`. Clear that key to reset the preview. Email addresses and passwords are not stored. AI uses `MockAiProvider` from `@devx/ai` locally. Payments record sample changes only, and message actions download drafts without sending anything. Parent access currently previews a page without secure-link verification; production access requires backend integration through `createBackend()` in `@devx/core`.

Report downloads produce a text-only sample PDF. Fee exports and delivery drafts are CSV files. Screens use sample amounts and scores in place of the numerical placeholders in the source images.

Run `npm run typecheck`, `npm run build`, and `npm run test:ui -w education-web`. The browser checks use installed Google Chrome and cover the ten screens at 1440px and 375px, local persistence, quiz scoring, forms, draft review, inventory, demo payments and downloads. Playwright saves screen captures under the ignored `test-results` directory.

Learning activity, class performance and fee collection use Recharts. The chart module loads only on screens with analytics. Activity filters switch between study time and lessons; fee charts can be sorted by collection rate. Tooltips, keyboard interaction, direct labels and expandable data tables provide multiple ways to read values. Chart animations are disabled. Analytics are fixed, explicitly labeled sample datasets, separate from saved lesson progress and demo fee transactions.

Dependencies added for this UI work (include these reasons in the pull request):

- `recharts`: React charts and interactive analytics with accessible table alternatives.
- `lucide-react`: a consistent SVG icon family for navigation and actions.
- `@fontsource-variable/manrope`: locally hosted variable typography without external font requests.
- `@playwright/test` (existing development dependency): browser and responsive verification.

Design guidance uses UI/UX Pro Max, frontend-design, Taste, Emil Kowalski’s design engineering, and Vercel React best practices. Taste’s typography, alignment and restrained interaction guidance applies to these application screens; its marketing website section/dealer gate was not used. The application’s task layouts and explicit demo labels take priority. UI transitions respect reduced motion; touch targets are at least 44px, and tables scroll within their cards on small screens.

Dependencies, builds, browser captures, caches, local skill state and environment/credential files are ignored at the repository root. Keep the package lockfile and sanitized environment examples in version control. This work does not configure an AI gateway or send personal data to an AI provider.
