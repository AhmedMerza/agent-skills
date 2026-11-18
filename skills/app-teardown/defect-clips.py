#!/usr/bin/env python3
"""Cut a slowed video clip + a frame strip for every defect the motion probe flagged, with a red box on the element.

    python3 -I defect-clips.py <recording.webm> <defects.json> <out-dir> <label>

defects.json is `__mp.defects(name)`: {anchor, viewport:[w,h], defects:[{kind, d, at, until, rect}]}, times in ms
since navigation start. The video is synced on its first changed frame, which is `anchor` (first paint for a page
load, the real input for an interaction), so clip times are good to about one frame (33 ms at 30 fps).
Writes <label>-<n>-<kind>.webm (4x slower) and .png (8 frames) per defect, and prints one line each.
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def run(*a):
    return subprocess.run(a, capture_output=True, text=True)


def onset(video):
    """Seconds of the first frame that differs from the one before it."""
    r = run('ffmpeg', '-hide_banner', '-i', video, '-vf', "fps=30,scale=480:-2,select='gt(scene\\,0.002)',showinfo", '-f', 'null', '-')
    m = re.search(r'pts_time:([\d.]+)', r.stderr)
    return float(m.group(1)) if m else 0.0


def size(video):
    r = run('ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', video)
    w, h = r.stdout.strip().split(',')[:2]
    return int(w), int(h)


def main():
    video, dj, out, label = sys.argv[1:5]
    info = json.load(open(dj))
    if isinstance(info, str):
        print(info)
        return
    Path(out).mkdir(parents=True, exist_ok=True)
    t0, (vw, vh) = onset(video), size(video)
    sx, sy = vw / info['viewport'][0], vh / info['viewport'][1]
    if not info['defects']:
        print(f'{label}: no defects flagged')
    for n, d in enumerate(info['defects'], 1):
        if d['until'] < info['anchor']:  # finished before anything was on screen: list it, nothing to film
            print(f"{d['kind']}: {d['d']} ended {info['anchor'] - d['until']} ms before first paint (blank screen, no clip)")
            continue
        at = t0 + (d['at'] - info['anchor']) / 1000
        start, dur = max(0.0, at - 0.35), (d['until'] - d['at']) / 1000 + 0.9
        if d['rect']:
            x, y, w, h = d['rect']
            box = f"drawbox=x={max(0, int(x * sx) - 4)}:y={max(0, int(y * sy) - 4)}:w={int(w * sx) + 8}:h={int(h * sy) + 8}:color=red@0.9:t=4"
        else:  # long frame: whole-frame border
            box = 'drawbox=x=0:y=0:w=iw:h=ih:color=red@0.9:t=8'
        base = f"{out}/{label}-{n}-{d['kind']}"
        run('ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{start:.3f}', '-t', f'{dur:.3f}', '-i', video,
            '-vf', f'{box},setpts=4*PTS', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', base + '.webm')
        run('ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{start:.3f}', '-t', f'{dur:.3f}', '-i', video,
            '-vf', f"{box},fps=8,scale=480:-2,tile=4x2:padding=4:color=white", '-frames:v', '1', base + '.png')
        print(f"{d['kind']}: {d['d']} at {d['at'] - info['anchor']:+d} ms from {'first paint' if 'load' in label else 'input'} → {base}.webm (4x slower), {base}.png")


if __name__ == '__main__':
    main()
