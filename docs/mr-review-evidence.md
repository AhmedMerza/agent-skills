# mr-review / fix-review — measured evidence

The measurements behind the cost rules in `/mr-review` and `/fix-review`. Kept out of the
command files so the rules load without the narrative; linked from the commands where a
rule cites numbers.

## Ref-based reading vs. inline payloads (Step 3 of mr-review)

On an 8-file MR, full file content plus diff is ~48k tokens. Under the old inline flow that
landed in the orchestrating context *and* was copied into all five agent prompts. With the
head fetched into `refs/mr/<N>` and agents reading on demand, each agent spends about the
same as being handed the payload — measured on MR !3192: 55.7k on demand vs ~47.6k handed
in — while the orchestrating context holds a file list instead of the files. The cost moves
into subagent context that is discarded, out of main context that is not.

## Cheap vs. heavy tier for review agents (Step 4 of mr-review)

A/B on MR !3192 (a controller dedupe touching a policy path and a form-request
`authorize()`), security reviewer run on both tiers with identical input:

| | tool calls | tokens | wall clock | verdict |
| --- | --- | --- | --- | --- |
| cheap tier (sonnet / highspeed) | 21 | 55.7k | 2m 08s | `[]` |
| heavy tier (opus / primary) | 46 | 106.1k | 9m 03s | `[]` |

Same verdict, 1.9× the tokens, 4.2× the time. The wall clock is the decisive part: the
agents run in parallel, so **the slowest agent gates the entire review**. One heavy-tier
agent turns every review into a nine-minute wait — paid on all reviews, including the clean
majority.

> Caveat: both agents were told to return only a JSON array. The cheaper tier complied; the
> heavier one narrated first. That makes the heavy tier's checking *visible* and the cheap
> tier's invisible — it does not establish that the cheap tier checked less. The result
> supports the cost claim, not a claim about relative depth.

## Why the testing reviewer is not filler (mr-review vs. /nitpick)

`/nitpick` spawns four reviewers — general, security, performance, architecture — and has
**no testing reviewer**. On MR !3215 (2026-08-13) the testing reviewer was the one that
mutated the code and found two checks nothing constrained — deleting the under-lock
re-check left all 35 tests green. Escalating a security-sensitive MR to `/nitpick` trades
that pass away; if the MR also touches tests or invariants, run `/mr-review` and escalate
only the finding you doubt.
