---
name: tool-compare
description: Decide whether an external tool, library, package or service is worth adopting in THIS project, and, only when asked, turn the findings into upstream issues and a picture of the competition. Invoke with /tool-compare when handed a link or a name with a question like "check this out for this project", "will it make any difference", "should we use X". Covers anything that isn't a Claude skill (skills go to /skill-compare). Checks for an existing verdict first, pins the version, reads the source instead of the README, verifies every headline claim against the code and the tool's own tests, establishes whether the project actually has the problem, prices the cost, and records the verdict in .claude/project-docs/<tool>-evaluation.md. Restraint-gated: "no demonstrated need here" is a first-class verdict, and filing issues or surveying competitors happens only on request.
---

# /tool-compare: will this actually make a difference here?

Someone found a tool, and the question is whether this project should take it on. Most evaluations go wrong in one of four ways:

- **Deciding from the README.** It's written to sell, and the headline feature is often the least finished one.
- **Deciding from a green test suite.** Tests that fake the network can pass while the two halves of a feature disagree on the URL.
- **Solving a problem the project doesn't have.** A sound tool can still add nothing here.
- **Evaluating the same tool twice.** A month later nobody remembers why it was rejected, so it gets tested again from scratch.

The deliverable is **a verdict for this project, backed by evidence, written down**. Filing upstream issues and surveying competitors are optional follow-ups.

**The restraint gate.** You're done when the verdict rests on measured claims and the evaluation doc exists.
- Don't audit every file of the tool. Go deep only on what the headline claims depend on.
- Don't invent a need so the answer looks useful. "It's good, and we don't need it" is a complete result.
- Never file issues, contact maintainers or publish anything unless the user asks.

## The passes

### 0. Look for a standing verdict

Check `.claude/project-docs/*-evaluation.md`. If this tool already has a verdict, cite it. Re-test only what changed since the pinned version (its changelog, `git log <pinned>..HEAD`), not the whole thing.

### 1. Name the problem it would solve here

Write one sentence per headline claim, in this project's terms. Then find out whether the project actually has that problem:

- **What already covers it:** code, dependencies, infrastructure config, framework built-ins. Delegate this sweep and ask for `file:line` conclusions, not dumps.
- **Evidence the problem occurs:** logs, data, tickets, incidents.
- **Make sure the evidence source can see the problem at all.** A log table that never records 404s can't show scanner traffic, so zero rows there is silence, not safety. Name the source that *would* show it.

"No demonstrated need" is a verdict, not a failed evaluation.

### 2. Get the real thing, pinned

- **Isolate it.** Clone or install into the scratchpad, never into the working tree. Record the commit or version and the date.
- **List branches and tags.** The default branch isn't always the newest. A work-in-progress branch may already fix, or already abandon, what you're about to report.
- **Read the source** for every headline feature. The README describes the product; the code *is* the product.

### 3. Verify every claim, and check what the tests actually prove

Build a claim-vs-measured table: one row per headline claim, each anchored to a `file:line`.

- **Run the tool's own test suite, then check what it fakes.** Faked HTTP hides a client/server path mismatch. A URL assembled in JavaScript inside a template is covered by no test at all.
- **"Allowed" isn't "tested".** Compare the version constraints against what CI actually installs.
- **Hot-path failure modes.** When its dependency (cache, network, daemon) is down, does every request fail open, fail closed, or crash?
- **Ordering and environment assumptions:** middleware order, proxies, long-running workers, concurrency.
- **Before calling a feature broken, re-read its docs.** A route the README tells users to write themselves isn't a missing route. The real gap is usually narrower, e.g. nothing verifies what that route receives.
- **Trace the consequence before stating it.** "Runs before X" doesn't mean "locks everyone out" until you've followed which value gets stored and which value gets compared.
- **Subagent findings are leads, not facts.** Re-check each one with a targeted read before it becomes a claim.

### 4. Try it on real work, and price it

- **If it's cheap to run,** run it on a real fixture from this repo and measure. Don't extrapolate from the tool's benchmark or demo.
- **Price it:**
  - install footprint and runtime dependencies
  - cost per request or per invocation
  - operational burden: new daemons, schedules, config, a second system to keep in sync
  - lock-in: what's hard to undo
- **If you can't run it cheaply,** write "not tested: <why>". Never imply a measurement you didn't take.

### 5. Map the findings onto this project

For each finding, say whether it bites *here*. A proxy-ordering bug doesn't matter with no proxy in front. A per-IP heuristic is dangerous where many users share one IP.

Name the project-specific risk the tool's authors couldn't have seen. It's often what decides the verdict.

### 6. Verdict, and the evaluation doc

The verdict is one of: **adopt** · **adopt part** (name the part) · **not now** (name what would change it) · **skip**.

Write `.claude/project-docs/<tool>-evaluation.md` whether the answer is yes or no:

- version and date tested
- verdict
- claim vs. measured table
- the cost case
- **why we did NOT adopt the parts we skipped.** This is the part that gets argued again later.
- what would change the verdict
- traps already paid for, so nobody pays for them twice

If a later step corrects a finding, fix the doc in the same session. A stale doc is worse than none.

## Optional passes: only when asked

### 7. File upstream

For when the user maintains the tool, or asks to contribute the findings back.

- **Match the repo's conventions.** Read its existing issues, labels and templates, and copy the structure of an issue already there.
- **Confirm the active account has write access**, or labels and edits will fail.
- **One issue per fix.** Symptoms that share one design fix go in one issue.
- **Pin every link.** `file:line` links are permalinks to the commit you evaluated.
- **Security findings on a public repo:** ask the user whether to file publicly or use a private advisory before filing.
- **Cross-references:**
  - Create issues in dependency order and fill `{{KEY}}` placeholders with real numbers.
  - Edit any issue that had to reference a later one.
  - Grep the bodies for leftover placeholders.
  - Write references to other repos as `owner/repo#N`, because link text of just `#N` reads as an issue in *this* repo.
- **Bug issues:** Problem · Why it matters · Fix · Acceptance criteria.
- **Feature issues:** Today (with `file:line`) · Why · Proposal · Acceptance criteria, plus any open decisions, each with a recommended option.

### 8. Competitors and roadmap

For when the user asks how the tool compares or what it should add.

- **Delegate the research, then verify every fact you'll cite:** stars, last push, whether issues are enabled, that each linked issue exists and says what's claimed, and each feature (grep the competitor's README).
- **"Not documented" isn't "absent".** Label which one you mean.
- **Separate evidence from inference.** A demand backed by a linked issue or thread is evidence; everything else is your inference. Say which each recommendation rests on.
- **Every roadmap gets a "not building, and why" table.**
- **A positioning tagline waits** until the features behind each of its clauses have shipped.

## Output shape

```
## tool-compare: <tool> @ <commit or version> (<date>)

**The question** — <what it would solve here, one line>
**Need here** — <evidence the problem exists / doesn't / can't be seen from the sources we have>

### Claims vs. measured
| Claim | Measured | Anchor |
|---|---|---|

**Cost** — <install, per-call, ops, lock-in — or "not tested: why">
**Project-specific risk** — <what bites here that the authors couldn't see>

**Verdict: adopt | adopt part | not now | skip** — <one line>
**Would change it** — <concrete conditions>
**Recorded** — .claude/project-docs/<tool>-evaluation.md
```

## Guardrails

- **Standing verdict first.** Cite an existing evaluation doc instead of re-testing; re-check only what changed.
- **The README sells, the source is the product, and a green suite is just another claim** until you know what it fakes.
- **Never install into the working tree.** Use the scratchpad or a worktree.
- **Never call a problem absent** based on a source that couldn't have recorded it.
- **"Broken" needs two checks:** the feature's docs re-read, and the consequence traced end to end.
- **Verify before a fact becomes a claim, an issue or a table cell**, whether it came from you, a subagent or a research pass.
- **No demonstrated need is a complete verdict.** Don't pad it into a maybe.
- **Filing issues and surveying competitors are opt-in.** Filing publishes, and it can't be un-published.
- **Keep the doc true.** Correct it the moment a later finding contradicts it.
