---
disable-model-invocation: true
name: mr-approve
description: "Approve GitLab merge request. Run only when the user explicitly asks for it."
---

# /mr-approve

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Approves a GitLab merge request, indicating you've reviewed the code and it meets quality standards.

**⚠️ Permission Required:** This command will **ask for user confirmation** before approving the MR.

## Usage
```
/mr-approve <mr-number>
```

**Arguments:**
- `<mr-number>` - MR number (e.g., `1598` or `!1598`)

**Examples:**
```bash
/mr-approve 1598          # Approve MR !1598
/mr-approve !1598         # Approve MR !1598
```

## What it does

1. Fetches MR details to verify existence and current state
2. Checks if you've already approved
3. **Asks user for permission to approve**
4. Approves the MR via GitLab API
5. Confirms approval
6. Shows updated approval status

## Example Output

### Example 1: First approval
```
🔍 Fetching MR !1598...

📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open
   Author: dana.lee
   Source: <FORK_PATH>:feature/add-pickup-details → <PROJECT_PATH>:dev

👥 Current Approvals: 1/2
   ✓ Eng Bob

⚠️  Approve MR #1598? (yes/no)
> yes

✅ Approving MR...
✓ MR #1598 approved successfully!

👥 Updated Approvals: 2/2 ✅
   ✓ Eng Bob
   ✓ Dana Lee (You)

✅ All required approvals received - Ready to merge!

🔗 MR URL: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
```

### Example 2: Already approved
```
🔍 Fetching MR !1598...

📋 MR #1598: feat(shipments): add pickup details to API responses

ℹ️  You have already approved this MR.

👥 Current Approvals: 2/2 ✅
   ✓ Eng Bob
   ✓ Dana Lee (You)

✅ All required approvals received - Ready to merge!

💡 Next steps:
   • Merge MR: /mr-merge 1598
   • View MR: /mr-status 1598

🔗 MR URL: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
```

### Example 3: User cancels
```
🔍 Fetching MR !1598...

📋 MR #1598: feat(shipments): add pickup details to API responses

⚠️  Approve MR #1598? (yes/no)
> no

✗ Approval cancelled
```

### Example 4: Cannot approve own MR
```
🔍 Fetching MR !1598...

📋 MR #1598: feat(shipments): add pickup details to API responses
   Author: dana.lee

❌ Cannot approve your own merge request.

💡 Request reviews instead:
   /mr-review-request 1598 alice bob
```

## Process

1. **Parse MR number**: Extract MR number from argument
2. **Fetch MR details**: Verify MR exists and get current state
3. **Check author**: Prevent self-approval
4. **Check existing approval**: See if user already approved
5. **⚠️ ASK USER PERMISSION**: Display approval preview and await confirmation
6. **Approve MR** (if approved): POST to `/api/v4/projects/2/merge_requests/{iid}/approve`
7. **Fetch updated approvals**: Get new approval count
8. **Confirm**: Display updated approval status

## GitLab API

**Endpoint**: `POST /api/v4/projects/{id}/merge_requests/{iid}/approve`

**Example API call**:
```bash
# Approve MR
glab api --method POST projects/2/merge_requests/1598/approve

# Check approval status
glab api projects/2/merge_requests/1598/approvals | jq '{
  approvals_required,
  approvals_left,
  approved_by: [.approved_by[].user.username]
}'

# Unapprove MR (if needed)
glab api --method POST projects/2/merge_requests/1598/unapprove
```

## Approval Rules

**Can approve when**:
- ✅ You are listed as a reviewer
- ✅ You have Developer role or higher
- ✅ You are not the MR author
- ✅ MR is open (not merged or closed)

**Cannot approve when**:
- ❌ You are the MR author (self-approval not allowed)
- ❌ MR is already merged or closed
- ❌ You don't have permission

**Approval workflow**:
1. MR created by author
2. Reviewers assigned
3. Reviewers approve after review
4. When required approvals met → can merge
5. Author or assignee merges

## Permissions

**Requires user permission because**:
- Changes MR state (adds approval)
- Affects merge readiness
- Indicates code review completion

**Per GITLAB_PERMISSIONS.md**:
- `approve:mr` is in `requiresPermission` list
- Must ask before approving

## Related Commands

- `/mr-status <mr>` - Check MR status before approving
- `/mr-review-request <mr> <dev>` - Request additional reviews
- `/mr-merge <mr>` - Merge MR (after approvals)
- `/mr-list` - List MRs needing approval
- View `.claude/core/GITLAB_PERMISSIONS.md` for permission rules

## Approval Status Indicators

| Status | Meaning |
|--------|---------|
| ✅ 2/2 | All required approvals received |
| ⚠️ 1/2 | Partially approved, more needed |
| ⚠️ 0/2 | No approvals yet |
| ✓ | Specific user approved |

## Best Practices

**Before approving**:
- ✅ Review the code changes thoroughly
- ✅ Check pipeline status (should pass)
- ✅ Verify no merge conflicts
- ✅ Ensure coding standards are met
- ✅ Test functionality if needed

**Don't approve if**:
- ❌ You haven't reviewed the code
- ❌ Pipeline is failing
- ❌ There are merge conflicts
- ❌ Code doesn't meet standards
- ❌ You have concerns or questions

**Workflow**:
```bash
# 1. Check MR status
/mr-status 1598

# 2. Review code changes (in IDE or browser)
# 3. If satisfied, approve
/mr-approve 1598

# 4. If all approvals received, merge
/mr-merge 1598
```

## Troubleshooting

**"MR not found"**
- Verify MR number is correct
- Check you have access to the project
- Ensure MR is in `<PROJECT_PATH>` project

**"Permission denied"**
- Your GitLab token needs `api` scope
- You must have Developer role or higher
- Check token in `~/.config/glab-cli/config.yml`

**"Cannot approve"**
- You might be the MR author (self-approval not allowed)
- MR might be closed or merged
- Check MR status with `/mr-status 1598`

**"Already approved"**
- You've already approved this MR
- Check approval status with `/mr-status 1598`
- No action needed if all approvals met

## Notes

- Approving indicates you've reviewed and code meets standards
- Different from just commenting "LGTM"
- Approvals are tracked and required for merge
- Can unapprove if you change your mind (use GitLab UI)
- Cannot approve your own MRs

---

**Created**: 2025-12-27
**Last updated**: 2025-12-27
**Config file**: `.claude/gitlab-config.json`
