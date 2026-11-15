// House starter widgets: the ground, the card, the status pill and the entrance.
// Copy to lib/widgets/house_widgets.dart (fix the import to where house_theme.dart lives).
import 'package:flutter/material.dart';

import 'house_theme.dart';

/// The ground, painted once behind every route: `MaterialApp(builder: (_, c) => HouseBackdrop(child: c!))`.
/// It fills the screen and never scrolls, so it cannot end part-way down a long page. No blur:
/// soft radial washes only, inside a RepaintBoundary so the raster is reused.
class HouseBackdrop extends StatelessWidget {
  const HouseBackdrop({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = HouseTokens.of(context);
    Widget glow(AlignmentGeometry at, Color c) => Positioned.fill(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: at.resolve(Directionality.of(context)),
            radius: .9,
            colors: [c, c.withValues(alpha: 0)],
          ),
        ),
      ),
    );
    return Stack(
      children: [
        Positioned.fill(
          child: RepaintBoundary(
            child: Stack(
              children: [
                Positioned.fill(child: ColoredBox(color: t.ground)),
                glow(const AlignmentDirectional(-.9, -1.1), t.glowA),
                glow(const AlignmentDirectional(1.0, -.95), t.glowB),
              ],
            ),
          ),
        ),
        child,
      ],
    );
  }
}

/// Faked glass: alpha gradient, 1px rim, long soft shadow. No border colour, no BackdropFilter.
/// [feature] is the one inverted card per screen; [tone] tints the fill.
class HouseCard extends StatelessWidget {
  const HouseCard({super.key, required this.child, this.padding, this.feature = false, this.tone, this.onTap});
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final bool feature;
  final HouseTone? tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = HouseTokens.of(context);
    final r = BorderRadius.circular(HouseTokens.rCard);
    final tint = tone == null ? null : t.tones[tone]!.fill;
    Widget body = Padding(padding: padding ?? const EdgeInsets.all(HouseTokens.pad), child: child);
    if (feature) {
      body = DefaultTextStyle.merge(
        style: TextStyle(color: t.onFeature),
        child: IconTheme.merge(
          data: IconThemeData(color: t.onFeature),
          child: body,
        ),
      );
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        color: feature ? t.feature : null,
        gradient: feature
            ? null
            : LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color.alphaBlend(tint ?? Colors.transparent, t.cardTop),
                  Color.alphaBlend(tint ?? Colors.transparent, t.cardBottom),
                ],
              ),
        border: feature ? null : Border.all(color: t.rim),
        boxShadow: [BoxShadow(color: t.shadow, blurRadius: 52, spreadRadius: -30, offset: const Offset(0, 26))],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: onTap == null ? body : InkWell(borderRadius: r, onTap: onTap, child: body),
      ),
    );
  }
}

/// Status as a tonal pill: tint + same-hue text + an icon, so it never rides on colour alone.
class StatusPill extends StatelessWidget {
  const StatusPill(this.label, {super.key, this.tone = HouseTone.calm, this.icon});
  final String label;
  final HouseTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = HouseTokens.of(context).tones[tone]!;
    return DecoratedBox(
      decoration: ShapeDecoration(color: c.fill, shape: const StadiumBorder()),
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 10, 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 14, color: c.text), const SizedBox(width: 5)],
            Text(label, style: Theme.of(context).textTheme.labelSmall!.copyWith(color: c.text, height: 1.25)),
          ],
        ),
      ),
    );
  }
}

/// A square icon well (card and tile headers).
class HouseIconWell extends StatelessWidget {
  const HouseIconWell(this.icon, {super.key, this.size = 40, this.color, this.background});
  final IconData icon;
  final double size;
  final Color? color, background;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: background ?? HouseTokens.of(context).well,
      borderRadius: BorderRadius.circular(size * .33),
    ),
    child: Icon(icon, size: size * .5, color: color),
  );
}

/// User or API text that may be in either script (names, addresses). Direction follows the
/// first strong character, so a Latin address inside an Arabic screen keeps its word order
/// ("12 Palm Street", not "Palm Street 12"), while it still aligns to the screen's start edge.
class DataText extends StatelessWidget {
  const DataText(this.data, {super.key, this.style, this.maxLines});
  final String data;
  final TextStyle? style;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    final strong = RegExp(r'[A-Za-z\u0590-\u08FF]').firstMatch(data)?.group(0) ?? 'a';
    final rtlText = strong.codeUnitAt(0) >= 0x590;
    return Text(
      data,
      style: style,
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
      textDirection: rtlText ? TextDirection.rtl : TextDirection.ltr,
      textAlign: Directionality.of(context) == TextDirection.rtl ? TextAlign.right : TextAlign.left,
    );
  }
}

/// Money never prints without its currency. Urbanist has no tabular figures, so each digit gets
/// a fixed-width box: amounts line up in a column and a count-up does not jitter.
class MoneyText extends StatelessWidget {
  const MoneyText(this.value, {super.key, required this.currency, this.decimals = 2, this.style});
  final num value;
  final String currency;
  final int decimals;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final s = DefaultTextStyle.of(context).style.merge(style).copyWith(fontWeight: FontWeight.w600);
    final size = s.fontSize ?? 14;
    final fixed = value.abs().toStringAsFixed(decimals).split('.');
    final whole = fixed[0].replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
    final figure = '${value < 0 ? '-' : ''}$whole${decimals > 0 ? '.${fixed[1]}' : ''}';
    return Semantics(
      label: '$currency $figure',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        textDirection: TextDirection.ltr,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(
            currency,
            style: s.copyWith(fontSize: size * .82, color: s.color?.withValues(alpha: .7)),
          ),
          SizedBox(width: size * .3),
          for (final ch in figure.characters)
            ch.contains(RegExp(r'\d'))
                ? SizedBox(
                    width: size * .56,
                    child: Text(ch, style: s, textAlign: TextAlign.center),
                  )
                : Text(ch, style: s),
        ],
      ),
    );
  }
}

enum EnterRole { title, content, card, row }

/// The house entrance (animate skill, motion-system): one widget, four roles. Siblings pass
/// [index] and [count] and stagger by clamp(35, 500 / n, 80) ms; put `Enter(role: content,
/// after: 140 ms)` inside a card so its contents land after the surface. Plays once per mount,
/// uses no timers, and is skipped under reduced motion.
class Enter extends StatefulWidget {
  const Enter({
    super.key,
    required this.child,
    this.role = EnterRole.content,
    this.index = 0,
    this.count = 1,
    this.after,
  });
  final Widget child;
  final EnterRole role;
  final int index, count;
  final Duration? after;

  @override
  State<Enter> createState() => _EnterState();
}

class _EnterState extends State<Enter> with SingleTickerProviderStateMixin {
  static const _region = {EnterRole.title: 0, EnterRole.content: 110, EnterRole.card: 150, EnterRole.row: 260};
  late final int _delay, _run;
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    final step = widget.role == EnterRole.row ? 35 : (500 / widget.count).clamp(35, 80).round();
    _delay = (widget.after?.inMilliseconds ?? _region[widget.role]!) + widget.index.clamp(0, 24) * step;
    _run = widget.role == EnterRole.card || widget.role == EnterRole.title ? 850 : 550;
    _c = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: _delay + _run),
    )..forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return widget.child;
    final start = _delay / (_delay + _run);
    final card = widget.role == EnterRole.card;
    final move = CurvedAnimation(
      parent: _c,
      curve: Interval(start, 1, curve: card ? Curves.easeOutExpo : Curves.easeOutCubic),
    );
    // Opacity is done in ~250 ms; the long ease belongs to the travel.
    final fade = CurvedAnimation(
      parent: _c,
      curve: Interval(start, start + (card ? 250 : _run) / (_delay + _run), curve: Curves.easeOut),
    );
    final travel = switch (widget.role) {
      EnterRole.card => 24.0,
      EnterRole.title => 18.0,
      _ => 12.0,
    };
    return AnimatedBuilder(
      animation: _c,
      child: widget.child,
      builder: (_, child) => Opacity(
        opacity: fade.value,
        child: Transform.translate(
          offset: Offset(0, travel * (1 - move.value)),
          child: card ? Transform.scale(scale: .98 + .02 * move.value, child: child) : child,
        ),
      ),
    );
  }
}

/// Press feedback for a tappable surface: scale .97, spring back.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, this.onTap});
  final Widget child;
  final VoidCallback? onTap;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown: (_) => setState(() => _down = true),
    onTapUp: (_) => setState(() => _down = false),
    onTapCancel: () => setState(() => _down = false),
    onTap: widget.onTap,
    child: AnimatedScale(
      scale: _down ? .97 : 1,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack,
      child: widget.child,
    ),
  );
}
