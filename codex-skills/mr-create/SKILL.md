---
name: mr-create
description: Create GitLab merge requests using the project's verified source and target repositories. Use when Codex needs to prepare a branch, run checks, push it, and open an MR.
---

# MR Create

## Inputs
Collect:
- source repository and remote from current project policy
- target repository from current project policy
- source branch (current branch)
- target branch (the intended merge target)

## Steps
1. Verify remotes, branch, and GitLab project identities. For a cross-project MR, confirm GitLab records the source as a fork of the target. A similarly named project or configured remote is not proof. If the relationship is absent, stop before pushing and use a same-project source branch only with the required write authorization.
2. Sync from upstream target branch.
3. Run relevant checks (tests/lint/typecheck).
4. Commit using Conventional Commit format.
5. Push to the verified source remote under the current user's write permissions.
6. For any user-visible UI diff, capture before and after screenshots of each affected screen/state. For a new screen, label the previous entry point or absence as before. Upload or commit images, embed them in the MR description, and verify they render for reviewers. Local paths and private artifact links do not count. If blocked, create only a draft explaining which images are missing; never mark it ready or merge it without them. Refresh images after later UI changes.
7. Create MR to upstream with explicit repo/branch values.

## Validate MR
Confirm source/target repos, branches, pipeline status, and (for UI diffs) rendered before/after screenshots are correct.
