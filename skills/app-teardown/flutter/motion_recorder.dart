// Frame-by-frame motion recorder for Flutter widget tests: the Flutter twin of motion-probe.js.
//
// Flutter web draws to a canvas, so the browser recorder sees nothing inside a Flutter app. A widget test can:
// it steps the clock one frame at a time and reads each widget's REAL opacity, position, scale and rotation
// from the render tree. Exact, deterministic, no device. Copy this file into the app's test/ folder.
//
//   final report = await recordMotion(tester, name: 'orders entrance',
//       targets: find.byKey(const ValueKey('order-card'), skipOffstage: false) /* or find.byType(OrderCard) */);
//   debugPrint(report.table.join('\n'));
//   expect(report.stuckHidden, isEmpty); expect(report.flashOrReplay, isEmpty);
//
// Interactions: pass `actions`, run at the given time inside the recording, e.g. a press held 600 ms:
//   late TestGesture g;
//   actions: {Duration.zero: () async => g = await tester.startGesture(tester.getCenter(find.text('Save'))),
//             const Duration(milliseconds: 600): () async => g.up()}
//
// It records what the frame shows, not what the code says; compare it with the declared Duration/Curve in code.
// Jank is NOT measured here (widget tests use a fake clock): use integration_test + traceAction (see SKILL.md §5b).
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// Flutter curves the fit is tried against, with the GSAP name of the same shape (for copying a web reference).
const Map<String, Curve> _curves = {
  'Curves.linear': Curves.linear,
  'Curves.easeOut': Curves.easeOut,
  'Curves.easeOutCubic (≈power2.out)': Curves.easeOutCubic,
  'Curves.easeOutQuart (≈power3.out)': Curves.easeOutQuart,
  'Curves.easeOutQuint (≈power4.out)': Curves.easeOutQuint,
  'Curves.easeOutExpo (≈expo.out)': Curves.easeOutExpo,
  'Curves.easeOutBack (≈back.out(1.7))': Curves.easeOutBack,
  'Curves.fastOutSlowIn': Curves.fastOutSlowIn,
  'Curves.decelerate': Curves.decelerate,
  'Curves.easeInOut': Curves.easeInOut,
  'Curves.easeInOutCubic (≈power2.inOut)': Curves.easeInOutCubic,
  'Curves.easeIn': Curves.easeIn,
  'Curves.easeInCubic (≈power2.in)': Curves.easeInCubic,
};

class MotionPhase {
  MotionPhase(this.startMs, this.ms, this.from, this.to, this.overshoot, this.curve);
  final int startMs, ms;
  final double from, to, overshoot;
  final String? curve;
  bool get instant => ms == 0;
}

class MotionGroup {
  MotionGroup(this.label, this.count, this.startMs, this.staggerMs, this.props, this.replays);
  final String label;
  final int count, startMs, staggerMs, replays;
  final Map<String, List<MotionPhase>> props; // first element of the group, per prop
}

class MotionReport {
  MotionReport(this.name, this.settledMs, this.groups, this.stuckHidden, this.flashOrReplay, this.flashBeforeEntrance);
  final String name;
  final int settledMs;
  final List<MotionGroup> groups;
  final List<String> stuckHidden, flashOrReplay, flashBeforeEntrance;

  static String _n(double v) => v.abs() >= 10 ? v.toStringAsFixed(0) : v.toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '');
  static String _ph(String p, MotionPhase x) => x.instant
      ? '${_n(x.from)}→${_n(x.to)} instant'
      : '${_n(x.from)}→${_n(x.to)} ${x.ms}ms ${x.curve ?? ''}${x.overshoot > 0.01 ? ' over+${x.overshoot.toStringAsFixed(2)}' : ''}';

  /// Readable lines, same shape as the web recorder's out(name, 'table'). x/y are offsets from the final position.
  List<String> get table => [
        '$name settled ${settledMs}ms, ${groups.length} moving groups',
        for (final g in groups)
          '+${g.startMs}ms ${g.label}${g.count > 1 ? ' ×${g.count} stagger ${g.staggerMs}ms' : ''} | '
              '${g.props.entries.map((e) => e.value.length == 1 ? '${e.key} ${_ph(e.key, e.value.first)}' : '${e.key} phases: ${e.value.map((x) => '${x.startMs}ms ${_ph(e.key, x)}').join(' / ')}').join('; ')}'
              '${g.replays > 0 ? ' | REPLAY' : ''}',
        'defects: flashBeforeEntrance $flashBeforeEntrance flashOrReplay $flashOrReplay stuckHidden $stuckHidden',
      ];
}

/// One element's current opacity (through Opacity/FadeTransition ancestors), centre, scale, rotation and size, or null.
Map<String, double>? readMotion(Element e) {
  final ro = e.renderObject;
  if (ro is! RenderBox || !ro.attached || !ro.hasSize) return null;
  final m = ro.getTransformTo(null);
  final r = MatrixUtils.transformRect(m, Offset.zero & ro.size);
  var opacity = 1.0;
  for (RenderObject? p = ro; p != null; p = p.parent) {
    if (p is RenderOpacity) opacity *= p.opacity;
    if (p is RenderAnimatedOpacity) opacity *= p.opacity.value; // FadeTransition, AnimatedOpacity
  }
  final s = m.storage;
  return {
    'opacity': opacity,
    // centre, not top-left: a scale around the centre must not read as movement
    'x': r.center.dx,
    'y': r.center.dy,
    'scale': math.sqrt(s[0] * s[0] + s[1] * s[1]),
    'rotate': math.atan2(s[1], s[0]) * 180 / math.pi,
    'width': ro.size.width,
    'height': ro.size.height,
  };
}

/// Split one prop's per-frame series into phases: a phase ends where the value holds still (>=150 ms) or reverses
/// by more than 30% of its travel (smaller reversals are overshoot settling). Press = down + up; flash = instant
/// hide + entrance; replay = a later phase repeating an earlier one.
List<MotionPhase> _phases(List<int> t, List<double> v, int t0) {
  final out = <MotionPhase>[];
  var i = 1;
  while (i < v.length) {
    if ((v[i] - v[i - 1]).abs() < 1e-4) { i++; continue; }
    final st = i - 1;
    var ext = i, en = i, j = i + 1, still = 0, reversed = false;
    while (j < v.length) {
      if ((v[j] - v[j - 1]).abs() < 1e-4) { still += t[j] - t[j - 1]; if (still >= 150) break; j++; continue; }
      still = 0;
      final travel = (v[ext] - v[st]).abs();
      if ((v[j] - v[st]).abs() >= travel) {
        ext = j;
      } else if (travel > 1e-6 && (v[ext] - v[j]).abs() > 0.3 * travel) { reversed = true; break; }
      en = j;
      j++;
    }
    if (reversed) en = ext;
    final span = v[en] - v[st];
    if (span.abs() > 1e-6) {
      final ms = en == st + 1 ? 0 : t[en] - t[st];
      String? curve;
      if (ms > 0 && en - st >= 4) {
        var best = double.infinity;
        _curves.forEach((name, c) {
          var err = 0.0;
          for (var k = st; k <= en; k++) {
            final u = (t[k] - t[st]) / (t[en] - t[st]);
            err += math.pow(c.transform(u.clamp(0.0, 1.0)) - (v[k] - v[st]) / span, 2);
          }
          err = math.sqrt(err / (en - st + 1));
          if (err < best) { best = err; curve = name + (err < 0.06 ? '' : '?'); }
        });
      }
      final peak = [for (var k = st; k <= en; k++) (v[k] - v[st]) / span].reduce(math.max);
      out.add(MotionPhase(t[st] - t0, ms, v[st], v[en], peak - 1, curve));
    }
    i = reversed ? ext + 1 : (j > en ? en + 1 : j);
  }
  return out;
}

/// Records [targets] for [duration], pumping one [frame] at a time. [actions] run at their offsets (real gestures
/// via tester.startGesture / tap). [label] names an element for grouping (default: widget type + non-value key).
Future<MotionReport> recordMotion(
  WidgetTester tester, {
  required String name,
  required Finder targets,
  Duration duration = const Duration(seconds: 2),
  Duration frame = const Duration(milliseconds: 16),
  Map<Duration, Future<void> Function()> actions = const {},
  String Function(Element)? label,
}) async {
  final tracks = <Element, List<MapEntry<int, Map<String, double>>>>{};
  final pending = actions.entries.toList()..sort((a, b) => a.key.compareTo(b.key));
  void sample(int t) {
    for (final e in targets.evaluate()) {
      final v = readMotion(e);
      if (v != null) (tracks[e] ??= []).add(MapEntry(t, v));
    }
  }

  var now = 0;
  sample(0);
  final end = duration.inMilliseconds;
  while (now < end) {
    while (pending.isNotEmpty && pending.first.key.inMilliseconds <= now) { await pending.removeAt(0).value(); }
    await tester.pump(frame);
    now += frame.inMilliseconds;
    sample(now);
  }

  final view = tester.view.physicalSize / tester.view.devicePixelRatio;
  String lab(Element e) => label?.call(e) ?? '${e.widget.runtimeType}${e.widget.key is ValueKey || e.widget.key == null ? '' : ' ${e.widget.key}'}';
  final rows = <({String label, int start, Map<String, List<MotionPhase>> props, int replays, bool stuck, bool flash})>[];
  for (final MapEntry(key: e, value: s) in tracks.entries) {
    final t = [for (final x in s) x.key];
    final props = <String, List<MotionPhase>>{};
    var replays = 0;
    for (final p in const ['opacity', 'x', 'y', 'scale', 'rotate', 'width', 'height']) {
      var v = [for (final x in s) x.value[p]!];
      if (p == 'x' || p == 'y') v = [for (final x in v) x - v.last]; // offset from where it ends
      final ph = _phases(t, v, 0);
      if (ph.isEmpty) continue;
      final moving = ph.where((x) => !x.instant).toList();
      // replay = a moving phase repeating an earlier one right after an INSTANT jump back (a re-run entrance);
      // a live value that pops on every update eases back each time, so it is not a replay
      for (var k = 2; k < ph.length; k++) {
        final a = ph[k], tr = (a.to - a.from).abs();
        if (a.instant || !ph[k - 1].instant) continue;
        if (ph.take(k - 1).any((b) => !b.instant && (a.from - b.from).abs() < 0.1 * tr && (a.to - b.to).abs() < 0.1 * tr)) replays++;
      }
      if ((p == 'width' || p == 'height') && moving.isEmpty) continue; // layout jump, not motion
      props[p] = ph;
    }
    if (props.isEmpty) continue;
    final last = s.last.value, first = s.first.value;
    final onScreen = last['x']! > 0 && last['y']! > 0 && last['x']! < view.width && last['y']! < view.height;
    final op = props['opacity'];
    final flash = first['opacity']! > 0.9 && op != null && op.first.instant && op.first.to < 0.05 && op.length > 1;
    final start = props.values.expand((x) => x).map((x) => x.startMs).reduce(math.min);
    rows.add((label: lab(e), start: start, props: props, replays: replays, stuck: onScreen && last['opacity']! < 0.05, flash: flash));
  }
  // stuck elements never move, so they never made a row: check every target at the end
  final stuck = <String>[
    for (final MapEntry(key: e, value: s) in tracks.entries)
      if (s.last.value['opacity']! < 0.05 && s.last.value['x']! > 0 && s.last.value['y']! > 0 && s.last.value['x']! < view.width && s.last.value['y']! < view.height) lab(e)
  ];

  final byLabel = <String, List<({String label, int start, Map<String, List<MotionPhase>> props, int replays, bool stuck, bool flash})>>{};
  for (final r in rows) { (byLabel[r.label] ??= []).add(r); }
  final groups = [
    for (final MapEntry(key: l, value: a) in byLabel.entries)
      () {
        a.sort((x, y) => x.start.compareTo(y.start));
        final gaps = [for (var k = 1; k < a.length; k++) a[k].start - a[k - 1].start]..sort();
        return MotionGroup(l, a.length, a.first.start, gaps.isEmpty ? 0 : gaps[gaps.length ~/ 2], a.first.props, a.fold(0, (s, x) => s + x.replays));
      }()
  ]..sort((a, b) => a.startMs.compareTo(b.startMs));
  final settled = rows.isEmpty ? 0 : rows.expand((r) => r.props.values.expand((x) => x)).map((x) => x.startMs + x.ms).reduce(math.max);
  return MotionReport(name, settled, groups, stuck, [for (final r in rows) if (r.replays > 0) r.label],
      [for (final r in rows) if (r.flash) r.label]);
}
