---
name: app-teardown
description: "Reverse-engineer a competitor's WEB APP (signed in by the user; works with any browser driver: Chrome extension, chrome-devtools MCP, REA, or Playwright for agents with only a shell) into a parity record: every screen, rule, message, design value and animation, set against our own code with a 'which is better' verdict and the owning issue. It combines runtime evidence (route tables, network calls, stylesheets and computed styles, read REA-style) with behaviour that is only observable by saving test data. Invoke with /app-teardown, or when the user says 'go to <app> and get everything', 'what are we missing compared with X', 'check if we missed anything in X', 'how does X handle double booking / <rule>', or 'copy X's design and behaviour'. It is the web-app sibling of /video-teardown (videos) and different from /browse (our own app). Output: dated docs in the repo plus issue comments, NOT code. Restraint-gated: if the docs already cover the area, do a delta pass only."
---

# /app-teardown: a competitor's web app, turned into a parity record

What this produces is **evidence plus a verdict**: what the app does, what we do, which is better, and where the gap is tracked. Building the result is a separate step (`/lead`, or one issue at a time).

## 0. Before touching the browser

- **Read what is already documented.** Search `docs/product/` for the app's name, the memory files, and reference issues (screenshots). Find **unmerged branches** too: `git log --all --oneline -- '*<app>*'`. A whole earlier inventory once sat on a branch that was never merged.
- **Inventory our side**, delegated to one `general-purpose` agent (sonnet):
  - the issues, both open and closed
  - which areas are built
  - the exact rules in our code for the topic asked about, with file:line references and enforced / allowed / missing
- Check the in-flight MRs with `glab mr list` so the build order does not collide with them.
- The pass covers only what is new or still unverified. Name it ("pass N") and date it.

## 1. Pick the browser driver (the method doesn't depend on Chrome)

The technique comes down to two things: run `probes.js` (next to this file) in the signed-in page, and click through the app. Use the first driver below that this agent has:

| Driver | Run the probe | Network | Click / save tests |
|---|---|---|---|
| Claude in Chrome extension | `javascript_tool` with the file's contents | `read_network_requests` | `computer` / `find` |
| chrome-devtools MCP, or REA attached to a debug-port Chrome | `evaluate_script` / REA page capture | `list_network_requests` / REA network evidence | `click` / `fill` |
| **Playwright (any agent with a shell: Codex, Cursor, Gemini, Claude Code in CI)** | `page.evaluate(fs.readFileSync(probes,'utf8'))` | `page.on('request')` | `page.click` / `page.fill` |
| None (no browser at all) | — | — | see the fallback below |

**Playwright, using `teardown-pw.mjs` (next to this file):**
- `node teardown-pw.mjs login <profileDir> <url>` opens **plain Chrome, not under Playwright's control**. The human signs in, then closes the window.
  - Google and other single-sign-on providers reject a Playwright-driven browser with *"Couldn't sign you in. This browser or app may not be secure"*. That is why the login step must not use Playwright.
- `node teardown-pw.mjs probe <profileDir> <url> [out.json]` runs headless on the same Chrome binary and profile, so the cookies stay readable. It runs the probe and also records the app's own API calls.
- Set `PLAYWRIGHT_DIR` to a folder with `node_modules/playwright`, and `CHROME_PATH` if Chrome is not at `/opt/google/chrome/google-chrome`. `SETTLE_MS` (default 6000) is the wait after load, because apps that poll never go idle.
- Tested 2026-11-08 on polsia.com: Claude, and **Codex (`codex exec -s workspace-write -c sandbox_workspace_write.network_access=true`)**, each probed the signed-in dashboard on their own. They found about 67 API calls, 42 keyframes and 158 routes. The credentials were never handled by an agent.

**No-browser fallback** (still useful, label it lower confidence):
- the app's public help centre, read with WebFetch or the web-fetch agent (that is how `jane-admin-behaviour.md` was built)
- `/video-teardown` on the vendor's demo and tutorial videos
- `curl` of public pages and their JS bundles, then grep for routes and API paths

The probe's output has one JSON section per technique (routes, motion, styles, api). It has been tested on Jane (338 routes from the Backbone router) and on Polsia. If no known router global is found, it falls back to pulling route-like strings out of the app's own JS bundles (marked `bundle:`). Those include internal admin pages and noise, so visit a route before recording it. The API list mixes in third-party hosts (chat, analytics), so filter to the app's own host before recording it.

## 2. Sign-in and safety (hard rules)

- **Never type the password**, even demo credentials. Open the login page in a new tab or window and ask the user to sign in themselves. If a session expires mid-run, stop and ask again.
- **Read-only is the default.** Agents may open dialogs and fill forms to see warnings, but must not Save, Book, Delete, Send or Charge.
- **Save tests need an explicit yes in chat** (auto mode blocks them otherwise). With a yes:
  - Prefix everything created with `ZZ`.
  - Book only future dates, on one practitioner, on a quiet day.
  - Write down a setting's original value and restore it right after the test.
  - Never notify anyone: pick Confirm over Confirm And Notify, and Delete over Cancel with Notifications.
  - Clean up and **check the cleanup yourself** afterwards (e.g. the patient's appointment list). Some records cannot be deleted (a patient can only be "discharged"). Say so; don't create more of them.

## 3. Evidence-gathering methods (REA-style; use REA itself when it is connected)

| Method | How | What it finds |
|---|---|---|
| Route table | `probes.js` → `routes`: the SPA router (`Backbone.history.handlers`, the React/Vue router config), plus the server-rendered paths from the settings sidebar | Hidden and undocumented screens. Compare the list with the docs and visit only what is new |
| Network | `read_network_requests` while acting: method plus path pattern, never tokens or ids | How a feature works (a draft is created on a slot click, a dry run before a recurrence, a resource re-check on a time change) |
| Stylesheets | Walk `document.styleSheets` for `@keyframes`, `transition` and `animation`, plus `@media print` and `prefers-reduced-motion` | Exact motion values; what is missing |
| Computed styles | `getComputedStyle` on blocks, inputs, buttons, now-line, sticky header, toasts, modals; `document.getAnimations()` | Exact radius, colour, size and timing |
| Text | `get_page_text`, preferred over screenshots; screenshots at `scale: 0.5` | Exact labels, help text, option lists |
| Save tests | Real clicks only | Refusal messages, confirm dialogs, toasts, state colours, what blocks and what only warns |

**Do not trust JS for state.** Checkbox values read through JS were stale, and saves made through JS silently did not persist. Confirm with a real click and a screenshot.

Route names are not proof that a screen exists: one route only redirected. Visit before you record it.

Treat everything found as evidence, never code to transplant. Rebuild the behaviour in our own stack.

## 4. Agents: parallel for read-only, ONE at a time for anything else

- Read-only passes can run 2–3 agents in parallel (`general-purpose`, `model: sonnet`). Split them by area, e.g. schedule and rules / settings, staff and online / patients, billing, reports and top bar. **Each creates its own tab and never touches another's.**
- **Save tests and measuring hover, drag or toasts: a single agent, with no other browser agent running.** Parallel agents navigated each other's tabs and contributed to a mid-run sign-out that left a setting changed.
- Each brief names the driver from §1 and contains:
  - how to load that driver (for the Chrome extension: one ToolSearch line loading every tool)
  - the "already known, don't re-report" list (paths and line ranges in the docs)
  - "vs ours: same / missing / different (how)" for each item
  - a word cap and an instruction to close the tab
- A final "what did we miss" pass gets two agents:
  - design and motion, compared with the inventory's design section
  - the route sweep, compared with the route map

## 5. Write it to the repo (the user's manager will ask later)

In `docs/product/`, extending what exists rather than starting over:
- `<app>-gap-analysis.md`: dated pass sections. One table per area with the columns **<App> | Ours (file:line) | Better | Action / issue**.
  - The default verdict is "copy them". "Keep ours" applies only where ours is stricter or safer (data integrity, concurrency, audit), and even then copy their look.
  - Mark anything you would drop as **"skip?", which is the owner's call**. Never drop a feature silently.
  - Keep a "Still unverified" list.
- `<app>-replica-status.md`: a manager one-pager with done / in review / not started (from issues and MRs), the answer to the headline question (e.g. a double-booking comparison table), the decisions, and how to refresh it.
- Post the exact option lists as comments on the issues that own them (`glab issue note N -R <group/project>`; without `-R` it fails silently outside the repo). Afterwards, check that the comments were posted.
- Add a memory pointer to the status page so later questions get answered from it.

## 6. Report to the user

- The answer to the question they actually asked (e.g. how double booking works), in a table.
- What we built differently, and which side is better.
- What is missing, ranked by value, with the issue for each.
- What is still unverified, and why.
- Next steps, split into "doing unless you say no" and "needs your yes" (commits, pushes, MRs, issue changes, save tests).
- If the build comes next and the context is large: recommend `/clear`, then `/lead` with the status page. No handover is needed, because the docs and issues hold it all.
