---
name: design
description: Art direction for an app's visual identity — judge whether the palette, type, surfaces, imagery and density are actually nice, say plainly when they are not and why (with measured contrast and hue numbers), then propose 2–3 complete directions SHOWN on the app's real screens (phone + desktop, light + dark, en + ar) and write the chosen one into the app's theme tokens and a DESIGN.md. Use on your own, without being asked, whenever the user says an app or screen looks bad, generic, cheap, dull, dated, "not nice", "like a template" or "like every AI app", dislikes its colours or theme, or asks for a better palette, a rebrand, a new look or a colour template; and whenever `ui-polish` build mode finds the app has no deliberate identity (no theme tokens beyond framework defaults, no DESIGN.md). Also on /design, and when starting a new product that needs a look. Not for one screen's spacing or states (ui-polish), motion (animate), or whether an existing system is being followed (design-drift). Restraint-gated — "the identity is good, keep it" is a valid verdict.
---

# Design — art direction

An agent can build a well-proportioned, well-animated screen and still ship an app nobody
finds attractive, because nobody judged the **identity**: which colours, which type, what the
surfaces are made of, what the app looks like at a glance from across the room. This skill is
that judgement. It has opinions, backs them with measurements, and proves them with screenshots.

| Question | Skill |
| --- | --- |
| Is this app's look any good? What should it look like instead? | **`design`** (this) |
| This screen is unbalanced / foreign / unfinished | `ui-polish` |
| How should it move? | `animate` |
| We have a system — is the code following it? | `design-drift` |

## Taste anchors — whose taste

Not generic taste, and not the CSV stock. Judge and propose against these, in this order:

1. **The app's own `DESIGN.md`**, if a previous run wrote one. It is the standing decision;
   critique drift from it rather than re-litigating it, unless the user is unhappy with it.
2. **The user's reference sites** — `../animate/reference/reference-sites.local.md` (gitignored;
   if missing, ask the user for 3–4 sites or apps they love and tear them down with `app-teardown`).
   What they share: warm paper or near-monochrome surfaces; colour reserved for data and for the
   consequence of an action; pastel accent gradients carrying dark same-hue text; one variable
   sans doing all the hierarchy by weight; soft long negative-spread shadows instead of borders;
   in dark mode a warm or deep-blue glass, never flat grey-black.
3. **The house style** — `../ui-polish/reference/house-style.md` (Glass rules, Proportions,
   Accent variants) and `../ui-polish/reference/color-and-contrast.md`.
4. **Category fit** — `data/*.csv`, as a sanity check only (see Data).

When an anchor and a CSV row disagree, the anchor wins and you say so.

## Pick the mode

- User unhappy with the look, or you were sent here by `ui-polish` → **Critique**, then
  **Direction** if the verdict is not "keep it".
- New product, nothing built → **Direction** (render on the first real screen or a faithful
  static mock of it; there is nothing to critique).
- User has picked a direction → **Apply**.

Never jump to Apply without a pick. Never hand over Direction as prose.

## 1. Critique — is it nice, and if not, why

Full checklist with thresholds: [reference/critique-checklist.md](reference/critique-checklist.md).

1. **Read the identity as declared.** Theme file, design tokens, font loading, icon set, logo
   assets, any `DESIGN.md`. List every colour the theme declares, light and dark.
2. **Capture it yourself.** Run the app and screenshot 3–5 representative screens (the landing
   or home screen, one list, one detail, one form, one overlay) at phone and desktop width, light
   and dark, en and ar. Web: the `browse` skill or the repo's Playwright. Flutter: the app's own
   driver, emulator screencap, or a web build. Do not critique from code alone — a palette is
   only ugly or fine on a screen. If the app cannot run, say so and mark the critique provisional.
3. **Measure.** `scripts/palette.py hues <every declared colour>` for hue families, chroma and
   lightness; `scripts/palette.py contrast fg:bg …` for every text-on-surface pair that appears
   in the screenshots, in both themes. Sample colours from the screenshot where alpha or
   gradients make the declared value a lie.
4. **Judge eight dimensions** — palette, contrast, dark mode, typography, surfaces and depth,
   imagery and iconography, logo and brand mark, density. Each gets `good` / `weak` / `not nice`
   with evidence: a number, a screenshot crop, a `file:line`.
5. **Say it plainly.** Lead with one sentence a non-designer would agree with on sight:
   "This reads as a default dark dashboard: the purple accent sits 27° from the navy ground, so
   nothing stands out, and four more saturated hues compete with it in the stat row." Then the
   table. No hedging, no "could be improved". If it is good, say "this is good, keep it" and
   name the two or three things that make it good — do not manufacture findings.
6. **Separate identity from execution.** Findings that are one screen's problem go to
   `ui-polish`; findings that tokens exist but are ignored go to `design-drift`. Only identity
   findings feed Direction.

Output: the one-sentence verdict, the eight-row table, the screenshots it is based on, and
either "keep it" or "worth redirecting — directions next".

## 2. Direction — show 2–3, recommend one

Full recipe, token mapping and capture mechanics: [reference/direction-recipe.md](reference/direction-recipe.md).

1. **Fix what must not change.** The brand mark and brand colour stay unless the user agrees to
   change them. If the critique found the brand colour itself is the problem (fails contrast as
   text, collides with a status hue, sits in the ground's hue family), say so explicitly and make
   exactly one direction the "brand colour changes" option, labelled as such. The others keep it
   and solve the problem around it (demote it to fills, change the ground, give it a text tone).
2. **Write 2–3 directions that differ in kind**, not in hue. Different ground (warm paper vs
   cool mono vs deep glass), different accent strategy (one accent vs data-only colour vs pastel
   tiles), different surface recipe. Two directions that differ only in accent hex are one
   direction. Each is complete: palette light + dark as tokens, type, surface recipe, accent
   strategy, imagery rules, one signature detail. Each names the anchor it comes from.
3. **Check category fit.** Read the product's rows in `data/ui-reasoning.csv` and
   `data/colors.csv`. Use them to catch a mismatch (a playful pastel on a compliance tool), not to
   pick the palette.
4. **Measure before rendering.** Every text/surface pair in every direction clears 4.5:1 in both
   themes; status hues are 30°+ from the accent and from each other. A direction that fails is
   fixed or dropped before the user sees it.
5. **Render each direction on the real app.** Throwaway worktree or branch per direction, or a
   runtime token override — never the user's working tree. Same 1–2 screens, same data, same
   state for every direction and for `current`. Capture phone + desktop × light + dark × en + ar
   into `<shots>/<direction>/<screen>__<viewport>__<theme>__<locale>.png`.
6. **Look at your own renders** and fix what you see (an unreadable chip, a logo that vanished on
   the new ground, Arabic falling back to a system font) before presenting. A direction is judged
   on its worst frame.
7. **Build the compare page:** `scripts/compare.py <shots>` → `<shots>/index.html`, `current`
   first, one row per screen/state. It is a local file — give the user its absolute path. Do not
   publish or host it; the app's screens are private.
8. **Recommend one**, `best-option` style: your pick first marked "(Recommended)", one paragraph
   on why it fits this product and these anchors, then one line per other direction on why it
   loses. State what each costs to apply (token swap only / fonts to self-host / new imagery).

Then stop and wait for the pick. Leave the worktrees in place until Apply or until the user declines.

## 3. Apply — make it the app's identity

1. **Claim and branch** per the repo's workflow; the throwaway direction branch is not the
   delivery branch unless it is clean.
2. **Tokens, not pages.** Write the direction into the theme layer only:
   Vue/Vuetify — the Vuetify theme (light + dark), the design-token stylesheet (alpha fills,
   rims, shadows, radii, per-theme status text tones), component defaults, self-hosted fonts.
   Flutter — raw `Tokens`, the semantic `ThemeExtension` per theme, `ThemeData`, bundled fonts.
   Pages that hard-code hex will not follow; list them and hand that to `design-drift` rather
   than hand-editing screens here.
3. **Write `DESIGN.md` at the app repo root** from
   [reference/design-md-template.md](reference/design-md-template.md): palette with roles and
   measured contrast, type, surfaces, accent strategy, imagery, the signature detail, a pointer to
   animate's `reference/motion-system.md` for motion, and a short do / don't. One page. It is the
   file every later agent reads before touching UI in that app.
4. **Record the pointer** in `../ui-polish/reference/app-identities.local.md` (gitignored; create
   it if missing): app, repo path, `DESIGN.md` path, direction name, date. App names and paths
   go there and nowhere tracked.
5. **Re-capture** the same shots on the delivery branch and compare against the chosen
   direction's renders; they must match. Then the normal chain: `ui-audit` contrast pass,
   `break-ui` on data-heavy components, before/after screenshots in the MR.
6. **Look picker option.** Instead of one look, Apply may ship several directions as
   user-selectable themes ("Look" in Settings, default = current). Mechanism: a theme registry
   (look id -> light + dark tokens, font stack), tokens per look in the theme layer, the active
   look applied at the theme root, and the choice persisted like the other preferences
   (locale / dark mode). Same rules: tokens and kit only.
7. **Clean up** the throwaway worktrees and branches.

## Data — an input, not the method

`data/` holds generic industry stock. Read it for category fit and vocabulary; never paste a row
as the answer. Rows that recommend Inter/Roboto, a purple-to-blue gradient, a second accent, or a
font pairing with no Arabic companion are exactly the generic look this skill exists to replace.

- `colors.csv` — per product type: primary, secondary, CTA, background, text, border
- `ui-reasoning.csv` — per product type: style, colour mood, type mood, anti-patterns, severity
- `typography.csv` — pairings with mood and use cases
- `styles.csv` — named styles with implementation and do / don't
- `landing.csv`, `ux-guidelines.csv`, `charts.csv` — layout, UX and chart stock for adjacent questions

## Rules

- **Evidence or silence.** Every "not nice" carries a number, a crop or a `file:line`.
- **Shown, not described.** No direction reaches the user without real screenshots.
- **Both themes, both locales, both widths** — in critique and in every direction. A palette that
  works in light and turns to mud in dark is half a palette; a typeface with no Arabic companion
  is half a typeface.
- **Brand is the user's.** Never change the mark or brand colour without a yes.
- **One accent.** Status hues carry meaning only. If a direction needs a second accent to work,
  it does not work.
- **Tokens and the kit, not screens.** This skill changes tokens, `DESIGN.md`, and kit-level
  CSS/component defaults when a signature detail needs them, scoped to the direction. No
  per-screen layout or markup edits; screens follow through the kit.
- **Budget the cost.** Web runtime override: minutes per direction. Flutter worktree + headless
  capture: about 60 s per direction per run plus setup (fonts, mock backend). Plan three
  directions plus `current` accordingly.
- **No app names, paths or hosts in tracked files** of this repo — they go in `*.local.md`.
