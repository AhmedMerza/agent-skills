// Example list screen on the house starter (saved addresses). Shows the minimum house look:
// fixed ground, big title, one feature card, glass cards, a status pill with an icon,
// sentence-case rounded buttons and the entrance cascade. Fix the three imports for your app.
import 'package:flutter/material.dart';

import '../data/addresses.dart';
import '../theme/house_theme.dart';
import '../widgets/house_widgets.dart';

class SavedAddressesScreen extends StatelessWidget {
  const SavedAddressesScreen({super.key});

  static const _copy = {
    'en': {
      'title': 'Saved addresses',
      'count': '{n} places',
      'add': 'Add address',
      'default': 'Default',
      'deliver': 'Delivering here',
      'edit': 'Edit',
      'makeDefault': 'Set as default',
      'back': 'Back',
    },
    'ar': {
      'title': 'العناوين المحفوظة',
      'count': '{n} عناوين',
      'add': 'إضافة عنوان',
      'default': 'الافتراضي',
      'deliver': 'التوصيل إلى هنا',
      'edit': 'تعديل',
      'makeDefault': 'تعيين كافتراضي',
      'back': 'رجوع',
    },
  };

  static IconData _icon(String label) => switch (label.toLowerCase()) {
    'home' || 'المنزل' || 'mum' || 'خالتي' => Icons.home_outlined,
    'work' || 'العمل' || 'office annex' => Icons.work_outline_rounded,
    'gym' => Icons.fitness_center_rounded,
    'warehouse' => Icons.warehouse_outlined,
    _ => Icons.place_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final t = HouseTokens.of(context);
    final text = Theme.of(context).textTheme;
    final s = _copy[Localizations.localeOf(context).languageCode] ?? _copy['en']!;
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 720;
    final columns = width >= 1100 ? 3 : (wide ? 2 : 1);
    final gutter = wide ? 32.0 : 14.0;
    final main = addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first);
    final rest = addresses.where((a) => a != main).toList();

    final add = FilledButton.icon(
      onPressed: () {},
      icon: const Icon(Icons.add_rounded, size: 20),
      label: Text(s['add']!),
    );

    final feature = Enter(
      role: EnterRole.card,
      child: HouseCard(
        feature: true,
        padding: const EdgeInsets.all(20),
        child: Enter(
          after: const Duration(milliseconds: 290),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              HouseIconWell(
                _icon(main.label),
                size: 48,
                color: t.onFeature,
                background: t.onFeature.withValues(alpha: .14),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s['deliver']!, style: text.labelMedium!.copyWith(color: t.onFeature.withValues(alpha: .72))),
                    const SizedBox(height: 2),
                    DataText(main.label, style: text.titleLarge!.copyWith(color: t.onFeature)),
                    const SizedBox(height: 6),
                    DataText(
                      '${main.line1}\n${main.city}',
                      style: text.bodyMedium!.copyWith(color: t.onFeature.withValues(alpha: .86)),
                    ),
                    const SizedBox(height: 10),
                    _Phone(main.phone, color: t.onFeature.withValues(alpha: .86)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              DecoratedBox(
                decoration: ShapeDecoration(color: t.accent, shape: const StadiumBorder()),
                child: Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 11, 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, size: 14, color: t.onAccent),
                      const SizedBox(width: 5),
                      Text(s['default']!, style: text.labelSmall!.copyWith(color: t.onAccent, height: 1.25)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    return Scaffold(
      extendBody: true,
      bottomNavigationBar: wide
          ? null
          : HouseFloatingAction(
              child: Enter(after: const Duration(milliseconds: 400), child: add),
            ),
      body: SafeArea(
        bottom: false,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1240),
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                gutter,
                wide ? 28 : 10,
                gutter,
                wide ? 56 : HouseFloatingAction.clearance(context),
              ),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (Navigator.canPop(context))
                            Padding(
                              padding: const EdgeInsetsDirectional.only(bottom: 14),
                              child: IconButton.filledTonal(
                                tooltip: s['back'],
                                style: IconButton.styleFrom(backgroundColor: t.solid, foregroundColor: t.ink),
                                onPressed: () => Navigator.maybePop(context),
                                icon: const BackButtonIcon(),
                              ),
                            ),
                          Enter(
                            role: EnterRole.title,
                            child: Text(
                              s['title']!,
                              style: wide ? text.headlineMedium!.copyWith(fontSize: 37) : text.headlineMedium,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Enter(
                            child: Text(
                              s['count']!.replaceFirst('{n}', '${addresses.length}'),
                              style: text.bodyMedium!.copyWith(color: t.muted),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (wide) Enter(child: add),
                  ],
                ),
                SizedBox(height: wide ? 26 : 18),
                // Cards of uneven height: split into columns rather than forcing a fixed row height. The
                // feature card opens the first column.
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var c = 0; c < columns; c++) ...[
                      if (c > 0) const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          children: [
                            if (c == 0)
                              Padding(
                                padding: const EdgeInsets.only(bottom: HouseTokens.gap),
                                child: feature,
                              ),
                            for (var i = (c + columns - 1) % columns; i < rest.length; i += columns)
                              Padding(
                                padding: const EdgeInsets.only(bottom: HouseTokens.gap),
                                child: Enter(
                                  role: EnterRole.card,
                                  index: i + 1,
                                  count: rest.length + 1,
                                  child: _AddressCard(rest[i], icon: _icon(rest[i].label), copy: s),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AddressCard extends StatelessWidget {
  const _AddressCard(this.a, {required this.icon, required this.copy});
  final Address a;
  final IconData icon;
  final Map<String, String> copy;

  @override
  Widget build(BuildContext context) {
    final t = HouseTokens.of(context);
    final text = Theme.of(context).textTheme;
    return HouseCard(
      onTap: () {},
      padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 6, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HouseIconWell(icon, color: t.accentText, background: t.tones[HouseTone.accent]!.fill),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DataText(a.label, style: text.titleMedium),
                const SizedBox(height: 3),
                DataText(a.line1, style: text.bodyMedium!.copyWith(color: t.muted)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    StatusPill(a.city, icon: Icons.location_city_rounded),
                    _Phone(a.phone, color: t.muted),
                  ],
                ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: Icon(Icons.more_horiz_rounded, color: t.muted),
            itemBuilder: (_) => [
              PopupMenuItem(value: 'edit', child: Text(copy['edit']!)),
              PopupMenuItem(value: 'default', child: Text(copy['makeDefault']!)),
            ],
          ),
        ],
      ),
    );
  }
}

/// Phone numbers stay left-to-right and tabular in both locales.
class _Phone extends StatelessWidget {
  const _Phone(this.value, {required this.color});
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Icons.call_outlined, size: 15, color: color),
      const SizedBox(width: 6),
      Text(
        value,
        textDirection: TextDirection.ltr,
        style: Theme.of(context).textTheme.bodySmall!.copyWith(color: color),
      ),
    ],
  );
}
