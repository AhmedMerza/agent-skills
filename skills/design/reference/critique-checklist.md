# Critique checklist

Eight dimensions. Each gets `good` / `weak` / `not nice`, with the evidence named in the last
column. Thresholds are defaults drawn from the taste anchors (SKILL.md); an app's own `DESIGN.md`
overrides them where it says so on purpose.

Measure with `scripts/palette.py` (`hues` for OKLCH lightness / chroma / hue and hue families,
`contrast` for WCAG ratios). Where a surface is translucent or a gradient, sample the rendered
pixel from the screenshot — the declared token is not what the user sees.

## 1. Palette

| Check | Good | Not nice | Evidence |
| --- | --- | --- | --- |
| Hue families (chroma ≥ 0.03, 30° apart) across brand + accent + decoration, excluding status | 1, at most 2 | 3+ | `palette.py hues` output |
| Accent competition: saturated hues visible in one viewport that are not data or status | 1 | 2+ fighting for the eye (accent button + gradient header + coloured icons + tinted cards) | screenshot crop, count them |
| Accent vs ground | accent hue ≥ 60° from a chromatic ground, or ground is near-neutral (C ≤ 0.02) | accent within ~40° of a chromatic ground (C ≥ 0.03): analogous, nothing stands out, reads as one murky colour | the two hues |
| Chroma balance | ground and surfaces C ≤ 0.02; one accent at C 0.12–0.20; status fills pastel (L ≥ 85%, C ≤ 0.08) with dark same-hue text | several hues at C ≥ 0.2 at similar lightness; neon on dark | chroma column |
| Lightness spread | clear steps: ground, surface, raised, ink — each ≥ 4% L apart; ink ≤ 25% L (light) or ≥ 90% L (dark) | everything in the 35–65% L band; mid-grey text on mid-tone surface | lightness column |
| Neutrals | one tinted family (C 0.005–0.02, one hue) | pure `#000` / `#fff` / untinted grey; warm and cool greys mixed | hues of the neutrals |
| Brand vs semantic collision | brand/accent hue ≥ 30° from success, warning, danger, info | brand red beside error red, brand green beside success, accent blue beside info — users cannot tell "ours" from "something happened" | hue pairs |
| Colour discipline | colour appears on data, status and the consequence of an action; chrome is quiet | colour on chrome (nav, card headers, icon backplates) and none left to mean anything | annotated screenshot |
| Gradients | none, or one soft backdrop / pastel tile gradient within one hue | purple-to-blue "AI gradient", gradient text, a different gradient per section | crop |

## 2. Contrast (measured, both themes)

List every pair that appears on screen and its ratio. Minimum set: body text on ground and on
card; secondary/muted text on both; accent-coloured text and links; button label on accent fill;
each status text on its tint; placeholder; disabled; text over imagery or gradient (worst pixel).

- Body, labels, placeholders ≥ 4.5:1. Large text and UI glyphs ≥ 3:1.
- Accent used as small text needs its own text tone; the raw accent often lands at 3–4:1.
- Status = saturated text on a 13–17% tint of the same hue; measure the text on the tint, not on
  the page.
- Too much is also a finding: pure white on pure black (21:1) across large areas is harsh;
  the anchors sit around 13–16:1 for body ink.

## 3. Dark mode

| Check | Good | Not nice |
| --- | --- | --- |
| Ground | warm near-black or deep blue with a visible tint (L 12–18%, C 0.01–0.04; real renders of Flutter surfaces and glass needed L 20–22% to read as separate layers, so judge the range 12–22% and note which kind of surface you measured), one hue | flat `#000`/`#121212` grey; or a saturated navy/purple (C > 0.05) that tints everything on it |
| Surface separation | each level ≥ 4% L above the last, or a rim + soft shadow | card and ground within 2% L — "muddy": edges only visible by squinting |
| Accent | same hue as light, lifted in L and slightly lower in C; readable as text | light-mode accent reused unchanged; glows to compensate |
| Status | per-theme text tones; tints darkened, not just alpha'd | light-mode pastels on dark; bright text on bright tint |
| Is it designed? | choices differ from light (depth by lightness, lighter body weight) | inverted light theme |

Muddiness test: desaturate the dark screenshot. If cards, ground and inputs merge into one
tone, depth depends on hue alone and fails.

## 4. Typography

- One variable sans doing hierarchy by weight (500/600/700) in a narrow size range plus one big
  title — good. Two or more Latin families, or only 400/700 — weak.
- Default-looking family (the framework's stock font, or the usual overused web sans) with no
  deliberate choice — not nice. Check what actually renders (computed `font-family`, bundled font
  files), not what the theme asks for.
- Arabic: a real companion family in the same stack, limited to the Arabic range, self-hosted.
  Arabic rendered in a system fallback beside a designed Latin face — not nice. No tracking on
  Arabic; looser line-height than Latin.
- Tabular numerals on every figure: check the chosen font actually ships a tabular feature (`tnum` / tabular figures). Some do not; then pick another face or a separate numeric face for figures. Titles with slight negative tracking (Latin only).
- Sizes: body 14–16; more than ~6 distinct sizes on one screen is a finding.

## 5. Surfaces and depth

- One recipe, stated: e.g. inset 1px ring + long negative-spread shadow; or glass per the house
  rules; or flat with hairlines. Good = every card on every screen uses it.
- Not nice: hard 1px grey borders *and* default drop shadows together; elevation presets from the
  framework left as shipped; three card styles on one screen; blur sprinkled per element; black
  untinted shadows; glass on glass.
- Radii from one scale; nested radius = outer − padding.

## 6. Imagery and iconography

- One icon set, one stroke weight, one size scale. Mixed sets or filled-beside-outline — weak.
- Icons on coloured rounded backplates in five different hues — not nice (decoration posing as
  meaning; count it under accent competition too).
- Photo slots hold real photos at a consistent ratio with `cover`; a fallback glyph in a photo
  slot reads as broken. Stock illustrations in a style unrelated to the UI — weak.
- Empty states and avatars follow the palette instead of bringing their own.

## 7. Logo and brand mark

- Scale: legible but not shouting — roughly 24–32px tall in a top bar, 40–64px on auth screens.
  A logo taller than the bar's controls by 2× or squeezed under 20px is a finding. Measure it.
- Clear space ≥ half the mark's height; never stretched; a variant exists for dark ground (a
  dark logo on a dark bar, or a white box around it, is not nice).
- **Brand colour** = the logo's colour. When the theme's declared primary and the logo disagree,
  the logo wins as the identity reference. A UI accent that differs from the logo is a finding;
  changing the UI to match the logo is NOT a brand change — label that option "aligns UI to logo".
- The mark's colour appears in the UI on purpose (as the accent, or deliberately nowhere), not as
  a third unrelated hue.
- App icon / favicon / splash agree with the in-app mark.

## 8. Density

- Does the density fit the job? Ops and accounting screens are dense but ordered (tight rows,
  aligned figures, quiet chrome); consumer and marketplace screens breathe (large media, few
  actions per view).
- Not nice: big padded cards holding one number each on a data tool; or a consumer home screen
  packed like a spreadsheet; inconsistent gutters between sibling screens.
- Phone: 4–5 meaningful things above the fold; desktop content has a max width.

## Reading the result

- Mostly `good`, no `not nice` → **keep it**. Say what makes it work. Pass any `weak` rows to
  `ui-polish` as small fixes; do not open Direction.
- `not nice` only in contrast or dark mode → the identity is sound but half-built: fix tokens
  within the existing direction (Apply-sized work), no new directions needed.
- `not nice` in palette, typography or surfaces → the identity itself is the problem: Direction.
- Brand colour implicated → say it in the verdict line, not buried in the table.

## Verdict format

```
Verdict: <one plain sentence>. <keep it | fix within current identity | worth redirecting>

| Dimension | Rating | Evidence |
| Palette | not nice | 5 hue families; accent h293 vs ground h266 (27° apart); stat row shows 4 saturated hues |
| Contrast | weak | muted text 3.1:1 on card (dark); accent link 3.6:1 (light) |
| ...

Screens: <absolute paths to the captures>
```
