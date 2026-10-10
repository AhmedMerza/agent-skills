#!/usr/bin/env bash
# Blind-persona driver for an Android emulator/device. Coordinates are in the
# coordinate space of the screenshot that `shot` prints (max side 1000px), so a
# persona never has to know the real screen size.
#   droid.sh shot [name]        screenshot -> $OUT/<name>.png (default: auto-numbered), prints path + size
#   droid.sh tap X Y            tap
#   droid.sh hold X Y           long press
#   droid.sh swipe X1 Y1 X2 Y2  swipe (scroll down = swipe up: high Y -> low Y)
#   droid.sh type "text"        type into focused field. ASCII uses the real soft keyboard (so keyboard-overlap
#                              bugs still show); non-ASCII (Arabic...) switches to the ADB keyboard for that call
#                              (needs: droid.sh adbkb install). TYPE_MODE=adbkb forces it, =input forbids it
#   droid.sh key back|home|enter|tab|del
#   droid.sh texts              visible on-screen text + content-descriptions (what a screen reader hears)
#                              (every `shot` also saves these next to the PNG as <name>.txt, for coverage.py)
#   droid.sh adbkb install|status|off   ADB keyboard (downloaded on demand to ~/.cache, never vendored)
#   droid.sh teardown           restore device state: size/density, rotation, network, font scale, night mode, keyboard
#   droid.sh reset PKG          wipe app data (fresh install state) and launch
#   droid.sh launch PKG
#   droid.sh profile NAME       device shape: phone|small-phone|old-phone|tablet|tablet-land|fold-closed|fold-open|reset
#   droid.sh network NAME       emulator network: full|lte|edge|gsm (slow/flaky); real devices: use airplane mode instead
# Env: SERIAL (adb -s), OUT (screenshot dir, default $TMPDIR/persona-shots)
set -euo pipefail
command -v adb >/dev/null || PATH="${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools:$PATH"
ADB=(adb ${SERIAL:+-s "$SERIAL"})
OUT=${OUT:-${TMPDIR:-/tmp}/persona-shots}; mkdir -p "$OUT"   # never default into the cwd: it is usually the project repo
SCALE_FILE="$OUT/.scale"

real_size() { "${ADB[@]}" shell wm size | tail -1 | sed 's/.*: //'; }
scale() {  # real px per shot px (shots are downscaled so the longest side is 1000)
  [ -f "$SCALE_FILE" ] && { cat "$SCALE_FILE"; return; }
  real_size | awk -Fx '{m=($1>$2)?$1:$2; printf "%.6f", m/1000}'
}
to_real() { awk -v v="$1" -v s="$(scale)" 'BEGIN{printf "%d", v*s}'; }
# shrink a PNG so its longest side is <=1000 and print "W H" — sips on macOS, Pillow elsewhere
fit1000() {
  if command -v sips >/dev/null; then
    sips -Z 1000 "$1" --out "$2" >/dev/null
    echo "$(sips -g pixelWidth "$2" | awk '/pixelWidth/{print $2}') $(sips -g pixelHeight "$2" | awk '/pixelHeight/{print $2}')"
  else
    python3 -c 'import sys; from PIL import Image; i=Image.open(sys.argv[1]); i.thumbnail((1000,1000)); i.save(sys.argv[2]); print(*i.size)' "$1" "$2"
  fi
}

case "${1:-}" in
  shot)
    n=$(find "$OUT" -maxdepth 1 -name "*.png" | wc -l | tr -d ' ')
    name=${2:-$(printf 'step-%03d' $((n+1)))}
    "${ADB[@]}" exec-out screencap -p > "$OUT/$name.full.png"
    read -r sw sh < <(fit1000 "$OUT/$name.full.png" "$OUT/$name.png")
    rm "$OUT/$name.full.png"
    rw=$(real_size | cut -dx -f1)
    awk -v r="$rw" -v s="$sw" 'BEGIN{printf "%.6f", r/s}' > "$SCALE_FILE"
    "$0" texts > "$OUT/$name.txt" 2>/dev/null || true
    echo "$OUT/$name.png (${sw}x${sh})";;
  tap)   "${ADB[@]}" shell input tap "$(to_real "$2")" "$(to_real "$3")";;
  hold)  x=$(to_real "$2"); y=$(to_real "$3"); "${ADB[@]}" shell input swipe "$x" "$y" "$x" "$y" 900;;
  swipe) "${ADB[@]}" shell input swipe "$(to_real "$2")" "$(to_real "$3")" "$(to_real "$4")" "$(to_real "$5")" 350;;
  type)
    mode=${TYPE_MODE:-auto}
    if [ "$mode" = auto ]; then LC_ALL=C grep -q '[^ -~]' <<<"$2" && mode=adbkb || mode=input; fi
    if [ "$mode" = adbkb ]; then
      "${ADB[@]}" shell pm list packages | grep -q com.android.adbkeyboard || { echo "ADB keyboard missing: run '$0 adbkb install'"; exit 1; }
      "${ADB[@]}" shell ime enable com.android.adbkeyboard/.AdbIME >/dev/null 2>&1 || true
      prev=$("${ADB[@]}" shell settings get secure default_input_method | tr -d '\r')
      "${ADB[@]}" shell ime set com.android.adbkeyboard/.AdbIME >/dev/null
      sleep 1.6
      "${ADB[@]}" shell am broadcast -a ADB_INPUT_B64 --es msg "$(printf '%s' "$2" | base64)" >/dev/null
      sleep 0.3
      [ "$prev" != null ] && "${ADB[@]}" shell ime set "$prev" >/dev/null
    else
      "${ADB[@]}" shell input text "$(printf '%s' "$2" | sed 's/ /%s/g')"
    fi;;
  adbkb)
    pkg=com.android.adbkeyboard; apk="$HOME/.cache/persona-walkthrough/ADBKeyboard.apk"
    case "${2:-status}" in
      install) mkdir -p "$(dirname "$apk")"
               [ -s "$apk" ] || curl -fsSL -o "$apk" https://github.com/senzhk/ADBKeyBoard/raw/master/ADBKeyboard.apk
               "${ADB[@]}" install -r "$apk" >/dev/null
               for _ in 1 2 3 4 5 6; do "${ADB[@]}" shell ime enable "$pkg/.AdbIME" >/dev/null 2>&1 && { echo "ADB keyboard installed"; break; }; sleep 2; done;;
      status)  "${ADB[@]}" shell pm list packages | grep -q "$pkg" && echo installed || { echo missing; exit 1; };;
      off)     "${ADB[@]}" shell ime reset >/dev/null;;
      *) echo "adbkb install|status|off"; exit 1;;
    esac;;
  teardown)
    "$0" profile reset; "$0" network full 2>/dev/null || true
    "${ADB[@]}" shell settings put system font_scale 1.0; "${ADB[@]}" shell cmd uimode night no >/dev/null
    "${ADB[@]}" shell settings put global airplane_mode_on 0; "${ADB[@]}" shell ime reset >/dev/null; echo "device state restored";;
  key)   case "$2" in back) c=4;; home) c=3;; enter) c=66;; tab) c=61;; del) c=67;; *) echo "unknown key"; exit 1;; esac
         "${ADB[@]}" shell input keyevent "$c";;
  texts) "${ADB[@]}" shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
         "${ADB[@]}" exec-out cat /sdcard/ui.xml | tr '>' '>\n' \
           | grep -oE '(text|content-desc)="[^"]+"' | sed -E 's/^(text|content-desc)="//; s/"$//; s/&#10;/ | /g; s/&amp;/\&/g' | awk '!seen[$0]++';;
  reset) "${ADB[@]}" shell am force-stop "$2"; "${ADB[@]}" shell pm clear "$2" >/dev/null; sleep 2; "${ADB[@]}" shell monkey -p "$2" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1;;
  profile)
    case "$2" in
      phone|reset) "${ADB[@]}" shell wm size reset; "${ADB[@]}" shell wm density reset; "${ADB[@]}" shell settings put system user_rotation 0;;
      small-phone) "${ADB[@]}" shell wm size 720x1280; "${ADB[@]}" shell wm density 320;;   # ~4.7in budget phone
      old-phone)   "${ADB[@]}" shell wm size 480x800;  "${ADB[@]}" shell wm density 240;;   # ~4in, 2012-era screen
      tablet)      "${ADB[@]}" shell wm size 1600x2560; "${ADB[@]}" shell wm density 320;;  # ~10in portrait
      tablet-land) "${ADB[@]}" shell wm size 1600x2560; "${ADB[@]}" shell wm density 320
                   "${ADB[@]}" shell settings put system accelerometer_rotation 0; "${ADB[@]}" shell settings put system user_rotation 1;;
      fold-closed) "${ADB[@]}" shell wm size 1080x2092; "${ADB[@]}" shell wm density 420;;  # outer screen
      fold-open)   "${ADB[@]}" shell wm size 2208x1840; "${ADB[@]}" shell wm density 420;;  # inner screen; switch closed<->open mid-task
      *) echo "unknown profile"; exit 1;;
    esac
    rm -f "$SCALE_FILE";;
  network)
    case "$2" in
      full) s=full; d=none;; lte) s=lte; d=none;; edge) s=edge; d=edge;; gsm) s=gsm; d=gsm;;
      *) echo "unknown network"; exit 1;;
    esac
    "${ADB[@]}" emu network speed "$s" >/dev/null; "${ADB[@]}" emu network delay "$d" >/dev/null;;
  launch) "${ADB[@]}" shell monkey -p "$2" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1;;
  *) sed -n '2,16p' "$0"; exit 1;;
esac
