// Jank check for one page: integration_test + traceAction around entrance, scroll, and a sheet opening.
// Copy to the app's integration_test/, perf_driver.dart to test_driver/, add
// `integration_test: {sdk: flutter}` and `flutter_driver: {sdk: flutter}` to dev_dependencies, edit the APP lines.
//
//   flutter drive --profile -d linux --driver=test_driver/perf_driver.dart --target=integration_test/perf_test.dart
//
// SAFETY: never boot the app's real main() (it may call production). Mount the page with the same fakes the
// widget tests use, and run the drive with no network (`unshare -rn`, see SKILL.md). Label results with the device.
// Profile builds cannot override the platform, so a blur on/off A/B needs a build-time switch in the app; run the
// same harness on a sibling page as the baseline (a software-GL host inflates raster times for every page).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// APP: pump the page with the widget tests' providers and fakes (the app's own widget-test pump helper).
Future<void> mountPage(WidgetTester tester) => tester.pumpWidget(const MaterialApp(home: Scaffold(body: Placeholder())));

/// APP: what opens a sheet or dialog on that page.
Finder get sheetOpener => find.byType(TextButton).first;


Future<void> wait(int ms) => Future<void>.delayed(Duration(milliseconds: ms));

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('perf: entrance, scroll, sheet', (tester) async {
    await binding.traceAction(() async { await mountPage(tester); await wait(2500); }, reportKey: 'entrance');

    final scroll = find.byType(Scrollable).first;
    await binding.traceAction(() async {
      for (var i = 0; i < 3; i++) {
        await tester.fling(scroll, const Offset(0, -600), 2500);
        await wait(900);
      }
      await tester.fling(scroll, const Offset(0, 3000), 4000);
      await wait(1200);
    }, reportKey: 'scroll');

    await binding.traceAction(() async {
          await tester.tap(sheetOpener);
          await wait(1200);
          await tester.tapAt(const Offset(8, 8)); // the barrier
          await wait(1000);
        }, reportKey: 'sheet');
  });
}
