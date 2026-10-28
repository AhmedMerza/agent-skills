---
name: mr-merge
description: "Merge GitLab merge request with comprehensive safety checks"
---

# /mr-merge

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Merges a GitLab merge request after performing comprehensive safety checks to ensure code quality and project stability.

**⚠️ Permission Required:** This command will **ALWAYS ask for user confirmation** before merging.

## Usage
```
/mr-merge <mr-number> [options]
```

**Arguments:**
- `<mr-number>` - MR number (e.g., `1598` or `!1598`)

**Options:**
- `--squash` - Squash commits when merging
- `--remove-source-branch` - Delete source branch after merge
- `--skip-ci` - Skip running pipeline after merge
- `--force` - Skip optional safety checks in emergencies; never skip the UI screenshot gate

**Examples:**
```bash
/mr-merge 1598                              # Merge MR !1598 with safety checks
/mr-merge 1598 --squash                     # Squash commits when merging
/mr-merge 1598 --remove-source-branch       # Delete branch after merge
/mr-merge 1598 --squash --remove-source-branch  # Both options
```

## What it does

1. **Fetches MR details** to verify existence and current state
2. **Runs comprehensive safety checks**:
   - ✅ All required approvals received
   - ✅ Pipeline passed
   - ✅ No merge conflicts
   - ✅ All discussions resolved
   - ✅ Not a draft MR
   - ✅ CI jobs passed
   - ✅ For every user-visible UI diff, before and after screenshots of affected screens/states render in the MR description or linked comment; missing or stale images block merge, including with `--force`
3. **Displays pre-merge summary** with all checks
4. **Asks user for permission to merge**
5. **Merges the MR** via GitLab API (if approved)
6. **Confirms merge** and shows result

## Example Output

### Example 1: Safe to merge
```
🔍 Fetching MR !1598...

📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open
   Author: dana.lee
   Source: <FORK_PATH>:feature/add-pickup-details
   Target: <PROJECT_PATH>:dev

🔍 Running pre-merge safety checks...

✅ Safety Checks:
   ✓ All required approvals (2/2)
     - Eng Bob ✓
     - Eng Alice ✓
   ✓ Pipeline passed (#12345)
   ✓ No merge conflicts
   ✓ All discussions resolved (0 unresolved)
   ✓ Not a draft MR
   ✓ CI jobs passed (15/15)

📊 Merge Summary:
   • 3 commits will be merged
   • 5 files changed (+120, -45)
   • Target branch: dev
   • Source branch will be kept (use --remove-source-branch to delete)

⚠️  Merge MR #1598 into dev? (yes/no)
> yes

🚀 Merging MR...
✓ MR #1598 merged successfully!

✅ Merge Complete:
   • Merged into: dev
   • Merge commit: abc123def456

🔄 Post-merge cleanup:
   ✓ Switched to dev
   ✓ Pulled latest from upstream
   ✓ Deleted local branch: feature/add-pickup-details

🔗 View: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
```

### Example 2: Not safe to merge
```
🔍 Fetching MR !1597...

📋 MR #1597: fix(auth): token expiration handling
   Status: Open
   Author: dana.lee

🔍 Running pre-merge safety checks...

❌ Safety Checks Failed:

   ❌ Approvals: 0/2 (need 2 more)
   ❌ Pipeline failed (#12344)
      Failed jobs:
      - test-backend (PHP 8.4)
      - lint-frontend (ESLint)
   ❌ Has merge conflicts
   ⚠️  Unresolved discussions (3)

⛔ Cannot merge - Please fix the following:

1. Get required approvals (0/2)
   → Request reviews: /mr-review-request 1597 alice bob

2. Fix failing pipeline
   → View pipeline: <GITLAB_URL>/<PROJECT_PATH>/-/pipelines/12344
   → Fix failing tests

3. Resolve merge conflicts
   → Rebase or merge target branch
   → git fetch origin dev && git merge origin/dev

4. Resolve discussions
   → Address review comments in GitLab

💡 Fix these issues and try again with /mr-merge 1597
```

### Example 3: User cancels
```
🔍 Fetching MR !1598...

✅ All safety checks passed

⚠️  Merge MR #1598 into dev? (yes/no)
> no

✗ Merge cancelled
```

### Example 4: Draft MR
```
🔍 Fetching MR !1596...

📋 MR #1596 (DRAFT): refactor(orders): validation logic

❌ Cannot merge draft MR

💡 To merge this MR:
1. Mark as ready in GitLab UI
2. Ensure all checks pass
3. Try /mr-merge 1596 again

🔗 View: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1596
```

## Safety Checks

### Required Checks (Cannot be bypassed)

1. **Approvals**:
   - All required approvals must be received
   - Check: `approvals_left == 0`

2. **Pipeline Status**:
   - Latest pipeline must pass
   - Check: `pipeline.status == "success"`

3. **Merge Conflicts**:
   - No conflicts with target branch
   - Check: `has_conflicts == false`

4. **Draft Status**:
   - MR must not be draft/WIP
   - Check: `work_in_progress == false`

5. **Discussions**:
   - All discussions must be resolved
   - Check: `blocking_discussions_resolved == true`

### Optional Checks (Warnings)

1. **CI Jobs**:
   - All CI jobs should pass
   - Warning if any jobs failed but pipeline passed

2. **Source Branch**:
   - Check if branch should be deleted
   - Recommend `--remove-source-branch` for feature branches

3. **Commits**:
   - Check number of commits
   - Recommend `--squash` for many small commits

## Process

1. **Parse arguments**: Extract MR number and options
2. **Fetch MR details**: Get comprehensive MR data
3. **Fetch pipeline status**: Get latest pipeline and jobs
4. **Fetch approvals**: Get approval status
5. **Check conflicts**: Verify no merge conflicts
6. **Check discussions**: Ensure all resolved
7. **Run safety checks**: Verify all conditions met
8. **Display summary**: Show pre-merge status
9. **⚠️ ASK USER PERMISSION**: Display merge preview and await confirmation
10. **Merge MR** (if approved): PUT to `/api/v4/projects/2/merge_requests/{iid}/merge`
11. **Confirm**: Display merge result
12. **Post-merge cleanup** (automatic, no confirmation needed):
    - Switch to target branch: `git checkout dev`
    - Pull latest: `git pull upstream dev`
    - Delete the local source branch: `git branch -d <source_branch>` (only if it exists locally and is not `dev` or `master`)

## GitLab API

**Endpoint**: `PUT /api/v4/projects/{id}/merge_requests/{iid}/merge`

**Parameters**:
```json
{
  "squash": true,
  "should_remove_source_branch": true,
  "merge_when_pipeline_succeeds": false,
  "skip_ci": false
}
```

**Example API call**:
```bash
# Merge MR with squash and branch deletion
glab api --method PUT projects/2/merge_requests/1598/merge \
  -F squash=true \
  -F should_remove_source_branch=true

# Check if MR can be merged
glab api projects/2/merge_requests/1598 | jq '{
  merge_status,
  has_conflicts,
  blocking_discussions_resolved,
  approvals_left: .approvals.approvals_left,
  pipeline: .pipeline.status
}'
```

## Merge Options

### --squash
**What it does**: Combines all commits into a single commit
**When to use**:
- ✅ Many small "WIP" commits
- ✅ Want clean commit history
- ✅ Feature branch with incremental commits

**When NOT to use**:
- ❌ Important to preserve commit history
- ❌ Each commit is meaningful
- ❌ Commits already well-structured

### --remove-source-branch
**What it does**: Deletes the source branch after merge
**When to use**:
- ✅ Feature branch (feature/*)
- ✅ Bug fix branch (fix/*)
- ✅ Branch won't be reused

**When NOT to use**:
- ❌ Long-lived branch (dev, master)
- ❌ Release branch
- ❌ Branch will be reused

### --skip-ci
**What it does**: Skip running CI/CD pipeline after merge
**When to use**:
- ✅ Emergency hotfix
- ✅ Documentation-only changes
- ✅ CI already passed on source

**When NOT to use**:
- ❌ Code changes
- ❌ Not urgent
- ❌ Want to verify merge result

### --force
**What it does**: Skip optional safety checks (NOT RECOMMENDED). The UI screenshot gate still applies.
**When to use**:
- ⚠️ ONLY in emergencies
- ⚠️ You understand the risks
- ⚠️ Have explicit approval

**When NOT to use**:
- ❌ Normal workflow
- ❌ Safety checks failed for a reason
- ❌ Not urgent

## Permissions

**Requires user permission because**:
- Merges code into target branch
- Affects production code
- Irreversible action (can revert, but causes issues)

**Per GITLAB_PERMISSIONS.md**:
- `merge:mr` is in `requiresPermission` list
- Must ask before merging

## Related Commands

- `/mr-status <mr>` - Check MR status before merging
- `/mr-approve <mr>` - Approve MR before merging
- `/mr-list` - List MRs ready to merge
- View `.claude/core/GITLAB_PERMISSIONS.md` for permission rules

## Troubleshooting

**"Cannot merge"**
- Check safety checks output
- Fix all blocking issues
- Run `/mr-status 1598` for details

**"Approvals not met"**
- Get required approvals first
- Use `/mr-review-request 1598 alice bob`

**"Pipeline failed"**
- Fix failing tests
- View pipeline in browser
- Ensure all jobs pass

**"Merge conflicts"**
- Rebase or merge target branch
- Resolve conflicts locally
- Push updated branch

**"Discussions not resolved"**
- Address review comments
- Resolve threads in GitLab UI
- Get reviewer confirmation

## Best Practices

**Before merging**:
1. ✅ Run `/mr-status 1598` to check readiness
2. ✅ Ensure all safety checks pass
3. ✅ Verify approvals from appropriate reviewers
4. ✅ Check pipeline passed
5. ✅ Resolve all discussions

**After merging**:
1. ✅ Verify merge was successful
2. ✅ Delete source branch (if feature branch)
3. ✅ Monitor production for issues
4. ✅ Close related issues

**Workflow**:
```bash
# 1. Check if ready to merge
/mr-status 1598

# 2. If approvals needed
/mr-review-request 1598 alice bob

# 3. When approved, merge
/mr-merge 1598 --squash --remove-source-branch
```

## Notes

- Merging requires all safety checks to pass
- Cannot merge draft MRs
- Cannot merge with conflicts
- Cannot merge without approvals
- Use `--force` only in emergencies (NOT RECOMMENDED)
- Merged MRs can be reverted if needed

---

**Created**: 2025-12-27
**Last updated**: 2025-12-27
**Config file**: `.claude/gitlab-config.json`
