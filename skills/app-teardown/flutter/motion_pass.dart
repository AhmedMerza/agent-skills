// Whole-page motion pass for Flutter widget tests: the Flutter twin of motion-pass.sh `open` + `targets`.
//
// recordMotion() needs hand-picked targets; this finds them itself. It pumps the page, discovers every visible
// text, icon, surface (DecoratedBox / Material / Card) and CustomPaint chart inside it, records the entrance frame
// by frame, rebuilds the whole tree to catch replays, press-holds every tappable and diffs its pixels, and runs
// flutter_test's tap-target guidelines. Copy it into the app's test/support/ beside motion_recorder.dart.
//
//   final r = await motionPass(tester, page: const MyPage(),
//       mount: (p) => pumpApp(tester, p, surface: const Size(1440, 2400)));   // the app's own fakes
//   debugPrint(r.table.join('\n'));
//   expect(r.motionless, isEmpty); expect(r.replayed, isEmpty); expect(r.noPressResponse, isEmpty);
//   expect(r.tapTargets, isNull); expect(r.unlabeledTapTargets, isNull);
//
// Fake clock: this checks motion, not jank. Jank: flutter/perf_test.dart on a device or desktop in --profile.
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'motion_recorder.dart';

class MotionPassReport {
  MotionPassReport({
    required this.name,
    required this.entrance,
    required this.rebuild,
    required this.found,
    required this.motionless,
    required this.replayed,
    required this.ambient,
    required this.stagger,
    required this.blockEntrance,
    required this.pressed,
    required this.noPressResponse,
    required this.obscured,
    required this.tapTargets,
    required this.unlabeledTapTargets,
  });
  final String name;
  final MotionReport entrance, rebuild;
  final Map<String, int> found; // kind -> visible count at the end
  /// Visible at the end, never moved (opacity/x/y/scale/rotate/size, or a chart that never repainted). The main failure.
  final List<String> motionless;
  /// Moved again after the whole tree was rebuilt (entrance re-run on update), or re-ran inside the entrance.
  final List<String> replayed;
  /// Still moving when the entrance window closed (spinners, live tickers): excluded from the replay check.
  final List<String> ambient;
  /// kind -> (moving elements, distinct start frames, first..last start ms).
  final Map<String, ({int moving, int starts, int firstMs, int lastMs})> stagger;
  /// Three or more things move and all start within two frames: a block fade, not a per-element entrance.
  final bool blockEntrance;
  final int pressed;
  final List<String> noPressResponse, obscured;
  /// null = passes androidTapTargetGuideline (48 dp) / labeledTapTargetGuideline; else flutter_test's reason.
  final String? tapTargets, unlabeledTapTargets;

  List<String> get flashBeforeEntrance => entrance.flashBeforeEntrance;
  List<String> get stuckHidden => entrance.stuckHidden;

  List<String> get table => [
        '$name: visible $found, entrance settled ${entrance.settledMs}ms${blockEntrance ? ' | BLOCK ENTRANCE (no stagger)' : ''}',
        for (final MapEntry(key: k, value: s) in stagger.entries)
          '  stagger $k: ${s.moving} moving, ${s.starts} start frames, +${s.firstMs}..+${s.lastMs}ms',
        'motionless (${motionless.length}): ${motionless.join(', ')}',
        'flashBeforeEntrance ${entrance.flashBeforeEntrance} stuckHidden ${entrance.stuckHidden}',
        'replayed after rebuild (${replayed.length}): ${replayed.join(', ')}',
        if (ambient.isNotEmpty) 'ambient (still moving at end, not judged): ${ambient.join(', ')}',
        'press: $pressed held, no response (${noPressResponse.length}): ${noPressResponse.join(', ')}'
            '${obscured.isEmpty ? '' : ' | obscured, not pressed: ${obscured.join(', ')}'}',
        'tap targets 48dp: ${tapTargets == null ? 'pass' : tapTargets!.split('\n').where((l) => l.trim().isNotEmpty).take(6).join(' / ')}',
        'labeled tap targets: ${unlabeledTapTargets == null ? 'pass' : unlabeledTapTargets!.split('\n').where((l) => l.trim().isNotEmpty).take(6).join(' / ')}',
      ];
}

bool _paints(Decoration d) => switch (d) {
      BoxDecoration(:final color, :final gradient, :final border, :final boxShadow, :final image) =>
        (color != null && color.a > 0.02) || gradient != null || border != null || (boxShadow?.isNotEmpty ?? false) || image != null,
      ShapeDecoration(:final color, :final gradient, :final shadows) =>
        (color != null && color.a > 0.02) || gradient != null || (shadows?.isNotEmpty ?? false),
      _ => true,
    };

String? _kind(Element e) {
  final w = e.widget;
  if (w is RichText) return e.findAncestorWidgetOfExactType<Icon>() != null ? 'icon' : 'text';
  if (w is DecoratedBox && _paints(w.decoration)) return 'surface';
  if (w is Material && w.type != MaterialType.transparency && ((w.color?.a ?? 1) > 0.02 || w.elevation > 0)) return 'surface';
  if (w is CustomPaint) {
    final p = w.painter ?? w.foregroundPainter;
    if (p != null && !RegExp('Scrollbar|Overscroll|Glow|Ink|ShapeBorderPainter').hasMatch('${p.runtimeType}')) return 'chart';
  }
  return null;
}

bool _tappable(Widget w) => switch (w) {
      InkResponse(:final onTap, :final onTapDown) => onTap != null || onTapDown != null,
      GestureDetector(:final onTap, :final onTapDown) => onTap != null || onTapDown != null,
      ButtonStyleButton(:final onPressed) => onPressed != null,
      IconButton(:final onPressed) => onPressed != null,
      _ => false,
    };

/// First text under [e], for a readable label.
String _text(Element e) {
  String? t;
  void visit(Element c) {
    if (t != null) return;
    if (c.widget is RichText) { t = (c.widget as RichText).text.toPlainText(); return; }
    c.visitChildElements(visit);
  }
  visit(e);
  final s = (t ?? '').replaceAll('\n', ' ').trim();
  return s.length > 24 ? '${s.substring(0, 24)}…' : s;
}

/// The part of [e] actually on screen: inside the view and every ancestor scroll viewport.
Rect? _visibleRect(Element e, Rect view) {
  final ro = e.renderObject;
  if (ro is! RenderBox || !ro.attached || !ro.hasSize || ro.size.isEmpty) return null;
  var r = MatrixUtils.transformRect(ro.getTransformTo(null), Offset.zero & ro.size).intersect(view);
  for (RenderObject? p = ro.parent; p != null; p = p.parent) {
    if (p is RenderViewportBase && p.hasSize) {
      r = r.intersect(MatrixUtils.transformRect(p.getTransformTo(null), Offset.zero & p.size));
    }
  }
  return r.width > 1 && r.height > 1 ? r : null;
}

bool _moved(MotionGroup g) => g.props.values.any((ph) => ph.any((x) => !x.instant));

/// Mounts [page] (via [mount]: pass the app's own provider/fake setup; default MaterialApp + Scaffold) and runs the
/// pass. [rebuild] replaces the default replay trigger (mark every element dirty, as a parent setState or a theme
/// change would). [maxTappables] caps how many tappables are press-held.
Future<MotionPassReport> motionPass(
  WidgetTester tester, {
  required Widget page,
  String name = 'page',
  Future<void> Function(Widget page)? mount,
  Future<void> Function()? rebuild,
  Duration entrance = const Duration(milliseconds: 2400),
  int maxTappables = 40,
}) async {
  final semantics = tester.ensureSemantics();
  await (mount ?? (p) => tester.pumpWidget(MaterialApp(home: Scaffold(body: p))))(page);
  final view = Offset.zero & (tester.view.physicalSize / tester.view.devicePixelRatio);
  final dpr = tester.view.devicePixelRatio;

  // Each element gets a unique label so the recorder's groups are per element; charts also log every painter they
  // are given and every repaint their painter's Listenable fires (a draw-in moves pixels, not the render box).
  final labels = Expando<String>();
  final kinds = Expando<String>();
  final painters = <Element, Set<CustomPainter>>{};
  final repaints = <Element, int>{};
  final unlisten = <VoidCallback>[];
  var n = 0;
  final targets = find.descendant(
    of: find.byWidget(page),
    matching: find.byElementPredicate((e) {
      final k = kinds[e] ?? _kind(e);
      if (k == null) return false;
      if (labels[e] == null) {
        kinds[e] = k;
        final w = e.widget;
        labels[e] = '$k#${n++} ${switch (k) {
          'chart' => '${((w as CustomPaint).painter ?? w.foregroundPainter).runtimeType}',
          'icon' => 'U+${e.findAncestorWidgetOfExactType<Icon>()!.icon?.codePoint.toRadixString(16)}',
          _ => '"${_text(e)}"',
        }}';
        if (k == 'chart') {
          final p = (e.widget as CustomPaint).painter ?? (e.widget as CustomPaint).foregroundPainter!;
          void tick() => repaints[e] = (repaints[e] ?? 0) + 1;
          p.addListener(tick);
          unlisten.add(() => p.removeListener(tick));
        }
      }
      if (k == 'chart') {
        final w = e.widget as CustomPaint;
        (painters[e] ??= {}).add((w.painter ?? w.foregroundPainter)!);
      }
      return true;
    }),
  );
  String lab(Element e) => labels[e] ?? '?';
  bool shown(Element e) => _visibleRect(e, view) != null && (readMotion(e)?['opacity'] ?? 0) > 0.05;

  final atStart = {for (final e in targets.evaluate()) if (shown(e) && readMotion(e)!['opacity']! > 0.9) e};
  final ent = await recordMotion(tester, name: '$name entrance', targets: targets, duration: entrance, label: lab);
  final endMs = entrance.inMilliseconds;
  final moved = {for (final g in ent.groups) if (_moved(g)) g.label};
  final ambient = [
    for (final g in ent.groups)
      if (g.props.values.expand((x) => x).any((x) => !x.instant && x.startMs + x.ms >= endMs - 250)) g.label
  ];
  final visible = [for (final e in targets.evaluate()) if (shown(e)) e];
  bool chartMoved(Element e) => (painters[e]?.length ?? 0) > 2 || (repaints[e] ?? 0) > 2;
  final motionless = [
    for (final e in visible)
      if (!moved.contains(lab(e)) && !(kinds[e] == 'chart' && chartMoved(e))) '${lab(e)}${atStart.contains(e) ? '' : ' (popped in)'}'
  ];
  final found = <String, int>{};
  for (final e in visible) { found[kinds[e]!] = (found[kinds[e]!] ?? 0) + 1; }

  int start(MotionGroup g) => g.props.values.expand((x) => x).where((x) => !x.instant).map((x) => x.startMs).reduce(math.min);
  final byKind = <String, List<int>>{};
  for (final g in ent.groups) {
    if (_moved(g)) (byKind[g.label.split('#').first] ??= []).add(start(g));
  }
  final stagger = {
    for (final MapEntry(key: k, value: s) in byKind.entries)
      k: (moving: s.length, starts: s.map((x) => x ~/ 16).toSet().length, firstMs: s.reduce(math.min), lastMs: s.reduce(math.max))
  };
  final allStarts = byKind.values.expand((x) => x).toList();
  final block = allStarts.length >= 3 && allStarts.reduce(math.max) - allStarts.reduce(math.min) < 32;

  // Replay: rebuild every element (what a parent setState, provider notify or theme change does), record again.
  painters.clear();
  repaints.clear();
  await (rebuild ?? () async {
    void dirty(Element e) { e.markNeedsBuild(); e.visitChildElements(dirty); }
    dirty(tester.binding.rootElement!);
  })();
  final reb = await recordMotion(tester, name: '$name rebuild', targets: targets, duration: const Duration(milliseconds: 1200), label: lab);
  final replayed = <String>{
    ...ent.flashOrReplay,
    for (final g in reb.groups) if (_moved(g) && !ambient.contains(g.label)) g.label,
    for (final e in targets.evaluate())
      if (kinds[e] == 'chart' && !ambient.contains(lab(e)) && chartMoved(e)) lab(e),
  }.toList();
  for (final u in unlisten) { u(); }

  // Press: hold each visible, unobscured tappable 240 ms (past the 100 ms tap-down delay inside a scrollable),
  // diff its pixels against an idle frame, then cancel (no onTap fires, nothing navigates).
  Future<(Uint8List, int)> shot() async => (await tester.runAsync(() async {
        final img = await captureImage(tester.binding.rootElement!);
        final d = (await img.toByteData())!.buffer.asUint8List();
        final w = img.width;
        img.dispose();
        return (d, w);
      }))!;
  int diff(Uint8List a, Uint8List b, int w, Rect r) {
    final h = a.length ~/ (4 * w);
    var c = 0;
    for (var y = math.max(0, (r.top * dpr).floor()); y < math.min(h, (r.bottom * dpr).ceil()); y++) {
      for (var x = math.max(0, (r.left * dpr).floor()); x < math.min(w, (r.right * dpr).ceil()); x++) {
        final i = (y * w + x) * 4;
        if ((a[i] - b[i]).abs() > 24 || (a[i + 1] - b[i + 1]).abs() > 24 || (a[i + 2] - b[i + 2]).abs() > 24) c++;
      }
    }
    return c;
  }

  final seen = <String>{};
  final taps = <(Element, Rect)>[];
  for (final e in find.descendant(of: find.byWidget(page), matching: find.byWidgetPredicate(_tappable)).evaluate()) {
    var inButton = false; // IconButton's own ButtonStyleButton/InkWell: one control, pressed once
    e.visitAncestorElements((a) => !(inButton = a.widget is ButtonStyleButton || a.widget is IconButton));
    final r = inButton ? null : _visibleRect(e, view);
    if (r == null || !seen.add('${r.left.round()},${r.top.round()},${r.right.round()},${r.bottom.round()}')) continue; // InkWell inside a button: same rect, once
    taps.add((e, r));
  }
  final noResponse = <String>[], obscured = <String>[];
  var pressed = 0;
  for (final (e, r) in taps.take(maxTappables)) {
    if (!e.mounted) continue;
    final label = '${e.widget.runtimeType} "${_text(e)}"';
    final ro = e.renderObject;
    if (!tester.hitTestOnBinding(r.center).path.any((h) => h.target == ro)) { obscured.add(label); continue; }
    await tester.pump(const Duration(milliseconds: 16));
    final (idle0, w) = await shot();
    await tester.pump(const Duration(milliseconds: 100));
    final (idle1, _) = await shot();
    final g = await tester.startGesture(r.center);
    for (var t = 0; t < 240; t += 16) { await tester.pump(const Duration(milliseconds: 16)); }
    final (held, _) = await shot();
    await g.cancel();
    for (var t = 0; t < 700; t += 50) { await tester.pump(const Duration(milliseconds: 50)); }
    pressed++;
    final noise = diff(idle0, idle1, w, r), changed = diff(idle1, held, w, r);
    if (changed <= math.max(12, 3 * noise)) noResponse.add('$label ($changed px changed, idle noise $noise)');
  }

  final size = await androidTapTargetGuideline.evaluate(tester);
  final labeled = await labeledTapTargetGuideline.evaluate(tester);
  semantics.dispose();

  return MotionPassReport(
    name: name,
    entrance: ent,
    rebuild: reb,
    found: found,
    motionless: motionless,
    replayed: replayed,
    ambient: ambient,
    stagger: stagger,
    blockEntrance: block,
    pressed: pressed,
    noPressResponse: noResponse,
    obscured: obscured,
    tapTargets: size.passed ? null : size.reason,
    unlabeledTapTargets: labeled.passed ? null : labeled.reason,
  );
}
