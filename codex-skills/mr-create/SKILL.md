---
name: mr-create
description: Create GitLab merge requests in a fork-based workflow. Use when Codex needs to prepare a branch, run checks, push to the user's fork, and open an MR to upstream target branches such as dev.
---

# MR Create

## Inputs
Collect:
- source repo (default `ahmed.merza/oreem`)
- target repo (default `oreem/oreem`)
- source branch (current branch)
- target branch (default `dev`)

## Steps
1. Verify remotes and branch.
2. Sync from upstream target branch.
3. Run relevant checks (tests/lint/typecheck).
4. Commit using Conventional Commit format.
5. Push to fork (`origin`).
6. Create MR to upstream with explicit repo/branch values.

## Commands
```bash
git remote -v
git fetch --all --prune
git fetch upstream dev
git rebase upstream/dev
git push -u origin HEAD
glab mr create -R oreem/oreem --source-branch "$(git branch --show-current)" --target-branch dev --fill
```

## Validate MR
Confirm source/target repos, branches, and pipeline status are correct.
