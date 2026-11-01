---
name: stats-design
description: "Think ahead before building or changing any stats, report, KPI or dashboard screen — work out who reads each number, what they do right after, and the chain of questions they will ask next (which ones → why → compared to what → where it concentrates → what can I do), then define every metric once and check the data exists. Use on your own initiative whenever a stats/report/KPI/dashboard screen, tile or metric is being planned or its meaning is changing — admin and ops apps included. Also /stats-design. Output is a short ranked list of reader chains for the user to approve in bulk, grouped one issue per reader-and-moment — NOT code. Restraint-gated: a label, rounding or layout fix on an existing metric, or a bug in one (use root-cause), gets no pass."
---

# /stats-design — what will they ask after they read this number?

A dashboard built to the request answers the first question and nothing after it. Then the users come back, one question at a time, and each answer ships as its own feature, months apart, with fix-up commits after each. Real history (oreem-admin late orders, 2026-07 → 2026-10): the count shipped, then "which orders?", then "how long did each take?", then "late against the customer's promise or the driver's ETA?", then presets and sorts one by one. Every step was predictable on day one by asking what the reader does next.

This skill asks that before the first screen is built.

**Restraint gate.** Skip it for a label, rounding, colour or layout fix on an existing metric, and for a bug in one (`root-cause`). Run it when a new stats/report/KPI/dashboard screen, tile or metric is planned, or when what a metric *counts* is changing. An admin or ops app is user-facing: its staff are the end users.

## 1. Readers — from the code first, then ask only the gaps

If the project already has a `docs/stats.md`, read it and only fill what is missing (a new role, a new screen). Otherwise:

1. **Code.** Roles and permissions, route/menu guards, which screens and data each role can open, and which **actions** each role can take (reassign, call, block, refund, message). A role that can see a number but take no action on it reads it differently from one that can.
2. **Paper trail.** Issues, handover docs, CHANGELOG, and `git log` of the existing stats screens. Past reworks are the best evidence of the questions readers actually ask — note each one as a step in a chain.
3. **Ask the user only what the code cannot say**, at most five questions, once per project: what decision each role makes from the number, how often they look (live / daily / month end), what they do when it looks bad, who they report it to. Give your guess with each question.
   Infer each role's cadence from what the role **does** (dispatch acts within the hour, a manager reviews each morning, finance closes the month), never from the screen's current default period — that default is the thing under review.
4. **Save** to the app repo's `docs/stats.md`, section **Who reads what**: role → moment → decision → actions available.

## 2. The question chain — at least three steps past the headline

For each reader and moment, write the chain they will walk. Go past what was asked; stop where no action follows.

| Step | The reader's question | Typical answer on screen |
|---|---|---|
| Verdict | Is this good or bad? | the number against a target or threshold, coloured by one rule |
| Which ones | Which records are behind it? | every count opens its list |
| Why | What happened on each? | per-record detail: durations, timeline, the step that failed |
| Compared to what | Bad against which bar? | every reference clock that exists (promise, estimate, SLA), previous period, peers |
| Where it concentrates | Who / where / when? | breakdown and ranking by each real dimension in the data (person, place, type, time of day) |
| What now | What can I do from here? | the role's own action, one tap from the record |

**Whose clock.** For "compared to what", list every timestamp and target on the underlying record — promised or scheduled time, estimate/ETA from routing or dispatch, SLA threshold, created/started — and name whose bar each one is (the customer's promise, the company's SLA, the worker's estimate). Each is a separate comparison readers will ask for. Do not settle on the one the metric already uses: the customer judges by the promise, the manager judges the worker by the estimate.

**Every ranked list.** Apply the same treatment to each list on the screen (people, places, accounts — not just the first one): sortable by count *and* by rate, a minimum-volume floor before a rate ranking means anything, and a check for any row cap or limit that silently drops members (a big, punctual account cut off a "top 500" list).

Then the lenses readers always come back for. Check **every** lens against the screen as it stands and report one line per lens in the output (covered / proposed / not relevant and why) — none is skipped silently:
- **Time:** the ranges the role's cadence implies (today, yesterday, week, month, year, custom), the previous period beside the current one, and for month- or year-end readers the same period last year.
- **Empty and edge states:** when the headline is zero (nothing late, nothing failed) the breakdown and lists stay reachable — "zero" is itself the answer someone checks — and the screen still reads right when a dimension has one big member or the period is still open.
- **Open vs closed:** does the metric count things still in progress (an overdue, unfinished record)? Decide explicitly; it is the most common silent undercount.
- **Take it away:** export or share, if the reader reports upward.

## 3. Define every metric once

Before any number goes on a screen, it gets an entry in **Metric definitions** in the `docs/stats.md` of the repo that **computes** it (usually the backend); the app's file links there. Each entry is short and points at code — the code stays the truth, the doc is the index:

- **Meaning** in one plain line, and whether it is **live** or **historical**
- **Clock:** which timestamp it is measured from and against
- **Computed in:** `file` / symbol — exactly one place

The reader needs the meaning too: every number on screen carries its one-line meaning (a subtitle, info tap or footnote) in the reader's words — what it counts and over which window. A figure the server did not send, or declined to compute, shows as unavailable with the reason, never as 0.

Then search client and server for the same name and near-synonyms. **Stop and raise it with the user** when the name already means something else, or when a client re-derives a number the server computes — do not add another meaning. This is how one word ends up counting three different things and screens disagree.

## 4. Data check

For every chain step: does the data exist today? Mark each **app-only** (data already returned), **needs backend** (name the field or breakdown), or **not collected** (say what would have to be recorded). This sequences the work inside the issue instead of discovering it halfway.

## 5. Parity

Run `expand` in light mode for the segment's leaders (reuse its saved file if one exists): what do their reports let this role do that ours does not? Fold real gaps into the chains; skip parity for its own sake.

## Output

At most **seven** items, ranked by how much reader pain they remove, **grouped one issue per reader-and-moment** so a whole chain ships together:

```
### <role> — <moment> (e.g. Ops manager — morning review)
Decision: <what they decide>    Next action: <what they do>
Chain: verdict → which ones → … (✓ exists / + new)
Metrics: <names, linked to definitions; any clash flagged>
Needs backend: <fields/breakdowns, or "none">
Evidence: <role/permission, past rework, queued request, parity gap>
```

Then one **Lens check** block for the whole screen: time · empty/edge · open vs closed · take it away · whose clock · every ranked list — one line each.

The user approves in bulk. Write everything not approved under **Considered, not now** in `docs/stats.md` with the reason, so the next run does not re-propose it blind. Issue creation goes through the user.

## Guardrails

- **Evidence or cut.** Every item names a reader, a moment and an action, backed by code, history or the user. "AI insights" is not an item.
- **Chain, not catalogue.** The value is predicting the *next* question, not listing every possible slice. Seven is a cap, not a target.
- **One meaning per name.** A clash stops the work until the user decides.
- **Don't build.** This produces the chains and definitions; implementation follows in its own branch.
