---
description: Post review notes on a GitHub PR or GitLab MR, fix the issues in code, reply to the threads, and resolve them.
---

# /fix-review - Post Review Notes, Fix Issues, Resolve

## Provider resolution (GitHub or GitLab)

This command works on **either GitHub or GitLab** (self-hosted or SaaS). Resolve the provider once at the start, then use that provider's CLI for every operation below.

1. **Detect the provider** from the push remote's host — `git remote get-url origin`:
   - host is `github.com` (or `*.github.com`) → **GitHub** · CLI `gh` · term **PR**
   - any other host (self-hosted GitLab, `gitlab.com`, …) → **GitLab** · CLI `glab` · term **MR**
   - **Override wins:** if `.claude/repo-config.json` has `"provider": "github"` or `"gitlab"`, use that (for ambiguous/self-hosted hosts).
2. **Target resolution** — let the provider CLI auto-detect host/namespace/IDs from git remotes; never hardcode them. Fork workflow (both `origin` and `upstream` remotes present): `origin` = your push target, `upstream` = the MR/PR target.
3. **Shortcuts & config** — optional per-repo `.claude/repo-config.json` (or legacy `.claude/gitlab-config.json`) supplies `developers` (reviewer/assignee shortcuts → usernames/ids) and `labels` (auto-label rules). **Absent → degrade gracefully:** accept a raw username, skip label automation, don't error.

> Examples below use placeholders (`<HOST>`, `<PROJECT_PATH>`, usernames `alice`/`bob`/`carol`) — resolve real values at runtime.

### CLI cheat-sheet — GitLab ↔ GitHub
| Operation | GitLab (`glab`) | GitHub (`gh`) |
| --- | --- | --- |
| Create MR/PR | `glab api --method POST projects/<id>/merge_requests -F source_branch=… -F target_branch=…` (fork: add `-F target_project_id=<up>`) | `gh pr create --base <target> --head <branch> --title … --body …` (handles remotes/fork itself) |
| Reviewer | `-F reviewer_ids[]=<id>` (resolve id first) | `--reviewer <username>` (or `gh pr edit <n> --add-reviewer <u>`) |
| Assignee | `-F assignee_id=<id>` | `--assignee <username>` |
| Draft | prefix title `Draft: …` | `--draft` |
| username → id | `glab api "users?username=<u>" \| jq '.[0].id'` | not needed — `gh` uses usernames directly |
| List MRs/PRs | `glab mr list` | `gh pr list` |
| View diff | `glab mr diff <id>` (or `glab api projects/<id>/merge_requests/<n>/changes`) | `gh pr diff <n>` |
| MR/PR metadata | `glab api projects/<id>/merge_requests/<n>` | `gh pr view <n> --json …` |
| Comment (general) | `glab mr note <n> -m "…"` | `gh pr comment <n> --body "…"` |
| Inline/threaded review comment | `glab api --method POST projects/<id>/merge_requests/<n>/discussions -F body=… -F position[...]=…` | `gh api --method POST repos/{owner}/{repo}/pulls/<n>/comments -f body=… -f commit_id=… -f path=… -F line=…` |
| Resolve a thread | `glab api --method PUT …/discussions/<discussion_id> -F resolved=true` | `gh api graphql` `resolveReviewThread` (or resolve in UI) |
| Approve | `glab mr approve <n>` | `gh pr review <n> --approve` |

**Notes:** GitHub creation is simpler — prefer `gh pr create` (no project IDs / fork math). Keep the `glab api` fork recipe for GitLab. Where an operation has no clean CLI on a provider (e.g. resolving a specific review thread on GitHub), say so and fall back to the closest equivalent or the web UI rather than pretending.

---

Post code review findings as review threads on the MR/PR, fix the issues, then reply and resolve them after confirmation.

## Usage
```
/fix-review <mr-or-pr-number-or-url>
```
Accepts an MR/PR number or a full MR/PR URL. Resolve the provider first (see above); the number/URL selects the target on that provider.

## Process

### Phase 0: Triage — defects vs. intent questions (do this FIRST, always)

Before posting or fixing anything, split the findings into two kinds:

- **Defects** — objectively wrong: crashes, security holes, logic errors, broken/contradictory behavior, real data bugs. These flow through the normal phases.
- **Intent questions** — anything subjective, aesthetic, or *plausibly intentional* (e.g. "roundness 0 makes corners fully square", "this default could be different", "this threshold/copy could change"). The `/mr-review` report lists these under "Open Questions"; also re-scan the defect list and pull out anything that fails this test: **would a reasonable author unambiguously agree it's broken?** If not, it's an intent question.

**Hard rule for intent questions: never silently implement them, and never pre-suggest a specific code change as if it were the fix.** Do not put them in Phase 2, and do not offer them as a ready-to-apply "fix" option in Phase 4. Instead, **ask the user whether the current behavior is intended** (a plain question — "Is X intended, or should it be Y?"), with NO change staged. Only if the user confirms it's wrong does it become a defect you may fix. When in doubt about which bucket a finding is in, treat it as an intent question and ask. This prevents "fixing" deliberate behavior (the exact failure of suggesting a roundness floor when 0 = square was intended).

### Phase 1: Post Resolvable Review Threads
1. List all unresolved findings from the most recent `/mr-review` output in this conversation.
2. Fetch the MR/PR diffs and parse the diff hunks to build a map of valid new-line numbers per file (only `+` lines and unchanged context lines within hunks are valid):
   - **GitLab:** `glab api projects/<id>/merge_requests/<n>/diffs`
   - **GitHub:** `gh pr diff <n>` (or `gh api repos/{owner}/{repo}/pulls/<n>/files`)
3. For each finding, check if its file:line maps to an actual diff line. If yes, post as a **line-specific review comment** using the diff position (correct `new_line` / `line`). If not, post as a **general comment/thread** with `file:line` referenced in the body.
4. Each note should include: severity tag, description, and suggested fix.
5. Format: `**{SEVERITY}: {title}**\n\n{description}\n\n**Fix**: {suggestion}`

### Phase 2: Fix Issues
0. **Only fix DEFECTS** (per Phase 0). Never fix an intent question here — those go to the Phase 0 "ask first" path, even if the `/mr-review` agent attached a tidy "Fix:" suggestion to them. A suggested fix in the report is not permission to apply it when the underlying behavior may be intentional.
1. Fix all CRITICAL and IMPORTANT issues in the code.
2. For each fix, briefly state what was changed.
3. Run relevant tests / linters / static analysis if they exist for the project (e.g. the repo's test runner, formatter, and analyzer — whatever the stack uses).
4. **Ask the user to confirm** the fixes look correct before proceeding.

### Phase 3: Commit, Push, Reply, Resolve (automatic after user confirms)
Once the user approves the CRITICAL+IMPORTANT fixes, do ALL of the following in one go — do not stop between steps or ask for additional confirmation:
1. Stage and commit all fixes with a descriptive message (e.g., `fix: address review findings — <brief summary>`).
2. Push to the branch.
3. Reply to each review thread with a brief note about what was fixed (see "Reply to a thread" below).
4. Resolve all fixed threads (see "Resolve a thread" below).
5. Show a summary of what was committed, pushed, replied to, and resolved.

### Phase 4: Ask About MINORs (mandatory — never skip)
After Phase 3 completes, **always pause and ask the user** whether they want to fix the MINOR findings in the same MR/PR too. Do NOT decide unilaterally, and do NOT just acknowledge them and move on. The user wants to decide per-MR/PR because sometimes a MINOR is a 1-line quick-win worth bundling, and sometimes it's tech debt that belongs in a separate MR/PR.

Present the MINORs grouped by effort / scope to make the decision easy:
- **Quick wins** (1–5 lines each, high value/effort ratio)
- **Small refactors** (10–30 lines, stylistic or moderate impact)
- **Tech debt / pre-existing** (recommend separate follow-up MR/PR)
- **Security / out-of-scope** (definitely separate MR/PR)
- **Intent questions** (per Phase 0) — list these SEPARATELY, phrased as questions, NOT as fixable options. For each, ask "Is X intended?" and present the alternative behavior neutrally. Do NOT pre-write or stage a change for these, and do NOT mark one "(Recommended)". Only fix one if the user confirms the current behavior is actually wrong.

Then ask something like: "Want me to fix any of these MINOR defects in this MR/PR? Pick a subset or say 'none'." Ask the intent questions as plain questions, separately from the fix picklist.

**If the user picks a subset:**
1. Fix only those items.
2. Commit as a separate commit (keeps the MINOR fixes separately traceable from the IMPORTANT fixes).
3. Push.
4. If any of the fixed MINORs had been posted as threads, reply and resolve them too.
5. Show a summary of what was fixed.

**If the user says none / skip:**
Stop. Do not fix any MINORs. Do not lecture about why they should.

## API Reference (provider-aware)

Keep BOTH paths below. Pick the one matching the provider resolved at the top. `<n>` = the MR/PR number.

### Fetch review comments / threads
- **GitLab:** `glab api projects/<id>/merge_requests/<n>/discussions`
- **GitHub:** `gh api repos/{owner}/{repo}/pulls/<n>/comments` (inline review comments) and `gh api repos/{owner}/{repo}/pulls/<n>/reviews` (review summaries). `{owner}/{repo}` are auto-filled by `gh` in a repo checkout.

### Post a line-specific review comment

**CRITICAL**: the target line MUST be an actual line from the diff (a `+` line or in-hunk context line), NOT an arbitrary file line number. Providers only anchor comments to lines that appear in the diff. To find the correct line number:

1. Fetch the diff (GitLab: `glab api projects/<id>/merge_requests/<n>/diffs`; GitHub: `gh api repos/{owner}/{repo}/pulls/<n>/files`).
2. Parse each diff hunk header (e.g., `@@ -564,9 +567,11 @@`) — the `+567,11` means new lines start at 567.
3. Count the `+` and unchanged lines in the hunk to find exact new line numbers.
4. Use ONLY these line numbers.

If you cannot determine the exact diff line, fall back to a **general comment/thread** with file:line in the body.

**GitLab** — for lines being **removed** (old code), use `position[old_line]`/`position[old_path]` instead of the `new_*` variants:
```bash
glab api --method POST "projects/<id>/merge_requests/<n>/discussions" \
  -F "body={note_body}" \
  -F "position[base_sha]={base_sha}" \
  -F "position[head_sha]={head_sha}" \
  -F "position[start_sha]={start_sha}" \
  -F "position[position_type]=text" \
  -F "position[new_path]={file_path}" \
  -F "position[new_line]={line_number_from_diff}"
```

**GitHub** — anchor to the head commit sha; use `line` (and `side=LEFT` for a removed/old line):
```bash
gh api --method POST "repos/{owner}/{repo}/pulls/<n>/comments" \
  -f body="{note_body}" \
  -f commit_id="{head_sha}" \
  -f path="{file_path}" \
  -F line={line_number_from_diff} \
  -f side=RIGHT
```

### Post a general comment
Use this when the finding cannot be mapped to a specific diff line, or as a fallback when line-specific posting fails.
- **GitLab:** `glab api --method POST "projects/<id>/merge_requests/<n>/discussions" -F "body={note_body}"` (or `glab mr note <n> -m "{note_body}"`)
- **GitHub:** `gh pr comment <n> --body "{note_body}"`

### Reply to a thread
- **GitLab:** `glab api --method POST "projects/<id>/merge_requests/<n>/discussions/{discussion_id}/notes" -F "body={reply}"` (or `glab mr note <n> -m "{reply}"` for a non-threaded note)
- **GitHub:** reply to a specific inline thread via `gh api --method POST "repos/{owner}/{repo}/pulls/<n>/comments/{comment_id}/replies" -f body="{reply}"`, or drop a general reply with `gh pr comment <n> --body "{reply}"`.

### Resolve a thread
- **GitLab:** clean per-thread resolve:
  ```bash
  glab api --method PUT "projects/<id>/merge_requests/<n>/discussions/{discussion_id}" \
    -F resolved=true
  ```
- **GitHub:** there is **no simple per-thread resolve CLI flag**. Resolve either via the GraphQL `resolveReviewThread` mutation, or manually in the web UI. Be honest about this gap — don't invent a REST flag. GraphQL approach (needs the thread's node id, obtained from a `reviewThreads` query on the PR):
  ```bash
  gh api graphql -f query='
    mutation($threadId: ID!) {
      resolveReviewThread(input: { threadId: $threadId }) {
        thread { id isResolved }
      }
    }' -F threadId="{thread_node_id}"
  ```
  If the node id isn't readily available, tell the user to resolve those threads in the PR web UI.

### Get diff refs (for line-specific comments)
- **GitLab:** `glab api "projects/<id>/merge_requests/<n>" | jq '.diff_refs'` (base/head/start shas)
- **GitHub:** `gh pr view <n> --json headRefOid,baseRefOid` (head sha = `commit_id` for inline comments)

## Notes
- Always post notes BEFORE fixing, so the MR/PR has a record of what was found.
- If a line-specific comment fails (wrong position), fall back to a general comment/thread with file:line in the body.
- **CRITICAL and IMPORTANT**: always fix in Phase 2, after confirming the plan with the user.
- **MINOR**: never auto-fix. Phase 4 is mandatory — always ask the user whether to bundle them into this MR/PR or defer to a follow-up. Group them by effort (quick wins / small refactors / tech debt / out-of-scope) so the user can pick selectively.
- On GitHub, resolving threads may require GraphQL or the web UI — surface this to the user rather than silently skipping resolution.
- Always ask the user to confirm fixes before committing.
