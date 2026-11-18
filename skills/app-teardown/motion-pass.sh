#!/usr/bin/env bash
# Drive motion-probe.js through agent-browser with REAL pointer input (JS events don't trigger :hover).
#
#   motion-pass.sh <session> open <url>                       fresh first load (about:blank first, so a hash-only
#                                                              URL change still reloads) and print its recording
#   motion-pass.sh <session> <name> <hover|click|press> '<css selector>' [index]
#       hover  pointer moves onto the element            (hover motion, magnetic, tooltips)
#       click  pointer onto it, waits, then down/up       (nav pill, route change, toggles, drawers, theme)
#       press  pointer down HELD 600 ms, then up          (:active / press feedback)
#   motion-pass.sh <session> targets                       what to test: selector + index per kind (in view now), unsafe buttons
#   motion-pass.sh <NEW session> perf <url>                frame times / long tasks / CLS of a fresh load with the per-element
#                                                          recorder OFF — the baseline for "is this jank the site or the probe?"
#                                                          (needs a session name never used before: init scripts stick to a session)
#   motion-pass.sh <session> selftest                      prove the probe sees hover, press, JS tweens and the
#                                                          three defect flags on this machine (fixture next to this file)
# Add --json as the LAST argument for the full object instead of the readable table. LIMIT=n caps table groups (default 25).
# press = pointer down, hold, UP: the release is a click, so press only things whose click is safe (§2).
# The first `open` registers motion-probe.js as the session's init script; it stays registered for the session.
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
usage() { sed -n '2,15p' "$0" >&2; exit 2; }
[[ $# -ge 2 ]] || usage
S=$1; shift
MODE=table; [[ ${!#} == --json ]] && { MODE=full; set -- "${@:1:$#-1}"; }
ab() { agent-browser --session "$S" "$@" 2>/dev/null; }
show() { ab eval "__mp.out('$1', '$MODE', ${LIMIT:-25})"; }

case $1 in
  open)
    [[ $# -ge 2 ]] || usage
    agent-browser --session "$S" --init-script "$DIR/motion-probe.js" open about:blank >/dev/null 2>&1
    ab open "$2" >/dev/null; show load; exit ;;
  targets) ab eval "__mp.targets()"; exit ;;
  perf)
    [[ $# -ge 2 ]] || usage
    agent-browser --session "$S" --init-script "$DIR/perf-only.js" --init-script "$DIR/motion-probe.js" open about:blank >/dev/null 2>&1
    ab open "$2" >/dev/null; ab eval "(async()=>{const o=await __mp.out('load');return {perfOnly: !!window.__mpPerfOnly, settled: 'n/a (recorder off)', health: o.health}})()"; exit ;;
  selftest)
    agent-browser --session "$S" --init-script "$DIR/motion-probe.js" open about:blank >/dev/null 2>&1
    ab open "file://$DIR/selftest.html" >/dev/null
    echo "== first load: expect a JS tween on .good, flashBeforeEntrance .flash, flashOrReplay .replay, stuckHidden .stuck"; show load
    J=(); [[ $MODE == full ]] && J=(--json)
    "$0" "$S" st-hover hover '.hov' 0 "${J[@]}"; echo "   (expect .hov transform + backgroundColor over ~200 ms — CSS :hover inside @media (hover: hover))"
    "$0" "$S" st-press press '.prs' 0 "${J[@]}"; echo "   (expect .prs transform → scale 0.95 — CSS :active)"
    exit ;;
esac

[[ $# -ge 3 ]] || usage
NAME=$1 ACT=$2 SEL=$3 IDX=${4:-0}
SELJS=$(python3 -I -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$SEL")
XY=$(ab eval "(()=>{const e=document.querySelectorAll($SELJS)[$IDX]; if(!e) return 'none'; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return Math.round(r.x+r.width/2)+' '+Math.round(r.y+r.height/2)})()" | tr -d '"')
[[ $XY == none || -z $XY ]] && { echo "no element for $SEL [$IDX] — run: $0 $S targets" >&2; exit 1; }
read -r X Y <<<"$XY"
ab mouse move 2 2 >/dev/null            # start off-target so hover is a real enter
sleep 0.8                               # let anything the previous step started settle
case $ACT in   # armed: the clock starts at the real input that IS the interaction
  hover) ab eval "__mp.rec('$NAME')" >/dev/null; ab mouse move "$X" "$Y" >/dev/null ;;
  click|press) ab mouse move "$X" "$Y" >/dev/null; sleep 0.8   # hover settles first; it is not part of the click
    ab eval "__mp.rec('$NAME', { arm: 'pointerdown' })" >/dev/null; ab mouse down >/dev/null
    [[ $ACT == press ]] && sleep 0.6; ab mouse up >/dev/null ;;
  *) usage ;;
esac
show "$NAME"
