# Contributing

## Branches and pull requests

- Never commit directly to `main`.
- Branch names: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Open a pull request early. Fill in the template.
- **Every pull request needs a review from a second team member** before merging.
- CI (typecheck and build) must pass.

## Dependencies and validation

- Use npm workspaces and run commands from the repository root.
- Add a dependency with `npm install <pkg> -w <workspace>` (add `-D` for a development dependency). Never install from a sub-folder without `-w`.
- Each package must declare every dependency it imports in its own `package.json`; do not rely on another workspace's dependencies.
- Explain every added dependency in the pull request. The root `only-allow` development dependency runs the requested npm-only install guard without downloading an unpinned tool during each install.
- Commit the root `package-lock.json`. CI runs `npm ci` to reproduce it and rejects other package-manager lockfiles.
- `.npmrc` enforces supported Node versions and saves new dependency versions exactly. Weekly Dependabot npm updates are grouped into one pull request; CI reports high-severity audit findings without blocking the build.
- Before finishing a task, run `npm run typecheck` and `npm run build` from the repository root.
- Apps use shared code through `@devx/core` and `@devx/ai`; backend access goes through `createBackend()` in `@devx/core`.

See `AGENTS.md` for the rules that apply to AI coding agents.

## Review ownership

| Area | Owner | Reviewer |
| --- | --- | --- |
| `apps/*-web`, `packages/ui` | David | Donald |
| `supabase/`, `packages/core` | Donald | David |
| `packages/ai` | Godfred | Donald |
| `docs/` | David | Founder (for reports) |

## Definition of Done

1. Meets the acceptance criteria on the task card.
2. Reviewed by a second team member.
3. Works on staging.
4. Documented (README, API note or short usage note).
5. Shown at the Friday sprint review and accepted by David.

## Secrets

Never commit keys. Use `.env.local` (ignored by git) and GitHub or Cloudflare secrets.
The AI key stays on the server (edge functions), never in the browser.

## Privacy rule for AI

Do not send names or other personal data to a free-tier AI service.
