---
disable-model-invocation: true
name: reflect
description: "Find out whether your skills actually make a difference, then talk it through with the user. Mines past sessions and the skill-audit log for suspicions about each skill, turns each into a testable claim, runs real and synthetic tasks WITH the skill and with that one skill blocked, grades the pairs blind, and reports keep / tune / drop per skill with the numbers. Invoke with /reflect for a sweep of every skill, or /reflect <skill> to test one; --budget N caps the number of runs, --since 30d limits the history read. This is skill-audit's empirical sibling: skill-audit logs what went wrong (cheap, observation only, never tests anything); reflect tests whether a skill helps at all. Restraint-gated: 'no measurable difference' is a normal verdict and a skill is never called useful on a feeling."
---

# /reflect — does this skill actually change the outcome?

Skills feel useful. Feeling is not evidence: a skill can add ceremony, tokens and time while the model would have done the same thing without it. This skill settles it by running the same task twice, once with the skill and once without, and comparing.

**What this is NOT**
- **Not `skill-audit`.** That logs observable problems (overrides, corrections, misfires) and never runs a test. `/reflect` *reads* its log for suspicions, then tests them. Run `skill-audit` for cheap upkeep, `/reflect` to find out whether a skill earns its place.
- **Not `skill-compare`** (judges an *external* skill before adoption) and not `skill-creator` (builds and tunes *one new* skill with a viewer). This sweeps the skills you already own.
- **Not a self-review.** "I think it helped" is not a result. Only graded run pairs are.

## The gate

1. **A verdict needs paired runs.** No pair, no verdict. History alone only produces suspicions.
2. **"No measurable difference" is a first-class result.** Never invent a win to justify the spend.
3. **Never edit a skill without approval.** Propose a minimal diff, let the user decide.
4. **Interactive skills cannot be re-run** (they wait on the user: `grill-me`, `lead`, `wait-what`, `where-were-we`, anything that coordinates other sessions). Report them as *history-only* and say what the history shows. Do not fake a run.

## Arguments

`/reflect` sweeps every installed skill. `/reflect <skill>` tests one. `--budget N` caps total runs (default 30). `--since 30d` limits the history read. If there is no `--budget`, say the planned run count and rough cost and get one yes before spending anything.

## Phase 1 — Inventory and mine (cheap, no model runs)

1. List installed skills: `~/.claude/skills/*` and the project's `.claude/skills/*`. Drop anything that is not an installed skill (the history includes built-ins like `clear` and `model`).
2. Mine the history with the bundled script, never by reading transcripts by hand:
   `python3 -I ~/.claude/skills/reflect/scripts/mine_history.py [--since N] [--skill NAME]`
   It reports uses, sessions, how each was invoked, and how many follow-up messages looked like corrections, with example tasks. It skips throwaway scratchpad sessions.
3. Read `~/.claude/skill-audit/log.jsonl` if it exists, and `type: feedback` memories (`grep -rl "type: feedback" ~/.claude/projects/*/memory/`). These are the best-quality suspicions.
4. Write a ranked list of **claims**, each falsifiable and quoting its evidence, for example: "`ponytail` keeps diffs smaller than the model's default" or "`validate-plan` catches a flaw the plan missed". A skill with no evidence of any kind still gets one default claim taken from its own description.

Sample sizes in the history are usually tiny (most skills appear one to three times). Say so. It is the reason the next phases exist.

## Phase 2 — Scenarios

For each claim to test, build at least three scenarios:

- **Replay**: a real task prompt from the history. Check out the repo as it was then: `git worktree add --detach <dir> $(git rev-list -1 --before=<ts> HEAD)`. Skip tasks that need live services, secrets, a device, or user answers.
- **Synthetic**: a task written to exercise the claim, for gaps the history cannot fill.

Write the **rubric before running anything** and save it next to the scenario: 3 to 5 yes/no checks that can be verified from the outputs (tests pass, diff under N lines, named flaw found, files left untouched) plus one 1–5 quality score. A rubric written after seeing outputs is not a rubric.

Everything runs in a throwaway worktree. Prefer read-only or reversible tasks.

## Phase 3 — Run the pairs

Use the bundled runner, one call per arm:

`python3 -I ~/.claude/skills/reflect/scripts/run_arm.py --arm with|without --skill NAME --workdir DIR --prompt-file F --out DIR [--model haiku] [--invoke natural|slash]`

- The `without` arm blocks only that skill with a deny rule, so login, CLAUDE.md, other skills and the model stay identical. It also forbids web tools and `git push`.
- Use `--invoke slash` for skills the user normally types as `/name`; `natural` lets the model decide, which tests the trigger too.
- Record whether the skill actually fired in the `with` arm (`skill_called` in summary.json; slash runs report `fired_via: slash` because the expansion never appears in the stream). A skill that did not fire was not tested; report that, not a fake tie.
- **Known leak:** the blocked skill's name and description stay visible, so the `without` arm can still *describe* the skill from its listing. The baseline is "skill blocked", not "skill unknown". Say this when it matters.
- **Screen, then confirm.** One run per arm for every claim first. Only claims that look different get 3+ runs per arm. This is what keeps a sweep affordable.
- Run at most three at a time. Track the budget; stop at the cap and report what was covered.

## Phase 4 — Grade blind

Run `python3 -I ~/.claude/skills/reflect/scripts/blind.py --skill NAME --with W --without WO --out DIR` first: it strips the skill's template headings, emoji and verbatim phrases from both outputs and shuffles them into `X.txt` and `Y.txt` (key in `key.json`, never shown to the grader). A skill that stamps a template on its output otherwise gives itself away. Spawn a fresh grader subagent per scenario. Give it the rubric and only X.txt and Y.txt. It scores each against the rubric and says which is better and why. Use scripts for anything checkable by machine (tests, diff size, files touched). Then unblind and tabulate: rubric score, tool calls, cost, time, and whether the skill fired.

## Phase 5 — Verdict per skill

| Verdict | When |
|---|---|
| **Clear win** | The `with` arm beats `without` in nearly every pair and the gap is larger than the run-to-run spread |
| **Costly tie** | Same quality, but clearly more tool calls, time or cost with the skill |
| **No measurable difference** | Gaps are inside the spread. Report n; say it may need more runs |
| **Harmful** | The `without` arm is better in most pairs |
| **Didn't fire** | The skill rarely triggered, so the description is the problem, not the body |
| **History-only** | Interactive skill, cannot be re-run |

Always give the numbers and the spread, never only a mean. Name the exact scenario behind any claim. Never call a skill a win from fewer than 3 pairs.

## Phase 6 — Reflect with the user

Save the report to `~/reflect-reports/<date>-<skill>.md` (create the folder; `~/.claude/` is a protected path and the write is refused). Then go through it **with** the user, not at them: lead with surprises (a skill you assumed helped that did not; a skill that fired rarely), ask what they have felt that the numbers contradict, and propose minimal diffs only where a test showed a real problem. End with total spend and what was *not* covered. Do not edit any skill until the user approves a specific diff.

## Cost and safety

- State the planned run count before starting. Default `--max-usd 1.0` per run on a small model; use a larger model only when the skill's value depends on it, and say so.
- Never run a replay that touches production data, real accounts, or the network. Skip it and flag it.
- Leave no worktrees behind: `git worktree remove --force <dir>` for each one.
