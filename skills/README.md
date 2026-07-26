# Claude Skills

My local skill collection for Claude Code (and other agents). Every skill here is a
plain owned directory — `Source: local` in `npx skills list` — so nothing is tracked
or overwritten by `npx skills update`. Some were adapted from public skills and then
customized; provenance is noted where it applies.

Invoke any skill with `/<name>` or by describing the task so its trigger fires.

## Planning & Judgment

| Skill | What it does |
|-------|--------------|
| `validate-plan` | Adversarially stress-tests an existing plan before you execute it. Verdict: proceed / proceed-with-changes / reconsider. Restraint-gated — a clean "proceed" is valid. |
| `second-opinion` | Independently judges a decision you already made purely on technical merit (your instruction carries zero weight). "Ship it" is a real verdict. |
| `grill-me` | Interviews you relentlessly about a plan until shared understanding. **Manual only** — never auto-triggers. *(adapted from Matt Pocock)* |
| `ship-check` | The final gate before merging — checks a finished diff against the problem it claims to solve. Verdict: merge / fix-first / reconsider. Bookend to `validate-plan`. |

## Investigation

| Skill | What it does |
|-------|--------------|
| `explain` | Reverse-engineers an unfamiliar feature/flow end-to-end into a navigable map with `file:line` anchors. Surfaces the surprising, load-bearing coupling. |
| `root-cause` | Investigates a bug against ground truth BEFORE any fix — reproduce, quantify, trace to true root cause, map blast radius. Output is a diagnosis, not a fix. |

## Code Discipline

| Skill | What it does |
|-------|--------------|
| `ponytail` | Lazy-senior-dev restraint on any write/refactor/fix — YAGNI, reuse before writing, one line over fifty, no unrequested abstractions, design-for-reuse only when a second consumer is real. Auto-applies by default (not opt-in). *(adapted from DietrichGebert/ponytail, MIT)* |

## UI / UX

| Skill | What it does |
|-------|--------------|
| `design` | Industry-specific UI/UX recommendations BEFORE building — color palettes (hex), font pairings, layout patterns, anti-pattern warnings. |
| `animate` | Adds physical, subtle motion to a UI target on web (Vue 3 / Vuetify) or Flutter. Proposes ideas, implements the chosen one as a choreographed combo. |
| `ui-polish` | UI polish, animation decisions, interaction patterns, and the invisible details that make interfaces feel great. *(adapted from Emil Kowalski)* |
| `ui-audit` | Technical UI quality checks — a11y, performance, theming, responsive, interaction states, anti-patterns. Scored report with severities. Vue 3 + Vuetify + Inertia. |
| `ux-audit` | Judges whether a page/flow actually works for its user via behavioral psychology tied to the page's one real goal. Advisory; ethics- and restraint-gated. |

## Docs & Release

| Skill | What it does |
|-------|--------------|
| `changelog-generate` | Changelogs & release notes from commits/MRs. Auto-detects forge (GitHub `#` vs GitLab `!`, incl. self-hosted) and whether the repo uses tags — skips tag/version noise for tag-less repos. *(adapted from patricio0312rev/skills@changelog-writer, then customized)* |

## Localization

| Skill | What it does |
|-------|--------------|
| `i18n-sync` | Keeps en/ar translations in parity. Bundled scanner deep-diffs nested keys to find strings missing/empty in `ar` (silent English fallback); mirrors new keys to both locales. Tuned to the app Vue-i18n + Laravel-lang layout. *(custom, local)* |

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
