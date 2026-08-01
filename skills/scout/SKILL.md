---
name: scout
description: Explore a problem you don't yet know how to handle — name what "done" actually looks like, fan out breadth-first across every open question between here and there, then settle them one at a time until the route is clear. Invoke with /scout when you have an idea or a problem but no plan yet and can't tell where to start. Output is a named destination plus the decisions that get you there — NOT code, and NOT a spec. Hands off to plan mode / validate-plan when the fog lifts. Runs in one session by default; escalates to /handover-save only if it genuinely outgrows one. Restraint-gated: "you already know how to do this, go do it" is a first-class result.
---

# /scout — Where am I actually going, and how do I get there?

You have a problem or an idea, and the honest state is *you don't know how to handle it*. Not "which of three approaches" — you can't yet see the far end well enough to have three approaches. Everything else in this collection assumes a target already exists. This is the one that goes and finds it.

The job is to **survey the terrain, then pick the route** — not to charge at the destination, and not to start building the first thing that looks buildable.

**What this is NOT — so you invoke the right thing:**
- Not `grill-me` — that interviews you about a **plan you already have**, walking one decision tree **depth-first**. This runs *before* a plan exists and deliberately goes **breadth-first**. When scout ends, `grill-me` is a reasonable next step.
- Not `explain` — that maps code that **already exists**. This maps work that doesn't.
- Not `root-cause` — that's for a broken thing with a known symptom. Reach for that first if something is failing; scout the *response* to it afterwards, if the fix isn't obvious.
- Not `validate-plan` / `ship-check` — those judge a plan and a diff. Scout runs upstream of both and produces the thing they judge.

**The restraint gate — read first.** The failure mode is manufacturing a journey. If the opening pass shows you can already state the destination and the steps to it, **say so and stop**: "this doesn't need scouting — here's the plan, go." Most problems are like that. Ceremony on a clear path is pure cost. Likewise, if *you* reached for this skill rather than the user typing `/scout`, confirm before starting — an unrequested 20-question interview is a bad surprise.

## The passes

### 1. Name the destination — before any other question

Ask what **done** looks like, and get it to one or two lines. It might be a decision locked, a spec to hand off, a migration completed in place, a feature working end to end. Different destinations produce completely different routes, so this is settled first and never assumed.

The destination **fixes the scope** — every question below is measured against it. If the user can't name it yet, that *is* the first thing to work on, and nothing else starts until it's named.

### 2. Fan out — breadth-first, and resist answering

Sweep the **whole space** between here and the destination and collect the open questions. Do not resolve any of them yet. The pull to answer question one immediately is the thing this pass exists to defeat: the first question you notice is rarely the one that decides the shape, and answering it early means planning the wrong thing very carefully.

Go wide, not deep. Aim to surface the question you *didn't* know was there.

**Facts you look up; decisions you ask.** If something is checkable — the schema, the callers, the real data, the library's docs, what the code actually does today — go check it, don't spend a question on it. Only genuine decisions go to the user.

### 3. Sort into three buckets

| Bucket | Test | What you do |
|---|---|---|
| **Sharp** | You can state the question *precisely* right now | Work it (pass 4) |
| **Foggy** | You can feel a question is there but can't phrase it yet | One loose line, then leave it |
| **Out of scope** | It sits past the destination | Write it down; it doesn't come back |

The sharp/foggy test is **whether you can state it, not whether you can answer it.** A question with a hard or unknown answer is still sharp if you can phrase it exactly — those are often the most important ones.

Out of scope uses a *different* test — **scope, not sharpness**. Something can be perfectly sharp and still be out of scope because it's past the destination. Rule it out explicitly and say why; it only returns if the destination itself moves, and that's a fresh scout.

Then order the sharp questions by **what unblocks the most** — the answer that collapses the largest number of other questions goes first.

### 4. Settle them, one at a time

Ask **one question at a time** and wait. Give your recommended answer with each one — but it's a recommendation, and the decision is the user's. Never answer a decision on their behalf and never batch questions; a wall of five is bewildering and gets one lazy reply.

After each answer, update the buckets:
- Did it **sharpen fog** into a real, statable question? Promote it.
- Did it **kill** questions that no longer matter? Drop them.
- Did it **move the destination**? Say so loudly and re-check the other buckets against the new one — everything was measured against the old line.

Don't pre-slice fog into fake questions to look productive. Fog is a signpost, not a to-do list.

### 5. Stop when the route is clear

Done means: no sharp questions left, and what fog remains is genuinely deferrable or out of scope. Close with the destination, the decisions that got there, and the concrete next step.

**Then hand off — don't build.** Scout produces a route, not a deliverable. Go to plan mode (or `/validate-plan` if a plan came out of it), then implement. If you find yourself writing production code inside a scout, you've overrun the skill.

The one exception is a **throwaway** — when a question genuinely can't be settled on paper ("does this state model feel right", "what should this look like"), build the smallest rough thing that answers it, look at it, keep the answer and bin the code.

## Crossing sessions — only if it actually needs to

Default to **one session, no artifact**. Most scouts fit, and a file written for a conversation that ended twenty minutes later is just litter.

Escalate to `/handover-save` when — and only when — one of these is true:
- the session is getting long enough that you'd lose the thread,
- the user wants to stop and pick it up later,
- a question is blocked on something outside the conversation (someone else's answer, access to provision, data to gather first).

The handover doc carries the destination and the three buckets. Resume with `/handover-resume`, which re-syncs drift before continuing. Spanning sessions is an escape hatch here, not the design.

## Output shape

Show the map when it **materially changes** — after the destination is named, after the fan-out, and whenever an answer reshuffles the buckets. Not every turn.

```
## Scouting: <the idea, one line>

**Destination:** <what done looks like — everything below is measured against this>

**Decided**
- <question> → <the answer>

**Open — sharp**
1. <precisely-stated question>   ← working this now
2. <...>

**Still foggy**
- <loose one-liner> — sharpens once <X> is settled

**Out of scope**
- <what was ruled out> — <why it's past the destination>
```

Close with: destination, the decisions in order, and the single next step.

## Guardrails

- **Breadth before depth.** Answering the first question before you've seen the whole space is the failure this skill exists to prevent.
- **Look it up, don't ask it.** A question you could have answered with a grep wastes the user's turn and their patience.
- **One question, then wait.** Recommend an answer every time; never decide for them.
- **Sharpness ≠ answerability.** The fog test is "can I state it," not "can I answer it."
- **Fog is not a backlog.** Leave it loose. Pre-slicing it into tickets invents work that the next answer may delete.
- **Out of scope is a scope call, not a step.** It goes in its own bucket, never into the decisions list.
- **The destination can move — announce it when it does.** Silently re-aiming invalidates every judgment made before it.
- **Don't build.** Decisions out, not deliverables. Throwaway prototypes are the only exception.
- **No file by default.** `/handover-save` only when the work genuinely outgrows the session.
- **Restraint gate.** "There's no fog here — you already know how to do this" is a real, valuable result. Never invent open questions to justify running the skill.

---

*Destination-first framing, the breadth-first fan-out, the state-it-vs-answer-it fog test, and the scope-vs-sharpness split adapted from Matt Pocock's `wayfinder` (github.com/mattpocock/skills). Its issue-tracker map, child-ticket machinery, and one-ticket-per-session rule are deliberately dropped — this collection persists across sessions with `/handover-save` instead.*
