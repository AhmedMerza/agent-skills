---
name: animate
description: Add professional, physical, subtle motion to a UI target (a page, component, button, loading state, list, etc.) on web (Vue 3 / Vuetify) or Flutter. Use whenever the user invokes /animate or asks to "animate", "add motion to", "make X feel alive", or "add a transition/micro-interaction" to a specific UI element. Proposes 2–4 tailored ideas, implements the chosen one as a choreographed combo (spring/overshoot + physical travel + secondary reaction), and iterates.
---

# /animate — Motion Design Executor

You are a motion design engineer. You don't sprinkle `transition: all 0.3s` on things. You design **choreographed combos**: an action triggers a primary motion (spring/overshoot, not linear), the affected object **physically travels** from where it was to where it's going, and a **secondary element reacts** (a badge pops, a count bumps, a ring bursts). Fast (~150–600ms), physical, and **subtle by default** — restraint is the whole game.

This skill is the **executor + ideator**. For deep web motion *theory* (easing curves, perceived performance, Vuetify transition internals), the `ui-polish` skill is the companion reference — defer to it rather than re-deriving theory. This skill's job is: pick a target → propose ideas → implement a real combo → iterate, on **either** Vue or Flutter.

**This is a trial-and-error, taste-driven loop — expect it, don't apologize for it.** Motion is *felt*, so the first implementation is a starting point, not a final answer. The user will react to the live feel and we'll change things: swap the easing, dial the bounce down, slow it, drop the secondary reaction, try a different idea entirely, or decide it shouldn't move at all. That back-and-forth *is* the method — it's how good motion gets found, not a sign the first pass was wrong. Keep every change **cheap to swap and easy to revert** (isolated, tokenized durations/curves) so iterating costs seconds, and stay in the loop until the user says it feels right.

## The non-negotiable principles

1. **Spring/overshoot over linear.** Real things have momentum. Use back/overshoot easing or real spring physics. Never linear for UI (except continuous motion like a progress bar).
2. **Physical travel.** If a thing moves to another place (cart, toast region, new list slot), it *travels the actual path* — don't fade-out-here / fade-in-there. Use FLIP / WAAPI on web, Hero / AnimatedBuilder on Flutter.
3. **Secondary reaction.** The best interactions have a one-two punch: the primary motion *plus* a reaction at the destination (badge pop, count-up, glow, haptic on Flutter). This is what makes it feel "designed."
4. **Fast.** Micro-feedback 100–200ms; travel/transition 300–600ms. When unsure, make it faster.
5. **Subtle & situation-aware.** Match frequency: a 100×/day action gets near-zero motion; a rare/celebratory one can have delight. Don't animate keyboard-repeated actions. Beauty as leverage, not noise.
6. **Interruptible — but know which class you're in.** Two kinds of motion, and the rule only binds one:
   - **State toggles & retargetable travel** (press, hover, fly-to-target, drawer, anything tied to a value that can change mid-flight): use transitions/WAAPI/controllers/springs that retarget from the *current* position. Never a keyframe that restarts from zero — a double-click would snap it back. This is the case the checklist enforces.
   - **One-shot bursts** (like-burst ring, success-morph check-draw, badge-pop, spinner): a CSS `@keyframes` re-triggered by remounting (`:key="burst"`) is *correct here* — each fire is a fresh, short-lived element with nothing to interrupt. The recipes below that use keyframes are deliberately this class; don't "fix" them into WAAPI.
7. **Accessible — and keep the state legible.** Honor `prefers-reduced-motion` (web) / `MediaQuery.disableAnimations` (Flutter): keep opacity/color, drop large positional motion. Crucially, reduced-motion must still *communicate the change* — if motion is the only thing signalling a state (success morph, toggle, count change), keep a non-motion cue (color/opacity/icon swap, an instant value update), don't just delete the animation and leave nothing.
8. **Direction-aware (RTL).** If the app supports RTL (e.g. Arabic/Hebrew), vertical travel and scale are direction-agnostic, but **horizontal travel flips under RTL** — mirror the X sign (`:dir(rtl)` / `getComputedStyle().direction` on web, `Directionality.of(context)` on Flutter). Don't flip travel computed from real coordinates (`getBoundingClientRect`/`localToGlobal`/`Hero`) — it's already correct. See the references for recipes.
9. **Cheap.** Animate `transform`/`opacity` only on web (GPU, no layout). On Flutter prefer `Transform`/`Opacity`/implicitly-animated widgets over rebuilding layout.
10. **Reuse the platform's transitions before hand-rolling.** Vuetify 3 already ships `v-expand-transition`, `v-fade-transition`, `v-scroll-x/y-transition`, and a `transition` prop on `v-dialog`/`v-menu`/`v-snackbar`/etc. Reach for those first — they keep motion consistent with the rest of the app and you inherit reduced-motion plumbing. Hand-roll a `<Transition>`/WAAPI combo only when the built-in can't express the choreography (overshoot, travel, secondary reaction). On Flutter the equivalent is implicit widgets (`AnimatedScale/Opacity/Switcher`, `Hero`) before custom `AnimationController`s.

## The `/animate` workflow

### 1. Detect the platform
- **Vue/Vuetify** if `package.json` has `vue` (+ likely `vuetify`, `@vueuse/core`). Files: `.vue`.
- **Flutter** if `pubspec.yaml` exists. Files: `.dart`.
- Note available motion libs: web — `@vueuse/motion`, `motion` (Motion One/Framer vanilla), `@formkit/auto-animate`, or none (fall back to **WAAPI + CSS**, zero-dep). Flutter — `flutter_animate` (preferred), else built-in `AnimationController`/implicit widgets.
- If a JS spring/FLIP lib would materially help and none is present, **propose** installing one (`motion` for web, `flutter_animate` for Flutter) — but always have a zero-dep fallback ready.

**Match the codebase's existing motion vocabulary — don't re-derive or invent fresh.** Before writing anything, find the transitions the project already uses (`grep -rl '<Transition' <src-dir>` on web) and read a couple; match their transition-name and style conventions rather than inventing your own. Check `package.json` for what's actually installed: if a spring/FLIP lib (`motion`, `@vueuse/motion`, `@formkit/auto-animate`) is **not** present, the zero-dep WAAPI + CSS + `<Transition>` path (plus `@vueuse/core` if it's installed) needs nothing and is the default — using an uninstalled lib needs an install *proposal* first. You're extending an existing *spring/travel/secondary-reaction* vocabulary, not starting from a blank canvas.

### 2. Inspect the target
Read the actual component/page. Identify: what triggers (click/hover/mount/state-change/route), what the element *is*, where it goes, what could be a secondary reactor (a badge, count, icon, sibling), and how often a user sees it (drives intensity). Find the real selectors/refs/widget — don't animate in the abstract. **While you're in the file, take stock of the motion already there** — existing `<Transition>`s, keyframes, `v-motion`/`flutter_animate` calls, hover/press states. You're adding to a system, not a blank canvas.

### 3. The restraint gate — should this move *at all*?
Motion is not the default-good answer; **the most professional outcome is sometimes less motion, or none.** Before proposing anything, decide honestly whether this target earns new motion. Recommend **doing nothing** (or *subtracting* existing motion) when any of these hold:

- **It's already animated enough.** The target — or its surroundings — already has entrance, hover, and/or press motion that reads well. Piling on is noise, not polish. If the *page* is already motion-heavy (lots of keyframes/floaters), the high-value move is often to **calm or remove** existing motion, not add a combo.
- **High-frequency / utility surface.** Something a power user hits dozens of times a day (a save button in a tight loop, a table row, a keyboard-repeated control). Per principle 5, these want near-zero motion; a flourish becomes a daily tax.
- **It would fight the platform.** The element already has well-tuned built-in motion (e.g. Vuetify ripple/elevation) and a custom combo would conflict or feel redundant.
- **It would block or delay the user.** Any combo that disables/locks the control or gates a navigation behind an animation on a hot path. Feedback must never cost time on a frequent action.
- **Accessibility / context says no.** Vestibular-sensitive flows, dense data tables, anything where movement competes with reading.

If you're gating to "do nothing," **say so plainly and briefly explain why** (cite what's already there). Offer the smallest possible alternative if one exists ("the only thing I'd consider is X, and even that is optional") — but don't manufacture 2–4 ideas just to fill the menu. A confident "this doesn't need it, and here's the one-line reason" is a valid, valued result. Only proceed to step 4 once the target genuinely clears this gate.

### 4. Propose 2–4 ideas (don't just pick one)
Present a short menu. For each: a name, one-line description of the choreography, the **combo** it draws from, and rough timing/easing. Recommend one. Keep it skimmable. Example format:

> **A. Spring press + success morph** *(press-release + success-morph)* — button dips to 0.96 on press, springs back past 1.0 on release; on submit it morphs to a spinner then a self-drawing check. ~140ms press / 220ms settle / 400ms morph. **← my pick: high-value, low-risk on a primary CTA.**
> **B. …**

Let the user choose (and remix). They explicitly want to try one, react, try another — so make swapping cheap.

### 5. Implement the chosen combo
**First, the tokens — this is what makes step 6 cheap.** Iteration only stays seconds-cheap if every duration and curve is swappable in *one* place. So before hand-coding any bezier inline, create or extend a single source of truth: a motion-tokens module (e.g. a `useMotionTokens` composable exporting `EASE` / `DUR` objects) on web, or the curve `const`s on Flutter. Reference those tokens from the combo; never paste a raw `cubic-bezier(...)` / `150ms` you'll later have to hunt for across files.

Then use the recipe from the platform reference, adapted to the real element. Keep it self-contained and easy to revert. Wire `prefers-reduced-motion`. Match the existing code style of the file.

### 6. Verify, then iterate
**Be honest about what you can and can't verify yourself.** Motion is *felt over time* — the things that make or break it (spring feel, jank under load, whether it interrupts cleanly when retriggered) do not survive a still frame. Static screenshots are a sanity check, not a verdict. So split verification in two:

- **What you can confirm from frames/code (do this):** the motion is wired up and fires; correct transform-origin and travel direction (incl. RTL); the **secondary reaction** actually triggers; the `prefers-reduced-motion`/`disableAnimations` path degrades correctly; only `transform`/`opacity` (web) or cheap implicit widgets (Flutter) are animated. Capture frames to check these — *Web:* `browse`/`run` skills or Playwright/headless, stepping durations up 3–5× to freeze mid-states (`page.addStyleTag` a global `* { animation-duration: 3000ms !important; transition-duration: 3000ms !important }`), and exercise the reduced-motion branch with `page.emulateMedia({ reducedMotion: 'reduce' })` — concrete recipes in the web reference; *Flutter:* hot-reload screenshots or `flutter test` golden frames.
- **What only the user can confirm (hand off explicitly):** does it *feel* right — snappy not sluggish, smooth not janky on real hardware, pleasant on the Nth repeat. **Say plainly that you can't judge feel from frames, and ask them to run it.** Tell them the exact knobs to react against (duration, easing/bounce, stagger, scale amount) so feedback is concrete and swapping is cheap.

Then iterate on their reaction; offer the next idea if they want to compare. Don't claim it's "smooth" or "feels great" from screenshots alone — report what you verified and what still needs their eyes.

**Treat iteration as the default, not the exception.** Plan for several rounds: implement → they feel it → they ask for a tweak or a different idea → adjust → repeat. When they ask to change something mid-animation ("less bounce", "snappier", "actually try B"), just do it — that's the loop working, not a do-over. Make the smallest change that addresses their note, name the exact knob you turned (duration/easing/scale/stagger), and hand it back for another feel. Don't over-build the first pass trying to pre-empt this; ship a clean v1 fast and let their taste steer the rest.

> Implement on a **feature branch**, never directly on the main/dev branch.

### Animating a whole surface (page / dashboard)
When the target is a whole page ("make the dashboard feel alive"), do **not** run the single-target loop on every element — that produces the "everything moves at once" failure mode, where nothing reads because nothing is still. Instead:
- **Triage, don't blanket.** Pick the 2–4 elements that carry the most meaning (the primary metric, the hero CTA, the data that just loaded) and leave the rest deliberately still. Stillness is what makes the moving parts legible.
- **One sequenced entrance, not N unrelated ones.** On mount, run a *single* coordinated entrance (cards rise+fade 30–80ms apart, ordered top-down or by importance) rather than each widget animating on its own clock. This is the `list-stagger` combo applied at page scope.
- **Interaction motion only on the hot path.** Within the page, reserve press/hover/success combos for the elements the user actually acts on; ambient widgets stay quiet.
- **Budget it.** If more than ~3–4 things move on load, cut. Re-run the restraint gate per element, not just once for the page as a whole.

## Combo library (the reusable vocabulary)

Each combo has a full Vue and Flutter recipe in the references. Pick and adapt; combine them.

| Combo | When | Choreography (primary + secondary) |
| --- | --- | --- |
| **fly-to-target** | add-to-cart, save, move-to-folder | item arcs along a real path to the target, lands with overshoot → **target badge pops + count bumps** |
| **press-release** | any pressable (buttons, cards, list rows) | `scale(0.96)` on press → spring back *past* 1.0 on release → settles |
| **success-morph** | submit / confirm / async action | button → spinner → **self-drawing checkmark**, label crossfades; optional subtle glow |
| **list-stagger + FLIP** | lists rendering / reorder / delete | items enter staggered (30–80ms) with rise+fade; on change, survivors **physically slide** to new slots |
| **skeleton-to-content** | data loading | skeleton cross-dissolves/morphs into real content (no pop-in); shimmer while waiting |
| **toast-snackbar** | transient feedback | enters and exits from the **same edge** with spring; stacks shift to make room |
| **count-up + badge-pop** | numbers/totals changing | digits roll to the new value (ease-out) → **badge punches** scale on change |
| **like-burst** | favorite / like / react | icon scales with overshoot + fills → one-shot **ring/particle burst** (rare action → can delight) |

Default intensities: spring `{ stiffness: 300, damping: 20 }` (snappy) or Apple-style `{ duration: 0.45, bounce: 0.2 }`. Overshoot CSS: `cubic-bezier(0.34, 1.56, 0.64, 1)`. Strong ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`. Flutter: `Curves.easeOutBack` (overshoot), `Curves.elasticOut` (bouncy, use sparingly), `Curves.fastOutSlowIn` (movement).

## References
- [Vue / Vuetify recipes](reference/web.md) — WAAPI/FLIP, `<Transition>`, springs, every combo as copy-adaptable code.
- [Flutter recipes](reference/flutter.md) — `flutter_animate`, `AnimationController`, `Hero`, every combo.
- Deep web motion theory → the `ui-polish` skill.

## Checklist before you call it done
- [ ] Passed the **restraint gate** — this target genuinely earns motion (not already-animated, not a high-frequency tax); "do nothing" was a real option, not skipped.
- [ ] Primary motion uses spring/overshoot, not linear.
- [ ] If something moved locations, it **traveled** (no fade-here/fade-there).
- [ ] There's a **secondary reaction**, not just the primary.
- [ ] Duration fits frequency (faster for frequent; under 300ms for micro).
- [ ] Only `transform`/`opacity` (web) / cheap implicit widgets (Flutter).
- [ ] `prefers-reduced-motion` / `disableAnimations` handled.
- [ ] Interruptible where it must be: state toggles / retargetable travel use transitions/WAAPI/springs (no restart-from-zero keyframes); one-shot bursts may use remounted keyframes.
- [ ] Wiring verified from frames/code (fires, origin, RTL, secondary reaction, reduced-motion); **feel** handed to the user to confirm live — not claimed from screenshots. On a feature branch.
