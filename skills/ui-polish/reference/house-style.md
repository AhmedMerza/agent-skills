# House style — Glass (from the reference app)

The default look for a **new** Vue/Vuetify app, or one with no kit or tokens of its own. An app
that already has a consistent system keeps it (Build mode wins). This file sets the direction; the
canonical implementation is the reference app on `dev` — read it, don't re-derive values from memory.
Where the reference app lives on this machine is in `reference-app.local.md` next to this file
(gitignored; if it's missing, ask the user):

| Layer | the reference app file |
| --- | --- |
| Vuetify palettes (light + dark) | `resources/ts/plugins/vuetify/theme.ts` |
| Alpha tokens, radii, blur, backdrop, motion curve | `resources/styles/_design-tokens.scss` |
| Component defaults (pill buttons, flat cards, outlined fields) | `resources/ts/plugins/vuetify/defaults.ts` |
| Component skin (~30 partials) | `resources/styles/@core/template/libs/vuetify/components/` |
| Page entrance | `resources/ts/composables/usePageEntrance.ts` |
| Spec and reference shots | `storage/design-system/SPEC.md`, `storage/design-system/shots/` |


## The look in one paragraph

Translucent frosted cards (`backdrop-filter`, 1px light rim) over one fixed, soft, CSS-only
gradient backdrop; generous radii (card 22, tile 18, field 14, modal 26) and pill controls; one
accent (the reference app purple `#7367F0`) for primary actions and focus, plus a small tone set (sky, lime,
coral) that carries meaning only (info, success, danger); one variable sans for Latin with an Arabic
companion in the same stack; tabular numerals on every figure; comfortable density; light and dark
both first-class.

## Rules that make glass work (these are what separate it from glass-as-slop)

1. **Tokens first.** Glass fills, rims, lines, text tones and shadows are CSS custom properties keyed
   on `.v-theme--light` / `.v-theme--dark` — Vuetify theme colours can't carry alpha. No literal
   `rgba()`/hex in pages; the reference app's own adoption gap (hundreds of literal hex in `pages/`) is the
   warning.
2. **One backdrop, one blur value.** The gradient lives once, on a fixed layer behind the app
   (`.v-application::before`), never per section. One `--blur` token.
3. **Contrast against the worst backdrop pixel**, not against the token. Light glass at ~22% white
   lets the backdrop decide legibility: measure text on the lightest and darkest spot behind a card.
   Small accent-coloured text uses a contrast-fixed `--accent-text`, never the raw accent (the reference app's
   `#7367F0` is 3.8:1 on light glass — fine as a fill, too low for text). **The same goes for every
   status tone**: each has a bright for fills/dots and a per-theme *text* tone (web: `--good #28670c`,
   `--warning #7d5300`, `--bad #9e2f19` on light). Bright amber/green/cyan text on light glass
   measured 1.1–1.8:1 in an ops admin app — a fixed "not theme-dependent" status palette is the bug.
   Keep the backdrop's darkest stop light enough that text tones still clear 4.5:1 over it.
4. **Blur is for surfaces, not rows.** Cards, bars, sheets, dialogs. Never per table row or list
   item, and drop to a solid surface (`--solid`) inside long tables, scroll-heavy lists and on
   `prefers-reduced-transparency`. Blur on hundreds of elements is a frame-rate bug on low-end phones.
   **Even one live blur over scrolling content is expensive on Android.** Measured on a Galaxy A16
   (90 Hz, profile build, 2026-11-12): an ops admin app with Glass rasterised at 27–38 ms per frame
   (27–37 fps, ~100% janky); the same list with Glass off ran at 12.9 ms (77 fps). On mobile, prefer a
   **pre-blurred static backdrop** (blur the gradient or photo once, as an image) and tinted
   translucent fills with no `BackdropFilter`; keep a live blur only where content truly scrolls
   under a bar *and* the device can afford it (gate by a measured tier or a setting). Full-screen
   `ShaderMask`/`saveLayer` fades cost a further ~3–4 ms per frame. **A Glass change is not done until
   it is profiled on a mid-range Android** (profile build, `Flutter.Frame` or `gfxinfo` p50/p90,
   Glass on vs off) and the numbers are in the MR.
5. **No glass on glass.** A card inside a card uses a well (`--well`) or nothing, never a second blur.
   A **solid** surface (sheet, dialog) gives its children a solid sub-palette (`--well`, `--line`):
   glass card tokens (22% fill, white rim) inside a solid sheet have no visible edge.
6. **Pills are for controls** (buttons, tabs, chips, toggles). Containers get the radius scale; nested
   radius = outer minus padding.
7. **Tones mean something.** Lime = success, coral = danger, sky = info. Never decorative. **Zero
   values are neutral ink** — "0 failed" in red is a false alarm. A **non-zero** count keeps its
   category hue in that hue's per-theme *text* tone (dark green, dark cyan…), so it is both
   colourful and readable; don't flatten healthy counts to black (users read an all-ink stat grid
   as "colour removed" — an ops admin app, 2026-11-12). Red/amber are reserved for exceptions; a running
   total (4,843 done) is context and can stay ink. One meaning per hue across the app.
   Every glass value — rim, blur, radius, shadow, scrim — is a token; a literal `sigma: 11` or
   `BoxShadow(color: Colors.black…)` in a widget is drift.
8. **Shadows are soft and tinted** (`--shadow`, `--shadow-pop`); the primary button may carry a faint
   accent glow — one, and nowhere else.

## Type

- One stack serving both locales: a Latin variable sans first, then an Arabic family limited to the
  Arabic `unicode-range` (the reference app: Urbanist → IBM Plex Sans Arabic → system). Self-host both.
- Body 14px / 500 / 1.45; card title 15/600; captions 11–12.5; page titles clamp(28px, …, 38px)/600
  with slight negative tracking (Latin only — never track Arabic).
- `font-variant-numeric: tabular-nums` on every number, KPI, price and table column.
- Arabic needs looser line-height than Latin at the same size when text is clamped (see `break-ui`).

## Vuetify defaults (author once, in `defaults.ts`)

`VBtn { rounded: 'pill' }`, `VCard { rounded: 'lg', elevation: 0 }` (the skin draws the glass, not
elevation), fields `variant: 'outlined'`, density comfortable, one icon set (the reference app: Tabler). Set it
here rather than per component so pages can't drift.

## Motion

Owned by the `animate` skill. The house entrance is one shared composable, not per-page code —
see animate's "Page entrance" section.

## Accent variants (same system, different mood)

Token swaps only — the rules above don't change. Pick one per product; contrast-check the
light-mode text tone of each.

| Variant | Light bg / text / accent | Dark bg / accent | Surface |
| --- | --- | --- | --- |
| the reference app (default) | `#E9ECE7` / ink / `#7367F0` | `#111513` / `#7367F0` | glass |
| Terracotta (warm, retail) | `#e7e0d6` / `#1d1a16` / `#ad4622` | `#1c1916` / `#f0a07a` | glass over a photo |
| Navy pastel (ops, stock) | `#e8ecf6` / `#121a2e` / ember `#c21f37` | `#0a1222` / `#eeb2a3` | glass, pastel status gradients |
| Teal editorial (storefront) | `#f7f6f2` / `#161a19` / `#0b7a73` | `#111514` / `#3cc2b5` | solid, hairlines, no glass |
| Mono (ERP, dense) | `#efefec` / `#111` / black primary | `#0b0b0b` / white primary | glass cards, solid drawer |
