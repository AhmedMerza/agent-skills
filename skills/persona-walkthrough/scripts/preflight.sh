#!/usr/bin/env bash
# Prove the stack before any persona runs, and stamp the run start.
# env: PLATFORM        android (default) | web
#      APP_URL         web: the URL personas start at; must load (2xx/3xx after redirects)
#      PW_DIR          web: dir whose node_modules has playwright (default: ./storage/playwright, then .)
#      SERIAL          adb device (default: the only one)
#      HEALTH_URL      URL the DEVICE will use (e.g. http://192.168.1.5:8000/api/v1/config); must return 200
#      PACKAGE         app id; checks it is installed
#      BACKEND_DIR     optional; warn if its vendor/ is a symlink (loads another tree's code)
#      CACHE_FLUSH_CMD optional; run to clear throttles/caches (e.g. "php artisan cache:clear")
#      OUT             run dir; writes $OUT/.run-start (epoch + UTC + local)
set -uo pipefail
ADB=(adb ${SERIAL:+-s "$SERIAL"}); OUT=${OUT:-./persona-run}; mkdir -p "$OUT"; fail=0
ok(){ echo "PASS  $*"; }; bad(){ echo "FAIL  $*"; fail=1; }; warn(){ echo "WARN  $*"; }

PLATFORM=${PLATFORM:-android}
if [ "$PLATFORM" = web ]; then
  [ -n "${APP_URL:-}" ] || bad "APP_URL not set"
  [ -n "${APP_URL:-}" ] && { code=$(curl -s -L -m 10 -o /dev/null -w '%{http_code}' "$APP_URL" || true)
    [[ "$code" =~ ^[23] ]] && ok "$APP_URL -> $code" || bad "$APP_URL -> $code"; }
  case "${APP_URL:-}" in *localhost*|*127.0.0.1*|*.test*|*.local*|*192.168.*|*10.*) ;; *) warn "APP_URL does not look local: never point personas at production";; esac
  pw=$(for d in "${PW_DIR:-}" ./storage/playwright .; do [ -n "$d" ] && [ -f "$d/node_modules/playwright/package.json" ] && { echo "$d"; break; }; done)
  [ -n "$pw" ] && ok "playwright found in $pw" || bad "playwright not found (set PW_DIR)"
fi
[ "$PLATFORM" = android ] && { [ "$("${ADB[@]}" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && ok "device booted" || bad "device not booted / not found"; }
[ "$PLATFORM" = android ] && [ -n "${PACKAGE:-}" ] && { "${ADB[@]}" shell pm list packages 2>/dev/null | grep -q "package:$PACKAGE\$" && ok "$PACKAGE installed" || bad "$PACKAGE not installed"; }
if [ -n "${HEALTH_URL:-}" ]; then
  code=$(curl -s -m 8 -o /dev/null -w '%{http_code}' -H 'Accept: application/json' "$HEALTH_URL" || true)
  [ "$code" = 200 ] && ok "host sees $HEALTH_URL -> 200" || bad "host sees $HEALTH_URL -> $code (an open port can still answer 500)"
  hostport=$(echo "$HEALTH_URL" | sed -E 's#^https?://([^/]+).*#\1#'); host=${hostport%%:*}; port=${hostport##*:}; [ "$port" = "$hostport" ] && port=80
  [ "$PLATFORM" = web ] || if "${ADB[@]}" shell "toybox nc -z -w 4 $host $port" >/dev/null 2>&1; then ok "device reaches $host:$port"; else bad "device cannot reach $host:$port (wrong LAN IP? server bound to 127.0.0.1? use --host=0.0.0.0)"; fi
  [ "$PLATFORM" = web ] || body=$("${ADB[@]}" shell "toybox wget -q -O - '$HEALTH_URL'" 2>/dev/null | head -c 200 | tr -d '\r\n')
  [ "$PLATFORM" = web ] || { [ -n "$body" ] && ok "device GET returns content" || warn "device-side HTTP GET unavailable or empty (nc reachability is the fallback signal)"; }
fi
if [ -n "${BACKEND_DIR:-}" ]; then
  [ -L "$BACKEND_DIR/vendor" ] && bad "$BACKEND_DIR/vendor is a SYMLINK: the autoloader will load the other tree's app code (cp -cR + composer dump-autoload)" || ok "vendor is not a symlink"
fi
[ -n "${CACHE_FLUSH_CMD:-}" ] && { (cd "${BACKEND_DIR:-.}" && eval "$CACHE_FLUSH_CMD") >/dev/null 2>&1 && ok "cache flushed" || warn "cache flush command failed"; }
printf 'epoch=%s\nutc=%s\nlocal=%s\n' "$(date +%s)" "$(date -u '+%Y-%m-%d %H:%M:%S')" "$(date '+%Y-%m-%d %H:%M:%S')" > "$OUT/.run-start"
ok "run start stamped: $(grep utc "$OUT/.run-start")"
[ $fail = 0 ] && echo "PREFLIGHT OK" || { echo "PREFLIGHT FAILED: fix before launching personas"; exit 1; }
