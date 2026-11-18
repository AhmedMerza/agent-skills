#!/usr/bin/env bash
# Compare two recordings of the SAME interaction frame by frame: the reference vs our copy (web or Flutter).
#   motion-diff.sh <reference.webm|mp4> <ours.webm|mp4> [out-dir] [length-seconds, default 1.5]
# Each clip is ALIGNED ON ITS OWN FIRST MOVING FRAME (ffmpeg scene change), so recording/trigger latency doesn't
# shift one against the other. Both are normalised to 30 fps and 960x540, then compared with SSIM per frame.
# Writes to out-dir (default ./motion-diff):
#   ssim.log      one line per frame pair (All:0.0-1.0)
#   side-by-side.png  contact sheet from motion onset: each tile is reference (left) | ours (right), every 2nd frame (66 ms)
#   summary       mean / min SSIM and the frames below 0.90 (where the two motions diverge)
# Record both with the same viewport and the same trigger timing, e.g.
#   agent-browser --session S record start ref.webm <url>   … do the interaction …   agent-browser --session S record stop
# Start each recording with the page still and trigger once; anything moving before the trigger (an ambient loop) breaks the alignment.
# SSIM compares pixels, so a different palette or copy lowers it everywhere; read the CURVE (where it dips), not the level.
set -euo pipefail
[[ $# -ge 2 ]] || { sed -n '2,13p' "$0" >&2; exit 2; }
REF=$1 OURS=$2 OUT=${3:-motion-diff} LEN=${4:-1.5}
command -v ffmpeg >/dev/null || { echo "ffmpeg is not installed" >&2; exit 1; }
mkdir -p "$OUT"
# first frame that differs from the one before it, minus ~2 frames of lead-in
onset() { local t; t=$(ffmpeg -hide_banner -i "$1" -vf "fps=30,scale=480:-2,select='gt(scene\,0.002)',showinfo" -f null - 2>&1 | grep -m1 -o 'pts_time:[0-9.]*' | cut -d: -f2)
  python3 -I -c "import sys; print(max(0.0, float(sys.argv[1] or 0) - 0.07))" "${t:-0}"; }
SR=$(onset "$REF"); SO=$(onset "$OURS"); echo "motion starts: reference ${SR}s, ours ${SO}s (each clip trimmed from there)"
norm="fps=30,scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1"
ffmpeg -loglevel error -y -ss "$SR" -t "$LEN" -i "$REF" -vf "$norm" -an "$OUT/ref.mp4"
ffmpeg -loglevel error -y -ss "$SO" -t "$LEN" -i "$OURS" -vf "$norm" -an "$OUT/ours.mp4"
ffmpeg -loglevel error -y -i "$OUT/ref.mp4" -i "$OUT/ours.mp4" -lavfi "[0:v][1:v]ssim=stats_file=$OUT/ssim.log" -f null - || true
ffmpeg -loglevel error -y -i "$OUT/ref.mp4" -i "$OUT/ours.mp4" \
  -filter_complex "[0:v]scale=480:-2[a];[1:v]scale=480:-2[b];[a][b]hstack,select='not(mod(n\,2))',tile=2x6:padding=6:color=white" \
  -frames:v 1 "$OUT/side-by-side.png"
python3 -I - "$OUT/ssim.log" <<'PY' | tee "$OUT/summary"
import re, sys
v = [float(m.group(1)) for l in open(sys.argv[1]) for m in [re.search(r'All:([\d.]+)', l)] if m]
if not v: print('no frames compared'); sys.exit()
low = [i for i, x in enumerate(v) if x < 0.90]
print(f'frames {len(v)}  mean SSIM {sum(v)/len(v):.3f}  min {min(v):.3f} at frame {v.index(min(v))} ({v.index(min(v))/30:.2f}s)')
print('frames below 0.90:', (f'{len(low)} — first {low[0]/30:.2f}s, last {low[-1]/30:.2f}s' if low else 'none'))
PY
echo "contact sheet: $OUT/side-by-side.png"
