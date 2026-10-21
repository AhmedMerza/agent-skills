---
name: mr-review
description: "Review GitLab merge requests using parallel reviewer lenses: general correctness, security, architecture, tests, and performance. Use when Codex needs to inspect MR diffs, run multi-pass review, and produce one severity-ordered report with file references and actionable fixes."
---

# MR Review

## Default Mode
Run review as parallel lenses, then merge findings:
1. General correctness/regressions
2. Security risks
3. Architecture/design
4. Test quality and coverage
5. Performance/resource impact

If user does not specify lenses, run all five by default.

## Review Standard
Prioritize findings over summary:
- correctness bugs
- regressions
- security/data-loss risks
- performance/resource risks
- missing tests for changed behavior

## Comment Posting Policy
Default flow:
1. Run review and show findings first.
2. Ask user for approval before posting any MR comment.
3. After approval, post comments.

Default posting style (enforced):
- Post one MR discussion per finding (separate threads).
- Discussions must be resolvable (line-anchored diff threads), not general MR notes.
- Use emoji severity headers and clean structure.
- Do not post compressed one-line notes.
- If a finding cannot be anchored to a valid diff line, mention that in review output and ask before posting a non-resolvable general note.

Optional posting style:
- One consolidated note only if the user explicitly asks.

If there are no findings, do not post comments unless user asks.

## Steps
1. Open MR details and diff.
2. Execute all five review lenses in parallel.
3. Merge and deduplicate findings.
4. Sort by severity (`high`, `medium`, `low`).
5. Report findings with exact file references.
6. Ask user whether to post comments to MR.
7. Post comments only after approval.

## Commands
```bash
glab mr view <mr-id> -R oreem/oreem
glab mr diff <mr-id> -R oreem/oreem
glab api projects/oreem%2Foreem/merge_requests/<mr-id>/versions
glab api projects/oreem%2Foreem/merge_requests/<mr-id>/discussions --method POST -H "Content-Type: application/json" --input <payload.json>
```

## Output Format
For each finding include:
- lens (`general` | `security` | `architecture` | `tests` | `performance`)
- severity
- file path (and line when available)
- issue
- expected fix direction

After findings, include:
- open questions/assumptions
- short residual risk note if coverage is incomplete

## MR Note Template (default)
Use this format for each posted finding:

```md
🔴 HIGH — <short title>

**Lens:** <general|security|architecture|tests|performance>
**File:** `<path:line>`
**Issue:** <what is wrong and impact>
**Fix direction:** <specific change expected>
```

Severity emoji mapping:
- `🔴 HIGH`
- `🟡 MEDIUM`
- `💡 LOW`
