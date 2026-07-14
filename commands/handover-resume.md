---
description: Reload a saved handover plan from .claude/handover/ and re-anchor this session to continue the work.
argument-hint: "[slug]  (optional; lists available plans if omitted or ambiguous)"
allowed-tools: Bash(git branch:*), Bash(ls:*), Bash(git status:*), Read, Grep, Glob
---

You are resuming work from a previously saved handover plan (written by `/plan-save`).

## 1. Locate the plan

- If `$ARGUMENTS` names a slug, read `.claude/handover/<slug>.md`.
- If no argument: run `git branch --show-current`, derive a slug, and try `.claude/handover/<slug>.md`.
- If neither resolves, list the files in `.claude/handover/` (with their `# Title` and `**Status:**`
  lines) and ask the user which one — do not guess.

## 2. Re-anchor — verify before trusting

The doc reflects what was true when it was saved; the codebase may have moved on. Before you
continue:

- Read the plan fully.
- Spot-check the **Key code anchors** — confirm the cited file:line references still point at what
  the doc claims (Read/grep them). Note any that have drifted.
- Check the branch matches; if `git status` shows relevant uncommitted work, reconcile it against
  the plan's checkbox state (something may already be done that isn't checked off).

## 3. Report back, then continue

Give a short briefing:
- **Where we are:** the Status line + what's actually done vs pending (corrected for any drift).
- **Any drift you found:** stale anchors, already-completed steps, changed assumptions.
- **Next step:** the first unchecked, unblocked item.

Then proceed with that next step (or ask which item to start on if several are unblocked). As you
complete steps, keep the handover doc's checkboxes updated so it stays an accurate resume point.
