# agent-skills

My personal collection of agent skills, synced across machines — works with [Claude Code](https://docs.claude.com/en/docs/claude-code) and Kimi Code CLI.

**Full descriptions, per-flow traps, provenance and authoring conventions live in [docs/handbook.md](docs/handbook.md).** This page is the index.

## Layout

- `skills/` — portable skills, loaded by both tools as-is
- `commands/` — Claude Code slash commands (invoked as `/<name>`)
- `kimi-skills/` — Kimi Code CLI ports of the commands (invoked as `/skill:<name>`)
- `docs/handbook.md` — the detailed companion

## Skills

| Skill | What it does |
| --- | --- |
| `animate` | Physical, choreographed motion for a UI target (Vue/Vuetify, Flutter). |
| `design` | Industry-specific colors, type pairings, layout patterns — before building. |
| `design-drift` | Whole-repo design-system health: token adoption, missing scales, duplicate kits. |
| `explain` | Maps an unfamiliar feature end-to-end into a navigable `file:line` map. |
| `video-teardown` | Reverse-engineers a product from its video walkthroughs; diffs against your codebase. |
| `scout` | No plan yet — names what "done" looks like, settles open questions breadth-first. |
| `grill-me` | Interviews you about a plan until shared understanding. |
| `root-cause` | Diagnoses a bug against ground truth before any fix. Output: a diagnosis, not a patch. |
| `second-opinion` | Judges one decision head-to-head, merit only. |
| `wait-what` | Re-pitches a message that didn't land, in plain controlled English. |
| `where-were-we` | Lost the thread of a long session? Reports state, not history — landed vs open. |
| `qa-crawl` | Unattended, resumable crawl over hundreds of routes; one before/after MR per page. |
| `qa-sweep` | Drives the running app in a real browser to find what's broken. Reports, never fixes. |
| `ponytail` | Lazy-senior-dev discipline — YAGNI, reuse first. Auto-applies to any coding task. |
| `ui-audit` | Technical UI checks (a11y, perf, theming, responsive) → scored report. |
| `ui-polish` | Craft on one screen — type, color, spacing, interaction states. |
| `ux-audit` | Does the page work for the human — friction, cognitive load. Ethics-gated. |
| `validate-plan` | Adversarially stress-tests a plan before executing. Verdict: proceed/reconsider. |
| `ship-check` | Final gate before merge — is the change complete against the problem it claims to solve? |
| `prove-the-test` | Breaks the thing a new test guards; confirms the test actually goes red. |
| `spinoff` | Banks what a finished branch made cheap — as a backlog, never a bigger diff. |
| `api-docs-complete` | Completes an API docblock with the real-but-invisible statuses (401/403/422/429/500). |
| `changelog-generate` | Changelogs and release notes from commits/PRs; forge- and tag-aware. |
| `i18n-sync` | Keeps locale files in key parity; finds silent-fallback strings. |
| `tool-compare` | Is this external tool worth adopting for THIS project? Reads source, not README. |
| `skill-compare` | Prices an external skill against this collection. Verdict: adopt/graft/skip. |
| `skill-audit` | Watches installed skills for misbehavior; proposes fixes only on repeat evidence. |

## When to reach for which

The skills form a pipeline — each guards one stage of *"am I doing the right thing?"*:

```
something's broken:
  root-cause → validate-plan → ponytail → qa-sweep → mr-create → ship-check → mr-review → fix-review → (spinoff)
  (diagnose)   (vet the plan)  (build)    (run it)   (commit,     (vet the     (review     (fix the      (bank the
                                                      push, open)  diff)        code)       findings)     leftovers)

a new idea:
  scout → grill-me → validate-plan → …same tail…
  (find the   (sharpen
   destination) the plan)
```

**This map is the single source of truth for the chain.** Steps not in the skills table
(`mr-create`, `mr-review`, `fix-review`, …) are **commands**, not skills — Claude Code finds
them in `commands/`, Kimi Code CLI in `kimi-skills/`. The MR is opened **first**, then the
gates run against it; the tail can loop (structural fixes go back to `mr-review`).
Commonly-confused pairs, per-flow traps, and the reasoning behind the order: [docs/handbook.md](docs/handbook.md).

## Commands

Claude Code slash commands (Kimi: same workflows as `/skill:<name>` from `kimi-skills/`).
The MR/PR commands auto-detect GitHub (`gh`) vs GitLab (`glab`) from the git remote.

| Command | What it does |
| --- | --- |
| `mr-create` | Open a PR/MR for the current branch — title/body, pre-flight checks, reviewer suggestions. |
| `mr-guide` | Writes the reviewer's guide into the PR description (product-level, auto-screenshots). |
| `mr-review` | Reviews a PR/MR — five parallel reviewers, inline + summary comments. |
| `fix-review` | Fixes review findings in code, replies, resolves threads. |
| `commit` | Smart commit — auto-branch, format/test, conventional message, push. |
| `issue` | Structured issue from natural language. **GitLab-only**. |
| `browse` | Authenticated scrolling Playwright screenshots of a running page. |
| `handover-save` / `-list` / `-resume` | Durable session plans in gitignored `.claude/handover/` (Kimi: `.kimi-code/handover/`). |
| `checkpoint` | Triage a long session: what's DONE vs LIVE; recommends continue / compact / handover. |

## Install

Clone anywhere, then point your tool's config at the repo so edits stay in sync.

### Claude Code

```sh
git clone https://github.com/AhmedMerza/agent-skills.git ~/agent-skills

# back up existing dirs if you have them, then link:
ln -s ~/agent-skills/skills ~/.claude/skills

# commands: link the individual files (your ~/.claude/commands may hold other, local-only commands)
for f in mr-create mr-guide mr-review fix-review commit issue browse handover-save handover-resume handover-list checkpoint; do ln -sf ~/agent-skills/commands/$f.md ~/.claude/commands/$f.md; done

# the /browse command needs its helper script on the standard path:
mkdir -p ~/.claude/scripts && ln -sf ~/agent-skills/scripts/browse.mjs ~/.claude/scripts/browse.mjs
```

Or copy them if you'd rather not symlink:

```sh
cp -r ~/agent-skills/skills/. ~/.claude/skills/
cp ~/agent-skills/commands/*.md ~/.claude/commands/
```

Restart Claude Code to pick up newly-added skills/commands. Invoke any of them with `/<name>`.

### Kimi Code CLI

Add both directories to `extra_skill_dirs` in `~/.kimi-code/config.toml`:

```toml
extra_skill_dirs = [ "~/agent-skills/skills", "~/agent-skills/kimi-skills" ]
```

Then run `/reload` or start a new session. The command ports are `type: flow`, so they only run when you invoke them — `/skill:mr-create`, `/skill:commit`, etc. (`kimi-skills/browse/browse.mjs` is a symlink into `scripts/`, so `/skill:browse` needs no extra install step.)

**Recommended: configure a `[secondary_model]` pool** in the same `config.toml` — it enables the Agent tool's `model` parameter, and `mr-review` pins its five parallel reviewers to the pool's cheap/fast alias (measured: same verdicts at ~half the tokens and ~a quarter of the wall clock):

```toml
[secondary_model]
default_model = "kimi-code/kimi-for-coding"

[secondary_model.models]
"kimi-code/kimi-for-coding" = "Default. Full-capability model, same as the main session."
"kimi-code/kimi-for-coding-highspeed" = "Cheaper and faster. Use for parallel subagent fan-out (review swarms) and routine chores."
```

Kimi parses skill frontmatter strictly: keep it to `name` + `description` (+ optional `type`), and **double-quote any description containing `: `** (escaping inner quotes as `\"`) — an unquoted one fails parsing and the skill is silently skipped.

## Updating

Edit a skill or command (in `~/agent-skills/...` — or via the symlinks/config above, they're the same files), then:

```sh
cd ~/agent-skills && git add -A && git commit -m "update <skill>" && git push
```

On another machine: `cd ~/agent-skills && git pull`.
