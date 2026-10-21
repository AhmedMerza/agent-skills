---
name: reflect
description: Evaluate whether installed Codex skills improve outcomes using paired Codex CLI runs, blind grading, and measured results. Use for /reflect or requests to test a skill's value; do not infer effectiveness from a single session.
---

# Reflect on Codex skills

A verdict needs paired runs of the same task, once with the target skill enabled and once disabled. “No measurable difference” and “did not fire” are valid results. Do not edit a skill from this evaluation without the user's approval of a specific change.

## Scope and budget

`/reflect <skill>` evaluates one skill; `/reflect` inventories the installed set. `--since DAYS` narrows history; `--budget N` caps the number of Codex runs. If no budget was supplied, state the planned run count and rough cost before starting and obtain approval for that spend. Interactive skills that depend on a user's answers cannot be replayed fairly; report history-only evidence for them.

## 1. Find claims

Inventory installed skill folders under `${CODEX_HOME:-$HOME/.codex}/skills` and project `.agents/skills`. Run `python3 scripts/mine_history.py [--since DAYS] [--skill NAME]` from this skill's real directory. The miner observes explicit `$skill` requests only, so zero uses does **not** mean a skill never fired naturally. Read relevant feedback logs if present, but treat unverified impressions as hypotheses. Write falsifiable claims for the skills in scope.

## 2. Prepare fair scenarios

For each claim, use a real prior task when it can be safely replayed and a synthetic case that exercises the claimed benefit. Write a 3–5 item rubric before either arm runs. Use separate throwaway worktrees with the same starting commit and preconditions. Skip tasks needing live accounts, production data, secrets, or user replies. A phone/emulator scenario must use a verified setup script before **each** arm and the runner's `--device` lock.

## 3. Run paired Codex arms

Use `python3 scripts/run_arm.py --arm with|without --skill NAME --workdir DIR --prompt-file F --out DIR [--invoke natural|explicit] [--sandbox read-only|workspace-write] [--model MODEL] [--device SERIAL --setup SCRIPT]`. The runner calls `codex exec --json`, disables web search, prevents interactive approvals, and changes only the target skill's enabled setting. It writes `stream.jsonl`, `stderr.txt`, `final.txt`, and `summary.json`. Both arms use the same prompt unless `--invoke explicit` prefixes `$skill` in the with arm. In a code task, use `workspace-write` **only** inside disposable worktrees. Do not give the arm network access or ask it to push. Run at most three arms concurrently and stop at the stated budget.

Check `exit_code` and `skill_called` in each summary. For natural invocation, `skill_called` is observable only when the CLI event stream shows a skill file read; treat an unobserved use as “activation unknown,” not a skill failure. For explicit invocation, the marker counts as fired only after a successful run. Codex reports token usage, not a dollar cost; do not invent pricing.

## 4. Grade and decide

Run `python3 scripts/blind.py --skill NAME --with <with/final.txt> --without <without/final.txt> --out DIR`. Give a grader only the rubric and anonymized `X.txt`/`Y.txt`; keep `key.json` hidden until grading is complete. Machine-check objective outcomes first (test result, diff, files touched), then compare quality, time, tool calls, and tokens. One pair is a screen, not a verdict: repeat promising or surprising differences at least three times per arm. Report spread as well as averages, and name any grading that could not be fully blinded.

Save a report under `~/reflect-reports/<date>-<skill>.md` with the claims, scenarios, numbers, limitations, and a keep/tune/drop recommendation. Discuss surprises with the user. Do not mutate an evaluated skill until the user approves the specific diff.
