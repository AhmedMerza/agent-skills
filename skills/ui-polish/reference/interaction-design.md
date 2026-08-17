# Interaction Design

## The Eight Interactive States

Every interactive element needs these states designed:

| State | When | Visual Treatment |
|-------|------|------------------|
| **Default** | At rest | Base styling |
| **Hover** | Pointer over (not touch) | Subtle lift, color shift |
| **Focus** | Keyboard/programmatic focus | Visible ring |
| **Active** | Being pressed | Pressed in, darker |
| **Disabled** | Not interactive | Reduced opacity, no pointer |
| **Loading** | Processing | Spinner, skeleton |
| **Error** | Invalid state | Red border, icon, message |
| **Success** | Completed | Green check, confirmation |

**The common miss**: Designing hover without focus, or vice versa. Keyboard users never see hover states.

**Flutter has no CSS state pseudo-classes.** States come from `WidgetStateProperty`/`WidgetState.hovered|focused|pressed|disabled|selected` (renamed from `MaterialStateProperty`), or explicit widgets: `InkWell`/`GestureDetector` for press, `MouseRegion` for hover, `Focus`/`FocusNode` for focus. Hover only fires on desktop/web — touch never sees it. Disabled has no separate flag: `onPressed: null` *is* the disabled state.

## Focus Rings: Do Them Right

**Never `outline: none` without replacement.**

```css
button:focus { outline: none; }

button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

**Flutter**

```dart
Focus(
  onFocusChange: (has) => setState(() => _focused = has),
  child: InkWell(focusColor: theme.accentColor, onTap: () {}, child: label),
)
```

Flutter draws no focus ring by default on most custom widgets — you opt in explicitly via `focusColor`/`Focus`, unlike the browser's built-in outline.

**Focus ring design**: High contrast (3:1 minimum), 2-3px thick, offset from element, consistent everywhere.

## Form Design

**Placeholders aren't labels**—they disappear on input. Always use visible `<label>` elements. **Validate on blur**, not on every keystroke (exception: password strength). Place errors **below** fields with `aria-describedby`.

### Vuetify Form Patterns

- `v-text-field` has built-in label, error messages, and validation via `:rules`
- Use `v-form` with `ref` for programmatic validation
- Error messages appear below fields automatically
- Use `persistent-hint` for format guidance that doesn't disappear

### Flutter Form Patterns

- `TextFormField` + `InputDecoration(labelText:, errorText:)` for built-in label/error display
- Wrap fields in a `Form` with a `GlobalKey<FormState>` for programmatic validation (`formKey.currentState!.validate()`)
- Set `autovalidateMode: AutovalidateMode.onUserInteraction` to validate after first interaction, not every keystroke
- `FormField<T>` for custom fields that need the same validation/error plumbing

## Loading States

**Optimistic updates**: Show success immediately, rollback on failure. Use for low-stakes actions, not payments.
**Skeleton screens > spinners**—they preview content shape and feel faster.

### Vue Loading Patterns

```vue
<template>
  <v-skeleton-loader v-if="loading" type="card" />
  <div v-else>{{ content }}</div>
</template>
```

### Flutter Loading Patterns

```dart
loading
    ? const _SkeletonCard()   // custom shimmer widget
    : ContentCard(data: content)
```

Flutter has no built-in skeleton widget — build one with a pulsing `AnimatedOpacity`/gradient shimmer, or swap subtrees like above.

## Overlay Positioning

Dropdowns inside `overflow: hidden` containers will be clipped. Solutions:

### Vuetify's Built-in Handling

Vuetify's `v-menu`, `v-select`, `v-autocomplete` use `<Teleport to="body">` internally—they escape overflow containers automatically. This is one of Vuetify's strongest features.

### Flutter's Built-in Handling

Flutter has no DOM to clip against — `showModalBottomSheet`, `showDialog`, and `Navigator` push into the app's overlay stack above everything, so there's no overflow-clipping problem to solve. Focus trapping inside these is handled for you, unlike on the web.

### Custom Overlays

For custom overlays outside Vuetify components:

```vue
<Teleport to="body">
  <div class="custom-dropdown" :style="dropdownPosition">
    <!-- content -->
  </div>
</Teleport>
```

Calculate position from trigger's `getBoundingClientRect()`. Recalculate on scroll and resize.

### Anti-Patterns

- `position: absolute` inside `overflow: hidden` — will be clipped
- Arbitrary `z-index: 9999` — use semantic z-index scale
- Rendering overlay inline without escape hatch from parent's stacking context

## Destructive Actions: Undo > Confirm

**Undo is better than confirmation dialogs**—users click through confirmations mindlessly. Remove from UI immediately, show undo toast, actually delete after toast expires.

Use confirmation only for:
- Truly irreversible actions (account deletion)
- High-cost actions
- Batch operations

## Keyboard Navigation

### Roving Tabindex

For component groups (tabs, menu items, radio groups), one item is tabbable; arrow keys move within:

```html
<div role="tablist">
  <button role="tab" tabindex="0">Tab 1</button>
  <button role="tab" tabindex="-1">Tab 2</button>
  <button role="tab" tabindex="-1">Tab 3</button>
</div>
```

Vuetify's `v-tabs`, `v-btn-toggle`, and `v-radio-group` handle roving tabindex automatically.

**Flutter**: arrow-key/D-pad traversal within a group uses `FocusTraversalGroup`; widgets like `TabBar` handle it internally, same idea as Vuetify above.

## Gesture Discoverability

Swipe-to-delete and similar gestures are invisible. Always provide a visible fallback (menu with "Delete"). Don't rely on gestures as the only way to perform actions.

---

**Avoid**: Removing focus indicators without alternatives. Using placeholder text as labels. Touch targets <44×44px (web/iOS) / <48×48dp (Flutter Material — `MaterialTapTargetSize`, button `minimumSize`). Generic error messages. Custom controls without ARIA/keyboard support.
