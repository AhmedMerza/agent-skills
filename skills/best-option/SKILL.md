---
name: best-option
description: "Analyze a set of options the user must choose between — an AskUserQuestion prompt, a plan with alternative approaches, a \"which one should I pick\" moment — and return a decisive recommendation. Invoke with /best-option whenever the user is presented with multiple options and wants to know which is best by best practices and long-term robustness: explains every option honestly, checks whether a hybrid or an unlisted alternative beats them all, recommends ONE, and states concretely why each rejected option loses. Also use proactively when you are about to ask the user to choose between approaches — run this analysis instead of handing them a bare menu. Make sure to use this skill whenever the user says things like \"which option\", \"help me choose\", \"what's the best approach here\", \"explain the options\", or replies to a choice prompt with uncertainty — even if they don't explicitly ask for an analysis."
---

# /best-option — Which option should I pick, and why?

The user has been handed a choice — options in a question prompt, alternative approaches in a plan, competing libraries/patterns — and they don't want to guess. They want the thing a good senior engineer gives them: **every option explained in plain terms, one decisive recommendation grounded in best practices and long-term consequences, and an honest account of why the others lose.**

This is not `second-opinion` (which judges a decision the user *already made*). This is for the moment *before* the decision: the menu is on the table and nothing is chosen yet.

## The one rule that defines this skill

**Decide, don't survey.** The user invoked this because a neutral list of trade-offs ("it depends!") is exactly what they don't want. Weigh the options honestly, then commit to one recommendation with a substantive reason. A wrong-but-reasoned recommendation they can push back on is more useful than a balanced shrug. The only acceptable hedges: a genuine toss-up (say which single axis should break the tie, and your lean anyway) or a missing piece of information that actually changes the answer (ask for it, but still state what you'd pick if the answer is the common case).

## The five moves

### 1. Restate what's actually being decided
One or two lines naming the real decision and the constraints that matter (existing stack, team size, scale, deadline, whether this is throwaway or load-bearing). Choices are rarely between "options A/B/C" — they're between trade-off bundles, and naming the real stakes up front keeps the comparison honest.

### 2. Explain every option fairly
For each option: what it actually means in practice, its genuine strengths (steelman it — the strongest version, not a strawman), and its real costs. If an option is only viable under assumptions that don't hold here, say so. If you can't articulate why an option is reasonable, you don't understand the decision well enough yet — go read the code or docs before judging.

### 3. Check the menu itself
The options offered are someone's first draft, not the full space. Before comparing, ask whether the best answer is off the menu:
- **A hybrid** — two options combined beat either alone (e.g. B's safe default plus D's audit trail).
- **A missing alternative** — the standard, simpler, or framework-native path nobody listed.
- **A wrong question** — the menu is solving a symptom; the real fix sits upstream and makes the choice moot.

If one of these genuinely beats the best listed option, it enters the comparison as its own option and can win. **Restraint gate:** most menus are fine as offered — don't invent a hybrid or an exotic alternative to look thorough. A new option must beat the best listed one on a concrete axis, not merely differ.

### 4. Compare on the axes that decide it — with a long-term lens
Evaluate the options head-to-head, but **only on axes that genuinely differentiate them** — don't pad with ties. Weight the axes by *long-term* consequences, since that's what the user asked for:

- **Maintainability** — who reads/changes this in a year? Does it fight or fit the codebase's existing conventions?
- **Failure modes** — how does each option break, at 3am, at 10x scale? Which failures are loud and recoverable vs. silent and corrupting?
- **Reversibility & lock-in** — how expensive is it to walk back? Data migrations, vendor lock-in, API commitments, sunk-cost traps.
- **Ecosystem & best practices** — is this the community-standard path with docs and hiring pool, or a bespoke one? Is the dependency actively maintained?
- **Complexity budget** — does the option's sophistication match the actual requirement (YAGNI), or is it paying for scale you'll never have — or under-building something that will have to be ripped out?
- **Security & correctness** — attack surface, edge-case correctness, data-integrity risk.

Ground every claim in the real codebase or real facts — "doesn't fit conventions" means you looked at the conventions; "unmaintained" means you checked; "the framework can't do X" means you checked the docs for the version in use. Verify, don't opine in the abstract.

### 5. Recommend ONE — and explain each rejection
Pick the winner and give the substantive reason it wins on the axis that matters most *for this project's horizon*. Then, for each rejected option, state concretely why it loses — not "also good but…", but the specific axis where it falls short or the assumption it requires that isn't true. If the runner-up is close, say what would have to change for it to win ("if you expected 100x traffic, B would be the pick — you don't, so A").

## Output shape

```
## Best option: <the decision, one line>

**What's really being decided:** <the stakes and constraints, 1-2 lines>

**The options:**
- **A — <name>:** <what it means in practice; real strengths; real costs>
- **B — <name>:** <...>
- **C — <name>:** <...>

**Off the menu:** <a hybrid / missing alternative / reframe that beats the listed options, and why — or "none, the listed options cover it">

**Head-to-head:** <only the axes that differentiate — who wins each and why>

**Recommendation: <option>** — <the substantive reason it wins long-term>
**Why not the others:** <option>: <concrete reason it loses> · <option>: <concrete reason it loses>
**Doing it right:** <1-3 must-dos that decide whether the pick succeeds in practice — omit if none>
```

Keep explanations in plain language — the user may not know the jargon, so spell out terms briefly when you use them.

## Guardrails

- **Best practices means *their* project's practices too.** "Industry standard" that fights everything in their codebase is not the best option for them. Existing conventions, stack, and team familiarity are legitimate weight on the scale.
- **Long-term doesn't mean over-engineering.** The robust long-term choice is often the *simpler* one. Don't recommend the enterprise-grade option for a problem that will never need it — unnecessary complexity is itself a long-term liability.
- **If an option is dangerous, say so plainly.** Security holes, data-loss risk, unmaintained dependencies — these aren't trade-offs to balance, they're disqualifiers. Name them as such.
- **Ask only when the answer changes the pick.** If a missing fact (expected scale, deadline, whether this is throwaway) would flip the recommendation, ask — but state your pick under the most likely assumption so the user can just confirm.
- **Restraint gate for the runner-up.** Don't manufacture flaws to make the winner look cleaner. If two options are genuinely close, say it's a toss-up, name the tie-breaker axis, and still give your lean.
