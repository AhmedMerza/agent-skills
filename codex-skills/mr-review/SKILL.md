---
name: mr-review
description: Review a GitHub pull request or GitLab merge request for correctness, security, architecture, tests, and performance. Use for PR/MR review requests on either forge; report actionable findings before any optional comments.
---

# PR/MR review

Review the proposed change against its target branch and the problem it claims to solve. The skill name is historical; it covers both GitHub PRs and GitLab MRs.

## Resolve the change

- A full URL determines the forge and repository. Otherwise inspect `git remote -v`: GitHub uses `gh`, GitLab uses `glab`. If both remotes exist, use the remote for the **target** repository, not merely the push fork. Never hardcode a project or host.
- For GitHub, read metadata and changed paths with `gh pr view <number> -R <owner/repo> --json number,title,body,state,baseRefName,baseRefOid,headRefOid,files,url`; read the patch with `gh pr diff <number> -R <owner/repo>`. For GitLab, use `glab mr view`/`glab mr diff` or the project-scoped API. Confirm the returned URL matches the requested repository.
- A check status is evidence about the tests it ran, not proof that the diff is safe. Read the changed code and relevant callers. If the local checkout is on another branch, fetch the PR/MR head into `refs/pr/<number>` or `refs/mr/<number>` and inspect with `git show`/`git diff`; do not switch the user's branch. Use API content if fetching is unavailable.

## Review

Apply five lenses: general correctness, security, architecture, test coverage, and performance. For a substantive diff, run independent lenses in parallel when subagents are available, then deduplicate their findings. Scale the depth to the diff; a docs-only change does not need a full security pass. For each suspected issue, confirm the exact new line, the affected behavior, and whether it was already present on the base branch. Check framework defaults and guards before reporting. Treat uncertain product intent as an open question, not a defect. Run relevant tests only when they can run safely in the available environment, and distinguish test failures from environment failures.

Report confirmed findings first, ordered by severity. Give each finding its lens, severity, file and line, impact, and a specific fix direction. Then state coverage, checks run, open questions, and residual risk. A clean review means “no findings in the passes run,” not a guarantee.

## Comments

Show the findings to the user before posting. Post only with explicit approval. Use one line-anchored discussion or review comment per finding when the forge supports it. If a finding cannot be anchored, say so before posting a general comment. Do not post a clean-review comment unless asked.
