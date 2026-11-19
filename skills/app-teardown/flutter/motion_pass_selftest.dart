// Self-test for motion_pass.dart: a clean page that must pass, and one planted defect of each kind that must be flagged.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'motion_pass.dart';

/// Fades + slides its child in once, [delayMs] after mount. [replayOnUpdate] plants the classic bug: the entrance
/// restarts in didUpdateWidget, so any parent rebuild replays it.
class Enter extends StatefulWidget {
  const Enter({super.key, required this.child, this.delayMs = 0, this.replayOnUpdate = false});
  final Widget child;
  final int delayMs;
  final bool replayOnUpdate;
  @override
  State<Enter> createState() => _EnterState();
}

class _EnterState extends State<Enter> with SingleTickerProviderStateMixin {
  late final c = AnimationController(vsync: this, duration: Duration(milliseconds: 400 + widget.delayMs));
  @override
  void initState() { super.initState(); c.forward(); }
  @override
  void didUpdateWidget(Enter old) { super.didUpdateWidget(old); if (widget.replayOnUpdate) c.forward(from: 0); }
  @override
  void dispose() { c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final a = CurvedAnimation(parent: c, curve: Interval(widget.delayMs / (400 + widget.delayMs), 1, curve: Curves.easeOutCubic));
    return FadeTransition(
      opacity: a,
      child: AnimatedBuilder(animation: a, builder: (_, ch) => Transform.translate(offset: Offset(0, 16 * (1 - a.value)), child: ch), child: widget.child),
    );
  }
}

/// Press feedback the house way: scale down while held.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child});
  final Widget child;
  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool down = false;
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () {},
        onTapDown: (_) => setState(() => down = true),
        onTapCancel: () => setState(() => down = false),
        onTapUp: (_) => setState(() => down = false),
        child: AnimatedScale(scale: down ? 0.94 : 1, duration: const Duration(milliseconds: 80), child: widget.child),
      );
}

Widget card(String t, {double h = 60}) => DecoratedBox(
      decoration: BoxDecoration(color: const Color(0xFF335577), borderRadius: BorderRadius.circular(8)),
      child: SizedBox(width: 240, height: h, child: Center(child: Text(t))),
    );

class CleanPage extends StatelessWidget {
  const CleanPage({super.key});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (var i = 0; i < 3; i++) Enter(delayMs: i * 80, child: card('card $i')),
        Enter(delayMs: 240, child: Pressable(child: card('Save'))),
        Enter(delayMs: 320, child: IconButton(onPressed: () {}, tooltip: 'Close', icon: const Icon(Icons.close))),
      ]);
}

class DefectPage extends StatelessWidget {
  const DefectPage({super.key});
  @override
  // ignore: prefer_const_constructors
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        card('motionless'), // DEFECT 1: visible from frame 0, never moves
        Enter(child: GestureDetector(onTap: () {}, child: card('dead button'))), // DEFECT 2: no press response
        // ignore: prefer_const_constructors
        Enter(delayMs: 80, replayOnUpdate: true, child: card('replays')), // DEFECT 3: replays on rebuild
        Enter(
          delayMs: 160,
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(onTap: () {}, child: Semantics(label: 'tiny', child: const SizedBox(width: 30, height: 30))),
          ),
        ), // DEFECT 4: 30 dp tap target (it does show an ink splash, so no press finding)
      ]);
}

Future<void> mountAt(WidgetTester tester, Widget p) async {
  tester.view.physicalSize = const Size(400, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  // 16 px gutter: the 48 dp guideline skips nodes touching the screen edge.
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: p))));
}

void main() {
  testWidgets('clean page: everything enters staggered, presses respond, targets pass', (tester) async {
    const page = CleanPage();
    final r = await motionPass(tester, name: 'clean', page: page, mount: (p) => mountAt(tester, p));
    debugPrint(r.table.join('\n'));
    expect(r.motionless, isEmpty);
    expect(r.replayed, isEmpty);
    expect(r.flashBeforeEntrance, isEmpty);
    expect(r.stuckHidden, isEmpty);
    expect(r.blockEntrance, isFalse);
    expect(r.stagger['surface']!.starts, greaterThanOrEqualTo(3));
    expect(r.pressed, 2);
    expect(r.noPressResponse, isEmpty);
    expect(r.tapTargets, isNull);
    expect(r.unlabeledTapTargets, isNull);
  });

  testWidgets('defect page: each planted defect is flagged, nothing else', (tester) async {
    const page = DefectPage();
    final r = await motionPass(tester, name: 'defects', page: page, mount: (p) => mountAt(tester, p));
    debugPrint(r.table.join('\n'));
    expect(r.motionless, hasLength(2)); // the card and its own text
    expect(r.motionless, everyElement(contains('"motionless"')));
    expect(r.noPressResponse, [contains('dead button')]);
    expect(r.replayed, isNotEmpty);
    expect(r.replayed, everyElement(contains('"replays"')));
    expect(r.tapTargets, contains('30'));
  });
}
