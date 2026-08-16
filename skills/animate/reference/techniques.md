# Motion modifiers — knobs that layer onto an existing combo

`SKILL.md` has the **vocabulary** (which combo). `decision-map.md` has the **grammar** (which one, and why). This file is neither: these are **modifiers** — small, orthogonal techniques that layer *onto* a combo you've already chosen. None of them is a thing you build on its own.

Use them the way you'd use an adjective. One is usually an improvement; three at once is the "everything moves" failure mode the SKILL warns about. **Adding a modifier is a decision that needs the same restraint gate as adding motion at all** — if you can't say what it communicates, don't.

Each entry names the combos it usefully attaches to. If your combo isn't listed, that's a signal, not an omission.

---

## 1. Segment + stagger order

**What:** split content into pieces *before* animating it, and treat the **order** the pieces fire in as a design parameter.

Two halves, both of which the combo library currently leaves implicit:

- **Granularity** — text can be split by **line / word / character** before a reveal. The SKILL's `list-stagger` assumes the pieces already exist as DOM/widget children; text has none until you make them.
- **Order** — stagger currently always runs first-to-last. It doesn't have to: `forward` · `reverse` · `centre-out` · `edges-in` · **from an origin index** (radiating from the piece nearest a tapped element) · `random`.

**The rule:** stagger order should encode *where the change came from* (law 1, causality). Radiating out from the tapped element beats left-to-right for the same reason `containerTransform` beats a fade — the eye stays where the user put it.

**Craft:**
- **Granularity is inversely proportional to frequency.** Per-character is a once-per-session flourish at most; per-line is the only granularity that belongs anywhere near a repeated surface. Per-character on a hot path is a typewriter, which `decision-map.md` already bans on the routine splash path.
- **Splitting text breaks accessibility unless you repair it.** A word split into per-character spans is read character-by-character by screen readers and often becomes unselectable. Keep the intact string in the accessibility tree (`aria-label` on the parent + `aria-hidden` on the pieces) exactly as `count-up` does for rolling digits.
- Total stagger span, not per-piece delay, is what you budget. 40 characters × 80ms is a 3.2-second animation.

**Layers onto:** `list-stagger + FLIP`, `skeleton-to-content`, any entrance; the page-scope sequenced entrance in SKILL's "animating a whole surface".

**When NOT:** any text the user is trying to *read* right now; RTL text split by character (the split fights the shaping engine on Arabic — split by word or line instead, never by glyph); anything under reduced-motion (reveal it whole).

> **RTL note — measured, not theoretical.** Arabic is cursive and contextually shaped. Splitting a word into per-character `inline-block` elements breaks it **two** ways at once: every letter falls back to its isolated form (so the joins vanish), **and** each element becomes its own bidi run, so the right-to-left order scrambles. Measured in Chrome on a real bilingual app: `مرحبا بكم في أوريم` renders **321.5px** intact and **392.7px** split per character — +22%, with visibly disconnected, mis-ordered glyphs. The same string split **per word** measured 321.5px — a 0.0px delta, identical rendering. **Per-character splitting is LTR-only; gate it on locale and use word or line granularity for `ar`.**

---

## 2. Velocity-derived distortion

**What:** derive a visual distortion from the animation's *instantaneous speed*, rather than keyframing it — blur that smears at peak velocity, or a stretch along the axis of travel — and resolve it to zero at rest.

**The rule:** the distortion is a **readout of velocity**, so it must peak mid-travel and be exactly `0` at both endpoints. A constant blur is not this technique; it reads as "out of focus", which is a defect, not motion.

**Craft:**
- Sample the *actual* frame-to-frame delta rather than assuming the eased curve — that way it stays correct when the motion is interrupted or retargeted mid-flight (SKILL principle 6). If you already built the damped follower for a continuous driver, it computes this for free.
- **Velocity is the displacement applied THIS FRAME, not the distance still to go.** They differ by a factor of ~`1/catchUp` — measured on a 0→500 move with `catchUp: 0.1`, remaining-distance peaks at 450 where the real per-frame step peaks at 50. Use the wrong one and the distortion sits pinned at its clamp for most of the travel, then drops off a cliff: "blur on, blur off" rather than a curve. This is the single easiest way to get this technique wrong, and it looks *almost* right, which is why it survives review.
- **Always clamp.** An unclamped blur on a fast drag is a full-screen smear. A cap around 8–14px is the working range; past that it stops reading as speed.
- Blur is genuinely expensive — it's a filter, not a compositor-only property, so it violates SKILL principle 9's `transform`/`opacity` rule. Budget it for **one** element in a view, never a list.

**Layers onto:** `fly-to-target`, `count-up`, `scrollScrub`, `dragInertia`, any large fast travel.

**When NOT:** small/short motion (under ~150ms or ~40px there's no velocity to read, and you've paid for a filter to render nothing); text that must stay legible mid-motion; any list or repeated element.

---

## 3. Two-config springs (settle ≠ follow)

**What:** an element that both *arrives* and then *responds* needs **two separately-tuned spring configs** — a stiffer one for its entrance settle, a looser one for its ongoing behaviour — not one config doing both jobs.

**The rule:** entrance and resting-behaviour are different physical situations. An entrance wants to *land* (higher stiffness, quick decay, optional overshoot). A follow wants to *lag* (lower stiffness, more damping, deliberately behind the input — the lag is the effect). Tune one config for both and you get an entrance that floats in limply or a follow that snaps and feels brittle.

**Craft:**
- The corollary generalises past springs: **the same element can be in more than one motion regime over its lifetime.** Name which regime you're tuning when you hand knobs to the user, or the feedback loop gets confused ("make it snappier" — the entrance or the follow?).
- A **lag differential between two elements** is the cheapest way to make a compound thing feel physical: give the outer part a looser spring than the inner one and the assembly reads as connected mass. This is the entire trick behind a good custom cursor.

**Layers onto:** `pointerParallax`, `press-release`, any element with both an entrance and an interaction state.

**When NOT:** an element that only ever enters (one config is correct — don't invent a second regime to look thorough); high-frequency targets, where the follow regime shouldn't exist at all.

---

## 4. Second-beat decoupling

**What:** when an entrance has a primary and an accent, give the accent its **own delay** so it lands *after* the primary has resolved — rather than running both on one clock.

**The rule:** this is SKILL principle 3's "secondary reaction" moved from *interactions* to *entrances*. Same insight — the one-two punch is what reads as designed — but the sequencing is explicit: the base resolves to legible **first**, then the accent arrives on it. Simultaneous reads as one busy event; sequenced reads as two intentional ones.

**Craft:**
- The gap wants to be ~50–150ms. Below that it's simultaneity; above ~250ms it's two unrelated animations and the user has already moved on.
- Distinct from law 6 (*opacity leads position*), which is about overlapping two properties **within one** motion. This is about a deliberate gap **between two** motions.
- The accent must be droppable: under reduced motion, keep the base entrance's cue and drop the second beat entirely.

**Layers onto:** `skeleton-to-content` (content resolves, then the one changed value pulses), `list-stagger`, `count-up + badge-pop` (already this shape — the badge is the second beat).

**When NOT:** more than two beats. Three is a cutscene. If you need three, the surface is doing too much.

---

## 5. Proximity falloff

**What:** drive an effect's *strength* from the **distance** between the pointer and each element — not a binary hover on/off.

The characteristic use is inverting a global rest state locally: a grid held at reduced saturation/brightness, with a soft radius around the cursor restoring it. The tile under the pointer is fully "on", its neighbours partially, the rest at rest.

**The rule:** this is spatial falloff, and it's the sibling of law 9's temporal damping — **9 smooths over time, this smooths over space.** Both exist to stop a signal binding to a rendered value as a step function. Binary hover is to proximity falloff what raw scroll-binding is to a damped follower.

**Craft:**
- Falloff curve matters more than radius. Linear reads as a hard-edged spotlight; smoothstep is what makes it feel like light.
- **Cost scales with element count** — this is a per-element read on every pointer move. Compute on one rAF-throttled pass over a bounded set, never a listener per tile.
- Combine with law 9: damp the *pointer position* first, then compute falloff from the damped value. Falloff off a raw pointer inherits every jitter.

**Layers onto:** grids/galleries of tiles, `list-stagger` at rest, `pointerParallax` (same pointer signal, different consumer).

**When NOT:** touch surfaces — there is no hover, and this degrades to nothing (design the no-pointer state first, then add this as enhancement); any grid whose rest state being dimmed would hurt scanning, which is most operational tables; large collections, on cost alone.

---

## Choosing between them

If more than one of these looks applicable, you are probably over-designing the target. Rank by **what the modifier communicates**:

| Modifier | Communicates |
|---|---|
| Segment + stagger order | where the change originated, and the structure of the content |
| Velocity distortion | how fast the thing is actually moving |
| Two-config springs | that the object has mass, and is in a particular regime |
| Second-beat decoupling | that one of these two things is subordinate to the other |
| Proximity falloff | where the pointer is, and what it would act on |

A modifier that communicates something already obvious from the combo underneath is decoration — cut it. **Zero modifiers is the correct answer for most targets**, in the same way "no motion" is a first-class result at the restraint gate.

---

## Cross-cutting gotchas

These aren't modifiers; they're mistakes that show up regardless of which combo you picked.

**Never animate from `scale(0)`.** An element scaling up from nothing has no perceptible *shape* for the first half of the animation — it reads as a blur appearing, not an object arriving, and any text inside it is illegible garbage mid-flight. Start at **0.9–0.95** and let opacity do the rest of the work. The same applies in reverse on exit: scale *to* 0.95, not to 0.

**Mutating a CSS custom property on a parent recalculates every child that inherits it.** Custom properties are inherited, so writing `parent.style.setProperty('--x', …)` in a rAF loop invalidates style for the whole subtree — which is exactly the shape of an "elegant" scroll or pointer effect that drives many children from one variable. It profiles far worse than it reads. For per-frame writes, set the concrete property on the specific element (`el.style.transform = …`) and keep custom properties for values that change on *state*, not on *frames*.

**Reactive bindings are not free at 60–120Hz.** A `computed()` feeding a `:style` re-renders the component every frame. Fine for one element; a real cost for many, or inside an active drag. See the direct-DOM-write note in `web.md`'s continuous-drivers section for the threshold.
