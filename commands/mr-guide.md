---
name: mr-guide
version: 2.0.0
description: Generate a skimmable pre-merge guide for an MR/PR or branch — what to know before merging, decisions made and alternatives, before/after screenshots, data model, UI states — as an HTML page, not a code review
---

# /mr-guide

The page the merger reads **right before merging**, so they can understand the change without
reading the diff. It must be skimmable in under a minute: the things to be aware of are stated
and shown, not buried in prose.

**This is not a code review.** It finds no bugs and grades nothing. Use `/mr-review`
(findings), `/mr-review --deep`, or `/ship-check` (pre-merge gate) for that.

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
/mr-guide 1877             # a specific MR/PR number (incl. one you did not write)
/mr-guide --no-screens     # skip screenshots even if frontend changed (the guide says so)
/mr-guide --screens        # force screenshots even if the diff looks backend-only
/mr-guide --comment        # ALSO post a short markdown version on the MR/PR (see Delivery)
```

## Target resolution

The no-MR case is normal, not an error. In order:

1. **Explicit number** → that MR/PR. Diff = its changes; target branch = its target.
2. **No argument, open MR for the current branch** → that MR.
3. **No argument, no MR yet** → the **branch diff** against its target branch
   (`upstream/dev` if `upstream` exists, else `origin/dev`, else the repo default branch).
   Say plainly which: `No MR yet — guiding the branch diff vs upstream/dev.`

Get the diff with `git diff --stat <target>...HEAD` and `git diff <target>...HEAD`, not
`glab mr diff`, so one code path serves all three cases.

## Output contract — top to bottom

The reader skims. Order is fixed; a section with nothing in it is **omitted** (never "N/A").
Use headings, tables and callout boxes. **No paragraph longer than 3 lines.**

### 1. Before you merge  (callout box, always present)
0–5 items the merger MUST know, **one line each**, each with a severity marker:
`BLOCKER` (do not merge until resolved) · `RISK` · `CHANGE` (user-visible behaviour change) ·
`DATA` (migration, backfill, irreversible) · `DECIDE` (needs the merger's call).
Sources: risky spots in the diff, migrations, behaviour changes, config/env/permission changes,
spec divergences (issue asks X, branch does Y — state flatly, do not adjudicate), unhandled UI states,
anything not reversible by a revert.
If none: write **"Nothing needs your attention."** explicitly. Never leave the box blank.
More than 5 survive → keep the highest severity and end with `N more cut to stay inside the cap`.

### 2. Summary  (3 bullets max + verdict line)
- What changed, **in product terms**, naming the user who benefits (merchant, driver, cashier,
  admin, API consumer). A reader who has never opened the repo should follow it.
- **Verdict line:** one chip per gate with its result or `not run`:
  `ship-check: merge` · `mr-review: 2 minor` · `persona: not run` · `ui-audit: not run` · `ux-audit: not run`.
  Read results from the MR (comments, description) or this session; **never run a gate to fill the line**
  and never claim one ran that did not.

### 3. Decisions made  (table)
Each **non-obvious choice** in the change. Skip choices a reader would assume.

| Decision | Alternatives considered | Picked | Why (one line) |
|---|---|---|---|

Mine them from the MR description, commit messages, linked issue (and its comments), and the
diff itself (a different mechanism than the issue named, a new table instead of a column, polling
instead of an event). Apply `~/.claude/skills/best-option/SKILL.md` to each row:
- Name every real alternative, including ones nobody wrote down but the diff implies.
- Say **why each rejected option loses**, concretely ("needs a backfill of 40k rows"), not "less clean".
- **Check for a better unlisted option.** If one exists, add a row marker `BETTER OPTION?` and name it.
  If the pick is right, say so; do not manufacture a better one.
- Where the rationale is undocumented, write `rationale inferred from diff` — never invent intent.
No non-obvious decisions → omit the section.

### 4. Before / after screenshots  (UI-touching diffs only)
Side by side (two-column table, "Before" left, "After" right), **one pair per changed screen**,
with a one-line caption saying what to look at. Desktop **and** mobile width for web.
Details under **Screenshots** below. Non-UI diff → omit the section.

### 5. Detail  (each ≤ ~6 lines; fold anything longer in `<details>`)
Include only what the change actually has:
- **Before / after behaviour** — table of behaviour pairs (what happened yesterday / what happens now).
- **Data model** — new/dropped columns, migrations, enum cases, nullability, casts, relationships,
  changed API response shape. State the backfill story or say there is none. Flag consumers outside this repo.
- **UI states** — empty, loading, error, success, permission-denied, plus dialogs/drawers: which are newly
  handled, which were already there. **A state the change introduces but does not handle goes in
  "Before you merge", not here.**
- **Surfaces touched** — routes, endpoints, jobs, listeners, commands, events, config keys, permissions,
  translation namespaces. One line each, folded: `<summary>Surfaces touched (3 routes, 1 command)</summary>`.
- **Look hard at** — only genuinely risky spots (invariant, ordering, untested path, third-party
  contract, money/rounding). Under ~20 changed files max 3, otherwise max 5. Anything risky enough to
  matter before merging is also lifted into box 1.

### Restraint
- **A tiny MR gets a tiny guide**: box + summary, nothing else. Three files with no decision, no UI and
  no data change is a ten-line page. Do not pad to look thorough.
- Describe only what the diff does; code added but unreachable is called unreachable.
- No code snippets unless one line is the entire point. No file-by-file walkthrough.
- Do not grade ("clean", "well structured"). Report facts and choices.

## Screenshots

**Trigger.** Run automatically when the diff has at least one `.vue`, `.blade.php`, `.dart` UI file,
or `resources/js|css|ts/**`/`.scss`/tailwind change that alters markup or styles. A locale-JSON-only
or config-only diff alters no layout and does not trigger it. `--no-screens` skips (the guide states
"screenshots skipped by flag"); `--screens` forces.

**Never skip silently.** If a pass cannot run, the page shows a callout stating **exactly why**
(app will not serve, no credentials, no emulator, route unreachable) and a list of **which screens
would need before/after shots**. A missing screenshot never blocks the guide.

1. Announce: `Frontend changes detected (4 .vue) — capturing before/after.` Identify the changed
   screens from components, router entries and Inertia page names.
2. **Check the data exists first.** A new column/chip/action only renders with rows in the triggering
   state. Query the page's own data; if there are none, label the shot honestly ("no rows in this state
   yet — this is launch day"), or say the state could not be shown. Seed fixtures **only with the
   user's explicit consent**, record original values, revert afterwards. Forms and dialogs need no data
   and are always shot.
3. **Never disturb the working tree** (no stash). Use throwaway worktrees: `git worktree add <tmp>/after <branch>`
   for the MR branch and `git worktree add <tmp>/before <target>` for the base (`main` or the MR target).
   Serve each **on its own port**: a shared dev server serves the main checkout, so shooting it
   photographs the wrong branch and reports success. Check project memory/docs for the repo's serving
   recipe. Tear both down afterwards and confirm the main checkout's own server is still alive.
4. **Isolate the older side's cache.** The base checkout cannot rehydrate cache entries written by newer
   code (new enum case, changed DTO) and dies on `unserialize`, which reads as "target branch broken".
   Give the *before* server a throwaway cache (Laravel: `CACHE_STORE=array`). Never clear the shared cache.
5. **Capture with the tool that fits:**
   - **Web (Laravel/Inertia/Vue):** `/browse` (`~/.claude/commands/browse.md`, helper
     `node ~/.claude/scripts/browse.mjs <path>`; add `--mobile` for the mobile width), run from each
     worktree's root so it uses that worktree's config and port. Needs `PW_PASS` — ask the user, never
     store it. Or Playwright directly when `/browse` cannot reach a state (open dialog, filled form).
   - **Flutter web build:** `web.mjs` from the persona-walkthrough skill.
   - **Flutter / native Android:** `scripts/droid.sh shot` from `~/.claude/skills/persona-walkthrough/`
     (adb; emulator or real phone). Build and install the *base* APK, shoot, then the *branch* APK,
     shoot, same device and same screen. Reset the app between builds for a fresh state.
6. Save as `before-<screen>.png` / `after-<screen>.png` in a scratch dir; Read each to confirm it shows
   the intended screen (not a login page or spinner — re-run with `--wait 30000` if so).

## Delivery

The guide is an **HTML page** (it holds images and tables; terminal text cannot).

1. Build one self-contained HTML file: headings, tables, callout boxes (`BLOCKER`/`RISK`/`DATA`
   red-amber, `CHANGE`/`DECIDE` blue), `<details>` for folded detail, screenshots in a two-column
   table. Light/dark safe, readable at phone width, no horizontal scroll.
2. **If the Artifact tool is available, publish with it** (follow its design-skill contract) and upload
   screenshots as files/assets; print the URL. Otherwise write the `.html` (images as relative files or
   base64) to the scratchpad or `./mr-guide-<n>.html` and **print its absolute path**. Never link a
   local path from a posted comment.
3. Print to the terminal a 5-line recap: the "Before you merge" items, the verdict line, the page URL/path.
4. **Post to the MR/PR only on request (`--comment` or the user asks):** a short markdown version —
   box, summary, decisions table, link to the page — as one top-level comment. If you are **not** the
   author, confirm first (it posts under the user's name); if a prior `mr-guide` comment by the user
   exists, offer to edit it rather than add a second. Wrap in `<!-- mr-guide -->` … `<!-- /mr-guide -->`
   so a re-run replaces it in place. Screenshots in a comment go through the provider's upload endpoint.
   Never overwrite the MR description. A blank line after `<summary>` and before `</details>`; no task lists.
5. **Do not publish a guide built on a failed analysis** (diff unreadable, nothing for the main sections).
   Print what you have and say what failed.

## Workflow

1. Resolve provider and target; state which of the three target cases applies.
2. Pull the diff and commit messages. **Resolve the linked issue** (branch name, commit trailer, MR
   description), read it in full, and extract its acceptance criteria verbatim before analysing code.
   Read the MR's existing review/gate results for the verdict line.
3. For a diff over ~10 files, delegate analysis to parallel `sonnet` subagents (backend/data model,
   frontend/UI states, surfaces), each told to return conclusions with `file:line` anchors and **not to
   spawn their own subagents**. Smaller diffs: do it inline.
4. Extract decisions (table 3) and apply best-option to each.
5. Run the screenshot pass if it triggers; otherwise state why not.
6. Assemble the page in the contract order, drop empty sections, size it to the change, deliver.

## Hooks

- `/mr-create --guide` — generate the guide from the branch diff and link it from the MR it opens.
- `/mr-review` — if the MR carries a `<!-- mr-guide -->` comment, read it for context first. Do not regenerate it.
