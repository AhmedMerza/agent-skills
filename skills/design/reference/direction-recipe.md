# Direction recipe

A direction is a complete, applicable identity — not a mood word and not a hex swap. Write 2–3
that differ in kind, measure them, render them on the real app, and recommend one.

## What one direction contains

| Part | Content |
| --- | --- |
| Name + one line | "Warm paper — quiet cream surfaces, colour only on money and status" |
| Anchor | which reference site / house-style variant it descends from, and what it borrows |
| Palette, light + dark | tokens below, as hex, each with its measured contrast |
| Type | Latin family + Arabic companion, weights used, title size, numerals |
| Surface recipe | how a card is drawn: fill, ring, shadow, radius; what overlays and bars do |
| Accent strategy | where the accent may appear, where it may not, how status is shown |
| Imagery rules | icon set and stroke, photo ratio and treatment, empty-state style |
| Signature detail | the one thing that makes it recognisably this app (see below) |
| Cost | token swap only / fonts to add / imagery to produce / screens that will not follow |

### Palette tokens (both themes)

`ground`, `surface`, `surface-raised`, `well`, `line` (ring), `ink`, `ink-muted`, `accent`,
`accent-text` (contrast-fixed, for small text and links), `on-accent`, and per status
(`success`, `warning`, `danger`, `info`): `fill` (bright, for dots and bars), `tint` (13–17% of
the hue on the surface), `text` (dark same-hue on light, light same-hue on dark). Add `shadow`
and `shadow-pop` as full values, tinted to the ground's hue.

Build it in OKLCH, bake to hex:
- Ground and neutrals: one hue, C 0.005–0.02. Warm paper ≈ h 70–95; cool mono ≈ h 240–260.
- Dark ground: L 12–18%, C 0.01–0.04 — warm near-black or deep blue. Surfaces step up ≥ 4% L.
- Accent: one. If the brand colour is kept, derive `accent-text` by moving L until it clears
  4.5:1 on `surface` in each theme, hue and chroma held.
- Status hues ≥ 30° from the accent and from each other; if the brand sits on a status hue,
  shift the status (danger toward coral or crimson, success toward lime or teal), not the brand.
- Run `scripts/palette.py hues` on the whole set — expect 1 accent family + the status families,
  neutrals reported as neutral — and `contrast` on every pair in the critique's contrast list.

### Signature detail

One, small, repeatable, cheap: pastel gradient tiles with dark same-hue figures; a status stamp;
a travelling nav pill; a ruled paper texture on the ground; figures set in a distinct numeric
style; a single oversized page title. It must come from the product (what it counts, sells or
tracks), not from a trend. If it needs a new dependency or a new asset pipeline, pick another.

## Making directions differ in kind

Vary at least two of these axes between any two directions:

| Axis | Options |
| --- | --- |
| Ground | warm paper · cool near-mono · tinted pastel · deep glass (dark-first) |
| Where colour lives | one accent on actions · colour only on data, primary is ink/black · pastel category tiles |
| Surface | ring + long shadow · glass over one backdrop · flat with hairlines |
| Brand colour's job | the accent · demoted to fills and the mark only · changed (needs a yes) |
| Dark mode | warm near-black glass · deep-blue glass · solid stepped surfaces |

A useful trio for an app whose look is "generic dark dashboard": (A) keep brand, change the
ground — paper light theme first-class, warm dark; (B) keep brand hue but demote it — mono UI,
colour only on data; (C) brand colour changes — labelled as such, shown so the user can judge
the trade honestly. If the critique did not implicate the brand colour, replace (C) with another
kind, not another hue.

Category fit: read the product's rows in `data/ui-reasoning.csv` (anti-patterns, severity) and
`data/colors.csv`. They tell you what the category's users expect (trust, calm, appetite, speed)
and what would alarm them. Note in each direction how it meets that expectation by other means
than the stock palette.

## Rendering on the real app

Pick 1–2 screens: the one users see most, plus one that stresses the palette (status-heavy list,
or a form with an overlay). Use the same seeded data and state for every column.

**Never render in the user's working tree.** Options, cheapest first:

1. **Runtime token override (web).** Vuetify exposes theme colours as `--v-theme-<name>` RGB
   triplets on `.v-theme--light` / `.v-theme--dark`, and the app's own tokens are CSS custom
   properties. With the app running from an untouched checkout, inject one stylesheet per
   direction through Playwright (`page.addStyleTag`) that redefines those variables, the font
   stack and the card recipe, then screenshot. No rebuild, minutes per direction. Good enough when
   the direction is expressible in variables; if pages hard-code hex, note which parts did not
   follow — that is real information about the cost.
2. **Worktree per direction (web or Flutter).** `git worktree add <scratch>/dir-a -b design/dir-a`,
   edit only the theme layer (Vuetify theme + token stylesheet + defaults; or Flutter `Tokens`,
   `ThemeExtension`s, `ThemeData`, fonts), run that copy, capture. Needed for Flutter, for font
   changes that must be bundled, and when the override cannot reach a component.
3. **Static mock** only when nothing runs (new product): one HTML file per direction reproducing
   the real first screen with real copy. Say it is a mock.

Capture matrix per direction and for `current`:

| | values |
| --- | --- |
| viewport | `phone` 390×844 · `tablet` 834×1112 · `desktop` 1440×900 — pick the ones the app targets, and say which cells are not applicable instead of leaving silent gaps |
| theme | `light` · `dark` |
| locale | `en` · `ar` (RTL) — **or `en` only if the app has no Arabic/RTL: skip `ar`, and say so in the verdict** |

Shots saved as `<shots>/<direction>/<screen>__<viewport>__<theme>__<locale>.png`, with
`<direction>` = `current`, `a-<name>`, `b-<name>`, `c-<name>`.

**Capture rule.** Desktop and tablet: full page. Phone: the first two screens' worth of height
only (about 390×1700 at most) — never a sliver frame cut mid-row, never a 6-screen scroll.
Web: `browse` or the repo's Playwright with `viewport`, theme toggle and locale switch.
Flutter: see below. Switch theme and locale through the app's own settings so the real code
path renders.

### Flutter capture recipe (headless, no emulator)

Cost: about 60 s per direction (all cells in one `flutter test` run).

- A `flutter test` that pumps the real app against the repo's existing mock backend / fake
  repositories, wrapped in a `RepaintBoundary`, and writes PNGs via `toImage` (run with
  `tester.runAsync`).
- Settle with timed pumps (`pump(Duration(milliseconds: 100))` a few times, then 500 ms), not
  `pumpAndSettle` — looping animations never settle. Wait out entrance animations before capture.
- The test renderer draws placeholder boxes for text unless fonts are loaded: `FontLoader` the
  bundled families from the asset bundle (Latin and the direction's font). For Arabic add a
  **test-only** fallback font (e.g. IBM Plex Sans Arabic under `test/`, not in `pubspec.yaml`),
  otherwise Arabic renders as tofu and every `ar` frame is invalid.
- Direction switch at compile time: `--dart-define=DIRECTION=a` read via `String.fromEnvironment`
  in the theme layer (in the throwaway worktree). Theme, locale and viewport (`tester.view`
  physical size and device pixel ratio) are set per cell in the test.
- The test harness resets the view size between tests: set `tester.view.physicalSize` and
  `devicePixelRatio` inside every test and reset them in `tearDown`.
- The first `RepaintBoundary` capture can miss backdrop layers. Capture from a boundary wrapping
  the whole app including the backdrop, after a pump that lets the backdrop image load.
- Shadows under translucent glass show through it: put shadows only on opaque surfaces, or clip
  them under the glass.

### Web override recipe

Inject one stylesheet per direction (`page.addStyleTag`). Vuetify scopes theme variables on the
**doubled** selector, so redefine tokens on `.v-theme--light.v-theme--light` and
`.v-theme--dark.v-theme--dark` (or the single-class rule loses on specificity), plus the app's
own custom properties. Load the direction's font (`@font-face` or a font `<link>`) in the same
injection and wait for `document.fonts.ready` before the screenshot — otherwise the frame shows
the fallback.

Put `<shots>` in the session scratch directory or a gitignored folder of the app repo.

## Before presenting

Open every frame. After **any** render fix (raising a surface, lifting a ground, swapping a
font), **re-measure contrast** on the affected pairs — raising surfaces silently broke
placeholder contrast in a trial. Fix or drop a direction whose worst frame shows: text under 4.5:1; the logo
lost on the new ground; Arabic in a fallback font; a status chip indistinguishable from the
accent; dark cards merging with the ground; a hard-coded colour punching through. Wait for
entrance animations to settle before capturing — a half-faded frame is not evidence.

`scripts/compare.py <shots>` writes `<shots>/index.html` (rows = screen/state, columns = current
and each direction). Local file only.

## Presenting

```
Critique in one line: <verdict>

A — <name> (Recommended)   <one line>   keeps brand colour: yes   cost: tokens + 1 font
B — <name>                 <one line>   keeps brand colour: yes   cost: tokens
C — <name>                 <one line>   CHANGES brand colour      cost: tokens + logo variant

Compare page: <absolute path>/index.html

Why A: <one paragraph — product, anchors, measured result>
Why not B: <one line>
Why not C: <one line>
```

Then the per-direction token tables. Ask for a pick; mixing ("A with B's dark mode") is a valid
answer — re-render the mix before applying it.
