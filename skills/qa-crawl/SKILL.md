---
name: qa-crawl
description: Work through an app's pages one at a time, unattended and resumably — sweep each for runtime errors, auto-fix and verify what's objectively broken, record UI improvements as proposals rather than applying them, and open a small before/after merge request per page that needed changes. Keeps a durable ledger so it can be stopped and resumed across sessions, and runs in its own git worktree so it never touches your working tree. Invoke with /qa-crawl to start or continue a crawl; pair with /loop to keep it going while you work on something else. Restraint-gated: most pages are clean and produce nothing — that is the expected outcome, not a failure.
---

# /qa-crawl — grind through the backlog while you do something else

One page at a time, forever, without losing its place. `qa-sweep` answers "is this page broken?" for a page you point it at. This drives that question across a few hundred routes, fixes what is objectively wrong, and leaves a reviewable trail — designed to be interrupted, resumed, and left running in the background.

It composes what already exists rather than re-deriving it: `qa-sweep` finds, `root-cause` diagnoses, `ponytail` constrains the fix, `ship-check` vets the diff, `ui-audit`/`ux-audit` judge the interface, `/browse` captures evidence, `/mr-create` opens the MR. This skill owns only the **ledger**, the **per-page contract**, and the **isolation**.

**The restraint gate.** A clean page is the normal result — record it and move on without commentary. Do not manufacture work to justify the run. Never widen scope from the page in front of you to "while I'm here"; the next page is the next iteration, not this one. One page per iteration, always.

## Isolation — do this before anything else

The whole point is that it runs while someone is working. It must therefore never touch their checkout.

Run in a **dedicated git worktree on its own branch**, created once at the start of a crawl and reused on every resume. Never `git checkout` in the user's working copy, never stage or commit files you did not change, and never assume the branch you find is the one you should commit to. If a worktree can't be created, stop and say so rather than falling back to the shared tree.

Record the worktree path and branch in the ledger so a resumed session finds them instead of creating a second one.

## The ledger

`.claude/qa-crawl/ledger.json` (`.claude` is gitignored — this is personal state, never committed).

Build the route inventory **once**, at crawl start, and store it. Enumerate real pages only — for a Laravel app, `php artisan route:list --method=GET`, then drop parameterised paths (`{id}`), exports/downloads, and **JSON endpoints**, which are not pages: tells are a controller returning `JsonResponse` rather than an Inertia/view response, or a path that reads like data (`get-*`, `*-list`, `*/search`, `*/data`). Navigating to one of those produces a "failure" you invented yourself.

One entry per route:

```json
{ "route": "/admin/blocks",
  "status": "pending | clean | fixed | proposed | needs-human | skipped",
  "checked_at": "<iso8601>",
  "findings": [ { "severity": "...", "title": "...", "resolution": "fixed|proposed|deferred" } ],
  "commit": "<sha or null>", "mr": "<url or null>",
  "shots": { "before": "<path>", "after": "<path or null>" },
  "notes": "<why skipped / what a human needs to decide>" }
```

Write the entry **before moving to the next route**, always — including on failure. An unwritten ledger entry means the next resume redoes the page, and a crash mid-page must not lose the record of what was already changed.

## One iteration = one page

1. **Resume.** Read the ledger. If it doesn't exist, build the inventory and the worktree. Take the first `pending` route.
2. **Before.** Capture a screenshot of the page as it currently is. Do this *before* any change — there is no second chance at a before-shot.
3. **Sweep.** Apply the `qa-sweep` method to that one route: does it render, console errors, dead controls, form validation, empty/error states, locale and RTL. Filter dev-server noise (HMR chatter, unbundled modules, `transferSize: 0`) — not bugs.
4. **Clean?** Mark `clean`, record the before-shot, go to the ledger write. No branch, no commit, no MR. This is most pages.
5. **Errors — fix them.** For each objectively-broken thing (500, console error from app code, dead control, form that fails to submit or to show its error): diagnose with `root-cause` first — never patch a symptom because it makes the red go away. Fix with `ponytail` restraint: smallest change that removes the actual cause. If diagnosis fails after three honest attempts, mark `needs-human` with what was ruled out, and move on. Do not guess.
6. **Verify.** Re-run the page. The error must be gone *and* nothing else newly broken. An unverified fix does not get committed — revert it and mark `needs-human`.
7. **After.** Capture the after-shot once the page is fixed and verified.
8. **Responsive — measured, and in the auto-fix track.** Take the page-level overflow reading at mobile 375, tablet 768, laptop 1280 and ultra 2560 (`documentElement.scrollWidth - clientWidth`). A positive number is an objective defect, not a matter of taste, so it is diagnosed, fixed and re-verified through steps 5–7 like any error — with the same before/after shot per broken viewport. Fix the outermost offender: children inherit their parent's overflow, so patching a child leaves the cause in place. What is *not* in this track: a layout that looks sparse, over-stretched or unbalanced at 2560 without overflowing. That's judgement — step 9.
9. **UI — propose, don't apply.** Run the interface judgment (`ui-audit` for correctness, `ux-audit` for whether it works for the person). **Record what they find; change nothing.** These go in the MR description as proposals with the before-shot attached. The only exceptions worth auto-fixing are things with an objective right answer — an untranslated string, a layout broken under RTL — and even those follow steps 5–7 including verification.
10. **Vet.** Run `ship-check` on the accumulated diff for this page. If it says fix-first, do that before opening anything.
11. **MR.** One MR for this page (see below), then record `commit` and `mr` in the ledger.
12. **Write the ledger entry. Stop.** One page per iteration. The next route is the next run.

## Driving it

Pair with `/loop` to keep iterating unattended. Each firing does exactly one page and stops — that is what makes it safe to interrupt. Progress is always in the ledger, never only in the conversation.

Report progress as a count when asked: `n clean / n fixed / n proposed / n needs-human` out of the inventory, plus the current route.

## MR shape

One MR per page **that needed something** — a clean page opens nothing. Title names the route. Body:

- what was broken, and the root cause (not just the symptom)
- what changed, and how it was verified
- **before/after images** side by side
- **UI proposals** as an unchecked list, explicitly marked *not applied* — so the reviewer knows the diff doesn't contain them
- anything marked `needs-human` and why

Attach images by uploading them to the project first (`glab api projects/:id/uploads -F file=@<path>` returns the markdown to embed). If upload isn't available, link the on-disk paths and say plainly that the images weren't attached — don't silently drop the evidence.

## Guardrails

- **Never touch the user's working tree, index, or branch.** Own worktree, own branch, or don't run.
- **Errors auto-fix; UI is proposed.** The line is objectivity: a 500 is verifiable, "cleaner hierarchy" is not. Don't cross it because a change looks obviously good — intentional design choices read as bugs to a crawler.
- **Horizontal overflow is on the objective side of that line.** A page wider than the phone it's on is broken by measurement, not opinion, and gets fixed and re-verified like any error. Only chase culprit elements once the page-level number is positive — element-level clipping on a page that doesn't overflow is almost always intentional.
- **Diagnose before fixing.** A fix that makes the symptom disappear without a cause is a second bug.
- **Verify every fix by re-running the page.** Unverified means reverted and flagged, not committed.
- **One page per iteration, ledger written every time** — including on crash or bail-out.
- **Don't fix what you find in passing.** Out-of-scope problems get noted in the ledger for their own iteration.
- **Clean is the expected result.** Report it in one line and move on; a run that "found something" on every page is miscalibrated, not thorough.
- **Stop rather than guess.** `needs-human` with honest notes beats a plausible fix nobody verified.
