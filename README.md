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
| `validate-plan` | Adversarially stress-tests an existing plan before executing — verifies assumptions against the real codebase, surfaces alternatives, red-teams failure modes, returns a proceed/reconsider verdict. |

## Commands

Slash-commands that work on **either GitHub or GitLab** (self-hosted or SaaS). They auto-detect the provider from the git remote — `github.com` → `gh`/PR, everything else → `glab`/MR — with an optional `.claude/repo-config.json` `"provider"` override. See [docs/provider-resolution.md](docs/provider-resolution.md) for the detection rule + the GitLab↔GitHub CLI cheat-sheet embedded in each command.

| Command | What it does |
| --- | --- |
| `mr-create` | Create a PR/MR for the current branch — commit-analysis title/body, stack-agnostic pre-flight checks, reviewer/label suggestions, fork-aware. |
| `mr-review` | Comprehensive code review of a PR/MR — fetches the diff, posts inline + summary comments. |
| `fix-review` | Read review threads on a PR/MR, fix the issues in code, reply, and resolve. |

## Install

Clone anywhere, then symlink into your Claude config so edits stay in sync:

```sh
git clone git@github.com:<your-username>/claude-skills.git ~/claude-skills

# back up existing dirs if you have them, then link:
ln -s ~/claude-skills/skills ~/.claude/skills

# commands: link the individual files (your ~/.claude/commands may hold other, local-only commands)
for f in mr-create mr-review fix-review; do ln -sf ~/claude-skills/commands/$f.md ~/.claude/commands/$f.md; done
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
