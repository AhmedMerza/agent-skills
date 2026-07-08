# claude-skills

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) skills, synced across machines.

## Skills

| Skill | What it does |
| --- | --- |
| `animate` | Adds professional, physical, choreographed motion to a UI target (Vue 3 / Vuetify or Flutter). |
| `design` | Industry-specific UI/UX recommendations (colors, type pairings, layout patterns) before building. |
| `explain` | Reverse-engineers an unfamiliar feature end-to-end into a navigable `file:line` map — flow, key components, and the non-obvious coupling/gotchas. |
| `grill-me` | Interviews you relentlessly about a plan until you reach shared understanding. Adapted from [Matt Pocock's grill-me](https://github.com/mattpocock/skills). |
| `root-cause` | Investigates a bug against ground truth before any fix — reproduce, quantify prevalence, trace the true root cause, map the blast radius. |
| `second-opinion` | Judges whether a decision you directed (code placement, migration approach, data model) is actually best, or if a better way exists — merit only, authorship ignored. |
| `ponytail` | Lazy-senior-dev coding discipline — YAGNI, reuse/stdlib first, no unrequested abstractions. Adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT). |
| `ui-audit` | Technical UI quality checks (a11y, performance, theming, responsive, interaction states) → scored report. |
| `ui-polish` | UI polish, animation decisions, and the invisible details that make interfaces feel right. Adapted from Emil Kowalski's design engineering philosophy. |
| `ux-audit` | Judges whether a page/flow actually works for the human using it — cognitive load, friction, clarity — tied to the page's one real goal. Advisory, ethics-gated (flags dark patterns). |
| `validate-plan` | Adversarially stress-tests an existing plan before executing — verifies assumptions against the real codebase, surfaces alternatives, red-teams failure modes, returns a proceed/reconsider verdict. |
| `ship-check` | The final gate before merging — audits a finished diff against the problem it claims to solve: what's missing (unpatched sibling caller, unhandled branch, no backfill), where it breaks on edge cases, whether the approach is right. `validate-plan`'s bookend. Returns a merge/fix-first/reconsider verdict. |

## When to reach for which

Most of these skills guard a different stage of *"am I doing the right thing?"* — chained across the life of a change:

```
root-cause  →  validate-plan  →  ponytail  →  ship-check  →  mr-review
(diagnose)     (vet the plan)    (build)     (vet the diff)  (review code)
```

`grill-me` goes up front when the requirements themselves are fuzzy; `second-opinion` spot-checks any single decision along the way.

**Commonly confused — same spirit, different moment:**

- `validate-plan` vs `ship-check` vs `mr-review` — adversarial review at three points: the **plan** (pre-code) → the **finished diff** (pre-merge) → the **code lines** (review).
- `second-opinion` vs `validate-plan` — one **decision** judged head-to-head vs a whole **plan** stress-tested.
- `ui-audit` vs `ux-audit` — "is the UI built **correctly**?" (a11y/perf/theming) vs "does it actually **work for the human**?" (friction/cognitive load).
- `design` / `animate` / `ui-polish` — *before* building (colors/type/layout) vs *while* building (motion, interaction details).

## Commands

The MR/PR commands work on **either GitHub or GitLab** (self-hosted or SaaS). They auto-detect the provider from the git remote — `github.com` → `gh`/PR, everything else → `glab`/MR — with an optional `.claude/repo-config.json` `"provider"` override. See [docs/provider-resolution.md](docs/provider-resolution.md) for the detection rule + the GitLab↔GitHub CLI cheat-sheet embedded in each command.

| Command | What it does |
| --- | --- |
| `mr-create` | Create a PR/MR for the current branch — commit-analysis title/body, stack-agnostic pre-flight checks, reviewer/label suggestions, fork-aware. |
| `mr-review` | Comprehensive code review of a PR/MR — fetches the diff, posts inline + summary comments. |
| `fix-review` | Read review threads on a PR/MR, fix the issues in code, reply, and resolve. |
| `commit` | Smart commit — auto-branches off the detected default branch, stack-aware format/test, conventional message, push. Provider-agnostic. |
| `issue` | Turn a natural-language description into a structured issue with codebase context, labels, and template selection. **GitLab-only** (`glab`). |
| `browse` | Authenticated, scrolling Playwright screenshots of a running app page. Needs the `scripts/browse.mjs` helper (see Install) + Playwright installed in the target repo; app-specifics come from an optional `.claude/browse-config.json`, credentials only from `PW_EMAIL`/`PW_PASS` env. |

## Install

Clone anywhere, then symlink into your Claude config so edits stay in sync:

```sh
git clone git@github.com:<your-username>/claude-skills.git ~/claude-skills

# back up existing dirs if you have them, then link:
ln -s ~/claude-skills/skills ~/.claude/skills

# commands: link the individual files (your ~/.claude/commands may hold other, local-only commands)
for f in mr-create mr-review fix-review commit issue browse; do ln -sf ~/claude-skills/commands/$f.md ~/.claude/commands/$f.md; done

# the /browse command needs its helper script on the standard path:
mkdir -p ~/.claude/scripts && ln -sf ~/claude-skills/scripts/browse.mjs ~/.claude/scripts/browse.mjs
```

Or copy them if you'd rather not symlink:

```sh
cp -r ~/claude-skills/skills/. ~/.claude/skills/
cp ~/claude-skills/commands/*.md ~/.claude/commands/
```

Restart Claude Code to pick up newly-added skills/commands. Invoke any of them with `/<name>`.

## Updating

Edit a skill or command (in either `~/.claude/...` or `~/claude-skills/...` — they're the same files if symlinked), then:

```sh
cd ~/claude-skills && git add -A && git commit -m "update <skill>" && git push
```

On another machine: `cd ~/claude-skills && git pull`.
