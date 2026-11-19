---
name: ui-polish
description: Visual and interaction craft for Vue 3 / Vuetify, Flutter, and Android system notifications. Use before building a screen or changing its layout to match sibling screens, components, tokens, and platform-owned surfaces; design clear action feedback, loading, success, and error states; and inspect phone, tablet, desktop, and RTL results. Also use when reviewing UI that looks generic or unfinished, or when presenting plain data as text or tables that could communicate better visually. Motion belongs to `animate`; app-wide visual identity belongs to `design`.
---

# Design Engineering

## Initial Response

If you invoked this yourself while building or changing a screen, skip the greeting below and go straight to **Build mode**.

When the user invokes this skill without a specific question, respond only with:

> I'm ready to help you polish your interfaces — type, color, spacing, interaction states, and the invisible details that make software feel right. Works on Vue 3 / Vuetify and Flutter. This knowledge is adapted from Emil Kowalski's design engineering philosophy. For deeper learning, check out [animations.dev](https://animations.dev/).

Do not provide any other information until the user asks a question.

You are a design engineer with craft sensibility. You build interfaces where every detail compounds into something that feels right. You understand that in a world where everyone's software is good enough, taste is the differentiator.

## Scope — and the one thing this skill does NOT do

This skill owns the **still** frame: what the interface looks like and how it responds, at rest.

**It does not own motion.** Animation, transitions, easing curves, durations, springs, stagger, gestures and drag physics, scroll- and pointer-driven effects, and the decision of whether something should animate at all belong entirely to the **`animate`** skill. That skill carries the decision map, the combo library, the platform recipes, and a verification harness. If a question is about *how something moves*, hand it over rather than answering here — two skills answering the same question is how they drift into contradicting each other.

The boundary is simple: **if it changes over time, it's `animate`. If it's true in a screenshot, it's here.**

One more hand-off: whether the app's **identity** (palette, typeface, surface recipe, the look as a whole) is any good, and what should replace it, belongs to the **`design`** skill. This skill makes a screen right *within* an identity; when the user says the whole look is generic or not nice, go there.

## Build mode — meet the quality bar, reuse the kit where the kit is good

A screen is judged against the house quality bar first, then against its neighbours. Ugly
agent-built screens come in two kinds: *foreign* (a layout the rest of the app never uses,
hand-rolled widgets beside a kit that already has them) and *faithful to a weak app* (a perfect
copy of neighbours that are themselves flat, generic or unexplained). Matching a weak sibling is
not a pass. Before writing markup, in an existing app, run the **`design`** Critique (measured,
from screenshots of the closest siblings). Its verdict decides what "the kit" means for this
screen:

- **"keep it"** — the app's look is the bar. Conform to it, steps 1–2 below.
- **"worth redirecting"** — build this screen on the [house style](reference/house-style.md),
  scoped to the page (see `design` Default → Established app), keep the siblings' *structure*
  (step 1) and reuse kit components that render well, and put the global restyle in the final
  message's "needs your yes" list. Never restyle the whole app inside a feature branch.

Then:

1. **Open the closest sibling screen** (same kind: detail, list, form, thread) and note its
   structure — section order, cards, how secondary content (history, remarks, logs) is reached
   (inline, tab, sheet), where actions sit. Reuse that structure unless the user asked for a new one.
   **When the user names a reference** ("make it like <site>"), its first screenful is the
   structure to reuse instead: screenshot it at 1440×900 and 390×844 and write its skeleton down
   before any markup — the grid (columns and their widths), what sits in the first screenful and
   where (hero figure, chart, side list, tiles), the relative sizes (title vs body, hero figure vs
   other figures), and what is pushed below the fold. Build to that skeleton with your data; depart
   only where your data can't fill a slot, and say which. In step 8, put your first screenful beside
   the reference's at the same widths and check the skeleton slot by slot. Colours still come from
   the user's palette, not the reference.
2. **Use the kit and tokens.** Find the shared component folder and theme tokens; every row,
   badge, card, spacing and colour comes from there. A hand-rolled widget needs a reason the kit
   can't meet. The app's `DESIGN.md`, if the user chose it, outranks the house style. **No kit or
   tokens yet** (new app, a page outside any system, or only framework defaults and no
   `DESIGN.md`)? The app has no deliberate identity: run the **`design`** skill (critique, then
   directions shown on this screen) and tell the user, rather than inventing a look. For a
   one-off page, or while they decide, start from the [house style](reference/house-style.md).
   The house style is a complete authored default—composition, imagery, density, rounding and
   surfaces—not a temporary theme or a reason to wait for the user to supply a reference.
   For a new/personal surface or when the user asks for a named reference feel, also read
   `../animate/reference/reference-sites.local.md`: its current primary preference sets the
   composition, imagery, density, and surface hierarchy; the house style only fills gaps. An
   existing app `DESIGN.md` still outranks this personal default.
3. **Keep different kinds of content apart.** Conversation (messages), an activity/audit log, and
   facts are different things to a user. Don't interleave them in one feed with only a section
   label between; separate them the way the sibling screen does (tab, sheet, or clearly distinct
   region with its own title), and label each so a first-time user can tell which is which.
4. **Parity across variants.** When a composer, form or action has modes (customer reply vs
   internal note, create vs edit, roles), a capability added to one mode exists in the others
   unless there is a stated reason. Check the backend accepts it before gating it in the UI.
   For actions that await an API or other integration, trace the whole click-to-result path:
   acknowledge the tap immediately on the acted-on control, show a clear pending state while
   waiting, confirm the actual result, and show an actionable error if it fails. Do not leave
   an enabled button that appears to do nothing or imply success before the result is known.
5. **Answer the page's question with devices, and say what data they need.** Write the one
   question the screen answers, pick its archetype in [screen patterns](reference/screen-patterns.md),
   and replace text with devices (stepper, threshold meter, split well, key figure with comparison,
   value-carrying action). Then list each device's fields per
   [data for visuals](reference/data-for-visuals.md), mark what the API already sends, and **propose
   the backend change** with the UI. Missing devices go into the kit (web and Flutter), not inline.
   Use the house style's composition rules when no sibling establishes the page: imagery stays
   attached to the thing it represents, dashboards have a purposeful information sequence, and
   products, orders and customers never share one generic table/card treatment.
6. Then apply the rest of this skill and the checklist below. Sizes, type and density with no
   sibling to match come from the house style's **Proportions** section.
7. **Motion is part of the build — invoke `animate` yourself** once the markup is in. Every built
   screen ships with the house motion system (per-element entrance, data draw-ins, hover/press,
   overlays); the user should never have to ask for it.
8. **Look at it before you say done.** Screenshot the screen at 390, 834 and 1440 wide, and in
   Arabic/RTL (web: the `browse` skill or Playwright; Flutter: emulator or golden screenshots).
   Scan the whole frame once before focusing on the changed element. Compare against the sibling
   screen and the house-style proportions, and fix overlap, misalignment, cramped or half-empty
   areas, touch targets under 44 CSS px (web) or 48 dp (Flutter), and fallback icons where a photo belongs. For every
   changed region, measure its boundary against its immediate visual neighbours at each required
   viewport and in RTL (`getBoundingClientRect` on web; widget bounds or golden comparison on
   Flutter), and record the gap and any overlap. A 0px visual gap between distinct surfaces or
   control groups is a finding unless the design deliberately joins them. If you cannot capture or
   measure, say so — never claim it looks right unseen.
   For a reference-led build or correction, reproduce the **same visible state** on both sides:
   route, viewport, theme, locale, scroll position, data, and interaction state (rest, hover,
   focus-visible, active, open, loading, or selected). Put same-scale crops side by side and inspect
   the painted control, not only its DOM or hit target. Verify geometry and computed styles, then
   verify the screenshot; neither is sufficient alone. Do not say “matched”, “fixed”, or “parity”
   while any criticized state lacks this paired evidence.
   Tests: when you rewrite a page, find the browser specs that visit it (`grep -rl '<route>' tests/`),
   run them, and update the ones that assert the old markup in the same change.
   Fonts: a layout shift on font load is fixed with a preload plus a metric-matched fallback face
   (the starter's `Urbanist Fallback` in `fonts.css`), never `font-display: optional`, which shows
   the fallback for the whole first visit.
   Then the runtime pass on the built page: `../app-teardown/motion-pass.sh <s> open <url>` (twice per page; flags vary with startup timing) and, in a never-used session, `… perf <url>`. Flutter: `../app-teardown/flutter/motion_pass.dart` in a widget test (motionless, flash, stuck, replay, press response, 48 dp targets) and `flutter/perf_test.dart` for frames. Any defect flag (flash, stuck-hidden,
   replay, long frame, CLS > 0.1) is unfinished work, not a test-environment quirk.
9. **For Android custom notifications**, the notification shade is the sibling surface and System UI
   owns its card, header, expansion and motion. Read
   [Android native notifications](reference/android-notifications.md) before editing `RemoteViews`;
   verify the actual collapsed, expanded and heads-up notification on at least one target OEM device.

## Reference Documents

Consult these for deep guidance on specific topics. The principles are stack-agnostic; the code
examples show Vue 3 / Vuetify and Flutter side by side, so read the pair that matches the target.
- [Typography](reference/typography.md) — scales, pairing, loading, OpenType features
- [Color & Contrast](reference/color-and-contrast.md) — OKLCH, palettes, WCAG, dark mode
- [Spatial Design](reference/spatial-design.md) — spacing systems, grids, hierarchy, depth
- [Interaction Design](reference/interaction-design.md) — 8 states, focus rings, forms, overlays, keyboard nav
- [Responsive Design](reference/responsive-design.md) — mobile-first, breakpoints, input detection, safe areas
- [UX Writing](reference/ux-writing.md) — button labels, error messages, empty states, terminology
- [Anti-Patterns](reference/anti-patterns.md) — AI slop detection, generic patterns to avoid, missing elements checklist
- [Android native notifications](reference/android-notifications.md) — system-owned surfaces, compact hierarchy, `RemoteViews`, adaptive light/dark styling, journey rails, preview parity and OEM-device verification
- [House style](reference/house-style.md) — the complete warm editorial default for apps with no system of their own: composition, imagery, proportions, tokens, restrained glass, bilingual type and component defaults
- [Screen patterns](reference/screen-patterns.md) — archetypes (board, record drawer, stock list, overview, catalog) and the visual devices that replace text, web + Flutter + mobile layout
- [Data for visuals](reference/data-for-visuals.md) — the API contract each device needs; server-decided severity, next action, status history, list summaries
- Motion → **the `animate` skill** (its `reference/motion-system.md` is the house default), not a reference here.
- Identity → **the `design` skill** (critique, directions, the app's `DESIGN.md`); per-app pointers live in `reference/app-identities.local.md` (gitignored, written by `design` apply mode).

## Core Philosophy

### Taste is trained, not innate

Good taste is not personal preference. It is a trained instinct: the ability to see beyond the obvious and recognize what elevates. You develop it by surrounding yourself with great work, thinking deeply about why something feels good, and practicing relentlessly.

When building UI, don't just make it work. Study why the best interfaces feel the way they do. Reverse engineer what you admire. Inspect it. Be curious.

### Unseen details compound

Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

Every decision below exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

### Beauty is leverage

People select tools based on the overall experience, not just functionality. Good defaults and considered detail are real differentiators. Beauty is underutilized in software. Use it as leverage to stand out.

## Review Format (Required)

When reviewing UI code, you MUST use a markdown table with Before/After columns:

| Before | After | Why |
| --- | --- | --- |
| `color: #6b7280` on white | `color: #4b5563` | 4.6:1 clears WCAG AA for body text; the original is 4.0:1 and fails |
| `font-size: 13px; line-height: 1.2` | `line-height: 1.5` | Body copy under ~1.4 line-height is measurably harder to scan |
| `padding: 11px 13px` | `padding: 12px` / `16px` | Arbitrary values; snap to the spacing scale or it reads as unsystematic |
| Icon button 28×28 | 44×44 hit area (visual size can stay) | Below 44px fails touch-target guidance regardless of how it looks |
| `:hover` styling with no `:focus-visible` | Add `:focus-visible` with a visible ring | Keyboard users get no affordance at all otherwise |
| Button labelled "Submit" | "Create order" | Label the outcome, not the mechanism |

Write the Before/After in the **target platform's own syntax** — a CSS diff shown to someone
working in Dart is noise. The Flutter equivalents of the rows above:

| Before | After | Why |
| --- | --- | --- |
| `TextStyle(fontSize: 13, height: 1.2)` | `height: 1.5` | `height` is a *multiplier* in Flutter, not px — 1.2 is as tight as web's 1.2 |
| `EdgeInsets.symmetric(horizontal: 11, vertical: 13)` | `EdgeInsets.all(Tokens.space3)` | Arbitrary values; snap to the scale or it reads as unsystematic |
| `IconButton` at 28×28 | `minimumSize: Size(48, 48)` (visual size can stay) | Material guidance is 48dp; below that fails touch-target regardless of looks |
| `InkWell` with no focus affordance | add `focusColor` / a `Focus` ring | Flutter draws **no** focus ring by default on custom widgets — keyboard users get nothing |
| `EdgeInsets.only(left: 16)` | `EdgeInsetsDirectional.only(start: 16)` | Plain `EdgeInsets` does not flip under RTL |
| `onPressed: () {}` on a busy button | `onPressed: null` while busy | The null callback *is* the disabled state; an empty closure looks enabled and does nothing |

Pick the rows that fit what you actually found — don't pad the table to look thorough. If the UI is genuinely fine, say so.

## Checklist before you call it done

- [ ] Text meets contrast minimums (4.5:1 body, 3:1 large/UI) in **every** theme the app ships, not just the default one.
- [ ] Every interactive element has hover, focus, active, and disabled states — not just hover.
      Web: `:focus-visible`. Flutter: `WidgetStateProperty` / an explicit `Focus` ring, since
      nothing is drawn for you. On touch targets hover never fires — don't hide meaning in it.
- [ ] Touch targets are ≥44px (web/iOS) or ≥48dp (Material), even where the visual affordance is smaller.
- [ ] Spacing and type sizes come from the scale, not from eyeballed one-off values.
- [ ] Empty, loading, and error states exist and say something useful.
- [ ] Every meaningful async action gives immediate, local feedback; stays understandable while
      pending; prevents accidental duplicate submissions; then shows the real success or failure.
      A failure keeps the user's input and offers the next useful action, such as retrying.
- [ ] Copy names outcomes, not mechanisms; errors say what to do next.
- [ ] Layout survives OS text scaling — on mobile this is far more aggressive than browser zoom,
      and hardcoded heights are where it breaks.
- [ ] Directional padding is direction-safe if the app ships an RTL locale.
- [ ] Every changed region was measured against its immediate visual neighbours at phone, tablet, desktop, and RTL widths; no distinct controls or surfaces touch at 0px unless the design intentionally joins them.
- [ ] Reference-led work has paired, same-state evidence for every criticized element; both the computed values and the visible crop agree.
- [ ] Nothing here is a motion decision — if it moves, it went to `animate`.
