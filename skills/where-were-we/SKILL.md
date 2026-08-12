---
name: where-were-we
description: Catch the user up mid-session when the conversation has run long and they've lost the thread — a short status read on what this work is for, what has actually landed, where it sits in the flow (did ship-check / mr-review / fix-review run yet?), and what is still unresolved. Fires on two signals. (1) The user has lost track of the session as a whole - /where-were-we, "where were we", "what were we doing", "catch me up", "remind me where we are". (2) The user is at the end of a change and wants a pre-merge gate check on their own process - "did we run ship-check yet", "what haven't we run", "am I clear to merge", "did we skip a step". Do NOT fire on an ordinary in-task question like "what's left on this?" or "what's next" - those want a one-line answer about the current step, not a full status read. Read-only - never resumes the work, fixes anything, writes files, or commits.
---

The user has lost the thread of a long session. Give it back in **under 20 lines**. This is a
status read, not a story — nobody needs the narrative of how we got here.

**Do not summarize the conversation.** A recap of everything said is the failure mode; that is
what they already couldn't hold in their head. Report *state*, not history.

Answer five things, in this order, and stop:

**Goal** — one sentence: what this session is actually trying to land. Take it from the user's
original ask, not from whatever the last ten messages drifted into.

**Landed** — what is genuinely done, one line each. Commits (with short SHAs), pushes, files
written, decisions settled. **Cross-check against ground truth**: a claim in the transcript that
something shipped is not evidence that it shipped. Run `git log --oneline`, `git status`, `glab
mr list` as needed — if the conversation and the repo disagree, the repo wins and the
disagreement is itself worth a line.

**Where we are in the flow** — place the work on the chain in the collection README's flow map
("When to reach for which"). **That map is the single source of truth — read it, do not restate a
chain from memory here.** If what you remember disagrees with the README, the README wins. Name
the steps that ran and the ones that have not.

Distinguish **not yet run** from **not on the board**. If no MR exists, `/mr-review` is not
pending — it is not applicable yet. Listing inapplicable steps as outstanding invents work.

**Steps leave different amounts of evidence — do not treat them alike.**
- **Provable** from ground truth: commits and pushes (`git log`, `git status`), the MR itself
  (`glab mr list --source-branch`), `mr-review` and `fix-review` (both post threads to the MR —
  check its discussions).
- **No artifact at all**: `ship-check`, `root-cause`, `validate-plan`, `prove-the-test`. Nothing
  on disk proves these ran. If the transcript doesn't show one, say **"no evidence it ran"** —
  never assert it didn't, and never assert it did.

When this fires as a pre-merge gate check rather than a catch-up, this section *is* the answer:
lead with it, and keep the other four to a line each.

**Still open** — the part they actually asked for, and the part that needs discipline. An open
loop needs *evidence*: something I said I would do and did not, a finding nobody accepted or
rejected, a question I asked that went unanswered, a check that failed, a caveat raised and
never resolved. Uncommitted work counts. "We could also…" does not — an idea nobody raised is
not an open loop, and padding this section is how the skill becomes noise.

**Next** — one line. The single most useful thing to do now.

## Rules

- **Read-only.** Report and stop. Do not resume the work, fix the open items, write a handover
  doc, or commit. If they want any of that they will say so next.
- **Brevity is the feature.** They asked because there was too much to hold. Bullets, no
  preamble, no restating the question back at them.
- **Nothing open is a real answer.** If every loop is closed, say so in one line and give the
  next action. Do not manufacture loose ends to fill the section.
- If a saved handover doc exists for this branch in `.claude/handover/`, mention it in one line
  and point at `/handover-resume` — do not read it in and re-brief from it.
