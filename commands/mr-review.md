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
3. **Shortcuts & config** — optional per-repo `.claude/repo-config.json` (or legacy `.claude/gitlab-config.json`) supplies `developers` (reviewer/assignee shortcuts → usernames/ids) and `labels` (auto-label rules). **Absent → degrade gracefully:** accept a raw username, skip label automation, don't error.

> Examples below use placeholders (`<HOST>`, `<PROJECT_PATH>`, usernames `alice`/`bob`/`carol`) — resolve real values at runtime.

### CLI cheat-sheet — GitLab ↔ GitHub
| Operation | GitLab (`glab`) | GitHub (`gh`) |
| --- | --- | --- |
| Create MR/PR | `glab api --method POST projects/<id>/merge_requests -F source_branch=… -F target_branch=…` (fork: add `-F target_project_id=<up>`) | `gh pr create --base <target> --head <branch> --title … --body …` (handles remotes/fork itself) |
| Reviewer | `-F reviewer_ids[]=<id>` (resolve id first) | `--reviewer <username>` (or `gh pr edit <n> --add-reviewer <u>`) |
| Assignee | `-F assignee_id=<id>` | `--assignee <username>` |
| Draft | prefix title `Draft: …` | `--draft` |
| username → id | `glab api "users?username=<u>" \| jq '.[0].id'` | not needed — `gh` uses usernames directly |
| List MRs/PRs | `glab mr list` | `gh pr list` |
| View diff | `glab mr diff <id>` (or `glab api projects/<id>/merge_requests/<n>/changes`) | `gh pr diff <n>` |
| MR/PR metadata | `glab api projects/<id>/merge_requests/<n>` | `gh pr view <n> --json …` |
| Comment (general) | `glab mr note <n> -m "…"` | `gh pr comment <n> --body "…"` |
| Inline/threaded review comment | `glab api --method POST projects/<id>/merge_requests/<n>/discussions -F body=… -F position[...]=…` | `gh api --method POST repos/{owner}/{repo}/pulls/<n>/comments -f body=… -f commit_id=… -f path=… -F line=…` |
| Resolve a thread | `glab api --method PUT …/discussions/<discussion_id> -F resolved=true` | `gh api graphql` `resolveReviewThread` (or resolve in UI) |
| Approve | `glab mr approve <n>` | `gh pr review <n> --approve` |

**Notes:** GitHub creation is simpler — prefer `gh pr create` (no project IDs / fork math). Keep the `glab api` fork recipe for GitLab. Where an operation has no clean CLI on a provider (e.g. resolving a specific review thread on GitHub), say so and fall back to the closest equivalent or the web UI rather than pretending.

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

### Step 1: Parse the MR/PR reference

Extract the number from the argument. Strip a leading `!` (GitLab) or `#` (GitHub); if a full URL was passed, take the trailing number. Below, `<N>` is that number.

### Step 2: Fetch MR/PR metadata + changed files from the API

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

### Step 3: Fetch full file content from the API

For each changed file (that is not deleted), fetch the full file content from the MR/PR's source branch so agents review the file in context, not just the hunk.

**URL-encode the file path** where the API needs it: replace `/` with `%2F` in the path.

**GitLab:**
```bash
# Raw file content from the source branch.
# The ref is source_branch from the MR metadata.
glab api "projects/<source_project_id>/repository/files/<url_encoded_path>/raw?ref=<source_branch>"
```
**Source project ID**: check if the MR is from a fork — use `source_project_id` from the MR metadata (the fork's id if forked, else the upstream project id).

**GitHub:**
```bash
# Raw file content from the head branch (works for same-repo and fork PRs).
gh api "repos/{owner}/{repo}/contents/<path>?ref=<headRefName>" -q '.content' | base64 -d
# For a fork PR, {owner}/{repo} is the PR's head repo — read it from:
#   gh pr view <N> --json headRepositoryOwner,headRepository
```

If fetching the raw file fails on either provider, fall back to reviewing only the diff content.

### Step 4: Spawn Parallel Review Agents

Spawn 5 review agents in a SINGLE message so they run in parallel. Each agent receives the **diff content and full file content** (NOT local file paths).

**IMPORTANT**: Pass the actual file content and diffs inline in the prompt. Do NOT tell agents to read local files.

**IMPORTANT (every agent)**: Append this line to each agent prompt below — *"Report only objective defects (crashes, security holes, logic errors, broken/contradictory behavior, real data bugs). Do NOT report subjective preferences, aesthetic opinions, or behavior that is plausibly intentional as findings. If you think a behavior might be a bug but it could just as easily be a deliberate design choice, do not assert it — leave it out (the synthesizer handles intent questions). Never invent a 'fix' for an intended behavior."*

**Agent 1** — General Review:
```
Agent(subagent_type="general-reviewer", description="General MR/PR review", prompt="
Review this MR/PR for cross-cutting concerns, logic errors, code quality, and test coverage.

MR/PR: <N> - <title>
Description: <description>

Changed files and their FULL content:
<for each file>
=== FILE: <path> ===
<full file content>
=== DIFF: <path> ===
<diff content>
</for each file>

Focus on: logic errors, missing edge cases, error handling, code clarity, test coverage gaps.
Return findings as a JSON array. Each finding MUST have:
- severity: CRITICAL, IMPORTANT, or MINOR
- file: the new path of the file
- line: the exact line number in the NEW version of the file where the issue is
- title: short one-line summary
- description: detailed explanation with suggested fix
Example: [{\"severity\":\"IMPORTANT\",\"file\":\"src/controllers/foo.ext\",\"line\":42,\"title\":\"Missing null check\",\"description\":\"...\"}]
")
```

**Agent 2** — Security Review:
```
Agent(subagent_type="security-reviewer", description="Security MR/PR review", prompt="
Deep security review of this MR/PR.

MR/PR: <N> - <title>

Changed files and their FULL content:
<files and diffs>

Check for: injection (SQL/command/template), XSS, CSRF, missing authorization/permission checks, hardcoded secrets, mass assignment / over-posting, tenant or ownership scoping in multi-tenant systems, unvalidated user input, unsafe deserialization.
Return findings as a JSON array. Each finding MUST have:
- severity: CRITICAL, IMPORTANT, or MINOR
- file: the new path of the file
- line: the exact line number in the NEW version of the file where the issue is
- title: short one-line summary
- description: detailed explanation with suggested fix
Example: [{\"severity\":\"CRITICAL\",\"file\":\"src/controllers/foo.ext\",\"line\":15,\"title\":\"SQL injection\",\"description\":\"...\"}]
")
```

**Agent 3** — Performance Review:
```
Agent(subagent_type="performance-reviewer", description="Performance MR/PR review", prompt="
Performance review of this MR/PR.

MR/PR: <N> - <title>

Changed files and their FULL content:
<files and diffs>

Check for: N+1 / repeated queries (missing eager loading/batching), fetching more columns/rows than needed, missing pagination, missing caching, expensive work inside loops, missing indexes for new query patterns, unnecessary data loading.
Return findings as a JSON array. Each finding MUST have:
- severity: CRITICAL, IMPORTANT, or MINOR
- file: the new path of the file
- line: the exact line number in the NEW version of the file where the issue is
- title: short one-line summary
- description: detailed explanation with suggested fix
Example: [{\"severity\":\"IMPORTANT\",\"file\":\"src/models/order.ext\",\"line\":88,\"title\":\"N+1 query\",\"description\":\"...\"}]
")
```

**Agent 4** — Architecture Review:
```
Agent(subagent_type="architecture-reviewer", description="Architecture MR/PR review", prompt="
Architecture review of this MR/PR.

MR/PR: <N> - <title>

Changed files and their FULL content:
<files and diffs>

Check for: business logic leaking into controllers/handlers (should live in a service/domain layer), missing input-validation layer, missing DTOs/value objects for complex data, correct transaction boundaries for multi-entity writes, dependency injection vs hardcoded construction, proper separation of concerns.
Return findings as a JSON array. Each finding MUST have:
- severity: CRITICAL, IMPORTANT, or MINOR
- file: the new path of the file
- line: the exact line number in the NEW version of the file where the issue is
- title: short one-line summary
- description: detailed explanation with suggested fix
Example: [{\"severity\":\"IMPORTANT\",\"file\":\"src/controllers/foo.ext\",\"line\":30,\"title\":\"Fat controller\",\"description\":\"...\"}]
")
```

**Agent 5** — Testing Review:
```
Agent(subagent_type="testing-reviewer", description="Testing MR/PR review", prompt="
Testing review of this MR/PR.

MR/PR: <N> - <title>
Description: <description>

Changed files and their FULL content:
<files and diffs>

Check for: missing test coverage for new/changed public methods, weak assertions (status-only without checking the response body/state), missing edge-case tests, isolation between test cases, correct fixtures/factories, and (in multi-tenant systems) tenant/ownership scoping in tests.
Return findings as a JSON array. Each finding MUST have:
- severity: CRITICAL, IMPORTANT, or MINOR
- file: the new path of the file (for missing tests, use the production file path)
- line: the exact line number in the NEW version of the file where the issue is (for missing tests, use the line of the untested method)
- title: short one-line summary
- description: detailed explanation with suggested fix
Example: [{\"severity\":\"IMPORTANT\",\"file\":\"src/services/order_service.ext\",\"line\":45,\"title\":\"Missing test for processRefund()\",\"description\":\"...\"}]
")
```

### Step 5: Collect and Merge Results

1. Wait for all 5 agents to complete
2. Parse the JSON arrays from each agent's response
3. Tag each finding with its source category: `security`, `performance`, `architecture`, `testing`, or `general`
4. **Critically evaluate each finding** — do NOT blindly accept agent findings. For each finding, ask: "Is this a real problem in the actual usage context, or just a theoretical edge case?" Downgrade or discard findings that are technically correct but practically irrelevant. Review agents tend to flag theoretical issues that may never occur in practice — your job is to filter signal from noise.
4b. **Separate DEFECTS from DESIGN/INTENT questions.** A finding is only a *defect* (CRITICAL/IMPORTANT/MINOR) when it is objectively wrong: a crash, a security hole, a logic error, a broken/contradictory behavior, a real data bug. If instead the finding is a **subjective preference, an aesthetic opinion, or a behavior that is plausibly intentional** (e.g. "roundness 0 makes corners fully square", "this default could be different", "this copy/UX could be nicer", "consider a different threshold"), it is **NOT a defect** — do not assign it a severity and do not prescribe a "fix". Reclassify it as an **Open Question** with `category: "question"` and phrase it as a question to the author ("Is X intended?"), never as "Fix: change X". When unsure whether something is a defect or an intentional choice, default to treating it as a question. The bar: would a reasonable author unambiguously agree it's broken? If not, it's a question, not a finding.
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

### Verdict
**APPROVED** / **APPROVED WITH SUGGESTIONS** / **CHANGES REQUESTED**
- Any CRITICAL → CHANGES REQUESTED
- Only IMPORTANT/MINOR → APPROVED WITH SUGGESTIONS
- Clean → APPROVED

---
🤖 Generated by Claude Code `/mr-review`
```

### Step 7: Post to the provider (if --comment)

If the `--comment` flag was provided, ask the user for permission first, then post each finding as an **inline comment on the specific line** in the diff, followed by one summary comment.

#### Step 7a: Get the positioning info

**GitLab** — from the MR metadata (Step 2), extract the SHA values needed for positioning a diff discussion:
- `diff_refs.base_sha` — the merge base
- `diff_refs.head_sha` — the latest commit on the source branch
- `diff_refs.start_sha` — the start of the diff

**GitHub** — inline PR comments need the head commit SHA and the diff `line`:
- `commit_id` — the head commit SHA (`headRefOid` from Step 2, or `gh pr view <N> --json headRefOid -q .headRefOid`)
- `path` + `line` — the file path and the line number in the NEW version of the file

#### Step 7b: Post each finding as an inline comment

**GitLab** — create a resolvable discussion on the specific diff line:
```bash
glab api --method POST "projects/<id>/merge_requests/<N>/discussions" \
  -f "body=### <SEVERITY_EMOJI> <severity>: <title>

<description>

---
_Category: <category> | Review by Claude Code \`/mr-review\`_" \
  -f "position[position_type]=text" \
  -f "position[base_sha]=<base_sha>" \
  -f "position[head_sha]=<head_sha>" \
  -f "position[start_sha]=<start_sha>" \
  -f "position[new_path]=<file>" \
  -f "position[old_path]=<old_path_from_diffs>" \
  -f "position[new_line]=<line>"
```

**GitHub** — create a review comment on the specific line (`{owner}/{repo}` is auto-resolved by `gh` from remotes):
```bash
gh api --method POST "repos/{owner}/{repo}/pulls/<N>/comments" \
  -f body="### <SEVERITY_EMOJI> <severity>: <title>

<description>

---
_Category: <category> | Review by Claude Code \`/mr-review\`_" \
  -f commit_id="<head_sha>" \
  -f path="<file>" \
  -F line=<line> \
  -f side=RIGHT
```
(`side=RIGHT` targets the new version of the file. For a multi-line range add `-F start_line=<n> -f start_side=RIGHT`.)

**Severity emojis**: CRITICAL = `🔴`, IMPORTANT = `🟡`, MINOR = `🔵`

**IMPORTANT notes on positioning**:
- The target line MUST be a line that appears in the diff (added or unchanged context). If the finding's line is not in the diff, snap to the nearest line that is, or fall back to a general comment (Step 7c handling).
- GitLab: `old_path` = the `old_path` from the `/diffs` response for that file (for new files, use the same value as `new_path`); comment on `new_line` only (the new version), not `old_line`.
- GitHub: `line` is the line in the NEW file; keep `side=RIGHT`.

#### Step 7c: Post the summary comment

After all inline comments, post one summary comment.

**GitLab:**
```bash
glab mr note <N> -m "## Code Review Summary — MR <N>

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | N |
| 🟡 IMPORTANT | N |
| 🔵 MINOR | N |

**Verdict**: <APPROVED / APPROVED WITH SUGGESTIONS / CHANGES REQUESTED>

Each finding is posted as a separate resolvable discussion on the relevant code line.

---
_Review by Claude Code \`/mr-review\`_"
```

**GitHub:**
```bash
gh pr comment <N> --body "## Code Review Summary — PR <N>

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | N |
| 🟡 IMPORTANT | N |
| 🔵 MINOR | N |

**Verdict**: <APPROVED / APPROVED WITH SUGGESTIONS / CHANGES REQUESTED>

Each finding is posted as a separate inline review comment on the relevant code line.

---
_Review by Claude Code \`/mr-review\`_"
```

#### Handling position errors

If an inline comment POST fails with a position error (e.g. the line isn't in the diff), fall back to posting it as a general comment with the location in the body.

**GitLab:**
```bash
glab mr note <N> -m "### <SEVERITY_EMOJI> <severity>: <title> (\`<file>:<line>\`)

<description>

---
_Category: <category> | Review by Claude Code \`/mr-review\`_"
```

**GitHub:**
```bash
gh pr comment <N> --body "### <SEVERITY_EMOJI> <severity>: <title> (\`<file>:<line>\`)

<description>

---
_Category: <category> | Review by Claude Code \`/mr-review\`_"
```

## Large MRs/PRs (20+ files)

If the MR/PR has 20+ changed files:
1. Tell the user: "This MR/PR has X files. I'll prioritize the highest-risk ones (entry points, business logic, data models)."
2. Fetch full content for the top ~15 most critical files (request handlers / controllers, services, models/schemas, and validation/input layers first)
3. For remaining files, review only the diff content
4. Note in the report which files got full vs diff-only review

## API Reference

**GitLab (`glab`):**
```bash
# MR metadata (includes diff_refs with base_sha, head_sha, start_sha)
glab api projects/<id>/merge_requests/<N>

# MR diffs (changed files with diff content)
glab api projects/<id>/merge_requests/<N>/diffs

# Raw file content from a branch
glab api "projects/<PROJECT_ID>/repository/files/<URL_ENCODED_PATH>/raw?ref=<BRANCH>"

# Post resolvable discussion on a specific diff line
glab api --method POST "projects/<id>/merge_requests/<N>/discussions" \
  -f "body=..." \
  -f "position[position_type]=text" \
  -f "position[base_sha]=<base_sha>" \
  -f "position[head_sha]=<head_sha>" \
  -f "position[start_sha]=<start_sha>" \
  -f "position[new_path]=<file>" \
  -f "position[old_path]=<old_path>" \
  -f "position[new_line]=<line>"

# Post general note (for summary or fallback)
glab mr note <N> -m "..."
```

**GitHub (`gh`):**
```bash
# PR metadata + changed files (pick the fields you need)
gh pr view <N> --json number,title,body,author,labels,state,headRefName,baseRefName,headRefOid,files

# Unified diff for the whole PR
gh pr diff <N>

# Raw file content from the head branch
gh api "repos/{owner}/{repo}/contents/<PATH>?ref=<BRANCH>" -q '.content' | base64 -d

# Post inline review comment on a specific diff line
gh api --method POST "repos/{owner}/{repo}/pulls/<N>/comments" \
  -f body="..." -f commit_id="<head_sha>" -f path="<file>" -F line=<line> -f side=RIGHT

# Post general comment (for summary or fallback)
gh pr comment <N> --body "..."
```

## What This Command Does NOT Do

- Does NOT run `git stash`, `git checkout`, `git switch`, or any git state changes
- Does NOT run linters/formatters/static analysis locally (Pint, PHPStan, Rector, ESLint, Prettier, ruff, gofmt, clippy, …)
- Does NOT modify any local files
- Does NOT require the MR/PR branch to exist locally
- Does NOT require a clean working tree
