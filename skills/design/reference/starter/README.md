# House starter — copy this, don't improvise

Tested theme files for an app with no identity (design skill, Default mode). Copy, swap the
accent, satisfy the checklist. The look: warm paper ground, one accent, pastel status pills with
dark same-hue text, Urbanist + IBM Plex Sans Arabic, rounded-rectangle controls, rim + long soft
shadow instead of borders, solid working surfaces with glass reserved for chrome, and the complete
house motion system. Sources: ui-polish `house-style.md`, animate
`motion-system.md`.

## Vue 3 + Vuetify — copy from `vue/`

| File | To | Wire |
| --- | --- | --- |
| `fonts.css`, `tokens.css` | `src/styles/` | import both in the entry, after `vuetify/styles` |
| `../fonts/web/` (folder) | `src/styles/fonts/` | the woff2 files `fonts.css` points at; nothing to install |
| `house.js` | `src/plugins/` | `createVuetify({ theme: houseTheme, defaults: houseDefaults })`; `money()`; `checkHouseFonts()` |
| `entrance.js` | `src/motion/` (needs `npm i gsap`; Flip ships in it) | `app.directive('enter', vEnter)` and `app.directive('travel-nav', vTravelNav)`; `switchTheme()` for the theme toggle |
| `StatusPill.vue`, `Money.vue` | `src/components/` | `<StatusPill tone="good" icon="…">`, `<Money :value :currency :locale>` (Urbanist has no tabular figures; this aligns digits) |
| `example/` | read, then adapt | shell (`App.vue`) and a list page (`OrdersPage.vue`) built on the kit |

Build pages from the
`house-*` classes in `tokens.css` (`house-page`, `house-title`, `house-grid`, `house-tile`,
`house-card`, `house-seg`, `house-rows`, `house-pill`), not from raw Vuetify defaults.

## Flutter — copy from `flutter/`

| File | To | Wire |
| --- | --- | --- |
| `../fonts/flutter/` (folder) | `assets/fonts/` | the TTFs + OFL texts; `fetch_fonts.sh` is only an optional refresh |
| `pubspec.fonts.yaml` | merge into the ONE `flutter:` section | the two families; keep `uses-material-design: true` or every icon is blank |
| `house_fonts_test.dart` | `test/` | fails if a font or the icon font is not really bundled |
| `house_theme.dart` | `lib/theme/` | `theme: houseTheme(Brightness.light)`, `darkTheme: houseTheme(Brightness.dark)` |
| `house_widgets.dart` | `lib/widgets/` | `builder: (_, c) => HouseBackdrop(child: c!)`; `HouseCard`, `StatusPill`, `MoneyText`, `Enter`, `DataText`, `HouseFloatingAction` |
| `example/` | read, then adapt | a list screen built on the kit |

Everything works offline: the fonts are in the kit (`fonts/`, 0.95 MB in total: 0.23 MB woff2
for web, 0.71 MB TTF for Flutter; Urbanist and IBM Plex Sans Arabic, both SIL OFL 1.1, licence
texts included) and icons use the Material font that ships with the SDK. For offline Flutter
web screenshots build with `flutter build web --no-web-resources-cdn`.

Keep the kit a separate, self-contained change: copy and wire it before the screen, and do not
mix screen code into it, so it can be its own commit when the user commits (commits need the
user's yes). Name it in the final message: "house starter applied, accent X".

## Swap these, nothing else

The four values marked `SWAP` (light and dark) in `tokens.css` + `house.js`, or in
`house_theme.dart`: **ground, accent, accent-as-text, text-on-accent**. Take them from the
app's existing brand colour, or from a row of house-style "Accent variants". Then re-measure:
`python3 skills/design/scripts/palette.py contrast <text>:<ground> …` — every pair ≥ 4.5:1. A
deep-blue dark mode also needs the two backdrop glow colours changed to blue.

## Minimum house look — Default mode is not done until all ten hold

Check each on a screenshot (phone and desktop, light and dark, en and ar), not in the code.

1. **Fonts loaded, proven** — Urbanist for Latin, IBM Plex Sans Arabic for Arabic; not system
   fonts or Roboto. A missing file falls back silently, so prove it: web `await checkHouseFonts()`
   returns `[]` in the running page; Flutter `house_fonts_test.dart` passes.
2. **Ground** is the tinted paper (or warm/deep-blue dark) with the fixed backdrop, on the whole
   page at any scroll length; never plain white or grey, never a gradient that ends part-way down.
3. **Cards** use the house surface: rim + long soft shadow, radius 20–24, no border colour.
4. **Status** is a tonal pill with an icon; text is the per-theme tone of the same hue.
5. **Money** shows the app's configured currency, in tabular figures (`Money` / `MoneyText`),
   end-aligned in columns. No currency in the data, config or locale settings → show the number
   alone, locale-formatted, and list "currency not known" in the final message. Never invent one.
6. **Buttons** are sentence-case rounded rectangles (12–14px); chips, avatars and mobile navigation
   may be pills. No uppercase anywhere.
7. **One signature detail** per screen: the inverted feature tile/card for the number or item
   that matters most (or a per-character title, or a travelling nav pill).
8. **House motion** is complete: per-region entrance, travelling navigation selection, FLIP list
   changes, press feedback, trigger-origin overlays, and circular user-triggered theme reveal where
   those interactions exist—never one block fade.
9. **User data wraps, never truncates** in a card or list row (names, addresses: `DataText`,
   `.house-wrap`). Ellipsis only in a dense table cell, with the full text in a tooltip/`title`.
10. **Nothing floats over the last row.** A list under a floating action or floating nav ends
    with bottom padding of its height + 16 + 16 + safe area (`HouseFloatingAction.clearance`,
    `.house-page` on web); scroll to the end and look.
