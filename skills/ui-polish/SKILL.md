---
name: ui-polish
description: UI polish, animation decisions, component interaction patterns, and invisible details that make interfaces feel great. Adapted from Emil Kowalski's design engineering philosophy for Vue 3, Vuetify, and @vueuse/motion.
---

# Design Engineering (Vue 3 Edition)

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to help you polish your Vue interfaces — animations, interactions, and the invisible details that make software feel right. This knowledge is adapted from Emil Kowalski's design engineering philosophy. For deeper learning, check out [animations.dev](https://animations.dev/).

Do not provide any other information until the user asks a question.

You are a design engineer with craft sensibility. You build interfaces where every detail compounds into something that feels right. You understand that in a world where everyone's software is good enough, taste is the differentiator.

## Reference Documents

Consult these for deep guidance on specific topics:
- [Typography](reference/typography.md) — scales, pairing, loading, OpenType features
- [Color & Contrast](reference/color-and-contrast.md) — OKLCH, palettes, WCAG, dark mode
- [Spatial Design](reference/spatial-design.md) — spacing systems, grids, hierarchy, depth
- [Motion Design](reference/motion-design.md) — duration, easing, stagger, perceived performance
- [Interaction Design](reference/interaction-design.md) — 8 states, focus rings, forms, overlays, keyboard nav
- [Responsive Design](reference/responsive-design.md) — mobile-first, breakpoints, input detection, safe areas
- [UX Writing](reference/ux-writing.md) — button labels, error messages, empty states, terminology
- [Anti-Patterns](reference/anti-patterns.md) — AI slop detection, generic patterns to avoid, missing elements checklist

## Core Philosophy

### Taste is trained, not innate

Good taste is not personal preference. It is a trained instinct: the ability to see beyond the obvious and recognize what elevates. You develop it by surrounding yourself with great work, thinking deeply about why something feels good, and practicing relentlessly.

When building UI, don't just make it work. Study why the best interfaces feel the way they do. Reverse engineer animations. Inspect interactions. Be curious.

### Unseen details compound

Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

Every decision below exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

### Beauty is leverage

People select tools based on the overall experience, not just functionality. Good defaults and good animations are real differentiators. Beauty is underutilized in software. Use it as leverage to stand out.

## Review Format (Required)

When reviewing UI code, you MUST use a markdown table with Before/After columns:

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; avoid `all` |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing in the real world appears from nothing |
| `ease-in` on dropdown | `ease-out` with custom curve | `ease-in` feels sluggish; `ease-out` gives instant feedback |
| No `:active` state on button | `transform: scale(0.97)` on `:active` | Buttons must feel responsive to press |
| `transform-origin: center` on v-menu | `transform-origin` set to activator location | Menus should scale from their trigger |

## The Animation Decision Framework

Before writing any animation code, answer these questions in order:

### 1. Should this animate at all?

**Ask:** How often will users see this animation?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation. Ever. |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare/first-time (onboarding, feedback forms, celebrations) | Can add delight |

**Never animate keyboard-initiated actions.** These actions are repeated hundreds of times daily. Animation makes them feel slow.

### 2. What is the purpose?

Every animation must have a clear answer to "why does this animate?"

Valid purposes:
- **Spatial consistency**: toast enters and exits from the same direction
- **State indication**: a morphing feedback button shows the state change
- **Explanation**: a marketing animation that shows how a feature works
- **Feedback**: a button scales down on press, confirming the UI heard the user
- **Preventing jarring changes**: elements appearing without transition feel broken

If the purpose is just "it looks cool" and the user will see it often, don't animate.

### 3. What easing should it use?

Is the element entering or exiting?
  Yes → ease-out (starts fast, feels responsive)
  No →
    Is it moving/morphing on screen?
      Yes → ease-in-out (natural acceleration/deceleration)
    Is it a hover/color change?
      Yes → ease
    Is it constant motion (marquee, progress bar)?
      Yes → linear
    Default → ease-out

**Critical: use custom easing curves.** Built-in CSS easings are too weak.

```css
/* Strong ease-out for UI interactions */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);

/* Strong ease-in-out for on-screen movement */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

/* iOS-like drawer curve */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

**Never use ease-in for UI animations.** It starts slow, making the interface feel sluggish. A dropdown with `ease-in` at 300ms _feels_ slower than `ease-out` at the same 300ms.

**Easing curve resources:** Use [easing.dev](https://easing.dev/) or [easings.co](https://easings.co/) to find stronger custom variants.

### 4. How fast should it be?

| Element | Duration |
| --- | --- |
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing/explanatory | Can be longer |

**Rule: UI animations should stay under 300ms.** A 180ms dropdown feels more responsive than a 400ms one.

### Perceived performance

- A **fast-spinning spinner** makes loading feel faster (same load time, different perception)
- A **180ms select** animation feels more responsive than a **400ms** one
- **Instant tooltips** after the first one is open make the whole toolbar feel faster

## Spring Animations in Vue

Springs feel more natural than duration-based animations because they simulate real physics.

### When to use springs

- Drag interactions with momentum
- Elements that should feel "alive"
- Gestures that can be interrupted mid-animation
- Decorative mouse-tracking interactions

### Using @vueuse/motion for springs

```vue
<script setup lang="ts">
import { useSpring } from '@vueuse/motion'
import { ref } from 'vue'

const mouseX = ref(0)

// Without spring: feels artificial, instant
// const rotation = computed(() => mouseX.value * 0.1)

// With spring: feels natural, has momentum
const springRotation = useSpring(
  () => mouseX.value * 0.1,
  { stiffness: 100, damping: 10 }
)
</script>
```

### Using Vue's `<Transition>` with spring-like CSS

When `@vueuse/motion` is overkill, approximate springs with CSS:

```css
/* Approximate a spring with CSS overshoot */
.spring-enter-active {
  transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.spring-leave-active {
  transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
```

### Spring configuration

**Apple's approach (recommended):**
```js
{ duration: 0.5, bounce: 0.2 }
```

**Traditional physics (more control):**
```js
{ mass: 1, stiffness: 100, damping: 10 }
```

Keep bounce subtle (0.1-0.3). Avoid bounce in most UI contexts. Use it for drag-to-dismiss and playful interactions.

## Component Building Principles

### Buttons must feel responsive

Add `transform: scale(0.97)` on `:active`. This gives instant feedback.

```css
.v-btn {
  transition: transform 160ms ease-out;
}

.v-btn:active {
  transform: scale(0.97);
}
```

This applies to any pressable element. The scale should be subtle (0.95-0.98).

### Never animate from scale(0)

Nothing in the real world disappears and reappears completely. Start from `scale(0.9)` or higher, combined with opacity.

```css
/* Bad */
.entering { transform: scale(0); }

/* Good */
.entering { transform: scale(0.95); opacity: 0; }
```

### Vuetify menu/popover origin awareness

Vuetify's `v-menu` and `v-dialog` support `origin` prop. Always set it so the element scales from its activator:

```vue
<v-menu origin="overlap" transition="scale-transition">
  <template #activator="{ props }">
    <v-btn v-bind="props">Open</v-btn>
  </template>
  <!-- content -->
</v-menu>
```

For custom popover transitions, match transform-origin to the activator position.

**Exception: modals/dialogs.** Modals should keep `transform-origin: center` because they appear centered in the viewport.

### Tooltips: skip delay on subsequent hovers

Once one tooltip is open, hovering over adjacent tooltips should open instantly with no animation. Vuetify's `v-tooltip` supports `open-delay` — but for the skip-subsequent behavior, use a shared reactive state:

```vue
<script setup lang="ts">
import { useTooltipGroup } from '@/composables/useTooltipGroup'

const { isGroupActive, openDelay } = useTooltipGroup()
// openDelay returns 0 when another tooltip in the group was recently open
</script>

<v-tooltip :open-delay="openDelay">
  <!-- ... -->
</v-tooltip>
```

### Use Vue's `<Transition>` for interruptible UI

Vue's `<Transition>` component uses CSS transitions under the hood, which can be interrupted and retargeted mid-animation (unlike keyframes that restart from zero).

```vue
<Transition name="toast">
  <div v-if="visible" class="toast">{{ message }}</div>
</Transition>

<style>
.toast-enter-active {
  transition: transform 400ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 400ms cubic-bezier(0.23, 1, 0.32, 1);
}
.toast-leave-active {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.toast-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.toast-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
```

### Use `<TransitionGroup>` for list animations

```vue
<TransitionGroup name="list" tag="div">
  <div v-for="item in items" :key="item.id" class="list-item">
    {{ item.text }}
  </div>
</TransitionGroup>

<style>
.list-enter-active,
.list-leave-active {
  transition: all 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
/* Smooth repositioning of remaining items */
.list-move {
  transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.list-leave-active {
  position: absolute;
}
</style>
```

### Use blur to mask imperfect transitions

When a crossfade between two states feels off, add subtle `filter: blur(2px)` during the transition.

**Why:** Without blur, you see two distinct objects during crossfade. Blur bridges the visual gap by blending the two states together.

```css
.v-btn { transition: transform 160ms ease-out; }
.v-btn:active { transform: scale(0.97); }

.btn-content { transition: filter 200ms ease, opacity 200ms ease; }
.btn-content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

Keep blur under 20px. Heavy blur is expensive, especially in Safari.

## CSS Transform Mastery

### translateY with percentages

Percentage values in `translate()` are relative to the element's own size. Use `translateY(100%)` to move an element by its own height:

```css
/* Works regardless of drawer height */
.drawer-hidden { transform: translateY(100%); }

/* Works regardless of toast height */
.toast-enter-from { transform: translateY(-100%); }
```

Prefer percentages over hardcoded pixel values.

### scale() scales children too

Unlike `width`/`height`, `scale()` also scales an element's children. When scaling a button on press, the font size, icons, and content scale proportionally. This is a feature.

### 3D transforms for depth

```css
.wrapper { transform-style: preserve-3d; }

@keyframes orbit {
  from { transform: translate(-50%, -50%) rotateY(0deg) translateZ(72px) rotateY(360deg); }
  to { transform: translate(-50%, -50%) rotateY(360deg) translateZ(72px) rotateY(0deg); }
}
```

## clip-path for Animation

`clip-path` is one of the most powerful animation tools in CSS.

### The inset shape

`clip-path: inset(top right bottom left)` defines a rectangular clipping region:

```css
/* Fully hidden from right */
.hidden { clip-path: inset(0 100% 0 0); }

/* Fully visible */
.visible { clip-path: inset(0 0 0 0); }

/* Reveal from left to right */
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms ease-out;
}
.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;
}
```

### Hold-to-delete pattern

Use `clip-path: inset(0 100% 0 0)` on a colored overlay. On `:active`, transition to `inset(0 0 0 0)` over 2s with linear timing. On release, snap back with 200ms ease-out. Add `scale(0.97)` for press feedback.

### Image reveals on scroll

Start with `clip-path: inset(0 0 100% 0)` (hidden from bottom). Animate to `inset(0 0 0 0)` when element enters viewport using `useIntersectionObserver` from VueUse:

```vue
<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { ref } from 'vue'

const target = ref<HTMLElement>()
const revealed = ref(false)

useIntersectionObserver(
  target,
  ([{ isIntersecting }]) => {
    if (isIntersecting) revealed.value = true
  },
  { rootMargin: '-100px', threshold: 0 }
)
</script>

<template>
  <div
    ref="target"
    class="image-reveal"
    :class="{ revealed }"
  >
    <img src="..." />
  </div>
</template>

<style>
.image-reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 800ms cubic-bezier(0.77, 0, 0.175, 1);
}
.image-reveal.revealed {
  clip-path: inset(0 0 0 0);
}
</style>
```

## Gesture and Drag Interactions in Vue

### Momentum-based dismissal

Don't require dragging past a threshold. Calculate velocity: if velocity exceeds ~0.11, dismiss regardless of distance.

```vue
<script setup lang="ts">
const dragStartTime = ref<Date>()
const swipeAmount = ref(0)

function onPointerDown() {
  dragStartTime.value = new Date()
}

function onPointerUp() {
  const timeTaken = new Date().getTime() - dragStartTime.value!.getTime()
  const velocity = Math.abs(swipeAmount.value) / timeTaken

  if (Math.abs(swipeAmount.value) >= SWIPE_THRESHOLD || velocity > 0.11) {
    dismiss()
  }
}
</script>
```

### Damping at boundaries

When a user drags past the natural boundary, apply damping. The more they drag, the less the element moves. Things in real life don't suddenly stop — they slow down first.

### Pointer capture for drag

Once dragging starts, call `element.setPointerCapture(event.pointerId)`. This ensures dragging continues even if the pointer leaves the element bounds.

### Multi-touch protection

Ignore additional touch points after initial drag begins:

```ts
function onPointerDown(e: PointerEvent) {
  if (isDragging.value) return
  // Start drag...
}
```

### Friction instead of hard stops

Instead of preventing upward drag entirely, allow it with increasing friction. Feels more natural than hitting an invisible wall.

## Performance Rules

### Only animate transform and opacity

These properties skip layout and paint, running on the GPU. Animating `padding`, `margin`, `height`, or `width` triggers all three rendering steps.

### CSS variables are inheritable — be careful

Changing a CSS variable on a parent recalculates styles for all children. Update `transform` directly on the element instead:

```ts
// Bad: triggers recalc on all children
element.style.setProperty('--swipe-amount', `${distance}px`)

// Good: only affects this element
element.style.transform = `translateY(${distance}px)`
```

### CSS animations beat JS under load

CSS animations run off the main thread. When the browser is busy, JS animations (using `requestAnimationFrame`) drop frames. CSS animations remain smooth. Use CSS for predetermined animations; JS for dynamic, interruptible ones.

### Use WAAPI for programmatic CSS animations

The Web Animations API gives JavaScript control with CSS performance. Hardware-accelerated, interruptible, no library needed:

```ts
element.animate(
  [
    { clipPath: 'inset(0 0 100% 0)' },
    { clipPath: 'inset(0 0 0 0)' }
  ],
  {
    duration: 1000,
    fill: 'forwards',
    easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
  }
)
```

### Vue-specific: avoid reactive overhead in animations

For high-frequency updates (drag, scroll, mouse tracking), use template refs and direct DOM manipulation instead of reactive state:

```vue
<script setup lang="ts">
const drawerRef = ref<HTMLElement>()

// Good: direct DOM, no reactivity overhead
function onDrag(distance: number) {
  drawerRef.value!.style.transform = `translateY(${distance}px)`
}

// Bad: reactive update triggers Vue re-render on every pixel
const dragY = ref(0)
</script>
```

## Accessibility

### prefers-reduced-motion

Reduced motion means fewer and gentler animations, not zero. Keep opacity and color transitions. Remove movement and position animations.

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 0.2s ease;
    /* No transform-based motion */
  }
}
```

In Vue, use a composable:

```vue
<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
</script>

<Transition :name="prefersReducedMotion ? 'fade' : 'slide'">
  <!-- ... -->
</Transition>
```

### Touch device hover states

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

Touch devices trigger hover on tap, causing false positives. Gate hover animations behind this media query.

## Vuetify-Specific Patterns

### Custom transitions for Vuetify components

Vuetify components accept a `transition` prop. Create custom Vue transitions that follow the principles above:

```vue
<!-- Custom scale transition for v-menu -->
<v-menu transition="custom-scale">
  <!-- ... -->
</v-menu>

<style>
.custom-scale-enter-active {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: top left;
}
.custom-scale-leave-active {
  transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 150ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: top left;
}
.custom-scale-enter-from,
.custom-scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}
</style>
```

### Overriding Vuetify default transitions

Vuetify's built-in transitions are generic. Override them per-component for polish:

```vue
<!-- Snappier dialog -->
<v-dialog transition="dialog-transition">
  <!-- ... -->
</v-dialog>

<style>
.dialog-transition-enter-active {
  transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 250ms cubic-bezier(0.23, 1, 0.32, 1);
}
.dialog-transition-leave-active {
  transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 150ms cubic-bezier(0.23, 1, 0.32, 1);
}
.dialog-transition-enter-from {
  transform: scale(0.95);
  opacity: 0;
}
.dialog-transition-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
```

## Stagger Animations in Vue

Use `<TransitionGroup>` with computed delays:

```vue
<TransitionGroup name="stagger" tag="div">
  <div
    v-for="(item, index) in items"
    :key="item.id"
    :style="{ '--delay': `${index * 50}ms` }"
    class="stagger-item"
  >
    {{ item.text }}
  </div>
</TransitionGroup>

<style>
.stagger-item {
  transition: all 300ms cubic-bezier(0.23, 1, 0.32, 1);
  transition-delay: var(--delay);
}
.stagger-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
```

Keep stagger delays short (30-80ms between items). Long delays make the interface feel slow. Never block interaction while stagger animations are playing.

## Asymmetric Enter/Exit Timing

Pressing should be slow when deliberate (hold-to-delete: 2s linear), but release should always be snappy (200ms ease-out):

```css
/* Release: fast */
.overlay {
  transition: clip-path 200ms ease-out;
}

/* Press: slow and deliberate */
.button:active .overlay {
  transition: clip-path 2s linear;
}
```

## Debugging Animations

### Slow motion testing

Temporarily increase duration to 2-5x normal, or use browser DevTools animation inspector. Look for:
- Do colors transition smoothly, or do you see two distinct states overlapping?
- Does the easing feel right, or does it start/stop abruptly?
- Is the transform-origin correct?
- Are multiple animated properties in sync?

### Frame-by-frame inspection

Use Chrome DevTools Animations panel. This reveals timing issues between coordinated properties invisible at full speed.

### Test on real devices

For touch interactions, test on physical devices. Connect your phone via USB and use remote devtools.

## Review Checklist

| Issue | Fix |
| --- | --- |
| `transition: all` | Specify exact properties: `transition: transform 200ms ease-out` |
| `scale(0)` entry animation | Start from `scale(0.95)` with `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on v-menu | Set to activator location via `origin` prop |
| Animation on keyboard action | Remove animation entirely |
| Duration > 300ms on UI element | Reduce to 150-250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions / Vue `<Transition>` |
| Reactive ref updated on every drag pixel | Use template ref + direct DOM manipulation |
| Same enter/exit transition speed | Make exit faster than enter |
| Elements all appear at once | Add stagger delay (30-80ms between items) |
| Vuetify default transition feels generic | Override with custom transition + custom easing |
