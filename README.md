# claude-skills

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) skills, synced across machines.

## Skills

| Skill | What it does |
| --- | --- |
| `animate` | Adds professional, physical, choreographed motion to a UI target (Vue 3 / Vuetify or Flutter). |
| `design` | Industry-specific UI/UX recommendations (colors, type pairings, layout patterns) before building. |
| `explain` | Reverse-engineers an unfamiliar feature end-to-end into a navigable `file:line` map — flow, key components, and the non-obvious coupling/gotchas. |
| `scout` | For a problem you don't yet know how to handle. Names what *done* actually looks like, fans out **breadth-first** over every open question between here and there, sorts them **sharp / foggy / out-of-scope** (the test is whether you can *state* the question, not *answer* it), then settles them one at a time until the route is clear. Produces decisions, not code — hands off to plan mode. Runs in one session by default, escalating to `/handover-save` only if the work genuinely outgrows one. Destination-first framing, the breadth-first fan-out, the fog test and the scope/sharpness split grafted from [Matt Pocock's wayfinder](https://github.com/mattpocock/skills); its issue-tracker map and one-ticket-per-session rule deliberately dropped. |
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
| `spinoff` | Harvests what a finished branch made **cheap** — the helper other sites now hand-roll, the thing deferred *on cost* that just got small, the convention that forked in two. Gated on a real *before → now* cost delta: any suggestion that would have been equally valid before the branch is discarded, which is most of them. Caps at 3, feeds `/issue`, and **never commits on the branch** — the output is a backlog, not a bigger diff. `ship-check`'s optional twin: that finds what's *missing* and blocks the merge, this finds what's *cheap* and blocks nothing. |
| `changelog-generate` | Generates changelogs & release notes from commits/PRs/MRs. Auto-detects the forge (GitHub `#` vs GitLab `!`, including self-hosted) and whether the repo uses tags — skipping all tag/version/semver noise for tag-less repos. Adapted from [patricio0312rev/skills](https://github.com/patricio0312rev/skills) changelog-writer, then customized. |
| `i18n-sync` | Keeps a project's translations in locale parity. Bundled scanner deep-diffs nested keys to find strings present in one locale but missing/empty in another (a silent fallback that ships the wrong language); mirrors new keys to every locale. |
| `skill-compare` | Judges an external skill or skills repo against this collection — measures real content vs. framework boilerplate, prices the infrastructure it assumes (runtime deps, state dirs, `settings.json` mutation), diffs it against the incumbent by procedure step rather than description, and tests the runnable core on a real repo fixture. Verdict: adopt / graft these mechanisms / skip. |
| `skill-audit` | The maintenance loop for the skills already installed — `skill-compare` guards the front door, this one watches the incumbents. **Stage 1** (after a merge, cheap) records only *externally observable* evidence that a skill misbehaved — an instruction the user overrode, a correction, a misfire, findings rejected as padding, a step the environment made impossible — to a local `~/.claude/skill-audit/log.jsonl`, and never edits a skill. **Stage 2** (rare, opt-in) fires only when the same complaint about the same skill recurs across **different sessions**, then proposes a minimal diff to that `SKILL.md` for approval. Self-assessment is banned as evidence — every entry must quote the offending instruction or the user's actual words — and logging nothing is the normal outcome. |

## When to reach for which

Most of these skills guard a different stage of *"am I doing the right thing?"* — chained across the life of a change:

```
something's broken:
  root-cause → validate-plan → ponytail → qa-sweep → ship-check → (spinoff) → mr-review
  (diagnose)   (vet the plan)   (build)   (run it)   (vet the diff)  (bank the  (review code)
                                                                     leftovers)

a new idea:
  scout → grill-me → validate-plan → …same tail…
  (find the   (sharpen
   destination) the plan)
```

How far up front you start depends on how much fog there is. `scout` is the furthest upstream — reach for it when you can't yet say what *done* looks like, so there's no plan to sharpen; it ends by naming that destination. `grill-me` picks up from a plan you can already state and stress-tests it into shared understanding. `second-opinion` spot-checks any single decision along the way. `skill-compare` and `skill-audit` sit outside the chain entirely — they judge the *toolkit* rather than the work: one prices a stranger's skill before you adopt it, the other watches the ones you already run and, after the same complaint turns up twice, proposes a fix to the skill itself.

**Commonly confused — same spirit, different moment:**

- `validate-plan` vs `ship-check` vs `mr-review` — adversarial review at three points: the **plan** (pre-code) → the **finished diff** (pre-merge) → the **code lines** (review).
- `scout` vs `grill-me` — **no destination yet** (fan out breadth-first to find it) vs **a plan you can already state** (walk its decision tree depth-first). Running `grill-me` on fog interrogates the first branch you happened to notice; running `scout` on a clear plan is pure ceremony.
- `second-opinion` vs `validate-plan` — one **decision** judged head-to-head vs a whole **plan** stress-tested.
- `ship-check` vs `spinoff` — both read the finished diff, opposite questions: what's **missing** (required, blocks the merge, fix it in this branch) vs what's now **cheap** (optional, blocks nothing, file it for later). Anything that would break production by not being done is a ship-check finding, never a spinoff.
- `skill-compare` vs `skill-audit` — **intake** vs **maintenance**: pricing someone else's skill before adopting it vs watching your own for drift once they're running.
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
