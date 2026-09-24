---
name: mr-review
version: 2.0.0
description: Perform comprehensive code review on a GitHub PR or GitLab MR
---

# /mr-review - MR/PR Code Review (API-Only, No Local Git Changes)

## Provider resolution (GitHub or GitLab)

This command works on **either GitHub or GitLab** (self-hosted or SaaS). Resolve the provider once at the start, then use that provider's CLI for every operation below.

1. **Detect the provider** from the push remote's host — `git remote get-url origin`:
   - host is `github.com` (or `*.github.com`) → **GitHub** · CLI `gh` · term **PR**
   - any other host (self-hosted GitLab, `gitlab.com`, …) → **GitLab** · CLI `glab` · term **MR**
   - **Override wins:** if `.claude/repo-config.json` has `"provider": "github"` or `"gitlab"`, use that (for ambiguous/self-hosted hosts).
2. **Target resolution** — let the provider CLI auto-detect host/namespace/IDs from git remotes; never hardcode them. Fork workflow (both `origin` and `upstream` remotes present): `origin` = your push target, `upstream` = the MR/PR target.

Review a merge/pull request by fetching everything from the provider's API. Does NOT touch local files, branches, or git state.

## Usage
```
/mr-review <mr-or-pr-number-or-url> [--comment]
```

Accepts a bare number (`123`, `!123`, `#123`) or a full MR/PR URL on either provider. Strip any `!`/`#` prefix and, for a URL, extract the trailing number.

## CRITICAL RULES

1. **NEVER run git stash, git checkout, git switch, git pull, or any command that modifies local git state**
2. **NEVER run linters/formatters/static analysis on local files** (e.g. Pint, PHPStan, Rector, ESLint, Prettier, ruff, gofmt, clippy) — this is a remote review
3. **ALL file content comes from the provider's API**, not from local disk
4. **The local working directory must be untouched** when this command finishes
5. **Scratch files MUST live under `.claude/tmp/mr-review/<NUMBER>/`** — never `/tmp`, never the project root. See "Scratch Files" below.

## Scratch Files

If you need to write any temporary/scratch artefact during this review (raw API JSON, per-agent review dumps, aggregation buffers, anything you'll re-read later), put it under:

```
.claude/tmp/mr-review/<NUMBER>/
```

Rules:
- Create the directory with `mkdir -p .claude/tmp/mr-review/<NUMBER>` before writing.
- Use descriptive filenames (e.g. `mr-meta.json`, `diffs.json`, `review-security.md`).
- `.claude/` is already gitignored, so nothing leaks into the repo.
- Existing `Read`/`Write` permissions cover this path — no extra prompts.
- Do NOT write to `/tmp`, `/var/tmp`, `$TMPDIR`, or anywhere outside the project root.
- Cleanup is optional — leave the dir for the user to inspect; it's gitignored.

## Step-by-Step Implementation

### Step 0: Run the repo's deterministic checks FIRST

If the repo has `.claude/checks/run.py` (or `scripts/checks/`), run it before spawning anything:

```bash
python3 .claude/checks/run.py <base_sha> <head_sha>
```

Seconds, no agents, and it **cannot miss its class** — the one thing agents cannot promise.
Measured on oreem !3379: this layer found a cross-tenant IDOR in 3 seconds that a 303k-token
security agent took 11 minutes to reach and a sibling agent read the same file and missed
entirely — plus a second unscoped admin endpoint that **seven agent runs never surfaced at all**.

Triage the output before reporting any of it (checks trade precision for recall, so expect false
positives), fold the survivors into the final report, and tell the Step 4 agents which classes are
already covered so they don't spend budget re-deriving them.

Not in cwd? Look in the main checkout before concluding there are none — `.claude/` is often
gitignored, so a worktree (e.g. `.claude/tmp/<slug>/`) lacks it while the main checkout has it:
`python3 "$(git worktree list | head -1 | awk '{print $1}')/.claude/checks/run.py" <base_sha> <head_sha>`.
No checks directory in either? Say so once and continue. Afterwards, any confirmed finding whose *class* is
mechanically detectable should become a new check — that is what makes reviews compound instead of
re-rolling the dice at ~250k a throw.

### Step 1: Parse the MR/PR reference

Extract the number from the argument. Strip a leading `!` (GitLab) or `#` (GitHub); if a full URL was passed, take the trailing number. Below, `<N>` is that number.

### Step 2: Fetch MR/PR metadata + changed files from the API

**If the description contains a `<!-- mr-guide -->` block, read it first.** It is the author's
reviewer guide (from `/mr-guide`) — what changed, before/after, data model, UI states. Use it as
context for the review. Do **not** regenerate it, do not review it, and do not repeat it in the
report; the reviewer already has it above the diff.


**GitLab:**
```bash
# MR metadata (title, description, author, labels, state, diff_refs)
glab api projects/<id>/merge_requests/<N>

# Changed files with their diffs
glab api projects/<id>/merge_requests/<N>/diffs
```
From the GitLab `/diffs` response, extract per file:
- `old_path` / `new_path` — file paths
- `diff` — the actual diff content (unified diff format)
- `new_file` / `deleted_file` / `renamed_file` — change type

**GitHub:**
```bash
# PR metadata (title, body, author, labels, state, head/base SHAs)
gh pr view <N> --json number,title,body,author,labels,state,headRefName,baseRefName,headRefOid,baseRefOid,files

# Unified diff for the whole PR
gh pr diff <N>
```
`gh pr view … --json files` gives the changed-file list with `additions`/`deletions`; `gh pr diff <N>` gives the unified diff you split per file. `headRefOid` is the head commit SHA you'll need when posting inline comments.

Display:
```
🔍 Reviewing MR/PR <N>: <title>
👤 Author: <author>
🎯 Target: <target_branch>

📊 Changed Files (<count>):
   • path/to/file1.ext (+40, -12)
   • path/to/file2.ext (+8, -3)
   ...
```

### Step 3: Fetch the MR/PR head into a local ref — do NOT pull content into this context

Agents read the code themselves, from a git ref. Nothing is checked out, no branch is switched, and the working tree is never touched — the ref just lands in `.git`.

**GitLab:**
```bash
git fetch <remote> "refs/merge-requests/<N>/head:refs/mr/<N>"
```
**GitHub:**
```bash
git fetch <remote> "refs/pull/<N>/head:refs/pr/<N>"
```

`<remote>` is the remote pointing at the **target** project — `upstream` in a fork setup, otherwise `origin`. Both providers expose the MR/PR head on the target project, so this covers fork MRs without adding the fork as a remote.

Then compute the base commit once. These two short strings are all this context needs to keep:

```bash
BASE=$(git merge-base refs/mr/<N> <remote>/<target_branch>)
```

Agents receive `refs/mr/<N>`, `BASE`, and the changed-file list — **never file content**. They read what they need with `git show refs/mr/<N>:<path>` and `git diff $BASE..refs/mr/<N> -- <path>`.

**Why:** on an 8-file MR, full content plus diff is ~48k tokens — which under the old flow landed in this context *and* got copied into all five agent prompts. Reading on demand costs each agent about the same as being handed the payload (measured on MR !3192: 55.7k on demand vs ~47.6k handed in) while this context holds a file list instead of the files. The cost moves into subagent context that is discarded, out of main context that is not.

**Fallback** — if the ref fetch fails (some self-hosted GitLab instances disable `merge-requests/*` refs; the checkout may also lack the right remote), fall back to fetching raw content from the API and passing it inline as before:
  - **GitLab:** `glab api "projects/<source_project_id>/repository/files/<url_encoded_path>/raw?ref=<source_branch>"` — URL-encode `/` as `%2F`; `source_project_id` is the fork's id for fork MRs, else the upstream id.
  - **GitHub:** `gh api "repos/{owner}/{repo}/contents/<path>?ref=<headRefName>" -q '.content' | base64 -d` — for fork PRs read the head repo from `gh pr view <N> --json headRepositoryOwner,headRepository`.
  - If raw content also fails, review the diff content only.

  State which path you took, so the user knows whether agents read the tree or were handed a payload.

### Step 4: Spawn Parallel Review Agents

Spawn 5 review agents in a SINGLE message so they run in parallel. Each agent receives the **git ref, the base sha, and the changed-file list** — not file content.

**Scope gate — match the reviewers to what the diff touches.** Decide from the changed-file list alone:
- **Only test files** → spawn **general + testing** only. Measured: a 1-file test-only MR ran 4-5 reviewers for 341k tokens and zero findings; security/performance/architecture average ~60-70k each and have nothing to review there. General stays as the broad net (a test that disables a policy check is still a regression).
- **Only docs / comments / translations** (`*.md`, lang/locale files) → **general** only.
- **Anything else** → all five. When unsure, run all five — the gate only drops a reviewer whose domain is provably absent.

State in the report's Coverage which reviewers ran and why any were skipped.

**IMPORTANT**: Do NOT paste file content or diffs into these prompts. Hand agents the ref and let them read what they need. If Step 3 fell back to the API path, paste content inline as the old flow did — that fallback is the only case where inline content is correct.

**All five agents are pinned to sonnet — keep the `model=` argument on every call.** Pinning matters independently of the value: without it, editing an agent's frontmatter silently retunes `/mr-review`, because these agents are shared with `/review` and `/nitpick`.

Why sonnet across the board, measured rather than assumed — an A/B on MR !3192 (a controller dedupe touching a policy path and a form-request `authorize()`) ran the security reviewer on both tiers with identical input:

| | tool calls | tokens | wall clock | verdict |
| --- | --- | --- | --- | --- |
| sonnet | 21 | 55.7k | 2m 08s | `[]` |
| opus | 46 | 106.1k | 9m 03s | `[]` |

Same verdict, 1.9× the tokens, 4.2× the time. The wall clock is the decisive part: these five run in parallel, so **the slowest agent gates the entire review**. One opus agent turns every review into a nine-minute wait — paid on all reviews, including the clean majority.

**Escalation for security-sensitive MRs:** run `/nitpick` instead. It pins no models, so it inherits opus for security and architecture from their frontmatter. Reach for it when the MR touches authorization, policies, gates, middleware, or tenant scoping — rather than paying that tier on every routine review.

⚠️ **It is not the same reviewer set.** `/nitpick` spawns **four** — general, security, performance, architecture. It has **no testing-reviewer**. So escalating trades the testing pass away for opus on two agents, and the testing pass is not filler: on MR !3215 (2026-08-13) it was the one that mutated the code and found two checks nothing constrained — deleting the under-lock re-check left all 35 tests green. If the MR is security-sensitive *and* touches tests or invariants, run `/mr-review` and escalate only the finding you doubt.

> Caveat on the A/B above: both agents were told to return only a JSON array. Sonnet complied; opus narrated first. That makes opus's checking *visible* and sonnet's invisible — it does not establish that sonnet checked less. The result supports the cost claim, not a claim about relative depth.

**The read block** — substitute this verbatim wherever a prompt below says `<READ BLOCK>`, filling in `<N>`, `<BASE>`, and the file list from Step 3. The checkout warning is not optional: all five agents share your working tree, and one `git checkout` would yank it out from under the other four and the user.

```
The MR/PR head is available as the local git ref `refs/mr/<N>`. It is NOT checked out.
Do NOT run `git checkout`, do NOT switch branches, do NOT stash, do NOT modify the
working tree in any way — four other agents and the user are sharing it right now.

Read full file content:   git show refs/mr/<N>:<path>
See what this MR changed: git diff <BASE>..refs/mr/<N> -- <path>

Read every changed file you need in full — do not review from the diff alone.

Changed files:
<one path per line>
```

**The return block** — substitute verbatim for `<RETURN BLOCK>`:

```
Return findings as a JSON array. Each finding MUST have:
- severity: CRITICAL, IMPORTANT, or MINOR
- file: the new path of the file (for a missing test, the production file)
- line: the exact line in the NEW version of the file (for a missing test, the untested method's line)
- title: short one-line summary
- description: detailed explanation with suggested fix
Example: [{\"severity\":\"IMPORTANT\",\"file\":\"src/foo.ext\",\"line\":42,\"title\":\"Missing null check\",\"description\":\"...\"}]
```

**If the named reviewer agents don't exist in this environment** (`security-reviewer`,
`testing-reviewer`, …), don't fail and don't silently skip a role: run each role's brief on
`general-purpose` pinned to sonnet, and say in the report which substitution you made. Observed
2026-09-16 on a host that had none of them.

**IMPORTANT (every agent)**: end each prompt with a required coverage declaration —
*"After the JSON, add one line — `COVERAGE-GAPS:` what you did NOT examine closely, and why."*

This is not bookkeeping. Silence from a reviewer currently reads as "checked, it's fine" when it
usually means "never looked", and the gaps are where the next round should start. Measured on
!3379: round 1's declared gaps became round 2's targets, and round 2 found the worst bug in the MR.
Read the field for what it is, though — it reports what was not **read**, not what was read and not
**noticed**, which is where most misses actually live.

**IMPORTANT (every agent)**: Append this line to each agent prompt below — *"Report only objective defects (crashes, security holes, logic errors, broken/contradictory behavior, real data bugs). Do NOT report subjective preferences, aesthetic opinions, or behavior that is plausibly intentional as findings. If you think a behavior might be a bug but it could just as easily be a deliberate design choice, do not assert it — leave it out (the synthesizer handles intent questions). Never invent a 'fix' for an intended behavior."*

**Agent 1** — General Review:
```
Agent(subagent_type="general-reviewer", model="sonnet", description="General MR/PR review", prompt="
Review this MR/PR for cross-cutting concerns, logic errors, code quality, and test coverage.

MR/PR: <N> - <title>
Description: <description>

<READ BLOCK>

Focus on: logic errors, missing edge cases, error handling, code clarity, test coverage gaps.
<RETURN BLOCK>
")
```

**Agent 2** — Security Review:
```
Agent(subagent_type="security-reviewer", model="sonnet", description="Security MR/PR review", prompt="
Deep security review of this MR/PR.

MR/PR: <N> - <title>

<READ BLOCK>

Check for: injection (SQL/command/template), XSS, CSRF, missing authorization/permission checks, hardcoded secrets, mass assignment / over-posting, tenant or ownership scoping in multi-tenant systems, unvalidated user input, unsafe deserialization.
<RETURN BLOCK>
")
```

**Agent 3** — Performance Review:
```
Agent(subagent_type="performance-reviewer", model="sonnet", description="Performance MR/PR review", prompt="
Performance review of this MR/PR.

MR/PR: <N> - <title>

<READ BLOCK>

Check for: N+1 / repeated queries (missing eager loading/batching), fetching more columns/rows than needed, missing pagination, missing caching, expensive work inside loops, missing indexes for new query patterns, unnecessary data loading.
<RETURN BLOCK>
")
```

**Agent 4** — Architecture Review:
```
Agent(subagent_type="architecture-reviewer", model="sonnet", description="Architecture MR/PR review", prompt="
Architecture review of this MR/PR.

MR/PR: <N> - <title>

<READ BLOCK>

Check for: business logic leaking into controllers/handlers (should live in a service/domain layer), missing input-validation layer, missing DTOs/value objects for complex data, correct transaction boundaries for multi-entity writes, dependency injection vs hardcoded construction, proper separation of concerns.
<RETURN BLOCK>
")
```

**Agent 5** — Testing Review:
```
Agent(subagent_type="testing-reviewer", model="sonnet", description="Testing MR/PR review", prompt="
Testing review of this MR/PR.

MR/PR: <N> - <title>
Description: <description>

<READ BLOCK>

Check for: missing test coverage for new/changed public methods, weak assertions (status-only without checking the response body/state), missing edge-case tests, isolation between test cases, correct fixtures/factories, and (in multi-tenant systems) tenant/ownership scoping in tests.
<RETURN BLOCK>
")
```

### Step 4b: One handoff round (high-stakes MRs)

When the change moves money, touches auth/tenancy, or is otherwise expensive to get wrong, run ONE
more agent after the parallel set — same generalist brief, but handed:

- **every finding so far, with "do NOT re-report these"**, and
- **the union of the agents' `COVERAGE-GAPS`, as its starting priorities.**

Ask it for new findings, plus a `CORRECTIONS:` line naming anything already reported that is wrong
or mis-severitied.

This is the highest-yield agent in the whole command, because it is the only one not re-sampling
ground already covered. On !3379 it cost ~219k and returned two findings nobody else had — including
the most severe in the MR (a Cart whose auto-capture fails takes the customer's money and never
creates an order, with no recovery path). It also re-verified five earlier findings and corrected
none, which is itself worth knowing.

Skip it on small or low-risk diffs; it is a real cost (~140-220k). **Name the trigger in the report's
Coverage** ("round 2: moves money — Cart capture path") — no nameable trigger, no round 2. Measured:
a 4-file MR ran two full rounds for 1.17M tokens with no trigger recorded, more than several larger MRs.

### Step 5: Collect and Merge Results

1. Wait for every agent you spawned (five, or fewer under the scope gate)
2. Parse the JSON arrays from each agent's response
3. Tag each finding with its source category: `security`, `performance`, `architecture`, `testing`, or `general`
4. **Critically evaluate each finding** — do NOT blindly accept agent findings. For each finding, ask: "Is this a real problem in the actual usage context, or just a theoretical edge case?" Downgrade or discard findings that are technically correct but practically irrelevant. Review agents tend to flag theoretical issues that may never occur in practice — your job is to filter signal from noise.
4b. **Separate DEFECTS from DESIGN/INTENT questions.** A finding is only a *defect* (CRITICAL/IMPORTANT/MINOR) when it is objectively wrong: a crash, a security hole, a logic error, a broken/contradictory behavior, a real data bug. If instead the finding is a **subjective preference, an aesthetic opinion, or a behavior that is plausibly intentional** (e.g. "roundness 0 makes corners fully square", "this default could be different", "this copy/UX could be nicer", "consider a different threshold"), it is **NOT a defect** — do not assign it a severity and do not prescribe a "fix". Reclassify it as an **Open Question** with `category: "question"` and phrase it as a question to the author ("Is X intended?"), never as "Fix: change X". When unsure whether something is a defect or an intentional choice, default to treating it as a question. The bar: would a reasonable author unambiguously agree it's broken? If not, it's a question, not a finding.
4c. **Verify every surviving finding against the code before it reaches the report.** Open the file,
   confirm the claim, and check the mitigation the agent may not have looked for — a global scope, a
   middleware, a framework default. Agents are accurate about *what they looked at* and confidently
   wrong about *what they assumed*. Measured on !3379: 7 of 7 findings were substantively correct,
   but one claimed a lock was held indefinitely "because no timeout is set" when Laravel's HTTP
   client defaults to `timeout => 30` — real worst case ~90s, not unbounded. Posting the overstated
   version would have got it dismissed, and taken the credibility of the other six with it. Cost: a
   handful of greps.

5. Deduplicate — if 2+ agents found the same issue (same file + same/adjacent line), keep the most detailed one
6. Cross-reference — if 2+ agents flagged the same thing, note it as corroborated but do NOT automatically upgrade severity. Multiple agents agreeing on a theoretical issue doesn't make it more real.
7. Sort by severity: CRITICAL > IMPORTANT > MINOR

### Step 6: Generate Report

```markdown
## Code Review — MR/PR <N>

### Summary
- **Files Reviewed**: X
- **Reviewers**: General, Security, Performance, Architecture, Testing
- **Issues Found**: Y

### Severity Breakdown
| Severity | Count |
|----------|-------|
| CRITICAL | N |
| IMPORTANT | N |
| MINOR | N |

### Security Findings
<from security-reviewer>

### Performance Findings
<from performance-reviewer>

### Architecture Findings
<from architecture-reviewer>

### Testing Findings
<from testing-reviewer>

### General Findings
<from general-reviewer>

### Open Questions (design / intent — NOT defects)
<Anything reclassified per Step 5.4b: plausibly-intentional behavior, subjective/aesthetic preferences, or "could be different" choices. Phrase each as a question for the author, with NO prescribed fix and NO severity. If there are none, omit this section. These never count toward the severity breakdown or change the verdict.>

### Coverage
- **Checks run**: <which deterministic checks ran, and what they covered>
- **Rules used**: <per reviewer: project-specific rules file, or generic practice because the file was missing. Name any role that fell back — silence reads as "checked against project rules" when it wasn't>
- **Round 2**: <"ran — <trigger>: <what>" or "skipped — no money/auth/tenancy trigger">
- **Not examined**: <union of the agents' COVERAGE-GAPS>
- **Estimated remaining**: <see below>

### Verdict
**APPROVED** / **APPROVED WITH SUGGESTIONS** / **CHANGES REQUESTED**
- Any CRITICAL → CHANGES REQUESTED
- Only IMPORTANT/MINOR → APPROVED WITH SUGGESTIONS
- Clean → APPROVED

**Never present a clean review as proof the code is clean.** Say "no findings from the passes that
ran", and name what was not examined. This is not hedging; it is measured. On !3379, two runs of the
*same* reviewer role agreed on only 20–33% of findings; one agent read the exact file containing a
cross-tenant IDOR and reported something else in it; and after seven runs and ~1.6M tokens a fresh
reviewer still found three issues with **zero** overlap with the previous thirteen. A single pass
finds roughly a quarter to a half of what is there, and you cannot tell which.

**Estimate what's left** when two or more passes covered the same ground: if pass A found `a`, pass B
found `b`, and they share `m`, then total ≈ `a × b / m`, so remaining ≈ that minus what you have. It
is a floor — easy bugs are found by both passes and inflate `m`, which biases the estimate down. If
`m` is 0, you have no estimate at all and no evidence of saturation; say exactly that and recommend
another round rather than implying completeness.

---
🤖 Generated by Claude Code `/mr-review`
```

### Step 7: Post to the provider (if --comment)

If `--comment` was passed, ask the user first, then post each **defect** as a resolvable thread on
its line, and one summary comment. Open Questions go in the summary, phrased as questions — not as threads.

**GitLab — run the script; never hand-write the posting loop.** Write the findings with a real
serializer (a Python heredoc calling `json.dump`) to `.claude/tmp/mr-review/<N>/findings.json`:

```json
[{"title": "<title>", "path": "<new path>", "line": 42,
  "body": "### <EMOJI> <SEVERITY>: <title>\n\n<description>\n\n---\n_Category: <category> | Review by Claude Code `/mr-review`_"}]
```

`line` is the finding's line in the NEW file, `"old:<n>"` for removed code, or `null`. The heading
must carry the same `title` string — that is how a later run recognises the thread.

```bash
~/.claude/scripts/mr-note.py post <N> .claude/tmp/mr-review/<N>/findings.json
```

It anchors each finding against the MR's **current** head (context lines snap to the nearest added
line; lines outside the diff become general threads carrying `path:line`), checks every note came
back anchored, skips findings already on the MR, and prints one line per finding —
`anchored|general|exists <discussion_id>` or `FAILED <reason>`. Report any `FAILED` line. Re-running
is safe: nothing is posted twice.

**Why a script:** posting was the most-failing step of this command. Measured 2026-08-31..09-23 across
81 runs: GitLab rejected context-line anchors (`line_code can't be blank`) in ~25 sessions, and
hand-rolled response parsing threw `JSONDecodeError` in 8+ — each run re-deriving the same loop and
tripping a different trap. The traps are listed in the script's header.

**GitHub** — anchor first (`git diff <BASE>..refs/pr/<N> | ~/.claude/scripts/diff-anchor.py findings.txt`,
lines `<n>|<path>|<line>`), then per finding:
```bash
gh api --method POST "repos/{owner}/{repo}/pulls/<N>/comments" \
  -f body="<body>" -f commit_id="<headRefOid>" -f path="<file>" -F line=<line> -f side=RIGHT
```
`side=LEFT` for an `old_line` anchor; `unanchorable` → `gh pr comment <N> --body "…"` with `path:line` in the body.

**Summary comment** — `glab mr note <N> -m "…"` / `gh pr comment <N> --body "…"`:

```markdown
## Code Review Summary — MR/PR <N>

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | N |
| 🟡 IMPORTANT | N |
| 🔵 MINOR | N |

**Verdict**: <APPROVED / APPROVED WITH SUGGESTIONS / CHANGES REQUESTED>

Each finding is posted as a separate resolvable thread on the relevant line.
<Open Questions, if any, as questions>

---
_Review by Claude Code `/mr-review`_
```

## Large MRs/PRs (20+ files)

With Step 3's ref, this context never holds file content — so there is nothing to pre-fetch and no top-N cap to enforce. What still needs managing is each *agent's* own budget on a very large change.

If the MR/PR has 20+ changed files:
1. Tell the user: "This MR/PR has X files. Agents will read the highest-risk ones in full (entry points, business logic, data models) and take the rest as needed."
2. Order the paths in the read block's file list by risk — request handlers / controllers, services, models/schemas, and validation/input layers first; tests, fixtures, and generated files last.
3. Add to each agent prompt: *"Read the highest-risk files in full first. If you are running low on context, review the remainder from the diff alone and say so explicitly in your response."*
4. Note in the report if any agent said it fell back to diff-only, and for which files.

This is a soft budget, not the old hard cap: an agent that needs file #40 can still read it. Nothing is withheld from agents — they simply choose what to spend context on.

## What This Command Does NOT Do

- Does NOT run `git stash`, `git checkout`, `git switch`, or any git state changes
- Does NOT run linters/formatters/static analysis locally (Pint, PHPStan, Rector, ESLint, Prettier, ruff, gofmt, clippy, …)
- Does NOT modify any local files
- Does NOT require the MR/PR branch to exist locally
- Does NOT require a clean working tree
