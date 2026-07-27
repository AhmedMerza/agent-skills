---
name: qa-sweep
description: Drive the running app in a real browser and hunt for things that are actually broken — dead buttons, failing forms, console errors, broken states, regressions on adjacent pages — then report each with reproduction steps and screenshot evidence. Invoke with /qa-sweep to check a branch's changes before opening an MR, or to sweep a page or flow on demand. Defaults to diff-aware mode: works out which routes the current branch touched and tests those. Reports findings; does not fix them. Restraint-gated: a short list of real, evidenced bugs beats a long list of nitpicks, and "nothing broken, here's what I covered" is a valid result.
---

# /qa-sweep — find what's actually broken, by using the app

Static review reads code; this drives it. The bugs it catches are the ones only a running app reveals — a button wired to nothing, a form that 500s on empty input, a dialog that opens behind an overlay, a console error that only fires after the third click, a page that worked before your branch and doesn't now.

This is the runtime counterpart to the static passes: `ui-audit` judges whether the UI is *built* correctly, `ux-audit` whether it *works for the person*, and this one whether it **works at all**. Findings only — hand fixes to `root-cause` (if the cause isn't obvious) or straight to a fix branch.

**The restraint gate.** Report bugs, not observations. Five evidenced defects that would embarrass you in production beat forty "the spacing is 2px off" notes — those belong to `ui-audit`. Don't report dev-server artifacts as app bugs. Don't keep sweeping once you've covered the scope: a clean sweep reported as *"covered these 6 routes, these 4 flows, found nothing"* is a real and useful result. Never pad it.

## Pick a driver

Anything that can navigate, click, fill, screenshot and read the console works. In preference order:

1. **`claude-in-chrome`** — load that skill first, then use its tools. Best when available: real browser, real session, interactive.
2. **Playwright direct** — always available in this project and already authenticated. Resolve it from the project's own install and reuse the saved session:

```js
import { createRequire } from 'node:module'
const require = createRequire('<repo>/storage/playwright/')
const { chromium } = require('playwright')
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ storageState: '<repo>/storage/playwright/auth-state.json' })
```

Write throwaway driver scripts to the scratchpad, never into the repo. Screenshots go to gitignored `storage/playwright/qa/`. If the session is genuinely dead (a real page redirects to `/login`), refresh it with `/browse --login` — but verify against a *real route* first: a bare prefix like `/admin` may 301 to a non-page and 403, which is not an auth failure.

## The passes

### 1. Scope — what actually needs testing

**Default to diff-aware.** With no target given and a feature branch checked out, derive the scope from the diff rather than sweeping the whole app:

```bash
git diff upstream/dev...HEAD --name-only
git log upstream/dev..HEAD --oneline
```

Then map changed files to routes — **look the mapping up, don't guess it**:

- **Controllers** → `php artisan route:list --path=<segment>`, or grep `routes/` for the controller name. This is a real lookup; never infer a URL from a file path.
- **Vue pages** → grep for the `Inertia::render('Path/To/Page')` that mounts the component, then find that controller's route.
- **Components** → grep which pages import them, then map those pages.
- **Models / services** → grep the controllers that reference them, then map those.
- **API endpoints** → hit them directly; don't drive a browser for JSON.

**Filter out the routes that aren't pages before you navigate anything.** A GET route under an admin prefix is very often a JSON endpoint for the frontend, not a visitable page — navigating to it bare produces a "failure" that is entirely your own doing. Tells: the controller method returns `JsonResponse` rather than an Inertia/view response, or the path reads like data (`get-*`, `*-list`, `*/search`, `*/data`). Confirm cheaply by requesting it with `Accept: application/json`.

When you *do* exercise such an endpoint, check the status it returns for bad input: a validation failure must come back **422 with field-keyed errors**, not 500. A `catch (Exception)` around `$request->validate()` swallows `ValidationException` and re-emits it as a server error — which tells every client that *they* broke the server, and buries real 500s in the same bucket. That pattern is a finding in its own right.

If the diff maps to nothing navigable (config, migrations, jobs, console commands), **do not skip the sweep** — fall back to a smoke pass over the app's main entry points. Backend changes break pages too. Say in the report that scope was inferred this way.

Also read the commit messages and MR description for *intent*: the change is supposed to do something specific. Verify it does that, not merely that the page renders.

### 2. Orient

Load the app, note which org and user you're authenticated as (findings can be tenant-scoped — a bug for org 5 may not reproduce for org 1), and capture a **console baseline** before touching anything, so you can attribute new errors to your actions.

### 3. Sweep each in-scope page

Per page: does it render, and then —

- **Interactive elements** — click the buttons, links and menu items. Does each do what its label says, or nothing at all?
- **Forms** — submit empty, submit invalid, submit a valid edge case. Check the error is *shown to the user*, not just logged. Confirm the success path actually persists.
- **States** — empty, loading, error, and overflow (long strings, many rows). Empty states are the most commonly unbuilt.
- **Navigation** — every route in, every route out, plus browser back.
- **Console** — re-check after interactions, not just on load.
- **Locale** — this app ships `en` and `ar`. Switch locale and re-check the page: untranslated keys, and layout that breaks under RTL.
- **Responsive** — measure, don't eyeball. See below.

**Responsive: measure overflow, don't judge screenshots.** Load the page at a spread of viewports — mobile 375, tablet 768, laptop 1280, ultra-wide 2560 — and take the objective reading at each:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth   // > 1 = the page overflows
```

That number is a fact, and a page that overflows horizontally on a phone is broken regardless of anyone's taste. **Only hunt for culprit elements once that page-level number is positive.** Scanning every element for clipping on a page that doesn't overflow returns hundreds of intentional hits and buries the real signal — measured here at 346 false positives on one clean page. When it is positive, find the offenders by right edge past the viewport (`getBoundingClientRect().right - clientWidth`), excluding three things that clip by design:

- `text-overflow: ellipsis` — deliberate truncation
- anything with a scrollable ancestor (`overflow-x: auto|scroll`) — it lives inside a scroller on purpose
- anything with a `transform` — off-canvas drawers sit outside the viewport by design

Report the outermost offenders with how far each sticks out. Children inherit their parent's overflow, so the parent is the fix site.

Ultra-wide is a separate question: at 2560 the objective failure is still overflow or content that becomes unreachable — a layout that merely *looks* sparse or over-stretched is a judgement call and belongs in `ui-audit`, not here.

**Filter dev-server noise.** Under Vite dev the console carries HMR chatter, `[vite] connected`, and source-map warnings — none are bugs. Unbundled modules and `transferSize: 0` are dev-mode artifacts, not performance findings. Report only errors originating in application code.

**Verify computed state, not appearance.** For anything style- or visibility-related, probe `getComputedStyle` rather than judging a screenshot. Screenshots are evidence for a human, not your basis for a claim.

### 4. Evidence — two tiers

**Interactive bugs** (dead control, broken flow, form failure): screenshot before, perform the action, screenshot after, and write repro steps precise enough for someone else to follow — URL, exact control, input used, what happened, what should have happened.

**Static bugs** (missing state, untranslated string, broken layout): one screenshot plus a sentence naming what is wrong.

Write each finding down when you find it. Batching at the end loses the detail that makes a report actionable.

### 5. Report

Severity by user impact, not by how easy it is to fix:

- **Blocker** — the core action of the page cannot be completed
- **Major** — a real flow is broken or silently loses data; a workaround exists
- **Minor** — wrong, visible, but the user can still finish

## Output shape

```
## qa-sweep: <scope — branch, page, or flow>

**Covered** — <routes/flows tested; org + user; driver used>
**Result** — <N blockers, N major, N minor — or "nothing broken">

### <SEV> <one-line title>
**Where** — <url> · <the control or field>
**Repro** — 1. … 2. … 3. …
**Expected / Actual** — <what should happen> / <what does>
**Evidence** — <screenshot paths, console output>

**Top 3 to fix:** <the three highest-impact, in order>
**Not covered:** <what was out of scope and why — never leave this implicit>
```

## Guardrails

- **Findings, not fixes.** Report it; don't patch it mid-sweep. A fix inside a QA pass goes untested and hides the bug's real shape.
- **Every claim carries evidence.** A repro someone else can follow, or it doesn't go in the report.
- **Verify the intent, not just the render.** "The page loads" is not "the change works."
- **Dev-mode artifacts are not bugs.** HMR noise, unbundled modules, missing transfer sizes.
- **Check the adjacent pages.** The regression your branch caused is usually one route over from the one you changed.
- **Note the tenant.** State which org/user the sweep ran as; a finding may not reproduce elsewhere.
- **Say what you didn't cover.** Silent scope gaps read as "all clear" when they aren't.
- **Nitpicks belong to `ui-audit`.** Spacing, contrast, token misuse — different skill, don't duplicate it here.
