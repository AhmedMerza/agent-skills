# Typography

## Classic Typography Principles

### Vertical Rhythm

Your line-height should be the base unit for ALL vertical spacing. If body text has `line-height: 1.5` on `16px` type (= 24px), spacing values should be multiples of 24px. This creates subconscious harmony—text and space share a mathematical foundation.

### Modular Scale & Hierarchy

The common mistake: too many font sizes that are too close together (14px, 15px, 16px, 18px...). This creates muddy hierarchy.

**Use fewer sizes with more contrast.** A 5-size system covers most needs:

| Role | Typical Ratio | Use Case |
|------|---------------|----------|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem | Body text |
| lg | 1.25-1.5rem | Subheadings, lead text |
| xl+ | 2-4rem | Headlines, hero text |

Popular ratios: 1.25 (major third), 1.333 (perfect fourth), 1.5 (perfect fifth). Pick one and commit.

### Readability & Measure

Use `ch` units for character-based measure (`max-width: 65ch`). Line-height scales inversely with line length—narrow columns need tighter leading, wide columns need more.

**Non-obvious**: Increase line-height for light text on dark backgrounds. The perceived weight is lighter, so text needs more breathing room. Add 0.05-0.1 to your normal line-height.

## Font Selection & Pairing

### Choosing Distinctive Fonts

**Avoid the invisible defaults**: Inter, Roboto, Open Sans, Lato, Montserrat. These are everywhere, making your design feel generic.

**Better Google Fonts alternatives**:
- Instead of Inter → **Instrument Sans**, **Plus Jakarta Sans**, **Outfit**
- Instead of Roboto → **Onest**, **Figtree**, **Urbanist**
- Instead of Open Sans → **Source Sans 3**, **Nunito Sans**, **DM Sans**
- For editorial/premium feel → **Fraunces**, **Newsreader**, **Lora**

**System fonts are underrated**: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable. Consider this for apps where performance > personality.

### Pairing Principles

**The non-obvious truth**: You often don't need a second font. One well-chosen font family in multiple weights creates cleaner hierarchy than two competing typefaces.

When pairing, contrast on multiple axes:
- Serif + Sans (structure contrast)
- Geometric + Humanist (personality contrast)
- Condensed display + Wide body (proportion contrast)

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs). They create visual tension without clear hierarchy.

### Web Font Loading

```css
/* 1. Use font-display: swap for visibility */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* 2. Match fallback metrics to minimize shift */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 10%;
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

Tools like [Fontaine](https://github.com/unjs/fontaine) calculate these overrides automatically.

## Modern Web Typography

### Fluid Type

Fluid typography via `clamp(min, preferred, max)` scales text smoothly with the viewport.

**Use fluid type for**: Headings and display text on marketing/content pages.

**Use fixed `rem` scales for**: App UIs, dashboards, and data-dense interfaces. No major design system uses fluid type in product UI—fixed scales with optional breakpoint adjustments give the spatial predictability that container-based layouts need.

### OpenType Features

```css
/* Tabular numbers for data alignment */
.data-table { font-variant-numeric: tabular-nums; }

/* Proper fractions */
.recipe-amount { font-variant-numeric: diagonal-fractions; }

/* Small caps for abbreviations */
abbr { font-variant-caps: all-small-caps; }

/* Disable ligatures in code */
code { font-variant-ligatures: none; }

/* Enable kerning */
body { font-kerning: normal; }
```

Check what features your font supports at [Wakamai Fondue](https://wakamaifondue.com/).

## Vuetify Typography Notes

Vuetify provides typography classes (`text-h1` through `text-h6`, `text-subtitle-1`, `text-body-1`, etc.) mapped to Material Design's type scale. When customizing:
- Override via `$typography` Sass variables or `defaults` in `createVuetify()`
- Use Vuetify's classes for consistency; avoid mixing raw CSS font sizes with Vuetify's type scale
- `font-variant-numeric: tabular-nums` is essential for data tables with `v-data-table`

## Accessibility

- **Never disable zoom**: `user-scalable=no` breaks accessibility
- **Use rem/em for font sizes**: Respects user browser settings
- **Minimum 16px body text**: Smaller strains eyes and fails WCAG on mobile
- **Adequate touch targets**: Text links need padding or line-height that creates 44px+ tap targets

---

**Avoid**: More than 2-3 font families per project. Skipping fallback font definitions. Using decorative fonts for body text. Ignoring font loading performance.
