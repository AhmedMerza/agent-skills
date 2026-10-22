---
disable-model-invocation: true
name: mr-status
description: "Display comprehensive status overview for GitLab merge request. Run only when the user explicitly asks for it."
---

# /mr-status

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Displays a comprehensive status overview for a GitLab merge request without opening the browser.

**⚠️ Permission**: Read-only command, **NO permission required**

## Usage
```
/mr-status <mr-number>
```

**Arguments:**
- `<mr-number>` - MR number (e.g., `1598` or `!1598`)

**Examples:**
```bash
/mr-status 1598           # Show status for MR !1598
/mr-status !1598          # Show status for MR !1598
```

## What it shows

**Core Information**:
- MR title and description
- Status (open, merged, closed)
- Author
- Source → Target branches
- Web URL

**Team & Review**:
- Assignee(s)
- Reviewers
- Approvals status (count, required, who approved)

**CI/CD Pipeline**:
- Pipeline status (passed, failed, running, pending)
- Pipeline URL
- Job failures (if any)

**Merge Status**:
- Conflicts detected
- Mergeable status
- Work in progress (WIP/Draft)
- Discussions resolved

**Metadata**:
- Created/updated timestamps
- Labels
- Milestones

## Example Output

### Example 1: Ready to merge
```
📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open ✓
   Author: dana.lee
   Source: <FORK_PATH>:feature/add-pickup-details
   Target: <PROJECT_PATH>:dev

👤 Assignee: alice
👥 Reviewers: alice ✓, bob ✓
✅ Approvals: 2/2 (Required: 2)
   - Eng Alice ✓
   - Eng Bob ✓

🔄 Pipeline: ✓ Passed (#12345)
   URL: <GITLAB_URL>/<PROJECT_PATH>/-/pipelines/12345

✅ Merge Status:
   ✓ No conflicts
   ✓ All discussions resolved
   ✓ Ready to merge

🏷️  Labels: feature, backend, reviewed
📅 Created: 2025-12-27 10:30 AM
📅 Updated: 2025-12-27 11:45 AM

🔗 View: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
```

### Example 2: Has issues
```
📋 MR #1597: fix(auth): token expiration handling
   Status: Open ⏳
   Author: dana.lee
   Source: <FORK_PATH>:feature/fix-auth-bug
   Target: <PROJECT_PATH>:dev

👤 Assignee: None
👥 Reviewers: bob (pending)
⚠️  Approvals: 0/2 (Required: 2)

🔄 Pipeline: ❌ Failed (#12344)
   Failed jobs:
   - test-backend (PHP 8.4)
   - lint-frontend (ESLint)
   URL: <GITLAB_URL>/<PROJECT_PATH>/-/pipelines/12344

❌ Merge Status:
   ❌ Has merge conflicts
   ❌ 3 unresolved discussions
   ❌ Pipeline must pass
   ❌ Cannot merge

⚠️  Action Required:
   1. Resolve merge conflicts
   2. Fix failing tests
   3. Address review comments
   4. Get 2 approvals

🔗 View: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1597
```

### Example 3: Work in progress
```
📋 MR #1596 (DRAFT): refactor(orders): validation logic
   Status: Draft 🚧
   Author: dana.lee
   Source: <FORK_PATH>:feature/refactor-validation
   Target: <PROJECT_PATH>:dev

👤 Assignee: carol
👥 Reviewers: None

🔄 Pipeline: ⏳ Running (#12343)
   Running jobs:
   - test-backend (in progress)
   URL: <GITLAB_URL>/<PROJECT_PATH>/-/pipelines/12343

🚧 Work in Progress
   This MR is marked as draft and cannot be merged yet.

🔗 View: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1596
```

## Process

1. **Parse MR number**: Extract MR number from argument
2. **Fetch MR details**: Get comprehensive MR data via GitLab API
3. **Fetch pipeline status**: Get latest pipeline info
4. **Fetch approvals**: Get approval status and approvers
5. **Check conflicts**: Determine if MR has merge conflicts
6. **Format output**: Display comprehensive status overview
7. **Return URL**: Provide link to view in browser

## GitLab API

**Endpoints Used**:
```bash
# Get MR details
glab api projects/2/merge_requests/1598

# Get MR approvals
glab api projects/2/merge_requests/1598/approvals

# Get latest pipeline
glab api projects/2/merge_requests/1598/pipelines | jq '.[0]'

# Get pipeline jobs (if failed)
glab api projects/2/pipelines/{pipeline_id}/jobs
```

**Example API Call**:
```bash
# Get full MR status
glab api projects/2/merge_requests/1598 | jq '{
  title,
  state,
  author: .author.username,
  assignee: .assignee.username,
  reviewers: [.reviewers[].username],
  source_branch,
  target_branch,
  merge_status,
  has_conflicts,
  work_in_progress,
  pipeline: .pipeline.status,
  web_url
}'
```

## Status Icons

| Icon | Meaning |
|------|---------|
| ✓ | Success / Passed / Approved |
| ❌ | Failed / Blocked / Conflicts |
| ⏳ | Running / Pending / In Progress |
| ⚠️ | Warning / Action Required |
| 🚧 | Draft / Work in Progress |
| 📋 | MR Information |
| 👤 | Assignee |
| 👥 | Reviewers |
| 🔄 | Pipeline |
| 🏷️ | Labels |
| 📅 | Dates |
| 🔗 | Link |

## Use Cases

**Before merging**:
```bash
/mr-status 1598
# Check if MR is ready to merge:
# - All approvals received
# - Pipeline passed
# - No conflicts
# - Discussions resolved
```

**During review**:
```bash
/mr-status 1598
# Check review progress:
# - Who has approved
# - Who still needs to review
# - Any blocking issues
```

**Debugging CI/CD**:
```bash
/mr-status 1598
# Check pipeline status:
# - Which jobs failed
# - Pipeline URL for details
# - Can retry pipeline from web UI
```

**Quick overview**:
```bash
/mr-status 1598
# Get snapshot without opening browser:
# - Current status
# - Who's assigned/reviewing
# - Any blockers
```

## Permissions

**This command is READ-ONLY**:
- ✅ No permission required
- ✅ No state changes
- ✅ Can run anytime
- ✅ Safe for automation

## Related Commands

- `/mr-list` - List all open MRs
- `/mr-review-request <mr> <dev>` - Request code review
- `/mr-assign <mr> <dev>` - Assign MR to developer
- `/mr-approve <mr>` - Approve MR
- `/mr-merge <mr>` - Merge MR (if ready)

## Troubleshooting

**"MR not found"**
- Verify MR number is correct
- Check you have access to the project
- Ensure MR is in `<PROJECT_PATH>` project

**"Permission denied"**
- Your GitLab token needs `api` scope
- Check token in `~/.config/glab-cli/config.yml`

**"Pipeline information unavailable"**
- MR might not have a pipeline yet
- Push might still be in progress
- Check web UI for details

## Notes

- Read-only command, safe to use anytime
- Does not modify MR state
- Shows real-time status (not cached)
- Useful for quick checks without browser
- Can be used in scripts/automation

---

**Created**: 2025-12-27
**Last updated**: 2025-12-27
**Config file**: `.claude/gitlab-config.json`
