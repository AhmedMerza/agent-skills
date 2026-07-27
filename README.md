# claude-skills

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) skills, synced across machines.

## Skills

| Skill | What it does |
| --- | --- |
| `animate` | Adds professional, physical, choreographed motion to a UI target (Vue 3 / Vuetify or Flutter). |
| `design` | Industry-specific UI/UX recommendations (colors, type pairings, layout patterns) before building. |
| `explain` | Reverse-engineers an unfamiliar feature end-to-end into a navigable `file:line` map — flow, key components, and the non-obvious coupling/gotchas. |
| `grill-me` | Interviews you relentlessly about a plan until you reach shared understanding. Adapted from [Matt Pocock's grill-me](https://github.com/mattpocock/skills). |
| `root-cause` | Investigates a bug against ground truth before any fix — reproduce, quantify prevalence, trace the true root cause, map the blast radius. Symptom-triage table, upstream/known-dependency-bug search (sanitize before searching), and a 3-strike stop rule grafted from [garrytan/gstack](https://github.com/garrytan/gstack) `investigate`. |
| `second-opinion` | Judges whether a decision you directed (code placement, migration approach, data model) is actually best, or if a better way exists — merit only, authorship ignored. |
| `qa-crawl` | Grinds through a few hundred routes unattended and resumably — one page per iteration, durable ledger in gitignored `.claude/qa-crawl/`, running in its own git worktree so your checkout is never touched. Objective errors are diagnosed, fixed and re-verified; UI findings are recorded as **proposals**, never auto-applied. Opens one small before/after MR per page that needed changes (clean pages open nothing). Pair with `/loop` to keep it going while you work. Owns only the ledger, the per-page contract and the isolation — the judgment comes from `qa-sweep`, `root-cause`, `ponytail`, `ship-check` and `ui-audit`/`ux-audit`. |
| `qa-sweep` | Drives the running app in a real browser and hunts for what's actually broken — dead controls, failing forms, console errors, unbuilt empty states, regressions on adjacent routes. Diff-aware by default: derives scope from the branch diff and looks routes up (`artisan route:list`, Inertia render sites) rather than guessing them. Reports findings with repro steps and screenshot evidence; never fixes. Driver-agnostic (claude-in-chrome, or Playwright via the project's own install). Diff-aware routing, two evidence tiers and the smoke-fallback guard grafted from [garrytan/gstack](https://github.com/garrytan/gstack) `qa`. |
| `ponytail` | Lazy-senior-dev coding discipline — YAGNI, reuse/stdlib first, no unrequested abstractions, design-for-reuse only when a second consumer is real. **Auto-applies by default** to any coding task (not opt-in). Adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT), then customized. |
| `ui-audit` | Technical UI quality checks (a11y, performance, theming, responsive, interaction states) → scored report. |
| `ui-polish` | UI polish, animation decisions, and the invisible details that make interfaces feel right. Adapted from Emil Kowalski's design engineering philosophy. |
| `ux-audit` | Judges whether a page/flow actually works for the human using it — cognitive load, friction, clarity — tied to the page's one real goal. Advisory, ethics-gated (flags dark patterns). |
| `validate-plan` | Adversarially stress-tests an existing plan before executing — verifies assumptions against the real codebase, surfaces alternatives, red-teams failure modes, returns a proceed/reconsider verdict. |
| `ship-check` | The final gate before merging — audits a finished diff against the problem it claims to solve: what's missing (unpatched sibling caller, unhandled branch, no backfill), where it breaks on edge cases, whether the approach is right. `validate-plan`'s bookend. Returns a merge/fix-first/reconsider verdict. |
| `changelog-generate` | Generates changelogs & release notes from commits/PRs/MRs. Auto-detects the forge (GitHub `#` vs GitLab `!`, including self-hosted) and whether the repo uses tags — skipping all tag/version/semver noise for tag-less repos. Adapted from [patricio0312rev/skills](https://github.com/patricio0312rev/skills) changelog-writer, then customized. |
| `i18n-sync` | Keeps a project's translations in locale parity. Bundled scanner deep-diffs nested keys to find strings present in one locale but missing/empty in another (a silent fallback that ships the wrong language); mirrors new keys to every locale. |
| `skill-compare` | Judges an external skill or skills repo against this collection — measures real content vs. framework boilerplate, prices the infrastructure it assumes (runtime deps, state dirs, `settings.json` mutation), diffs it against the incumbent by procedure step rather than description, and tests the runnable core on a real repo fixture. Verdict: adopt / graft these mechanisms / skip. |

## When to reach for which

Most of these skills guard a different stage of *"am I doing the right thing?"* — chained across the life of a change:

```
root-cause → validate-plan → ponytail → qa-sweep → ship-check → mr-review
(diagnose)   (vet the plan)   (build)   (run it)   (vet the diff) (review code)
```

`grill-me` goes up front when the requirements themselves are fuzzy; `second-opinion` spot-checks any single decision along the way. `skill-compare` sits outside that chain — it judges the *toolkit* rather than the work, for when someone hands you a link to their skills and asks whether any of it is worth adding.

**Commonly confused — same spirit, different moment:**

- `validate-plan` vs `ship-check` vs `mr-review` — adversarial review at three points: the **plan** (pre-code) → the **finished diff** (pre-merge) → the **code lines** (review).
- `second-opinion` vs `validate-plan` — one **decision** judged head-to-head vs a whole **plan** stress-tested.
- `qa-sweep` vs `ui-audit` vs `ux-audit` — three questions about the same screen: does it **work at all** (drive it in a browser, find what's broken) vs is it **built correctly** (a11y/perf/theming, read statically) vs does it **work for the human** (friction/cognitive load).
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
| `handover-save` | Materialize the current conversation's plan into a durable, gitignored doc under the project's `.claude/handover/` — status, decisions, checkboxed steps, `file:line` anchors, gotchas — so it survives `/clear` and session handoffs. |
| `handover-resume` | Reload a saved handover plan and re-anchor the session — re-verifies its `file:line` anchors against current code, reconciles checkbox state, then continues from the first unblocked step. |
| `handover-list` | List the saved handover plans in the current project (slug / title / status, newest first) so you can pick one to resume. |

The `handover-*` trio is a self-contained local workflow (no GitHub/GitLab involved): `save` writes a plan, `list` finds them, `resume` reloads and continues one. The docs live in each project's gitignored `.claude/handover/`, so they're personal scratch — never committed.

## Install

Clone anywhere, then symlink into your Claude config so edits stay in sync:

```sh
git clone https://github.com/AhmedMerza/claude-skills.git ~/claude-skills

# back up existing dirs if you have them, then link:
ln -s ~/claude-skills/skills ~/.claude/skills

# commands: link the individual files (your ~/.claude/commands may hold other, local-only commands)
for f in mr-create mr-review fix-review commit issue browse handover-save handover-resume handover-list; do ln -sf ~/claude-skills/commands/$f.md ~/.claude/commands/$f.md; done

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
