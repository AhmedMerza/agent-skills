// Copy to test/house_fonts_test.dart. Fails when a house font or the Material icon font is not
// really bundled, so a silent fallback to Roboto (or blank icons) cannot pass.
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('house fonts and Material icons are bundled', () async {
    final manifest = (jsonDecode(await rootBundle.loadString('FontManifest.json')) as List)
        .cast<Map<String, dynamic>>();
    final families = {for (final f in manifest) f['family'] as String: f['fonts'] as List};
    expect(
      families.keys,
      containsAll(['Urbanist', 'IBM Plex Sans Arabic', 'MaterialIcons']),
      reason: 'merge pubspec.fonts.yaml into the one flutter: section; keep uses-material-design: true',
    );
    for (final family in ['Urbanist', 'IBM Plex Sans Arabic']) {
      expect(families[family], hasLength(4));
      for (final font in families[family]!) {
        final bytes = await rootBundle.load((font as Map)['asset'] as String);
        expect(bytes.lengthInBytes, greaterThan(10000), reason: '${font['asset']} is empty or missing');
      }
    }
  });
}
