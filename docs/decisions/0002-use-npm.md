# 0002: Use npm workspaces

**Date:** 2026-11-08

**Decision:** Use npm workspaces for `apps/*` and `packages/*`, keep Turborepo,
require Node >=22, and record the installed npm version (`npm@10.9.8`) in
the root `package.json`.

**Why:** Our three-person part-time team already knows npm. A mobile app is
planned alongside the web apps, and npm workspaces let both use the same
shared packages without teaching the team another package manager. The tools
remain free.

**Trade-off:** npm's dependency hoisting is less strict than isolated installs
and can hide undeclared dependencies. The following guardrails compensate:

- `.npmrc` sets `engine-strict=true` and `save-exact=true`.
- The root `preinstall` script runs `npx only-allow npm`; `only-allow` is a pinned
  development dependency because the install guard needs it.
- Add dependencies from the root with `npm install <pkg> -w <workspace>`.
  Every workspace declares its own imports, and pull requests explain additions.
- Apps access shared logic through `@devx/core` and `@devx/ai`; backend access
  uses `createBackend()` in `@devx/core`.
- Commit `package-lock.json`; CI uses `npm ci`, rejects other lockfiles, and
  requires `npm run typecheck` and `npm run build`.
- CI reports `npm audit --audit-level=high` without blocking builds, and
  Dependabot groups weekly npm updates into one pull request.
- `AGENTS.md` records these rules, scope limits, secret handling, AI privacy,
  and the requirement to use a branch and pull request.

Local shared-package dependencies use `"*"`, which npm links to the matching
workspace. New external dependencies are saved with exact versions.

Cloudflare Pages builds from the repository root with
`npm ci && npm run build -w education-web` and publishes
`apps/education-web/dist`.

**Revisit when:** undeclared dependencies repeatedly escape review or the
workspace setup no longer supports the team's web and mobile apps.
