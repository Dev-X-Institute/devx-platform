# DevX Platform

One repository for all DevX Solutions apps and the packages they share.
Currently active: **education-web** ([Milestone 0 to 4 plan](docs/education-milestone-plan.md), with [review notes](docs/education-milestone-plan-review.md)).

## What is where

```
apps/
  education-web/     React + Vite + Tailwind (David)
packages/
  core/              shared types and the single backend connection (Donald)
  ai/                AI adapter, provider-swappable (Godfred)
  config/            shared TypeScript settings
supabase/            database migrations and edge functions (Donald)
docs/                status pages, decisions, reports, logs (David)
.github/             CI, keep-alive job, PR and task templates
```

Apps import shared code like this: `import { createBackend } from "@devx/core"`.
Change a package once and every app that uses it gets the change.

## First-time setup

1. Install **Node 22** (see `.nvmrc`), **npm** (included with Node; this repo uses `npm@10.9.8`) and **Git**.
2. Install everything from the repository root: `npm install`
3. Copy `apps/education-web/.env.example` to `apps/education-web/.env.local` and fill in the Supabase URL and anon key (ask Donald).
4. Start the education app: `npm run dev:education`

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev:education` | Run the education app locally |
| `npm run typecheck` | Check types in every app and package |
| `npm run build` | Build everything (CI runs this on every pull request) |
| `npm install <pkg> -w <workspace>` | Add a dependency to the workspace that imports it |

Run commands from the repository root. Commit `package-lock.json`; CI uses `npm ci`
to install the locked versions. See `CONTRIBUTING.md` for dependency guardrails.

## Adding a new app later

1. Create `apps/<app-name>/` (web: copy `education-web`; mobile: use Expo).
2. Add `@devx/core` and `@devx/ai` as `"*"` dependencies if needed; npm links the local workspaces.
3. Add the app id to `AppId` in `packages/core/src/index.ts`.
4. Create `docs/status/<app-name>.md` from `docs/status/_template.md`.
5. Run `npm install` from the repository root, then `npm run typecheck` and `npm run build`, and open a pull request.

Web and mobile apps share logic packages (`core`, `ai`). They do not share UI components,
because web and React Native render differently.

## Deploying the education app (Cloudflare Pages, free)

- Root directory: repository root
- Build command: `npm ci && npm run build -w education-web`
- Output directory: `apps/education-web/dist`
- Environment variables: `NODE_VERSION=22`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Free-tier keep-alive

Supabase pauses idle free projects after 7 days. `.github/workflows/keepalive.yml` pings the project twice a week.
Add the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` in GitHub settings.

## Working rules

See `CONTRIBUTING.md`. Short version: every task has an owner, every change goes through a pull request,
and nothing is Done until a second person has reviewed it.
