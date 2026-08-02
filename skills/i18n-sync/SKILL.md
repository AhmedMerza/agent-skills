---
name: i18n-sync
description: Keeps this project's en/ar translations in sync. Adds a translation key and mirrors it to the other locale, and scans for keys that exist in en but are missing or empty in ar (a silent English fallback) — and orphan ar-only keys. Use when adding translation strings, wiring t()/trans() calls, or when asked to check Arabic translation coverage, find missing translations, or verify locale parity. Web (Vue 3 vue-i18n JSON) and Laravel (PHP lang) both covered.
---

<!-- Own skill (local, not tracked by `npx skills`). Built against one project's exact
     i18n layout. Encodes real conventions verified against that codebase. -->

# i18n en/ar Sync

The project ships **en + ar only** (`ar` is RTL). A key present in `en` but absent/empty in
`ar` does **not** error — vue-i18n / Laravel silently fall back to English, so Arabic users
see English strings with no warning. This is the same silent-fallback class as the driver
locale bugs. **Never leave a key in one locale but not the other.**

## Where translations live (verified layout)

| Surface | en path | ar path | Format |
|---------|---------|---------|--------|
| **Vue i18n (primary)** | `resources/ts/plugins/i18n/locales/en/<module>.json` | `.../ar/<module>.json` | JSON, **nested** keys, one file per module (~117 modules) |
| Vue i18n (secondary) | `resources/ts/locales/en/*.json` | `resources/ts/locales/ar/*.json` | JSON |
| Laravel (app) | `resources/lang/en/*.php` | `resources/lang/ar/*.php` | PHP arrays |
| Laravel (modules) | `Modules/*/Resources/lang/en/*.php` (also `.../resources/lang` and `.../lang` — casing varies) | `.../ar/...` | PHP arrays |

**Conventions:**
- Vue module filenames are `snake_case` and map to page paths by convention
  (`admin/driverWallets/index` → `driver_wallets`); overrides live in
  `resources/ts/plugins/i18n/index.ts` (`pageModuleOverrides`). When adding keys
  for a page, add them to that page's module file, not `common.json`, unless truly shared.
- Vue keys are **nested** (`payment_links.json` → `pnl` → `heading`); referenced as
  `t('payment_links.pnl.heading')`. Preserve nesting when adding.
- `common.json` and `datatable.json` are eager-loaded (used everywhere); other modules lazy-load.

## Operation A — SCAN for drift (run this to audit coverage)

The bundled scanner deep-flattens nested keys and reports three drift classes:
`missing in ar` (silent English fallback), `empty in ar` (blank render), `orphan in ar` (dead key).

```bash
python3 ~/.claude/skills/i18n-sync/scan_drift.py            # scans the primary Vue locales
python3 ~/.claude/skills/i18n-sync/scan_drift.py <en_dir> <ar_dir>   # any en/ar pair
```

Point it at other surfaces by passing dirs, e.g.:
`python3 .../scan_drift.py resources/ts/locales/en resources/ts/locales/ar`

For Laravel PHP lang, there is no safe generic flattener (arbitrary PHP); diff per file with
`php -r` or read both arrays and compare keys manually.

Report findings grouped by module, most-affected first. Do NOT auto-translate silently —
list what's missing and either (a) add real Arabic if you're confident, or (b) flag for the user.

## Operation B — ADD a key (mirror to both locales)

When adding a new string, write it to **both** `en` and `ar` in the same nested path:

1. Add to `en/<module>.json` with the English text.
2. Add to `ar/<module>.json` with the Arabic translation. If you cannot produce accurate
   Arabic, insert the value as `"⟦AR⟧ <english>"` (a visible marker) and tell the user it needs
   translation — but **still create the key** so the scanner can catch it and it never silently
   falls back mid-render.
3. Keep key ordering/structure consistent with the surrounding file.
4. Wire the call as `t('<module>.<dotted.path>')` (Vue) or `trans('<file>.<key>')` (Laravel).

Never add an en key without its ar counterpart. Never invent a third locale — the app is en/ar only.

## Rules

- **Parity is mandatory**: every add touches both locales; every scan finding is drift to fix.
- **Nested, not flat**: descend into objects; a missing leaf deep in the tree still falls back.
- **Right module file**: page-specific keys go in the page's module, shared ones in `common.json`.
- **Don't machine-translate blindly**: mark uncertain Arabic with `⟦AR⟧` rather than guessing wrong.
- **RTL**: ar is RTL; if a string embeds markup/numbers/units, sanity-check direction.

## Output checklist

- [ ] Every new key exists in BOTH en and ar (nested path identical)
- [ ] Uncertain Arabic marked `⟦AR⟧`, surfaced to the user — never a silent omission
- [ ] Key added to the correct module file (page module vs `common.json`)
- [ ] `t()`/`trans()` call uses the correct dotted path
- [ ] For an audit: drift grouped by module, counts for missing/empty/orphan
