---
name: persona-walkthrough
description: "Test whether a real person who knows NOTHING about the app can actually use it. Launches the app on an emulator and drives it through blind persona subagents — a first-time customer, a hesitant artist/provider, a studio owner, a new admin — each with a different knowledge level, language, patience and intent, who see only the screen (never the code) and think aloud. Also judges how the app FEELS and LOOKS to a lay person (first-glance reaction, clarity, trust, delight, frustration), with the reason behind every feeling. Judges first impression, comprehension of the value proposition, sign-up/login, browsing, pricing clarity, booking, paying, onboarding as a provider, back-office tasks, and error recovery, then reports where people get lost, stall or quit, with a code-verified cause and fix for each finding. Invoke with /persona-walkthrough [role|goal|all|diff|new-app] before a launch, after a design change, a new feature, or a new app, or when asked 'would a new user understand this', 'is it usable', 'will people accept it'. Reports findings; does not fix. Restraint-gated: only report confusion a persona actually hit on screen."
---

# /persona-walkthrough — be the person who has never seen your app

`qa-sweep` asks *does it work*. `ux-audit` asks *should it work for the person* by reading the design. This asks the blunter question by **being the person**: someone installs the app cold, with no onboarding call and no teammate beside them, and a goal in their head. Do they understand what it is? Can they get what they came for? How do they feel doing it? Where do they quit?

## The one rule that makes this work: personas are blind

You, the orchestrator, have read the code, the docs, the spec. You can no longer be naive, and anything you "pretend" to not know leaks through. So **never role-play the persona yourself.** Spawn each persona as a **fresh subagent** that is given only the persona, the goal in their own words (never the steps), the driver commands and a step budget. Its brief forbids reading the repo, docs, source, API, logs or DB. Its only senses are screenshots (Read the PNG) and `droid.sh texts` (what a screen reader hears). If the screen doesn't tell them what to do, that *is* the finding.

The orchestrator uses code knowledge **afterwards** (Triage), never before or during.

## Modes — pick by what changed

| Situation | Mode | Scope |
|---|---|---|
| Launch check, "is the whole thing usable?" | `all` | Every built role, full cast |
| One role or goal ("can artists sign up?") | `role` / `goal` | That role's cast only |
| A design change or a new feature | `diff` | Derive touched screens/flows from `git diff` + commit messages; cast personas whose *goals* cross them, **plus one persona on the adjacent main flow** for regressions. For a redesign, rerun the saved cast's first impression and compare feelings and scoreboard to the last report. |
| A brand-new app or role | `new-app` | From the repo learn only how to launch it and which roles exist, not how it should work. Cast from the role seeds, or write seeds from the role's purpose (who, what errand, what they already know). Mandatory goals: first open, sign-in, the role's main task. |

Platform: the driver is Android (`scripts/droid.sh`). For web apps use the same brief with a browser driver (`browse` / `claude-in-chrome`); the persona rules, checkpoints and report are unchanged. **The web path is untested** — treat the first run as a pilot.

**Memory between runs.** Save each run's cast, persona files and report under the project (`.claude/persona-walkthrough/<date>-<scope>.md`) so the next run reuses the same personas and can say better / worse / unchanged per finding.

## What each persona judges

1. **Comprehension** — what is this, who is it for, what does it cost me?
2. **Task success** — did I get what I came for, in how many actions, with which stalls?
3. **Feeling** — a word per beat in the persona's own voice, the exact **trigger** on screen, and the **why**: what in their background, habits or expectations made it land that way. The why separates universal problems from ones that only bite one kind of user. A flow that "works" but leaves people suspicious or anxious is a finding.
4. **Design as a lay person sees it** — 5-second first-glance reaction; professional / trustworthy / for someone like me; can I tell what's tappable; readable for *this* person (age, large font, dark mode); what do I look at first; anything unfinished or test-like; does Arabic/RTL feel native. They describe what they see and feel, never jargon or pixels. Precise token/spacing checks stay with `ui-audit` / `design-drift`; a persona's "that grey text is too faint for me" is evidence you can hand to `ui-polish`.

## Procedure

### 1. Orient (orchestrator)
Read just enough to learn the app's **roles**, how to **launch** it (build, package, env, backend), **test credentials** for roles needing an existing account, and which roles/screens are **not built yet** (list them under "Not tested"; don't invent roles from a spec). Sources: `STATUS.md`, `README`, `CLAUDE.md`.

### 2. Bring up and prove the environment
- **Dev/local data only.** Personas create real rows. If the target isn't clearly local/dev, ask first. Keep a list of what the run created.
- **Backend.** If the working tree has someone's uncommitted or broken work, serve a clean `HEAD` worktree. Copy `vendor/` in (`cp -cR`) and run `composer dump-autoload`: a *symlinked* vendor makes the autoloader load the WIP app code against HEAD's config and personas hit phantom 500s (a stack trace's file paths give it away). Flush the cache between runs, since throttles carry over ("Too Many Attempts" after two taps is usually the last crash's retries).
- **Device.** Emulator booted, current build installed, `adb devices` shows it. Run personas sequentially on one device, or in parallel on several emulators (`SERIAL=emulator-5556`); extra instances of one AVD refuse to start unless **every** instance, including the first, was launched `-read-only`. Give each persona its own `OUT` dir.
- **Preflight (≈2 min, before any persona).** `curl` the config/health endpoint from the address the device uses and require **200** (an open port can still answer 500), then drive the app yourself to the first data-bearing screen and confirm real content loads. A persona that hits a broken environment is wasted and its "can't use it" is noise. If a persona's first screens are an error screen, check the environment before calling it a product finding; the error screen's *design* (no way out, Back quits the app) still is one.
- **The persona's phone world.** Give them what real people have, or they stall on things real users never face:
  - **SMS/OTP:** write a scratchpad `sms-inbox.sh <phone>` that prints the latest code for a number (from the dev log/test driver). The persona opens it as "my Messages app"; it never reads the log itself.
  - **Device context** via adb, per persona, undone in Teardown: large text `settings put system font_scale 1.5`, dark mode `cmd uimode night yes`, language, airplane mode/throttled network.

### 3. Seed preconditions
A persona can only attempt what the data allows: an admin told to "approve new artists" finds nothing if none is pending; a returning customer has nothing to cancel without a booking. For each goal check the dev DB and create what it needs through the app's own API or seeder (never hand-edit rows if an API exists), or sequence personas so an earlier one creates it (new artist signs up → admin persona approves). If a precondition can't be created because an earlier step is broken, say so; and if you work around it (e.g. seed a name so a sign-up crash is bypassed) record the workaround in the report. Never let "nothing to do" pass as "the tool is easy".

### 4. Choose the cast
Per role, **at least three personas that differ on the axes in `references/personas.md`**, always including one *skimmer* (reads nothing, taps the biggest button) and one *Arabic-first / non-native reader*. Different approaches to the same goal — explorer, goal-directed, hesitant — is how "test multiple times" works. Write each persona as a file (`references/personas.md` has the format). Scope to what the user asked and **state the persona count before launching** so they can trim it.

### 5. Run
Generate each brief with `python3 scripts/brief.py persona.md` (never hand-write briefs: they drift) and spawn one `general-purpose` subagent per persona, in the background when parallel. `reset` the app first so each starts from a fresh install; a returning-user persona gets credentials as "a friend gave you this login", never as instructions. **Budgets:** ~40 actions for a customer errand, 60–80 for artist/admin sessions; hitting the budget counts as giving up and is a finding.

### 6. Triage (orchestrator, now with code knowledge)
- **Verify every claim against the code or API before it goes in the report.** Personas misperceive specifics (a "six-day strip" was five; a "dropped digit" is a tool artefact) and they guess causes. Find the real `file:line` and root cause; if you can't confirm, say "not confirmed".
- **Merge duplicates.** A friction point hit by 2+ different personas is a *pattern*; one hit by every persona is a blocker however small it looks.
- **Classify:** `bug` · `unclear` (works, but people don't understand it) · `missing` · `trust` (hesitated to give a number, pay, upload) · `language` (untranslated, RTL, tone) · `data` (dev/test content visible to users) · `persona-error` (ignored plainly visible text; discard unless the skimmer is representative, then it's `unclear`) · `env` (not the product).
- **Check the premise.** Did a persona succeed *only because* dev papered over a gap (seeded data, OTP readable in a log)? Say so.
- **Attach a fix to each finding** (the minimal change and where). A report of problems without next steps gets shelved.

### 7. Teardown
Restore what you changed: `font_scale 1.0`, `cmd uimode night no`, airplane mode off; stop servers and emulators you started; remove the HEAD worktree; list every DB row the run created or changed (offer to restore). Do not leave the dev environment quietly altered.

### 8. Report

```
## persona-walkthrough: <scope> — <build/env>

**Cast** — N personas: <role · name · traits>
**Scoreboard** — | persona | role | outcome | actions used/budget | friction events | first-glance (1 word) | dominant feeling |
**Verdict by role** — Customer: x/y reached goal · Artist: … · Studio: … · Admin: …
**Feelings** — arc per persona with trigger and why; mark which are universal and which come from one persona's background
**Design impression** — first glance, trust, readability, what felt unfinished, RTL feel
**Would they accept it?** — one honest paragraph

### Blockers / Major / Minor
<ID> <title> — hit by <personas> · felt <word>, because <why> · cause <file:line> · fix <change>
### What worked  (keep these)
### Not tested / not in this build   (and workarounds used)
### Environment notes, data left behind
```

Severity by the person's outcome: **Blocker** = gave up or couldn't finish the core goal · **Major** = finished only after a long stall or wrong turn, or lost trust · **Minor** = hesitated, recovered. Evidence is the persona's own words plus the screenshot path. In `diff` mode compare the scoreboard and finding list to the previous report and say better / worse / unchanged.

When the user wants trackable work, turn blockers into issues (one per blocker: persona evidence, cause, fix, acceptance check) with the project's tracker CLI. Creating issues is an outward action: only when asked.

## Restraint

- A persona who sailed through is a result. "Three customers booked in 12 actions with no confusion" is a valid report — don't hunt after they stop finding problems.
- Pixel-level taste is `ui-audit`'s. Do report design that cost understanding, progress or trust, or that made someone feel something strongly (good or bad).
- Don't fix anything. Hand blockers to `root-cause` or a fix branch.
- Dev artefacts (debug banner, seeded OTP in logs, LAN slowness, test data you can clean) go under `env`/`data`, not product findings — except test data customers can *see*, which really does cost trust.

## Known limits — read before trusting a verdict

- **Personas are models, not people.** They read screenshots flawlessly, don't get distracted and are more articulate than real users, so they under-report some failures (tiny tap targets, slow comprehension) and can over-report others. Treat this as a cheap, repeatable first pass that finds the obvious problems; it **does not replace** watching 5 real people use the app before a launch.
- `adb input text` types ASCII only (and drops a character now and then). Test Arabic through the app's own switch and RTL layout, not by typing Arabic.
- Push notifications, payment-gateway web views and deep links need the real device flow; out of scope unless asked.
- The web driver path is untested; studio/team roles are only as good as the role seeds.
