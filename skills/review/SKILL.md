---
disable-model-invocation: true
name: review
description: "Fast parallel review of local changes or a GitLab MR (security, performance, architecture reviewers). Run only when the user explicitly asks for it."
---
# /review - Code Review (Parallel, Fast)

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

**Purpose**: Quick but thorough code review using parallel specialized agents
**Depth**: FAST (uses sonnet-level agents for speed)
**Compare with**: `/mr-review` — reviews an MR/PR from a fetched ref (not local changes), with a scope gate, verification and posting via `/fix-review`. `/mr-review --deep` puts security + architecture on opus for auth/tenancy/money MRs.

---

## Quick Usage

```
/review                              # Review uncommitted changes (parallel agents)
/review file app/Services/Order.php  # Review specific file
```

For MR/PR reviews, use `/mr-review` (add `--deep` for auth/tenancy/money changes).

---

## How It Works (Parallel Fan-Out)

```
/review (local changes)
  └── Main context (YOU are the orchestrator)
      ├── [PARALLEL] general-reviewer     → broad sweep, logic, cross-cutting
      ├── [PARALLEL] security-reviewer    → deep security analysis
      ├── [PARALLEL] performance-reviewer → N+1, caching, queries
      ├── [PARALLEL] architecture-reviewer→ patterns, controllers, services
      ├── [PARALLEL] testing-reviewer     → test coverage, assertion quality
      ├── [PARALLEL] Pint/PHPStan         → automated tools
      └── COLLECT → deduplicate → unified report
```

**CRITICAL**: YOU (main context) are the orchestrator. Do NOT spawn mr-code-reviewer.

---

## Steps

### Step 1: Get Changed Files & Assess Scope

```bash
git diff --name-only --diff-filter=ACMR HEAD
git diff HEAD
```

Count the changed files. If 20+ files, tell the user:
"You have X changed files. I'll focus on the most critical ones first (controllers, services, models). Want a full review or focused?"

### Step 2: Gather Context (Quick)


Ask the user (use AskUserQuestion, or ask in plain text if your agent lacks it) — keep it lightweight since this is a fast review:

1. **Focus areas**: Anything specific to watch for? (security, performance, patterns — or "just review it")

If the user says "just review" or skips, proceed with full review.
**Pass user focus areas to agents** in their prompts so they prioritize accordingly.

### Step 3: Spawn ALL 6 Tasks in ONE Message (PARALLEL)

(Task = Claude subagent tool; on agents without subagents, run each review pass yourself in sequence.)
**CRITICAL**: All 6 Task calls MUST be in a single message so they execute in parallel.
**DEPTH**: For `/review`, set `model: "sonnet"` on all agents for speed.

**Task 1** - General Review:
```
Task(subagent_type="general-reviewer", model="sonnet", description="General review", prompt="Review these local changes for cross-cutting concerns, logic errors, frontend-backend mismatches, code quality. Read these changed files: <file_list>. Diff context: <diff>")
```

**Task 2** - Security Review:
```
Task(subagent_type="security-reviewer", model="sonnet", description="Security review", prompt="Security review of local changes. FIRST: Read .claude/review-rules/security-rules.md in the main checkout if it exists. Then check EVERY changed file. Read these files: <file_list>")
```

**Task 3** - Performance Review:
```
Task(subagent_type="performance-reviewer", model="sonnet", description="Performance review", prompt="Performance review of local changes. FIRST: Read .claude/review-rules/performance-rules.md in the main checkout if it exists. Then check for N+1, SELECT *, pagination. Read these files: <file_list>")
```

**Task 4** - Architecture Review:
```
Task(subagent_type="architecture-reviewer", model="sonnet", description="Architecture review", prompt="Architecture review of local changes. FIRST: Read .claude/review-rules/architecture-rules.md in the main checkout if it exists. Then check for fat controllers, missing services, DTOs. Read these files: <file_list>")
```

**Task 5** - Testing Review:
```
Task(subagent_type="testing-reviewer", model="sonnet", description="Testing review", prompt="Testing review of local changes. Check for missing test coverage, weak assertions, edge case gaps, multi-tenant test safety, factory correctness. Read these changed files: <file_list>. Diff context: <diff>")
```

**Task 6** - Automated Tools:
```bash
CHANGED=$(git diff --name-only --diff-filter=ACMR HEAD '*.php' | tr '\n' ' ')
./vendor/bin/pint --test $CHANGED 2>&1; echo '---'; ./vendor/bin/phpstan analyze $CHANGED --no-progress 2>&1
```

### Step 3: Collect and Merge

1. Collect findings from all 5 review agents
2. Deduplicate (same issue from multiple agents → keep most detailed)
3. Cross-reference (2+ agents found same issue → upgrade severity)
4. Add automated tool findings
5. Sort: CRITICAL > IMPORTANT > MINOR

### Step 4: Present Unified Report

```markdown
## Code Review - Local Changes

### Summary
- **Files Reviewed**: X
- **Parallel Reviewers**: 5 (General, Security, Performance, Architecture, Testing)
- **Automated Tools**: Pint, PHPStan
- **Total Issues**: Y (deduplicated)

### Severity Breakdown
| Severity | Count |
|----------|-------|
| CRITICAL | N |
| IMPORTANT | N |
| MINOR | N |

## Security Findings
[From security-reviewer]

## Performance Findings
[From performance-reviewer]

## Architecture Findings
[From architecture-reviewer]

## Testing Findings
[From testing-reviewer]

## General / Cross-Cutting
[From general-reviewer]

## Automated Tools
### Pint | ### PHPStan

## Verdict
**[CLEAN | HAS ISSUES | NEEDS WORK]**
- Any CRITICAL → NEEDS WORK (fix before commit)
- Only IMPORTANT/MINOR → HAS ISSUES (consider fixing)
- Clean → CLEAN (ready to commit)
```

---

## Targeted Reviews

### Review Specific File
```
Review <file_path> for issues
```
Spawns only the relevant agents based on file type:
- `.php` → security-reviewer + performance-reviewer + architecture-reviewer
- `.vue`/`.ts` → general-reviewer (frontend focus)

### Security-Only Review
```
Security review of my changes
```
Spawns only `security-reviewer` agent.

### Performance-Only Review
```
Performance review of my changes
```
Spawns only `performance-reviewer` agent.

### Architecture-Only Review
```
Architecture review of my changes
```
Spawns only `architecture-reviewer` agent.

---

## Depth Levels

| Command | Model | Speed | Depth | GitLab Posting |
|---------|-------|-------|-------|----------------|
| `/review` | sonnet (pinned, all five) | Fast (~30s) | Good | No (local only) |
| `/mr-review` | sonnet, five reviewers, scope-gated | Minutes | Deep + verified | Via `--comment` or `/fix-review` |
| `/mr-review --deep` | opus for security + architecture, sonnet for the rest | Slower | Deepest, testing kept | Same |

Use `/review` during development for quick feedback.
Use `/mr-review` before merging.

---

## Tips

- Use `/review` before `/commit` to catch issues early
- Use `/mr-review` for MR reviews
- For quick checks on a single file, just ask directly without the command
- Parallel agents = faster + deeper than sequential review

---

**Last Updated**: 2026-02-14
