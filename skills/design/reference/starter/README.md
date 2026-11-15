# House starter — copy this, don't improvise

Tested theme files for an app with no identity (design skill, Default mode). Copy, swap the
accent, satisfy the checklist. The look: warm paper ground, one accent, pastel status pills with
dark same-hue text, Urbanist + IBM Plex Sans Arabic, rim + long soft shadow instead of borders,
warm glass in dark mode, per-element entrance. Sources: ui-polish `house-style.md`, animate
`motion-system.md`.

## Vue 3 + Vuetify — copy from `vue/`

| File | To | Wire |
| --- | --- | --- |
| `fonts.css`, `tokens.css` | `src/styles/` | import both in the entry, after `vuetify/styles` |
| `house.js` | `src/plugins/` | `createVuetify({ theme: houseTheme, defaults: houseDefaults })`; `money()` |
| `entrance.js` | `src/motion/` | `app.directive('enter', vEnter)`; `switchTheme()` for the theme toggle |
| `StatusPill.vue`, `Money.vue` | `src/components/` | `<StatusPill tone="good" icon="…">`, `<Money :value :currency :locale>` (Urbanist has no tabular figures; this aligns digits) |
| `example/` | read, then adapt | shell (`App.vue`) and a list page (`OrdersPage.vue`) built on the kit |

`npm i @fontsource-variable/urbanist @fontsource/ibm-plex-sans-arabic`. Build pages from the
`house-*` classes in `tokens.css` (`house-page`, `house-title`, `house-grid`, `house-tile`,
`house-card`, `house-seg`, `house-rows`, `house-pill`), not from raw Vuetify defaults.

## Flutter — copy from `flutter/`

| File | To | Wire |
| --- | --- | --- |
| `fetch_fonts.sh` | run once in the project root | downloads the OFL TTFs to `assets/fonts/` (commit them in the app) |
| `pubspec.fonts.yaml` | merge into `pubspec.yaml` | the two font families |
| `house_theme.dart` | `lib/theme/` | `theme: houseTheme(Brightness.light)`, `darkTheme: houseTheme(Brightness.dark)` |
| `house_widgets.dart` | `lib/widgets/` | `builder: (_, c) => HouseBackdrop(child: c!)`; `HouseCard`, `StatusPill`, `MoneyText`, `Enter`, `DataText`, `HouseFloatingAction` |
| `example/` | read, then adapt | a list screen built on the kit |

## Swap these, nothing else

The four values marked `SWAP` (light and dark) in `tokens.css` + `house.js`, or in
`house_theme.dart`: **ground, accent, accent-as-text, text-on-accent**. Take them from the
app's existing brand colour, or from a row of house-style "Accent variants". Then re-measure:
`python3 skills/design/scripts/palette.py contrast <text>:<ground> …` — every pair ≥ 4.5:1. A
deep-blue dark mode also needs the two backdrop glow colours changed to blue.

## Minimum house look — Default mode is not done until all ten hold

Check each on a screenshot (phone and desktop, light and dark, en and ar), not in the code.

1. **Fonts loaded** — Urbanist for Latin, IBM Plex Sans Arabic for Arabic; not system fonts or Roboto.
2. **Ground** is the tinted paper (or warm/deep-blue dark) with the fixed backdrop, on the whole
   page at any scroll length; never plain white or grey, never a gradient that ends part-way down.
3. **Cards** use the house surface: rim + long soft shadow, radius 20–24, no border colour.
4. **Status** is a tonal pill with an icon; text is the per-theme tone of the same hue.
5. **Money** shows its currency, in tabular figures, end-aligned in columns.
6. **Buttons** are sentence-case pills; no uppercase anywhere.
7. **One signature detail** per screen: the inverted feature tile/card for the number or item
   that matters most (or a per-character title, or a travelling nav pill).
8. **Entrance motion** on every region: title, toolbar, cards, then rows — never one block fade.
9. **User data wraps, never truncates** in a card or list row (names, addresses: `DataText`,
   `.house-wrap`). Ellipsis only in a dense table cell, with the full text in a tooltip/`title`.
10. **Nothing floats over the last row.** A list under a floating action or floating nav ends
    with bottom padding of its height + 16 + 16 + safe area (`HouseFloatingAction.clearance`,
    `.house-page` on web); scroll to the end and look.
