#!/usr/bin/env python3
"""Fill references/persona-brief.md from a persona file and print the subagent prompt.

usage: brief.py persona.md [--droid PATH] [--serial S] [--outdir DIR] [--url URL]

${VAR} in the persona file is expanded from the environment (e.g. ${SMS_INBOX}); --serial/--outdir override the header.

Persona file = header lines `key: value`, then `## section` blocks.
  header: name, outdir, platform (android, the default, or web), budget (default 40),
          sms (optional command that prints the latest SMS code, e.g. "/path/sms-inbox.sh 36000111"),
          device_note (optional)
          android: serial, package
          web: url (where the persona starts), profile (optional: mobile|tablet|laptop|desktop|ultrawide|WxH,
               default desktop), pw_dir (optional: dir whose node_modules has playwright; else $PW_DIR),
               locale (optional, default en-US)
  sections: who, goal (both required); rules (optional extra bullets);
            checkpoint2 (optional override of the price/money checkpoint);
            verdict_extra (optional, appended to the verdict checkpoint)
"""
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = (HERE.parent / "references" / "persona-brief.md").read_text().split("\n---\n", 1)[1].strip("\n")
ANDROID_DRIVER = """Every command below goes through ONE wrapper that already knows the device and where to save screenshots. Run it exactly as written (each of your shell calls starts fresh, so do not rely on `export`).
```
D={driver}
$D reset {package}        # once, at the very start (fresh install); wait ~6s before the first shot
$D shot                      # screenshot -> prints a PNG path; READ that image with the Read tool to see the screen
$D texts                     # what a screen reader hears (use it only if the image is unclear)
$D tap X Y   $D swipe X1 Y1 X2 Y2   $D type "text"   $D key back|enter|del
{sms_line}```
Coordinates are in the screenshot's own pixels (the image is ≤1000 tall). Take a screenshot after every action; never act blind. Wait ~1s after a tap before shooting if the screen is animating. {device_note}"""

WEB_DRIVER = """Every command below goes through ONE wrapper that already knows your browser and where to save screenshots. Run it exactly as written (each of your shell calls starts fresh, so do not rely on `export`). The browser stays open between your commands, so what you typed into a form is still there.
```
D={driver}
$D start '{url}' {profile}   # once, at the very start: opens the browser as a first-time visitor
$D shot                      # screenshot of the window -> prints a PNG path; READ that image with the Read tool to see it
$D texts                     # what a screen reader hears (use it only if the image is unclear)
$D tap X Y                   # click
$D scroll down|up   $D type "text"   $D key back|enter|tab|del|esc
$D url                       # read the address bar   ·   $D goto URL   # type an address into it
{sms_line}$D stop                       # once, when you finish or give up
```
Coordinates are in the screenshot's own pixels. Take a screenshot after every action; never act blind. `back` is the browser's Back button. {device_note}"""

DEFAULT_CP2 = (
    "**When you first face a price, a deposit, or a payment:** What do you think you will pay, "
    "when, and to whom? Do you trust it? What would make you trust it more?"
)


def parse(path):
    text = Path(path).read_text()
    head, _, rest = text.partition("\n## ")
    meta = dict(re.findall(r"^(\w+):\s*(.+)$", head, re.M))
    sections = {}
    for block in ("## " + rest).split("\n## "):
        block = block.removeprefix("## ")
        title, _, body = block.partition("\n")
        if title.strip():
            sections[title.strip().lower()] = body.strip()
    return meta, sections


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    droid = str(HERE / "droid.sh")
    if "--droid" in sys.argv:
        droid = sys.argv[sys.argv.index("--droid") + 1]
    text_path = sys.argv[1]
    meta, sec = parse(text_path)
    expand = lambda v: re.sub(r"\$\{(\w+)\}", lambda m: os.environ.get(m.group(1), m.group(0)), v)
    meta = {k: expand(v) for k, v in meta.items()}
    sec = {k: expand(v) for k, v in sec.items()}
    for flag, key in (("--serial", "serial"), ("--outdir", "outdir")):
        if flag in sys.argv: meta[key] = sys.argv[sys.argv.index(flag) + 1]
    for key in ("name", "outdir"):
        if key not in meta:
            sys.exit(f"persona file is missing header '{key}:'")
    for key in ("who", "goal"):
        if key not in sec:
            sys.exit(f"persona file is missing section '## {key}'")
    sms = meta.get("sms")
    web = meta.get("platform", "android") == "web"
    if "--url" in sys.argv: meta["url"] = sys.argv[sys.argv.index("--url") + 1]
    for key in (("url",) if web else ("serial", "package")):
        if key not in meta:
            sys.exit(f"persona file is missing header '{key}:'")
    sms_line = f"{sms}   # your Messages app: open it when you are waiting for a text\n" if sms else ""
    # per-persona wrapper: carries the device/browser and OUT so a persona's fresh shell calls can never save to the wrong place
    outdir = Path(meta["outdir"]); outdir.mkdir(parents=True, exist_ok=True)
    if web:
        wrapper = outdir / "web"
        pw_dir = meta.get("pw_dir") or os.environ.get("PW_DIR", "")
        wrapper.write_text(f'#!/usr/bin/env bash\nexport OUT="{outdir}" PW_DIR="{pw_dir}" LOCALE="{meta.get("locale", "en-US")}"\nexec node "{HERE / "web.mjs"}" "$@"\n')
        driver_block = WEB_DRIVER.format(driver=wrapper, url=meta["url"], profile=meta.get("profile", "desktop"),
                                         sms_line=sms_line,
                                         device_note=meta.get("device_note", ""))
    else:
        wrapper = outdir / "droid"
        wrapper.write_text(f'#!/usr/bin/env bash\nexport SERIAL="{meta["serial"]}" OUT="{outdir}"\nexec "{droid}" "$@"\n')
        driver_block = ANDROID_DRIVER.format(driver=wrapper, package=meta["package"], sms_line=sms_line,
                                             device_note=meta.get("device_note", ""))
    wrapper.chmod(0o755)
    values = {
        "name": meta["name"],
        "who": sec["who"],
        "goal": sec["goal"],
        "budget": meta.get("budget", "40"),
        "app_kind": "a website" if web else "a mobile app",
        "screen": "browser window" if web else "phone screen",
        "device": "browser" if web else "phone",
        "driver_block": driver_block,
        "allowed_commands": ("the `$D` wrapper below" if web else "`droid.sh`") + (" and `sms-inbox.sh`" if sms else ""),
        "rules_extra": sec.get("rules", ""),
        "checkpoint2": sec.get("checkpoint2", DEFAULT_CP2),
        "checkpoint4_extra": (" for each errand: " + sec["verdict_extra"]) if "verdict_extra" in sec else "",
    }
    out = TEMPLATE
    for key, value in values.items():
        out = out.replace("{{" + key + "}}", value)
    leftover = re.findall(r"\{\{\w+\}\}", out)
    if leftover:
        sys.exit(f"unfilled placeholders: {leftover}")
    print(out)


if __name__ == "__main__":
    main()
