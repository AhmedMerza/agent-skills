#!/usr/bin/env python3
"""Build a local side-by-side page from direction screenshots.

  compare.py SHOTS_DIR [FOLDER ...]            side-by-side page
  compare.py --sheet DIR [--cols N] [--width PX] [--out FILE]   contact sheet of DIR/*.png, one row group per viewport,
                                               written to DIR/../sheets/<DIR name>.png (never inside a direction folder)

SHOTS_DIR holds one folder per column, each with PNGs named
<screen>__<viewport>__<theme>__<locale>.png  (e.g. dashboard__phone__dark__ar.png).
Columns are folders named "current" or "<letter>-<name>" (a-warm, b-mono, ...); any other folder
(raw captures, scratch) is ignored unless listed as FOLDER args, which then replace the default.
"current" sorts first. Writes SHOTS_DIR/index.html, one row per shot name. Open it locally; it is
never published.

Optional text beside the shots (plain text, shown escaped):
  SHOTS_DIR/verdict.md        the critique verdict, shown at the top
  SHOTS_DIR/<folder>/notes.md per-direction notes / recommendation, shown under the column head

--sheet needs Pillow, which system python lacks. Install it in a venv, not system-wide:
  python3 -m venv /tmp/pil && /tmp/pil/bin/pip install pillow && /tmp/pil/bin/python compare.py --sheet DIR
"""
import html
import re
import sys
from pathlib import Path

DIRECTION = re.compile(r"^(current|[a-z]-[\w-]+)$")


def sheet(args):
    try:
        from PIL import Image
    except ImportError:
        sys.exit("--sheet needs Pillow; see the install line in --help (venv, not system python)")
    def opt(k, default):
        return args[args.index(k) + 1] if k in args else default
    cols, w = int(opt("--cols", 4)), int(opt("--width", 360))
    d = Path(args[0])
    out_path = Path(opt("--out", d.parent / "sheets" / f"{d.name}.png"))
    files = sorted(d.glob("*.png"))
    if not files:
        sys.exit(f"no PNGs in {d}")
    groups = {}  # one row group per viewport (name part 2), so tablet frames are not shrunk beside phone ones
    for p in files:
        parts = p.stem.split("__")
        groups.setdefault(parts[1] if len(parts) > 1 else "", []).append(p)
    rows = []  # (tiles, tile width)
    for ps in groups.values():
        vw = w * 2 if max(Image.open(p).width for p in ps) > 700 else w
        n = max(1, cols * w // vw)
        for i in range(0, len(ps), n):
            tiles = []
            for p in ps[i:i + n]:
                im = Image.open(p).convert("RGB")
                tiles.append(im.resize((vw, round(im.height * vw / im.width))))
            rows.append(tiles)
    heights = [max(t.height for t in r) for r in rows]
    width = max(sum(t.width + 8 for t in r) for r in rows) + 8
    out = Image.new("RGB", (width, sum(heights) + 8 * (len(rows) + 1)), "#1b1b1b")
    y = 8
    for r, h in zip(rows, heights):
        x = 8
        for t in r:
            out.paste(t, (x, y))
            x += t.width + 8
        y += h + 8
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(out_path)
    print(out_path)


def text(path):
    return html.escape(path.read_text(encoding="utf-8").strip()) if path.is_file() else ""


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "--sheet":
        return sheet(sys.argv[2:])
    root = Path(sys.argv[1])
    pick = sys.argv[2:]
    cols = sorted((d for d in root.iterdir() if d.is_dir() and (d.name in pick if pick else DIRECTION.match(d.name))),
                  key=lambda d: (d.name != "current", d.name))
    names = sorted({p.name for d in cols for p in d.glob("*.png")})
    if not cols or not names:
        sys.exit(f"no <direction>/*.png under {root}")
    rows = []
    for n in names:
        cells = "".join(
            f'<td><a href="{html.escape(d.name)}/{html.escape(n)}"><img loading="lazy" src="{html.escape(d.name)}/{html.escape(n)}"></a></td>'
            if (d / n).exists() else '<td class="miss">not captured</td>'
            for d in cols
        )
        rows.append(f'<tr><th>{html.escape(n[:-4].replace("__", " · "))}</th>{cells}</tr>')
    head = "".join(f'<th>{html.escape(d.name)}<div class="note">{text(d / "notes.md")}</div></th>' for d in cols)
    verdict = text(root / "verdict.md")
    (root / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><title>Design directions</title>
<style>
body{{margin:16px;font:14px/1.4 system-ui;background:#1b1b1b;color:#eee}}
table{{border-collapse:separate;border-spacing:12px}}
thead th{{position:sticky;top:0;background:#1b1b1b;padding:8px;font-size:16px;text-align:start}}
tbody th{{text-align:start;font-weight:500;white-space:nowrap;vertical-align:top;color:#aaa}}
td{{vertical-align:top}} img{{display:block;max-width:420px;max-height:80vh;border-radius:8px}}
.miss{{color:#e88}} .note,.verdict{{white-space:pre-wrap;font:13px/1.4 system-ui;font-weight:400;color:#bbb;max-width:420px}}
.verdict{{max-width:900px;margin:0 12px 12px}}
</style>
{f'<div class="verdict">{verdict}</div>' if verdict else ""}
<table><thead><tr><th></th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>
""", encoding="utf-8")
    print(root / "index.html")


if __name__ == "__main__":
    main()
