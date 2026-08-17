# Spatial Design

## Spacing Systems

### Use 4pt Base, Not 8pt

8pt systems are too coarse—you'll frequently need 12px (between 8 and 16). Use 4pt for granularity: 4, 8, 12, 16, 24, 32, 48, 64, 96px.

### Name Tokens Semantically

Name by relationship (`--space-sm`, `--space-lg`), not value (`--spacing-8`). Use `gap` instead of margins for sibling spacing—it eliminates margin collapse and cleanup hacks.

**Flutter** has no margin-collapse to begin with — `Column`/`Row` don't merge adjacent spacing. Use `SizedBox(height: 16)` between children, or the `gap` package's `Gap(16)` for a one-line equivalent of CSS `gap`.

## Grid Systems

### The Self-Adjusting Grid

Use `repeat(auto-fit, minmax(280px, 1fr))` for responsive grids without breakpoints. For complex layouts, use named grid areas and redefine them at breakpoints.

**Flutter**

```dart
GridView(gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 280))
```

## Visual Hierarchy

### The Squint Test

Blur your eyes (or screenshot and blur). Can you still identify:
- The most important element?
- The second most important?
- Clear groupings?

If everything looks the same weight blurred, you have a hierarchy problem.

### Hierarchy Through Multiple Dimensions

Don't rely on size alone. Combine:

| Tool | Strong Hierarchy | Weak Hierarchy |
|------|------------------|----------------|
| **Size** | 3:1 ratio or more | <2:1 ratio |
| **Weight** | Bold vs Regular | Medium vs Regular |
| **Color** | High contrast | Similar tones |
| **Position** | Top/left (primary) | Bottom/right |
| **Space** | Surrounded by white space | Crowded |

**The best hierarchy uses 2-3 dimensions at once.**

### Cards Are Not Required

Cards are overused. Spacing and alignment create visual grouping naturally. Use cards only when content is truly distinct and actionable. **Never nest cards inside cards**—use spacing, typography, and subtle dividers for hierarchy within a card.

## Container Queries

Viewport queries are for page layouts. **Container queries are for components**:

```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { grid-template-columns: 120px 1fr; }
}
```

**Flutter**: `LayoutBuilder` reads the parent's constraints directly — no opt-in needed:

```dart
LayoutBuilder(
  builder: (context, c) => c.maxWidth > 400 ? TwoColumnCard() : OneColumnCard(),
)
```

A card in a narrow sidebar stays compact; the same card in main content expands—automatically.

## Optical Adjustments

Text at `margin-left: 0` looks indented due to letterform whitespace—use negative margin (`-0.05em`) to optically align. Geometrically centered icons often look off-center; play icons need to shift right.

**Flutter**: `Transform.translate(offset: Offset(-2, 0))` nudges without disturbing layout — negative `EdgeInsets` values work too but can misbehave under tight constraints.

### Touch Targets vs Visual Size

Buttons can look small but need large touch targets (44px minimum). Use padding or pseudo-elements:

```css
.icon-button {
  width: 24px;
  height: 24px;
  position: relative;
}
.icon-button::before {
  content: '';
  position: absolute;
  inset: -10px;  /* Expand tap target to 44px */
}
```

**Flutter**: widgets like `IconButton` take a `constraints` param separate from `iconSize`, expanding the hit area without growing the visual icon:

```dart
IconButton(
  iconSize: 24,
  constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
)
```

## Depth & Elevation

Create semantic z-index scales (dropdown → sticky → modal-backdrop → modal → toast → tooltip) instead of arbitrary numbers. Shadows should be subtle—if you can clearly see it, it's probably too strong.

**Flutter** has no `box-shadow` string syntax — shadows are a `List<BoxShadow>` on a `BoxDecoration`, or the `elevation` prop on Material widgets directly:

```dart
BoxDecoration(
  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))],
)
```

## Vuetify Spatial Notes

Vuetify uses a 4px spacing scale via `ma-*`, `pa-*`, `ga-*` utility classes (where 1 unit = 4px). This aligns with the 4pt base:
- `pa-2` = 8px, `pa-3` = 12px, `pa-4` = 16px
- Use `v-row` + `v-col` for grid layouts with built-in gutters
- Vuetify's elevation system (`elevation-*`) provides consistent shadow scales
- Prefer Vuetify's spacing utilities over custom CSS for consistency

## Flutter Spatial Notes

No utility classes — spacing is compositional: `Padding(padding: EdgeInsets.all(16))`, `SizedBox(height: 16)`, or `Gap(16)` (third-party `gap` package, not core Flutter).
- **Use `EdgeInsetsDirectional`, not `EdgeInsets`, for anything that should flip in RTL** — `EdgeInsets.only(left: 16)` stays left in Arabic; `EdgeInsetsDirectional.only(start: 16)` flips correctly
- `VisualDensity` compresses or expands built-in Material widget spacing globally (`VisualDensity.compact` for dense data tables) — the closest thing to a density toggle

---

**Avoid**: Arbitrary spacing values outside your scale. Making all spacing equal (variety creates hierarchy). Creating hierarchy through size alone.
