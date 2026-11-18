// Self-test for motion_recorder.dart: every animation here has KNOWN values, plus one planted defect of each kind.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'motion_recorder.dart';

/// Three cards enter staggered: 500 ms each, 80 ms apart, fade + slide up 20 px, Curves.easeOutQuart.
class Stagger extends StatefulWidget {
  const Stagger({super.key});
  @override
  State<Stagger> createState() => _StaggerState();
}

class _StaggerState extends State<Stagger> with SingleTickerProviderStateMixin {
  late final c = AnimationController(vsync: this, duration: const Duration(milliseconds: 660))..forward();
  @override
  void dispose() { c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Column(children: [
        for (var i = 0; i < 3; i++)
          () {
            final a = CurvedAnimation(parent: c, curve: Interval(i * 80 / 660, (i * 80 + 500) / 660, curve: Curves.easeOutQuart));
            return FadeTransition(
              opacity: a,
              child: AnimatedBuilder(
                animation: a,
                builder: (_, child) => Transform.translate(offset: Offset(0, 20 * (1 - a.value)), child: child),
                child: SizedBox(key: ValueKey('card$i'), width: 200, height: 40, child: const ColoredBox(color: Color(0xFF446688))),
              ),
            );
          }(),
      ]);
}

/// Planted defects: a flash (visible first frame, then hidden, then enters), a replay (enters twice), a stuck one.
class Defects extends StatefulWidget {
  const Defects({super.key});
  @override
  State<Defects> createState() => _DefectsState();
}

class _DefectsState extends State<Defects> with TickerProviderStateMixin {
  late final flash = AnimationController(vsync: this, duration: const Duration(milliseconds: 400), value: 1);
  late final replay = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 48), () { flash.value = 0; flash.forward(); });
    replay.forward().then((_) { replay.value = 0; replay.forward(); });
  }
  @override
  void dispose() { flash.dispose(); replay.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Column(children: [
        FadeTransition(opacity: flash, child: const SizedBox(key: ValueKey('flash'), width: 200, height: 40)),
        FadeTransition(opacity: replay, child: const SizedBox(key: ValueKey('replay'), width: 200, height: 40)),
        const Opacity(opacity: 0, child: SizedBox(key: ValueKey('stuck'), width: 200, height: 40, child: Text('never shows'))),
      ]);
}

/// Press feedback: scale to 0.95 in 100 ms while held, back to 1 in 200 ms, Curves.easeOutCubic.
class Press extends StatefulWidget {
  const Press({super.key});
  @override
  State<Press> createState() => _PressState();
}

class _PressState extends State<Press> {
  bool down = false;
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTapDown: (_) => setState(() => down = true),
        onTapUp: (_) => setState(() => down = false),
        onTapCancel: () => setState(() => down = false),
        child: AnimatedScale(
          scale: down ? 0.95 : 1,
          duration: Duration(milliseconds: down ? 100 : 200),
          curve: Curves.easeOutCubic,
          child: const SizedBox(key: ValueKey('button'), width: 200, height: 60, child: ColoredBox(color: Color(0xFF884466))),
        ),
      );
}

Widget app(Widget w) => Directionality(textDirection: TextDirection.ltr, child: Align(alignment: Alignment.topLeft, child: w));

void main() {
  testWidgets('stagger entrance: 500 ms easeOutQuart, 80 ms apart, 20 px', (tester) async {
    await tester.pumpWidget(app(const Stagger()));
    final r = await recordMotion(tester, name: 'stagger', duration: const Duration(milliseconds: 900),
        targets: find.byWidgetPredicate((w) => w.key is ValueKey && '${(w.key as ValueKey).value}'.startsWith('card')));
    debugPrint(r.table.join('\n'));
    final g = r.groups.single;
    expect(g.count, 3);
    expect(g.staggerMs, inInclusiveRange(64, 96));
    expect(g.props['opacity']!.single.ms, inInclusiveRange(450, 520));
    expect(g.props['opacity']!.single.curve, startsWith('Curves.easeOutQuart'));
    expect(g.props['y']!.single.from, closeTo(20, 1));
    expect(r.flashOrReplay, isEmpty);
    expect(r.stuckHidden, isEmpty);
  });

  testWidgets('defect flags fire on the planted defects only', (tester) async {
    await tester.pumpWidget(app(const Defects()));
    final r = await recordMotion(tester, name: 'defects', duration: const Duration(milliseconds: 1200),
        targets: find.byWidgetPredicate((w) => w.key is ValueKey && const {'flash', 'replay', 'stuck'}.contains((w.key as ValueKey).value)),
        label: (e) => '${(e.widget.key as ValueKey).value}');
    debugPrint(r.table.join('\n'));
    expect(r.flashBeforeEntrance, ['flash']);
    expect(r.flashOrReplay, ['replay']);
    expect(r.stuckHidden, ['stuck']);
  });

  testWidgets('press: down 100 ms to 0.95, release 200 ms back, easeOutCubic', (tester) async {
    await tester.pumpWidget(app(const Press()));
    late TestGesture g;
    final r = await recordMotion(tester, name: 'press', duration: const Duration(milliseconds: 1000),
        targets: find.byKey(const ValueKey('button')),
        actions: {
          Duration.zero: () async => g = await tester.startGesture(tester.getCenter(find.byKey(const ValueKey('button')))),
          const Duration(milliseconds: 500): () async => g.up(),
        });
    debugPrint(r.table.join('\n'));
    final ph = r.groups.single.props['scale']!;
    expect(ph.length, 2);
    expect(ph[0].to, closeTo(0.95, 0.005));
    expect(ph[0].ms, inInclusiveRange(80, 120));
    expect(ph[1].ms, inInclusiveRange(176, 224));
    expect(ph[1].curve, startsWith('Curves.easeOutCubic'));
  });
}
