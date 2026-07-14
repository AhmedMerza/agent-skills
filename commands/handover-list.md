---
description: List the saved handover plans in this project's .claude/handover/ with their title, status, and slug.
argument-hint: "(no args)"
allowed-tools: Bash(ls:*), Read, Grep, Glob
---

You are listing the saved handover plans for the current project so the user can pick one to resume.

## 1. Find them

Look in `.claude/handover/` for `*.md` files. If the directory is missing or empty, tell the user
there are no saved handovers yet (and that `/handover-save` creates one) — then stop.

## 2. For each plan, extract

- **Slug** — the filename without `.md` (this is what you pass to `/handover-resume <slug>`).
- **Title** — the `# ...` heading (first line).
- **Status** — the `**Status:**` line.

Grep the `# ` and `**Status:**` lines rather than reading whole files.

## 3. Present a compact table

| Slug | Title | Status |
|---|---|---|
| `mr-2b-auto-exclude-reconcile` | MR 2b — Server-side auto-exclude reconcile | not started |

Order by most-recently-modified first (use `ls -t`). Keep Status to its first clause — don't dump
the whole line. End by reminding the user they can reload one with `/handover-resume <slug>`.
