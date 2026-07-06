# Motion Design

## Duration: The 100/300/500 Rule

Timing matters more than easing:

| Duration | Use Case | Examples |
|----------|----------|----------|
| **100-150ms** | Instant feedback | Button press, toggle, color change |
| **200-300ms** | State changes | Menu open, tooltip, hover states |
| **300-500ms** | Layout changes | Accordion, modal, drawer |
| **500-800ms** | Entrance animations | Page load, hero reveals |

**Exit animations are faster than entrances**—use ~75% of enter duration.

## Easing: Pick the Right Curve

**Don't use `ease`.** It's a compromise that's rarely optimal:

| Curve | Use For | CSS |
|-------|---------|-----|
| **ease-out** | Elements entering | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **ease-in** | Elements leaving | `cubic-bezier(0.7, 0, 0.84, 0)` |
| **ease-in-out** | State toggles | `cubic-bezier(0.65, 0, 0.35, 1)` |

**For micro-interactions, use exponential curves:**

```css
/* Quart out - smooth, refined (recommended default) */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

/* Quint out - slightly more dramatic */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);

/* Expo out - snappy, confident */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

**Avoid bounce and elastic curves.** They were trendy in 2015 but now feel tacky. Real objects don't bounce—they decelerate smoothly.

## The Only Two Properties You Should Animate

**transform** and **opacity** only—everything else causes layout recalculation. For height animations (accordions), use `grid-template-rows: 0fr → 1fr` instead of animating `height` directly.

## Staggered Animations

Use CSS custom properties for cleaner stagger:

```css
.item {
  animation-delay: calc(var(--i, 0) * 50ms);
}
```

With `style="--i: 0"` on each item. **Cap total stagger time**—10 items at 50ms = 500ms total.

### Vue `<TransitionGroup>` Stagger

```vue
<TransitionGroup name="stagger" tag="div">
  <div
    v-for="(item, index) in items"
    :key="item.id"
    :style="{ '--delay': `${index * 50}ms` }"
  >
    {{ item.text }}
  </div>
</TransitionGroup>

<style>
.stagger-enter-active { transition-delay: var(--delay); }
</style>
```

## Reduced Motion

This is not optional. Vestibular disorders affect ~35% of adults over 40.

```css
@media (prefers-reduced-motion: reduce) {
  .card { animation: fade-in 200ms ease-out; }
}
```

**What to preserve**: Progress bars, loading spinners (slowed down), and focus indicators.

### Vue Composable

```vue
<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
</script>

<Transition :name="prefersReducedMotion ? 'fade' : 'slide'">
  <!-- ... -->
</Transition>
```

## Perceived Performance

**Nobody cares how fast your site is—just how fast it feels.**

**The 80ms threshold**: Our brains buffer sensory input for ~80ms. Anything under 80ms feels instant.

**Strategies:**
- **Optimistic UI**: Update the interface immediately, handle failures gracefully. Use for low-stakes actions; avoid for payments or destructive operations.
- **Preemptive start**: Begin transitions immediately while loading (skeleton UI).
- **Early completion**: Show content progressively—don't wait for everything.

**Easing affects perceived duration**: Ease-in toward a task's end compresses perceived time.

**Caution**: Too-fast responses can decrease perceived value. Users may distrust instant results for complex operations.

## Performance

Don't use `will-change` preemptively—only when animation is imminent. For scroll-triggered animations, use `IntersectionObserver` (or VueUse's `useIntersectionObserver`); unobserve after animating once.

---

**Avoid**: Animating everything (animation fatigue is real). Using >500ms for UI feedback. Ignoring `prefers-reduced-motion`. Using animation to hide slow loading.
