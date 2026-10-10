#!/usr/bin/env bash
# Does this diff touch something a user sees? Prints the UI files and exits 0 if so; exits 1 (prints nothing) if not.
#   ui-touched.sh [-C repo] <range>        e.g. ui-touched.sh master...HEAD
# A file counts as UI when it is not a test and any of these hold:
#   1. extension: .vue .blade.php .jsx .tsx .svelte .html .css .scss .sass .less .arb
#   2. a path segment: lang/ locales/ l10n/ i18n/ translations/ Pages/ Components/ Layouts/ screens/ widgets/ views/
#   3. a .dart file that defines a widget (extends StatelessWidget / StatefulWidget / ConsumerWidget / State<...>)
# Rule 3 reads the file at the range's tip, so a Flutter screen counts wherever the project keeps it.
set -euo pipefail
G=(git); [ "${1:-}" = -C ] && { G=(git -C "$2"); shift 2; }
range=${1:?usage: ui-touched.sh [-C repo] <range>}
tip=${range##*.}; tip=${tip:-HEAD}
hits=$("${G[@]}" diff --name-only "$range" | grep -vE '(^|/)(tests?|__tests__|spec)/|_test\.dart$|\.(spec|test)\.[jt]sx?$' | while read -r f; do
  if grep -qE '\.(vue|blade\.php|jsx|tsx|svelte|html|css|scss|sass|less|arb)$|(^|/)(lang|locales|l10n|i18n|translations|Pages|Components|Layouts|screens|widgets|views)/' <<<"$f"; then
    echo "$f"
  elif [[ $f == *.dart ]] && "${G[@]}" show "$tip:$f" 2>/dev/null | grep -qE 'extends +(StatelessWidget|StatefulWidget|ConsumerWidget|ConsumerStatefulWidget|HookWidget|State<)'; then
    echo "$f"
  fi
done || true)
[ -n "$hits" ] && { echo "$hits"; exit 0; }
exit 1
