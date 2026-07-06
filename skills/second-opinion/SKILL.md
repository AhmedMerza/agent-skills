---
name: second-opinion
description: Independently judge whether a specific decision the user directed — where to put code, how to do a migration, which data model, which approach — is actually the best choice, or whether a better one exists. Invoke with /second-opinion when the user says "I told you to do it this way, but check if my way is actually better" or asks you to sanity-check a call they already made (often already implemented). Judges the decision purely on technical merit — the fact that the user instructed it carries ZERO weight. Restraint-gated: "your way is right, ship it" is a real and valued verdict; never manufacture a "better" option to look useful.
---

# /second-opinion — Is the chosen way actually the best way?

The user has made a specific decision and *told you to do it that way* — put this file here, structure the migration like this, model the data this shape, take this approach. Now they want the thing they can't easily get from someone who just follows instructions: an **honest, independent judgment of whether that decision is actually the best one** — or whether you'd have done it differently and why.

This is not `validate-plan` (which reviews a whole multi-step plan for soundness and risk). This is a **head-to-head on one decision**: their choice vs. the best alternative, judged on merit, with a straight verdict.

## The one rule that defines this skill

**The fact that the user instructed it carries zero weight in the technical comparison.** Your default is to defer to them; here they have explicitly switched that off and asked to be challenged. So judge the decision as if it landed on your desk with no author attached. Don't soften the verdict to be agreeable, and don't flip to contrarian to seem rigorous — just weigh it honestly and say which is better. Agreeing when they're right is as valuable as catching them when they're wrong; both require that you *actually looked*.

## The three moves

### 1. Steelman their choice first
State the decision as you understand it, and the *real* case **for** it — the strongest version, not a strawman. This proves you understood it and keeps the exercise from being reflexive disagreement. If you can't articulate why their choice is reasonable, you don't understand it well enough to judge it yet — go read the code.

### 2. Derive the alternative(s) independently
Ignore what they picked and ask: what would *you* reach for here? Usually one or two real contenders — a different location/layer, a different migration strategy, a different data shape, reusing something already in the codebase instead of the new thing. Then compare their choice against those **head-to-head on the axes that actually matter for this kind of decision**, e.g.:
- **Code placement / structure** → cohesion (does it live with what it's about?), reuse vs. duplication, blast radius of future changes, discoverability, does it fight existing conventions.
- **Migration / schema** → reversibility, lock time / downtime on the real table size, data-loss risk, backfill cost, does it play nice with existing rows and other tenants, MariaDB/MySQL footguns.
- **Approach / algorithm** → correctness on edge cases, complexity vs. the actual requirement (YAGNI), performance at real scale, maintainability.

Only raise axes that genuinely differentiate the options — don't pad the table with ties.

### 3. Verdict — straight, no hedging
- **✅ Your way is best** — and here's the substantive reason (not just "it's fine"). Ship it.
- **🔁 The alternative is better** — here's the concrete reason it wins on the axis that matters, and what switching costs (especially if it's already implemented — is the switch worth the rework, or is their way "good enough to keep"?).
- **⚖️ Genuine toss-up** — they're equivalent; here's the single axis to decide on, and my lean.

If it's already implemented and the alternative is only *marginally* better, say that too — "the alternative is slightly cleaner but not worth redoing" is an honest, useful verdict that respects the sunk cost.

## Output shape

```
## Second opinion: <the decision, one line>

**Their choice, steelmanned:** <what it is + the real case for it>
**Alternative(s):** <what you'd consider instead>
**Head-to-head:** <only the axes that differentiate — their choice vs. alt, who wins each>

**Verdict: ✅ / 🔁 / ⚖️** — <which is actually better + the substantive reason; if switching, whether it's worth the rework>
```

## Guardrails
- **Merit only — authorship is invisible.** "You told me to" is not a point in the decision's favor. Judge it as an anonymous proposal.
- **Ground it in the real code.** Cohesion, lock time, blast radius, reuse — these are checkable against the actual codebase, schema, and table sizes. Verify; don't opine in the abstract.
- **Restraint gate.** "Your way is right" is a first-class verdict. Never invent a marginally-different alternative to justify running the skill — if their call is sound, say so plainly and briefly.
- **Respect sunk cost honestly.** For an already-built decision, weigh the *rework cost* of switching, not just the abstract superiority. Better-in-theory that isn't worth redoing should be labeled as such.
- **Decide, don't survey.** End on one verdict and a recommendation, not a neutral list of trade-offs for them to sort out.
