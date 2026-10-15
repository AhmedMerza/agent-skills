# Showcase effects — for presentational surfaces only

Effects ported from [Magic UI](https://magicui.design) (React + Tailwind + Motion) to zero-dep Vue 3 / CSS. Every recipe here has run on a real page. **Read this file only when the target is presentational** — a hero, a welcome/landing page, a marketing section, an onboarding beat. On a surface people *work* in (tables, forms, dashboards, anything used many times a day) the answer is still the SKILL's restraint gate, and these effects fail it.

> **Reuse before you rebuild.** Before writing any recipe below, grep the project for an existing port (`MagicMarquee`, `MagicCard`, `MagicBorderBeam`, or a `components/magic/` directory). If one exists, use it and tune its props — a second hand-rolled copy is how two marquees end up with two different speeds.

> **The page budget still applies.** A showcase page that already has drifting blobs, floating icons and looping keyframes does not need more. One or two of these, placed where nothing else moves, beats five layered on top of existing motion. If the page is already busy, the better move is often to **remove** some of the ambient motion that's there.

Each effect lists the Magic UI original, what was changed and why, the recipe, and when NOT to use it.

---

## Marquee — an endless strip of logos / names

**Original:** Magic UI `Marquee`. **Changed:** zero-dep; correct RTL direction; reduced motion becomes a still, wrapped row instead of a slower scroll.
**Class:** ambient loop (decision-map ambient rules). Allowed to loop forever *only* because it is the content's layout, not a signal — and it pauses on hover so it can be read.

```vue
<script setup lang="ts">
withDefaults(defineProps<{ duration?: number; pauseOnHover?: boolean }>(), { duration: 40, pauseOnHover: true })
</script>

<template>
  <div class="magic-marquee" :class="{ 'pause-on-hover': pauseOnHover }" :style="{ '--marquee-duration': `${duration}s` }">
    <!-- two copies: the second slides in as the first slides out; hidden from screen readers -->
    <div v-for="copy in 2" :key="copy" class="magic-marquee-track" :aria-hidden="copy === 2 ? 'true' : undefined">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.magic-marquee {
  --marquee-gap: 3rem;
  display: flex; overflow: hidden; gap: var(--marquee-gap);
  mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);   /* soft edges */
}
.magic-marquee-track {
  display: flex; flex-shrink: 0; align-items: center; justify-content: space-around;
  gap: var(--marquee-gap); min-inline-size: 100%;
  animation: marquee var(--marquee-duration) linear infinite;   /* continuous motion: linear is correct */
}
/* RTL: flex places the copy to the LEFT, so the loop must run rightwards */
.magic-marquee-track:dir(rtl) { animation-name: marquee-rtl; }
.magic-marquee.pause-on-hover:hover .magic-marquee-track { animation-play-state: paused; }
@keyframes marquee     { to { transform: translateX(calc(-100% - var(--marquee-gap))); } }
@keyframes marquee-rtl { to { transform: translateX(calc(100% + var(--marquee-gap))); } }

@media (prefers-reduced-motion: reduce) {
  .magic-marquee { flex-wrap: wrap; justify-content: center; mask-image: none; }
  .magic-marquee-track { flex-wrap: wrap; justify-content: center; min-inline-size: 0; animation: none; }
  .magic-marquee-track[aria-hidden] { display: none; }
}
</style>
```
- **Knob:** `duration` (seconds per loop). 30–45s for a strip of 6–10 names; faster reads as frantic.
- **Gotcha:** the gap must be in the translate (`-100% - gap`), or the loop jumps by one gap each cycle.
- **When NOT:** anything the user needs to *read in full* or click precisely (a moving target is a usability tax); more than one marquee per page.

---

## Magic Card — a spotlight and lit border that follow the mouse

**Original:** Magic UI `MagicCard`. **Changed:** zero-dep; mouse-only (touch has no hover); removed under reduced motion (pointer-driven = law 12, unbind).
**Class:** continuous / pointer-driven — passes the continuous gate only on presentational cards.

```vue
<script setup lang="ts">
import { ref } from 'vue'
const el = ref<HTMLElement>()
let frame = 0
function track(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {                       // one style write per frame, max
    if (!el.value) return
    const r = el.value.getBoundingClientRect()
    el.value.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.value.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  })
}
</script>

<template>
  <!-- class / v-if fall through to the root, so it can replace an existing card <div> 1:1 -->
  <div ref="el" class="magic-card" @pointermove="track"><slot /></div>
</template>

<style scoped>
.magic-card { --spot-size: 260px; isolation: isolate; }
.magic-card::before, .magic-card::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  opacity: 0; transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
/* spotlight: z-index -1 inside an isolated card paints ABOVE the card background but BELOW its text */
.magic-card::before {
  z-index: -1;
  background: radial-gradient(var(--spot-size) circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(var(--v-theme-primary), 0.09), transparent 70%);
}
/* lit border: the same gradient, masked down to a 1px ring */
.magic-card::after {
  padding: 1px;
  background: radial-gradient(var(--spot-size) circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(var(--v-theme-primary), 0.7), transparent 70%);
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
@media (hover: hover) { .magic-card:hover::before, .magic-card:hover::after { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .magic-card::before, .magic-card::after { display: none; } }
</style>
```
- **Needs:** the card itself must be `position: relative` with a `border-radius` (the pseudo-elements inherit it).
- **Knobs:** spotlight alpha (`0.09`) and `--spot-size`. Over a busy/gradient background the spotlight washes out — raise the alpha to ~0.14 or rely on the lit border.
- **Why it binds 1:1 here (law 9 exception):** a light *under the cursor* that lags behind it reads as broken, not physical. The damped follower is for things that *move*; this is lighting.
- **When NOT:** touch-first surfaces (it never shows); dense grids of 20+ cards; cards in a working UI.

---

## Border Beam — a light that runs around an edge, then stops

**Original:** Magic UI `BorderBeam` (loops forever). **Changed:** starts when scrolled into view, runs a few laps, fades out for good — the bounded-loop rule from the decision map's ambient section.
**Class:** ambient, bounded. Use on *the one* element a showcase page wants seen (the primary CTA).

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
withDefaults(defineProps<{ duration?: number; laps?: number; offset?: number }>(), { duration: 3, laps: 3, offset: 3 })
const el = ref<HTMLElement>(), running = ref(false)
const { stop } = useIntersectionObserver(el, ([e]) => { if (e.isIntersecting) { running.value = true; stop() } }, { threshold: 1 })
</script>

<template>
  <span ref="el" class="magic-border-beam" :class="{ running }" aria-hidden="true"
        :style="{ '--beam-duration': `${duration}s`, '--beam-laps': laps, '--beam-offset': `${offset}px` }" />
</template>

<style scoped>
@property --beam-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }   /* makes the angle animatable */

.magic-border-beam {
  position: absolute; inset: calc(-1 * var(--beam-offset));
  border-radius: calc(var(--beam-offset) + 8px);   /* match the host's radius + offset */
  padding: 2px; pointer-events: none; opacity: 0;
  background: conic-gradient(from var(--beam-angle), transparent 0 70%, rgba(var(--v-theme-primary), 0.9) 85%, rgb(var(--v-theme-info)) 95%, transparent);
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);   /* ring only */
}
.magic-border-beam.running {
  animation:
    beam-in 400ms cubic-bezier(0.23, 1, 0.32, 1) forwards,
    beam-spin var(--beam-duration) linear var(--beam-laps),
    beam-out 600ms cubic-bezier(0.23, 1, 0.32, 1) calc(var(--beam-duration) * var(--beam-laps) - 600ms) forwards;
}
@keyframes beam-in   { to { opacity: 1; } }
@keyframes beam-spin { to { --beam-angle: 360deg; } }
@keyframes beam-out  { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .magic-border-beam { display: none; } }
</style>
```
Host it in a positioned wrapper next to the element, e.g. `<span class="d-inline-block position-relative rounded-lg"><VBtn …/><MagicBorderBeam /></span>`.
- **Why outside the edge (`offset`):** drawn *on* a filled primary button, a primary-coloured beam is invisible. Sitting 3px outside, it reads against the page.
- **Cost:** animating a registered custom property repaints the ring every frame — fine for ~9s on one element, not for many or forever. That's a second reason it's bounded.
- **Verify:** `getComputedStyle(beam).opacity` should be ~1 mid-run and ~0 after `duration × laps`.
- **When NOT:** more than one per page; anything but the primary action; a page that already has an attention effect.

---

## Ported but documented elsewhere
- **Number Ticker** → `count-up` in `web.md` (tabular digits, count once on first view).
- **Pulsating button / ripple** → `livePulse` in `web.md` — only for a state that is *live right now*.
- **Shimmer button / shine border** → `attentionSheen` in `web.md` — bounded to 2–3 sweeps.
- **Animated theme toggler** → `themeReveal` in `web.md`.

## Deliberately not ported
Particles, meteors, globe, retro grid, aurora/animated gradient text, confetti: decoration with no state to explain. If a page genuinely needs one, it's a design decision for the user to make explicitly — don't propose them.
