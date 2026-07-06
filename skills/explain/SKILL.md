---
name: explain
description: Reverse-engineer an unfamiliar feature, subsystem, or flow end-to-end and produce a navigable map — the real data/control flow with file:line anchors, the key components and how they connect, and the non-obvious coupling and gotchas that would bite someone changing it. Invoke with /explain when onboarding to code you didn't write, before modifying an unfamiliar area, or to hand off understanding. Restraint-gated: surface what's SURPRISING and load-bearing, don't narrate every line or restate the obvious.
---

# /explain — Map an unfamiliar system

You are explaining a piece of code to a competent engineer who is about to work on it and has never seen it. They don't need a line-by-line tour — they need the **mental model**: how the thing actually flows, where the real logic lives, and what will surprise them when they change it. Produce a map they can navigate by, not an essay they have to read.

Use this before modifying an unfamiliar area, when onboarding to inherited code, or to hand off understanding of a flow. It reads and traces — it does not change code. It pairs with `root-cause` (which diagnoses a *specific* bug) — this one builds the *general* understanding of how an area works.

**The restraint gate — this is the whole discipline.** The failure mode is narrating every function and restating what the code already says plainly. Don't. Explain the parts that are **load-bearing or non-obvious**; skip the parts a competent reader gets for free. The highest-value output is the *surprising* coupling, the *non-obvious* ordering, the assumption you'd only learn by getting burned — not "this controller calls this service which calls this model." If a section of the flow is obvious, compress it to one line and spend the words where the reader would actually get stuck. A short map that flags the three real traps beats a long one that buries them.

## What to produce

### 1. The one-paragraph model
Open with what this thing *is* and *does*, in plain language — the sentence you'd say to orient someone before showing any code. What triggers it, what it's responsible for, what it produces.

### 2. The flow, with anchors
Trace the real control/data flow end to end — entry point → the steps that matter → outcome — with `file:line` anchors so the reader can jump straight in. Follow what *actually* runs, not the tidy version: the branch that matters, the queue hop, the event that fans out, the cache in the middle. Compress obvious links ("→ standard controller→service→model") and expand where the real logic or the branching lives. Show the shape (a short numbered flow or a small diagram), not a transcript.

### 3. The key components
The few types/files/functions that carry the weight — for each, one line on its role and why it matters. Not an inventory of every file touched; the load-bearing ones.

### 4. The non-obvious — the reason this skill exists
The things that would bite someone who changed this without knowing them. Hunt for and call these out explicitly:
- **Hidden coupling** — the sibling that must change together, the ordering that can't be reversed, the two places that must stay in sync.
- **Surprising assumptions** — a session TZ, a nullability quirk, a "this is always set by the time we get here," a global scope silently filtering results.
- **Side effects & fan-out** — events, jobs, cache writes, derived/denormalized data written elsewhere.
- **Gotchas & sharp edges** — the footgun, the "looks unused but isn't," the workaround with an unstated reason, the thing that needs a worker restart / cache clear to take effect.
- **Seams for change** — if the reader's likely goal is to modify this, where's the clean place to hook in vs. where they'd regret touching.

## Output shape

```
## How <X> works

**In one line:** <what it is / does>

**Flow**
1. <entry> (`file:line`) → <what happens>
2. <the step that matters> (`file:line`) → <the real logic / branch>
3. … (compress the obvious links)
→ <outcome>

**Key components**
- `<Type/file>` (`file:line`) — <role, why it matters>

**Non-obvious / watch out**
- <hidden coupling / assumption / side effect / gotcha — concretely, with where>

**If you're changing it:** <the clean seam, or the thing to be careful of>  (include only if relevant)
```

## Guardrails
- **Trace the real flow, don't guess it.** Read the code and follow it; anchor claims with `file:line`. If you inferred something without confirming, mark it as inferred.
- **Surprising over comprehensive.** Coverage isn't the goal — the reader's *unblocking* is. Cut anything they'd get for free from a glance.
- **Map, don't lecture.** Skimmable structure and anchors over prose paragraphs. They'll read the code; you point them at the right lines and warn them about the traps.
- **Restraint gate applies.** If the area is genuinely simple, a three-line answer is the correct, honest output — don't inflate it.
