---
name: mr-create
version: 1.5.0
description: Create a GitHub PR or GitLab MR with smart suggestions, quality checks, templates, and auto-labeling
---

# /mr-create

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

---

Creates a merge/pull request for the current branch using the resolved provider's CLI.

**Supports fork-based workflow:** Automatically detects when you're working in a fork and creates cross-project MRs/PRs correctly (works with self-hosted GitLab over HTTP; `gh pr create` handles GitHub forks itself).

**Reviewer vs Assignee:**
- **Reviewer** (default) - Person who should review the code
- **Assignee** - Person responsible for taking action (merging, fixing, etc.)

## Usage
```
/mr-create [target-branch|reviewer] [reviewer] [options]
```

**Arguments:**
- `[target-branch]` - Optional: Target branch for the MR/PR (default: `dev`)
- `[reviewer]` - Optional: Developer shortcut to request review from (default behavior)

**Developer Shortcuts:** resolved from the optional `.claude/repo-config.json` (or legacy `.claude/gitlab-config.json`) → `developers` map in the current repo. If no config file exists, pass a real username directly. On GitLab, resolve a username to an id with `glab api "users?username=<name>" | jq '.[0].id'`; on GitHub, usernames are used directly (no id lookup).

**Examples:**
```bash
# Request review (default behavior)
/mr-create                          # Create MR/PR to dev
/mr-create bob                      # Create to dev, request review from bob
/mr-create dev bob                  # Create to dev, request review from bob
/mr-create master carol             # Create to master, request review from carol
/mr-create bob carol                # Request review from both bob and carol

# With options
/mr-create --draft                  # Create draft MR/PR
/mr-create bob --draft              # Draft, request review from bob
/mr-create --reviewer alice         # Explicit reviewer option
/mr-create --assignee bob           # Set assignee instead of reviewer
```

## What it does
1. Detects current branch
2. Analyzes commits since target branch diverged
3. Generates title and description from commits
4. Resolves reviewer/assignee shortcuts to provider usernames (if provided)
5. Creates the MR/PR immediately (no confirmation prompt)
6. Requests review from specified developers (default behavior)
7. OR assigns to developer (if using --assignee flag)
8. Returns the MR/PR URL with reviewer/assignee info

**Auto-create:** This command creates the merge/pull request immediately without asking for confirmation. Use `--dry-run` if you want to preview without creating.

## Reviewer vs Assignee - When to Use What

**Use Reviewer (Default):**
- ✅ Someone should review your code
- ✅ You'll merge after approval
- ✅ Multiple people should review
- Example: `/mr-create bob carol`

**Use Assignee:**
- ✅ Someone else should merge the MR/PR
- ✅ Someone needs to take action/fix issues
- ✅ Passing responsibility to another developer
- Example: `/mr-create --assignee bob`

## Process
1. **Parse arguments**: Extract target branch and/or reviewer/assignee from arguments
2. **Resolve provider**: Detect GitHub vs GitLab (see "Provider resolution" above)
3. **Resolve developers** (if provided): Look up usernames (and ids, for GitLab) from shortcuts in `.claude/repo-config.json`
4. **Check current branch**: `git branch --show-current`
5. **Detect fork workflow**: Check git remotes (`origin` = fork, `upstream` = upstream target)
6. **Resolve target**: On GitLab, the source/target project IDs (fork → upstream) via `glab`; on GitHub, `gh pr create` resolves remotes/base/head itself
7. **Get target branch**: Use argument or default to `dev`
8. **🎯 Run pre-MR quality checks**: detect the repo's toolchain and run whatever exists (unless --skip-checks)
9. **Analyze commits**: `git log target..HEAD` for title/description
10. **🎯 Analyze changed files**: Get file patterns for smart suggestions (unless --skip-suggestions)
11. **🎯 Suggest reviewers**: Based on code ownership rules (unless reviewers specified or --skip-suggestions)
12. **🎯 Detect template**: Based on commit message (feat:, fix:, hotfix:, etc.) (unless --template specified)
13. **🎯 Detect labels**: Based on file patterns and commit messages (unless --skip-labels)
14. **Generate details**: Title, description (with template), reviewers/assignee, labels
15. **Create the MR/PR immediately**: run the provider's create command (see "Creating the MR/PR") with reviewers (default) OR assignee (if `--assignee`) plus labels
16. **Return URL**: Display the MR/PR web URL with reviewer/assignee/labels info

## Options
- `--draft` - Create as draft MR/PR
- `--title <title>` - Custom title (overrides auto-generation)
- `--description <desc>` - Custom description
- `--remove-source-branch` - Delete source branch after merge (GitLab; on GitHub delete via `gh pr merge --delete-branch`)
- `--squash` - Squash commits when merging
- `--reviewer <username>` - Request review from user (can use shortcut)
- `--assignee <username>` - Assign to user (can use shortcut)
- `--template <type>` - Use a template (feature, bugfix, hotfix, refactor, documentation)
- `--skip-checks` - Skip pre-MR quality checks
- `--skip-suggestions` - Skip smart reviewer suggestions
- `--skip-labels` - Skip auto-label detection

**Note:** You can specify multiple reviewers either as arguments or with multiple `--reviewer` flags:
```bash
/mr-create bob carol            # Request review from both
/mr-create --reviewer bob --reviewer carol
```

## 🎯 Smart Features

### 1. Pre-MR Quality Checks

**What it does**: Detects the repo's actual toolchain and runs whatever quality checks exist before creating the MR/PR, to catch issues early. It is **stack-agnostic and graceful** — a repo with no linters/config just skips checks and goes straight to creation.

**Detection (run what's present, skip what isn't):**
- **PHP / composer project** (`composer.json` present):
  - `pint` if `vendor/bin/pint` or a `pint` composer script exists (formatting)
  - `phpstan` if `vendor/bin/phpstan` or a `phpstan` script/config exists (static analysis)
  - `rector` if `vendor/bin/rector` or config exists (refactor suggestions, non-blocking)
- **JS/TS project** (`package.json` present): run the repo's own scripts if defined — e.g. `npm run lint` / `npm run format` / `npm run check`, backed by whatever the repo uses (ESLint, Prettier, Biome). Prefer the declared script over invoking a linter binary directly.
- **Other stacks**: if a formatter/linter is obviously configured (e.g. `ruff`/`black` for Python, `gofmt` for Go, `cargo fmt`/`clippy` for Rust), run it; otherwise skip.
- **No linters/config found** → skip checks entirely and proceed to creation. Never error on a repo that has no toolchain.

**Example** (a PHP + JS repo that has these tools):
```bash
/mr-create bob

🔍 Detecting toolchain… found composer.json + package.json
🔍 Running pre-MR quality checks...

✅ Pint: No issues (5 files checked)
✅ PHPStan: No errors
⚠️  Rector: 2 suggestions (non-blocking)
   • Use null coalescing operator (OrderService.php:45)
   • Simplify ternary expression (PaymentService.php:120)
✅ npm run lint: No issues

💡 2 warnings found (non-blocking, proceeds)
```

**Example** (a repo with no linters):
```bash
/mr-create

🔍 Detecting toolchain… no linters/formatters configured — skipping checks
🚀 Creating pull request...
```

**Skip checks**:
```bash
/mr-create bob --skip-checks     # Skip all quality checks
```

### 2. Smart Reviewer Suggestions

**What it does**: Analyzes changed files and suggests appropriate reviewers based on code ownership.

**How it works**:
- Analyzes file patterns in changed files
- Maps patterns to code owners (from `.claude/code-ownership.json`)
- Suggests 2-3 most relevant reviewers
- Prefers team lead when available
- **Absent config → skip suggestions gracefully** (no error; just don't suggest)

**Example**:
```bash
/mr-create

🔍 Analyzing changed files...
   • frontend/pages/Orders/Index.vue (frontend)
   • frontend/composables/useOrders.ts (frontend)
   • src/Http/Controllers/OrderController.php (backend)
   • src/Services/OrderService.php (backend)

👥 Smart Reviewer Suggestions:

Based on file changes:
   🎯 Frontend (2 files) → alice (lead), carol
   🎯 Backend (2 files) → bob (lead), carol

💡 Recommended reviewers: alice, bob

✓ Reviewers added: alice, bob
```

**Code Ownership Rules** (example `.claude/code-ownership.json` — genericize to the repo's real layout):
- `frontend/**` → Frontend team (alice lead)
- `src/**` → Backend team (bob lead)
- `**/*.py` → Data/services team (bob lead)
- `tests/**` → All developers

**Skip suggestions**:
```bash
/mr-create --skip-suggestions      # Skip smart suggestions
```

### 3. MR/PR Templates

**What it does**: Uses pre-defined templates for different change types with structured checklists.

**Available Templates**:
- `feature` - New features (default for feat: commits)
- `bugfix` - Bug fixes (default for fix: commits)
- `hotfix` - Emergency production fixes
- `refactor` - Code refactoring
- `documentation` - Documentation updates

**Example**:
```bash
/mr-create --template feature

🔍 Using template: feature

📝 Description (from template):
─────────────────────────────────
## Summary
feat(shipments): add pickup details to API responses

## Changes Made
- Added PickupDetails DTO
- Updated ShipmentResource with pickup info
- Added pickup relationship to Shipment model

## Testing
- [x] Unit tests added/updated
- [x] Feature tests added/updated
- [x] Manual testing completed

## Quality Checks
- [x] Formatter passed
- [x] Static analysis passed
- [x] Controllers kept thin
- [x] Permission checks added
─────────────────────────────────
```

**Auto-detect template**:
```bash
# Commit: "feat(orders): add bulk export"
/mr-create
# Automatically uses "feature" template

# Commit: "fix(auth): token expiration"
/mr-create
# Automatically uses "bugfix" template

# Commit: "hotfix: critical payment bug"
/mr-create master
# Automatically uses "hotfix" template
```

**Template Locations**:
- `.claude/mr-templates/feature.md`
- `.claude/mr-templates/bugfix.md`
- `.claude/mr-templates/hotfix.md`
- `.claude/mr-templates/refactor.md`
- `.claude/mr-templates/documentation.md`

### 4. Auto-Label Detection

**What it does**: Automatically detects and suggests labels based on file changes and commit messages. (GitLab MRs support labels natively; on GitHub pass them via `gh pr create --label <l>` — labels must already exist in the repo, else skip them gracefully.)

**Label Detection Rules**:
- File-based: Analyzes changed file patterns
- Commit-based: Parses commit message prefixes
- Keyword-based: Searches for keywords in commits

**Example**:
```bash
/mr-create

🏷️  Auto-detected labels:

File-based:
   • frontend (3 *.vue files changed)
   • backend (2 *.php files changed)

Commit-based:
   • feature (commit: "feat: add export feature")

Suggested labels: frontend, backend, feature

✓ Labels added: frontend, backend, feature
```

**Label Categories**:
- **Technology**: frontend, backend, database, api
- **Type**: feature, bugfix, hotfix, refactor, security, performance
- **Other**: documentation, breaking-change, tests

**Skip auto-labels**:
```bash
/mr-create --skip-labels           # Skip auto-label detection
```

### 5. Complete Workflow Example

```bash
# 1. Create MR/PR with all smart features
/mr-create

🔍 Running pre-MR quality checks...
✅ All checks passed

🔍 Analyzing changed files...
👥 Suggested reviewers: alice (frontend), bob (backend)

🏷️  Auto-detected labels: frontend, backend, feature

📝 Using template: feature (auto-detected from "feat:" commit)

🚀 Creating merge/pull request with:
   • Reviewers: alice, bob
   • Labels: frontend, backend, feature
   • Template: feature
✓ Created successfully!
✓ Reviewers added: alice, bob
✓ Labels added: frontend, backend, feature

🔗 URL: https://<HOST>/<PROJECT_PATH>/-/merge_requests/1599   # (GitHub: .../pull/1599)
```

## Example Output

### Example 1: Auto-generated from commits
```
🔍 Current branch: feature/add-pickup-details
🎯 Target branch: dev
🔀 Workflow: <FORK_PATH> → <PROJECT_PATH>

📊 Analyzing commits...
   Found 1 commit ahead of dev

📝 Generated details:
─────────────────────────────────
Title: feat(shipments): add pickup details to API responses
Description: Add pickup location details to shipment API
responses for better tracking and delivery management.

Source: <FORK_PATH>:feature/add-pickup-details
Target: <PROJECT_PATH>:dev
─────────────────────────────────

🚀 Creating merge/pull request...
✓ Created successfully!

🔗 URL: https://<HOST>/<PROJECT_PATH>/-/merge_requests/1596
📌 #1596: feat(shipments): add pickup details to API responses

Next steps:
• Review it: Open the URL above
• Request reviews: Add reviewers in the web UI if needed
• Run CI/CD: Wait for pipeline results
```

### Example 3: Create with reviewer
```
🔍 Current branch: feature/payment-gateway
🎯 Target branch: dev
👥 Reviewers: bob, carol
🔀 Workflow: <FORK_PATH> → <PROJECT_PATH>

📊 Analyzing commits...
   Found 3 commits ahead of dev

📝 Generated details:
─────────────────────────────────
Title: feat(payment): add new payment gateway integration
Description: Integrate new payment provider with support for
multiple currencies and refund handling.

Source: <FORK_PATH>:feature/payment-gateway
Target: <PROJECT_PATH>:dev
Reviewers: bob, carol
─────────────────────────────────

🚀 Creating merge/pull request...
✓ Created successfully!
✓ Review requested from: bob, carol

🔗 URL: https://<HOST>/<PROJECT_PATH>/-/merge_requests/1599
📌 #1599: feat(payment): add new payment gateway integration
👥 Reviewers: bob, carol
```

### Example 4: Create with assignee (using --assignee)
```
🔍 Current branch: feature/hotfix-critical-bug
🎯 Target branch: master
👤 Assignee: bob (will merge)
🔀 Workflow: <FORK_PATH> → <PROJECT_PATH>

📝 Generated details:
─────────────────────────────────
Title: fix: critical bug in payment processing
Description: Fix null pointer exception in payment service

Source: <FORK_PATH>:feature/hotfix-critical-bug
Target: <PROJECT_PATH>:master
Assignee: bob (responsible for merging)
─────────────────────────────────

🚀 Creating merge/pull request...
✓ Created successfully!
✓ Assigned to bob

🔗 URL: https://<HOST>/<PROJECT_PATH>/-/merge_requests/1600
📌 #1600: fix: critical bug in payment processing
👤 Assignee: bob (responsible for merge)
```

### Example 2: With custom options
```
🔍 Current branch: feature/fix-auth-bug
🎯 Target branch: dev

📝 Using custom title: "fix: resolve authentication token expiration"

🚀 Creating draft merge/pull request...
✓ Created successfully!

🔗 URL: https://<HOST>/<PROJECT_PATH>/-/merge_requests/1597
📌 #1597 (DRAFT): fix: resolve authentication token expiration
```

## Fork Workflow (Important!)

Many repos use a **fork-based workflow**:
- **Your fork**: `<FORK_PATH>` (push here via `origin` remote)
- **Upstream**: `<PROJECT_PATH>` (MR/PR target via `upstream` remote)

**Git remotes:**
```
origin    → <FORK_PATH>       (your fork - where you push)
upstream  → <PROJECT_PATH>    (upstream - MR/PR target)
```

**Workflow:**
1. Push your branch to fork: `git push origin feature/my-branch`
2. Run `/mr-create` - it detects the fork and creates a cross-project MR/PR
3. Created: `<FORK_PATH>:feature/my-branch` → `<PROJECT_PATH>:dev`

**Why this matters:**
- **GitLab:** the MR must specify both `source_project_id` (fork) and `target_project_id` (upstream); creating from the wrong project yields "Merge request contains no changes".
- **GitHub:** `gh pr create` figures out the fork/base automatically from your remotes (`--head <owner>:<branch>` if needed) — no project IDs to compute.

## Branch Naming Convention
Works with all branch naming patterns:
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `hotfix/*` - Production hotfixes

## Creating the MR/PR

Use the resolved provider's CLI. **Run the CLI directly via the Bash tool for creation. Do NOT use Task/agent tools.**

### GitLab path (`glab api`)

Uses the GitLab API directly via `glab api` because:
- Works reliably with self-hosted GitLab over HTTP
- Bypasses `glab mr create` issues with custom git remotes
- Handles fork-to-upstream cross-project MRs correctly
- Uses your configured token from `~/.config/glab-cli/config.yml`

```bash
# Get fork project ID
glab api projects/<FORK_PATH_ENC> | jq -r '.id'  # Returns: 15

# Get upstream project ID
glab api projects/<PROJECT_PATH_ENC> | jq -r '.id'  # Returns: 2

# Get user ID for reviewer/assignee
glab api "users?username=bob" | jq -r '.[0].id'  # Returns: 7

# Create cross-project MR with reviewers (recommended)
glab api --method POST projects/<FORK_ID>/merge_requests \
  -F source_branch=feature/my-branch \
  -F target_branch=dev \
  -F target_project_id=2 \
  -F title="feat: my feature" \
  -F description="My changes" \
  -F reviewer_ids[]=7

# OR create with assignee
glab api --method POST projects/<FORK_ID>/merge_requests \
  -F source_branch=feature/my-branch \
  -F target_branch=dev \
  -F target_project_id=2 \
  -F title="feat: my feature" \
  -F description="My changes" \
  -F assignee_id=7
```

**Key GitLab Parameters:**
- `target_project_id=2` - Required for cross-project (fork → upstream)
- `reviewer_ids[]=<id>` - Add reviewer (can use multiple times; resolve id first)
- `assignee_id=<id>` - Set assignee (singular, not array)

**⚠️ GitLab API Notes:**
- ✅ Use `-F` flag (not `-f`) for form data
- ✅ `reviewer_ids[]` is array, can have multiple
- ✅ `assignee_id` is singular (NOT `assignee_ids[]`)
- ✅ Draft: prefix the title with `Draft: …`
- ❌ Don't use `--repo` flag with `glab api` (not supported)

**Token location:** `~/.config/glab-cli/config.yml` · **format:** `glpat-*` (GitLab Personal Access Token)

### GitHub path (`gh pr create`)

`gh` handles remotes, base, and fork resolution itself — no project IDs, no encoded paths, no username→id lookup (it uses **usernames directly**). Its token lives in `gh`'s own auth (`gh auth status` / `gh auth login`), not a config file you edit by hand.

```bash
# Create PR with a reviewer (default behavior)
gh pr create \
  --base dev \
  --head feature/my-branch \
  --title "feat: my feature" \
  --body "My changes" \
  --reviewer bob

# Multiple reviewers + assignee + draft + label
gh pr create \
  --base master \
  --head feature/my-branch \
  --title "feat: my feature" \
  --body "My changes" \
  --reviewer bob --reviewer carol \
  --assignee bob \
  --draft \
  --label backend

# Add a reviewer after creation, if needed
gh pr edit <n> --add-reviewer alice
```

**Key GitHub flags:**
- `--base <target>` - target branch (default `dev`)
- `--head <branch>` - source branch (for a fork, use `--head <owner>:<branch>`)
- `--reviewer <username>` - repeatable; usernames only, no id lookup
- `--assignee <username>` - assignee
- `--draft` - create as draft
- `--label <name>` - label must already exist in the repo (else skip gracefully)

## Required Permissions

**GitLab token** (`~/.config/glab-cli/config.yml`) needs:
- `api` scope - Full API access
- `write_repository` - Push to repository
- Developer role or higher on the project

**GitHub** (`gh auth`): a login with `repo` scope (and push access / the fork) — run `gh auth status` to verify, `gh auth login` to (re)authenticate.

## Troubleshooting

**GitLab — "Merge request contains no changes"**
- **Cause:** MR created from wrong project (both source and target are same)
- **Fix:** Must create from fork project with `target_project_id` parameter
- **Manual:** `glab api --method POST projects/<FORK_ID>/merge_requests -F target_project_id=2 ...`

**GitLab — "Invalid token provided"**
- Regenerate token at: `https://<HOST>/-/profile/personal_access_tokens`
- Update in: `~/.config/glab-cli/config.yml`
- Ensure `api` and `write_repository` scopes are enabled

**"Project/repository not found"**
- GitLab: check namespace `<PROJECT_PATH>` (upstream) / `<FORK_PATH>` (fork) and IDs via `glab api projects/{namespace}%2F{project}`
- GitHub: confirm `gh auth status` and that you have access to the base repo/fork

**GitHub — auth or base errors**
- Run `gh auth status`; re-login with `gh auth login` if the token is missing/expired
- If `gh` can't infer the base repo (multiple remotes), pass `--repo <owner>/<repo>` and `--head <owner>:<branch>`

**"Branch not found"**
- Ensure branch is pushed to fork: `git push origin <branch>`
- Verify branch name: `git branch --show-current`
- Check remote branches: `git branch -r | grep origin`
