# Motion decision map — *which* pattern, and *why*

The combo library in `SKILL.md` is the **vocabulary** (the effects you can build). This file is the **grammar** — how to pick the right one for a given situation and defend the choice. Read it after the restraint gate (SKILL step 3) and before proposing ideas (step 4).

> **The one reframe that fixes everything.** Motion is not decoration applied to an element. It is the **visual explanation of a state change**. Before you pick anything, write the change as one sentence — *"X went from A to B"* — out loud. The right pattern falls out of the **relationship between A and B**, not out of what looks cool. A splash that gets *pushed up* and a toast that *dissolves* aren't different tastes; they're different relationships. Get the relationship right and the motion is 80% chosen.

> **These patterns are starting points, not templates — remix them.** Every reference design (Walmart's push-up, Moonly's staggered reveal, anything the user pastes) is *inspiration to disassemble*, never a thing to reproduce frame-for-frame. Take the **idea** (the parent-spawns-children lineage, the eye-locking morph, the object-permanence push) and re-choreograph it for **this** brand, section, and usage. Every brand has a different personality (playful vs. austere vs. premium), every page a different job, every action a different frequency and tone. The executor's value is *synthesis*: pull the seed-spawn from one reference, the settle from another, the timing from the frequency budget, and compose something that fits — not paste a spec. When you propose, say what you borrowed and why it suits *here*.

---

## Step A — Name the state change, then collect 7 facts

Infer what you can from the code; **ask the user only what you genuinely can't tell.** These 7 facts are the entire input to the decision.

| # | Fact | Options | Why it changes the motion |
|---|---|---|---|
| 1 | **Change class** | page/route · overlay/layer · in-place element · list/collection · feedback message · value/number · **continuous/scrubbed** | Picks the row in the map below. **Continuous is the odd one out** — there is no A and no B, just a value being tracked, so most of Step B doesn't bind. It has its own laws (Step B2) and its own restraint gate. |
| 2 | **Relationship** | replace (siblings, same level) · drill-in (parent→child) · overlay (layer *above*, base persists) · dismiss/remove · reveal-beneath (a cover is removed) | The single most decisive fact. Determines direction and whether anything travels. |
| 3 | **Origin** | has an on-screen anchor (a tapped card/button) · no anchor (comes from an edge) | An anchored change should **emanate from the anchor** (keeps the eye locked). No anchor → enter from the nearest logical edge. |
| 4 | **Tone** | neutral · success/positive · error/critical · destructive | **Gates overshoot.** Bounce reads as *light/positive/transient*; errors must feel *firm*. See the tone rule. |
| 5 | **Frequency** | once-per-launch · occasional · high-repeat (many×/session) | Sets the **duration & expressiveness budget**. The most-violated law. |
| 6 | **Initiator** | user-action (expected, eye already there) · system-interrupt (must earn attention) · **continuous driver** (scroll / pointer / drag — no discrete trigger at all) | User action → fast & direct. System interrupt → enter from periphery + a settle that draws the eye. Continuous driver → the user *is* the clock; see Step B2. |
| 7 | **Constraints** | reduced-motion (always) · is the user *reading / mid-task* here? · RTL? | Hard gates. Reading surface → don't move what they're reading. Reduced-motion → keep the cue, drop the transform (see SKILL). |

---

## Step B — The governing laws

Laws 1–8 govern **discrete** state changes (*"X went from A to B"*) — that's every change class except `continuous/scrubbed`, which has its own four in **Step B2**. Four of these the SKILL already enforces at execution time (marked ⚙️). The other four are the **judgment** laws — they decide *what to even propose*, and are the reason this file exists.

1. **Motion is causality.** Everything must answer *"what caused this and where did it come from."* Origin-less fade-ins (things appearing from nowhere) read as cheap. Default to a spatial origin (fact 3).
2. **Frequency ∝ 1/expressiveness.** The governor. Enforce a hard duration budget by frequency:

   | Frequency | Budget | Overshoot? | Stagger? |
   |---|---|---|---|
   | high-repeat (many×/session) | **≤ 200ms** | no | no |
   | occasional | **≤ 350ms** | light only | ≤ 5 items |
   | once-per-launch / rare | **≤ 500ms** | yes, expressive | yes |

3. **Enter slow, exit fast.** Exit ≈ **0.75×** the entrance duration. Nobody needs to track what's leaving.
4. **Overshoot encodes tone** (the tone rule, below).
5. ⚙️ **Doherty / responsiveness.** The animation must *start* within ~100ms of the trigger, regardless of total length. Delay content *inside* the motion, never the start.

   **Perceived latency is a separate lever from the start time, and usually a bigger one.** Below ~80ms a response reads as instantaneous; past that the user is waiting, and the fix is rarely "make the animation shorter":
   - **Optimistic UI** — render the success state immediately and reconcile on failure. Removes the wait rather than decorating it.
   - **Start the skeleton before the request.** Fire it on the *intent* (the click), not on the response, so the loading state doesn't itself arrive late.
   - **Progressive / early completion** — show a progress indicator finishing slightly ahead of the real work, and reveal content as it streams rather than all at once at the end.

   A 400ms operation that *feels* instant beats a 200ms one that feels laggy. Reach for these before you start shaving durations.
6. **Opacity leads position.** Fade should be ~70% complete *before* travel stops — otherwise the thing "arrives blurry-late" and feels laggy. Never end opacity and transform on the same frame.
7. ⚙️ **Interruptible where retargetable** (SKILL principle 6): value-tied motion uses springs/WAAPI that retarget from current position; one-shot bursts may use remounted keyframes.
8. ⚙️ **Reduced-motion always keeps the cue** and ⚙️ **RTL flips horizontal travel only** (SKILL principles 7–8).

### The tone rule (law 4, expanded)

> **Overshoot / bounce is allowed only when tone ∈ {neutral, success}.** For **error / destructive**, use critical damping — a plain strong ease-out (`--ease-out`), never a back-bezier. A bouncy error toast reads as "I'm not serious." If an error needs *more* emphasis, add a small horizontal **shake** (±2–3px, 2 cycles), not a bounce. Match the physics to the emotional register.

---

## Step B2 — The scrubbed-motion laws (laws 9–12)

**These apply only when the driver is continuous** — scroll position, pointer coordinates, a drag delta. Continuous motion is not a state change with a beginning and an end; it's a value being *tracked*. Most of Step B assumes a discrete A→B and simply doesn't bind here (there is no "exit", no "tone", no duration to budget). These four replace it.

9. **Never bind a continuous input 1:1.** Route scroll/pointer/drag through a **damped follower** — each frame, move the rendered value a fraction of the way toward the raw input, or drive it with a spring. Raw binding reads as mechanical and faithfully reproduces every jitter in the input device. A catch-up factor of ~0.08–0.15 per frame is the usual starting point. *This is the single most-repeated idea in the reference material and the one that most separates "scroll effect" from "physical".*
10. **Scrubbed motion is reversible and stateless.** The rendered value must be a pure function of the driver's *current* position, so scrolling back up retraces exactly. Never fire a one-shot keyframe off a scroll threshold that can't un-fire — that is precisely why most scroll effects break when the user scrolls backwards.
11. **Easing curves don't mean what they mean elsewhere.** A `cubic-bezier` maps **time** → progress. When position is the driver, *the user controls time*, so a bezier on the scrub itself is meaningless. All the shaping you want lives in the **damping** (how fast the follower catches up), not in an easing function. Ease the follower; never ease the scrub.
12. ⚙️ **Reduced-motion means UNBIND the driver, not shorten it.** Law 8's "keep the cue, drop the transform" has no meaning here — there's no state change to communicate, so there's no cue to preserve. Snap the property to its resting/settled value and **stop tracking entirely**. A faster parallax is still parallax.

### The continuous restraint gate (run this *before* Step C)

The restraint gate in SKILL step 3 is written for discrete motion and under-filters here, because scrubbed effects don't announce themselves as "an animation" — they read as "the page". Scroll- and pointer-driven motion is overwhelmingly **hero/marketing vocabulary**, and this skill is subtle-by-default. Recommend **none** unless *all* of these hold:

- **The surface is presentational, not operational.** A landing page, a report cover, an onboarding beat. Never a data table, a form, a dashboard the user works in daily, or anything they *read while it moves*.
- **The motion carries meaning, not just texture.** A stack that shows depth-order, a mask that reveals what you scrolled to. "It looks nice" is not a reason — it's the definition of the noise this skill exists to avoid.
- **It survives being scrubbed backwards and at speed.** If it only looks right at one scroll velocity in one direction, it isn't finished.
- **It costs nothing on the hot path.** Pointer-tracking on a page a power user lives in is a permanent compositor tax for a permanent distraction.

For a B2B/ops surface the honest answer is almost always "no" — say so in one line and move on. That is a *result*, not a failure to deliver.

---

## Step C — The decision map

Find your **change class** (fact 1) + **relationship** (fact 2). The pattern is the recommendation; always present it *with its rationale and its "when NOT"* so the user can judge. `→ new` marks patterns not yet in the SKILL combo library (choreography sketched in Step D; full recipe is a follow-up in `web.md`).

| Change class | Relationship | → Pattern | Why | Physics / budget |
|---|---|---|---|---|
| **Page / route** | replace (siblings) | `sharedAxis` — small slide ±X (~24px) + fade → new | lateral nav = lateral motion; the small offset says "same level, different thing" | `--ease-inOut`, occasional |
| **Page / route** | drill-in (parent→child) | `containerTransform` → new — the new page **grows from the tapped element** | the child literally came *from* the thing you touched | `--ease-out`, occasional |
| **Page / route** | reveal-beneath (splash / cover removed) | `revealBeneath` → new — cover pushes up & out, base was always there | object permanence: the cover *moved out of the way*, it didn't dissolve | `--ease-emphasized`, **once → 450–500ms OK** |
| **Overlay / layer** | appear above base | `overlayRise` → new — layer rises from edge + scrim; **base dims & scales to ~0.98** | the base recedes in z so the layer reads as *on top*, not *replacing* | `--ease-out` in / `--ease-in` out |
| **Overlay / layer** | dismiss | reverse of enter, **0.75× faster** | exits fast (law 3) | `--ease-in` |
| **In-place** | swap *unrelated* content | `fadeThrough` → new — old fades out, **then** new fades in (no travel) | no spatial relationship between A and B → don't fake one with travel | `--ease-out`, occasional |
| **In-place** | expand / collapse *same* content | `v-expand-transition` (Vuetify built-in) | reuse the platform; you inherit reduced-motion | built-in |
| **List / collection** | enter / reorder / delete | `list-stagger + FLIP` (SKILL) | survivors physically slide; entrants cascade to show order | `--ease-out`, stagger 30–80ms |
| **Feedback** | transient msg, **has** an origin | `originExpand` → new — pill/dot at the origin **morphs** to full panel (FLIP), content staggered behind | keeps the eye locked to the entry point | overshoot **iff** tone ∈ {neutral, success} |
| **Feedback** | transient msg, **no** origin | `toast-snackbar` (SKILL) — same-edge spring in/out | spatial consistency: leaves the way it came | tone-gated overshoot |
| **Value / number** | count / total changes | `count-up + badge-pop` (SKILL) | the number rolls; the badge punches to mark the change | `--ease-out` roll, overshoot pop |
| **Brand / loading moment** | splash / launch screen | `brandReveal` → new — **mode depends on intent** (show-off vs. cover-a-wait); see Step D | it's not a state transition, it's a brand+loading beat — different rules | non-blocking; time-boxed to data-load |
| **Continuous / scrubbed** | scroll drives a reveal, stack, or mask | `scrollScrub` → new — damped scroll progress drives clip/transform/blur | position is the clock, and the user scrubs it *both* ways | damping 0.08–0.15; **no bezier on the scrub** (law 11) |
| **Continuous / scrubbed** | pointer drives depth / tilt | `pointerParallax` → new — pointer offset from centre × a per-layer depth multiplier, **clamped** | fakes depth-of-field from one signal; the clamp is what stops it breaking at screen edges | spring follow + hard `maxTravel` cap |
| **Continuous / scrubbed** | drag drives position | `dragInertia` → new — pointer delta drives position; velocity decays after release; resistance near bounds | matches the physical expectation of *throwing* something | decay ~0.92/frame; nonlinear damping at bounds |

> All three are gated by **Step B2's continuous restraint gate** first. On an operational surface the correct output is "none" — don't route into these rows just because the target happens to scroll.

**If two rows both fit, `Frequency` breaks the tie** — the higher-frequency reading picks the cheaper pattern (drop overshoot, drop stagger, shorten). When in doubt, propose the expressive one *and* the calm one and let the user feel both.

---

## Step D — The new patterns (choreography sketches)

Decision-level detail so the executor knows what to build and, crucially, **when not to**. Full copy-adaptable recipes are a follow-up in `web.md`; these reference the existing tokens (`--ease-*`, `--dur-*`) plus two new ones the executor should add:

```css
--ease-emphasized: cubic-bezier(0.32, 0.94, 0.60, 1.0);  /* burst-then-settle; hero/once moments */
--dur-page: 450ms;                                        /* once-per-launch transitions */
```

### `revealBeneath` — the push-up page transition
- **When:** a full-screen cover (splash, onboarding, interstitial) is dismissed to reveal a persistent screen beneath. **Once-per-launch only** — never per-nav (law 2).
- **Choreography:** cover scales to `0.97` and slides `translateY(-100%)` on `--ease-emphasized`; **simultaneously** the base scales `0.95 → 1.0` and fades in. **Opacity leads (law 6):** base opacity hits 1 at ~70% of the slide, not at the end.
- **When NOT:** any transition the user sees more than a few times a session; anything on a hot path (the 450ms becomes a tax).

### `brandReveal` — the splash / launch screen
A splash is **not** a UI state transition — it's a brand+loading beat, so it plays by its own rules. The first decision is **intent**, and the executor must actually read it (ask if unclear), because it flips everything:

- **Show-off mode** (brand flex): a logo reveal you *want* people to watch — the Moonly seed→division→letter cascade lives here. Justified **only when rare**: first launch, post-update, a marketing/onboarding beat. Expressive budget (up to ~1.8s) is on the table *because the user sees it seldom*.
- **Functional mode** (cover a wait): the splash exists to bridge a cold start while data loads. This is the **default for a routine every-launch splash** (e.g. an internal ops app whose splash is totally static today — the low-risk win is the dull, calm ~450ms version). Keep it short, subtle, and *working*.

**Guardrails that apply to both (and that stop `/animate` green-lighting an 1800ms every-launch tax):**
1. **Never block entry.** The animation runs *while* data loads and **truncates the instant data is ready** — it never adds wait beyond the load. If data is already there, play the compressed path, don't stall.
2. **Frequency gates expressiveness** (law 2). Full show-off reveal → first-launch / post-update only. Routine launches → compressed ~450–500ms (seed → settle, drop typewriters/long cascades), then hand off to the app via `revealBeneath`.
3. **Do useful work under the cover.** The splash is dead time — prefetch/hydrate/route during it so the motion *earns* the milliseconds it spends (as the user noted: things can move around while the splash is up).
4. **Causality still wins** (law 1). If elements spawn, give them lineage (parent → children, as Moonly does) rather than independent fade-ins — that's the reusable idea, not the exact timing.
5. **No typewriters / char-by-char on the routine path** — decorative reading time the user can't act on, on the hottest path there is.

Compose the actual sequence from the frequency + brand personality; don't reproduce any one reference. A calm B2B admin wants functional-mode restraint; a consumer brand's first-run can afford show-off.

### `originExpand` — the pill→panel morph toast
- **When:** transient feedback that has a spatial origin (a tapped button, a badge). Grabs and holds attention.
- **Choreography (FLIP):** starts as a compact pill/dot at the origin → **translateY/scale** to resting position on a steep ease-out (0–100ms) → width/border-radius morph pill→rectangle (100–250ms) → content fades+slides `translateY(5px)→0`, **staggered ~50ms behind** the width so it isn't crushed (200–350ms) → settle.
- **Two craft rules learned the hard way:**
  1. **Overshoot on `translateY`/`scale`, keep `width` monotonic.** Overshooting the width past its final size and back causes the laid-out text to reflow-jitter.
  2. **Tone-gate the settle** (law 4): success → slight overshoot bounce; **error → critical-damped, no bounce** (optional 2px shake).
- **When NOT:** frequent/utility feedback (a plain `toast-snackbar` is cheaper and calmer); anything without a real origin (use `toast-snackbar` from an edge instead).

### `overlayRise`, `sharedAxis`, `containerTransform`, `fadeThrough`
- `overlayRise` — layer rises from the edge with a scrim; **the base dims and scales to ~0.98** so it reads as receding, not replaced. Reuse Vuetify's `v-dialog`/`v-bottom-sheet` transitions first; hand-roll only to add the base-recede.
- `sharedAxis` — sibling replace: outgoing slides `-24px`+fades, incoming slides `+24px`→0+fades, on `--ease-inOut`. Direction mirrors under RTL (SKILL principle 8).
- `containerTransform` — drill-in: the destination grows from the tapped element's rect (FLIP from `getBoundingClientRect()`; RTL-safe, don't flip real-coordinate travel).
- `fadeThrough` — unrelated in-place swap: `out-in` cross-fade with a tiny `scale(0.99)`/blur bridge (see `skeleton-to-content` in `web.md` for the mechanics), no positional travel.

### The three continuous patterns

All three share **one primitive** — a damped follower (law 9). Build that once (`useDampedValue` in `web.md`) and these are three different things plugged into it, not three separate implementations.

#### `scrollScrub` — scroll position drives a reveal
- **When:** a presentational surface where the *act of scrolling* is what reveals or reorders something — a stacking deck of cards, a masked hero, a pinned section. Passed the Step B2 gate.
- **Choreography:** map the element's scroll range to `0→1`, push that through the damped follower, then drive the visual off the *damped* value — clip/mask geometry, `translateY`, `scale`, and (for depth-ordered stacks) `blur` + dim proportional to how many layers cover it. Covered items keep a few px of `peek` so the stack reads as a stack.
- **Craft rule:** the damping is the entire feel. `0` (exact tracking) is the mechanical default everyone ships; `0.1` is where it starts feeling physical. Offer this as *the* knob.
- **When NOT:** any surface the user reads or works in; anything where the content must be reachable without scrolling; when `prefers-reduced-motion` is set — then bind nothing and render the settled state (law 12).

#### `pointerParallax` — pointer position fakes depth
- **When:** a small group of deliberately-floating elements (badges, layered cards, a mockup) on a presentational surface, where a sense of depth is the point.
- **Choreography:** normalize pointer offset from the element's centre to `-1..1`, multiply by a **per-element depth multiplier** (background layers move *less*), **clamp to a hard `maxTravel`**, and spring toward it. Optionally add a capped `rotateX/Y` on the same signal for tilt.
- **Two craft rules:** (1) the clamp is not optional — unclamped, the effect inverts and detaches at screen edges; (2) use **two separately-tuned spring configs** — one stiff one for the element's initial settle-into-place, a looser one for the ongoing follow. One config for both always makes one of the two feel wrong.
- **When NOT:** touch-primary surfaces (there is no pointer — either drop it or substitute a slow time-based drift); anything with more than ~8 tracked elements (a compositor layer each); any surface the user operates rather than looks at.

#### `dragInertia` — drag with momentum and edges
- **When:** a pannable/spinnable surface the user is meant to *throw* — a gallery, a canvas, a circular carousel.
- **Choreography:** accumulate pointer delta into position while dragging; on release, carry the last velocity and decay it (~0.92/frame) until it falls below a threshold; near bounds apply **nonlinear** resistance (displacement past the edge scales down sharply) and spring back on release.
- **When NOT:** anything with a small fixed item count where plain buttons are clearer and reachable; **always** keep a non-drag path (buttons/keyboard) — drag-only is an accessibility dead end.

---

## Step E — Worked examples (the reasoning, end to end)

**1. "Animate the splash → home transition."**
Facts: change=page · relationship=**reveal-beneath** · origin=none (full-screen) · tone=neutral · frequency=**once-per-launch** · initiator=system (data loaded) · reading=no.
→ Map gives **`revealBeneath`**. Frequency budget allows the expressive 450ms. Rationale to the user: *"Push-up, not fade — object permanence makes home feel like it was there all along. Costs 450ms, but you only see it once per launch so it earns it. I'll make the home fade finish before the slide stops so it doesn't arrive blurry."* One knob to offer: how much the base scales up (0.95 is noticeable; 0.98 is subtle).

**2. "Animate the add-to-cart success toast."**
Facts: change=feedback · relationship=transient-with-origin (the cart button) · origin=**yes** · tone=**success** · frequency=occasional · initiator=user.
→ Map gives **`originExpand`**, and tone=success **unlocks** the overshoot settle. Budget (occasional) caps it ≤350ms. Rationale: *"Morph from the cart button so the eye stays on where you tapped; slight jelly settle because it's a positive event. Width stays monotonic to avoid text jitter."* **Counter-example to show the judgment:** if this were an **error** toast, same choreography but the settle switches to critical-damped + a 2px shake — *never* the bounce. That swap is the whole point of the map.

**3. "Add that scroll-stacking card effect to the orders dashboard."** *(the continuous class, correctly refused)*
Facts: change=**continuous/scrubbed** · initiator=continuous driver (scroll) · frequency=**high-repeat** (an ops user lives here) · reading=**yes** (it's a data surface).
→ Step B2's continuous gate fails on two counts before Step C is ever consulted: the surface is **operational, not presentational**, and the user **reads while it moves**. Answer: *"No — `scrollScrub` is landing-page vocabulary, and on a board someone works in eight hours a day the stacking would fight every scan for a row. The one thing I'd consider instead is a plain `list-stagger` on first load, which costs nothing after the first paint."* **This refusal is the point of the class existing** — adding a continuous axis to this skill without its gate would turn `/animate` into a hero-effect dispenser. Contrast: the same request on a *marketing* page or a report cover passes the gate and routes to `scrollScrub` with damping as the offered knob.

---

## How the executor uses this (wire into the workflow)

Between SKILL **step 3 (restraint gate)** and **step 4 (propose 2–4)**:

1. **Name the state change** in one sentence. If you can't — because nothing goes from A to B, there's just a value being tracked — the class is **continuous/scrubbed**; go straight to Step B2's gate before anything else.
2. **Collect the 7 facts** — infer from code, ask only the unknowns (usually just tone + frequency).
3. **Look up the ranked pattern(s)** in Step C; apply the duration budget and tone rule (or, for continuous, laws 9–12).
4. **Propose with rationale.** Every proposed idea must cite the facts that drove it — *"because this is high-frequency I'm keeping it ≤200ms and dropping the overshoot"* — so the user is choosing between *reasoned* options, not vibes. Still present 2–4 (an expressive one and a calm one) and let them feel both.
