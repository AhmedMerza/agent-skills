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

---

# World mode

Read this when kicking off world mode, restarting from state, or writing a digest.

## Kickoff brief to a worker (send once, with the standing-authority policy)

```
You are the <repo> worker in a team run by the manager session <manager id>. The user is away; the
manager is your only contact. Reply with aw_send to <manager id>; one message per report.

GOAL OF THE TEAM: <one paragraph>
YOUR AREA: <repo, paths>                DO NOT TOUCH: <other repos, shared files owned by someone else>
RULES: <from the repo's CLAUDE.md>      DECISIONS: <path to DECISIONS.md>; read it before any design choice.
  A decision there stands; if you think one is wrong, say so in your report and keep to it until the
  manager tells you it was reopened.
RESERVED FOR YOU: <port / DB / emulator / scratch dir / migration numbers>. Anything shared that is not
  listed here (SDK upgrades, schema versions, a new DB, sudo work) — ask the manager; never take it.

STANDING AUTHORITY (no need to ask anyone):
- claim the issue you are given, branch, commit, push your feature branch, open the MR
- run /ship-check and /mr-review on your MR and fix what they find
- reply to review threads on your own MR
NEEDS THE USER'S YES (send it to the manager as a question, then take your next queue item — don't wait):
- merging to a protected branch; deploys; production data; anything posted outside the team
- a product call DECISIONS.md does not answer
NEVER: force-push, push to the main branch, edit another worker's area.

QUEUE: <item 1: issue #, done-criteria> then <item 2> then <item 3>. Start item 1 now; when its MR
  passes the gates, go straight on to the next and report.

REPORT (one aw_send per finished item, exactly this):
- issue / MR:
- gates run (ship-check, mr-review, UI audits, fresh review) and verdicts:
- checks run (command, result):
- needs the user (with your recommendation):
- starting next: <item> | queue empty
```

## STATE.md (rewrite in full every time; cap ~150 lines)

```
# State — <goal>            rewritten <date time>
## Goal and milestone
<goal, one line> · milestone <n>/<m>: <name> · done-criteria: <link to ROADMAP.md section>
## Workers
| Session | Repo | Current item | Queue (next 3) | Last heard | Sends since user msg |
## Open MRs
| MR | Worker | ship-check | mr-review | fresh review (money/auth/sync) | mr-guide | Merge list? |
## Reserved resources
| Resource (SDK, schema/migration #, DB, emulator, port, scratch dir) | Owner | Since |
## Pending yeses (sent in the next digest)
1. <question> — recommend <X> because <reason> — blocks <worker/item or nothing>
## Next manager actions
- <what to do at the next wake-up>
```

## DECISIONS.md (append-only)

```
# Decisions — <goal>
Rule: the first decision stands unless the user explicitly reopens it. Reopening = a new entry that
names the one it replaces; never edit an old entry.

## <YYYY-MM-DD> <short title>
Decision: <what>
Why: <the reason, in the decider's words where possible>
Decided by: <user / manager under standing authority> · Replaces: <entry title or —>
```

The first entry is always the standing-authority policy, copied from the kickoff brief.

## Status digest (from the tracker, not from memory)

Build it from `glab`/`gh` queries (issues closed and opened since the last digest, MR states, pipeline
status) and STATE.md. Omit empty sections; aim for under 20 lines.

```
## <goal> — <date>   milestone <n>/<m>: <x>% of done-criteria met
**Merged since last:** <MR — one line each>
**Ready for you to merge:** <MR — mr-guide link> (gates: ship-check ✓ mr-review ✓ fresh ✓)
**In flight:** <worker: item, state>
**Needs your yes:** <numbered list, each with my recommendation and reason>
**Risks / stalls:** <worker silent since …, failing pipeline, cap reached on …>
**Next:** <what lands before the next digest>
```
