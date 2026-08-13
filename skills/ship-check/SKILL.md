---
name: ship-check
description: The final gate before merging — adversarially check a FINISHED change against the problem it claims to solve. Re-anchor to the original ask, then hunt for what's MISSING (a sibling caller left unpatched, one enum branch unhandled, no backfill for already-broken rows, another tenant), where it BREAKS on edge cases, and whether the approach is even right (weighing rework cost, since it's built). Invoke with /ship-check right before opening/merging an MR, or when the user says "is this actually done / safe to ship / did we miss anything". Spawns one independent reviewer agent on the diff, because you cannot reliably review code you just wrote. Returns a merge / fix-first / reconsider verdict. This is validate-plan's bookend — that runs on the PLAN before coding; this runs on the DIFF before merging. Restraint-gated: "✅ ship it" is a first-class verdict — don't manufacture gaps to look thorough.
---

# /ship-check — Is this finished change actually safe to merge?

The code is written. Tests maybe pass. `mr-review` maybe found no bugs. And it can *still* be wrong — because it fixes the symptom instead of the cause, because it left half the problem unpatched, or because it breaks on the first null/empty/concurrent input the happy path never met. This is the **last gate before merge**: step back from the lines and ask whether the change, *as a whole*, correctly and **completely** solves the problem it was made for.

**What this is NOT — so you invoke the right thing:**
- Not `validate-plan` — that stress-tests a **plan** *before* code exists. This is its bookend: same adversarial spine, pointed at the **finished diff** *before* merge.
- Not `mr-review` / `nitpick` — those are line-level bug/quality sweeps ("is the code good?"). This is holistic ("does the change solve the *right* problem, completely?"). Clean, well-tested code that fixes the wrong thing passes `mr-review` and **fails** `ship-check`.
- Not `verify` — that *runs the app* to observe behavior. This is static reasoning against the code, the schema, and real data. (They pair well — run both before a risky merge.)
- Not `second-opinion` — that's a head-to-head on *one decision*. This audits the *whole change* against its goal, and borrows second-opinion's rework-cost weighing for the approach pass.

**The restraint gate — read first.** The failure mode is manufacturing gaps: inventing missing cases that aren't real and edge cases that can't happen, to look thorough on a change that's genuinely done. Don't. A confident **"✅ ship it — solid, complete, edges covered"** is a first-class outcome. Only flag a gap you can *name concretely* (this caller, this row, this input). Three real findings beat ten filler ones.

## Before the passes: re-anchor to the problem

You cannot judge whether a fix is complete without knowing *exactly* what it was supposed to do. **Restate the original problem in one line** — from the ticket, the root-cause diagnosis, the user's ask, the MR description. If you can't state it crisply, go read it before judging. Every pass below is measured against *this line*, not against "does the code look reasonable."

## Then: one independent pass — you cannot review your own edits

If you wrote the code you are about to judge, your judgment is contaminated. You will re-derive the
same reasoning that produced the bug and find it sound. This is not a discipline problem, and no extra
checklist line fixes it: on the record, `/ship-check` has cleared branches that a five-agent fan-out
then found CRITICALs in — with pass 2's "did fixing X break Y?" present and followed both times.

So **spawn one agent that did not write the code.** Do it *first*, before pass 1, so it works while
you do — it costs wall clock only if you wait on it.

```
Agent(subagent_type="general-reviewer", model="sonnet", description="Independent ship-check pass", prompt="
Review this finished change cold. You did NOT write it — assume none of it is correct.

The problem it must solve: <the problem line from the re-anchor step>
Read the diff yourself: git diff <BASE>..<HEAD>   (do NOT check out anything — the working tree is shared)

Report only concrete defects, each with file:line:
- What it MISSES — an unpatched sibling caller, an unhandled enum/status branch, rows already broken
  that no backfill heals, another tenant/org, one side of a read/write pair.
- Where it BREAKS — name the specific input and the specific line.

Return a list of findings, or [] if you find nothing real. Do not pad.
")
```

Read its findings **last**, once passes 1–3 are done, and fold them into the verdict. Where it
contradicts you, **verify against the code before deciding** — it read the diff without the story you
have been telling yourself about it, and that is the entire reason it is there.

Skip it only for a change you did not write, where you are already the independent reader.

## The four passes

Run in order. Each is skippable-with-a-sentence if it genuinely yields nothing — but you must have *looked*, against ground truth (code, schema, real data), not assumed.

### 1. Completeness — what's MISSING? (the headline pass)
The most dangerous bug in a finished fix is the part that isn't there. A missing branch throws no error and fails no test — it just silently doesn't happen. Hunt for it:
- **Sibling callers / the shared source.** If the fix patched one call site of a shared function, grep **every** caller — are the others still broken? The right fix is usually at the source; a per-caller patch leaves siblings bleeding.
- **Unhandled branches.** Every enum case, every status, every `if` without its `else`, every type in the union — does the fix cover *all* of them, or just the one in the report?
- **Already-broken data.** A forward fix stops *new* breakage; it doesn't heal rows already poisoned. Does this need a **backfill / migration**, not just a code change? (Especially for wrong balances, bad statuses, corrupt derived values.)
- **The other side.** Fixed the write but not the read? The API but not the consumer? The happy path but not the failure/rollback path? Backend but not the mobile/web client that also calls it?
- **Other tenants / orgs.** Does the fix assume org 1's shape? Multi-tenant blind spots hide here.
- **Loose ends from the original ask.** Re-read the problem line. Is *every* part of it addressed, or did one sub-requirement quietly get dropped?

### 2. Where it breaks — edge cases the happy path ignores
Attack the finished code as an adversary who wants it to fail in production:
- **Degenerate inputs** — null, empty collection, zero, negative, huge, duplicate, first-run (no prior state), retried (already ran once).
- **Concurrency & ordering** — two requests at once, the row that changed between read and write, the job that runs before its dependency.
- **Did fixing X break Y?** — the regression the change introduces. What used to work that this now touches?
- **Failure modes** — external call times out, transaction rolls back, cache is stale, queue worker holds old code (needs restart?).
Name the *specific* input and the *specific* line it breaks at — not "consider edge cases."

### 3. Correctness of approach — is this even the right fix?
Step back from "does it work" to "should it be done this way." Would a *materially different* approach be better — a different layer, reusing something already in the codebase, a simpler mechanism that covers the real requirement, a native feature it reinvents? **But it's already built** — so weigh the *rework cost* honestly (like `second-opinion`): "better in theory but not worth redoing" is a valid, useful call. Only raise this if a genuinely different approach exists with a real trade-off; otherwise one line: "approach is right because …" and move on.

### 4. Verdict — a merge decision, no hedging
- **✅ Ship it** — solves the real problem, complete, edges hold. Name the one thing to keep an eye on post-merge (there's always one).
- **🔧 Fix these first** — fundamentally right, but these specific gaps must land before merge. List them, most-important first, each with *where*.
- **🛑 Reconsider** — it fixes the wrong thing, leaves the core problem unsolved, or a materially better approach is worth the rework. State the single most important reason and the next step.

## When this runs after review fixes

Fixes written in response to a review are the highest-risk code on the branch: written fast, on the
assumption the reviewer already framed the problem correctly, and landing in code the existing tests
were written against. Split them by kind, because only one kind bites:

- **Structural** — deleted a branch, moved a decision across a lock/transaction/guard, changed who owns
  a lock, changed a constructor's visibility, collapsed two paths into one. **Re-run `/mr-review`
  before merging.** Every self-introduced CRITICAL on the record followed a change of this shape.
- **Additive** — added a test, tightened a validation, added a null guard, renamed for clarity. Merge
  on the tests. A fresh review round buys nothing here.

**If a third round still finds something, stop iterating and split the MR.** Three rounds of
structural fixes means the change is too large to converge — each fix is landing in code the previous
round just moved, and the next round will find the next one.

## Output shape

Skimmable — this is a merge decision, not an essay.

```
## Ship-check: <the change, one line>

**Problem it must solve:** <the original ask, one line — everything below is judged against this>

**Missing / incomplete**
- <the caller/branch/row/tenant/backfill that's not covered> — <where> — <why it matters>
  (or: "Complete — checked callers X/Y, all enum branches, no backfill needed because …")

**Where it breaks**
- <specific input> → <specific line/behavior> — <fix or accept>
  (or: "Edges hold — null/empty/concurrent/retry all handled at …")

**Approach**
- <materially-better alternative + rework-cost call>  (or: "Right approach because …")

**Independent pass**
- <what the cold reviewer found that you didn't, and whether it held up against the code>
  (or: "Agreed — returned [] on the same diff." / "Skipped: I didn't write this change.")

**Verdict: ✅ ship / 🔧 fix first / 🛑 reconsider** — <the decisive reason + the one thing to watch>
```

## Guardrails
- **Judge against the problem, not the code's looks.** Re-anchor first; a change that "looks fine" but doesn't fully solve the stated problem fails here.
- **Missing > present.** The absent branch, the un-patched sibling, the skipped backfill — these fail no test and are the whole reason this skill exists. Spend the most effort in pass 1.
- **Ground every finding.** file:line, a query result, a real row, a named caller. No abstract worries — if you can't name where it breaks, it's not a finding.
- **Grep the callers.** A shared-source fix is only complete if every caller is checked. "The ticket named one" is not "there is one."
- **Weigh rework honestly.** For approach objections on built code, compare *switching cost*, not just abstract superiority.
- **Never overrule the independent agent from memory.** If it flags something you "know" is fine, that knowledge is the contaminated part — open the file. Dismiss it only with a file:line reason.
- **Restraint gate.** "✅ ship it" is a real verdict. Never invent a missing case or a marginal alternative to justify running the skill. If it's done, say so and hand back the one thing to watch.
- **Decide, don't survey.** End on one merge verdict, not a neutral list of trade-offs.
