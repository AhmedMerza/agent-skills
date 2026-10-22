---
disable-model-invocation: true
name: mr-list
description: "List GitLab merge requests with status overview. Run only when the user explicitly asks for it."
---

# /mr-list

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Lists GitLab merge requests with comprehensive status overview for quick triage and prioritization.

**⚠️ Permission**: Read-only command, **NO permission required**

## Usage
```
/mr-list [filter] [author]
```

**Arguments:**
- `[filter]` - Optional: Filter MRs (open, merged, closed, all, mine, draft)
- `[author]` - Optional: Filter by author username or shortcut

**Examples:**
```bash
/mr-list                 # Show all open MRs
/mr-list open            # Show open MRs (default)
/mr-list merged          # Show recently merged MRs
/mr-list closed          # Show closed MRs
/mr-list all             # Show all MRs
/mr-list mine            # Show my MRs only
/mr-list draft           # Show draft MRs
/mr-list alice           # Show MRs by alice
/mr-list open dana      # Show open MRs by dana
```

## What it shows

**For each MR**:
- MR number (clickable link)
- Title (with draft indicator)
- Author
- Assignee
- Reviewers (with approval status)
- Pipeline status
- Approvals count
- Conflicts indicator
- Created/updated time

**Summary**:
- Total count by status
- Action required count
- Ready to merge count

## Example Output

### Example 1: List all open MRs
```
📋 Open Merge Requests (5)

!1598  feat(shipments): add pickup details
       👤 dana.lee → alice  |  👥 alice ✓, bob ✓
       ✓ Passed  |  ✅ 2/2  |  📅 2 hours ago

!1597  fix(auth): token expiration handling
       👤 dana.lee → None  |  👥 bob (pending)
       ❌ Failed  |  ⚠️ 0/2  |  📅 5 hours ago  |  ⚠️ Has conflicts

!1596  refactor(orders): validation logic (DRAFT)
       👤 dana.lee → carol  |  👥 None
       ⏳ Running  |  🚧 Draft  |  📅 1 day ago

!1595  feat(payments): add refund support
       👤 alice → bob  |  👥 bob ✓, dana ✓
       ✓ Passed  |  ✅ 2/2  |  📅 3 days ago  |  ✅ Ready to merge

!1594  fix(shipping): carrier integration bug
       👤 bob → alice  |  👥 alice (pending)
       ⏳ Pending  |  ⚠️ 0/2  |  📅 1 week ago

─────────────────────────────────────────────────
Summary:
  Total: 5  |  Ready: 1  |  Action Required: 2
  ✓ Passed: 2  |  ❌ Failed: 1  |  ⏳ Pending: 2
```

### Example 2: List my MRs only
```
📋 My Merge Requests (3)

!1598  feat(shipments): add pickup details
       ✓ Passed  |  ✅ 2/2  |  Ready to merge ✅

!1597  fix(auth): token expiration handling
       ❌ Failed  |  ⚠️ 0/2  |  Action required ⚠️
       → Fix failing tests, resolve conflicts

!1596  refactor(orders): validation logic (DRAFT)
       ⏳ Running  |  🚧 Work in progress

─────────────────────────────────────────────────
Summary:
  Total: 3  |  Ready: 1  |  Needs Attention: 1
```

### Example 3: List draft MRs
```
📋 Draft Merge Requests (2)

!1596  refactor(orders): validation logic
       👤 dana.lee → carol
       ⏳ Running  |  🚧 Draft  |  📅 1 day ago

!1593  feat(analytics): dashboard improvements
       👤 carol → dana
       ✓ Passed  |  🚧 Draft  |  📅 4 days ago

─────────────────────────────────────────────────
Summary: 2 draft MRs
```

### Example 4: Recently merged MRs
```
📋 Recently Merged (10 from last 7 days)

!1590  feat(orders): bulk export functionality
       👤 dana.lee  |  Merged by: alice  |  ✓ Passed
       Merged: 2 hours ago into dev

!1589  fix(api): rate limiting bypass
       👤 bob  |  Merged by: dana  |  ✓ Passed
       Merged: 1 day ago into dev

!1588  refactor(services): payment service cleanup
       👤 alice  |  Merged by: bob  |  ✓ Passed
       Merged: 2 days ago into dev

─────────────────────────────────────────────────
Summary: 10 merged in last 7 days
```

## Process

1. **Parse arguments**: Extract filter and author
2. **Resolve shortcuts**: Convert developer shortcuts to usernames
3. **Fetch MRs**: Query GitLab API with filters
4. **Fetch status**: Get pipeline, approvals, conflicts for each MR
5. **Sort MRs**: By status, priority, and update time
6. **Format output**: Display with status indicators
7. **Show summary**: Total count, ready to merge, action required

## GitLab API

**Endpoints Used**:
```bash
# List MRs
glab api "projects/2/merge_requests?state=opened"

# List by author
glab api "projects/<PROJECT_ID>/merge_requests?state=opened&author_username=<username>"

# List merged MRs (last 7 days)
glab api "projects/2/merge_requests?state=merged&updated_after=2025-12-20"

# List draft MRs
glab api "projects/2/merge_requests?state=opened&wip=yes"
```

**Example API Call**:
```bash
# Get open MRs with pipeline status
glab api "projects/2/merge_requests?state=opened" | jq '.[] | {
  iid,
  title,
  author: .author.username,
  assignee: .assignee.username,
  reviewers: [.reviewers[].username],
  pipeline: .pipeline.status,
  has_conflicts,
  work_in_progress,
  updated_at
}'
```

## Filters

| Filter | Description | API Parameter |
|--------|-------------|---------------|
| `open` | Open MRs (default) | `state=opened` |
| `merged` | Recently merged MRs | `state=merged` |
| `closed` | Closed MRs | `state=closed` |
| `all` | All MRs | `state=all` |
| `mine` | My MRs only | `author_username={current_user}` |
| `draft` | Draft/WIP MRs | `state=opened&wip=yes` |

## Sorting Priority

MRs are sorted by priority:
1. **Action Required** (failed pipeline, conflicts, needs approvals)
2. **Ready to Merge** (all approvals, pipeline passed, no conflicts)
3. **In Progress** (pipeline running, draft)
4. **Recently Updated** (most recent first)

## Status Icons

| Icon | Meaning |
|------|---------|
| ✓ | Pipeline passed / Approved |
| ❌ | Pipeline failed / Has conflicts |
| ⏳ | Pipeline running / Pending |
| ⚠️ | Action required / Needs attention |
| ✅ | Ready to merge |
| 🚧 | Draft / Work in progress |
| 📋 | List indicator |
| 👤 | Author → Assignee |
| 👥 | Reviewers |
| 📅 | Time |

## Use Cases

**Daily standup**:
```bash
/mr-list mine
# Quick overview of your MRs:
# - What's ready to merge
# - What needs attention
# - What's in progress
```

**Team triage**:
```bash
/mr-list
# See all team MRs:
# - Which are blocked
# - Which need reviews
# - Which are ready to merge
```

**Check specific developer**:
```bash
/mr-list alice
# See alice's MRs:
# - What he's working on
# - What needs your review
# - What's ready
```

**Pre-merge check**:
```bash
/mr-list mine
# Before creating new MR:
# - Merge ready MRs first
# - Clean up old MRs
# - Reduce WIP
```

## Compact vs Detailed Modes

**Compact (default)**: One line per MR with key status
**Detailed (`--detailed`)**: Full status including description, labels, milestones

```bash
/mr-list --detailed           # Detailed view
/mr-list --compact            # Compact view (default)
```

## Permissions

**This command is READ-ONLY**:
- ✅ No permission required
- ✅ No state changes
- ✅ Can run anytime
- ✅ Safe for automation

## Related Commands

- `/mr-status <mr>` - Detailed status for specific MR
- `/mr-review-request <mr> <dev>` - Request code review
- `/mr-assign <mr> <dev>` - Assign MR to developer
- `/mr-approve <mr>` - Approve MR
- `/mr-merge <mr>` - Merge MR (if ready)

## Troubleshooting

**"No MRs found"**
- Check filter is correct
- Try `/mr-list all` to see all MRs
- Verify you have access to the project

**"Permission denied"**
- Your GitLab token needs `api` scope
- Check token in `~/.config/glab-cli/config.yml`

**"Too many results"**
- Use filters to narrow down: `/mr-list mine`
- Filter by author: `/mr-list alice`
- Filter by state: `/mr-list merged`

## Notes

- Read-only command, safe to use anytime
- Shows real-time status (not cached)
- Limited to 20 most recent MRs by default
- Use `--all` flag to show all MRs (may be slow)
- Useful for daily workflow and triage

---

**Created**: 2025-12-27
**Last updated**: 2025-12-27
**Config file**: `.claude/gitlab-config.json`
