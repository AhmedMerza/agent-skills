#!/usr/bin/env bash
# Blind-persona driver for an Android emulator/device. Coordinates are in the
# coordinate space of the screenshot that `shot` prints (max side 1000px), so a
# persona never has to know the real screen size.
#   droid.sh shot [name]        screenshot -> $OUT/<name>.png (default: auto-numbered), prints path + size
#   droid.sh tap X Y            tap
#   droid.sh hold X Y           long press
#   droid.sh swipe X1 Y1 X2 Y2  swipe (scroll down = swipe up: high Y -> low Y)
#   droid.sh type "text"        type into focused field (ASCII; spaces ok)
#   droid.sh key back|home|enter|tab|del
#   droid.sh texts              visible on-screen text + content-descriptions (what a screen reader hears)
#   droid.sh reset PKG          wipe app data (fresh install state) and launch
#   droid.sh launch PKG
# Env: SERIAL (adb -s), OUT (screenshot dir, default ./persona-shots)
set -euo pipefail
ADB=(adb ${SERIAL:+-s "$SERIAL"})
OUT=${OUT:-./persona-shots}; mkdir -p "$OUT"
SCALE_FILE="$OUT/.scale"

real_size() { "${ADB[@]}" shell wm size | tail -1 | sed 's/.*: //'; }
scale() {  # real px per shot px (shots are downscaled so the longest side is 1000)
  [ -f "$SCALE_FILE" ] && { cat "$SCALE_FILE"; return; }
  real_size | awk -Fx '{m=($1>$2)?$1:$2; printf "%.6f", m/1000}'
}
to_real() { awk -v v="$1" -v s="$(scale)" 'BEGIN{printf "%d", v*s}'; }

case "${1:-}" in
  shot)
    n=$(find "$OUT" -maxdepth 1 -name "*.png" | wc -l | tr -d ' ')
    name=${2:-$(printf 'step-%03d' $((n+1)))}
    "${ADB[@]}" exec-out screencap -p > "$OUT/$name.full.png"
    sips -Z 1000 "$OUT/$name.full.png" --out "$OUT/$name.png" >/dev/null
    rm "$OUT/$name.full.png"
    rw=$(real_size | cut -dx -f1)
    sw=$(sips -g pixelWidth "$OUT/$name.png" | awk '/pixelWidth/{print $2}')
    sh=$(sips -g pixelHeight "$OUT/$name.png" | awk '/pixelHeight/{print $2}')
    awk -v r="$rw" -v s="$sw" 'BEGIN{printf "%.6f", r/s}' > "$SCALE_FILE"
    echo "$OUT/$name.png (${sw}x${sh})";;
  tap)   "${ADB[@]}" shell input tap "$(to_real "$2")" "$(to_real "$3")";;
  hold)  x=$(to_real "$2"); y=$(to_real "$3"); "${ADB[@]}" shell input swipe "$x" "$y" "$x" "$y" 900;;
  swipe) "${ADB[@]}" shell input swipe "$(to_real "$2")" "$(to_real "$3")" "$(to_real "$4")" "$(to_real "$5")" 350;;
  type)  "${ADB[@]}" shell input text "$(printf '%s' "$2" | sed 's/ /%s/g')";;
  key)   case "$2" in back) c=4;; home) c=3;; enter) c=66;; tab) c=61;; del) c=67;; *) echo "unknown key"; exit 1;; esac
         "${ADB[@]}" shell input keyevent "$c";;
  texts) "${ADB[@]}" shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
         "${ADB[@]}" exec-out cat /sdcard/ui.xml | tr '>' '>\n' \
           | grep -oE '(text|content-desc)="[^"]+"' | sed -E 's/^(text|content-desc)="//; s/"$//; s/&#10;/ | /g; s/&amp;/\&/g' | awk '!seen[$0]++';;
  reset) "${ADB[@]}" shell am force-stop "$2"; "${ADB[@]}" shell pm clear "$2" >/dev/null; sleep 2; "${ADB[@]}" shell monkey -p "$2" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1;;
  launch) "${ADB[@]}" shell monkey -p "$2" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1;;
  *) sed -n '2,16p' "$0"; exit 1;;
esac
