# Coding agent rules

You have permission to inspect anything in the codebase without asking again.

- Install dependencies only with `npm install <pkg> -w <workspace>`. Never run npm install inside a sub-folder without -w.
- Every package must list the dependencies it imports in its own package.json. Never rely on a dependency installed for another package.
- Do not add a dependency without stating why in the pull request.
- Apps use shared code only through @devx/core and @devx/ai. Backend access goes through createBackend() in @devx/core.
- Never commit secrets. The AI key lives in edge functions, never in the browser.
- Never send names or other personal data to a free-tier AI provider.
- Do not edit app code or files outside this task's scope.
- Before finishing any task, run `npm run typecheck` and `npm run build`.
- Never commit directly to main. Use a branch and pull request.
