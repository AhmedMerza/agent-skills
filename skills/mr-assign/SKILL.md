---
disable-model-invocation: true
name: mr-assign
description: "Assign GitLab merge request to developer using shortcuts. Run only when the user explicitly asks for it."
---

# /mr-assign

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Assigns a GitLab merge request to a developer using shortcut names or GitLab usernames.

**⚠️ Important:** This command sets the **ASSIGNEE** (person responsible for taking action), NOT the reviewer. For code review requests, use `/mr-review-request` instead.

**⚠️ Permission Required:** This command will **ask for user confirmation** before assigning the MR.

## Assignee vs Reviewer - Quick Guide

**Use `/mr-assign` when:**
- ✅ Someone needs to take ownership of the MR
- ✅ Someone needs to merge the MR
- ✅ Someone needs to fix issues before merging
- ✅ Transferring responsibility to another developer

**Use `/mr-review-request` when:**
- ✅ Someone should review and approve the code
- ✅ You need feedback on your implementation
- ✅ Requesting code review from team members

**Example Workflow:**
```bash
# 1. Create MR and request reviews from team
/mr-create alice bob

# 2. If alice needs to merge it, assign to him
/mr-assign 1598 alice

# 3. If more reviews needed later
/mr-review-request 1598 carol
```

## Usage
```
/mr-assign <mr-number> <developer>
```

**Arguments:**
- `<mr-number>` - MR number (e.g., `1598` or `!1598`)
- `<developer>` - Developer shortcut or GitLab username

**Developer Shortcuts:** resolved from the optional `.claude/gitlab-config.json` → `developers` map in the current repo. If no config file exists, pass a real GitLab username directly. Resolve a username to an id with `glab api "users?username=<name>" | jq '.[0].id'`.

**Examples:**
```bash
/mr-assign 1598 alice        # Assign MR !1598 to alice
/mr-assign !1598 bob       # Assign MR !1598 to bob
/mr-assign 1598 carol      # Assign MR !1598 to carol
/mr-assign 1598 dana        # Assign MR !1598 to dana.lee
```

## What it does
1. Resolves developer shortcut to GitLab username
2. Fetches MR details to verify it exists
3. **Asks user for permission to assign**
4. Assigns MR to developer via GitLab API
5. Confirms assignment

## Process
1. **Parse arguments**: Extract MR number and developer shortcut
2. **Resolve developer**: Look up GitLab username from shortcut
3. **Fetch MR**: Verify MR exists and get current state
4. **⚠️ ASK USER PERMISSION**: Display assignment preview and await confirmation
5. **Assign MR** (if approved): PUT to `/api/v4/projects/2/merge_requests/{iid}`
6. **Confirm**: Display updated MR assignee

## Example Output

### Example 1: Assign using shortcut
```
🔍 Fetching MR !1598...
📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open
   Author: dana.lee
   Current assignee: None

👤 Resolving developer shortcut: alice → alice

⚠️  Assign MR !1598 to alice? (yes/no)
> yes

✓ Assigning MR...
✓ MR !1598 assigned to alice

🔗 MR URL: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
```

### Example 2: Re-assign to different developer
```
🔍 Fetching MR !1598...
📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open
   Author: dana.lee
   Current assignee: alice

👤 Resolving developer shortcut: bob → bob

⚠️  Change assignee from alice to bob? (yes/no)
> yes

✓ Assigning MR...
✓ MR !1598 reassigned to bob
```

### Example 3: User cancels
```
🔍 Fetching MR !1598...
📋 MR #1598: feat(shipments): add pickup details to API responses

⚠️  Assign MR !1598 to carol? (yes/no)
> no

✗ Assignment cancelled
```

## Developer Management

### Available Developers
Developers are defined in `.claude/gitlab-config.json`:

```json
{
  "developers": {
    "alice": {
      "username": "alice",
      "name": "Alice"
    },
    "bob": {
      "username": "bob",
      "name": "Bob"
    },
    "carol": {
      "username": "carol",
      "name": "Carol"
    },
    "dana": {
      "username": "dana.lee",
      "name": "Dana Lee"
    }
  }
}
```

### Adding New Developers
To add a new developer:

1. Edit `.claude/gitlab-config.json`
2. Add entry to `developers` section:
   ```json
   "shortcut_name": {
     "shortcut": "shortcut_name",
     "username": "gitlab_username",
     "name": "Full Name",
     "gitlab_user_id": null,
     "email": null
   }
   ```
3. Save file
4. Use shortcut in `/mr-assign` or `/mr-create`

### Finding GitLab Usernames
```bash
# Search for a user
glab api users?search=name | jq -r '.[] | {username, name}'

# Get specific user details
glab api users/username | jq -r '{id, username, name, email}'
```

## GitLab API

**Endpoint:** `PUT /api/v4/projects/{id}/merge_requests/{iid}`

**Parameters:**
```json
{
  "assignee_ids": [user_id]
}
```

**Example API call:**
```bash
# Get user ID
glab api users?username=alice | jq -r '.[0].id'

# Assign MR
glab api --method PUT projects/2/merge_requests/1598 \
  -F assignee_ids[]=<user_id>
```

## Multiple Assignees

To assign multiple developers:
```bash
/mr-assign 1598 alice bob
```

This will assign both alice and bob to the MR.

## Permissions

**Requires user permission because:**
- Changes MR state
- Affects who receives notifications
- May trigger workflows

**Per GITLAB_PERMISSIONS.md:**
- `assign:mr` is in `requiresPermission` list
- Must ask before making assignment

## Troubleshooting

**"Developer not found"**
- Check spelling of shortcut
- Verify developer exists in `.claude/gitlab-config.json`
- Use exact GitLab username if shortcut not defined

**"MR not found"**
- Verify MR number is correct
- Check you have access to the project
- Ensure MR is in `<PROJECT_PATH>` project

**"Permission denied"**
- Your GitLab token needs `api` scope
- You must have Developer role or higher
- Check token in `~/.config/glab-cli/config.yml`

**"User does not have access to project"**
- Developer must be a member of `<PROJECT_PATH>` project
- Ask project maintainer to add them
- Verify username is correct

## Related Commands

- `/mr-create [dev]` - Create MR and assign in one command
- `/mr-create --assignee <dev>` - Create MR with assignee
- View `.claude/core/GITLAB_PERMISSIONS.md` for permission rules

## Notes

- Assigning clears previous assignee (use multiple names for multiple assignees)
- Assignee receives email notification
- Can assign yourself using `dana` shortcut
- Works with both open and draft MRs

---

**Created:** 2025-12-27
**Last updated:** 2025-12-27
**Config file:** `.claude/gitlab-config.json`
