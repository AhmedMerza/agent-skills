// House starter theme. Copy to lib/theme/house_theme.dart.
//   MaterialApp(theme: houseTheme(Brightness.light), darkTheme: houseTheme(Brightness.dark),
//               builder: (_, child) => HouseBackdrop(child: child!))
// Swap the values marked SWAP; leave the rest. Every text/ground pair was measured with
// skills/design/scripts/palette.py (>= 4.5:1). Re-measure after a swap.
import 'package:flutter/material.dart';

enum HouseTone { good, warn, bad, info, move, calm, accent }

@immutable
class ToneColors {
  const ToneColors(this.bright, this.fill, this.text);
  final Color bright; // dots, bars
  final Color fill; // pill and tint ground
  final Color text; // words and numbers, per theme
}

@immutable
class HouseTokens extends ThemeExtension<HouseTokens> {
  const HouseTokens({
    required this.ground,
    required this.solid,
    required this.well,
    required this.ink,
    required this.muted,
    required this.accent,
    required this.onAccent,
    required this.accentText,
    required this.line,
    required this.rim,
    required this.cardTop,
    required this.cardBottom,
    required this.shadow,
    required this.glowA,
    required this.glowB,
    required this.feature,
    required this.onFeature,
    required this.tones,
  });

  final Color ground, solid, well, ink, muted, accent, onAccent, accentText, line, rim;
  final Color cardTop, cardBottom, shadow, glowA, glowB, feature, onFeature;
  final Map<HouseTone, ToneColors> tones;

  static const rCard = 22.0, rTile = 18.0, rField = 14.0, rModal = 28.0;
  static const gap = 12.0, pad = 18.0;

  static const light = HouseTokens(
    ground: Color(0xFFF4F1EA), // SWAP warm paper, never white or flat grey
    accent: Color(0xFF0B7A73), // SWAP
    onAccent: Color(0xFFFFFFFF), // SWAP 5.2:1
    accentText: Color(0xFF0A6B65), // SWAP 5.6:1 on ground
    solid: Color(0xFFFDFCF9),
    well: Color(0xFFECE8DF),
    ink: Color(0xFF1B1A17),
    muted: Color(0xFF5E5A52),
    line: Color(0x141B1A17),
    rim: Color(0x121B1A17),
    cardTop: Color(0xDBFFFFFF),
    cardBottom: Color(0xA3FFFFFF),
    shadow: Color(0x4D3C2D14),
    glowA: Color(0x1A0B7A73),
    glowB: Color(0x29E89660),
    feature: Color(0xFF1B1A17),
    onFeature: Color(0xFFF6F2EA),
    tones: {
      HouseTone.good: ToneColors(Color(0xFF2E9E5B), Color(0x262E9E5B), Color(0xFF1F6B3A)),
      HouseTone.warn: ToneColors(Color(0xFFD99A1B), Color(0x2ED99A1B), Color(0xFF7A5200)),
      HouseTone.bad: ToneColors(Color(0xFFD9503F), Color(0x24D9503F), Color(0xFFA03324)),
      HouseTone.info: ToneColors(Color(0xFF3B82D6), Color(0x243B82D6), Color(0xFF1F5FA8)),
      HouseTone.move: ToneColors(Color(0xFF7A68D8), Color(0x247A68D8), Color(0xFF5A45B8)),
      HouseTone.calm: ToneColors(Color(0xFF8A857A), Color(0x298A857A), Color(0xFF57534B)),
      HouseTone.accent: ToneColors(Color(0xFF0B7A73), Color(0x210B7A73), Color(0xFF0A6B65)),
    },
  );

  static const dark = HouseTokens(
    ground: Color(0xFF171412), // SWAP warm near-black (deep blue: 0xFF0A1222)
    accent: Color(0xFF3CC2B5), // SWAP
    onAccent: Color(0xFF10201E), // SWAP 7.7:1
    accentText: Color(0xFF3CC2B5), // SWAP 6.0:1 on the lightest card pixel
    solid: Color(0xFF25211E),
    well: Color(0x0DFFFFFF),
    ink: Color(0xFFF3EFE8),
    muted: Color(0xFFAAA398),
    line: Color(0x14FFFFFF),
    rim: Color(0x1AFFFFFF),
    cardTop: Color(0x16FFFFFF),
    cardBottom: Color(0x0AFFFFFF),
    shadow: Color(0xBF000000),
    glowA: Color(0x4DD68048),
    glowB: Color(0x4296603C),
    feature: Color(0xFFF3EFE8),
    onFeature: Color(0xFF1B1A17),
    tones: {
      HouseTone.good: ToneColors(Color(0xFF2E9E5B), Color(0x332E9E5B), Color(0xFF8FDCAA)),
      HouseTone.warn: ToneColors(Color(0xFFD99A1B), Color(0x33D99A1B), Color(0xFFF1C56B)),
      HouseTone.bad: ToneColors(Color(0xFFD9503F), Color(0x38D9503F), Color(0xFFF5A497)),
      HouseTone.info: ToneColors(Color(0xFF3B82D6), Color(0x383B82D6), Color(0xFF9CC6F5)),
      HouseTone.move: ToneColors(Color(0xFF7A68D8), Color(0x3D7A68D8), Color(0xFFC0B4F7)),
      HouseTone.calm: ToneColors(Color(0xFF8A857A), Color(0x388A857A), Color(0xFFC9C3B8)),
      HouseTone.accent: ToneColors(Color(0xFF3CC2B5), Color(0x2E3CC2B5), Color(0xFF3CC2B5)),
    },
  );

  static HouseTokens of(BuildContext context) => Theme.of(context).extension<HouseTokens>()!;

  @override
  HouseTokens copyWith() => this;

  // Theme changes use the circular reveal (animate skill), not a colour cross-fade.
  @override
  HouseTokens lerp(HouseTokens? other, double t) => t < .5 || other == null ? this : other;
}

/// Needs the kit's fonts in assets/fonts/ and `uses-material-design: true` (pubspec.fonts.yaml);
/// house_fonts_test.dart proves both. Urbanist, with IBM Plex Sans Arabic as the fallback.
ThemeData houseTheme(Brightness brightness) {
  final t = brightness == Brightness.dark ? HouseTokens.dark : HouseTokens.light;
  const tnum = [FontFeature.tabularFigures()];
  TextStyle s(double size, FontWeight w, {double h = 1.4, Color? c}) =>
      TextStyle(fontSize: size, fontWeight: w, height: h, color: c ?? t.ink, letterSpacing: 0, fontFeatures: tnum);
  const pill = StadiumBorder();
  final field = OutlineInputBorder(
    borderRadius: BorderRadius.circular(HouseTokens.rField),
    borderSide: BorderSide(color: t.line, width: 1.2),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    fontFamily: 'Urbanist',
    fontFamilyFallback: const ['IBM Plex Sans Arabic'],
    extensions: [t],
    scaffoldBackgroundColor: Colors.transparent, // HouseBackdrop paints the ground once, app-wide
    canvasColor: t.solid,
    dividerColor: t.line,
    splashFactory: InkSparkle.splashFactory,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: t.accent,
      onPrimary: t.onAccent,
      secondary: t.feature,
      onSecondary: t.onFeature,
      error: t.tones[HouseTone.bad]!.text,
      onError: t.solid,
      surface: t.solid,
      onSurface: t.ink,
      onSurfaceVariant: t.muted,
      surfaceContainerHighest: t.well,
      surfaceContainerHigh: t.solid,
      surfaceContainer: t.solid,
      surfaceContainerLow: t.solid,
      surfaceTint: Colors.transparent,
      outline: t.muted,
      outlineVariant: t.line,
    ),
    textTheme: TextTheme(
      headlineMedium: s(30, FontWeight.w600, h: 1.15), // page title (one per screen)
      titleLarge: s(22, FontWeight.w600, h: 1.2), // KPI value
      titleMedium: s(16, FontWeight.w600), // card title
      titleSmall: s(14, FontWeight.w600),
      bodyLarge: s(16, FontWeight.w500, h: 1.45),
      bodyMedium: s(14, FontWeight.w500, h: 1.45),
      bodySmall: s(12.5, FontWeight.w500, c: t.muted),
      labelLarge: s(14, FontWeight.w600), // buttons: sentence case, never upper
      labelMedium: s(12.5, FontWeight.w600, c: t.muted),
      labelSmall: s(11.5, FontWeight.w700), // pills
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: t.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: s(
        18,
        FontWeight.w600,
      ).copyWith(fontFamily: 'Urbanist', fontFamilyFallback: const ['IBM Plex Sans Arabic']),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: t.accent,
        foregroundColor: t.onAccent,
        minimumSize: const Size(0, 46),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: pill,
        elevation: 0,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: t.feature,
        foregroundColor: t.onFeature,
        minimumSize: const Size(0, 46),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: pill,
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: t.ink,
        minimumSize: const Size(0, 46),
        shape: pill,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        side: BorderSide(color: t.rim, width: 1.2),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: t.accentText, shape: pill, minimumSize: const Size(0, 44)),
    ),
    iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(foregroundColor: t.ink)),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: t.accent,
      foregroundColor: t.onAccent,
      elevation: 0,
      focusElevation: 0,
      hoverElevation: 0,
      highlightElevation: 0,
      shape: pill,
      extendedTextStyle: s(
        14,
        FontWeight.w600,
      ).copyWith(fontFamily: 'Urbanist', fontFamilyFallback: const ['IBM Plex Sans Arabic']),
    ),
    cardTheme: CardThemeData(
      color: t.solid,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(HouseTokens.rCard)),
    ),
    chipTheme: ChipThemeData(
      shape: pill,
      side: BorderSide.none,
      backgroundColor: t.well,
      labelStyle: s(12.5, FontWeight.w600),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: t.solid,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(HouseTokens.rModal)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: t.solid,
      elevation: 0,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(HouseTokens.rModal)),
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: t.solid,
      elevation: 6,
      shadowColor: t.shadow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(HouseTokens.rTile)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: t.well,
      border: field,
      enabledBorder: field,
      focusedBorder: field.copyWith(borderSide: BorderSide(color: t.accent, width: 1.6)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
    ),
    dividerTheme: DividerThemeData(color: t.line, thickness: 1, space: 1),
    listTileTheme: ListTileThemeData(iconColor: t.muted, textColor: t.ink),
    iconTheme: IconThemeData(color: t.ink, size: 20),
  );
}
