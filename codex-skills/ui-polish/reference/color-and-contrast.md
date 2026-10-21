# Color & Contrast

## Color Spaces: Use OKLCH

**Stop using HSL.** Use OKLCH (or LCH) instead. It's perceptually uniform—equal steps in lightness *look* equal, unlike HSL where 50% lightness in yellow looks bright while 50% in blue looks dark.

```css
/* OKLCH: lightness (0-100%), chroma (0-0.4+), hue (0-360) */
--color-primary: oklch(60% 0.15 250);      /* Blue */
--color-primary-light: oklch(85% 0.08 250); /* Same hue, lighter */
--color-primary-dark: oklch(35% 0.12 250);  /* Same hue, darker */
```

**Key insight**: As you move toward white or black, reduce chroma. High chroma at extreme lightness looks garish.

## Building Functional Palettes

### Tinted Neutrals

**Pure gray is dead.** Add a subtle hint of your brand hue to all neutrals:

```css
/* Dead grays */
--gray-100: oklch(95% 0 0);     /* No personality */
--gray-900: oklch(15% 0 0);

/* Warm-tinted grays */
--gray-100: oklch(95% 0.01 60);  /* Hint of warmth */
--gray-900: oklch(15% 0.01 60);

/* Cool-tinted grays (tech, professional) */
--gray-100: oklch(95% 0.01 250); /* Hint of blue */
--gray-900: oklch(15% 0.01 250);
```

The chroma is tiny (0.01) but perceptible. Creates subconscious cohesion.

### Palette Structure

| Role | Purpose | Example |
|------|---------|---------|
| **Primary** | Brand, CTAs, key actions | 1 color, 3-5 shades |
| **Neutral** | Text, backgrounds, borders | 9-11 shade scale |
| **Semantic** | Success, error, warning, info | 4 colors, 2-3 shades each |
| **Surface** | Cards, modals, overlays | 2-3 elevation levels |

**Skip secondary/tertiary unless you need them.** Most apps work fine with one accent color.

### The 60-30-10 Rule

About **visual weight**, not pixel count:
- **60%**: Neutral backgrounds, white space, base surfaces
- **30%**: Secondary colors—text, borders, inactive states
- **10%**: Accent—CTAs, highlights, focus states

The common mistake: using the accent color everywhere. Accent colors work *because* they're rare.

## Contrast & Accessibility

### WCAG Requirements

| Content Type | AA Minimum | AAA Target |
|--------------|------------|------------|
| Body text | 4.5:1 | 7:1 |
| Large text (18px+ or 14px bold) | 3:1 | 4.5:1 |
| UI components, icons | 3:1 | 4.5:1 |
| Non-essential decorations | None | None |

**The gotcha**: Placeholder text still needs 4.5:1.

### Dangerous Color Combinations

- Light gray text on white (the #1 accessibility fail)
- **Gray text on any colored background**—gray looks washed out. Use a darker shade of the background color, or transparency
- Red on green (or vice versa)—8% of men can't distinguish these
- Blue on red (vibrates visually)
- Yellow on white (almost always fails)
- Thin light text on images (unpredictable contrast)

### Never Use Pure Gray or Pure Black

Pure gray and pure black don't exist in nature. Even a chroma of 0.005-0.01 is enough to feel natural.

### Testing

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Browser DevTools → Rendering → Emulate vision deficiencies

## Theming: Light & Dark Mode

### Dark Mode Is Not Inverted Light Mode

| Light Mode | Dark Mode |
|------------|-----------|
| Shadows for depth | Lighter surfaces for depth (no shadows) |
| Dark text on light | Light text on dark (reduce font weight) |
| Vibrant accents | Desaturate accents slightly |
| White backgrounds | Never pure black—use dark gray (oklch 12-18%) |

```css
:root[data-theme="dark"] {
  --surface-1: oklch(15% 0.01 250);
  --surface-2: oklch(20% 0.01 250);  /* "Higher" = lighter */
  --surface-3: oklch(25% 0.01 250);
  --body-weight: 350;  /* Instead of 400 */
}
```

### Token Hierarchy

Use two layers: primitive tokens (`--blue-500`) and semantic tokens (`--color-primary: var(--blue-500)`). For dark mode, only redefine the semantic layer.

## Vuetify Theme Notes

Vuetify's theme system maps to these principles:
- Use `createVuetify({ theme: { themes: { light: {...}, dark: {...} } } })` for semantic tokens
- Vuetify's `bg-surface` and `text-on-surface` handle light/dark automatically
- When adding custom colors, define both light and dark variants
- **VTooltip needs `bg-surface text-on-surface`** for proper dark mode contrast
- Avoid hard-coding hex values in templates — use theme variables or Vuetify color classes

## Alpha Is A Design Smell

Heavy use of transparency usually means an incomplete palette. Alpha creates unpredictable contrast and performance overhead. Define explicit overlay colors for each context instead. Exception: focus rings and interactive states where see-through is needed.

---

**Avoid**: Relying on color alone to convey information. Creating palettes without clear roles. Using pure black (#000) for large areas. Skipping color blindness testing.
