---
name: commit
description: Strict commit and merge-request workflow for fork-based GitLab projects. Use when preparing commits, running pre-commit quality checks, pushing branches, and creating merge requests with safe confirmation gates.
---

# commit

## Rules
1. Follow repository-local remote and target-branch policy (from local project docs) instead of hardcoding remotes.
2. Verify GitLab auth before push/MR operations with `glab auth status`.
3. If auth/token is invalid, stop and request token fix in `~/.config/glab-cli/config.yml`.
4. Run quality checks on changed files:
   - PHP: PHPStan -> Rector -> Pint
   - Frontend: ESLint only on changed `.ts/.vue` files
5. Run targeted tests for touched behavior before commit.
6. Use conventional commits: `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `perf(scope): ...`.
7. Keep commits scoped and atomic; avoid mixing unrelated changes.

## Commit flow
1. Inspect changes (`git status`, `git diff --name-only`).
2. Split unrelated changes.
3. Run changed-file quality checks.
4. Run targeted tests.
5. Stage and commit with conventional message.
6. Push branch to the repository-defined fork remote.
7. Create MR using repository-defined workflow (CLI/API/helper), defaulting to the repository-defined target branch.

## Safety
- Ask before any state-changing GitLab operation (create/merge/close/update MR, force push, branch delete).
- Read-only GitLab operations and MR comments are allowed without extra confirmation.
