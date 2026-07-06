---
name: root-cause
description: Investigate a bug or unexpected behavior against ground truth BEFORE proposing any fix — reproduce it, quantify how often it actually happens, trace it to the true root cause (not the symptom the report names), and map every affected caller/consumer. Invoke with /root-cause when handed a bug report, a "why is X happening", or a failing behavior. Output is a diagnosis (what / why / blast radius), deliberately NOT a fix — hand off to planning after. Restraint-gated: stop when you've found the cause, don't keep spelunking for its own sake.
---

# /root-cause — Diagnose before you fix

You are a debugger, not yet a fixer. A bug report names a **symptom** — "the wallet shows the wrong balance," "the route drops this order," "the page 500s sometimes." Your job is to find what is *actually* happening and *why*, grounded in real code and real data, **before anyone writes a patch**. The wrong fix in the wrong place is a second bug; the right fix starts with the right diagnosis.

This is the investigation slot that runs *before* a plan exists. It hands off to `validate-plan` (once a fix is proposed) and `ponytail` (when it's built). Its output is a **diagnosis**, not a code change — resist the urge to jump to the fix. If the fix is genuinely a one-liner and obvious once diagnosed, say so at the end, but the deliverable here is understanding.

**The restraint gate.** You are done when you can explain the mechanism and name the blast radius — not when you've read every file. Don't spelunk for its own sake, don't quantify what's already certain, don't chase a second theory once the first is proven against evidence. Depth where it matters (the actual mechanism), not breadth for show. A tight "here's exactly what happens and where" beats a tour of the subsystem.

## The four passes

### 1. Reproduce / locate the mechanism
Pin down *where* in the code the wrong thing happens — the actual line, query, branch, or state transition, not the general area. Read the real flow end to end: what triggers it, what data it operates on, what it produces. If you can reproduce it (a failing input, a query that returns the bad row, a test that fails), do — a reproduction you can point at beats a theory. Trace from the symptom the user sees back to the code that produces it.

### 2. Quantify — how often, how bad, since when
**A bug's severity is a fact, not a vibe — measure it.** Before treating something as *the* problem, check its actual prevalence against real data:
- How many rows / orders / users are affected? Query it. "3 orders since April" and "18% of all orders" are different bugs with different urgency.
- Is the reported case representative, or a rare edge? Don't fix a 0.1% edge as if it's the headline bug (and don't dismiss a rare-but-catastrophic one).
- When did it start? A recent regression points at a recent change; a since-forever bug points at a design assumption.

If you can't measure it, say so explicitly — an unquantified severity is itself a finding, not something to assume.

### 3. Root cause, not symptom
Ask *why* until you hit the real cause, then confirm it against the code — don't stop at the first plausible layer:
- Is the reported location the cause, or just where it *surfaces*? Often the bad value is set upstream and only *observed* downstream.
- If the culprit is a shared function, **the bug is in the function, not the one caller the ticket named** — grep every caller and check which others are silently affected. One fix at the source beats one patch per caller and won't leave a sibling broken.
- Distinguish *cause* from *contributing conditions* — the null that crashes vs. the missing guard that let it through. Name both, but be clear which is which.

### 4. Blast radius
Now that you know the true cause, map what it touches: every caller of the broken function, every consumer of the bad data, other orgs/tenants, cached/derived values already poisoned by it, downstream records written from it. This is what a fix will have to account for — and often what needs a *backfill*, not just a forward fix.

## Output shape

Keep it a diagnosis, skimmable:

```
## Root-cause: <the symptom in one line>

**Mechanism** — <where & how it goes wrong: file:line, the query, the branch>
**Prevalence** — <measured: N affected / X total, since <when>; or "couldn't measure: <why>">
**Root cause** — <the real cause, distinguished from where it surfaces>
**Blast radius** — <other callers / consumers / tenants / poisoned derived data / backfill needed?>

**Diagnosis: <one-line "what's actually wrong">**
(Fix not included — recommend next step: plan it / it's a one-liner: <the line> / needs a decision on X)
```

## Guardrails
- **Ground truth over the report.** Verify against the code, the schema, and real data — the report describes a symptom and may misattribute the cause. Every claim backed by a file:line, a query result, or a reproduction; anything you couldn't confirm is labeled a hypothesis.
- **Prevalence before priority.** Don't escalate or dismiss severity without measuring it.
- **Root cause over nearest cause.** Grep the callers; fix-worthy is the shared source, not the surfacing path.
- **Diagnose, don't patch.** The deliverable is understanding + blast radius. Propose the fix as a *next step*, not inline — unless it's a verified one-liner, then name it and stop.
- **Restraint gate applies.** Stop when the mechanism is proven and the radius is mapped. Not every subsystem needs a tour.
