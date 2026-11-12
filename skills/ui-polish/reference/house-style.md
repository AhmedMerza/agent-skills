# House style — Glass (from the reference app)

The default look for a **new** Vue/Vuetify app, or one with no kit or tokens of its own. An app
that already has a consistent system keeps it (Build mode wins). This file sets the direction; the
canonical implementation is the reference app on `dev` — read it, don't re-derive values from memory:

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
   `#7367F0` is 3.8:1 on light glass — fine as a fill, too low for text).
4. **Blur is for surfaces, not rows.** Cards, bars, sheets, dialogs. Never per table row or list
   item, and drop to a solid surface (`--solid`) inside long tables, scroll-heavy lists and on
   `prefers-reduced-transparency`. Blur on hundreds of elements is a frame-rate bug on low-end phones.
5. **No glass on glass.** A card inside a card uses a well (`--well`) or nothing, never a second blur.
6. **Pills are for controls** (buttons, tabs, chips, toggles). Containers get the radius scale; nested
   radius = outer minus padding.
7. **Tones mean something.** Lime = success, coral = danger, sky = info. Never decorative.
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
