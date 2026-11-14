#!/usr/bin/env python3
"""Build a local side-by-side page from direction screenshots.

  compare.py SHOTS_DIR [FOLDER ...]            side-by-side page
  compare.py --sheet DIR [--cols N] [--width PX]   contact sheet: tile DIR/*.png into DIR/contact-sheet.png

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
    cols = int(args[args.index("--cols") + 1]) if "--cols" in args else 4
    w = int(args[args.index("--width") + 1]) if "--width" in args else 360
    d = Path(args[0])
    files = sorted(p for p in d.glob("*.png") if p.name != "contact-sheet.png")
    if not files:
        sys.exit(f"no PNGs in {d}")
    tiles = []
    for p in files:
        im = Image.open(p).convert("RGB")
        tiles.append(im.resize((w, round(im.height * w / im.width))))
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    heights = [max(t.height for t in r) for r in rows]
    out = Image.new("RGB", (cols * (w + 8) + 8, sum(heights) + 8 * (len(rows) + 1)), "#1b1b1b")
    y = 8
    for r, h in zip(rows, heights):
        for i, t in enumerate(r):
            out.paste(t, (8 + i * (w + 8), y))
        y += h + 8
    out.save(d / "contact-sheet.png")
    print(d / "contact-sheet.png")


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
