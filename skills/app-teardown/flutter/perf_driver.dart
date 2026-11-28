// Driver for perf_test.dart: writes build/<reportKey>.timeline_summary.json per traceAction and prints the numbers
// that matter. Copy to the app's test_driver/.
import 'package:flutter_driver/flutter_driver.dart';
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() => integrationDriver(responseDataCallback: (data) async {
      for (final MapEntry(:key, :value) in (data ?? const <String, dynamic>{}).entries) {
        final s = TimelineSummary.summarize(Timeline.fromJson(value as Map<String, dynamic>));
        await s.writeTimelineToFile(key, pretty: true);
        final j = s.summaryJson;
        // ignore: avoid_print
        print('PERF $key: frames ${j['frame_count']}, missed build ${j['missed_frame_build_budget_count']}, '
            'missed raster ${j['missed_frame_rasterizer_budget_count']}, '
            'build avg/p90/worst ${j['average_frame_build_time_millis']}/${j['90th_percentile_frame_build_time_millis']}/${j['worst_frame_build_time_millis']} ms, '
            'raster avg/p90/worst ${j['average_frame_rasterizer_time_millis']}/${j['90th_percentile_frame_rasterizer_time_millis']}/${j['worst_frame_rasterizer_time_millis']} ms');
      }
    });
