---
name: fix-review
version: 1.2.0
description: Post review notes on a GitHub PR or GitLab MR, fix the issues in code, reply to the threads, and resolve them.
---

# /fix-review - Post Review Notes, Fix Issues, Resolve

## Provider resolution (GitHub or GitLab)

Resolve the provider once, then use its CLI throughout:

- push remote host (`git remote get-url origin`) is `github.com` → **GitHub** · `gh` · **PR**; any other host → **GitLab** · `glab` · **MR**.
- **Override wins:** `.claude/repo-config.json` with `"provider": "github"` or `"gitlab"`.
- Let the CLI resolve host/namespace/IDs from the git remote (`glab api projects/:id/…`, `gh api repos/{owner}/{repo}/…`); never hardcode them. Fork setup: `upstream` is the MR/PR target.

GitLab threads are posted, listed and resolved with `~/.claude/scripts/mr-note.py` — never a
hand-written glab/python loop. Measured 2026-08-31..09-23: posting by hand failed with
`line_code can't be blank` in ~25 sessions and `JSONDecodeError` in 8+; the script's header lists
every trap it closes.

---

Post code review findings as review threads on the MR/PR, fix the issues, then reply and resolve them after confirmation.

## Usage
```
/fix-review <mr-or-pr-number-or-url>
```

## Process

### Phase 0: Triage — defects vs. intent questions (do this FIRST, always)

Before posting or fixing anything, split the findings into two kinds:

- **Defects** — objectively wrong: crashes, security holes, logic errors, broken/contradictory behavior, real data bugs. These flow through the normal phases.
- **Intent questions** — anything subjective, aesthetic, or *plausibly intentional* (e.g. "roundness 0 makes corners fully square", "this default could be different", "this threshold/copy could change"). The `/mr-review` report lists these under "Open Questions"; also re-scan the defect list and pull out anything that fails this test: **would a reasonable author unambiguously agree it's broken?** If not, it's an intent question.

**Hard rule for intent questions: never silently implement them, and never pre-suggest a specific code change as if it were the fix.** Do not put them in Phase 2, and do not offer them as a ready-to-apply "fix" option in Phase 4. Instead, **ask the user whether the current behavior is intended** (a plain question — "Is X intended, or should it be Y?"), with NO change staged. Only if the user confirms it's wrong does it become a defect you may fix. When in doubt, treat it as an intent question and ask. This prevents "fixing" deliberate behavior (the exact failure of suggesting a roundness floor when 0 = square was intended).

### Phase 1: Collect the findings and make sure each has a thread

1. **Where the findings come from:**
   - A `/mr-review` report (or ad-hoc review) **in this conversation** → use it.
   - **None in context** (after `/clear`, another session, a human reviewer) → the MR's open threads
     *are* the findings: `~/.claude/scripts/mr-note.py open <N>` prints
     `<discussion_id> <path>:<line> <heading>` per unresolved thread. Read a thread's full body
     (`glab api projects/:id/merge_requests/<N>/discussions/<id>`) only for the ones you will fix.
     GitHub: `gh api repos/{owner}/{repo}/pulls/<N>/comments`.
   - **Neither** → stop and say so. Do not reconstruct a review from memory.
2. **Post the defects that have no thread yet** (GitLab). Write them with `json.dump` to
   `.claude/tmp/mr-review/<N>/findings.json` —
   `[{"title", "path", "line": <new-file line> | "old:<n>" | null, "body"}]`, body
   `### <🔴|🟡|🔵> <SEVERITY>: <title>\n\n<description>\n\n**Fix**: <suggestion>` — then
   `~/.claude/scripts/mr-note.py post <N> .claude/tmp/mr-review/<N>/findings.json`.
   Findings `/mr-review --comment` (or an earlier run) already posted come back `exists <id>` —
   nothing is duplicated. Keep the finding → `discussion_id` map for Phase 3. Report any `FAILED` line.
   GitHub: follow `/mr-review` Step 7's GitHub path.
3. Intent questions are not posted as defect threads (Phase 0).

Always post BEFORE fixing, so the MR/PR records what was found.

### Phase 2: Fix Issues
0. **Only fix DEFECTS** (per Phase 0). A tidy "Fix:" suggestion attached to an intent question is not permission to apply it.
1. Fix all CRITICAL and IMPORTANT issues in the code.
2. For each fix, briefly state what was changed.
3. **Run the tests that cover the files you touched** (targeted filter, not the whole suite) plus the
   repo's formatter/analyzer on those files, and report the command and pass/fail. If you cannot run
   them, say why — never skip silently. Measured: 13 of 72 runs made no test call at all. A new
   regression test is not trusted until it fails with the fix reverted (`/prove-the-test`).
4. **Ask the user to confirm** the fixes look correct before proceeding.

### Phase 3: Commit, Push, Reply, Resolve
Once the user approves the CRITICAL+IMPORTANT fixes:
1. Stage the fixes, state what is staged and the commit message you intend (e.g., `fix: address review findings — <brief summary>`), and **ask before committing**. Approving the FIXES is not approving the landing of them.
2. State what is about to be pushed, and **ask before pushing**.
3. Once the push is approved, finish the rest without further prompting.
4. Reply and resolve each fixed thread:
   - **GitLab:** `~/.claude/scripts/mr-note.py resolve <N> <discussion_id> "<what was fixed, commit sha>"` — posts the reply (never twice), resolves, and verifies; prints `resolved` or `NOT RESOLVED`.
   - **GitHub:** reply via `gh api --method POST "repos/{owner}/{repo}/pulls/<N>/comments/<comment_id>/replies" -f body="…"`, then resolve (see below).
5. Show a summary of what was committed, pushed, replied to, and resolved.
6. **If any fix was structural, say so and recommend re-running `/mr-review` before merge.** Structural = deleted a branch, moved a decision across a lock/transaction/guard, changed who owns a lock, changed a constructor's visibility, collapsed two paths into one. Every structural review-fix measured so far introduced a defect the next review caught; `/ship-check` misses them because it is self-review. Additive fixes (a test, a tightened validation, a null guard) need no re-review — merge on the tests.

### Phase 4: Handle MINORs (auto-edit the safe ones, ask about the rest)
After Phase 3 completes, triage the MINOR findings by effort / scope:
- **Quick wins** (1–5 lines each, high value/effort ratio) — **auto-fix**
- **Small refactors** (10–30 lines, stylistic or moderate impact) — **auto-fix**
- **Tech debt / pre-existing** (recommend separate follow-up MR/PR) — **do NOT auto-fix; ask**
- **Security / out-of-scope** (definitely separate MR/PR) — **do NOT auto-fix; ask**
- **Intent questions** (per Phase 0) — list these SEPARATELY, phrased as questions, NOT as fixable options. Do NOT pre-write or stage a change for these, and do NOT mark one "(Recommended)".

For the quick wins and small refactors, making the EDITS needs no permission:
1. Fix them, and run their tests as in Phase 2.3.
2. **Ask before committing** — as a separate commit, so the MINOR fixes stay traceable apart from the IMPORTANT ones.
3. **Ask before pushing.**
4. Reply and resolve any of them that had threads.
5. Show a summary of what was fixed.

Then present any remaining tech-debt / out-of-scope MINORs (recommend a follow-up MR/PR) and ask the intent questions. Only fix these if the user opts in.

Skip Phase 4 entirely only if there are no MINORs at all.

## GitHub: resolving a thread

There is no per-thread resolve flag in `gh`. Use the GraphQL mutation with the thread's node id (from a `reviewThreads` query on the PR), or tell the user to resolve in the web UI — don't invent a REST flag:
```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) { thread { id isResolved } }
  }' -F threadId="{thread_node_id}"
```

## Notes
- **Ask before every `git commit` and every `git push`, without exception.** A user approving a set of fixes has approved the FIXES; it does not extend to landing them, nor to any later commit in the same session.
- CRITICAL and IMPORTANT: always fixed in Phase 2, after confirming the plan with the user. MINOR: split by effort as in Phase 4.
- If `mr-note.py` prints `FAILED` for a thread, report it with the reason; re-running the script is safe (it skips what already exists).
