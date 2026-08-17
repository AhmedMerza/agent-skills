# Claude Skills

My local skill collection for Claude Code (and other agents). Every skill here is a
plain owned directory — `Source: local` in `npx skills list` — so nothing is tracked
or overwritten by `npx skills update`. Some were adapted from public skills and then
customized; provenance is noted where it applies.

Invoke any skill with `/<name>` or by describing the task so its trigger fires.

## Flows — which one do I reach for?

Chains that actually get used, start to finish. `→` is "then". Items in `backticks-with-slash`
(`/mr-create`) are commands in `~/.claude/commands/`, not skills. Steps in (parentheses) are
optional.

**Something's broken**
`/root-cause` → plan → `/validate-plan` → build → `/qa-sweep` → `/ship-check` → (`/spinoff`) → `/mr-create` → `/mr-review` or `/nitpick` → `/fix-review`

**New work, and you know the shape of it**
`/grill-me` → plan → `/validate-plan` → build → `/ship-check` → (`/spinoff`) → `/mr-create`
UI in the mix: `/design` before building → `/ui-polish` · `/animate` while → `/ui-audit` · `/ux-audit` after.

**The design system itself has rotted**
`/design-drift` — whole-repo, Flutter or Vue: is the system adopted, or decorative? Measures token adoption as ratios, finds scales that were never built and kits that exist twice, then scaffolds the missing layer and guards it. Standalone; feeds `/issue` or a branch.

**New work, and you *don't* know the shape of it**
`/scout` → destination named, route clear → rejoins the flow above (at `/grill-me`, or straight at plan if scout already settled it)

**Code you didn't write**
`/explain` → then whichever flow above fits

**You already made the call and want it challenged**
`/second-opinion` — one decision, head-to-head. Standalone; no chain.

**I've lost the thread of what you just said**
`/wait-what` — re-pitch from a running start, controlled English, domain terms kept. Standalone; no chain.

**Lost the thread in a long session — where are we, what's still open?**
`/where-were-we` — position on the flow, what landed, what's unresolved. Read-only; no chain.

**Stopping mid-work / session getting long**
`/handover-save` → `/clear` → `/handover-resume` (re-syncs drift before continuing)

**Release** — `/changelog-generate` → tag
**Shipped an API endpoint** — annotate the happy path → `/api-docs-complete` (the 401/429/403/422/500 you didn't write) → regenerate
**Translations** — `/i18n-sync`
**Unattended page sweep** — `/qa-crawl` + `/loop`
**Someone published a skill** — `/skill-compare`
**After a merge — did the skills themselves behave?** — `/skill-audit` (logs; proposes a skill edit only at n≥2)

### Traps in the chains

- **`/root-cause` diagnoses; it does not fix.** Its output is a diagnosis on purpose — plan *after* it, don't let it slide into patching.
- **`/validate-plan` and `/ship-check` are bookends, not substitutes.** Plan before code, diff before merge. Running one is not running the other.
- **`/mr-review` / `/nitpick` are line-level; `/ship-check` is holistic.** Clean, well-tested code that fixes the *wrong problem* passes review and fails ship-check. Run both before a risky merge.
- **`/scout` produces decisions, not code.** If it starts building, it overran — hand off to plan mode.
- **`/ponytail` is not a step.** It applies by default to any write/refactor/fix; you don't invoke it.
- **`/skill-audit` stage 1 never edits a skill, and n=1 is never enough.** It logs observable evidence and stops. One bad run is an anecdote; a bad prompt edit fails no test and degrades every future run silently.
- **`/spinoff` never touches the branch.** It lists follow-ups; it does not implement them. The instant it commits, it's scope creep and `ponytail` wins the argument. Its normal output is *nothing*.
- **`/ship-check` findings are not `/spinoff` findings.** Missing = blocks the merge, fix it in the branch. Cheap = blocks nothing, file it for later. If a "spinoff" would break production by not being done, it was a ship-check leak.
- **`/design` picks a system; `/design-drift` checks it held.** Same subject, opposite direction — one is greenfield and web-only, the other reads an existing repo and is stack-agnostic. Don't reach for `/design` on a codebase that already has tokens.
- **`/ui-audit` is per-page; `/design-drift` is per-repo.** A page audit can never see that you own two button kits or that no type scale exists — it only inspects what's on the page. Duplication and *absence* need the whole tree.

## Planning & Judgment

| Skill | What it does |
|-------|--------------|
| `validate-plan` | Adversarially stress-tests an existing plan before you execute it. Verdict: proceed / proceed-with-changes / reconsider. Restraint-gated — a clean "proceed" is valid. |
| `second-opinion` | Independently judges a decision you already made purely on technical merit (your instruction carries zero weight). "Ship it" is a real verdict. |
| `scout` | For when you don't know how to handle it *yet* — names what "done" looks like, fans out **breadth-first** over every open question, sorts them sharp / foggy / out-of-scope, then settles them one at a time until the route is clear. Produces decisions, not code; hands off to plan mode. One session by default, `/handover-save` only if it outgrows one. *(destination-first, the fan-out, the fog test and the scope split grafted from Matt Pocock's `wayfinder`; its tracker map and one-ticket-per-session rule dropped)* |
| `grill-me` | Interviews you relentlessly about a plan until shared understanding. Works the design tree in **rounds**: each round asks the whole **frontier** — every decision whose prerequisites are already settled — via one `AskUserQuestion` call with recommended answers, then recomputes as your answers push the frontier outward. Facts are the agent's job (subagent dispatch, non-blocking); decisions are yours. Done when the frontier is empty. **Explicit request only** — fires on `/grill-me` or on you asking in words ("grill me", "poke holes in this"), never inferred from a plan that just looks thin. *(adapted from Matt Pocock's `grill-me`/`grilling`; kept as one skill rather than his two-file split, and the round expressed through `AskUserQuestion` rather than a plain-text question format)* |
| `wait-what` | Repairs a message that didn't land — **re-pitches** from a running start instead of clarifying the confusing sentence (clarifying just adds jargon), assuming the gap was missing setup. Writes in ASD-STE100 Simplified Technical English — one idea per sentence, active voice, one word one meaning — **except** the project's own domain terms, which stay verbatim. Escalates to `grill-me`-style questioning if the re-pitch also misses. **Explicit request only** — fires on `/wait-what` or on you saying you didn't follow, but not when "wait, what" means alarm at an action rather than confusion at an explanation. *(adapted from Matt Pocock; `CONTEXT.md` generalized to whatever glossary the repo has, hedge-preservation caution and the escalation added)* |
| `where-were-we` | Catches you up **mid-session**, when the conversation ran long and the thread is gone. Reports *state, not history* — the goal in one sentence, what actually landed (cross-checked against `git`/`glab`, because the transcript claiming something shipped isn't evidence it did), where the work sits on the flow map, and what's still open. Distinguishes *not yet run* from *not on the board* so it doesn't invent pending steps. Open loops need evidence — a dropped promise, an unanswered question, an unaccepted finding — never "we could also…". Under 20 lines, read-only. Restraint-gated: "nothing open" is a real answer. *(custom, local)* |
| `ship-check` | The final gate before merging — checks a finished diff against the problem it claims to solve. Verdict: merge / fix-first / reconsider. Bookend to `validate-plan`. |
| `spinoff` | Harvests what the finished branch made **cheap** — the helper other sites now hand-roll, the deferred thing that just got small, the convention that forked. Gated on a real *before → now* cost delta: anything equally valid on `master` yesterday is discarded. Caps at 3, feeds `/issue`, and **never commits on the branch**. Restraint-gated — "nothing spun off" is the normal answer. |

## Investigation

| Skill | What it does |
|-------|--------------|
| `explain` | Reverse-engineers an unfamiliar feature/flow end-to-end into a navigable map with `file:line` anchors. Surfaces the surprising, load-bearing coupling. |
| `root-cause` | Investigates a bug against ground truth BEFORE any fix — reproduce, quantify, trace to true root cause, map blast radius. Output is a diagnosis, not a fix. *(symptom-triage table, upstream-bug search and the 3-strike stop grafted from garrytan/gstack@investigate)* |
| `qa-crawl` | Unattended, resumable crawl across a few hundred routes — one page per iteration, durable ledger in `.claude/qa-crawl/`, own git worktree (with its own app + asset stack) so it never touches your checkout. Inventory is classified from each controller's *return type*, so only real Vue/Inertia pages get crawled — JSON endpoints, Blade and redirects are excluded. Auto-fixes and verifies objective errors, records UI findings as *proposals* rather than applying them, opens one before/after MR per page that needed changes. Pair with `/loop`. Composes `qa-sweep` + `root-cause` + `ponytail` + `ship-check` + `ui-audit`/`ux-audit`. |
| `qa-sweep` | Drives the running app in a real browser to find what's actually broken — dead controls, failing forms, console errors, missing states, regressions one route over. Diff-aware by default: maps the branch diff to routes via `artisan route:list` / Inertia render sites, then tests those. Findings with repro steps + screenshot evidence; no fixes. *(diff-aware routing, two evidence tiers and the smoke-fallback guard grafted from garrytan/gstack@qa)* |

## Code Discipline

| Skill | What it does |
|-------|--------------|
| `ponytail` | Lazy-senior-dev restraint on any write/refactor/fix — YAGNI, reuse before writing, one line over fifty, no unrequested abstractions, design-for-reuse only when a second consumer is real. Auto-applies by default (not opt-in). *(adapted from DietrichGebert/ponytail, MIT)* |

## UI / UX

Which one you want depends on what "improve the design" means — they answer four different
questions. Vue and Flutter are both covered everywhere except `design`, which is web-only by
construction (its data is CSS and landing-page patterns).

| Skill | What it does | Vue | Flutter |
|-------|--------------|:---:|:---:|
| `design` | Industry-specific UI/UX recommendations BEFORE building — color palettes (hex), font pairings, layout patterns, anti-pattern warnings. Greenfield direction-setting, not for a repo that already has tokens. | ✅ | — |
| `animate` | Adds physical, subtle motion to a UI target. Proposes ideas, implements the chosen one as a choreographed combo. Owns *all* motion — the others hand it over. | ✅ | ✅ |
| `ui-polish` | Craft on one screen — type, colour, spacing, hierarchy, interaction states, UX copy, the invisible details. "It looks generic/unfinished." *(adapted from Emil Kowalski)* | ✅ | ✅ |
| `ui-audit` | Technical quality checks on one target — a11y, performance, theming, responsive, interaction states, anti-patterns. Scored 0–4 per dimension with severities. | ✅ | ✅ |
| `ux-audit` | Judges whether a page/flow actually works for its user via behavioral psychology tied to the page's one real goal. Advisory; ethics- and restraint-gated. | ✅ | ✅ |
| `design-drift` | Whole-repo design-system health — token adoption as ratios, scales never built, duplicate component kits, icon sprawl, RTL safety. Then scaffolds the missing layer and guards it. | ✅ | ✅ |

Rough order on an existing screen: `/ui-audit` (what's measurably broken) → `/ui-polish` (craft)
→ `/ux-audit` (does the flow work at all) → `/animate` (last). `/design-drift` is orthogonal —
it asks about the system, not the screen.

## Docs & Release

| Skill | What it does |
|-------|--------------|
| `api-docs-complete` | Finishes an API docblock that already has its happy path. Hunts the statuses that are real but **invisible in the handler** — `401` from auth middleware, `429` from a throttle inherited by a middleware *group*, `403` from a policy/guard object, `422` from validation, `500` from the catch-all, plus anything a same-class helper returns. Bodies are **captured from a real run**, never invented; the **generated output is then read back per endpoint**, because a malformed annotation block usually yields wrong docs rather than an error. Pairs with a CI floor check, but that check can't see middleware — which is the whole point. Restraint-gated: 200-or-401 only means done at two. |
| `changelog-generate` | Changelogs & release notes from commits/MRs. Auto-detects forge (GitHub `#` vs GitLab `!`, incl. self-hosted) and whether the repo uses tags — skips tag/version noise for tag-less repos. *(adapted from patricio0312rev/skills@changelog-writer, then customized)* |

## Localization

| Skill | What it does |
|-------|--------------|
| `i18n-sync` | Keeps en/ar translations in parity. Bundled scanner deep-diffs nested keys to find strings missing/empty in `ar` (silent English fallback); mirrors new keys to both locales. Tuned to a Vue-i18n + Laravel-lang layout. *(custom, local)* |

## Meta

| Skill | What it does |
|-------|--------------|
| `skill-audit` | Maintenance loop for the skills you already own — `skill-compare`'s sibling (that one guards intake, this one guards incumbents). **Stage 1** (after a merge, cheap) logs only *observable* evidence — an override, a correction, a misfire, rejected padding, a blocked instruction — to `~/.claude/skill-audit/log.jsonl`, and never edits a skill. **Stage 2** (rare) fires at n≥2 across *different* sessions — or 1 log entry + a matching `type: feedback` memory — and proposes a minimal diff for approval. Introspection ("I could've applied it better") is banned as evidence; logging nothing is the normal outcome. |
| `skill-compare` | Judges an external skill or skills repo against this collection — measures real content vs. framework boilerplate, prices the infrastructure it assumes, diffs it against the incumbent by procedure step, and tests the runnable core on a real repo fixture. Verdict: adopt / graft these mechanisms / skip. Restraint-gated — "skip, yours is leaner" is the common answer. |

---

## Adding a skill

- **Build your own:** create `~/.claude/skills/<name>/SKILL.md` with `name:` + `description:`
  frontmatter. It's `local` and update-proof by default.
- **Adapt a public one:** install via `npx skills add <owner/repo@skill> -g`, then to make it
  yours (edit-safe from `npx skills update`): copy it into a real `~/.claude/skills/<name>/`
  dir, remove the npx symlink + `~/.agents/.skill-lock.json` entry, and note provenance in a
  header comment.

## Naming conventions

- Group related skills with a shared prefix so they cluster (e.g. `changelog-generate`,
  and future `changelog-fix` / `changelog-check` — only build siblings when there's real work
  for them, not speculatively).
