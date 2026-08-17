---
name: ui-audit
description: Run technical UI quality checks across accessibility, performance, theming, responsive design, interaction states, and anti-patterns. Generates a scored report with severity ratings and actionable fixes. Covers Vue 3 + Vuetify + Inertia.js and Flutter.
---

# UI Audit

Run systematic **technical** quality checks on frontend code and generate a comprehensive report. Don't fix issues — document them for the developer to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation.

## How to Use

Invoke with an optional target: `/ui-audit [page, component, or feature]`

Without a target, audit the most recently changed frontend files.

**Detect the stack first.** Each dimension below lists checks for Vue 3 / Vuetify and for
Flutter. Run only the set that matches — reporting a missing `:focus-visible` on a Dart file
wastes the reader's attention and discredits the findings next to it. The *dimensions* and
scoring are identical either way; only the mechanics differ.

## Scope — one page, not the repo

This audits a **target**: a page, component, or feature. If the question is whether the design
*system* is adopted across the whole codebase — token ratios, a type scale that was never
built, two competing button kits — that's `design-drift`, which reads the whole tree. A
per-page audit is structurally blind to duplication and absence.

## Diagnostic Scan

Run checks across 7 dimensions. Score each **0-4** (0=critical failures, 4=excellent).

### 1. Accessibility (A11y)

Vuetify handles baseline a11y (ARIA roles on components, keyboard nav on `v-tabs`/`v-menu`/`v-dialog`). Focus on what Vuetify does NOT handle:

**Check for:**
- **Contrast on custom elements**: Text/icons outside Vuetify components — do they meet 4.5:1 (body) / 3:1 (large text, UI components)?
- **Missing labels**: Custom inputs without `<label>`, icon-only `v-btn` without `aria-label`
- **Images without alt**: `<img>` tags or `v-img` without meaningful `alt` (decorative images should have `alt=""`)
- **Heading hierarchy**: Skipped heading levels (`h1` → `h3`), or no `h1` on the page
- **Color-only indicators**: Status shown only by color (needs icon or text too)
- **Focus management**: After route change or dialog close, is focus returned properly? Custom interactive elements without `:focus-visible` styles?
- **Touch targets**: Custom clickable elements < 44x44px (Vuetify buttons handle this; check custom elements)

**Flutter — check for:**
- **Missing `Semantics`**: Custom tappable widgets (`GestureDetector`, bare `InkWell`) with no
  `Semantics(label:, button: true)`. Unlike HTML there is no implicit role — a tappable
  `Container` is invisible to TalkBack/VoiceOver unless you say otherwise.
- **Icon-only buttons without `tooltip:`** — on `IconButton` the tooltip doubles as the
  semantic label, so omitting it costs both affordance and accessibility.
- **Decorative widgets not excluded**: images/icons that repeat adjacent text should be wrapped
  in `ExcludeSemantics`, and compound rows merged with `MergeSemantics` so they read as one node.
- **Contrast on custom surfaces** — same WCAG thresholds, no devtools; compute from the token
  values rather than eyeballing a screenshot.
- **Text scaling ignored**: hardcoded `height`/`width` on text containers that clip under
  `MediaQuery.textScalerOf(context)`. OS font scaling on mobile is far more aggressive than
  browser zoom, and this is the most common real a11y break in a Flutter app.
- **Colour-only status** — same rule; a coloured dot needs an icon, label, or shape too.
- **Touch targets** < 48dp: check `minimumSize` / `MaterialTapTargetSize` on custom buttons.

**Score**: 0=Inaccessible (fails WCAG A), 1=Major gaps, 2=Partial (some effort, significant gaps), 3=Good (WCAG AA mostly met), 4=Excellent (WCAG AA fully met)

### 2. Animation & Motion

Consult the **`animate`** skill for principles — its [decision map](../animate/reference/decision-map.md) holds the laws (frequency budget, tone rule, enter-slow-exit-fast, reduced-motion) and its [web recipes](../animate/reference/web.md) hold the fixes. `ui-polish` no longer carries motion guidance.

To check the items below **mechanically** rather than by reading code, run the animate skill's harness against the page — it reports layout-triggering properties, missing reduced-motion cues, and non-interruptible motion directly:

```bash
node ~/.claude/skills/animate/scripts/verify-motion.mjs --url <page> --selector <css> --trigger <css> --pw <playwright dir>
```

**Check for:**
- **`transition: all`**: Must specify exact properties (`transition: transform 200ms ease-out`)
- **Animating layout properties**: `width`, `height`, `padding`, `margin`, `top`, `left` instead of `transform`/`opacity`
- **Durations > 300ms** on UI feedback (buttons, menus, tooltips)
- **Missing `prefers-reduced-motion`**: Any animation without a reduced-motion alternative
- **`ease-in` on entering elements**: Should be `ease-out` (ease-in feels sluggish)
- **`scale(0)` entry animations**: Should start from `scale(0.95)` with `opacity: 0`
- **Hover animations without `@media (hover: hover)`**: Touch devices trigger hover on tap
- **Keyframes on rapidly-triggered elements**: Should use CSS transitions for interruptibility
- **Vuetify default transitions left unmodified** where polish matters

**Flutter — check for:** (recipes live in the animate skill's [flutter reference](../animate/reference/flutter.md).
The `verify-motion.mjs` harness above is Playwright-based and does **not** apply here — check by reading.)
- **`AnimationController` not disposed** in `dispose()` — a leak, and the most common Flutter motion bug.
- **`Curves.easeIn` on entering elements** — should be `easeOut`/`easeOutCubic`; same law as web.
- **Reduced motion ignored**: no check of `MediaQuery.disableAnimationsOf(context)`.
- **Implicit where explicit is needed** (or the reverse): `AnimatedContainer` for a one-shot
  entrance is fine; for interruptible, gesture-driven motion you need a controller.
- **Animating layout**: rebuilding a subtree every frame instead of using `AnimatedBuilder`'s
  `child` parameter to hoist the static part out of the animation.
- **Durations > 300ms** on UI feedback — identical budget.
- **`Opacity` in an animation** — prefer `FadeTransition`/`AnimatedOpacity`; the plain widget
  forces a `saveLayer` every frame.

**Score**: 0=Broken/janky animations, 1=Major issues (layout property animations, no reduced motion), 2=Partial, 3=Good (mostly correct, minor issues), 4=Excellent (polished, accessible, performant)

### 3. Theming & Design Tokens

**Check for:**
- **Hard-coded colors**: Hex/RGB/HSL values in templates or `<style>` instead of Vuetify theme variables or CSS custom properties
- **Hard-coded spacing**: Pixel values instead of Vuetify spacing utilities (`pa-4`, `ma-2`, `ga-3`)
- **Inconsistent elevation**: Mix of custom `box-shadow` and Vuetify `elevation-*`
- **Dark mode issues**: Elements that don't update on theme switch, poor contrast in dark mode
- **VTooltip contrast**: Missing `bg-surface text-on-surface` classes
- **Typography bypass**: Raw CSS font sizes instead of Vuetify's `text-h6`, `text-body-1`, etc.

**Flutter — check for:**
- **Hard-coded colours**: `Color(0xFF…)` / `Colors.blue` instead of the app's `ThemeExtension`
  or `Tokens` class. Discount `Colors.white`/`black`/`transparent` on overlays — those are
  usually legitimate, and flagging them buries the real findings.
- **Static const colour constants** that bypass the runtime theme entirely. Worse than a stray
  literal: they hardcode *one mode*, so the screen silently ignores light/dark and accent
  switching. Always state that consequence, not just the count.
- **Hard-coded spacing**: bare numbers in `EdgeInsets`/`SizedBox` instead of the spacing scale.
- **Typography bypass**: `TextStyle(fontSize: N)` instead of the app's type scale. If no scale
  exists at all, that's a `design-drift` finding, not a per-page one — say so and move on.
- **Ad-hoc `BoxShadow`** instead of token shadows; inconsistent light direction across cards.
- **Theme switch**: does every surface on this page actually change? Screens built on static
  constants look correct in the default mode and wrong in the other one.

**Score**: 0=No theming (hard-coded everything), 1=Minimal tokens, 2=Partial (tokens exist but inconsistent), 3=Good (tokens used, minor hard-coded values), 4=Excellent (full token system, dark mode works)

### 4. Responsive Design

Consult [responsive-design reference](../ui-polish/reference/responsive-design.md).

**Check for:**
- **Fixed widths**: Hard-coded `width` values that break on mobile
- **Missing responsive cols**: `v-col` without responsive breakpoint props (`cols="12" md="6"`)
- **Touch targets**: Interactive elements < 44x44px on mobile
- **Horizontal overflow**: Content that causes horizontal scroll on narrow viewports
- **Navigation**: Does the layout adapt? Is `v-navigation-drawer` set to `temporary` on mobile?
- **Tables**: `v-data-table` without mobile consideration
- **Hover-dependent functionality**: Features that only work with hover (breaks on touch)

**Flutter — check for:**
- **Keyboard overflow**: the classic `RenderFlex overflowed` when the soft keyboard opens.
  Look for a form column with no `SingleChildScrollView` / `resizeToAvoidBottomInset` handling.
  This is the single most common responsive defect in a Flutter form.
- **Missing `SafeArea`**: content under the notch, status bar, or home indicator.
- **Text scaling**: fixed-height containers around text that clip at large `textScaler` values.
- **Fixed pixel widths** that assume a phone; no `LayoutBuilder` / `MediaQuery.sizeOf` switch
  for tablet, when the app ships tablet layouts.
- **`MediaQuery.of(context).size`** where `MediaQuery.sizeOf(context)` would do — the former
  rebuilds on every metric change, including keyboard open.
- **Orientation**: no `OrientationBuilder` on screens that clearly need one.
- **Hover-only affordances** — on a touch build hover never fires, so anything hidden behind
  it is unreachable.

**Score**: 0=Desktop-only, 1=Major breakage on mobile, 2=Partial (mostly works, gaps), 3=Good (responsive, minor issues), 4=Excellent (mobile-first, adapts to input method)

### 5. Interaction States

Consult [interaction-design reference](../ui-polish/reference/interaction-design.md).

**Check for:**
- **Missing loading states**: API calls without skeleton/spinner feedback
- **Missing error states**: Forms or data fetching without error handling UI
- **Missing empty states**: Lists/tables that show nothing when empty
- **Disabled without visual cue**: Interactive elements disabled via JS but not visually
- **No optimistic updates** where appropriate (low-stakes actions like toggles)
- **Confirmation dialogs where undo would work better**
- **Missing hover/active feedback** on custom clickable elements

**Flutter — check for:**
- **Disabled faked with an empty closure**: `onPressed: () {}` looks enabled and does nothing.
  `onPressed: null` *is* the disabled state and styles itself correctly.
- **`FutureBuilder`/`StreamBuilder` with no `hasError` branch** — the snapshot's error case
  silently renders an empty or stuck-loading UI.
- **Missing empty states** on `ListView.builder` when `itemCount` is 0.
- **`GestureDetector` with no visual feedback** — use `InkWell` for ripple, or supply your own
  pressed state; a tap that looks identical to no-tap reads as broken.
- **Splash/highlight suppressed** (`splashColor: Colors.transparent`) with nothing replacing it.
- **No focus affordance** on custom widgets — Flutter draws none by default, so keyboard and
  D-pad users get nothing unless you build it.

**Score**: 0=No state handling, 1=Major gaps (no loading or error states), 2=Partial, 3=Good (most states covered), 4=Excellent (all 8 states designed for all interactive elements)

### 6. Performance

**Check for:**
- **Reactive overhead in animations**: `ref()` updated on every pixel during drag/scroll (should use template refs + direct DOM)
- **Missing lazy loading**: Images without `loading="lazy"`, heavy components not wrapped in `defineAsyncComponent`
- **Unnecessary watchers**: `watch` with `deep: true` on large objects
- **v-for without v-memo**: Large lists that re-render entirely on unrelated state changes
- **Expensive computed in templates**: Complex calculations inline instead of cached `computed`
- **Missing `will-change` on animating elements** (or worse, `will-change` on everything)
- **Layout thrashing**: Reading + writing layout properties in loops

**Flutter — check for:**
- **Missing `const` constructors** on static subtrees. This is the highest-leverage perf lever
  in Flutter — a `const` widget is skipped entirely on rebuild. Look for `const`-able widgets
  that aren't marked.
- **`setState` at the wrong altitude**: calling it on a screen-level `State` to update one
  chip rebuilds the whole tree. Push state down to the leaf, or use a scoped listenable.
- **Work inside `build()`**: sorting, filtering, date formatting, or `RegExp` construction that
  runs on every frame. `build()` can be called many times per second.
- **`ListView(children: [...])` for long lists** — builds every child eagerly;
  `ListView.builder` is lazy. Same for `Column` inside `SingleChildScrollView` on long content.
- **Controllers/listeners not disposed** (`TextEditingController`, `ScrollController`,
  `AnimationController`, stream subscriptions) — leaks that compound across navigation.
- **Images without `cacheWidth`/`cacheHeight`** — decoding a 4000px asset into a 100px avatar
  costs memory proportional to the source, not the display size.
- **`MediaQuery.of(context)` for one property** — rebuilds on every metric change; the scoped
  `sizeOf`/`paddingOf`/`textScalerOf` accessors don't.
- **`Opacity`/`ClipRRect` in hot paths** — both can force a `saveLayer`.

**Score**: 0=Severe issues, 1=Major problems, 2=Partial, 3=Good, 4=Excellent

## Report Format

Output a summary table, then detail each finding:

```markdown
## UI Audit Report: [Target]

| Dimension | Score | Issues |
|-----------|-------|--------|
| Accessibility | 3/4 | 2 issues |
| Animation & Motion | 2/4 | 4 issues |
| Theming & Tokens | 3/4 | 1 issue |
| Responsive | 4/4 | 0 issues |
| Interaction States | 2/4 | 3 issues |
| Performance | 3/4 | 1 issue |
| AI Slop & Design | 3/4 | 1 issue |
| **Overall** | **20/28** | **12 issues** |

### Findings

#### [P0] Critical — [Category]
**File**: `path/to/file.vue:42` (or `.dart:42`)
**Issue**: [Description]
**Fix**: [Actionable fix]

#### [P1] Major — [Category]
...
```

### Severity Levels

| Level | Meaning | Examples |
|-------|---------|---------|
| **P0** | Broken/inaccessible | No keyboard nav, broken on mobile, fails WCAG A |
| **P1** | Major UX problem | No loading state, layout property animations, no error handling |
| **P2** | Quality gap | Hard-coded colors, untouched framework defaults, missing hover/press states |
| **P3** | Polish opportunity | Could add stagger animation, tooltip delay grouping, reduced motion |

### 7. AI Slop & Design Quality

Consult [anti-patterns reference](../ui-polish/reference/anti-patterns.md).

Does this look like generic AI-generated UI? Check for the telltale signs:

**Check for:**
- **Generic color choices**: Purple/blue AI gradients, pure black `#000`, oversaturated accents, mixing warm/cool grays
- **Default fonts**: Inter, Roboto, Open Sans used without intentional reason
- **Lazy layout**: Three equal card columns, everything centered, no max-width container, uniform border-radius everywhere
- **Card overuse**: Cards wrapping everything, nested cards, cards where spacing alone would work
- **Content tells**: Generic placeholder names ("John Doe"), round numbers (`99.99%`), AI copywriting cliches ("Elevate", "Seamless"), Lorem Ipsum
- **Missing polish**: No favicon, no meta tags, no 404 page, no skip-to-content link, no form validation
- **Component cliches**: Pill badges everywhere, accordion FAQ, modals for everything, footer link farm with 4 columns
- **Flat surfaces**: No texture, no depth, generic `box-shadow` with pure black, inconsistent light direction

**Flutter tells specifically:**
- **Untouched Material defaults**: stock `ThemeData()` indigo/purple, a default `AppBar` with
  default elevation, `Card` with default radius and shadow — the "I ran `flutter create` and
  kept going" look.
- **`Card` wrapping everything**, including things that only needed spacing.
- **Default `FloatingActionButton`** placed because the template had one, not because the
  screen has a primary action.
- **Material 3 defaults unchanged** — stock `ColorScheme.fromSeed()` output, which has a
  recognisable pastel cast.
- **Stock `Icons.`** everywhere when the design language calls for a specific icon set.

**The test**: If someone said "AI made this," would they believe it immediately? If yes, that's a P2.

**Score**: 0=Obvious AI output, 1=Many generic patterns, 2=Some tells remain, 3=Distinctive with minor tells, 4=Indistinguishable from human-designed

## What NOT to Audit

- Backend code, API design, database queries
- Business logic correctness
- Code style or formatting (that's what Pint/ESLint/`dart format` and `flutter analyze` are for)
- Test coverage (that's what `/review` covers)
- Whole-repo design-system health — token ratios, missing scales, duplicate component kits
  (that's `/design-drift`)

This audit is purely about the **user-facing quality** of the frontend implementation.
