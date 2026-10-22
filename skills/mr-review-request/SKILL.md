---
disable-model-invocation: true
name: mr-review-request
description: "Request code review from developers on existing GitLab merge request. Run only when the user explicitly asks for it."
---

# /mr-review-request

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Requests code review from one or more developers on an existing GitLab merge request.

**⚠️ Permission Required:** This command will **ask for user confirmation** before requesting reviews.

## Usage
```
/mr-review-request <mr-number> <developer> [developer2] [developer3]...
```

**Arguments:**
- `<mr-number>` - MR number (e.g., `1598` or `!1598`)
- `<developer>` - Developer shortcut or GitLab username (can specify multiple)

**Developer Shortcuts:** resolved from the optional `.claude/gitlab-config.json` → `developers` map in the current repo. If no config file exists, pass a real GitLab username directly. Resolve a username to an id with `glab api "users?username=<name>" | jq '.[0].id'`.

**Examples:**
```bash
/mr-review-request 1598 alice           # Request review from alice
/mr-review-request !1598 bob          # Request review from bob
/mr-review-request 1598 alice bob     # Request review from both
/mr-review-request 1598 alice bob carol   # Request from all three
```

## What it does
1. Resolves developer shortcuts to GitLab user IDs
2. Fetches MR details to verify it exists
3. **Asks user for permission to request reviews**
4. Adds reviewers to MR via GitLab API
5. Confirms review requests sent

## Process
1. **Parse arguments**: Extract MR number and developer shortcuts
2. **Resolve developers**: Look up GitLab user IDs from shortcuts in `.claude/gitlab-config.json`
3. **Fetch MR**: Verify MR exists and get current reviewers
4. **⚠️ ASK USER PERMISSION**: Display review request preview and await confirmation
5. **Add reviewers** (if approved): PUT to `projects/:id/merge_requests/{iid}` with the **existing reviewer ids from step 3 plus the new ones** — the PUT replaces the list, so sending only the new ids silently removes current reviewers
6. **Confirm**: Display updated reviewers list

## Example Output

### Example 1: Request single reviewer
```
🔍 Fetching MR !1598...
📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open
   Author: dana.lee
   Current reviewers: None

👤 Resolving developer shortcut: alice → alice (User ID: 7)

⚠️  Request review from alice on MR !1598? (yes/no)
> yes

✓ Requesting review...
✓ Review requested from alice

🔗 MR URL: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
👥 Reviewers: alice
```

### Example 2: Request multiple reviewers
```
🔍 Fetching MR !1598...
📋 MR #1598: feat(shipments): add pickup details to API responses
   Status: Open
   Author: dana.lee
   Current reviewers: alice

👥 Resolving developer shortcuts:
   - alice → alice (User ID: 7) [already reviewing]
   - bob → bob (User ID: 8)
   - carol → carol (User ID: 9)

⚠️  Request review from bob, carol on MR !1598?
    (alice is already a reviewer)
    (yes/no)
> yes

✓ Requesting reviews...
✓ Reviews requested from: bob, carol

🔗 MR URL: <GITLAB_URL>/<PROJECT_PATH>/-/merge_requests/1598
👥 Reviewers: alice, bob, carol
```

### Example 3: User cancels
```
🔍 Fetching MR !1598...
📋 MR #1598: feat(shipments): add pickup details to API responses

👥 Resolving: alice, bob

⚠️  Request review from alice, bob on MR !1598? (yes/no)
> no

✗ Review request cancelled
```

## Reviewer vs Assignee

**Reviewer** (this command):
- ✅ Should review and approve the code
- ✅ Gives feedback and suggestions
- ✅ Can be multiple people
- ✅ Not responsible for merging (author merges)

**Assignee** (`/mr-assign`):
- ✅ Responsible for taking action
- ✅ Usually person who will merge
- ✅ Or person who needs to fix issues
- ✅ Single person (or small team)

**When to use:**
- Use `/mr-review-request` when you want **code review**
- Use `/mr-assign` when you want someone to **take ownership/merge**

## GitLab API

**Endpoint:** `PUT /api/v4/projects/{id}/merge_requests/{iid}`

**Parameters:**
```json
{
  "reviewer_ids": [7, 8, 9]
}
```

**Example API call:**
```bash
# Get user IDs
glab api "users?username=alice" | jq -r '.[0].id'   # Returns: 7
glab api "users?username=bob" | jq -r '.[0].id'   # Returns: 8

# Request reviews (single reviewer)
glab api --method PUT projects/:id/merge_requests/1598 \
  -f reviewer_ids=7

# Request reviews (multiple reviewers)
glab api --method PUT projects/:id/merge_requests/1598 \
  -f "reviewer_ids=[7,8,9]"
```

**⚠️ Important:**
- ✅ Use `-f` flag (lowercase) for field data
- ✅ Single reviewer: `reviewer_ids=7` (no brackets)
- ✅ Multiple reviewers: `reviewer_ids=[7,8,9]` (JSON array format)
- ✅ Replaces existing reviewers (doesn't append) — always include the current ids
- ✅ Outside the repo you are in, prefix with `GITLAB_REPO=<namespace/repo>` — `:id` otherwise resolves to the current directory's project
- ❌ Don't use `-F` (uppercase) - causes encoding issues
- ❌ Don't use `reviewer_ids[]=7` syntax - doesn't work with glab api
- ❌ Don't use `reviewer_id` (singular) - it won't work

## Developer Management

### Available Developers
Developers are defined in `.claude/gitlab-config.json`:

```json
{
  "developers": {
    "alice": {
      "username": "alice",
      "gitlab_user_id": 7
    },
    "bob": {
      "username": "bob",
      "gitlab_user_id": 8
    },
    "carol": {
      "username": "carol",
      "gitlab_user_id": 9
    }
  }
}
```

### Finding GitLab User IDs
```bash
# Search for a user
glab api "users?search=name" | jq -r '.[] | {id, username, name}'

# Get specific user ID
glab api "users?username=alice" | jq -r '.[0].id'
```

## Permissions

**Requires user permission because:**
- Sends notifications to reviewers
- Changes MR state
- Affects team workflow

**Why ask first:**
- Requesting reviews requires approval
- Adding reviewers triggers notifications

## Notifications

**What happens when you request review:**
1. ✅ Reviewer receives email notification
2. ✅ Reviewer sees MR in their "Review requests" list
3. ✅ MR shows "Review requested" status
4. ✅ Reviewer can approve, comment, or request changes

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
- Reviewer must be a member of `<PROJECT_PATH>` project
- Ask project maintainer to add them
- Verify username is correct

**"No reviewers added"**
- Check that user IDs are valid
- Verify the `-f "reviewer_ids=[<id>,…]"` format (not `-F`, not `reviewer_ids[]`)
- Try using user ID directly instead of username

## Related Commands

- `/mr-create --reviewer <dev>` - Create MR with reviewer
- `/mr-assign <mr> <dev>` - Assign MR to developer

## Best Practices

**Request reviews from:**
- ✅ Code owners for the affected files
- ✅ Team lead or senior developers
- ✅ Subject matter experts
- ✅ At least 2 people for important changes

**Don't request reviews from:**
- ❌ People unfamiliar with the code
- ❌ Too many people (max 2-3)
- ❌ The MR author (yourself)

**Workflow:**
1. Push your changes
2. Create MR with `/mr-create`
3. Request reviews with `/mr-review-request 1598 alice bob`
4. Address feedback
5. Get approvals
6. Merge

---

**Created:** 2025-12-27
**Last updated:** 2025-12-27
**Config file:** `.claude/gitlab-config.json`
