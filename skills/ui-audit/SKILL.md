---
name: ui-audit
description: Run technical UI quality checks across accessibility, performance, theming, responsive design, interaction states, and anti-patterns. Generates a scored report with severity ratings and actionable fixes. Tailored for Vue 3 + Vuetify + Inertia.js.
---

# UI Audit

Run systematic **technical** quality checks on frontend code and generate a comprehensive report. Don't fix issues — document them for the developer to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation.

## How to Use

Invoke with an optional target: `/ui-audit [page, component, or feature]`

Without a target, audit the most recently changed frontend files.

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

**Score**: 0=Inaccessible (fails WCAG A), 1=Major gaps, 2=Partial (some effort, significant gaps), 3=Good (WCAG AA mostly met), 4=Excellent (WCAG AA fully met)

### 2. Animation & Motion

Consult [motion-design reference](../ui-polish/reference/motion-design.md) for principles.

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

**Score**: 0=Broken/janky animations, 1=Major issues (layout property animations, no reduced motion), 2=Partial, 3=Good (mostly correct, minor issues), 4=Excellent (polished, accessible, performant)

### 3. Theming & Design Tokens

**Check for:**
- **Hard-coded colors**: Hex/RGB/HSL values in templates or `<style>` instead of Vuetify theme variables or CSS custom properties
- **Hard-coded spacing**: Pixel values instead of Vuetify spacing utilities (`pa-4`, `ma-2`, `ga-3`)
- **Inconsistent elevation**: Mix of custom `box-shadow` and Vuetify `elevation-*`
- **Dark mode issues**: Elements that don't update on theme switch, poor contrast in dark mode
- **VTooltip contrast**: Missing `bg-surface text-on-surface` classes
- **Typography bypass**: Raw CSS font sizes instead of Vuetify's `text-h6`, `text-body-1`, etc.

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
**File**: `path/to/file.vue:42`
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
| **P2** | Quality gap | Hard-coded colors, default Vuetify transitions, missing hover states |
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

**The test**: If someone said "AI made this," would they believe it immediately? If yes, that's a P2.

**Score**: 0=Obvious AI output, 1=Many generic patterns, 2=Some tells remain, 3=Distinctive with minor tells, 4=Indistinguishable from human-designed

## What NOT to Audit

- Backend code, API design, database queries
- Business logic correctness
- Code style or formatting (that's what Pint/ESLint are for)
- Test coverage (that's what `/review` covers)

This audit is purely about the **user-facing quality** of the frontend implementation.
