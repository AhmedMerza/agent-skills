---
name: app-teardown
description: "Reverse-engineer a competitor's WEB APP (signed in by the user; works with an interactive connector, agent-browser, or a project Playwright harness) into a parity record: every screen, rule, message, design value and animation, set against our own code with a 'which is better' verdict and the owning issue. It combines runtime evidence (route tables, network calls, stylesheets and computed styles, read REA-style; motion recorded frame by frame with real input) with behaviour that is only observable by saving test data. Invoke with /app-teardown, or when the user asks to inspect an app completely, find what is missing compared with it, verify how it handles a rule, or copy its design and behaviour. It is the web-app sibling of /video-teardown (videos) and different from /browse (our own app). Output: dated docs in the repo plus issue comments, NOT code. Restraint-gated: if the docs already cover the area, do a delta pass only."
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

The technique comes down to two things: run `probes.js` (next to this file) in the signed-in page, and click through the app. Use agent-browser by default for Chrome. Prefer an interactive connector when the task specifically needs the human's already-open signed-in session, and Playwright when its existing profile or instrumentation is required.

| Driver | Run the probe | Network | Click / save tests |
|---|---|---|---|
| **agent-browser (preferred shell driver for Chrome)** | `agent-browser eval --stdin < probes.js` | `network requests` / HAR | snapshot refs + `click` / `fill` |
| Claude in Chrome extension | `javascript_tool` with the file's contents | `read_network_requests` | `computer` / `find` |
| chrome-devtools MCP, or REA attached to a debug-port Chrome | `evaluate_script` / REA page capture | `list_network_requests` / REA network evidence | `click` / `fill` |
| **Playwright** | `page.evaluate(fs.readFileSync(probes,'utf8'))` | `page.on('request')` | `page.click` / `page.fill` |
| None (no browser at all) | — | — | see the fallback below |

**Motion is a separate pass:** `probes.js` does not record motion. For anything about look, feel or animation, run §3b's `motion-pass.sh` (agent-browser), which loads `motion-probe.js` as an init script.

**agent-browser:** run `agent-browser skills get core`, create a task-specific session, and pass it on every command. Open the login page headed and let the user sign in themselves; keep using that session for the probe and click-through. Clear the request log before each measured flow. Use a Chrome profile or `--restore` only when the user has authorized persisting that session. Close the session when the pass ends.

**Playwright fallback, using `teardown-pw.mjs` (next to this file):**
- `node teardown-pw.mjs login <profileDir> <url>` opens **plain Chrome, not under Playwright's control**. The human signs in, then closes the window.
  - Google and other single-sign-on providers reject a Playwright-driven browser with *"Couldn't sign you in. This browser or app may not be secure"*. That is why the login step must not use Playwright.
- `node teardown-pw.mjs probe <profileDir> <url> [out.json]` runs headless on the same Chrome binary and profile, so the cookies stay readable. It runs the probe and also records the app's own API calls.
- Set `PLAYWRIGHT_DIR` to a folder with `node_modules/playwright`, and `CHROME_PATH` if Chrome is not at `/opt/google/chrome/google-chrome`. `SETTLE_MS` (default 6000) is the wait after load, because apps that poll never go idle.
- Use this fallback when SSO rejects controlled Chrome, when an existing profile was created through this helper, or when the probe needs Playwright-specific instrumentation. Tested 2026-11-08 on polsia.com: Claude, and **Codex (`codex exec -s workspace-write -c sandbox_workspace_write.network_access=true`)**, each probed the signed-in dashboard on their own. They found about 67 API calls, 42 keyframes and 158 routes. The credentials were never handled by an agent.

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
| Stylesheets | Walk `document.styleSheets` for `@keyframes`, `transition` and `animation`, plus `@media print` and `prefers-reduced-motion` | CSS-only motion and print/reduced-motion rules. **Not** the motion of a JS-driven app: see §3b |
| Computed styles | `getComputedStyle` on blocks, inputs, buttons, now-line, sticky header, toasts, modals | Exact radius, colour, size. Timing only for CSS transitions |
| **Motion** | `motion-probe.js` as an init script plus real-input interactions (§3b) | What actually moves, on load and on every interaction: props, visible duration, stagger, fitted ease, the tween calls themselves, jank, flashes |
| Text | `get_page_text`, preferred over screenshots; screenshots at `scale: 0.5` | Exact labels, help text, option lists |
| Save tests | Real clicks only | Refusal messages, confirm dialogs, toasts, state colours, what blocks and what only warns |

**Do not trust JS for state.** Checkbox values read through JS were stale, and saves made through JS silently did not persist. Confirm with a real click and a screenshot.

Route names are not proof that a screen exists: one route only redirected. Visit before you record it.

Treat everything found as evidence, never code to transplant. Rebuild the behaviour in our own stack.

## 3b. Motion pass (required whenever the ask includes design, look, feel, animation or "copy")

`probes.js` reads stylesheets and calls `getAnimations()` once. Modern reference apps animate in JS (GSAP, Motion, WAAPI), and hover, press and route motion only exists *after* input, so it sees almost nothing. Measured 2026-11-18 on Fitlo (React + GSAP + Flip): probes.js reported 1 running animation and 0 hover/nav/route/drawer/chart motion, where 44 elements animated on first load and 84 GSAP call sites existed. Never write a motion section from probes.js or from screenshots.

All commands go through `motion-pass.sh` next to this file (`M=<this dir>/motion-pass.sh`). Give each run its own session name `S`; `$M` with no arguments prints usage. Every command prints a readable table; add `--json` as the last argument for the full object.

0. **Self-test first, once per machine or session:** `$M $S selftest`. Each `expect` line must match: a JS tween, hover inside `@media (hover: hover)`, press down + release, and the three defect flags. If one is missing, the probe or driver is broken here, and "nothing recorded" on the real site means nothing. Stop and say so.
1. **Fresh first load:** `$M $S open <url>`. It loads `about:blank` first, so a URL differing only after `#` still reloads, and the recorder runs as an init script from document start. Repeat for each main page. A late `agent-browser eval` of the probe works too, but misses first load. Playwright: `page.addInitScript({ path })` before `goto`.
2. **Declared values:** `agent-browser --session $S eval "__mp.scan()"` after visiting every page (lazy chunks load only on visit). It is async: eval it bare, don't wrap it in `JSON.stringify` or `Object.keys` (that prints `{}`). It returns:
   - the motion libraries;
   - every parsed tween call (`calls`: target text plus vars, i.e. duration, ease, stagger, from→to);
   - easing and duration histograms.

   After `scan()`, an `out()` table line ends in `⇐ <the declared call>` only when the call's target names the element's class or data-attribute, it animates every property that moved (translate, scale and rotate are told apart), and it goes the same way (an entrance never matches an exit). A wrong match is worse than none, so partial matches are dropped. **Build the copy from the declared values.**
   - **Live values:** when the page exposes `window.gsap` (a CDN build, or our own dev build with `window.gsap = gsap`), every tween is captured from GSAP's timeline while it runs: `liveGsap` in `scan()`, marked `[live …]`. No parsing; exact `from`/`fromTo`/`to`, duration, ease and stagger. Bundled reference sites usually don't expose it (none of Fitlo, Cadra, Kerfa or Tavola do), so for verifying **our** copy, expose it in dev.
   - **No `⇐`:** the call's target is a minified variable. Find it in `calls` by its from/to values, and mark the row "declared: inferred".
   - **Wrapped durations** such as `q(.9)` or `y(.5)` pass through a site-wide speed helper, usually a reduced-motion switch, so the number inside is the base duration. Check it against a recorded `back.out` row, which records at its true length.
3. **What to test:** `$M $S targets` lists selector + index per interaction class (only elements in view now; `(hover motion declared)` marks ones with a CSS transform/shadow transition or a `data-lift`-style hook) (nav, tabs, theme, switches, buttons, rows, cards). Buttons whose label reads like a write (save, delete, send, pay…) are under `unsafe`. §2 applies: never press them. A button that opens a popover or drawer is fine: record the open, then press Escape.
4. **Every interaction class, with real input.** `press` releases the button, so the release is a click: press only things whose click is safe. `$M $S <name> <hover|click|press> '<selector>' [index]`. The recording arms on the real input (pointer move for hover, pointer down for click and press), so times are measured from the user's action. Cover at least:
   - nav item hover and click (the indicator and route transition)
   - button, card and row hover; button press held (`press`)
   - tabs and segmented / period switch (chart morph, count-ups)
   - open and close of drawer, modal, popover and menu
   - theme toggle
   - toggle and switch
   - drag (by hand: `agent-browser mouse down/move/up` after `eval "__mp.rec('drag')"`, then `eval "__mp.out('drag','table')"`)
   - the toast after a non-saving action
5. **Read the table:** one line per group of same-kind elements: `+start element ×count stagger | prop from→to visible-ms ease`.
   - A prop that moved more than once lists its **phases**: press = down / release, flash = an instant hide then the entrance, replay = a phase that repeats an earlier one.
   - `instant` lists things that changed in one frame with no transition, such as a colour snap on hover or under a View Transition.
   - `view transition` names the pseudo-element animations: report a theme switch from that line, not from the colour snaps.
   - `ambient` is looping motion.
   - Content growth (width/height jumps) is dropped as layout.

   When a line looks wrong, check the raw per-frame curve: `eval "__mp.samples('<selector>', 'opacity,transform')"`. `out()` never consumes a recording; `load` is one per document.
6. **Record a short video** of each key interaction (`agent-browser record start <file>.webm`, page still, one trigger, then `record stop`) for the human reviewer and for the §5b diff. The numbers are the spec; the video is how the user sees it. Recording needs `ffmpeg`; if it is missing, say so and don't claim a video.
7. **Long frames name their cause:** the table's `long frames` line lists each frame over 50 ms with the scripts that ran in it (Long Animation Frames API, Chrome 123+). Write "jank from <script>" instead of "it lags".

What the recorder knows and doesn't (measured on Fitlo, Cadra and Kerfa against their bundles):
- **Duration is *visible* duration.** For out-eases it reads 10–25% under the declared tween, because the tail moves less than half a pixel. Overshoot eases (`back.out`) match exactly. Copy the declared value from `scan()`; compare reference vs ours *both through the recorder*.
- **Ease is fitted** against the GSAP/CSS standard curves and is often one power step off the declared one, e.g. the Kerfa nav: fitted `power2.out`, declared `power3.out`. A trailing `?` means a poor fit. The `⇐` declared call wins.
- **Headless Chrome has no hover-capable pointer**, and sites switch their hover motion off on `(hover: none)`. The recorder forces `(hover: hover)` / `(pointer: fine)` on for `matchMedia` and for CSS `@media` rules; say so in the doc.
- **Ambient motion** (looping CSS, a background that never stops) is listed under `ambient`, not mixed into choreography.
- **Health is measured with the recorder running.** `probeCostMs` says how much frame time it took. For a recorder-free baseline: `$M <new session> perf <url>`, which gives a fixed 3 s window of frames, long tasks and CLS with sampling off.
  - Measured on Tavola: 61% slow frames with the recorder off, 80% on, so the jank was the site's.
  - Measured on Kerfa: 6% off, 2% on, which is noise.

  Compare `over34pct`, not raw counts, and say "headless, software GPU" next to fps numbers.
- **Flutter web draws to a canvas.** The recorder sees no elements there; for Flutter use video plus the code's own animation values.

Write it as a **motion inventory**, one row per element kind × trigger: `Element | Trigger | Props from→to | Declared duration / ease (scan) | Visible duration (rec) | Stagger | Notes`. Group it by page and by interaction class, plus a short "system" summary (enter/exit durations, ease families, stagger range, what overshoots). Also record the reference's **own** defects the health block shows; they are not to be copied:
- `flashBeforeEntrance`: painted visible after first paint, then hidden to start its entrance. Example: Tavola's header is static HTML that a deferred module hides about 130 ms later.
- `flashOrReplay`: reached its end state, dropped back, then animated again.
- `stuckHidden`: in view, has content, still invisible when motion settled. Closed tooltips and menus are excluded.
- Long frames, or a blur that holds the app at 12 fps.

Each flag is a lead, not a verdict: confirm it with `__mp.samples()` or the page source before writing it down. The flags were checked against a fixture with one planted defect of each kind plus a clean element; all three fired, and the clean element raised nothing.

## 4. Agents: parallel for read-only, ONE at a time for anything else

- Read-only passes can run 2–3 agents in parallel (`general-purpose`, `model: sonnet`). Split them by area, e.g. schedule and rules / settings, staff and online / patients, billing, reports and top bar. **Each creates its own tab and never touches another's.**
- **Save tests and the motion pass (§3b, including hover, drag and toasts): a single agent, with no other browser agent running.** Give each agent its own uniquely named browser session; two agents once shared a session name and one injected its probe into the other's page. Parallel agents navigated each other's tabs and contributed to a mid-run sign-out that left a setting changed.
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
  - When the ask includes look or motion: the §3b **motion inventory** is a section of this doc, with ours filled in per row (same / missing / different).
- `<app>-replica-status.md`: a manager one-pager with done / in review / not started (from issues and MRs), the answer to the headline question (e.g. a double-booking comparison table), the decisions, and how to refresh it.
- Post the exact option lists as comments on the issues that own them (`glab issue note N -R <group/project>`; without `-R` it fails silently outside the repo). Afterwards, check that the comments were posted.
- Add a memory pointer to the status page so later questions get answered from it.

## 5b. When our copy is built: verify it against the inventory, row by row

Whoever builds the copy gets the motion inventory as its **acceptance list**, not a summary paragraph. Before anyone calls the copy done, run the same recorder and the same `motion-pass.sh` calls on our build:
- **Every inventory row passes.** Same props, same ease family, visible duration within ±20% of the reference's *visible* duration, same stagger order and a gap within ±20%. A row with nothing recorded on our side is **missing**, not "close enough".
- **Health:**
  - `flashBeforeEntrance`, `flashOrReplay` and `stuckHidden` are empty: content shown before its entrance, an entrance re-running on re-render, content that never appears. Fix the first by pre-hiding in CSS (or creating the element hidden) before first paint.
  - `over34` and `longTasks` are no worse than the reference's under the same probe.
  - `cls` is 0 for entrances.
- **Content actually arrives:** after each page's data loads, no spinner or skeleton is still visible at 3 s, and the main list has rows.
- **Render counts:** React via `agent-browser react renders start/stop` around a route change and an interaction. A component committing more than twice for one action is a finding. On Vue, check that each entrance tween is created in `onMounted` inside a `gsap.context()` and reverted in `onUnmounted`. Without that, a re-render replays or stacks animations, and `flashOrReplay` catches it at runtime.
- **Same interaction, side by side, frame by frame:** record the reference interaction twice and ours once, then run `motion-diff.sh ref-1.webm ref-2.webm` to get the noise floor, and `motion-diff.sh ref-1.webm ours.webm` for the real comparison.
  - Each clip is aligned on its own first moving frame.
  - It writes an SSIM curve and `side-by-side.png`, a contact sheet of reference | ours every 66 ms from the first movement. Attach that sheet to the MR; it is what the reviewer looks at.
  - Read the dip against the noise floor. Measured on Kerfa's theme switch: two reference recordings bottomed at 0.84 SSIM (2 frames under 0.90). A copy with no transition bottomed at 0.66 (7 frames under 0.90, all within the 450 ms reveal), and the sheet shows the circle reveal against an instant snap.
  - SSIM compares pixels, so different content lowers it everywhere; look at where it dips.
  - It works for Flutter too: record the Flutter web build or a device screen the same way.
- **Report it as a table:** reference | ours | pass/fail per row, plus the health block for both. The contact sheet (and the video pair) goes in the MR.

## 6. Report to the user

- The answer to the question they actually asked (e.g. how double booking works), in a table.
- What we built differently, and which side is better.
- What is missing, ranked by value, with the issue for each.
- What is still unverified, and why.
- Next steps, split into "doing unless you say no" and "needs your yes" (commits, pushes, MRs, issue changes, save tests).
- If the build comes next and the context is large: recommend `/clear`, then `/lead` with the status page. No handover is needed, because the docs and issues hold it all.
