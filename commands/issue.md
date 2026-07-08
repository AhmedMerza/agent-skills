---
name: issue
version: 1.0.0
description: Create GitLab issues from natural language with codebase context and smart classification
---

# /issue

## Project resolution (project-agnostic)

This command works in **any** GitLab repo — nothing here is tied to a specific project. Resolve the target at runtime:

1. **Instance, project path, and IDs** — auto-detected by `glab` from the current repo's git remotes; never hardcode them. `glab` reads `origin`/`upstream` directly. When a numeric id is needed:
   `glab api projects/$(git remote get-url origin | sed -E 's#^[a-z]+://[^/]+/##; s#^.*@[^:]+:##; s#\.git$##' | sed 's#/#%2F#g') | jq -r '.id'`
2. **Fork vs single-repo** — if both `origin` and `upstream` remotes exist, treat `origin` as your fork (push target) and `upstream` as the MR/issue target; otherwise operate on `origin`.
3. **Optional extras** — if `.claude/gitlab-config.json` exists in the current repo, load `developers` (assignee/reviewer shortcuts) and `labels` (auto-label rules) from it. If it is **absent**, those features degrade gracefully: ask the user for the assignee/reviewer/labels instead of resolving a shortcut.

> All URLs, namespaces, and IDs in the examples below (`<GITLAB_URL>`, `<PROJECT_PATH>`, `projects/<FORK_ID>`, etc.) are **illustrative placeholders** — resolve real values per the steps above.

Creates a well-structured GitLab issue from a natural language description. Automatically scans the codebase for relevant context, classifies the issue type (bug/feature/enhancement), detects labels, and uses the appropriate GitLab issue template.

**Key Capability:** You describe a problem or feature in plain language, and this command transforms it into a professional, detailed GitLab issue with codebase references, proper labels, and structured formatting.

**Permission Required:** This command will **ALWAYS ask for user confirmation** before creating the issue in GitLab.

## Usage
```
/issue <natural language description> [options]
```

**Arguments:**
- `<description>` - Natural language description of the bug, feature, or task (required)

**Developer Shortcuts (for assignees):** resolved from the optional `.claude/gitlab-config.json` → `developers` map in the current repo (each key is a shortcut, its value the GitLab username). If no config file exists, pass a real GitLab username directly. Resolve a username to an id with `glab api "users?username=<name>" | jq '.[0].id'`.

**Examples:**
```bash
# Bug reports (natural language)
/issue order create page your addresses on scroll it is not paginating, on scroll load other pages too
/issue the shipment tracking page shows 500 error when clicking on completed shipments
/issue wallet balance is not updating after refund is processed
/issue arabic text in search bar is reversed when typing RTL

# Feature requests
/issue add bulk export feature for orders page with CSV and Excel support
/issue we need a notification when payment reconciliation fails

# With options
/issue --assign alice the dashboard widgets are not loading for admin users
/issue --priority high payment gateway returns timeout on large orders
/issue --label shipments tracking page crashes on mobile devices
```

## What it does

1. **Parse natural language input** - Extract key entities (page names, features, error descriptions)
2. **Classify issue type** - Determine if bug, feature, or enhancement based on language cues
3. **Scan codebase for context** - Find relevant files, controllers, services, components, and routes
4. **Ask clarifying questions** - Use AskUserQuestion to gather missing details:
   - Confirm issue type (bug/feature/enhancement)
   - Priority level
   - Environment (production/staging/local)
   - Assignee (if not specified)
   - Steps to reproduce (for bugs)
   - Any additional context the user wants to add
5. **Detect labels automatically** - Based on file patterns, keywords, and issue type
6. **Generate structured issue** - Using the appropriate GitLab template (Bug.md or Feature.md)
7. **Include codebase references** - Add relevant file paths and code snippets to the issue
8. **Preview issue** - Show the complete issue to the user for review
9. **Ask user permission** - Confirm before creating
10. **Create issue via GitLab API** - POST to GitLab with all metadata
11. **Return issue URL** - Display the created issue link

## Process

### Phase 1: Understanding the Request

Parse the user's natural language input and extract:
- **Subject entities**: page names, feature names, model names (e.g., "order create page", "addresses", "pagination")
- **Problem description**: what's wrong or what's needed
- **Issue type signals**:
  - Bug signals: "not working", "broken", "error", "crash", "wrong", "doesn't", "fails", "500", "404", "missing"
  - Feature signals: "add", "need", "want", "implement", "create new", "support for"
  - Enhancement signals: "improve", "better", "optimize", "should also", "like it should"

### Phase 2: Codebase Scanning

Using the extracted entities, search the codebase for relevant context. Run these searches **in parallel** using subagents:

**Search Strategy:**
1. **Routes**: Search for related routes using `mcp__laravel-boost__list-routes` with path/action filters matching the entities
2. **Controllers**: Glob for `app/Http/Controllers/**/*{Entity}*Controller.php`
3. **Services**: Glob for `app/Services/**/*{Entity}*Service.php`
4. **Models**: Glob for `app/Models/**/*{Entity}*.php`
5. **Vue Pages**: Glob for `resources/ts/pages/**/*{Entity}*` and `resources/ts/pages/**/*{entity}*`
6. **Composables**: Glob for `resources/ts/composables/**/*{entity}*`
7. **API Resources**: Glob for `app/Http/Resources/**/*{Entity}*`

For each relevant file found, quickly read the key sections (class name, key methods, relationships) to provide context in the issue.

**Example**: For "order create page addresses pagination":
- Search routes for "order" paths → finds `/orders/create`, `/api/v1/addresses`
- Find `OrderController.php`, `AddressController.php`
- Find `resources/ts/pages/Orders/Create.vue`
- Find `useAddresses.ts` composable
- Read the pagination logic to understand the current implementation

### Phase 3: Clarification (AskUserQuestion)

After scanning, ask the user to confirm/provide details. Use **1-3 questions maximum** to keep it fast:

**Question 1: Issue Details Confirmation**
Present the auto-detected classification and ask for adjustments:
```
Based on your description, I detected:
- Type: Bug (pagination not working as expected)
- Area: Orders > Create Page > Address Selection
- Related files: [list of found files]

Is this correct, or would you like to adjust?
```

**Question 2: Priority & Assignment**
```
What priority should this issue have?
- High (blocking or affects many users)
- Normal (should be fixed soon)
- Low (nice to have)

Assign to: [developer shortcuts]
```

**Question 3: Additional Context (optional)**
Only ask if the codebase scan reveals complexity or ambiguity:
```
I found multiple pagination implementations. Can you clarify:
- Does this happen on initial load or when scrolling?
- Which address list specifically? (billing, shipping, saved addresses)
```

**IMPORTANT**: Do NOT over-ask. If the description is clear enough, skip unnecessary questions. The goal is speed - get the issue created quickly.

### Phase 4: Label Detection

Auto-detect labels based on:

1. **Issue type mapping** (from `.claude/gitlab-config.json` → `labels.commitTypes`):
   - Bug → `bug`
   - Feature → `feature`
   - Enhancement → `enhancement`

2. **File pattern matching** (from `.claude/gitlab-config.json` → `labels.filePatterns`):
   - Found `*.vue` files → `frontend`
   - Found `*Controller.php` → `backend`, `api`
   - Found `*Order*.php` → `orders`
   - Found `*Address*.php` → `address`
   - Found `*Payment*.php` → `payment`

3. **Keyword matching** from description:
   - "pagination", "scroll", "load" → could indicate `frontend` focus
   - "API", "endpoint" → `api`
   - "dashboard" → `dashboard`
   - "mobile" → `frontend`

4. **Priority labels**:
   - High → `Priority High`
   - Normal → `Priority Normal`
   - Low → `Priority Low`

Maximum 5 labels to avoid noise.

### Phase 5: Issue Generation

Generate a structured issue using the appropriate GitLab template.

**For Bugs** (based on `.gitlab/issue_templates/Bug.md`):
```markdown
## Bug Report

### Summary
[One clear sentence from the parsed description]

### Environment
- **Environment:** [from user answer or default to "All"]
- **Browser:** [if frontend issue, ask or default to "All"]
- **Device:** [if relevant]
- **User Role:** [if relevant]

### Steps to Reproduce
1. Navigate to [detected page/route]
2. [Specific action from description]
3. [Scroll / interact as described]
4. Observe: [the bug behavior]

### Expected Behavior
[What should happen - inferred from context or user input]

### Actual Behavior
[What actually happens - from the description]

### Technical Context
**Related Files:**
- `app/Http/Controllers/OrderController.php` - Order creation logic
- `resources/ts/pages/Orders/Create.vue` - Frontend page
- `resources/ts/composables/useAddresses.ts` - Address pagination composable

**Relevant Routes:**
- `GET /api/v1/addresses` - Address list endpoint (paginated)
- `GET /orders/create` - Order creation page

**Current Implementation Notes:**
[Brief notes from codebase scan about how it currently works]

### Screenshots/Videos
<!-- Attach if available -->
```

**For Features** (based on `.gitlab/issue_templates/Feature.md`):
```markdown
## Feature Request

### Feature Name
[Clear, descriptive name]

### Summary
[2-3 sentences describing the feature]

### Problem Statement
**Current Situation:** [What exists now]
**Problem:** [What's missing or insufficient]
**Impact:** [Who is affected and how]

### Proposed Solution
[Based on codebase context, suggest implementation approach]

### Technical Context
**Related Files:**
[Same format as bugs]

### Acceptance Criteria
- [ ] [Specific, testable criteria]
- [ ] [Based on the description and codebase understanding]
```

### Phase 6: Preview & Confirmation

Display the complete issue to the user:
```
📋 Issue Preview:
─────────────────────────────────
Title: [Generated title]
Type: Bug / Feature
Labels: frontend, orders, bug, Priority Normal
Assignee: alice

[Full issue body]
─────────────────────────────────

⚠️  Create this issue in GitLab? (yes/no/edit)
```

If user says "edit", use AskUserQuestion to let them modify specific sections.

### Phase 7: Create Issue via GitLab API

**IMPORTANT: Always use `glab api` directly via Bash tool. Do NOT use Task/agent tools for API calls.**

```bash
# Create issue in the upstream project (id auto-detected per the Project resolution steps)
glab api --method POST projects/<id>/issues \
  -f "title=fix: order create page address pagination not loading on scroll" \
  -f "description=$(cat <<'ISSUE_EOF'
[Full generated issue body here]
ISSUE_EOF
)" \
  -f "labels=bug,frontend,orders,Priority Normal" \
  -f "assignee_ids[]=<user_id>"
```

**API Parameters:**
- `title` - Issue title (with conventional prefix: `fix:`, `feat:`, etc.)
- `description` - Full issue body in markdown
- `labels` - Comma-separated label string
- `assignee_ids[]` - GitLab user IDs (array, can have multiple)
- `milestone_id` - Optional milestone
- `confidential` - Boolean, default false

**Title Format:**
- Bugs: `fix: [area] [brief description]` or `fix([scope]): [description]`
- Features: `feat: [area] [brief description]` or `feat([scope]): [description]`
- Enhancements: `enhance: [area] [brief description]`

### Phase 8: Return Result

```
✓ Issue created successfully!

🔗 Issue URL: <GITLAB_URL>/<PROJECT_PATH>/-/issues/456
📌 Issue #456: fix(orders): address pagination not loading on scroll
🏷️  Labels: bug, frontend, orders, Priority Normal
👤 Assignee: alice

Next steps:
• View issue: Open the URL above
• Start working: Create a branch from this issue
• Add screenshots: Edit the issue to attach visuals
```

## Options
- `--assign <developer>` - Assign to developer (use a shortcut from `.claude/gitlab-config.json`, e.g. `alice`, `bob`, `carol`, or pass a raw GitLab username)
- `--priority <level>` - Set priority: high, normal, low (default: normal)
- `--label <label>` - Add extra label(s), comma-separated
- `--type <type>` - Force issue type: bug, feature, enhancement (overrides auto-detection)
- `--no-scan` - Skip codebase scanning (faster, less context)
- `--no-ask` - Skip clarifying questions (use auto-detected values only)
- `--confidential` - Mark issue as confidential
- `--milestone <name>` - Assign to milestone

## Smart Features

### 1. Natural Language Parsing
Understands informal descriptions and extracts structured data:
- "order create page" → Orders module, Create page
- "not paginating" → Pagination bug
- "on scroll load" → Infinite scroll / lazy loading feature
- "500 error" → Server error, likely backend bug
- "arabic text reversed" → RTL/i18n bug

### 2. Codebase-Aware Context
Automatically finds and references relevant code:
- Controllers, services, models related to the described area
- Routes and API endpoints
- Vue components and composables
- Current implementation details for better bug descriptions

### 3. Smart Label Detection
Uses multiple signals to suggest accurate labels:
- File pattern analysis from codebase scan
- Keyword extraction from description
- Issue type classification
- Maps to existing GitLab labels (doesn't create new ones)

### 4. Template Selection
Automatically picks the right template:
- Bug descriptions → `.gitlab/issue_templates/Bug.md` structure
- Feature requests → `.gitlab/issue_templates/Feature.md` structure
- Falls back to a clean generic structure if unclear

## GitLab API

**IMPORTANT: Always use `glab api` directly via Bash tool for issue creation. Do NOT use Task/agent tools.**

**Create Issue:**
```bash
# Basic issue
glab api --method POST projects/<id>/issues \
  -f "title=fix(orders): address pagination broken" \
  -f "description=## Bug Report..." \
  -f "labels=bug,frontend,orders"

# With assignee
glab api --method POST projects/<id>/issues \
  -f "title=feat(orders): add bulk export" \
  -f "description=## Feature Request..." \
  -f "labels=feature,orders" \
  -f "assignee_ids[]=<user_id>"

# Confidential issue
glab api --method POST projects/<id>/issues \
  -f "title=fix(security): XSS in search" \
  -f "description=## Bug Report..." \
  -f "labels=bug,security,Priority High" \
  -f "confidential=true"
```

**Key API Notes:**
- Project ID for upstream (`<PROJECT_PATH>`): auto-detected from the git remote (see **Project resolution**)
- Use `-f` (not `-F`) for form data with `glab api`
- `assignee_ids[]` is an array - can assign multiple people
- `labels` is a comma-separated string (not array)
- Description supports full GitLab-flavored markdown

**Get Issue (for verification):**
```bash
glab api projects/<id>/issues/<issue_id>
```

## Related Commands
- `/mr-create` - Create merge request (after fixing the issue)
- `/mr-assign` - Assign MR to developer
- `/plan` - Plan implementation for a complex issue
- `/commit` - Commit the fix with semantic message

## Troubleshooting

**"Project not found"**
- Verify project ID: `glab api projects/<PROJECT_PATH_ENC> | jq '.id'`
- Check access permissions

**"Label not found"**
- Labels must exist in GitLab. Check available labels: `glab api projects/<id>/labels --paginate | jq '.[].name'`
- The skill only uses existing labels, never creates new ones

**"Invalid assignee"**
- Verify user ID: `glab api "users?username=alice" | jq '.[0].id'`
- User must have access to the project

**Issue body formatting issues**
- Use HEREDOC for multi-line descriptions
- Escape special characters in shell: `$`, `` ` ``, `\`

## Notes
- Issues are always created in the **upstream** project (`<PROJECT_PATH>`, id auto-detected)
- The skill never creates new labels - only uses existing ones from GitLab
- Codebase scanning is best-effort; it enhances the issue but isn't required
- The skill respects `.claude/gitlab-config.json` for developer shortcuts and label mappings
- All issue creation requires explicit user permission (shown as preview first)

---
*Created: 2026-02-18 | Config: .claude/gitlab-config.json, .gitlab/issue_templates/*
