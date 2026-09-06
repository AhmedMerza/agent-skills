---
name: mr-guide
version: 1.0.0
description: Generate a reviewer's guide for an MR/PR or branch — what changed in product terms, before/after, data model, UI states — not a code review
---

# /mr-guide

Writes the document a reviewer wants **before** they open the diff: what this change does,
what it looked like before and after, what moved in the data model, which UI states exist now.

**This is not a code review.** It finds no bugs and makes no judgements about quality.
Use `/mr-review` (findings), `/nitpick` (strict), or `/ship-check` (pre-merge gate) for that.

**Publishes by default.** The guide is written to the MR as soon as it is generated — that is
the point of it. Use `--no-publish` (alias `--dry-run`) to print to the terminal and touch nothing.

One exception, which is not overridable by the default: if you are **not** the MR author, the guide
posts a comment on someone else's MR under your name. That always confirms first.

## Provider resolution (GitHub or GitLab)

Same rules as `/mr-create`:

1. **Detect the provider** from `git remote get-url origin` — host `github.com` → **GitHub** (`gh`, "PR");
   any other host (self-hosted GitLab, `gitlab.com`) → **GitLab** (`glab`, "MR").
   `.claude/repo-config.json` → `"provider"` overrides.
2. **Fork workflow** — both `origin` and `upstream` present: `origin` = push target, `upstream` = MR target.
3. Never hardcode hosts, namespaces or IDs. Let the CLI auto-detect from remotes.

## Usage

```
/mr-guide                  # current branch — its open MR, or the branch diff if none exists yet
                           # generates AND publishes to the MR description
/mr-guide 1877             # a specific MR/PR number (incl. one you did not write)
/mr-guide --no-publish     # print only, write nothing  (alias: --dry-run)
/mr-guide --no-screens     # skip before/after screenshots even if frontend changed
/mr-guide --screens        # force screenshots even if the diff looks backend-only
```

## Target resolution

Resolve in this order — **the no-MR case is normal, not an error**:

1. **Explicit number** → that MR/PR. Diff = its changes; target branch = its target.
2. **No argument, open MR for the current branch** → that MR.
3. **No argument, no MR yet** → the **branch diff** against its target branch
   (`upstream/dev` if `upstream` exists, else `origin/dev`, else the repo default branch).
   Say plainly which one you used: `No MR yet — guiding the branch diff vs upstream/dev.`
   This is the path `/mr-create --guide` uses.

Get the diff with `git diff --stat <target>...HEAD` and `git diff <target>...HEAD`, not
`glab mr diff`, so the same code path serves all three cases.

## What it produces

Sections, in this order. **Omit any section that has nothing in it** — do not write
"N/A", "None", or "No changes". A guide with three sections is a good guide.

### What this changes
Two to five sentences, in the language of the product, not of files. A reader who has
never opened this repo should understand what is now possible that was not before.
Name the user who benefits (merchant, driver, consignee, admin, API consumer).

### Before / after
Behaviour, not files. What happened when someone did this thing yesterday; what happens now.
Use a two-column table when there is more than one behaviour pair.
If `--screens` ran, place the image pairs here.

### Data model
Only real schema/shape movement: new or dropped columns, migrations, new enum cases,
nullable→not-null, new tables, changed casts, new relationships, altered API response shape.
State the backfill story for anything that changes existing rows — or say there isn't one.
Flag it if a consumer outside this repo reads the changed shape.

### UI states
Every state the changed screens can now be in: **empty, loading, error, success,
permission-denied**, plus popovers/drawers/dialogs/detail views. Say which are newly handled
and which were already there. Note any state the change introduces but does not handle —
that is the single most useful line in the whole guide.

### Surfaces touched
Compact list: routes, API endpoints, jobs, queued listeners, console commands, events,
config keys, permissions, translation namespaces. One line each. This is the blast-radius map.

### Against the spec
**Only when the branch or MR references an issue, and only when something diverges.**

Pull the issue's acceptance criteria / requirements and check each one against what the diff
actually does. Report **only the mismatches** — an AC that is met needs no line, and a checklist
of green ticks is noise.

What counts as a divergence worth reporting:
- an AC with no corresponding code at all
- an AC met by a **different mechanism** than the issue specified (polling where the issue said
  webhooks, a scheduled job where it said an event) — this is the highest-value case, because
  it is a deliberate design decision that no line of the diff announces
- a constraint the issue called out as mandatory that the code does not enforce
- scope in the diff that the issue never asked for

State the divergence flatly and **do not adjudicate it**. "The issue asks for X; the branch does
Y instead" is the whole line. Whether Y is the better call is the reviewer's decision, not the
guide's — often the divergence is correct and the issue is stale.

If every AC is met as written, omit this section entirely. Say nothing.

### Look hard at
Only genuinely risky spots — a tricky invariant, an ordering assumption, a place the tests do
not reach, a third-party contract, money or rounding. If nothing qualifies, write one line
saying the change is mechanical and skip the section. Padding this section is worse than
omitting it: it trains reviewers to ignore it.

**Cap by diff size** — the limit is there to force ranking, not to hide findings:
- under ~20 changed files → **max 3**
- ~20 files or more → **max 5**

If more than the cap survive scrutiny, keep the highest-severity ones and add a final line:
`N further items were cut to stay inside the cap.` Never silently drop a real finding.

## Screenshots — auto-detected

Run the before/after screenshot pass **automatically** when the diff touches frontend.
Frontend signal — any changed path matching:

```
*.vue  ·  *.blade.php  ·  resources/js/**  ·  resources/css/**  ·  resources/ts/**
resources/**/locales/**.json  ·  *.scss  ·  tailwind.config.*  ·  vite.config.*
```

Translation-only or config-only hits do **not** trigger it on their own — a locale JSON
change with no template change alters no layout. Require at least one `.vue` or `.blade.php`.

When it triggers:
1. Say so before starting: `Frontend changes detected (4 .vue, 1 .blade.php) — capturing before/after.`
2. Identify the affected routes from the changed components (imports, router entries, Inertia page names).
3. Capture **after** on the current branch, then **before** on the target branch, via `/browse`.
4. Desktop **and** mobile widths — the standing rule for frontend MRs.
5. **Never write to the user's working tree.** If it has uncommitted changes — which mid-branch
   it usually does — do **not** stash, and do not decline either. Build a throwaway worktree at
   the branch and screenshot from there:
   - `git worktree add <tmp>/<branch> <branch>` for the "after" shots, and a second worktree at
     the target branch for "before"
   - serve each worktree **on its own ports** — a shared dev server serves the main checkout, so
     shooting it silently photographs the wrong branch and reports success
   - tear both down afterwards, and confirm the main checkout's own dev server is still alive
   Check the project's memory/docs first — a repo that has done this before usually has the exact
   serving recipe recorded (worker counts, host binding, hot-file handling), and those details are
   where this fails silently rather than loudly.
   Only decline if a worktree cannot be created, and then say which step failed.

`--no-screens` skips the pass. `--screens` forces it. If the app will not serve or a route
cannot be reached, say which route and why, and carry on with the rest of the guide —
a missing screenshot never blocks the guide.

## Rendering

The guide is read in a browser, not a terminal. Use the rich vocabulary — **verified to render on
both GitHub and self-hosted GitLab** (tested against GitLab 18.8-ee via `POST /api/v4/markdown`):

| element | use it for |
|---|---|
| tables | *Before / after*, and the data-model column list. Two to four columns; never more |
| `<details><summary>` | the long tail — *Surfaces touched*, the full *UI states* enumeration |
| `> [!WARNING]` / `> [!NOTE]` | each *Look hard at* item, and each *Against the spec* divergence |
| ` ```mermaid ` | a state machine — **only** when the branch actually adds or changes one |

**Collapsing is the load-bearing one.** An MR description that runs 400 lines is worse than no
guide: reviewers scroll past it to reach the diff. Put the scannable shape up top and fold the
enumerations away, so the whole guide is under roughly one screen when collapsed.

Rules that keep it honest:

- **Never collapse *Look hard at* or *Against the spec*.** Those exist to be seen. Folding them
  away defeats the entire guide.
- **Collapse only what exceeds ~10 lines.** A three-item list in a `<details>` is a click that
  buys nothing.
- Put the count in the summary so a reader can judge without opening —
  `<summary>Surfaces touched (3 routes, 1 scheduled command, 2 permissions)</summary>`.
- **A blank line after `<summary>` and before `</details>`**, or the markdown inside will not
  render — this is the single most common way these come out broken.
- **No task lists.** Unchecked boxes in a description read as unfinished work, and the guide is
  not a checklist.
- One mermaid diagram at most, and only if it shows something the prose cannot. A diagram of a
  two-state flow is decoration.

Do not use colour chips, footnotes, or nested collapsibles. If a section needs a scrollbar to
read, it is too long — cut it rather than folding it twice.

## Restraint

- **Describe only what the diff does.** Never infer a feature from a filename or a
  half-implemented path. If code is added but unreachable, say it is unreachable.
- **No code snippets** unless one specific line is the entire point of the change.
- **No file-by-file walkthrough.** That is what the diff is for.
- **Do not grade the change.** No "clean implementation", no "well structured", no score.
- A small change gets a short guide. Three sentences and a data-model note is a complete
  guide for a three-file change.

## Publishing

**Default: publish.** Resolve the destination by authorship:

- **You are the MR author** → write the guide into the **MR description**, wrapped in
  `<!-- mr-guide -->` … `<!-- /mr-guide -->`. A re-run **replaces** that block in place; it never
  stacks duplicates. Preserve everything outside the marker verbatim — checklists, `Closes #N`
  lines, anything a human typed. **No confirmation needed** — it is your own MR and the write is
  idempotent.
- **You are not the author** → post a **single top-level comment** (never inline threads), and
  **ask the user first**. This writes to a colleague's MR under the user's name. If a previous
  `mr-guide` comment from the same user exists, offer to edit it rather than add a second.
- **No MR exists** → there is nothing to publish. Print the guide and say
  `No MR yet — run /mr-create --guide to open one with this guide in the description.`
  This is not a failure.

`--no-publish` / `--dry-run` → print only, write nothing, in every case above.

**Always print the guide to the terminal too**, whether or not it published, so the user sees what
went out without opening the browser. After publishing, print the MR URL.

**Do not publish a guide built on a failed analysis.** If the diff could not be read, or the
analysis produced nothing for the main sections, print what you have and skip the write.

Screenshots: upload via the provider's upload endpoint and reference the returned markdown —
never link a local file path.

Screenshots: upload via the provider's upload endpoint and reference the returned markdown —
never link a local file path.

## Workflow

1. Resolve provider and target (see above). State which of the three target cases applies.
2. Pull the diff and the commit messages. **Resolve the linked issue** — from the branch name,
   a commit trailer, or the MR description — and read it in full. It carries the intent the diff
   cannot. Extract its acceptance criteria verbatim before analysing the code, so the comparison
   in *Against the spec* is against what was actually asked for rather than a memory of it.
3. **Delegate the analysis.** For a diff over ~10 files, spawn parallel subagents
   (`model: "sonnet"`) — one for backend/data-model, one for frontend/UI-states, one for
   surfaces (routes, jobs, commands, API). Ask each for conclusions with `file:line` anchors,
   not file dumps. Cap them: tell each not to spawn its own subagents.
4. Run the screenshot pass if auto-detection fires.
5. Assemble the guide. Drop empty sections.
6. Print it to the terminal, then publish per the rules above — straight to the description on
   your own MR, after a confirm on someone else's, not at all with `--no-publish`.

## Hooks

- `/mr-create --guide` — generate the guide from the branch diff and open the MR with it in
  the description.
- `/mr-review` — if the MR description contains a `<!-- mr-guide -->` block, read it for
  context before reviewing. Do not regenerate it.
