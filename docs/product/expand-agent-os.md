# Expand: the agent operating system (agent-skills + Agent Worlds + lead world mode)

Full-mode run, 2026-10-22. First real test of the `expand` skill.

**Product:** a solo lead running several products at once, each spanning several repos, through many parallel CLI agent sessions (Claude Code, Codex, Kimi…) in Agent Worlds, with a `lead` world-mode manager per product.
**Personas:** the lead as product owner, the lead as reviewer/merger, the manager agent, worker agents, human colleagues in the same repos, the products' end customers.
**Moments:** new goal, discovery, roadmap, dispatch, worker idle/stuck, shared-resource collisions, permission prompts, review & merge, customer demo, feedback arriving, switching products, morning catch-up, usage limits, context filling, a decision re-argued.

**What we already have:** cross-session mailbox, needs-you inbox, idle/working state per session, phone access with QR login and notifications, catch-up summaries, runs, multi-CLI support (Agent Worlds); scout → expand → grill-me → validate-plan → ship-check / mr-review / fix-review → mr-guide, with a human-review call (agent-skills); lead world mode with STATE.md / DECISIONS.md and a standing-authority policy.

## Parity matrix

✅ have · 🟡 partial · ❌ missing. *s* = search-snippet evidence only.

| Capability | Conductor | Claude Squad | Nimbalyst | Vibe Kanban | Claude Code teams / agent view | Devin | Cursor | Factory | Us |
|---|---|---|---|---|---|---|---|---|---|
| Worktree per task | ✅ | ✅ | ✅ | ✅ | ✅ | cloud | cloud | cloud | 🟡 subagent mode only |
| Needs-input inbox | ✅ | ❌ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phone + push | ✅ paid | ❌ | ✅ | ❌ | 🟡 | ✅ *s* | ✅ | – | ✅ |
| Cross-session messaging | MCP | ❌ | ❌ | ❌ | ✅ | – | – | ✅ | ✅ |
| **Idle/stall events routed to the manager** | ❌ | ❌ | ❌ | ❌ | 🟡 `notify_when_idle`, TeammateIdle hook | ❌ | ❌ | 🟡 retry warnings | 🟡 shown to the human only |
| Plan / roadmap approved by the human | 🟡 plan mode | ❌ | ❌ | 🟡 board | 🟡 | 🟡 | ❌ | ✅ Missions | ✅ (new, untested) |
| Auto review on PR | ✅ checks | ❌ | ❌ | 🟡 | ❌ | ✅ | ✅ Bugbot | ✅ | ✅ ship-check + mr-review |
| Auto-fix review comments | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ fix-review |
| Screenshots/video on the PR | ❌ | ❌ | ❌ | 🟡 preview | ❌ | ❌ | ✅ | ❌ | ✅ mr-guide |
| **Per-repo review rules file** | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 playbooks | ✅ BUGBOT.md | ❌ | ❌ |
| **"Does a human need to review?"** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ new — ahead of the field |
| **Cost per worker / per goal** | ❌ | ❌ | ❌ | ❌ | 🟡 `/usage` per session | 🟡 ACUs | ❌ | ❌ | ❌ (`usage-week` only) |
| Scheduled / proactive tasks | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | 🟡 `/loop`, `schedule` |
| Worktree disk lifecycle | 🟡 archive | ❌ | ❌ | ❌ | ❌ (30 GB issue) | – | – | – | ❌ |

## Top complaints across competitors (evidence for ideas)

1. **Stalls nobody notices.** Agent-teams docs: teammates "fail to mark tasks as completed", and the lead "can stop early". Conductor's "appears stuck" advice is manual. ([agent-teams](https://code.claude.com/docs/en/agent-teams), [Conductor troubleshooting](https://www.conductor.build/docs/troubleshooting/issues))
2. **Quota and cost opacity.** "rapid quota drains", with no view of what spent it. ([OpenAI forum](https://community.openai.com/t/codex-users-report-rapid-quota-drains-since-may-10/1380649)) Agent teams use about 7× the tokens of a normal session. ([costs](https://code.claude.com/docs/en/costs))
3. **Review noise and overload.** Bugbot false positives and style noise ([forum](https://forum.cursor.com/t/bugbot-raising-invalid-bug-reports/136693)). Review takes longer as the number of PRs grows (*s*).
4. **Worktrees eat disk.** About 30 GB in two sessions with no lifecycle management ([issue](https://claudeissues.com/issue/58912-bug-claude-code-worktrees-lack-lifecycle-management-causing-excessive-disk-space)).
5. **Auto-accept that doesn't work, and tmux fragility.** Claude Squad #151, #51 ([issues](https://github.com/smtg-ai/claude-squad/issues)).
6. **Abandonment.** Vibe Kanban sunset, Crystal deprecated, Claude Squad "seems abandoned".

## Ideas, ranked

| # | Idea | Who · moment · gain | Lens | Evidence | Cost | Tag |
|---|---|---|---|---|---|---|
| 1 | **The manager hears worker state.** Agent Worlds already knows when a session goes idle, needs input, fails or hits a limit. Send that event to the world's manager session as mail, not only to the human's inbox. | manager · worker idle/stuck · the human stops being the idle-poller | pain | ~35 "X is idle" relays; complaint 1; no competitor does it | S–M | v1 |
| 2 | **Autonomy dial per world**: observe / propose / act / act + merge ✅-review MRs. The manager obeys it; every action is logged with the dial at that time. | lead · walking away · trust is tunable, not all-or-nothing | control | pairs with the new human-review call; Factory pause/redirect | S | v1 |
| 3 | **Decision tripwire.** Before proposing a design, grep DECISIONS.md for the touched nouns and quote the standing decision. Reopening it needs a stated new reason. | manager, lead · a decision re-argued weeks later · settled stays settled | pain | auth and FA-location flip-flops in history | S | v1 |
| 4 | **Queue-native dispatch.** Each worker's next items live in Agent Worlds. When a worker goes idle, it is delivered the next one with no manager turn. | workers · finishing a task · zero gap between items, fewer manager tokens | level-changer | ahead of every competitor | M | next |
| 5 | **Per-repo `REVIEW.md`** read by mr-review and ship-check: house rules, known false positives, paths that always need a human. | reviewer · every MR · less noise, review call grounded in project policy | parity | BUGBOT.md, Codex `code_review.md`; complaint 3; **tested: WEAK**, see below | S | later |
| 6 | **Morning brief across worlds**: needs you (n) / shipped / at risk, built from MRs, the event log and the review calls. | lead · morning, switching products · no "status?" questions | friction | repeated status asks in history; the `daily` skill exists per project | S | v1 |
| 7 | **Resource leases** in Agent Worlds (`lease staging-db`, schema version numbers, emulator, port): collisions queue instead of corrupting. | workers · shared resources · no stomped SDKs or schema clashes | friction | Flutter SDK and Drift version clashes in history | S | next |
| 8 | **Cost per worker and per goal** on the world card, with a warning before a limit and a checkpoint instead of dying mid-edit. | lead · usage limits · knows where the budget went | parity+ | complaint 2; nobody has it; **tested: WEAK**, see below | S | later |
| 9 | **Demo rehearsal.** 48 h before a customer meeting, run the demo script on staging with a persona walkthrough and file what breaks as P0. | lead · customer demo · gaps found before the customer does | pain | features found missing only at customer contact | M | next |
| 10 | **Worktree reaper**: archive merged worktrees and report the disk freed. | everyone · disk full · no 30 GB surprises | parity | complaint 4; `/tmp` inode exhaustion in history; **tested: HELD**, see below | S | v1 |
| 11 | **Role allowlists for workers**: generate the settings allowlist from the standing-authority policy, so commits, feature-branch pushes and MR creation stop prompting. | workers · permission prompts · no stall per commit | pain | "needs your yes" for every commit in history | S | v1 |
| 12 | **Nightly customer-shadow persona** drives staging through the real UI and files friction like a customer would. | end customers (simulated) · nightly · missing features surface daily | level-changer | same as #9, made continuous | L | later |

**Top 3:**
1. **#1 the manager hears worker state.** It is the single biggest pain, the data already exists in Agent Worlds, and #4, #6 and #8 build on it.
2. **#2 autonomy dial.** It turns the new human-review call into actual time saved: ✅ MRs merge themselves when the dial allows.
3. **#3 decision tripwire.** Small, and it kills the most demoralizing failure in the history.

**Cut:**
- **SIGSTOP kill switch:** tmux plus Agent Worlds pause/restart already cover it, and a frozen process mid-commit is riskier than a stop message.
- **WhatsApp feedback pipe:** valuable, but it belongs to each product's roadmap rather than to the agent OS.
- **"Already shipped, tell them" replies:** same reason.

## Prove it: the three "we're behind" claims, tested on the real machine

| Claim | Test | Verdict |
|---|---|---|
| Worktrees eat disk | `du` over all 171 worktrees: 127.6 GB in total. 97 are clean and either merged or untouched for 14+ days, holding **70.8 GB** (55% of the total). Separately, `/tmp` (tmpfs) is at **93% inode use**, and its exhaustion has already happened once. | **HELD.** It is bigger than the competitor complaint suggested, and `/tmp` inodes are the more urgent half. |
| Cost per worker / goal | A prototype summed `message.usage` per session and per `gitBranch`. About 60% of a week's tokens map to issue-numbered branches. The top session is about 5% of the week, and `usage-week` already shows top sessions. Cache reads are about 97% of tokens, so the lever is context size, which is already reported. | **WEAK.** It is computable but changes no decision. A ~10-line "by branch" block in `usage-report.py` is enough. |
| Per-repo review-rules file | 42 review rejections read by hand: 14 were genuine, and a rules file would have prevented about 4. About 6 were false positives from the deterministic checks, which need an allowlist instead. `mr-review` already asks reviewers for a project rules file, and most repos simply don't have one. | **WEAK** as a new convention. The fix is a "review rules" section in each repo's existing CLAUDE.md/AGENTS.md. |

Lesson for the skill: the research ranked cost tracking and the rules file as gaps because competitors have them. Testing showed one already exists in another form and the other changes no decision, while the boring item (disk) was the real problem.
