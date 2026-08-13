---
name: checkpoint
version: 0.1.0
description: Triage a long session — split what is DONE (droppable) from what is LIVE (needed to continue), then recommend keep going / compact / clear / handover+clear — handover only when work continues past the clear. Invoke when the statusline context reading turns yellow (>=50%) or red (>=80%), or any time you want to know whether this session is still worth carrying. Reports and recommends ONLY — never clears, never compacts, never writes. Restraint-gated: "keep going, nothing is droppable yet" is a first-class verdict.
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Read, Glob, Grep
---

# /checkpoint - Is this session still worth carrying?

## The one rule

**This skill never changes anything.** It does not clear, does not compact, does not write a
handover, does not commit. It produces a read and a recommendation; the user acts on it. The
tool list above has no `Write` or `Edit` for exactly this reason — if you find yourself wanting
them, you have misread the job.

## Why the judgment can't be automated

Clearing a session throws away a warm prompt cache. It only pays off when the *next* stretch
re-acquires little of what you dropped — that is a **task boundary**, not a percentage. Clearing
mid-task means re-reading the same files at full price with a cold cache, which costs more than
carrying them would have. A context percentage can tell you the session is *big*; only this
triage can tell you it is *done with* anything.

So a high reading is not by itself a reason to clear. It is a reason to run this.

## Step 1 — Name what this session is actually for

One line. Not the opening message — what it turned out to be. Sessions drift, and the drift is
usually where the droppable bulk is. If the goal changed mid-session, say so; that is often the
whole answer.

## Step 2 — Split DONE from LIVE

This is the substance of the skill. The test is **recoverability**, not completion:

> Something is DONE (droppable) only if a fresh session could get it back cheaply — from git,
> from a file on disk, from the codebase itself, or from a durable doc. If it exists **only in
> this conversation**, it is LIVE no matter how finished it feels.

**DONE — droppable:**
- Subtasks whose result is committed, written to a file, or otherwise on disk
- Files read to answer a question that is now settled
- Exploration that fed a decision already made and recorded
- Raw tool output already condensed into a conclusion stated in the transcript

**LIVE — must survive:**
- The file(s) currently being edited, and why they are being edited
- Decisions made but not yet written down anywhere durable
- Constraints or gotchas discovered this session that are not in the code, CLAUDE.md, or memory
- Open questions blocking the next step
- The real goal, if it drifted from the opening message

Anything LIVE that exists only in the transcript is the argument *against* clearing — and the
list of what `/handover-save` would need to capture if the user does clear.

## Step 3 — Pick one verdict

- **KEEP GOING** — LIVE dominates, little is genuinely recoverable-elsewhere, work is mid-flight.
  The correct answer most of the time, including at surprisingly high readings.
- **COMPACT** — a lot is DONE, but the user is mid-task and still needs the thread. Compaction
  keeps the reasoning and drops the bulk. This is the usual answer for a big-but-unfinished session.
- **HANDOVER + CLEAR** — the session is at a task boundary, **work continues past it**, and the
  next stretch needs little of what is here. Only this case wins the cache tradeoff. Say what
  should go in the handover (the LIVE list), then let the user run `/handover-save` and `/clear`
  themselves.
- **CLEAR** — the task is *finished*: merged, filed, shipped, nothing in flight. LIVE is empty,
  not merely small. Recommend `/clear` **alone — no handover.** A handover doc carries unfinished
  work across a clear; when there is none it costs tokens to write and buys nothing. Instead name
  where the loose ends already live (an issue, a memory, a merged commit) — that is *why* no
  handover is needed, and it is worth one line so the user can check you're right.

If two verdicts seem close, pick the less destructive one and say it was close.

**Don't pair handover with clear by reflex.** The two travel together often enough to fuse in the
telling, but the handover is for work that continues. Recommending one at the end of finished work
is a real cost with no return, and it reads as not having noticed the work is done.

## Step 4 — Output

Short. This is a nudge, not a report. No preamble, no restating the rules.

**Do not open with a context percentage.** You cannot read your own context usage, and a guessed
number is worse than no number — the statusline already shows the real one, and it is what made the
user invoke this. Open with what the session is *for*. If the user quotes a figure, use theirs.

```
<what this session is actually for, one line>

DONE (droppable)
  • <thing> — recoverable from <git / file / codebase>
LIVE (must survive)
  • <thing> — <why a fresh session couldn't get it back>

→ <VERDICT>: <one sentence why>
   <the exact command(s) to run, if any>
```

## Restraint

If nothing is meaningfully droppable, say so in two lines and stop:

```
mid-refactor on the bidding sweeper
→ KEEP GOING: nothing here is recoverable elsewhere yet — the whole session is LIVE.
```

Do not manufacture a DONE list to look thorough. A session can be large and still have nothing
to drop; saying that plainly is the useful answer. Never pad the LIVE list either — it doubles as
the handover checklist, and a bloated one makes the handover worse.
