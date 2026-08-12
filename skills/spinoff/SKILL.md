---
name: spinoff
description: After a branch is finished, harvest the work it made CHEAP — the helper you wrote that four other sites now hand-roll, the plumbing that turned a deferred feature small, the pattern that just split the codebase in two. Produces a follow-up backlog (0–3 candidates, feeding /issue), NEVER commits on the current branch. Invoke with /spinoff at the tail of the chain — after /fix-review has settled the review findings, before the MR merges — or when the user asks "what else should we do while we're here / what did this unlock / anything to follow up on". This is ship-check's optional twin — that finds what's MISSING and blocks the merge; this finds what's now CHEAP and blocks nothing. Restraint-gated: "nothing spun off" is the common and correct answer, and a finding that would have been equally valid before this branch is not a finding.
---

# /spinoff — What did this branch just make cheap?

You just built something. In building it you created leverage that did not exist an hour ago — a helper, an abstraction, a new column, a piece of plumbing — and you are the only person who will ever know it's there. The moment you `git checkout master`, that knowledge evaporates. This skill spends five minutes harvesting it into a backlog **before it's gone**.

It is deliberately the *smallest* skill in the collection, and it earns its place by being narrow: one question, one brutal gate, and a strong bias toward finding nothing.

**What this is NOT — so you invoke the right thing:**
- **Not `ship-check`.** That hunts what's **MISSING** — a sibling caller still broken, an enum branch unhandled, a backfill not written. Those are *defects*: required, and they **block the merge**. This hunts what's now **CHEAP**: optional, and it blocks nothing. If you find a defect here, it isn't a spinoff — it's a ship-check finding that leaked. Send it back and fix it in the branch.
- **Not a licence to grow the diff.** `ponytail` still governs the branch. The output of this skill is a **list**, never a commit. See the hard rule below.
- **Not `scout`.** Scout goes and finds a destination you can't yet see. This harvests from a destination you already reached.
- **Not a code-quality sweep.** `ui-audit` / `mr-review` / `nitpick` list what could be better in general. Everything they'd say was equally true yesterday — which is exactly what this skill throws away.

## The hard rule

**This skill does not touch the current branch.** No edits, no commits, no "quick win while I'm here." The whole reason the reframing works is that the diff stays exactly as small as `ship-check` approved it. If a candidate is genuinely trivial *and* the user explicitly asks for it after seeing the list, that's their call — but you never make it yourself, and you never pre-emptively implement one to be helpful.

## The gate — read this before looking at anything

One test, and it disqualifies most of what you'll be tempted to write down:

> **Would this same suggestion have been equally valid on `master`, before this branch existed?**
>
> **Yes → it is not a spinoff.** Discard it. It's a generic wish, and generic wishes are infinite.

A real spinoff requires a **cost delta** caused by *this* branch. Not proximity — you being in the neighborhood is not leverage. Not familiarity — you having the file open is not leverage. Something in the diff must have *changed the price* of the follow-up.

If you cannot state the delta in the form *"before this branch: X. Now: Y."* — with a concrete X and Y — you do not have a finding.

Expect this gate to kill everything on most branches. That is the skill working, not failing.

## The four things that survive it

Look for these specifically. Nothing else qualifies.

### 1. Newly-duplicated — you wrote the canonical version
The branch introduced a helper, util, component, scope, or mixin — and pre-existing code hand-rolls the same logic. Those sites weren't wrong before (there was nothing to reuse); they are duplication *as of this merge*.
- Grep the *behavior* the new helper encapsulates, not its name — the old sites won't be calling it.
- Report the count and the paths. "3 call sites" is a finding; "probably some other places" is not.

### 2. Newly-reachable — the expensive thing got small
Plumbing, a field, an endpoint, a state container, an abstraction the branch added now makes something previously-hard cheap. **The highest-value question here:** was anything deferred, punted, or declined *because it was too expensive* — in this ticket, in a code comment, in an earlier conversation? Is it still expensive? Often the answer is no and nobody notices.

### 3. Newly-inconsistent — you forked the convention
The branch established a better pattern in one place, and the codebase now has two. This is **not** "go migrate all 40 call sites now" — that's the scope creep this skill exists to prevent. It's: *name the divergence, count the stragglers, record it before it becomes archaeology.* A convention split that nobody wrote down is how codebases rot.

### 4. Newly-exposed — building it made you see something
Working in this code revealed something invisible from outside: a dead path, an unused column, a wrong assumption two files over, a comment that's now a lie. Route by kind:
- **It's a bug** → `/root-cause` or `/issue` directly. Not a spinoff; don't launder a defect through this list.
- **It's knowledge** → capture it. This is the category with the shortest shelf life and it is the reason to run this skill at all.

## What never qualifies

Discard on sight — do not put these in the output to pad it:
- **"Add tests / types / error handling / logging."** True on any repo, any day. Fails the gate.
- **"Extract this into a service."** A second consumer that doesn't exist yet is `ponytail`'s speculative reuse.
- **"While we're in here…"** Proximity is not a cost delta.
- **Anything that blocks the merge.** That's a ship-check finding. Wrong skill, wrong time.
- **Refactors of code the branch didn't touch and didn't change the price of.**
- **Anything you can't size.** If you don't know whether it's an hour or a week, you haven't looked hard enough to file it.

## Procedure

1. **Read the diff.** `git diff master...HEAD` (or the branch's real base). What did it *add to the vocabulary* of this codebase — new functions, new fields, new patterns, new capabilities?
2. **For each addition, ask the cost-delta question**, and grep for the pre-existing code that the delta touches. Ground it: paths, counts, `file:line`.
3. **Run every survivor through the gate** and through "what never qualifies."
4. **Cap at three.** If you have more than three, you are almost certainly padding — keep the ones with the largest delta and drop the rest. Say you dropped them.
5. **Size each one honestly** and hand back the list with dispositions. Stop.

## Output shape

Short. This is a handoff, not a report.

```
## Spinoff: <branch name>

**What this branch added to the vocabulary:** <one line — the new capability/helper/pattern>

**Candidates**

1. <what to do> — `<size: ~30min / ~half-day / ~multi-day>`
   **Before:** <X> → **Now:** <Y>          ← the cost delta; if this is weak, cut the item
   **Where:** <paths / file:line / "4 call sites: a.dart:12, b.dart:88, …">
   **Disposition:** file as issue / note only / your call

2. …

**Dropped:** <n> candidates that failed the gate (equally true before this branch)
```

And when nothing survives — which is the normal outcome:

```
## Spinoff: <branch name>

**Nothing spun off.** <One line on what you checked and why the branch was self-contained —
e.g. "the new helper has no pre-existing hand-rolled twins; nothing was deferred on cost.">
```

## Guardrails
- **Never touch the branch.** List only. The value of this skill is entirely conditional on the diff staying small.
- **The delta is the finding.** An item without a concrete *before → now* is a wish with better formatting. Cut it.
- **Zero is the expected result.** Most branches are self-contained. Reporting "nothing spun off" costs you nothing and reporting three padded items costs the user a triage session and their trust in the skill.
- **Ground everything.** Paths and counts, or it didn't happen. "Some places probably do this" is not a finding.
- **Don't launder defects.** Anything that *should* block the merge goes back to `ship-check`, not into this list.
- **Three is the ceiling, not the target.** Never work up to it.
- **Hand off, don't act.** Candidates feed `/issue`. Filing them is the user's decision, and implementing them is a different branch on a different day.
