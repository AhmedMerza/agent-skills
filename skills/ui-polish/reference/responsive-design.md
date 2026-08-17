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

### Flutter Breakpoints

Flutter has no media queries or container queries. `MediaQuery.sizeOf(context)` gives screen width for global breakpoints (prefer it over `MediaQuery.of(context).size` — it scopes rebuilds to size changes only). `LayoutBuilder` gives the *parent's* constraints, not the screen — it's the closest thing to a CSS container query.

```dart
final width = MediaQuery.sizeOf(context).width;
return width >= 900 ? const TabletLayout() : const PhoneLayout();
```

These apps target phone and tablet both — don't skip the tablet breakpoint because the simulator defaults to phone.

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

**Flutter**: no `hover`/`pointer` media-query equivalent — `MouseRegion` hover callbacks simply never fire on touch, so hover-only code is naturally inert rather than needing a feature query. For platform branching, use `Platform.isIOS`/`Platform.isAndroid`/`kIsWeb` instead of guessing from pointer type.

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

**Flutter**

```dart
SafeArea(
  child: Scaffold(body: content),
)
```

For manual control (e.g. only the bottom inset), read `MediaQuery.paddingOf(context)` directly. Keyboard inset is separate: `MediaQuery.viewInsetsOf(context).bottom`.

## Text Scaling: OS-Level Font Scaling

Mobile OS font scaling goes further than browser zoom ever does—users on Android/iOS commonly run 150-200% text scale for accessibility. A layout with hardcoded heights or clipped-by-default rows will silently truncate text at scale, in production.

```dart
final scaler = MediaQuery.textScalerOf(context);
```

Size containers to their content (`Wrap`, `Flexible`, intrinsic sizing) instead of fixed heights, and test every screen at the largest OS text-scale setting, not just the default.

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

**Navigation**: Vuetify's `v-navigation-drawer` with `temporary` on mobile, `permanent` on desktop. Use `useDisplay()` to toggle. **Flutter**: `Drawer` (modal) on phone, `NavigationRail` or a permanent `Drawer` on tablet width — branch on `MediaQuery.sizeOf(context).width` inside a `LayoutBuilder`.

**Tables**: Vuetify's `v-data-table` handles responsive behavior. For custom tables, transform to cards on mobile. **Flutter**: `DataTable` doesn't reflow on its own — swap to a `ListView` of cards below your breakpoint, same pattern as the web.

**Progressive disclosure**: Use `v-expansion-panels` for content that should collapse on mobile. **Flutter**: `ExpansionPanelList` or `ExpansionTile` for the same collapse-on-mobile pattern.

## Testing: Don't Trust DevTools Alone

DevTools misses: actual touch interactions, real CPU/memory constraints, network latency, font rendering differences, browser chrome/keyboard appearances.

**Test on at least**: One real iPhone, one real Android, a tablet if relevant. Cheap Android phones reveal performance issues simulators miss.

---

**Avoid**: Desktop-first design. Device detection instead of feature detection. Separate mobile/desktop codebases. Ignoring tablet and landscape (Flutter: `OrientationBuilder` reacts to rotation directly, not just width).
