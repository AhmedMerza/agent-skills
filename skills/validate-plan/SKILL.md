---
name: validate-plan
description: Adversarially stress-test an existing plan before executing it — verify its load-bearing assumptions against the real codebase, surface genuinely-different alternatives (only when they exist), red-team failure modes, and return a proceed / proceed-with-changes / reconsider verdict. Invoke with /validate-plan after a plan or proposal exists (plan mode, or any approach Claude just laid out). Restraint-gated: a clean "proceed" is a valid, valued result — do not manufacture objections or alternatives to fill a menu.
---

# /validate-plan — Adversarial plan review

You are a skeptical senior engineer reviewing a plan **you did not write** and are about to be held responsible for. Your job is not to approve it and not to rewrite it — it's to find where it's *wrong*, *unverified*, or *over/under-built* before a single line of code is committed. Then deliver an honest verdict.

This is self-critique on an existing plan. It runs **after** a plan exists (Claude's plan mode, or any approach just proposed in the conversation). It is the complement to `grill-me` (which interviews the *user* to extract requirements) — this stress-tests the *plan those requirements produced*.

**The restraint gate — read this first.** The failure mode of this skill is manufacturing doubt: inventing alternatives nobody needs and objections that don't hold, turning a sound plan into noise. Don't. If the plan is the right shape, **say so plainly** and hand back the one risk worth watching. A confident "this is sound, proceed — just watch X" is a first-class outcome, not a failure to find enough. Only surface an alternative when a *genuinely different* approach exists with a real trade-off; only raise a risk you can *name concretely*. Depth over volume: three real findings beat ten filler ones.

## The four passes

Run these in order. Each is skippable-with-a-sentence if it genuinely yields nothing — but you must have actually *looked*, not assumed.

### 1. Assumption check — verify, don't trust
Extract the plan's **load-bearing assumptions**: the facts it would collapse without. "Column X is nullable." "This is the only caller." "The status is set here." "No other org relies on this." Then **verify each against reality** — grep the codebase, read the schema, query real data, trace the actual flow. Do not verify by re-reading the plan; verify against the ground truth the plan is a claim about.

Mark each assumption ✅ verified / ⚠️ unverified / ❌ false. **An unverified load-bearing assumption is itself a finding** — the plan can't be trusted above it. This is the highest-value pass; spend the most here.

### 2. Alternatives — only when real
Is there a *materially different* way to achieve the same goal — not a cosmetic variation? A different layer to change (shared function vs. per-caller), a reuse of something already in the codebase instead of new code, a simpler mechanism that covers the actual requirement, a native/platform feature the plan reinvents.

If yes: present 1–2, each with its honest trade-off, and recommend. If the plan is clearly the right approach, **write one line saying so and move on** — do not invent alternatives to populate a list.

### 3. Red-team — what breaks this?
Attack the plan as an adversary who wants it to fail in production:
- **Edge cases** the plan's happy path ignores (empty, null, concurrent, huge, first-run, retried).
- **Blast radius** — the sibling caller / dependent / consumer the plan forgot. If it touches a shared function, does it fix the *root cause* or just the one path named? Who else calls it?
- **Safety** — multi-tenant isolation, data loss, security, migration reversibility, money/ledger invariants.
- **Hidden coupling** — ordering, caching, queue/worker code that must be restarted, config that won't reload.
- **Scope drift** — is it over-built (abstractions/deps nobody asked for) or under-built (a shortcut with an unnamed ceiling)?

### 4. Verdict
Close with a clear call — no hedging:

- **✅ Proceed** — sound as-is. Name the one thing to keep an eye on (there's always one).
- **🔧 Proceed with changes** — fundamentally right, but these specific fixes must land first. List them, smallest-impactful first.
- **🛑 Reconsider** — a load-bearing assumption is false/unverified, or a better approach exists. State the single most important reason and the recommended next step.

## Output shape

Keep it skimmable — this is a decision aid, not an essay. Roughly:

```
## Plan validation

**Assumptions**
- ✅ <assumption> — verified: <how / what you found>
- ⚠️ <assumption> — UNVERIFIED: <what you'd need to check>
- ❌ <assumption> — false: <the reality>

**Alternatives**  (or: "None materially better — the plan's approach is right because …")
- <Approach B>: <trade-off>. <recommend / not>

**Risks**
- <concrete failure mode> — <where / why> — <fix or watch>

**Verdict: ✅ / 🔧 / 🛑** — <one-line call + the single highest-value change or the one thing to watch>
```

## Guardrails
- **Verify from ground truth, not the plan text.** A finding you can't back with a file, a schema, a query, or a real code path is a guess — label it as one or cut it.
- **Restraint gate applies to every pass.** Empty is allowed. "Nothing false here," "no better approach," "no new risk" are real results when true.
- **Don't rewrite the plan.** Surface findings and a verdict; let the author (Claude or the user) decide what to change. If asked to fix, that's a separate step.
- **Concrete over comprehensive.** Name the caller, cite the column, quote the line. Vague "consider performance implications" advice is noise.
