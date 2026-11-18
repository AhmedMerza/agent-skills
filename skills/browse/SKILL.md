---
name: browse
description: "View and inspect app pages through agent-browser, including authenticated sessions and full-page screenshots; use the project's Playwright helper only when its existing auth harness is required."
---

# /browse - View app pages

Open a running app, inspect its rendered content, capture visual evidence when useful, and describe what is actually on the page.

## Default driver: agent-browser

Use the `agent-browser` skill and CLI for ordinary Chrome work. It is globally installed, does not require a project Playwright dependency, and keeps one isolated browser session alive across commands.

1. Run `agent-browser skills get core` and follow it.
2. Create a worktree-scoped session with `agent-browser session id --scope worktree --prefix browse` and pass it on every command.
3. Apply `--restore` when the task needs saved login state. For sensitive login, use the auth vault instructions rather than command-line passwords.
4. Open the page, wait for the expected rendered content, and inspect it with `snapshot -i` or a scoped/full snapshot. Check `console` and `errors` when the request involves runtime behavior.
5. Capture a full-page screenshot to a temporary path when the user needs a visual description or evidence: `agent-browser --session <name> screenshot --full`. Inspect the returned image, then close the session when the task is complete.

For `--mobile`, set a mobile device or viewport before opening the page. Treat `--wait <ms>` as an upper bound and wait for the expected element, text, URL, or app condition instead of sleeping for the whole duration.

## Project Playwright helper fallback

Use the existing Playwright helper only when a project's `.claude/browse-config.json`, `auth-state.json`, custom login selectors, or Playwright-specific behavior is the reason the page is reachable. This fallback remains project-agnostic but requires a local Playwright install.

## Project-agnostic resolution

The fallback works in **any** repo that has Playwright installed locally. App-specifics
(base URL, login flow, default user) come from an optional `<repo>/.claude/browse-config.json`;
credentials are **never** stored — they come from `PW_EMAIL` / `PW_PASS` env at run time.

- **Config**: `.claude/browse-config.json` (see `~/.claude/gitlab-config.example.json`'s sibling
  pattern). Keys: `baseUrl`, `loginPath`, `defaultUser`, `channel`, `playwrightDir`, `outDir`,
  and `auth` selectors (`emailTabText`, `emailSelector`, `passwordSelector`, `submitButtonName`).
  If absent, the helper falls back to sensible defaults (`http://localhost:8080`, `/login`,
  `input[type=email]` / `input[type=password]`, submit button named "Login").
- **Playwright** is resolved from the project's own install (`playwrightDir`, else
  `storage/playwright`, else repo root). If it is absent, continue with agent-browser unless the
  requested page specifically depends on the helper's saved Playwright state.

## Arguments

`$ARGUMENTS` - the URL path to browse, with optional flags:
`--mobile` (iPhone 14 viewport), `--login` (force re-login), `--user <email>` (override login email),
`--wait <ms>` (raise the settle cap, default 15000 — see Notes).
Examples: `/admin/welcome`, `--mobile /admin/welcome`, `--login --user ops@example.com /admin/orders`.

## Playwright fallback instructions

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
- **It waits for the page to actually render, not for a fixed delay.** Local dev is slow twice
  over: a dev server compiles modules on demand so first paint lags domcontentloaded, and SPA
  pages then fetch their data *after* hydrating, which no page-load event covers. The helper
  waits until document/script/XHR traffic goes quiet (capped at 15s, raise with `--wait <ms>`
  or `BROWSE_WAIT_MS`). Deliberately NOT `networkidle` — HMR channels and browser-log shippers
  keep the network permanently busy, so it would just burn its timeout.
- If a shot still shows a skeleton or spinner, the page is slower than the cap: re-run with
  `--wait 30000` rather than assuming the page is broken.
- Set `outDir` to an absolute path or a project-relative one — the helper resolves it absolutely
  to avoid nested-output bugs when run from inside the Playwright dir.
