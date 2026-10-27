# agent-skills

My personal collection of agent skills, synced across machines — works with [Claude Code](https://docs.claude.com/en/docs/claude-code), Kimi Code CLI, and Codex.

**Full descriptions, per-flow traps, provenance and authoring conventions live in [docs/handbook.md](docs/handbook.md).** This page is the index.

## Layout

- `skills/` — shared skills, loaded by Claude and Kimi directly; Codex uses these unless an override exists
- `codex-skills/` — Codex-specific versions of shared skills and Codex ports of command workflows
- `commands/` — Claude Code slash commands (invoked as `/<name>`)
- `docs/handbook.md` — the detailed companion

## Skills

| Skill | What it does |
| --- | --- |
| `animate` | Physical, choreographed motion for a UI target (Vue/Vuetify, Flutter). |
| `design` | Industry-specific colors, type pairings, layout patterns — before building. |
| `design-drift` | Whole-repo design-system health: token adoption, missing scales, duplicate kits. |
| `explain` | Maps an unfamiliar feature end-to-end into a navigable `file:line` map. |
| `video-teardown` | Reverse-engineers a product from its video walkthroughs; diffs against your codebase. |
| `story-site` | Scroll-story landing + product page for a brand (from a brief or a reference reel): concept, stages, configurator, asset costs, visuals prompt + Fable build prompt. |
| `scout` | No plan yet — names what "done" looks like, settles open questions breadth-first. |
| `expand` | Widens a product target past competitor parity: researches competitors itself (docs, changelogs, reviews), then ranks friction killers, little touches and level-changers for bulk approval. Light mode runs on its own initiative. |
| `grill-me` | Interviews you about a plan until shared understanding. |
| `root-cause` | Diagnoses a bug against ground truth before any fix. Output: a diagnosis, not a patch. |
| `best-option` | Handed a menu of options? Explains each, checks for a better unlisted one, picks ONE. |
| `second-opinion` | Judges one decision head-to-head, merit only. |
| `court` | Puts a product/business idea on trial: prosecution, defense, a blind jury of personas, a judge. Explicit request only. |
| `wait-what` | Re-pitches a message that didn't land, in plain controlled English. |
| `where-were-we` | Lost the thread of a long session? Reports state, not history — landed vs open. |
| `lead` | Session becomes a coordinator over subagent teammates — never codes; worktree per writer, batched questions, one-branch-at-a-time integration with a merged-HEAD check. |
| `qa-crawl` | Unattended, resumable crawl over hundreds of routes; one before/after MR per page. |
| `qa-sweep` | Drives the running app in a real browser to find what's broken. Reports, never fixes. |
| `persona-walkthrough` | Blind persona subagents (new customer, artist, admin…) use the app cold on an emulator and report where they get lost, how it feels, and why — each finding with a code-verified fix. |
| `ponytail` | Lazy-senior-dev discipline — YAGNI, reuse first. Put its ladder in `CLAUDE.md` to make it always-on; as a skill it rarely auto-fires. |
| `ui-audit` | Technical UI checks (a11y, perf, theming, responsive) → scored report. |
| `ui-polish` | Craft on one screen — type, color, spacing, interaction states. |
| `ux-audit` | Does the page work for the human — friction, cognitive load. Ethics-gated. |
| `validate-plan` | Adversarially stress-tests a plan before executing. Verdict: proceed/reconsider. |
| `ship-check` | Final gate before merge — is the change complete against the problem it claims to solve? |
| `prove-the-test` | Breaks the thing a new test guards; confirms the test actually goes red. |
| `spinoff` | Banks what a finished branch made cheap — as a backlog, never a bigger diff. |
| `api-docs-complete` | Completes an API docblock with the real-but-invisible statuses (401/403/422/429/500). |
| `daily` | Morning briefing from yesterday's assembled project snapshot — never queries production. |
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
  scout → expand → grill-me → validate-plan → …same tail… → mr-guide
  (find the   (widen past  (sharpen       (vet the plan)        (skim before
   destination) parity)      the plan)                             you merge)
```

**This map is the single source of truth for the chain.** Every step is a skill in `skills/` (Claude also gets them as `/` commands via `commands/` symlinks); `codex-skills/` holds Codex-specific wording where it differs. The MR is opened **first**, then the
gates run against it; the tail can loop (structural fixes go back to `mr-review`).
Commonly-confused pairs, per-flow traps, and the reasoning behind the order: [docs/handbook.md](docs/handbook.md).

## Proactive routing on every machine

The pipeline above is documentation, so it does not by itself make an agent choose a skill. Run `python3 ~/agent-skills/scripts/install-guidance.py` after cloning or pulling. It installs the short routing policy from `guidance/AGENT_WORKFLOW.md` into the global instruction file of every installed agent CLI (see Install) using a replaceable managed block, preserving other instructions. Re-run it after the policy changes; restart each agent or start a new session to load it. The policy asks agents to name and actually apply the relevant skill at each stage, while skipping gates that do not fit the task. An explicit skill invocation still wins.

## Commands

Claude Code slash commands (all of them are also skills in `skills/`; Kimi runs them as `/skill:<name>`).
The MR/PR commands auto-detect GitHub (`gh`) vs GitLab (`glab`) from the git remote.

| Command | What it does |
| --- | --- |
| `mr-create` | Open a PR/MR for the current branch — title/body, pre-flight checks, reviewer suggestions. |
| `mr-guide` | Skimmable pre-merge page: what you must know, decisions vs alternatives (best-option), before/after screenshots for UI. |
| `mr-review` | Reviews a PR/MR — up to five parallel reviewers matched to the diff, inline + summary comments. |
| `fix-review` | Fixes review findings in code, replies, resolves threads. |
| `commit` | Smart commit — auto-branch, format/test, conventional message, push. |
| `issue` | Structured issue from natural language. **GitLab-only**. |
| `browse` | Authenticated scrolling Playwright screenshots of a running page. |
| `handover-save` / `-list` / `-resume` | Durable session plans in gitignored `.claude/handover/` (Kimi: `.kimi-code/handover/`). |
| `checkpoint` | Triage a long session: what's DONE vs LIVE; recommends continue / compact / handover. |

## Install

One command per machine covers every agent CLI that is installed (Claude Code, Codex, Kimi, Gemini CLI, Antigravity `agy`, Qwen Code; others are skipped):

```sh
git clone https://github.com/AhmedMerza/agent-skills.git ~/agent-skills
~/agent-skills/scripts/install-skills.sh && python3 ~/agent-skills/scripts/install-guidance.py
```

`install-skills.sh` links `skills/*` into each CLI's skills dir (Codex gets its `codex-skills/` port where one exists), links `commands/` and the helper scripts for Claude, and never overwrites a local skill (`--replace-local` backs it up first). `install-guidance.py` writes the routing policy into each CLI's global instructions file. Both are idempotent; re-run after `git pull`, then start a new session. To support another CLI, add one line to `TARGETS` in each script. `scripts/install-codex.sh` remains as an alias.

| Agent | Routing file | Skills dir |
| --- | --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` | `~/.claude/skills` (+ `~/.claude/commands`) |
| Codex | `~/.codex/AGENTS.md` | `~/.codex/skills` |
| Kimi | `~/.kimi-code/AGENTS.md` | `~/.claude/skills` via `extra_skill_dirs` (below) |
| Gemini CLI, `agy` | `~/.gemini/GEMINI.md` | `~/.gemini/skills`, `~/.gemini/config/skills` |
| Qwen Code | `~/.qwen/QWEN.md` | `~/.qwen/skills` |

Every command (`mr-create`, `mr-review`, `fix-review`, `mr-guide`, `commit`, `issue`, `claim`, `browse`, `checkpoint`, `handover-*`, `mr-approve/assign/list/merge/review-request/status`, `review`, `usage-week`) lives in `skills/` so every agent gets them; `commands/<name>.md` is a symlink to the same file for Claude. Some of their steps use Claude-specific helpers (`~/.claude/scripts`, parallel subagents); the installer places the scripts, and agents without subagents run those steps sequentially.

Manual alternative (Claude Code only):

```sh
ln -s ~/agent-skills/skills ~/.claude/skills
for f in ~/agent-skills/commands/*.md; do ln -sf $f ~/.claude/commands/; done
mkdir -p ~/.claude/scripts && for f in browse.mjs diff-anchor.py mr-note.py; do ln -sf ~/agent-skills/scripts/$f ~/.claude/scripts/$f; done
```

Or copy them if you'd rather not symlink:

```sh
cp -r ~/agent-skills/skills/. ~/.claude/skills/
cp ~/agent-skills/commands/*.md ~/.claude/commands/
```

Restart Claude Code to pick up newly-added skills/commands. Invoke any of them with `/<name>`.

### Kimi Code CLI

Point `extra_skill_dirs` in `~/.kimi-code/config.toml` at the skills:

```toml
extra_skill_dirs = [ "~/agent-skills/skills" ]
```

Then run `/reload` or start a new session, and invoke any of them as `/skill:<name>` (`/skill:mr-create`, `/skill:commit`, …).

**Recommended: configure a `[secondary_model]` pool** in the same `config.toml` — it enables the Agent tool's `model` parameter, and `mr-review` pins its five parallel reviewers to the pool's cheap/fast alias (measured: same verdicts at ~half the tokens and ~a quarter of the wall clock):

```toml
[secondary_model]
default_model = "kimi-code/kimi-for-coding"

[secondary_model.models]
"kimi-code/kimi-for-coding" = "Default. Full-capability model, same as the main session."
"kimi-code/kimi-for-coding-highspeed" = "Cheaper and faster. Use for parallel subagent fan-out (review swarms) and routine chores."
```

Kimi parses skill frontmatter strictly: keep it to `name` + `description` (+ optional `type`), and **double-quote any description containing `: `** (escaping inner quotes as `\"`) — an unquoted one fails parsing and the skill is silently skipped.

### Codex

Clone this repository on each PC, then link its skills into Codex:

```sh
~/agent-skills/scripts/install-skills.sh
```

The installer links each `skills/` entry, using its `codex-skills/` version when one exists. It also installs Codex-only workflows such as `mr-review`. It leaves existing skill directories untouched and reports conflicts. On a machine with older local copies that you want to replace, run `~/agent-skills/scripts/install-skills.sh --replace-local`; it backs up those directories under `~/.codex/skill-backups/` before linking them. Codex's bundled `.system` skills are left alone. Restart Codex if new skills do not appear immediately.

Edit the shared source in `skills/` or a Codex-specific version in `codex-skills/`, then commit and push from this repository. Linked installs pick up changes after `git pull` on another PC. Codex-specific ports for `reflect`, `persona-walkthrough`, and `fix-review` live in `codex-skills/`; `mr-review` supports GitHub PRs and GitLab MRs. Other shared skills may still contain agent-specific references, so check those instructions when first using them in Codex.

## Updating

Edit a skill or command (in `~/agent-skills/...` — or via the symlinks/config above, they're the same files), then:

```sh
cd ~/agent-skills && git add -A && git commit -m "update <skill>" && git push
```

On another machine: `cd ~/agent-skills && git pull`.
