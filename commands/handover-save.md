---
description: Materialize the current conversation's plan into a durable handover doc under .claude/handover/ (survives /clear and session handoffs).
argument-hint: "[slug]  (optional; defaults to current branch name)"
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(ls:*), Read, Write, Edit, Grep, Glob
---

You are capturing the plan we have developed **in this conversation** into a durable, gitignored
handover document, so it survives `/clear`, context compaction, and handoff to a fresh session or
another engineer. This is NOT a fresh plan — extract what we already worked out.

## 1. Resolve the target file

- Slug: use `$ARGUMENTS` if provided. Otherwise run `git branch --show-current` and derive a slug
  from the branch (strip `feat/`, `fix/` etc. prefixes; keep it kebab-case). If that yields nothing
  (detached HEAD or not a git repo), ask the user for a slug — never write to `.claude/handover/.md`.
- **Sanity-check a branch-derived slug against what this conversation is actually about.** If the
  plan we discussed isn't the current branch's work, say so and confirm the slug (or ask for one)
  before writing — otherwise the plan is filed under an unrelated name and `/handover-resume` on that
  branch will never surface it.
- Path: `.claude/handover/<slug>.md`.
- If that file already exists, **read it first** and update it in place (preserve any checked-off
  progress) rather than clobbering it. If it describes clearly different work, append `-2` (then
  `-3`, …) to the slug and tell the user the final filename so they know what to resume.

## 2. Extract from THIS conversation — do not re-plan from scratch

First, sanity-check there's actually something worth persisting. If no real plan or in-flight work
was developed here (a quick one-off, or work that's fully done with no follow-ups), say so and ask
the user to confirm before writing — don't manufacture a plan just to fill the template.

Pull from what we actually discussed: the goal, decisions made (and rejected alternatives), the
files and line numbers we touched or identified, open questions, and the concrete next steps.
Where you cite code, verify the file:line anchors are still accurate before writing them (a quick
Read/grep) — stale anchors are the main way these docs rot.

## 3. Write the doc in this structure (mirror .claude/handover/mr-2b-auto-exclude-reconcile.md)

```markdown
# <Title> (HANDOVER)

**Status:** <not started | in progress: what's done vs pending | blocked on X>
**Branch:** `<branch>` (cut off `upstream/dev` if not yet created)
**Last updated by session:** <one line of context — what we just finished>

---

## 1. The problem / goal
<What we're solving and why. The "so what". Include the decision and any rejected alternatives.>

## 2. Plan — concrete steps
- [ ] Step with enough detail to execute without re-deriving it
- [ ] ...
(Use checkboxes so a resumed session sees done-vs-pending at a glance. Check off anything
already completed in this conversation.)

## 3. Key code anchors
| Location | What it does / what to change |
|---|---|
| `path/to/file.php:NN` | ... |

## 4. Gotchas / constraints / things learned
<Non-obvious things that would bite whoever picks this up. Cross-reference memory entries by name
if relevant.>

## 5. Open questions
<Anything unresolved that needs a decision before or during execution.>
```

## 4. After writing

Report the path and a two-line summary of what was captured. Remind the user it's gitignored
(personal scratch) and can be reloaded later with `/handover-resume <slug>`.
