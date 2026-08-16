# Flutter motion recipes

Built-in first (`AnimationController`, implicit widgets, `Hero`), with `flutter_animate` as the preferred sugar for combos (`flutter pub add flutter_animate`). Adapt widget names to the real tree. Honor reduced motion:

```dart
final reduce = MediaQuery.of(context).disableAnimations; // true → keep fades, drop big travel
```

## Shared curve tokens

```dart
const easeOut    = Cubic(0.23, 1, 0.32, 1);     // enters, feedback
const easeInOut  = Cubic(0.77, 0, 0.175, 1);     // on-screen movement
const overshoot  = Curves.easeOutBack;           // settle past then back
const bouncy     = Curves.elasticOut;            // use sparingly
const fastSlow   = Curves.fastOutSlowIn;
```

Spring (real physics) via `SpringSimulation`:
```dart
final spring = SpringDescription(mass: 1, stiffness: 300, damping: 20);
controller.animateWith(SpringSimulation(spring, 0, 1, 0));
```

### RTL (this app is bilingual ar/en — get the direction right)

Same rule as web: **vertical travel and scale are direction-agnostic — leave them alone.** Only **horizontal (X-axis) travel** flips under RTL — side drawers, `slideX` slide-ins, directional page/route transitions. Wrong-way motion reads as broken, not unstyled.

```dart
final rtl = Directionality.of(context) == TextDirection.rtl;  // honors inherited dir
final sx  = rtl ? -1.0 : 1.0;
// flutter_animate: multiply the X begin by the sign
widget.animate().slideX(begin: 0.2 * sx, end: 0, curve: easeOut);
// manual Offset travel: flip the dx only
final travel = Offset(24 * sx, 0);
```

Two things to prefer over manual sign-flipping where you can:
- **Logical layout primitives** — `AlignmentDirectional`, `EdgeInsetsDirectional`, `PositionedDirectional`. If the widget is placed with these, it mirrors automatically and implicit-animated motion between two logical positions inherits the correct direction with no `sx`.
- **Real-coordinate travel is already correct.** Don't flip offsets computed from `localToGlobal()` (e.g. the fly-to-cart overlay below) or `Hero` — those are in screen space and point the right way in RTL. A manual flip *breaks* them. The `sx` flip is only for *hardcoded* X begins/offsets.

---

## press-release  *(scale down on press, spring back)*

```dart
class Pressable extends StatefulWidget {
  final Widget child; final VoidCallback onTap;
  const Pressable({super.key, required this.child, required this.onTap});
  @override State<Pressable> createState() => _PressableState();
}
class _PressableState extends State<Pressable> {
  double _scale = 1;
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown: (_) => setState(() => _scale = 0.96),
    onTapUp:   (_) => setState(() => _scale = 1),
    onTapCancel: () => setState(() => _scale = 1),
    onTap: widget.onTap,
    child: AnimatedScale(
      scale: _scale,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack, // overshoot on release
      child: widget.child,
    ),
  );
}
```

---

## fly-to-target  *(add-to-cart)*

**RTL-safe as written** — `Hero` mirrors automatically, and the overlay travel uses real `localToGlobal()` coords, so the arc already points the right way; don't add an `sx` flip.

Two options:

**Across routes / shared element → `Hero`** (free physical travel):
```dart
// source and destination both wrap the item:
Hero(tag: 'product-$id', child: ProductThumb());
// pushing the cart route animates the thumb along a real arc automatically.
```

**Same screen → overlay travel** (clone flies to the cart icon, then badge pops):
```dart
Future<void> flyToCart(BuildContext context, GlobalKey sourceKey, GlobalKey cartKey, Widget ghost) async {
  if (MediaQuery.of(context).disableAnimations) { _bumpCart(); return; }
  final overlay = Overlay.of(context);
  final sBox = sourceKey.currentContext!.findRenderObject() as RenderBox;
  final cBox = cartKey.currentContext!.findRenderObject() as RenderBox;
  final start = sBox.localToGlobal(Offset.zero);
  final end = cBox.localToGlobal(cBox.size.center(Offset.zero));

  final ctrl = AnimationController(vsync: Navigator.of(context), duration: const Duration(milliseconds: 600));
  late OverlayEntry entry;
  entry = OverlayEntry(builder: (_) {
    final t = CurvedAnimation(parent: ctrl, curve: easeInOut);
    return AnimatedBuilder(animation: t, builder: (_, __) {
      final p = Offset.lerp(start, end - const Offset(0, 60) * (1 - t.value), Curves.easeOut.transform(t.value))!; // arc
      return Positioned(
        left: p.dx, top: p.dy,
        child: Opacity(opacity: 1 - t.value * 0.6,
          child: Transform.scale(scale: 1 - t.value * 0.75, child: ghost)),
      );
    });
  });
  overlay.insert(entry);
  await ctrl.forward();
  entry.remove(); ctrl.dispose();
  _bumpCart(); // secondary reaction
}
```
`_bumpCart()` runs the **count-up + badge-pop** below.

---

## success-morph  *(button → spinner → check)*

With `flutter_animate`:
```dart
enum BtnState { idle, loading, done }
// ...
AnimatedSwitcher(
  duration: const Duration(milliseconds: 220),
  transitionBuilder: (c, a) => ScaleTransition(
    scale: Tween(begin: 0.8, end: 1.0).animate(CurvedAnimation(parent: a, curve: easeOut)),
    child: FadeTransition(opacity: a, child: c)),
  child: switch (state) {
    BtnState.idle    => const Text('Submit', key: ValueKey('i')),
    BtnState.loading => const SizedBox(key: ValueKey('l'), width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
    BtnState.done    => const Icon(Icons.check, key: ValueKey('d'), color: Colors.white)
                          .animate().scale(curve: Curves.easeOutBack, duration: 320.ms),
  },
)
```
For a *drawing* check, use `flutter_animate`'s `.custom()` over a `CustomPaint` that strokes the path by `value`, or the `simple_animations` package.

---

## list-stagger + reorder slide

Stagger on build with `flutter_animate`:
```dart
ListView(children: [
  for (final (i, item) in items.indexed)
    Tile(item).animate().fadeIn(delay: (i * 45).ms, duration: 300.ms)
                        .slideY(begin: 0.15, end: 0, curve: easeOut),
])
```
Physical reorder/insert/remove → `AnimatedList` (items slide via `SizeTransition`/`SlideTransition`), or `ReorderableListView` for drag. For implicit list diffing with motion, the `animated_list_plus` / `implicitly_animated_reorderable_list` packages give FLIP-like slides.

RTL: the `slideY` enter above is direction-agnostic. Only if you switch to a horizontal `slideX` enter, or hand a horizontal `Offset` to an `AnimatedList` `SlideTransition`, do you flip the X begin with `sx` per the RTL section.

---

## skeleton-to-content

```dart
AnimatedSwitcher(
  duration: const Duration(milliseconds: 260),
  child: loading
    ? const SkeletonCard(key: ValueKey('s'))                 // shimmer via flutter_animate .shimmer()
    : RealCard(key: const ValueKey('c'), data: data)
        .animate().fadeIn(duration: 260.ms).blurXY(begin: 6, end: 0), // blur bridges the swap
)
```
Skeleton shimmer: `SkeletonCard().animate(onPlay: (c) => c.repeat()).shimmer(duration: 1100.ms)`.

---

## toast-snackbar  *(same-edge spring)*

Custom `SnackBar` content, or an overlay entry:
```dart
content.animate().slideY(begin: 1, end: 0, curve: Curves.easeOutBack, duration: 360.ms)
                 .fadeIn(duration: 200.ms);
// on dismiss: reverse with easeOut, faster (220.ms) — same edge.
// RTL: slideY is direction-agnostic — fine as-is. If you enter from a side edge
// instead (slideX), multiply begin by `sx` per the RTL section above.
```
Built-in `SnackBar` already animates; override `animation`/`behavior: SnackBarBehavior.floating` and wrap content for the spring.

---

## count-up + badge-pop

```dart
// roll the number
TweenAnimationBuilder<double>(
  tween: Tween(begin: prev.toDouble(), end: value.toDouble()),
  duration: const Duration(milliseconds: 500), curve: easeOut,
  builder: (_, v, __) => Text(v.round().toString()),
)
// punch the badge whenever value changes (key off value):
Badge(...).animate(key: ValueKey(value)).scale(
  begin: const Offset(1,1), end: const Offset(1.3,1.3),
  curve: Curves.easeOutBack, duration: 150.ms).then().scale(
  begin: const Offset(1.3,1.3), end: const Offset(1,1), duration: 150.ms);
```
Add `HapticFeedback.lightImpact()` on the change — Flutter's secondary-reaction superpower.

---

## like-burst

```dart
GestureDetector(
  onTap: () { setState(() => liked = !liked); if (liked) { _ring(); HapticFeedback.lightImpact(); } },
  child: Stack(alignment: Alignment.center, children: [
    if (showRing) _Ring(),  // expanding fading circle via animate().scale().fadeOut()
    Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? Colors.red : Colors.grey)
        .animate(target: liked ? 1 : 0).scaleXY(end: 1.2, curve: Curves.easeOutBack, duration: 260.ms),
  ]),
)
// _Ring(): Container(decoration: BoxDecoration(border: ...)).animate()
//   .scaleXY(begin: 0.4, end: 1.8, curve: easeOut, duration: 420.ms).fadeOut();
```

---

## Continuous drivers — the damped follower  *(build this FIRST)*

Same primitive as web (decision-map law 9): scroll/drag/pointer never binds 1:1 to a rendered value. Build once, reuse for every continuous driver.

```dart
import 'dart:math' as math;
import 'package:flutter/scheduler.dart';

/// catchUp: fraction of remaining distance closed per 60fps frame. 0.08–0.15 is the working range.
/// epsilon: how close counts as arrived, IN THE CALLER'S UNITS. 0.01 is sub-pixel for logical
///          pixels; pass 1e-4 for a normalized 0..1 driver like scroll progress.
class DampedValue {
  DampedValue(TickerProvider vsync, {double initial = 0, this.catchUp = 0.1, this.epsilon = 0.01})
      : value = ValueNotifier(initial), _target = initial, _current = initial {
    _ticker = vsync.createTicker(_tick)..start();
  }

  final double catchUp;
  final double epsilon;
  final ValueNotifier<double> value;   // watch this with ValueListenableBuilder
  double velocity = 0;                 // free by-product — feeds velocity-derived blur
  bool reduce = false;                 // set from MediaQuery.of(context).disableAnimations

  double _target, _current;
  late final Ticker _ticker;
  Duration _last = Duration.zero;

  set target(double v) => _target = v;

  void _tick(Duration now) {
    final dt = ((now - _last).inMicroseconds / 1000.0).clamp(0.0, 64.0); // clamp: backgrounded app must not teleport
    _last = now;
    if (reduce) {                                    // law 12: UNBIND, don't shorten
      _current = _target; velocity = 0;
    } else {
      final delta = _target - _current;
      if (delta.abs() < epsilon) {
        _current = _target; velocity = 0;                                // land exactly, stop burning frames
      } else {
        final step = delta * (1 - math.pow(1 - catchUp, dt / 16.67));    // frame-rate independent (120Hz devices)
        _current += step;
        // velocity is the DISPLACEMENT THIS FRAME, normalized to 60fps — NOT the remaining
        // distance, which is ~1/catchUp larger and pins any velocity-derived effect at its clamp.
        velocity = step * (16.67 / dt);
      }
    }
    value.value = _current;
  }

  void dispose() { _ticker.dispose(); value.dispose(); }
}
```

### `scrollScrub` — scroll drives a reveal

```dart
// in a State with SingleTickerProviderStateMixin
late final _damped = DampedValue(this, catchUp: 0.1, epsilon: 1e-4);  // 0..1 driver → tighter epsilon
final _scroll = ScrollController();

@override void initState() {
  super.initState();
  _scroll.addListener(() {
    final max = _scroll.position.maxScrollExtent;
    _damped.target = max <= 0 ? 0 : (_scroll.offset / max).clamp(0.0, 1.0);
  });
}
@override void didChangeDependencies() {
  super.didChangeDependencies();
  _damped.reduce = MediaQuery.of(context).disableAnimations;   // law 12
}
@override void dispose() { _damped.dispose(); _scroll.dispose(); super.dispose(); }

// law 10: a pure function of current position — scrubs backwards correctly, no one-shot state
ValueListenableBuilder<double>(
  valueListenable: _damped.value,
  builder: (_, t, child) => Opacity(
    opacity: 0.4 + t * 0.6,
    child: Transform.translate(offset: Offset(0, (1 - t) * 40), 
      child: Transform.scale(scale: 0.96 + t * 0.04, child: child)),
  ),
  child: const HeavySubtree(),   // passed as `child` so it is NOT rebuilt every frame
)
```

> **Pass the subtree as `child:`, not inside the builder.** The builder runs every frame; anything constructed in there is rebuilt 60–120×/sec. This is the single most common way a Flutter scrub effect becomes a jank source.
> **No `Curve` anywhere on a scrubbed value** (law 11) — a curve maps *time*→progress and the user owns time here. The shaping is `catchUp`.

### `pointerParallax` — desktop/web only, and that's a design decision

```dart
// There is no pointer on touch. Do NOT ship a degraded version — render the settled state.
final hasPointer = {TargetPlatform.macOS, TargetPlatform.windows, TargetPlatform.linux}
    .contains(Theme.of(context).platform) || kIsWeb;

MouseRegion(
  onHover: (e) {
    final size = MediaQuery.of(context).size;
    const maxTravel = 12.0;                       // the clamp is NOT optional
    final nx = (e.position.dx / size.width  - 0.5) * 2;
    _dx.target = (nx * maxTravel * depth).clamp(-maxTravel, maxTravel);   // depth: 0 = pinned, 1 = foreground
  },
  child: ValueListenableBuilder<double>(
    valueListenable: _dx.value,
    builder: (_, x, child) => Transform.translate(offset: Offset(x, 0), child: child),
    child: layer,
  ),
)
```

> **RTL:** derived from **real pointer coordinates**, so it's already correct — do not apply the `sx` flip (same rule as `fly-to-target`/`Hero`).
> **Two-config springs** (`techniques.md` §3): the `catchUp` above is the *follow* regime. An entrance settle wants its own, stiffer config — typically a `SpringSimulation` with higher stiffness. One config cannot serve both.
> On touch-primary builds this whole widget should not exist. Gate it, don't tune it down.

### Velocity-derived blur, free from the follower

```dart
import 'dart:ui' as ui;
// techniques.md §2 — blur reads as SPEED: 0 at rest, clamped at the top.
final sigma = math.min(_damped.velocity.abs() * 0.6, 12.0);
ImageFiltered(
  imageFilter: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
  child: child,
)
```
> Blur is a real render-pass cost on mobile GPUs — spend it on **one** widget, never inside a `ListView`. When `sigma` reaches 0, drop the `ImageFiltered` wrapper entirely rather than leaving a zero-blur filter in the tree.

---

## Text segmentation + stagger order  *(techniques.md §1)*

```dart
enum Order { forward, reverse, centreOut, random }

/// Stagger index → delay rank. Order encodes WHERE the change came from (law 1).
int rank(int i, int n, Order order) => switch (order) {
  Order.reverse   => n - 1 - i,
  Order.centreOut => (i - (n - 1) / 2).abs().round(),
  Order.random    => (i * 2654435761) % n,        // deterministic — stable across rebuilds
  Order.forward   => i,
};
```
```dart
// Split by WORD (see the RTL warning below before reaching for characters).
final words = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();

Semantics(                     // the split text is unreadable to TalkBack/VoiceOver — expose the intact string
  label: text,
  child: ExcludeSemantics(
    child: Wrap(children: [
      for (final (i, w) in words.indexed)
        Text('$w ').animate()
          .fadeIn(delay: (rank(i, words.length, order) * 45).ms, duration: 380.ms)
          .slideY(begin: 0.25, end: 0, curve: easeOut),
    ]),
  ),
)
```

> **Never split Arabic by character.** `text.characters` gives correct grapheme clusters (always prefer it over `split('')`, which mangles emoji and combining marks) — but putting each glyph in its own `Text` widget **breaks cursive shaping**, because each widget is shaped in isolation with no joining context, and each becomes its own bidi run so the right-to-left order scrambles too. Measured on the web side of this same bilingual app: `مرحبا بكم في أوريم` rendered +22% wider split per character (321.5px → 392.7px) with visibly disconnected, mis-ordered glyphs; split per word the delta was 0.0px. Flutter shapes text per-widget the same way, so the failure carries over. Per-character is a rendering bug in `ar`, not a style choice — split by word or line.
> Gate on `MediaQuery.of(context).disableAnimations` — render the whole string at once, no stagger.
> Budget the **total** span: 40 words × 45ms is 1800ms before the last one lands. Law 2 applies to the last piece, not the first.

---

## Verifying Flutter motion
Hot-reload and screenshot, drive via `flutter test` golden frames, or describe the curve/duration choices and confirm against the tokens above. Prefer implicit widgets (`AnimatedScale/Opacity/Switcher`) and `Transform`/`Opacity` over rebuilding layout; gate big travel behind `disableAnimations`.
