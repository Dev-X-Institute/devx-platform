# DevX Education frontend

The ten supplied PNG references are implemented as responsive React screens with the reference palette, Arial typography, sidebar, cards and tables. Product placeholders are replaced with local SVG illustrations; the lesson placeholder opens an example reading.

From the repository root, run `npm run dev:education`. Open `http://localhost:5173`. The sign-in screen and sidebar have an **Explore screens** selector. Each screen has a direct hash URL: `#sign-in`, `#student-home`, `#course`, `#quiz`, `#teacher`, `#admin`, `#fees`, `#shop`, `#reports`, `#parent`.

This is a frontend preview with sample records. Sign-in accepts any valid email and nonempty password and does not authenticate. Lesson completion, quiz scores, fee edits, inventory, orders and draft quiz approval persist in local storage under `devx-education-demo-v1`. Clear that key to reset the preview. Email addresses and passwords are not stored. AI uses `MockAiProvider` from `@devx/ai` locally. Payments record sample changes only, and message actions download drafts without sending anything. Parent access currently previews a page without secure-link verification; production access requires backend integration through `createBackend()` in `@devx/core`.

Report downloads produce a text-only sample PDF. Fee exports and delivery drafts are CSV files. Screens use sample amounts and scores in place of the numerical placeholders in the source images.

Run `npm run typecheck`, `npm run build`, and `npm run test:ui -w education-web`. The browser checks use installed Google Chrome and cover the ten screens at 1440px and 375px, local persistence, quiz scoring, forms, draft review, inventory, demo payments and downloads. Playwright saves screen captures under the ignored `test-results` directory.

`@playwright/test` is the only added dependency. It is a development dependency used for browser and responsive verification of the new screens.
