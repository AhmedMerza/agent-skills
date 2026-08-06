---
name: grill-me
description: Interview the user relentlessly about a plan or design until shared understanding — working the design tree in rounds, asking every question whose prerequisites are already settled. Trigger ONLY on an explicit request to be grilled - /grill-me, "grill me", "poke holes in this", "stress-test this plan", "interrogate me about this". Never infer it from a plan that merely looks underspecified, and never start it mid-task on your own judgment; it interrupts the work by design. Adapted from Matt Pocock's grill-me / grilling skills (github.com/mattpocock/skills).
---

Interview me relentlessly until we reach a shared understanding. Map the plan as a **design
tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already
settled — the questions you can ask *now* without guessing at answers you haven't heard yet.
Ask the whole frontier, then wait for my answers before starting the next round.

A question whose answer depends on another question still open in this round belongs to a
*later* round, not this one. That rule is what makes batching safe rather than merely faster:
everything asked together is genuinely independent, so no answer in a round can invalidate
another question inside it.

Ask each round through `AskUserQuestion` — one call, up to 4 questions, each with your
recommended answer listed first and marked "(Recommended)". If the frontier is wider than 4,
ask the 4 that unblock the most downstream decisions and carry the rest into the next round.
Anything that doesn't fit that tool's shape — genuinely open-ended, needs a paragraph of
context — ask in plain text alongside the call.

Each round's answers reshape the tree: settled decisions push the frontier outward and unblock
questions that were waiting on them. Recompute the frontier and ask the next round.

**Finding facts is your job, never mine.** When a frontier question needs a fact from the
codebase or the environment, dispatch a subagent to find it — never ask me something you could
look up yourself. Don't block on it either: a running exploration is just an unsettled
prerequisite, so only the questions downstream of it wait. Ask the rest of the frontier now.

The **decisions**, though, are mine. Put each one to me and wait.

The session is done when the frontier is empty — every branch of the tree visited, nothing left
silently assumed. Don't act on the plan until I confirm we've reached shared understanding.
