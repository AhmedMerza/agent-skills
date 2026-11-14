# House motion system — the default for every built surface

Measured, not invented: four reference sites the user picked as "the design I like" (list and
evidence in `reference-sites.local.md`, gitignored) turned out to share one motion system — same
eases, same durations, same three-level cascade. These values are the default for any app with no
motion system of its own; an app that already has a consistent one keeps it.

A surface without this is **unfinished**, the same way a surface without spacing is. The user's
words: "if animation is missing then it is dull".

## The rule — per element, three levels deep, never a block

1. **Regions in reading order:** shell (nav items, top bar) → page title → header stats →
   toolbar → content grid. Regions start 100–150 ms apart.
2. **Siblings staggered:** `stagger = clamp(35, 500 / n, 80)` ms — so 3 stats get 80 ms and 20
   cards get 35 ms, and no cascade runs past ~700 ms. Title characters 22 ms; table/list rows
   30–40 ms (cap ~24 rows, the rest arrive together).
3. **Inside each card:** the surface arrives first, its contents 135–150 ms later — media, then
   the text block, then data marks (each bar, row, meter, number staggered on its own beat).

**Chrome never gates content.** The shell (sidebar/nav items, top bar) and the page regions start
together, at ≤150 ms after mount — the title and first cards must not wait for the nav cascade to
finish. Chrome that was already on screen (Inertia/SPA navigation) doesn't re-enter at all.
**No empty-box phase:** a card surface may be visible without its contents for ≤150 ms — start
contents ≤140 ms after the card, and let the surface's opacity reach 1 in ~250 ms (the long ease
is on its travel/scale, not its opacity). Both mistakes were made by agents in the first two
trials and read as a slow loader, not as choreography.

Whole page settled by ~2 s; first content readable by ~0.6 s. **Never fade or rise a page, view,
or grid container as one block** — the only whole-block motion is the fast *exit* of an old view.
What keeps this calm is small travel and long decelerating eases, not stillness.

## Tokens

| Token | Web (CSS / WAAPI / GSAP) | Flutter | Use |
| --- | --- | --- | --- |
| `enter-surface` | 800–900 ms, `cubic-bezier(.16,1,.3,1)` (expo.out); from `y 22–30, scale .97–.985, opacity 0`; optional `clip-path: inset(…) round r` unmask | 850 ms `Curves.easeOutExpo` | cards, tiles, panels |
| `enter-content` | 550 ms, `cubic-bezier(.22,.61,.36,1)` (power3.out); from `y 8–14, opacity 0` | 550 ms `Curves.easeOutCubic` | text blocks, rows, toolbar items, nav items |
| `enter-title` | 850 ms, `cubic-bezier(.165,.84,.44,1)` (power4.out); each char from `yPercent 115, rotate 6°` inside an overflow clip, 22 ms apart | 850 ms `Curves.easeOutQuart` | page title only (one per page) |
| `pop` | 320–500 ms, back-out overshoot 1.5–2.2; from `scale .86–.94` at the trigger's origin | `Curves.easeOutBack` | popovers, menus, modals, toasts, icon press |
| `exit` | 150–220 ms, `cubic-bezier(.55,.085,.68,.53)` (power2.in); all together, **no stagger** | `Curves.easeInQuad` | anything leaving; 2–3× faster than its entrance |
| `move` (FLIP) | 550 ms, `cubic-bezier(.645,.045,.355,1)` (power3.inOut) | `Curves.easeInOutCubic` | re-layout after filter/sort/reorder |

**Data** (starts 150–500 ms after its card):
- numbers count up 1.2–1.4 s `enter-content` ease, tabular numerals, width locked so layout doesn't jump;
- lines and sparklines draw their stroke 1.0–1.2 s ease-in-out;
- bars, columns and meters scale from their baseline 0.7–1.0 s `enter-surface` ease, 35–40 ms apart
  (from the start edge — mirrored in RTL);
- a data *change* tweens the existing marks to new values (0.75–0.9 s) — never remount the chart.

**Interaction:**
- hover: lift `y −4` over 450 ms (`enter-content` ease), on `(hover: hover) and (pointer: fine)`
  only, enabled after the intro finishes; colour changes are instant; no image zoom on cards;
- press: `scale .92–.97` ~180 ms, or `filter: brightness(.94)` on touch;
- primary button may be magnetic (follows 0.2–0.3 × cursor offset, 500 ms) — fine pointer only;
- the selected tab / nav / segment pill **travels** to the new item (360 ms leading edge,
  550 ms trailing) — it never just re-renders in place.

**Navigation:** old view exits (`exit`, fade + `y −6…−10`), new view replays the full cascade with
travel reduced to ~18 px, starting ≤250 ms after the click. Filtering in place = leaving items
`exit` together → survivors `move` → newcomers `enter-surface` at 40 ms stagger.

**Theme, look and language changes** — the page stays, only its paint changes:
- **Light/dark toggle, look/theme picker, accent change (user-triggered): circular reveal from the
  control.** Web, measured from a reference site:
  ```js
  function switchTheme(apply, trigger) {          // apply() flips data-theme / Vuetify theme
    if (!document.startViewTransition || reducedMotion()) return apply()
    const r = trigger?.getBoundingClientRect()
    const x = r ? r.left + r.width / 2 : innerWidth - 40
    const y = r ? r.top + r.height / 2 : 40
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    document.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 450, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' })
    }).catch(() => {})
  }
  ```
  plus CSS `::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal }`
  so only the circle moves. The origin is the control the user touched (a picker swatch, the moon
  icon); with no trigger, the top-end corner (mirrored in RTL). No View Transitions support or
  reduced motion → apply instantly. Focus stays where it was.
- **Flutter:** no View Transitions — wrap the app in a `RepaintBoundary`, capture the old frame
  (`toImage`), switch the theme, overlay the old image and animate a `ClipPath` that *removes* a
  growing circle from it (origin = the tapped widget's centre, radius to the farthest corner,
  450 ms, `Cubic(.65, 0, .35, 1)`), then drop the overlay. One controller, disposed; skip under
  `MediaQuery.disableAnimations`. No package needed.
- **Language / direction switch (en ↔ ar):** not a circle — the layout mirrors, so a sweep reads as
  breakage. Plain View Transition crossfade (default root fade, ≤250 ms) on web; on Flutter a
  200 ms fade between the two frames. The page then does NOT replay its entrance.
- **System-driven change** (OS switches dark mode while the app is open, theme restored on load):
  no animation — apply before first paint (no flash of the default look).

**Overlays:** drawer slides from its edge (450–600 ms, expo.out or slight back-out), its sections
cascade 40–50 ms apart after 80–120 ms; modal and menu `pop` from the button that opened them;
close is `exit`. Toast in `pop` (back-out 1.8), out 250–300 ms, auto-dismiss ~3 s.

**State-change feedback** (save, toggle, add, pay): the acted-on thing lands with an overshoot
(`pop`, 420–550 ms), whatever it hit squashes ~3.5 % for 80 ms, and the related summary number
bumps (`scale 1.06, y −4`) and flashes the accent for ~900 ms. Error: shake `x 0,−8,7,−5,3,0` in
420 ms.

## Hard constraints

- Animate `transform`, `opacity`, `clip-path` only; clear inline styles when done.
- Set from-states in JS at mount, never in CSS — if the script fails, content is still visible.
- **Reduced motion:** every duration goes through one helper that returns 0, plus a CSS kill-switch
  (`*{transition-duration:0s!important;animation-duration:0s!important}` under
  `prefers-reduced-motion: reduce`); count-ups, hover lift, magnetic, ambient drift are skipped.
  Flutter: `MediaQuery.disableAnimations`.
- Below the fold: the same presets on first viewport entry (IntersectionObserver /
  `ScrollTrigger.batch`), once. No parallax or scrub on working UI.
- Page is clickable from frame one; opacity 0 never outlasts the first frame of content.
- **Real `backdrop-filter` blur is expensive** — one reference with 22 blurred surfaces rendered at
  ~6 fps headless (16 ms/frame without). Real blur only on the top bar, tab bar and overlays;
  cards fake the glass with an alpha gradient + 1 px rim. Profile on a mid-range Android.
- At most one ambient loop per view (background drift, live dot), and it stops under reduced motion.

## Implementation shape

- **Vue:** one shared entrance — a composable or directive mounted in the layout with role presets
  (`v-enter="'title' | 'card' | 'content' | 'row' | 'data'"`), driving WAAPI, or GSAP if the app
  already has it. Not per-page hand code. `<TransitionGroup>` with a move class for FLIP.
- **Flutter:** one entrance widget with the same roles; per region one `AnimationController` with
  `Interval`s for the stagger (or keyed `TweenAnimationBuilder`s so a rebuild doesn't replay);
  `AnimatedPositioned` / implicit animations for FLIP. Dispose controllers.
- RTL: horizontal travel mirrors; meters grow from the start edge.
