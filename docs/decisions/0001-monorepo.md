# 0001: Use one monorepo for all DevX apps

**Date:** 2026-11-08  **Decided by:** David

**Decision:** One repository (`devx-platform`) holds all apps (`apps/`) and shared packages (`packages/`), managed with npm workspaces and Turborepo. The package-manager choice is recorded in [0002: Use npm workspaces](0002-use-npm.md).

**Why:**

- Shared code is usable immediately, with no publishing or version bumping.
- One change can update a package and the apps that use it.
- One place for tasks, CI and docs suits a three-person part-time team.
- Web and mobile apps can share logic packages in the same repo.

**Rejected:**

- Umbrella repo with Git submodules: confusing and error-prone for a small team.
- Separate repos with published packages: too much overhead per shared change.

**Trade-off:** Everyone with repo access can see every app. If a client needs access to one app only, export that app to its own repository.

**Revisit when:** a client needs private access to one app, or the repo becomes too slow or large.
