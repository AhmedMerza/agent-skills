---
name: claim
description: "Check whether a tracker issue is already taken, then claim, release, or hand it to review"
---

# /claim

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the issue target; otherwise operate on `origin`.
3. **Your own identity** — `glab api user | jq -r '{id, username}'`. Never hardcode a user id.
4. **Label names** — read them from the project, never assume. `glab api "projects/<id>/labels?per_page=100" | jq -r '.[].name'`. The in-flight and in-review labels vary per project (commonly `In Progress` / `Under Review`, but also `doing`, `WIP`, `ready for review`). Match case-insensitively; if no suitable label exists, say so and proceed with the assignee change alone rather than inventing a label.

> All IDs and label names in the examples below are **illustrative placeholders** — resolve real values per the steps above.

Answers one question before you write any code: **is somebody already on this?** Then takes ownership so the rest of the team can see it's yours — or hands it back when you drop it.

**Permission Required:** This command **ALWAYS asks for confirmation** before changing an issue. It never silently assigns, unassigns, or relabels.

**It never takes an issue from another person.** If someone else holds it, it reports and stops.

## Usage

```
/claim <issue-number>            # check, then take it
/claim                           # infer the issue from the branch name
/claim --release <issue-number>  # hand it back: unassign, drop the in-flight label, reopen
/claim --review <issue-number>   # moving to review: swap in-flight label for in-review
/claim --check <issue-number>    # report only, change nothing
```

**Inferring the issue:** when no number is given, look for one in the current branch name (`123-fix-thing`, `feature/123`, `issue-123`) and then in the most recent commit message (`#123`, `closes #123`). If nothing is found, ask rather than guessing.

## When this runs

**At the start of implementation — not planning.** Reading code, exploring, scoping, and writing a plan are all free; nobody needs to own an issue to think about it. The moment work becomes real — the first edit, the branch, the first commit — is when ownership matters, because that is when two people can collide.

**And when you walk away.** If work stops and isn't going to resume — you changed your mind, it got deprioritised, it turned out to be someone else's area — the issue should go back to the pool. An issue assigned to someone who isn't working on it is worse than an unassigned one: it actively tells the team not to pick it up.

## Process

### Phase 1: Read the current state

Fetch the issue and everything that signals ownership:

```bash
glab api "projects/<id>/issues/<n>" | jq '{
  iid, state, title,
  assignees: [.assignees[].username],
  labels,
  updated_at
}'
```

Then check for work already in flight that the labels would miss — someone can be mid-branch without ever touching the issue:

```bash
# MRs that reference this issue
glab api "projects/<id>/issues/<n>/related_merge_requests" \
  | jq -r '.[] | "!\(.iid) [\(.state)] \(.author.username): \(.title)"'

# and open MRs whose source branch names the issue
glab api "projects/<id>/merge_requests?state=opened&per_page=100" \
  | jq -r --arg n "<n>" '.[] | select(.source_branch | test("(^|[^0-9])" + $n + "([^0-9]|$)"))
      | "!\(.iid) \(.author.username): \(.source_branch)"'
```

### Phase 2: Decide, and report honestly

Work through these in order and stop at the first that matches:

1. **Issue is closed** → say so. Ask whether they want it reopened before claiming, or whether they meant a different issue.
2. **Assigned to someone else** → **stop.** Report who holds it, when it was last touched, and any open MR. Do not offer to reassign it as the default; offer to leave it alone, or to add a comment asking that person about status. Taking a colleague's issue is a conversation, not a command.
3. **Unassigned but an open MR exists from another author** → **stop.** The label is stale; someone is demonstrably working on it. Report the MR and who owns it.
4. **Already assigned to you** → nothing to do. Confirm it, and if the in-flight label is missing, offer to add just that.
5. **Free** → proceed to Phase 3.

Never present a taken issue as claimable. The point of this command is to prevent a collision, so a false "all clear" is the one failure that matters.

### Phase 3: Ask, then act

Show what will change and ask for confirmation:

```
Issue #134 — fix(sheets): RSheetShell's grabber is decorative…
  state:     opened
  assignee:  none
  labels:    bug, confirmed
  open MRs:  none

Claim it? Will assign to <your-username> and add "In Progress". (yes/no)
```

On yes:

```bash
glab api --method PUT "projects/<id>/issues/<n>" \
  -f "assignee_ids[]=<your-id>" \
  -f "add_labels=In Progress"
```

Confirm with the issue URL and the resulting assignee/labels.

### `--release`

For when work stops and won't resume. Reverses a claim so the issue reads as genuinely available:

```bash
glab api --method PUT "projects/<id>/issues/<n>" \
  -f "assignee_ids=" \
  -f "remove_labels=In Progress" \
  -f "state_event=reopen"          # only if it was closed
```

`assignee_ids=` (empty) is what clears assignees; `assignee_ids[]=0` also works on older instances.

Ask first, and ask whether to leave a comment saying why it was dropped and how far it got — the next person inherits that context, and without it they redo the exploration. Keep the comment factual: what was tried, what was learned, what's left.

### `--review`

When the MR opens and the work leaves your hands:

```bash
glab api --method PUT "projects/<id>/issues/<n>" \
  -f "remove_labels=In Progress" \
  -f "add_labels=Under Review"
```

Keep the assignee — it's still yours until it merges. If the project has no in-review label, leave the in-flight one and say so.

### `--check`

Phase 1 and 2 only. Reports and changes nothing. Use it to survey several issues before deciding what to pick up.

## Options

- `--release <n>` — unassign, drop the in-flight label, reopen if closed
- `--review <n>` — swap the in-flight label for the in-review one, keep the assignee
- `--check <n>` — report only, change nothing
- `--comment "<text>"` — add a note alongside the change (pairs naturally with `--release`)
- `--force` — claim even though someone else holds it. **Requires the user to say so explicitly**; never reach for this on your own, and confirm again before acting

## Notes

- Issues live in the **upstream** project when the repo is a fork — the same resolution `/issue` uses.
- The command never creates labels. If the project lacks an in-flight label, it reports that and changes only the assignee.
- Assignee is the ownership signal; the label is what makes it visible on a board. Set both when both exist, because different people read different views.
- A stale claim is a real cost, not a tidiness issue: it tells the team the work is covered when it isn't. Prefer releasing early over holding an issue "just in case".

## Related Commands

- `/issue` — create a new issue
- `/mr-create` — open the MR (pair with `/claim --review`)
- `/mr-status` — where an MR stands
- `/mr-assign` — assignee on a **merge request**, not an issue
