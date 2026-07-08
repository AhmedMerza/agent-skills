---
name: commit
version: 1.2.0
description: Smart commit with branch targeting, message generation, and quality checks
---

# /commit

Intelligently stages, formats, tests, and commits changes with automatic branch management and message generation.

Supports direct branch targeting (e.g., `/commit dev`) or automatic feature branch creation when on the repo's default branch.

## Project-agnostic resolution

This command works in **any** git repo — nothing below is tied to a specific project or stack. Resolve at runtime:

- **Base branch** — auto-detect the repo's default branch, don't assume `dev`/`main`:
  `git symbolic-ref --quiet refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'` (fallback: probe `main` → `master` → `dev`). When you're **on the base branch** with no `[branch]` arg, create a feature branch. Examples below say `dev` — substitute the detected default.
- **Quality checks (stack-aware)** — detect tools from the changed files + project markers, run only what's actually installed, skip the rest. **Never assume a stack.**

  | Changed files | Format (auto) | Static analysis (opt-in) |
  |---|---|---|
  | PHP | `vendor/bin/pint <files>` if present | `vendor/bin/phpstan` (`--with-phpstan`) |
  | JS / TS / Vue | `eslint --fix` / `prettier -w` if configured | `vue-tsc` / `tsc` (`--lint-ts`) |
  | Python | `ruff format` or `black` if present | `ruff check` |
  | Go / Rust / other | `gofmt` / `cargo fmt` if present | — |
  | none detected | skip formatting | — |

- **MR suggestion** uses `glab mr create` (auto-detects remote/project) or the global `/mr-create`.
- **`commit-agent` is optional** — if a `commit-agent` subagent is defined (project or global), spawn it for 2–50 file changes for context isolation; otherwise run the analysis inline. Don't fail if it's absent.

## Usage
```
/commit [branch]
```

**Arguments:**
- `[branch]` - Optional: Specify target branch to commit to (overrides auto-branch creation)

**Examples:**
- `/commit` - Auto-create feature branch if on dev, or commit to current branch
- `/commit dev` - Commit directly to dev branch (skip auto-branch creation)
- `/commit feature/my-feature` - Commit to specified branch

## What it does
1. Checks target branch (uses argument if provided, otherwise auto-detects)
2. If on `dev` and no branch argument: creates a new feature branch
3. If branch argument provided: switches to that branch
4. **Checks changeset size and decides workflow:**
   - **1 file**: Process inline (fast, minimal context)
   - **2-50 files**: Spawn `commit-agent` (prevents context bloat)
   - **> 50 files**: Warn and suggest splitting commits
5. Analyzes all changed files
6. Groups changes by type (feature, fix, refactor, style, docs)
7. Runs appropriate tests for changed files (only if a test runner is detected)
8. Auto-formats code with the project's formatter (stack-aware — see resolution table)
9. Generates semantic commit message
10. Creates commit with proper conventional format
11. Pushes to remote

## Agent-Based Workflow (Context Management)

To prevent context bloat from large git diffs and logs, this skill uses the `commit-agent` for most commits.

### When Agent is Used (Default):
- **2-50 files changed**: Agent analyzes in isolation, returns commit message
- **Mixed file types**: PHP + Vue + TS changes benefit from agent analysis
- **Quality checks requested**: `--with-phpstan` or `--lint-ts` flags

### When Inline Processing is Used:
- **1 file only**: Trivial changes stay inline for speed
- **User override**: `--no-agent` flag forces inline processing
- **> 50 files**: Warns first, asks user to split or continue

### Agent Benefits:
- ✅ **Context isolation**: Git diffs and logs stay in agent context
- ✅ **Clean main conversation**: Only commit message returned
- ✅ **Quality checks**: Pint/PHPStan/ESLint run in agent
- ✅ **Consistent messages**: Agent analyzes all commits the same way

## Process

### Phase 1: Branch Setup
1. **Determine target branch**:
   - If `[branch]` argument provided: Use that branch (e.g., `/commit dev`)
   - Else if on `dev`: Create feature branch `feature/<type>-<brief-description>`
   - Else: Continue on current branch

2. **Switch/Create branch** (if needed):
   - `git checkout <branch>` or `git checkout -b <new-branch>`

### Phase 2: Decision - Agent or Inline?

```bash
# Check changeset size
CHANGED_FILES=$(git diff --name-only HEAD | wc -l)

# Decision tree
if [ "$NO_AGENT" = "true" ]; then
  → Execute inline workflow (user override)
elif [ "$CHANGED_FILES" -eq 0 ]; then
  → Abort: No changes to commit
elif [ "$CHANGED_FILES" -eq 1 ]; then
  → Execute inline workflow (trivial change)
elif [ "$CHANGED_FILES" -le 50 ]; then
  → Spawn commit-agent (most commits)
else
  → Warn about large changeset, ask user
fi
```

### Phase 3A: Agent Workflow (2-50 Files)

```
1. Spawn commit-agent with context:
   - Target branch
   - Quality flags (--with-phpstan, --lint-ts)
   - Changed file count

2. Agent process (in isolation):
   ├─ Analyze: git status/diff/log (HEAVY - stays in agent)
   ├─ Quality: Run the detected formatter (Pint/ESLint/Prettier/ruff/gofmt — whatever the stack uses)
   ├─ Quality: Run static analysis if requested (--with-phpstan / --lint-ts)
   ├─ Categorize: Determine type (feat/fix/refactor/etc)
   ├─ Generate: Create semantic commit message
   └─ Return: Quality summary + message + command

3. Receive agent output (< 50 lines):
   - Quality check results
   - File statistics
   - Generated commit message
   - Ready-to-execute git command

4. Present message to user for approval

5. Execute commit:
   - Run: git add .
   - Run: git commit -m "message"
   - Verify success

6. Push to remote:
   - Run: git push -u origin <branch>
```

### Phase 3B: Inline Workflow (1 File)

```
1. Quick analysis:
   - git status (minimal output)
   - Identify file type and change

2. Quality check (stack-aware — only if the tool exists in this repo):
   - PHP: `vendor/bin/pint <file>`
   - JS/TS/Vue: skip for a single file (doesn't warrant ESLint), or `prettier -w <file>` if configured
   - Python: `ruff format <file>` / `black <file>`
   - other / no formatter: skip

3. Generate simple message:
   - Determine type from file path/content
   - Create concise description
   - Add footer (co-authored-by)

4. Execute commit:
   - git add .
   - git commit -m "message"

5. Push to remote:
   - git push -u origin <branch>
```

### Phase 3C: Large Changeset Warning (> 50 Files)

```
1. Display warning:
   ⚠️  Large changeset: 60 files changed

   Commits with > 50 files are harder to review.
   Consider splitting into smaller logical commits.

2. Offer options:
   a) Continue with commit-agent anyway
   b) Help me split into smaller commits
   c) Abort and let me split manually

3. Execute based on user choice
```

### Phase 4: Post-Commit

1. **Verify**: `git log -1 --format='%h %s'`
2. **Push** (if `--no-push` not set): `git push origin <branch>`
3. **Suggest MR** (if on feature branch):
   - Display: `glab mr create`

## Example Output

### Example 1: Auto-create feature branch (on dev)
```
🔀 Current branch: dev
📝 Creating feature branch: feature/feat-payment-processing
✓ Switched to new branch 'feature/feat-payment-processing'

🔍 Analyzing changes...
📊 Found 8 changed files (feat: 5, test: 3)

🎨 Running Pint...
✓ Formatted: 5 files

🧪 Running tests...
✓ Tests: 45 passed (12 new)

📝 Generated commit message:
─────────────────────────────────
feat(cart): implement payment processing with multiple gateways

- Add CartPaymentService with Stripe/PayPal support
- Create payment method selection UI
- Add unit tests for payment flows
- Update API documentation

✅ Tests: 45 passed
🎨 Formatted: 5 files

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
─────────────────────────────────

✓ Committed successfully
🚀 Pushing to origin/feature/feat-payment-processing...
✓ Pushed successfully

Next steps:
• Create MR: glab mr create --source-branch feature/feat-payment-processing --target-branch dev
```

### Example 2: Commit directly to dev (`/commit dev`)
```
🔀 Current branch: feature/old-work
🎯 Target branch specified: dev
✓ Switched to branch 'dev'

🔍 Analyzing changes...
📊 Found 3 changed files (fix: 2, docs: 1)

🎨 Running Pint...
✓ Formatted: 2 files

🧪 Running tests...
✓ Tests: 12 passed

📝 Generated commit message:
─────────────────────────────────
fix(auth): resolve token expiration issue

- Fix token refresh logic in AuthService
- Update authentication documentation

✅ Tests: 12 passed
🎨 Formatted: 2 files

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
─────────────────────────────────

✓ Committed successfully
🚀 Pushing to origin/dev...
✓ Pushed successfully
```

## Options
- `--type=<type>`: Force specific commit type
- `--scope=<scope>`: Specify commit scope
- `--no-test`: Skip test running
- `--no-format`: Skip auto-formatting
- `--no-branch`: Skip automatic branch creation (commit directly to dev)
- `--no-push`: Skip automatic push to remote
- `--no-agent`: Process inline (skip commit-agent spawn)
- `--with-phpstan`: Run PHPStan analysis on changed PHP files
- `--lint-ts`: Run ESLint on changed Vue/TS files

## Branch Naming Convention
When on `dev`, new branches are created as: `feature/<type>-<brief-description>`

Examples:
- `feature/feat-payment-gateway`
- `feature/fix-auth-bug`
- `feature/refactor-order-service`

### Example 3: Agent Workflow (10 files - normal commit)
```
📋 Analyzing changeset...
📊 Found 10 changed files - spawning commit-agent for analysis

🤖 Commit Agent Working...
├─ Analyzing git changes
├─ Running code quality checks
└─ Generating commit message

✅ Quality Checks:
- Pint: Passed (fixed 5 files)
- PHPStan: Passed (level 5)

📊 Summary:
- Files changed: 10
- Insertions: 342 lines
- Deletions: 89 lines
- Types: PHP (7), Vue (2), TypeScript (1)

📝 Generated Commit Message:
─────────────────────────────────
feat(payments): add Stripe payment gateway integration

- Implement StripePaymentService with webhook handling
- Add payment method selection UI in checkout
- Create Stripe gateway configuration
- Add unit tests for payment flows
- Update API documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
─────────────────────────────────

✓ Committed successfully
🚀 Pushing to origin/feature/feat-stripe-integration...
✓ Pushed successfully

Next steps:
• Create MR: glab mr create
```

### Example 4: Inline Workflow (1 file - trivial)
```
📋 Analyzing changeset...
📊 Found 1 changed file - processing inline

🎨 Running Pint on app/Models/User.php...
✓ No formatting needed

📝 Generating commit message...

fix(auth): correct email validation regex

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

✓ Committed successfully
🚀 Pushing to origin/dev...
✓ Pushed successfully
```

### Example 5: Large Changeset Warning (60 files)
```
📋 Analyzing changeset...
⚠️  Large changeset: 60 files changed

Commits with > 50 files are harder to review.
Consider splitting into smaller logical commits.

Options:
1. Continue with commit-agent anyway
2. Help me split into smaller commits
3. Abort and let me split manually

Your choice: _
```

## Workflow Decision Tree
```
Branch argument provided?
├─ YES → Switch to specified branch → Check size → Agent/Inline → Commit → Push
│        Examples: /commit dev, /commit feature/my-branch
│
└─ NO  → Current branch = dev?
         ├─ YES → Create feature branch → Check size → Agent/Inline → Commit → Push → Suggest MR
         └─ NO  → Check size → Agent/Inline → Commit on current branch → Push

Size Decision:
├─ 1 file → Inline (fast)
├─ 2-50 files → Agent (context isolation)
└─ > 50 files → Warn (suggest split)
```