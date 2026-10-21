# Vue 3 / Vuetify motion recipes

Zero-dependency by default (WAAPI + CSS + Vue `<Transition>`). Where real spring physics or auto-FLIP helps, an optional lib is noted. Adapt selectors/refs to the real component. All examples assume `<script setup lang="ts">`.

> **Reach for Vuetify's built-in transitions first.** Before hand-rolling any `<Transition>` below, check whether a Vuetify component already does it: `v-expand-transition` (height reveals), `v-fade-transition`, `v-scroll-x/y-transition`, and the `transition` prop on `v-dialog`/`v-menu`/`v-snackbar`/`v-expansion-panel`/etc. They keep motion consistent with the app and handle reduced-motion for you. Hand-roll only when the built-in can't express the choreography (overshoot, real travel, a secondary reaction) — then the recipes here apply.
>
> **Reduced motion keeps the state legible.** The `@media (prefers-reduced-motion: reduce)` blocks below drop *transforms*, not *meaning*. Where motion is the only signal of a state change (success-morph, count-up, a toggle), make sure a non-motion cue survives — the color swap, the new value, an icon change — applied instantly. Never reduce a combo down to "nothing happened."

Check `package.json` for what's installed before reaching for a lib: if `@vueuse/core` is present its helpers are free to use; `motion` / `@vueuse/motion` / `@formkit/auto-animate` should be **proposed** as an install before use if absent. In Laravel apps, `animate.css` (if present) is typically legacy-Blade — don't reach for it in `.vue`.

## Shared tokens — create these FIRST

Iteration stays cheap only when curves/durations live in one place. Most recipes below are pure `<style scoped>`, so the **canonical source is a CSS custom-property file** (importable everywhere, no JS); the TS object mirrors it for WAAPI/JS-authored motion. Create both once, then every recipe references `var(--ease-*)` / `EASE.*` — never a pasted literal.

```css
/* motion.scss (in your styles dir) — import it once from your app entry,
   or just append this :root block to your existing global stylesheet. */
:root {
  --ease-out:       cubic-bezier(0.23, 1, 0.32, 1);     /* strong ease-out — enters, feedback */
  --ease-in-out:    cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen movement */
  --ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);  /* settle past then back */
  --ease-drawer:    cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like */
  --dur-press: 120ms;  --dur-release: 180ms;  --dur-micro: 200ms;
  --dur-travel: 320ms; --dur-fly: 600ms;
}
```

```ts
// composables/useMotionTokens.ts — mirror, for JS/WAAPI-authored motion
export const EASE = {
  out:      'cubic-bezier(0.23, 1, 0.32, 1)',     // strong ease-out — enters, feedback
  inOut:    'cubic-bezier(0.77, 0, 0.175, 1)',    // on-screen movement
  overshoot:'cubic-bezier(0.34, 1.56, 0.64, 1)',  // settle past then back
  drawer:   'cubic-bezier(0.32, 0.72, 0, 1)',     // iOS-like
}
export const DUR = { press: 120, release: 180, micro: 200, travel: 320, fly: 600 }
```

```ts
// respect reduced motion everywhere
import { useMediaQuery } from '@vueuse/core'
const reduce = useMediaQuery('(prefers-reduced-motion: reduce)')
// when reduce.value === true: keep opacity, drop transforms / travel
```

> The recipes below reference these tokens (`var(--ease-overshoot)`, `EASE.inOut`, `DUR.fly`). If you must show a literal while prototyping, replace it with a token before you hand off — the iteration loop depends on every knob being in one file.

### RTL (this app is bilingual ar/en — get the direction right)

The rule: **vertical travel and scale are direction-agnostic — leave them alone.** Only **horizontal (X-axis) travel** flips. A drawer that slides in from the inline-start, a toast that enters from a side edge, a list row that slides in sideways — all reverse under RTL. Getting this wrong sends motion the *wrong way*, which reads as broken, not unstyled.

Two correct approaches; pick by where the motion is authored:

```css
/* CSS-authored travel: flip the sign under RTL. Use logical-aware selectors. */
.panel-enter-from { transform: translateX(-100%); }          /* LTR: from the left */
:dir(rtl) .panel-enter-from { transform: translateX(100%); } /* RTL: from the right */
/* or, cleaner, use a CSS var the component sets once: transform: translateX(calc(var(--rtl, 1) * -100%)); */
```

```ts
// JS/WAAPI-authored travel: derive the sign from real direction, then multiply every X.
const dir = getComputedStyle(el).direction          // 'rtl' | 'ltr', honors inherited dir
const sx  = dir === 'rtl' ? -1 : 1
el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${sx * 24}px)` }], { duration: 240 })
// In Vuetify components, prefer the composable: import { useRtl } from 'vuetify'; const { isRtl } = useRtl()
```

**Do NOT manually flip travel that's computed from `getBoundingClientRect()`** (e.g. `fly-to-target` below) — those rects are already in true screen coordinates, so `dx` points the right way in RTL automatically. Adding a sign flip there *breaks* it. The flip is only for *hardcoded* X offsets/percentages.

Spring options when you want true physics (optional installs):
- `motion` (Motion One / Framer vanilla): `import { animate, spring } from 'motion'`
- `@vueuse/motion`: `useSpring`, `v-motion` directive
- `@formkit/auto-animate`: drop-in FLIP for lists (`v-auto-animate`)

---

## press-release  *(zero-dep, CSS only)*

```vue
<template>
  <button class="spring-btn"><slot /></button>
</template>

<style scoped>
.spring-btn {
  transition: transform var(--dur-release) var(--ease-overshoot); /* release overshoot */
}
.spring-btn:hover { will-change: transform; }   /* promote only while interacting — see note */
.spring-btn:active {
  transform: scale(0.96);
  transition: transform var(--dur-press) var(--ease-out);    /* press: fast, no overshoot */
}
@media (prefers-reduced-motion: reduce) {
  .spring-btn, .spring-btn:active { transition: none; transform: none; }
}
</style>
```
Works on any pressable (cards, list rows). Keep scale 0.95–0.98.

> **`will-change` is not free — never leave it set statically on many elements.** A permanent `will-change: transform` forces a compositor layer per element; on a table or long list (a target this combo explicitly invites) that's a real memory tax. Promote on `:hover`/`:active` as above so the layer exists only mid-interaction, or omit it entirely for low-count, rarely-pressed buttons.

---

## fly-to-target  *(the add-to-cart combo — WAAPI, zero-dep)*

A clone of the source element travels an arc to the target, then the target reacts. **RTL-safe as written** — `dx`/`dy` come from real `getBoundingClientRect()`, so the path already points the right way; don't add a manual sign flip.

```ts
// composables/useFlyToTarget.ts
import { EASE, DUR } from './useMotionTokens'

export function flyToTarget(sourceEl: HTMLElement, targetEl: HTMLElement, opts: { reduce?: boolean } = {}) {
  const s = sourceEl.getBoundingClientRect()
  const t = targetEl.getBoundingClientRect()
  if (opts.reduce) { pop(targetEl); return Promise.resolve() }

  const clone = sourceEl.cloneNode(true) as HTMLElement
  // strip ids — a deep clone duplicates every id into the DOM (invalid; breaks getElementById / [for])
  clone.removeAttribute('id')
  clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
  Object.assign(clone.style, {
    position: 'fixed', left: `${s.left}px`, top: `${s.top}px`,
    width: `${s.width}px`, height: `${s.height}px`, margin: '0',
    pointerEvents: 'none', zIndex: '9999', borderRadius: getComputedStyle(sourceEl).borderRadius,
  })
  document.body.appendChild(clone)

  const dx = (t.left + t.width / 2) - (s.left + s.width / 2)
  const dy = (t.top + t.height / 2) - (s.top + s.height / 2)

  const anim = clone.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(0.7)`, opacity: 1, offset: 0.6 }, // arc up
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.4, offset: 1 },
    ],
    { duration: DUR.fly, easing: EASE.inOut, fill: 'forwards' },
  )
  return anim.finished.then(() => { clone.remove(); pop(targetEl) })
}

// secondary reaction: badge / target punches
function pop(el: HTMLElement) {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
    { duration: DUR.travel, easing: EASE.overshoot },
  )
}
```
```ts
// usage in a component
const cartIcon = ref<HTMLElement>()
function onAdd(e: MouseEvent) {
  flyToTarget(e.currentTarget as HTMLElement, cartIcon.value!, { reduce: reduce.value })
  cartCount.value++ // bump count; count-up combo can animate the number
}
```

---

## success-morph  *(button → spinner → self-drawing check)*

```vue
<script setup lang="ts">
import { ref } from 'vue'
type S = 'idle' | 'loading' | 'done'
const state = ref<S>('idle')
async function submit() {
  state.value = 'loading'
  try { await doThing(); state.value = 'done'; setTimeout(() => state.value = 'idle', 1600) }
  catch { state.value = 'idle' }
}
</script>

<template>
  <button class="morph-btn" :data-state="state" :disabled="state !== 'idle'" @click="submit">
    <Transition name="swap" mode="out-in">
      <span v-if="state === 'idle'" key="i"><slot>Submit</slot></span>
      <span v-else-if="state === 'loading'" key="l" class="spinner" />
      <svg v-else key="d" class="check" viewBox="0 0 24 24"><path d="M4 12 l5 5 L20 7" /></svg>
    </Transition>
  </button>
</template>

<style scoped>
.morph-btn { transition: background-color 240ms ease, transform var(--dur-release) var(--ease-overshoot); }
.morph-btn[data-state="done"] { background: rgb(var(--v-theme-success)); }
.swap-enter-active, .swap-leave-active { transition: opacity 160ms ease, transform 160ms var(--ease-out); }
.swap-enter-from { opacity: 0; transform: scale(0.8); }
.swap-leave-to   { opacity: 0; transform: scale(0.8); }
.spinner { width: 18px; height: 18px; border: 2px solid #fff6; border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.check path { fill: none; stroke: #fff; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 24; stroke-dashoffset: 24; animation: draw var(--dur-travel) var(--ease-out) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .check path { animation: none; stroke-dashoffset: 0; } .swap-enter-from,.swap-leave-to { transform: none; } }
</style>
```

---

## list-stagger + FLIP  *(enter staggered; reorder/delete slides physically)*

Vue's `<TransitionGroup>` gives FLIP **for free** via `*-move`.

```vue
<template>
  <TransitionGroup name="stg" tag="div" class="list">
    <div v-for="(item, i) in items" :key="item.id" class="row" :style="{ '--d': `${i * 45}ms` }">
      {{ item.text }}
    </div>
  </TransitionGroup>
</template>

<style scoped>
.row { transition: all var(--dur-travel) var(--ease-out); }
.stg-enter-active { transition-delay: var(--d); }      /* stagger only on enter */
.stg-enter-from, .stg-leave-to { opacity: 0; transform: translateY(10px); }
.stg-leave-active { position: absolute; width: 100%; }  /* let survivors flow */
.stg-move { transition: transform var(--dur-travel) var(--ease-out); } /* the physical slide */
@media (prefers-reduced-motion: reduce) { .row,.stg-move { transition: opacity 200ms ease; transform: none; } }
</style>
```
For non-`v-for` containers (e.g. third-party lists), `@formkit/auto-animate` (`v-auto-animate` on the parent) gives the same FLIP with no markup changes.

RTL: the `translateY` enter and Vue's computed `.stg-move` FLIP are both direction-agnostic. Only if you switch the enter to a horizontal `translateX` slide-in do you need the `:dir(rtl)` sign flip from the RTL section.

---

## skeleton-to-content  *(cross-dissolve, no pop-in)*

```vue
<template>
  <div class="slot">
    <Transition name="reveal" mode="out-in">
      <SkeletonCard v-if="loading" key="s" />
      <RealCard v-else key="c" :data="data" />
    </Transition>
  </div>
</template>
<style scoped>
.reveal-enter-active, .reveal-leave-active { transition: opacity 260ms ease, filter 260ms ease, transform 260ms var(--ease-out); }
.reveal-enter-from { opacity: 0; filter: blur(6px); transform: scale(0.99); }  /* blur bridges the swap */
.reveal-leave-to   { opacity: 0; filter: blur(6px); }
</style>
```
Keep a shimmer on the skeleton itself (animated gradient) for perceived progress.

---

## toast-snackbar  *(same-edge spring in/out)*

```vue
<style scoped>
/* enters and LEAVES from the same edge = spatial consistency */
.toast-enter-active { transition: transform 360ms var(--ease-overshoot), opacity 360ms ease; }
.toast-leave-active { transition: transform 220ms var(--ease-out), opacity 220ms ease; }
.toast-enter-from, .toast-leave-to { transform: translateY(120%); opacity: 0; }
/* stack shift handled by TransitionGroup .*-move if multiple */
/* RTL: translateY is direction-agnostic — fine as-is. If you instead enter from a
   side edge (translateX), flip the sign under :dir(rtl) per the RTL section above. */
</style>
```

**With Vuetify's `<v-snackbar>`, the `transition` prop is not a `<Transition name>` CSS class** — it takes the name of a *globally-registered transition component*. Two correct paths:

```ts
// main.ts — register a reusable transition component once
import { createVuetify } from 'vuetify'
import { createCssTransition } from 'vuetify/lib/components/transitions/createTransition'
const ToastTransition = createCssTransition('toast-transition', 'translateY(120%)', 'in-out')
const vuetify = createVuetify({ aliases: { ToastTransition } /* ...components, directives */ })
// then: <v-snackbar transition="toast-transition"> — Vuetify drives the toast-transition-* CSS hooks
```
```vue
<!-- Simpler: skip the prop, disable Vuetify's transition, and animate your own content wrapper -->
<v-snackbar :transition="false" v-model="show" location="bottom">
  <Transition name="toast" appear><div v-if="show" class="toast-body"><slot /></div></Transition>
</v-snackbar>
```
Reach for the second form unless you want the transition reused across many snackbars — passing a bare `"toast"` string to `transition` and expecting the `.toast-enter-*` classes to bind will silently not animate.

---

## count-up + badge-pop  *(numbers roll, badge punches)*

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTransition } from '@vueuse/core'   // tween source -> display
import { EASE } from '@/composables/useMotionTokens'
const target = ref(0)
const display = useTransition(target, { duration: 500, transition: [0.23, 1, 0.32, 1] })
const badge = ref<HTMLElement>()
watch(target, () => badge.value?.animate(
  [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
  { duration: 300, easing: EASE.overshoot }))
</script>
<template>
  <!-- the rolling display is animation, not content: announce the real target value once it settles.
       aria-live="polite" + the static target keeps screen readers from reading every interpolated frame. -->
  <span ref="badge" aria-hidden="true">{{ Math.round(display) }}</span>
  <span class="sr-only" aria-live="polite">{{ target }}</span>
</template>
```
> The rolling digits are decoration; a screen reader narrating "1, 4, 17, 31, 42…" is noise. Mark the animated span `aria-hidden` and expose the **settled** value via a visually-hidden `aria-live="polite"` node so assistive tech hears one clean update. Same idea for any count/total whose change matters.

---

## like-burst  *(overshoot fill + one-shot ring)*

```vue
<template>
  <button class="like" :class="{ on: liked }" @click="toggle">
    <svg viewBox="0 0 24 24" class="heart"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/></svg>
    <span class="ring" :key="burst" v-if="burst" />
  </button>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const liked = ref(false), burst = ref(0)
function toggle() { liked.value = !liked.value; if (liked.value) burst.value++ }
</script>
<style scoped>
.heart { width: 26px; height: 26px; transition: transform 260ms var(--ease-overshoot); fill: rgba(var(--v-theme-on-surface),0.3); }
.like.on .heart { fill: rgb(var(--v-theme-error)); transform: scale(1.15); }
.ring { position: absolute; inset: 0; border: 2px solid rgb(var(--v-theme-error)); border-radius: 50%;
  animation: ring 420ms var(--ease-out) forwards; pointer-events: none; }
@keyframes ring { from { transform: scale(0.4); opacity: 0.7; } to { transform: scale(1.8); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .heart { transition: none; } .ring { display: none; } }
</style>
```

---

## Verifying web motion

Use the `browse` or `run` skill, or headless Chrome/Playwright, to capture mid-motion. The two levers that turn "screenshot a blur" into a real check:

```ts
// 1. Freeze mid-state — slow EVERYTHING ~10–25× so a still frame lands inside the motion.
await page.addStyleTag({ content: `*, *::before, *::after {
  animation-duration: 4000ms !important; animation-delay: 0ms !important;
  transition-duration: 4000ms !important; transition-delay: 0ms !important; }` })
await trigger()                       // click / hover / mount the target
await page.waitForTimeout(800)        // ~mid-flight at the slowed rate
await page.screenshot({ path: 'mid.png' })   // check transform-origin, travel direction (incl. RTL), the secondary reaction firing

// 2. Exercise the reduced-motion branch — confirm the state still reads with transforms dropped.
await page.emulateMedia({ reducedMotion: 'reduce' })
await trigger()
await page.screenshot({ path: 'reduced.png' }) // the value/color/icon cue must still change — never "nothing happened"

// 3. RTL — confirm horizontal travel mirrors (and real-coordinate travel does NOT double-flip).
await page.emulateMedia(/* set dir=rtl on <html> via addStyleTag/evaluate */)
```

Check from the frames: smoothness, correct transform-origin, secondary reaction fires, RTL direction, reduced-motion still communicates the change. Animate `transform`/`opacity` only. **You still cannot judge *feel* (snappiness, jank on real hardware, the Nth-repeat) from frames — hand that to the user per the workflow's verification split.**
