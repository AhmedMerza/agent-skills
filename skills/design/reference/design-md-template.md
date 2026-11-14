# DESIGN.md template

Written once per app, at the app repo's root, by Apply mode. One page. It records decisions and
points at the token files — it does not duplicate every value. Later agents read it before any UI
work in that app; `ui-polish` build mode treats it as outranking the house style.

Fill every `<…>`; delete a section rather than leave it vague.

```markdown
# Design language

Direction: **<name>** — <one line>. Chosen <date>; alternatives considered: <B>, <C>.
Source of truth for values: `<theme file>`, `<token file>`. This file explains them.

## Palette

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| ground | <hex> | <hex> | page background |
| surface / raised / well | <hex> … | <hex> … | cards / popovers / insets |
| ink / ink-muted | <hex> (<ratio> on surface) | <hex> (<ratio>) | text |
| accent | <hex> | <hex> | primary action, focus, selection — nothing else |
| accent-text | <hex> (<ratio>) | <hex> (<ratio>) | links, small accent text |
| success / warning / danger / info | fill · tint · text | fill · tint · text | meaning only |

Brand colour: <hex> — <its job: accent / mark and fills only>.
Colour is reserved for: <data, status, the consequence of an action>.

## Type

<Latin family> → <Arabic family> → system, self-hosted. Weights <500/600/700>.
Body <size/line-height>; page title <size/weight/tracking, Latin only>; tabular numerals on figures.

## Surfaces

Card: <fill> + <ring> + <shadow>, radius <n>. Bars and overlays: <recipe>. Dark: <recipe>.
Radii scale: <controls / fields / cards / modals>. Blur: <where it is allowed>.

## Imagery

Icons: <set>, <stroke>, <sizes>. Photos: <ratio>, <treatment>. Empty states: <style>.
Logo: <height in top bar>, <dark-ground variant>, clear space <n>.

## Signature

<The one detail, where it appears, and where it must not.>

## Motion

House motion system — see the `animate` skill's `reference/motion-system.md`. App-specific
deviations: <none | list>.

## Do

- <3–5 lines, concrete: "status = <hue> text on its tint", "figures in tabular numerals">

## Don't

- <3–5 lines, concrete: "no second accent", "no hex in pages — tokens only", "no gradient text">
```
