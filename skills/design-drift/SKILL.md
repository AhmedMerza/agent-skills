---
name: design-drift
description: "Measure whether an existing design system actually held — token adoption as ratios, scales that were never built, competing component kits, icon-pack sprawl, direction-unsafe padding — then scaffold the missing layer and guard it so the drift can't return. Works on Flutter (ThemeExtension / ThemeData) and Vue 3 + Vuetify. Invoke with /design-drift when a codebase \"looks fine but is drifting\", before standardising several apps on one system, or when you want to know if polish is enforced or just hand-tuned. This is `design`'s bookend — that picks a system for new UI; this checks the system survived contact with the codebase. Restraint-gated: \"the system held, nothing to do\" is a first-class verdict."
---

# /design-drift — Did the design system hold?

A design system is not the tokens file. It's the **ratio of code that goes through it**.
A repo with an immaculate token layer and 500 screens ignoring it has no design system —
it has a document. This skill measures the difference, then closes it.

## What this owns — and what it doesn't

| Question | Skill |
|---|---|
| What palette/type should this new product use? | `design` |
| Does this screen look considered? | `ui-polish` |
| Is this page accessible / performant / responsive? | `ui-audit` |
| **Is the system adopted, or decorative?** | **this** |
| Does it move well? | `animate` |

Two things only this one can see, because it reads the **whole repo** rather than a page:
**duplication** (two button kits, three icon packs) and **absence** (a scale that was
never built). A per-page audit is structurally blind to both.

## Step 0 — find the system before judging it

Never grep for violations first. Locate the intended system, or you'll report a repo as
undisciplined when it's merely using a convention you didn't look for.

- **Flutter** — `lib/**/theme/`, `ThemeExtension<`, `ThemeData(`, a `Tokens`/`*Colors` class,
  `pubspec.yaml` `fonts:` block. Note the accessor (`context.oreem`, `Theme.of(context)`).
- **Vue/Vuetify** — `vuetify.ts`/`createVuetify` theme block, SCSS variable files, CSS custom
  properties, tailwind config.
- Read the token file's own comments. Migrations are often *documented* — a `LEGACY` block or
  a "coexists until X folds in" docstring turns a "finding" into a known, dated decision, and
  reporting it as news makes the whole audit look careless.

Then count the denominator: files and lines in the UI tree. Every number below is meaningless
without it.

## The four passes

### 1. Adoption — ratios, never adjectives

For each of **colour, spacing, radii, typography, elevation**: centralised references vs raw
literals, plus how many files the literals span. Report `2,076 : 74 across 25 files`, never
"mostly good".

**Flutter** — note the two traps baked into these: exclude the theme dir from the numerator
via `-not -path`, and **anchor `Colors\.` with a leading non-letter** or it silently matches the
tail of `OreemColors.surface` and inflates violations by an order of magnitude.
```bash
L=<repo>/lib
NT="find $L -name *.dart -not -path */core/theme/* -exec"   # numerator, theme dir excluded

$NT grep -Eoh 'Color\(0x[0-9a-fA-F]{6,8}\)' {} + | wc -l                       # raw hex
$NT grep -Eoh '(^|[^a-zA-Z])Colors\.(red|blue|green|grey|orange|purple|amber|teal|indigo|pink|cyan|yellow|brown)' {} + | wc -l
$NT grep -Eoh '(^|[^a-zA-Z])Colors\.(white|black|transparent)' {} + | wc -l    # BENIGN — discount
$NT grep -Eoh '<TokensClass>\.|\.extension<<ColorsExt>>' {} + | wc -l          # centralised
$NT grep -Eoh 'BorderRadius\.circular\(' {} + | wc -l
$NT grep -Eoh 'EdgeInsets(Directional)?\.[a-z]+\(' {} + | wc -l
```
Find the accessor before counting it — it may be sugar (`context.oreem`) or the raw idiom
(`Theme.of(context).extension<X>()`). Grepping for the wrong one returns 0 and reads as
"no design system" when adoption is actually total.
**Vue/Vuetify** — hex/`rgb(`/`hsl(` in `<style>`+templates vs `var(--…)`/theme colours;
raw `px` padding vs `pa-*`/`ma-*`/`ga-*`; raw `font-size` vs `text-h6`/`text-body-1`.

Exclude the theme directory itself from the numerator, and discount legitimate exceptions
(`Colors.white` on an image overlay, brand-logo assets, PDF/print render code) before
judging — an undiscounted ratio overstates the problem and gets the report dismissed.

### 2. Absence — the scale that was never built

The highest-value finding, and invisible to per-page tools. For each dimension ask: *does a
named scale exist at all?* If not, there is nothing to migrate **to**, and the fix is
construction, not cleanup.

The tell is a **continuous ramp**. Extract every literal and list the distinct values:
```bash
grep -rEoh 'fontSize:\s*[0-9.]+' $L --include='*.dart' | grep -Eo '[0-9.]+' | sort -nu | tr '\n' ' '
```
`10 12 14 16 20 24` is a scale. `7.5 8 8.5 9 9.5 10 10.5 11 11.5 …` across 32 values is
hand-tuning with no floor under it — it looks perfect today because a human placed every
number, and nothing holds it there. Rank the worst files by literal count; they become the
migration's proving run.

### 3. Duplication — two of something that should be one

- **Component kits** — two button/card/input implementations, both live. Locate each
  definition, then count *importing files* on each side. That ratio decides which one wins.
- **Parallel palettes** — a second "primary". Distinguish real drift from intentional roles
  (an accent-blue and a status-blue are two roles, not two blues).
- **Icon packs** — count icon dependencies in `pubspec.yaml` / `package.json`, then **check
  how many files import each one**. The dependency count alone proves nothing: a repo can
  declare three packs and funnel all of them through a single mapping file
  (`OreemIcons.wallet` → `LucideIcons.wallet`), which is the *correct* pattern, not sprawl.
  Sprawl is when the raw package constants appear across many feature files. If every direct
  use lives in one mapper, say so and move on.
- **Font delivery** — bundled vs fetched at runtime (`google_fonts`, webfont CDN). Runtime
  fetch is a network dependency on first paint and a real risk for offline-ish or
  poor-connection apps; call it out when the product is field-used.
- **Legacy escape hatches** — static constants that bypass the runtime theme. These are worse
  than hardcoded values: they hardcode *one mode*, so those screens silently ignore light/dark
  and accent switching. Always state that consequence, not just the count.

### 4. Direction and mode safety

- **RTL** — `EdgeInsetsDirectional` vs `EdgeInsets.only(left:|right:)`; `start`/`end` vs
  `left`/`right` in CSS. `symmetric(horizontal:)` is already safe — exclude it, or the risk
  reads far larger than it is. Only matters if the app actually ships an RTL locale: check
  for `ar`/`he`/`fa` in the l10n config before scoring it.
- **Modes** — do the legacy/hardcoded screens survive a theme switch? Name the screens.

## Enforcement — report, then close the loop

The audit alone changes nothing. Once findings are agreed, do the **smallest** thing that makes
the drift stop:

1. **Build the missing layer** in the codebase's own idiom — a `ThemeExtension` resolved into
   the existing theme object for Flutter, theme keys/CSS custom properties for Vue. It must be
   reachable the same way the existing tokens are; a second accessor is new drift.
2. **Derive the scale from what's there.** Collapse observed values to a discrete set, then
   reconcile against the design source before rounding — some odd values are deliberate.
   Semantic names (`cardTitle`, `microLabel`), not size names, so density can hang off it later.
3. **Migrate the two worst files only**, as proof the extension survives real screens. Never
   big-bang. Leave the rest to be taken as modules are touched.
4. **Guard it** so it can't come back: a lint rule (`flutter_lints` custom rule / ESLint
   `no-restricted-syntax`), a CI grep with a ratchet on the literal count, or at minimum a
   documented reviewer rule. **Without a guard you have bought a one-time cleanup, not a system.**
5. **File the remainder** as an issue with the numbers attached, so it stays visible.

Steps 1–3 are code and need the usual branch/MR etiquette. Do not start them in the same breath
as the audit — get agreement on the findings first.

## Output shape

```
Design-drift: <repo> — <one-line verdict>

Scale: N files / N lines · <stack> · system at <path>

Adoption
  colour      2,076 : 74 across 25 files    ✅
  spacing     287/483 tokenised (59%)        ⚠️  24% off-grid
  typography  554 inline, 1 via theme        ❌  no scale exists
Absence
  <dimension> — no named scale; N distinct values, continuous ramp
  worst: file (N) · file (N)
Duplication
  <two kits, N vs N importing files, migration documented/undated>
Direction & mode
  <RTL / theme-switch exposure, or "n/a — no RTL locale">

Verdict: held · drifting · decorative
Smallest enforcing change: <one sentence>
```

## Guardrails

- **Verify every number yourself before it leaves the session.** Delegated counts arrive
  plausible and wrong — a bad figure in a filed issue discredits the true ones next to it.
  Re-run the grep for anything you're about to publish.
- **Anchor generic field names, or your migration percentage is fiction.** Counting a scale's
  adoption by its field names (`.body`, `.link`, `.code`, `.h1`, `.button`) catches
  `response.body`, `widget.code`, and every unrelated match in the repo. Bind to the accessor
  variable first — collect what the extension is assigned to (`final t = …extension<X>()`),
  then count `\b(t|type|…)\.(field|field)\b`. Unanchored inflated one real count by 27%.
- **A substring match is not a usage.** `ThemeData(` matches `DatePickerThemeData(`,
  `IconThemeData(`, `CountryListThemeData(` — third-party sub-theme objects, not competing
  theme roots. Read the surrounding line for anything you're about to call duplication;
  every false positive here turns into a fabricated finding.
- **A ratio without a denominator is a lie.** 153 literals is meaningless; 153 against 1,022
  centralised references in 84k lines is a verdict.
- **Never judge intent from a filename.** `refined/`, `v2/`, `new/` folders may be design
  mockups, a live migration, or dead code. Check whether they compile and who imports them
  before calling anything a second design system.
- **Absence beats untidiness.** A missing scale outranks fifty stray paddings. Lead with it.
- **Don't confuse capability with discipline, or discipline with quality.** A repo can have
  runtime theming, motion and bundled fonts *and* the worst token ratio in the org. Both are
  true; say both. The one that predicts the future is discipline.
- **"The system held" is a real verdict.** Report it in three lines and stop. Do not
  manufacture findings to justify the run.
- **This audits; steps 1–5 fix.** Don't slide from measuring into refactoring without
  agreement — that's how a review becomes an unreviewable diff.
