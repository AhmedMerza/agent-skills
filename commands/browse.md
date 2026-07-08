---
name: browse
version: 2.0.0
description: View app pages via Playwright — authenticated, scrolling screenshots
---

# /browse - View App Pages via Playwright

Take authenticated, scrolling screenshots of a running app's page and describe them.

## Project-agnostic resolution

This command works in **any** repo that has Playwright installed locally. App-specifics
(base URL, login flow, default user) come from an optional `<repo>/.claude/browse-config.json`;
credentials are **never** stored — they come from `PW_EMAIL` / `PW_PASS` env at run time.

- **Config**: `.claude/browse-config.json` (see `~/.claude/gitlab-config.example.json`'s sibling
  pattern). Keys: `baseUrl`, `loginPath`, `defaultUser`, `channel`, `playwrightDir`, `outDir`,
  and `auth` selectors (`emailTabText`, `emailSelector`, `passwordSelector`, `submitButtonName`).
  If absent, the helper falls back to sensible defaults (`http://localhost:8080`, `/login`,
  `input[type=email]` / `input[type=password]`, submit button named "Login").
- **Playwright** is resolved from the project's own install (`playwrightDir`, else
  `storage/playwright`, else repo root). If a repo has no Playwright, `/browse` can't run there.

## Arguments

`$ARGUMENTS` - the URL path to browse, with optional flags:
`--mobile` (iPhone 14 viewport), `--login` (force re-login), `--user <email>` (override login email).
Examples: `/admin/welcome`, `--mobile /admin/welcome`, `--login --user ops@example.com /admin/orders`.

## Instructions

1. **Ensure credentials.** Login needs `PW_PASS` (and an email via `--user`, `PW_EMAIL`, or
   config `defaultUser`). If `PW_PASS` isn't set in the environment, **ask the user for the
   password** and pass it inline for this run only — do not store it. Example invocation:
   ```bash
   PW_PASS='<password>' node ~/.claude/scripts/browse.mjs $ARGUMENTS
   ```
   Use a timeout of 120000ms. Run from the **project root** (so the helper finds
   `.claude/browse-config.json` and the project's Playwright).

2. **Read the output.** The helper prints `OK <url>` and the absolute paths of the screenshots
   it wrote (`page-1.png`, `page-2.png`, … in the configured `outDir`). Read ALL of those
   `page-*.png` files and describe what's on the page to the user.

3. **Handle failures by exit code:**
   - `exit 2` — Playwright not resolvable → the repo has no Playwright install (or set
     `playwrightDir`/`BROWSE_PW_DIR`).
   - `exit 3` — missing `PW_PASS`/email → ask the user, re-run.
   - `exit 4` — `LOGIN FAILED` → wrong credentials, or the login selectors in
     `browse-config.json` don't match this app's form. Confirm creds, then check the `auth` block.
   - Session/`auth-state.json` expired → re-run with `--login`.

4. **Laravel apps only (optional fallback):** if login fails because the account password is
   unknown and this is a Laravel app you control, you *can* set a known password:
   ```bash
   php artisan tinker --execute="\$u = App\\Models\\User::where('email','<email>')->first(); \$u->password = Hash::make('<password>'); \$u->save();"
   ```
   Only do this with the user's go-ahead and a non-production database.

## Notes
- Base URL, login behavior, and the default user are per-project (`.claude/browse-config.json`).
- The helper reuses `auth-state.json` in `outDir`; `--login` forces a fresh login.
- Screenshots are 1920×1080 (desktop) or iPhone 14 size (`--mobile`).
- Set `outDir` to an absolute path or a project-relative one — the helper resolves it absolutely
  to avoid nested-output bugs when run from inside the Playwright dir.
