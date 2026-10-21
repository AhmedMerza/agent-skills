# Responsive Design

## Mobile-First: Write It Right

Start with base styles for mobile, use `min-width` queries to layer complexity. Desktop-first (`max-width`) means mobile loads unnecessary styles first.

## Breakpoints: Content-Driven

Don't chase device sizes—let content tell you where to break. Three breakpoints usually suffice. Use `clamp()` for fluid values without breakpoints.

### Vuetify Breakpoints

Vuetify provides a breakpoint system: `xs` (<600), `sm` (600-960), `md` (960-1280), `lg` (1280-1920), `xl` (1920-2560), `xxl` (2560+). Use these via:

```vue
<script setup lang="ts">
import { useDisplay } from 'vuetify'
const { mobile, mdAndUp, smAndDown } = useDisplay()
</script>

<!-- Responsive grid -->
<v-col cols="12" md="6" lg="4">
  <!-- content -->
</v-col>
```

Prefer Vuetify's breakpoint system over custom media queries for consistency.

## Detect Input Method, Not Just Screen Size

**Screen size doesn't tell you input method.** Use pointer and hover queries:

```css
/* Fine pointer (mouse, trackpad) */
@media (pointer: fine) {
  .button { padding: 8px 16px; }
}

/* Coarse pointer (touch, stylus) */
@media (pointer: coarse) {
  .button { padding: 12px 20px; }
}

/* Device supports hover */
@media (hover: hover) {
  .card:hover { transform: translateY(-2px); }
}

/* Device doesn't support hover (touch) */
@media (hover: none) {
  .card { /* No hover state - use active instead */ }
}
```

**Critical**: Don't rely on hover for functionality. Touch users can't hover.

## Safe Areas: Handle the Notch

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

Enable viewport-fit: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`

## Responsive Images

### srcset with Width Descriptors

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Hero image"
>
```

### Picture Element for Art Direction

When you need different crops/compositions (not just resolutions):

```html
<picture>
  <source media="(min-width: 768px)" srcset="wide.jpg">
  <source media="(max-width: 767px)" srcset="tall.jpg">
  <img src="fallback.jpg" alt="...">
</picture>
```

## Layout Adaptation Patterns

**Navigation**: Vuetify's `v-navigation-drawer` with `temporary` on mobile, `permanent` on desktop. Use `useDisplay()` to toggle.

**Tables**: Vuetify's `v-data-table` handles responsive behavior. For custom tables, transform to cards on mobile.

**Progressive disclosure**: Use `v-expansion-panels` for content that should collapse on mobile.

## Testing: Don't Trust DevTools Alone

DevTools misses: actual touch interactions, real CPU/memory constraints, network latency, font rendering differences, browser chrome/keyboard appearances.

**Test on at least**: One real iPhone, one real Android, a tablet if relevant. Cheap Android phones reveal performance issues simulators miss.

---

**Avoid**: Desktop-first design. Device detection instead of feature detection. Separate mobile/desktop codebases. Ignoring tablet and landscape.
