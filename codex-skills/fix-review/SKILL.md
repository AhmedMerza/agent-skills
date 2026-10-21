---
name: fix-review
description: Address confirmed review findings on a GitHub PR or GitLab MR, verify fixes, and resolve review threads. Use after mr-review or human review finds actionable defects.
---

# Fix review findings

Resolve the PR/MR from its URL or the current repository. Use `gh` for GitHub and `glab` for GitLab; confirm the target repository before reading or writing. Read the current open threads and the relevant code. If findings were given in this conversation, include those too. Do not reconstruct missing findings from memory.

First separate confirmed defects from questions of product intent. Ask about ambiguous intent before changing behavior. For each defect, reproduce or verify it, fix the cause, and add or adjust a meaningful regression test where useful. Run affected tests and format or static checks. If a newly written regression test protects a material bug, use `prove-the-test` to confirm it fails without the fix.

Show the resulting code change and checks to the user. Preserve existing local edits and stage only the relevant files. Follow the user's existing authorization for commit, push, and posting; otherwise request approval for those external writes only after the fix is reviewable. Do not resolve a thread until the fix is pushed and the discussion's concern is actually addressed. Reply with the fix and commit, then resolve when appropriate. Use the forge API's native thread operations; verify the target thread and avoid duplicate comments.

If a fix changes the design or broadens the diff, rerun `ship-check` and `mr-review` on the updated head before merging. Report unresolved threads, CI status, and any remaining risk.
