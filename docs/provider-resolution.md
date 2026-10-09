<!-- Shared convention embedded at the top of each dual-provider command. Items 1–3 stay identical across commands. The cheat-sheet below is the FULL table — each command embeds only the rows it actually uses, so it loads smaller; add a row back to a command when that command starts needing it. -->

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
