# /lead templates

Read this when writing a brief, opening the ledger, or handling a request.

## Teammate brief

```
You are teammate "<Role: focus>" on <project> (<repo path>). A lead coordinates; you never talk to the user.

GOAL: <one paragraph, what done looks like>
OWN: <files/areas you may edit>          DO NOT TOUCH: <everything else>
RULES: <constraints from the project's CLAUDE.md>
CONSUMES: <contract, owner>              PUBLISHES: <contract you must publish early, in the ledger's schema format>
SLOT: <port / emulator / DB name you alone may use>
WORKTREE: <path and branch>. Commit on your branch only; never push to <main branch> unless the lead says so. Never force-push.

DEFINITION OF DONE
- tests for edge cases and error paths; each new regression test proven to fail without the fix
- full suite and linter green
- a real-run check (curl / emulator / browser) with the actual output quoted
- if blocked or ambiguous: stop and report the question. Do not guess.

REPORT (end with exactly this)
- files changed:
- checks run (command, result):
- final contract shapes:
- open questions:
- commit(s) on branch:
```

## Ledger

Keep it outside the repo's tracked paths: the scratchpad, or a path listed in `.git/info/exclude`. Teammates' `git add -A` must not be able to pick it up.

```
# Team ledger — <task> (started <date>)
## Teammates
| Name (role: focus) | Agent id | Owns | Worktree/branch | Slot |
## Decisions (user)      # quote the user's words, with the date
## Contracts             # one row per interface: owner, consumers, status (pending/published)
### <name>
  request:  <method path + example body>
  response: <example JSON>
## Requests log          # mid-run asks: request → routed to (teammate / new teammate / next round) → date
## Merge queue           # branch, checks run on merged HEAD, merged yes/no
## Status                # one line per teammate: last report time, state
```

## Mid-run request triage

For each new ask from the user, decide and record in the Requests log:
1. **Owner exists** — the request sits in one teammate's area: SendMessage it, and update the OWN list if needed.
2. **New teammate** — it is a new area and can run in parallel: spawn one (respect the cap of 3–4).
3. **Next round** — it depends on unpublished contracts or would collide with running work: queue it.
Tell the user which one you chose in one line. Answer pure questions by reading the code yourself; anything that needs a design or a build goes to a teammate.

## Integration checklist (after all branches report)

1. Merge one branch at a time into an integration worktree. After each merge, run the suite and linter; stop at the first red and send the failure to the branch's owner.
2. On the merged `HEAD` in a clean worktree: full suite, linter, and the end-to-end flow that crosses teammates (e.g. app against the changed backend), with real output.
3. Only then update the main branch, and only if the user allowed it. Otherwise hand the user the branch names and the merge order.
