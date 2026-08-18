#!/usr/bin/env python3
"""Pull a YouTube channel's videos, transcripts, and app screenshots for competitor analysis.

Subcommands:
  list <channel_or_playlist_url>   dump video index as JSON
  transcript <video_id> [...]      write timestamped transcript(s)
  frames <video_id> [...]          download video, extract scene-change frames
"""
import argparse
import json
import os
import re
import subprocess
import sys

OUT = os.environ.get("YTX_OUT", os.path.abspath("teardown"))
VIDEO_CACHE = os.path.join(OUT, "_video_cache")


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def cmd_list(args):
    os.makedirs(OUT, exist_ok=True)
    # flat playlist = metadata only, no per-video page fetches
    r = run([sys.executable, "-m", "yt_dlp", "--flat-playlist", "--dump-json",
             "--playlist-end", str(args.limit), args.url])
    rows = []
    for line in r.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        d = json.loads(line)
        rows.append({
            "id": d.get("id"),
            "title": d.get("title"),
            "duration_s": d.get("duration"),
            "views": d.get("view_count"),
            "url": d.get("url") or "https://www.youtube.com/watch?v=" + str(d.get("id")),
        })
    if not rows:
        print("NO VIDEOS FOUND. yt-dlp stderr:", file=sys.stderr)
        print(r.stderr[-2000:], file=sys.stderr)
        return 1
    path = os.path.join(OUT, "videos.json")
    with open(path, "w") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print("wrote {} ({} videos)".format(path, len(rows)))
    for v in rows:
        dur = v["duration_s"] or 0
        print("  {}  {:>3}m{:02d}s  {}".format(v["id"], dur // 60, dur % 60, (v["title"] or "")[:80]))
    return 0


def cmd_transcript(args):
    from youtube_transcript_api import YouTubeTranscriptApi
    os.makedirs(os.path.join(OUT, "transcripts"), exist_ok=True)
    api = YouTubeTranscriptApi()
    for vid in args.video_ids:
        try:
            listing = api.list(vid)
            langs = [t.language_code for t in listing]
            # prefer manually-created, then English, then Arabic, then whatever exists
            tr = None
            for pref in (args.lang, "en", "ar"):
                if not pref:
                    continue
                try:
                    tr = listing.find_transcript([pref])
                    break
                except Exception:
                    pass
            if tr is None and langs:
                tr = listing.find_transcript([langs[0]])
            fetched = tr.fetch()
            lines = []
            for s in fetched.snippets:
                m, sec = divmod(int(s.start), 60)
                lines.append("[{:02d}:{:02d}] {}".format(m, sec, s.text.replace("\n", " ")))
            path = os.path.join(OUT, "transcripts", "{}.{}.txt".format(vid, tr.language_code))
            with open(path, "w") as f:
                f.write("\n".join(lines))
            print("OK  {}  lang={}  {} lines -> {}".format(vid, tr.language_code, len(lines), path))
        except Exception as e:
            print("ERR {}  {}: {}".format(vid, type(e).__name__, str(e)[:200]))
    return 0


CROPS = {
    # RTL app: the form/wizard panel sits on the right. Detect changes THERE so a
    # map pan behind it doesn't read as a new screen.
    "right": "crop=iw*0.30:ih:iw*0.70:0",
    "left": "crop=iw*0.30:ih:0:0",
    "full": None,
}


def detect_cuts(src, crop, thresh):
    """Return timestamps (s) where the region of interest changes."""
    chain = []
    if crop:
        chain.append(crop)
    chain.append("select='gt(scene,{})'".format(thresh))
    chain.append("showinfo")
    r = run([ffmpeg(), "-hide_banner", "-i", src, "-vf", ",".join(chain),
             "-vsync", "vfr", "-f", "null", "-"])
    return [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]


def duration_of(src):
    r = run([ffmpeg(), "-hide_banner", "-i", src, "-f", "null", "-"])
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    if not m:
        return 0.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def cmd_frames(args):
    os.makedirs(VIDEO_CACHE, exist_ok=True)
    for vid in args.video_ids:
        outdir = os.path.join(OUT, "frames", vid)
        os.makedirs(outdir, exist_ok=True)
        for stale in os.listdir(outdir):
            os.remove(os.path.join(outdir, stale))
        src = os.path.join(VIDEO_CACHE, vid + ".mp4")

        if not os.path.exists(src):
            print("downloading {} ...".format(vid))
            r = run([sys.executable, "-m", "yt_dlp",
                     "-f", "bestvideo[height<={h}][ext=mp4]/bestvideo[height<={h}]/best[height<={h}]".format(h=args.height),
                     "--no-playlist", "-o", src,
                     "https://www.youtube.com/watch?v=" + vid])
            if not os.path.exists(src):
                print("ERR download failed for {}:".format(vid))
                print(r.stderr[-1500:])
                continue

        dur = duration_of(src)
        cuts = detect_cuts(src, CROPS.get(args.panel), args.scene)

        # always anchor the start, and guarantee coverage every --every seconds
        # so a slowly-typed form that never "cuts" still gets sampled
        anchors = [0.4] + [t for t in cuts]
        t = args.every
        while t < dur:
            anchors.append(t)
            t += args.every
        anchors.sort()

        picked = []
        for ts in anchors:
            if not picked or ts - picked[-1] >= args.min_gap:
                picked.append(ts)
        picked = picked[:args.max_frames]

        for i, ts in enumerate(picked, 1):
            out = os.path.join(outdir, "{:03d}_t{:05.1f}s.jpg".format(i, ts))
            run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-ss", str(ts),
                 "-i", src, "-frames:v", "1", "-vf", "scale={}:-2".format(args.width),
                 "-q:v", "3", out])

        got = sorted(os.listdir(outdir))
        total = sum(os.path.getsize(os.path.join(outdir, f)) for f in got) / 1e6
        print("{}  dur={:.0f}s  panel-cuts={}  -> {} frames ({:.1f} MB)".format(
            vid, dur, len(cuts), len(got), total))
        if args.keep_video is False and os.path.exists(src):
            os.remove(src)
    return 0


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("list")
    a.add_argument("url")
    a.add_argument("--limit", type=int, default=60)
    a.set_defaults(fn=cmd_list)

    b = sub.add_parser("transcript")
    b.add_argument("video_ids", nargs="+")
    b.add_argument("--lang", default=None)
    b.set_defaults(fn=cmd_transcript)

    c = sub.add_parser("frames")
    c.add_argument("video_ids", nargs="+")
    c.add_argument("--height", type=int, default=1080, help="max source height; 1080 keeps form labels readable")
    c.add_argument("--width", type=int, default=1280, help="output frame width")
    c.add_argument("--scene", type=float, default=0.045, help="scene-change threshold, lower = more frames")
    c.add_argument("--max-frames", type=int, default=120)
    c.add_argument("--every", type=float, default=4.0, help="guaranteed sampling interval (s)")
    c.add_argument("--min-gap", type=float, default=1.2, help="drop frames closer than this (s)")
    c.add_argument("--panel", default="right", choices=list(CROPS), help="region to watch for changes")
    c.add_argument("--keep-video", action="store_true", default=False)
    c.set_defaults(fn=cmd_frames)

    args = p.parse_args()
    sys.exit(args.fn(args))


if __name__ == "__main__":
    main()
