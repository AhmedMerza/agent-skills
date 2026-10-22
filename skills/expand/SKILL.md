---
name: expand
description: "Widen a product or feature past competitor parity — research what competitors and the incumbent already give (on the web, yourself; never wait for the user to bring screenshots), then generate the ideas that make users pick this product: friction killers, control others deny them, little touches, things they didn't know they could have, and one or two level-changers. Invoke with /expand, or let /scout and /lead (world mode) call it. Also runs on your own initiative in LIGHT mode whenever a user-facing feature or screen is being planned, and in FULL mode at a product kickoff or milestone boundary. Output is a parity matrix plus a ranked, evidenced idea list for the user to approve in bulk — NOT code. Restraint-gated: internal tooling, refactors and bug fixes get no expand pass, and every idea must name the user and the moment it helps."
---

# /expand — what would make them choose us?

`scout` narrows: it names a destination and cuts everything past it. That is right for *getting there*, and wrong for *deciding where there should be*. Left alone, a plan converges on whatever the user already thought of — which is usually what competitors already ship. This skill runs before the narrowing and widens the target on purpose.

The bar: a customer should get **everything they'd get elsewhere**, plus the things that make them say "oh, that's nice" — the small touches, the time-savers they didn't know to ask for, the control others lock away, and an idea or two that changes what the product is.

Examples of the kind of thing this skill exists to find (from the POS product):
- **Friction killer** — a Talabat menu importer, so onboarding a café is a click, not a day of typing.
- **Didn't know they could** — pair a till or the owner's phone by scanning a QR code instead of typing a server address.
- **Control others deny** — an "open drawer" / no-sale button, where other systems only kick the drawer on a cash sale.
- **Little touch** — ring the customer's phone when the order is ready.
- **Level-changer** — the owner's phone becomes the back office.

**The restraint gate.** Skip this for internal tooling, refactors, migrations, bug fixes and anything with no end user. When you run it on your own initiative, use LIGHT mode and offer ideas at a natural boundary (plan time, end of a feature) — never interrupt implementation with them. Every idea must answer *who, at what moment, saves or gains what* — an idea that can't is generic slop ("AI insights dashboard") and gets cut.

## Modes

| Mode | When | Research | Output |
|---|---|---|---|
| **Full** | `/expand`; product kickoff; milestone boundary; `scout` on a new product; `lead` world mode | Web research fan-out + fresh-eyes ideation | Saved file: parity matrix + ranked ideas |
| **Light** | On your own initiative while a user-facing feature or screen is being planned; `scout` on a single feature | Reuse the saved full-mode file if one exists; at most a few targeted searches | 1–3 ideas inline, one line each, with cost |

## Full mode

### 1. Frame — two minutes, no questions you could answer yourself

Write down what the product **already has** first — from its README, docs and screens, not memory — or the parity matrix will list your own features as gaps. Then the product, the market (country/region, segment — e.g. "cafés and small restaurants in Bahrain"), the **personas** (e.g. owner, cashier, kitchen, end customer) and the **moments** in their day the product touches (opening, rush hour, closing, month end, onboarding). Mine the user's own pain history too (past transcripts, issues, handovers): their repeated complaints are the highest-signal input you have. Read the repo, the roadmap, and the decision log first so you know what already exists and what was already rejected — don't re-propose a rejected idea unless something changed, and say what.

### 2. Parity baseline — research it yourself

The user's screenshots are welcome input, never a prerequisite. You can usually find more, faster:

- **Pick 3–6 competitors**: the incumbent the customer uses today, the 1–2 global leaders in the segment, and the strongest **regional** players (local payment methods, delivery platforms, tax rules and language are where global products are weakest).
- **Sources, in order of honesty:**
  1. **Help centre / knowledge base / docs** — the most complete and least inflated feature list there is.
  2. **Changelogs and release notes** — what they're investing in now.
  3. **Pricing pages** — what's paywalled tells you what customers value.
  4. **Reviews and complaints** — app-store reviews, G2/Capterra, Reddit, local forums, and for developer tools the **GitHub issues sorted by reactions**. Complaints are the best gap list in the world: every "I wish it could…" is an idea with evidence attached. Web search surfaces forum threads poorly; fetch them directly (a site's own search, `hn.algolia.com/api/v1/search?query=…`, the issue tracker) instead of trusting search snippets.
  5. **Demo videos** — show the actual flow and how many taps it takes.
- **Fan out**: one research subagent per competitor (cheap model, told not to spawn its own subagents), each returning a feature list grouped by persona and moment, plus the top 5 complaints, with source URLs — and each claim marked **verified** (page opened) or **snippet** (search summary only). Weigh snippets accordingly. Don't pull pages into your own context.

Merge into a **parity matrix**: rows are capabilities grouped by persona/moment; columns are each competitor and **us** (✅ have / 🟡 partial / ❌ missing / 🗺️ on roadmap). Every ❌ that ≥2 competitors have is a **parity gap** — losing a deal over a missing basic is the most expensive failure, so these come first regardless of how boring they are.

### 3. Ideate — with fresh eyes, through six lenses

Run one **fresh-context subagent** that has *not* seen the plan or this conversation — give it only the product, market, personas and moments, and the review complaints. A context that already holds the plan reproduces the plan. Then do your own pass. Use these lenses:

| Lens | Question |
|---|---|
| **Pain from reviews** | What do competitors' users complain about that we could simply not have? |
| **Friction killers** | What does the user do by hand today — retyping, re-entering, phoning, copying between systems — that we could remove? |
| **Didn't know they could** | What would save them time that they'd never think to ask for? (Importers, pairing by QR, defaults that are already right.) |
| **Control they're denied** | What do other products lock away or hide behind support tickets? |
| **Little touches** | What small detail would make the moment feel cared for? |
| **Level-changers** | 1–2 ideas that change what the product *is*, not just what it does. |

Integrations with the platforms the market already lives on (delivery apps, payment gateways, accounting, messaging) are worth an explicit sweep. They're often where a regional product beats a global one.

### 4. Filter and rank

Cut anything that can't name **persona + moment + gain**. For the rest, give each:
- **Evidence** — a review quote, a competitor that has it (parity) or that conspicuously lacks it (differentiator), or a real observed workflow.
- **Cost** — S / M / L, judged against what the codebase already has (an importer is S if the parsing exists).
- **Tag** — `parity` (must have), `v1`, `next`, `later`, or `no`, with a one-line reason.

Ethics gate: honest value only. No dark patterns, no manufactured urgency, no lock-in tricks dressed as features.

### 5. Hand back — the user approves in bulk

```
## Expand: <product / feature>

**Parity gaps (must-have)** — <n>
| Capability | Who has it | Us | Cost |

**Ideas, ranked**
| # | Idea | Who · moment · gain | Lens | Evidence | Cost | Tag |

**My top 3:** <idea> — <why>; …
**Cut:** <idea> — <why> (kept so it isn't re-proposed)
```

Ask for approval of the list as a whole ("take parity + 1, 2, 4, 7 into v1?"), with your recommendation — not one question per idea. Approved items go into the roadmap or the scout destination; filing issues still needs the user's yes.

**Save the run** to `docs/product/expand-<product>.md` in the main product repo (or the lead's home folder for multi-repo products) with the date and source URLs. Research is the expensive part; light-mode runs reuse it, and it's refreshed at the next milestone or after ~60 days.

## Light mode

When a user-facing feature or screen is being planned and nobody asked: read the saved full-mode file if there is one, look at the feature through the six lenses, and offer **at most three** ideas in one block at the end of your plan or message:

```
💡 Expand: (1) <idea> — <persona · moment · gain>, cost S; (2) …  Want any of these in?
```

Then carry on. Nothing gets built without a yes. If nothing clears the bar, say nothing — no block is the correct output most of the time.

## Guardrails

- **Research is your job.** Never ask the user what competitors have; go find out, cite the URL.
- **Parity before delight.** A missing basic loses the deal; a missing delighter only loses the wow.
- **Fresh eyes for ideation.** The context that wrote the plan can't see past it.
- **Every idea names who, when, and what they gain.** Otherwise cut it.
- **Bulk approval, not an interview.** One ranked list, one recommendation, one answer.
- **Light mode is short and quiet.** Three ideas at most, at a boundary, and none if none is good.
- **Don't build.** Ideas out; scout, the roadmap and the user decide what gets made.
