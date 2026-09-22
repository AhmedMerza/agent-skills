---
name: changelog-generate
description: Generates changelogs and release notes from git commits, PR/MR titles, and issue references. Auto-detects the forge (GitHub or GitLab) and whether the repo uses tags, adapting reference links and skipping tag/version steps for tag-less repos. Organizes changes by impact type (breaking, features, fixes, improvements) and formats to the Keep a Changelog standard. Use when users request "create changelog", "write release notes", "document version changes", or "prepare release".
---

<!-- Own skill. Originally adapted from patricio0312rev/skills@changelog-writer, then
     customized (forge auto-detection for GitHub/GitLab, tag-less repo handling).
     No longer tracked by `npx skills` — edit freely; updates will not overwrite it. -->

# Changelog & Release Notes Generator

Generate professional changelogs and release notes from version control history.

## Core Workflow

0. **Detect repo context** (ALWAYS run first — see "Detect Repo Context" below): which forge (GitHub / GitLab / other) and whether the repo uses tags. Everything downstream branches on this.
1. **Determine the range**: if tags exist → since the last tag; if NOT → ask the user for an explicit range (two commits/branches) or default to a sensible window. Never say "since last release" when there are no releases.
2. **Analyze commits**: Parse git history over that range.
3. **Categorize changes**: Group by type (feat, fix, docs, etc.).
4. **Identify breaking changes**: Flag incompatible changes.
5. **Extract highlights**: Surface most important changes.
6. **Format document**: Follow Keep a Changelog format, using forge-correct PR/MR & issue links.
7. **Suggest version** *(only if the repo uses tags / semver)*: recommend a semantic version bump. If the repo is tag-less, SKIP this and every tag step — do not emit `git tag`, `gh release`, compare-by-tag links, or a `## [x.y.z]` heading.
8. **Generate release notes**: Create a user-friendly summary.

## Detect Repo Context (run first)

Run these before anything else and let the results drive the whole output:

```bash
# 1. Which forge? Inspect the remote URL — check ALL remotes, not just origin.
git remote -v
#   contains "github.com"        → GitHub  (PRs use #123, path /pull/NN, /issues/NN, /compare/a...b)
#   contains "gitlab" (any host) → GitLab  (MRs use !123, path /-/merge_requests/NN, /-/issues/NN, /-/compare/a...b)
#   neither / no remote          → forge-agnostic: reference IDs as plain text, emit NO web links

# 1b. Self-hosted forges rarely put "github"/"gitlab" in the hostname (e.g. atlantis.example.com).
#     The RELIABLE signal is the merge-request reference syntax used in commit history:
git log -80 --pretty=%s%n%b | grep -oE '![0-9]{2,6}' | head   # any '!NN' hits → GitLab (MRs)
#   → '!NN' merge-request refs anywhere in history  ⇒ GitLab, even if the host isn't "gitlab"
#   → only '#NN' refs and a `gh`-style remote        ⇒ GitHub
#   → `glab` configured / used in the project         ⇒ GitLab
#   Once GitLab is confirmed, derive the base URL from the CANONICAL/upstream remote
#   (MRs live on the shared repo, not a personal fork): http://host[:port]/group/repo/-/merge_requests/NN

# 2. Does this repo use tags at all? (git tag exits 0 even when EMPTY — never rely on its exit code)
[ -z "$(git tag)" ] && echo "TAG-LESS" || echo "HAS TAGS: $(git tag | wc -l) tags"
git describe --tags --abbrev=0 2>/dev/null   # "fatal: No names found" also ⇒ TAG-LESS
```

**TAG-LESS repos are normal and expected** (large app monorepos, trunk-based teams that ship from `dev`/`main` without version tags). When tag-less:

- Do NOT print the "No names found" fatal error to the user — treat it as the signal "this repo doesn't tag," not an error.
- Work from an explicit commit/branch range instead of a tag range.
- Omit version headings, semver suggestions, `git tag`, `gh release create`, and compare-by-tag links from the output. Use a commit-range compare link (or none) instead.
- The changelog goes under a single `## [Unreleased]` (or a dated `## <date> — <feature/scope>` heading), not `## [1.2.0]`.

## Commit Analysis

### Extract Information From

- Commit messages (preferably conventional commits)
- PR / MR titles and descriptions
- Issue & PR/MR references (see forge table below)
- Merge commit messages (e.g. `Merge branch 'feat/x' into 'dev'` — the branch name often names the feature)
- Commit authors

### Reference Syntax & Links by Forge

Detect the forge once, then use the matching column everywhere:

| Reference        | GitHub                         | GitLab                                   |
|------------------|--------------------------------|------------------------------------------|
| Pull / Merge req | `#123` → `/pull/123`           | `!123` → `/-/merge_requests/123`         |
| Issue            | `#123` → `/issues/123`         | `#123` → `/-/issues/123`                 |
| Commit           | `/commit/<sha>`                | `/-/commit/<sha>`                        |
| Compare / range  | `/compare/a...b`               | `/-/compare/a...b`                       |

- **GitLab uses `!NN` for merge requests and `#NN` for issues** — don't collapse both into `#`. GitLab-convention commits reference MRs as `!3025`, `!3026`.
- **Self-hosted GitLab often has no "gitlab" in the hostname** (e.g. `atlantis.example.com:9991`). Trust the `!NN` MR-ref signal from history over the hostname. Derive the base URL from the **canonical/upstream** remote — MRs live on the shared repo, not a personal fork.
- Build full links only when a remote exists. Strip any `.git` suffix and normalize `git@host:group/repo` SSH remotes to `https://host/group/repo` (keep the `:port` for self-hosted `http://host:port/...`).
- **Forge-agnostic (no remote / unknown host):** keep the raw IDs as plain text (`!3025`, `#123`) and emit no hyperlinks.

### Parse Patterns

```
feat(auth): add OAuth2 support
^    ^      ^
|    |      └─ Description
|    └─ Scope (optional)
└─ Type
```

**Types to Categories:**

- `feat` → Added
- `fix` → Fixed
- `docs` → Documentation
- `style`, `refactor` → Changed
- `perf` → Performance
- `test` → Testing
- `chore`, `ci` → Internal
- `BREAKING CHANGE` → Breaking Changes

## Changelog Format (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New feature X
- Support for Y

### Changed

- Updated Z behavior

### Fixed

- Resolved issue #123

## [2.1.0] - 2024-01-15

### Added

- OAuth2 authentication support
- User profile management API
- Dark mode toggle

### Changed

- Improved error messages
- Updated dependencies to latest versions

### Deprecated

- Legacy authentication method (will be removed in 3.0.0)

### Fixed

- Memory leak in WebSocket connection
- Incorrect date formatting in reports
- Race condition in concurrent requests

### Security

- Patched XSS vulnerability in user input

## [2.0.0] - 2023-12-01

### Breaking Changes

- ⚠️ Removed support for Node.js 16
- ⚠️ Changed API response format for `/users` endpoint
- ⚠️ Renamed `config.yaml` to `config.yml`

### Added

- Complete API rewrite with improved performance
- WebSocket support for real-time updates

### Migration Guide

See [MIGRATION_v2.md](./docs/MIGRATION_v2.md) for upgrade instructions.

[unreleased]: https://github.com/user/project/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/user/project/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/user/project/releases/tag/v2.0.0
```

## Release Notes Format

````markdown
# Release v2.1.0 - "Feature Release Name"

Released: January 15, 2024

## 🎉 Highlights

This release brings major improvements to authentication and user experience:

- **OAuth2 Support**: Users can now sign in with Google, GitHub, and Microsoft
- **Dark Mode**: Toggle between light and dark themes
- **Performance**: 40% faster API response times

## ✨ New Features

- OAuth2 authentication with popular providers (#456)
- User profile management API (#478)
- Dark mode toggle in settings (#492)
- Export data in CSV format (#501)

## 🐛 Bug Fixes

- Fixed memory leak in WebSocket connections (#489)
- Resolved incorrect date formatting in reports (#495)
- Fixed race condition in concurrent API requests (#503)

## 🔄 Changes

- Improved error messages across the application
- Updated all dependencies to latest stable versions
- Refined UI animations for smoother experience

## 🔒 Security

- Patched XSS vulnerability in user input validation
- Updated JWT library to address CVE-2024-1234

## 📚 Documentation

- Added OAuth2 setup guide
- Updated API reference with new endpoints
- Improved troubleshooting section

## 🙏 Contributors

Thank you to all contributors who made this release possible:

- @alice - OAuth2 implementation
- @bob - Dark mode feature
- @charlie - Bug fixes and testing

## 📦 Installation

```bash
npm install project-name@2.1.0
# or
yarn add project-name@2.1.0
```
````

## 🔗 Links

- [Full Changelog](https://github.com/user/project/compare/v2.0.0...v2.1.0)
- [Documentation](https://docs.projectname.com)
- [Migration Guide](./docs/MIGRATION_v2.md)

---

**Note:** This is a minor release. No breaking changes. Safe to upgrade from 2.0.x.

````

## Semantic Versioning Rules

Given a version number MAJOR.MINOR.PATCH (e.g., 2.1.0):

1. **MAJOR** (2.x.x → 3.x.x)
   - Breaking changes
   - Incompatible API changes
   - Removed features

2. **MINOR** (2.1.x → 2.2.x)
   - New features
   - Backward-compatible functionality
   - Deprecated features

3. **PATCH** (2.1.0 → 2.1.1)
   - Bug fixes
   - Security patches
   - Performance improvements

**Special versions:**
- `0.x.x` - Initial development (breaking changes allowed in minor)
- `x.y.0-alpha.1` - Pre-release
- `x.y.0-beta.2` - Beta release
- `x.y.0-rc.1` - Release candidate

## Git Commands for Changelog Generation

**If the repo HAS tags:**

```bash
# Commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Commits between two tags
git log v2.0.0..v2.1.0 --oneline
```

**If the repo is TAG-LESS** (use an explicit range — a feature branch merge, a date, or two SHAs):

```bash
# By explicit commit range (what you'll usually use here)
git log <old-sha>..<new-sha> --pretty=format:"%h | %ad | %aN | %s" --date=short

# Since a date (trunk-based teams shipping from dev/main)
git log --since="2026-07-01" --pretty=format:"%h | %ad | %aN | %s" --date=short

# Scope to one feature/module by grepping subjects (e.g. payments)
git log <range> --pretty=format:"%h %s" | grep -Ei 'payment|reconcil|gateway'
```

**Forge-neutral helpers (work with any range `R`, tagged or not):**

```bash
# Contributors in range
git log R --format='%aN' | sort -u

# Merge commits (GitLab 'Merge branch ... into ...' lines name the feature branch)
git log --merges --pretty=format:"%s" R

# Pull down MR/issue IDs referenced in bodies — GitLab !NN and #NN, GitHub #NN
git log R --pretty=format:'%b' | grep -oE '[!#][0-9]+' | sort -u

# Commit count by type
git log R --oneline | grep -oE '(feat|fix|docs|perf|refactor|chore)(\([^)]*\))?' | cut -d'(' -f1 | sort | uniq -c
````

## Breaking Changes Detection

Look for these indicators:

- Commit message contains `BREAKING CHANGE:`
- Commit type has `!` (e.g., `feat!:`)
- PR labeled with "breaking-change"
- Major dependency updates
- API endpoint changes
- Config file format changes

**Document clearly:**

````markdown
### Breaking Changes

⚠️ **API Response Format Changed**

The `/api/users` endpoint now returns:

```json
// Before
{ "data": [...] }

// After
{ "users": [...], "total": 100 }
```
````

**Migration:** Update your API client to access `users` instead of `data`.

````

## Automation Tools

### Using conventional-changelog
```bash
npm install -g conventional-changelog-cli

# Generate changelog
conventional-changelog -p angular -i CHANGELOG.md -s

# Generate for specific version
conventional-changelog -p angular -i CHANGELOG.md -s -r 0
````

### Using git-cliff

```bash
# Install git-cliff
cargo install git-cliff

# Generate changelog
git-cliff --tag v2.1.0 > CHANGELOG.md

# Generate release notes
git-cliff --tag v2.1.0 --unreleased
```

### Release Script — TAG-BASED repos only

> Skip this entire section for tag-less repos. Only offer it when `git tag` returned results.

**GitHub:**

```bash
#!/bin/bash
VERSION="v1.2.3"  # pass the version as an argument or edit here
PREVIOUS_TAG=$(git describe --tags --abbrev=0)
gh release create "$VERSION" \
  --title "Release $VERSION" \
  --notes "$(git log $PREVIOUS_TAG..HEAD --pretty=format:'- %s')"
```

**GitLab** (via `glab`):

```bash
#!/bin/bash
VERSION="v1.2.3"  # pass the version as an argument or edit here
PREVIOUS_TAG=$(git describe --tags --abbrev=0)
glab release create "$VERSION" \
  --name "Release $VERSION" \
  --notes "$(git log $PREVIOUS_TAG..HEAD --pretty=format:'- %s')"
```

## User-Facing vs Developer-Facing

### User-Facing (Release Notes)

- Focus on benefits and features
- Less technical jargon
- Include screenshots/demos
- Highlight user experience improvements
- Provide upgrade instructions

### Developer-Facing (Changelog)

- Technical details
- API changes
- Breaking changes with migration guides
- Dependencies updates
- Internal refactorings

## Templates by Project Type

### Library/Package

Focus on: API changes, breaking changes, new methods

### Application

Focus on: New features, bug fixes, UI improvements

### CLI Tool

Focus on: New commands, flag changes, behavior changes

### API Service

Focus on: Endpoint changes, performance, security

## Best Practices

1. **Be specific**: "Fixed login bug" → "Fixed session timeout on mobile"
2. **Link issues/PRs/MRs**: use the detected forge's syntax — GitHub `#123`, GitLab MRs `!123` & issues `#123`
3. **Credit contributors**: Acknowledge work
4. **Highlight impact**: Mark breaking changes clearly
5. **Group logically**: By type, not chronologically
6. **Update regularly**: With each release
7. **Follow conventions**: Keep a Changelog format
8. **Semantic versioning**: Use correctly

## Changelog Entry Examples

### Good Examples

```markdown
### Added

- OAuth2 authentication support (#456) - @alice
- Export data in CSV format with custom column selection (#501)

### Fixed

- Resolved memory leak in WebSocket connections affecting long-running sessions (#489)
- Fixed race condition in concurrent API requests that caused data inconsistency (#503)
```

### Bad Examples

```markdown
### Added

- Added stuff
- New feature

### Fixed

- Fixed bug
- Updates
```

## Version Suggestion Algorithm

> **Only run this if the repo uses tags.** For tag-less repos there is no baseline to bump from — skip version suggestion entirely and label the section `## [Unreleased]` or `## <date> — <scope>`. Do NOT invent a `v0.1.0` unless the user explicitly asks to start tagging.

```
If breaking changes detected:
  MAJOR++, MINOR=0, PATCH=0
Else if new features:
  MINOR++, PATCH=0
Else if only fixes:
  PATCH++
```

## Release Checklist

Before publishing release:

- [ ] Review all commits since last release
- [ ] Identify breaking changes
- [ ] Categorize changes properly
- [ ] Update CHANGELOG.md
- [ ] Write release notes
- [ ] Update version in package.json/pyproject.toml
- [ ] Create git tag
- [ ] Push tag to trigger CI/CD
- [ ] Publish to package registry (npm, PyPI, etc.)
- [ ] Create GitHub release with notes
- [ ] Announce on relevant channels

## Output Checklist

Always provide:

- [ ] Formatted CHANGELOG.md following Keep a Changelog
- [ ] Release notes draft (user-friendly)
- [ ] Breaking changes clearly marked
- [ ] Migration guide for breaking changes
- [ ] Forge-correct references (GitHub `#`/`/pull/`; GitLab `!`/`/-/merge_requests/`) — or plain-text IDs if no remote

Provide ONLY if the repo uses tags:

- [ ] Semantic version suggestion (X.Y.Z)
- [ ] Git tag command to run
- [ ] Links to compare view (tag..tag)

Skip the tag-only items silently for tag-less repos — do not surface `git describe` errors or suggest starting to tag unless the user asks.
