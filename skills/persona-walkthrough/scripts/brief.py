#!/usr/bin/env python3
"""Fill references/persona-brief.md from a persona file and print the subagent prompt.

usage: brief.py persona.md [--droid PATH] [--serial S] [--outdir DIR]

${VAR} in the persona file is expanded from the environment (e.g. ${SMS_INBOX}); --serial/--outdir override the header.

Persona file = header lines `key: value`, then `## section` blocks.
  header: name, serial, outdir, package, budget (default 40), sms (optional command that
          prints the latest SMS code, e.g. "/path/sms-inbox.sh 36000111"), device_note (optional)
  sections: who, goal (both required); rules (optional extra bullets);
            checkpoint2 (optional override of the price/money checkpoint);
            verdict_extra (optional, appended to the verdict checkpoint)
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = (HERE.parent / "references" / "persona-brief.md").read_text().split("\n---\n", 1)[1].strip("\n")
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
    import os
    expand = lambda v: re.sub(r"\$\{(\w+)\}", lambda m: os.environ.get(m.group(1), m.group(0)), v)
    meta = {k: expand(v) for k, v in meta.items()}
    sec = {k: expand(v) for k, v in sec.items()}
    for flag, key in (("--serial", "serial"), ("--outdir", "outdir")):
        if flag in sys.argv: meta[key] = sys.argv[sys.argv.index(flag) + 1]
    for key in ("name", "serial", "outdir", "package"):
        if key not in meta:
            sys.exit(f"persona file is missing header '{key}:'")
    for key in ("who", "goal"):
        if key not in sec:
            sys.exit(f"persona file is missing section '## {key}'")
    sms = meta.get("sms")
    # per-persona wrapper: carries SERIAL/OUT so a persona's fresh shell calls can never save to the wrong place
    outdir = Path(meta["outdir"]); outdir.mkdir(parents=True, exist_ok=True)
    wrapper = outdir / "droid"
    wrapper.write_text(f'#!/usr/bin/env bash\nexport SERIAL="{meta["serial"]}" OUT="{outdir}"\nexec "{droid}" "$@"\n')
    wrapper.chmod(0o755)
    values = {
        "name": meta["name"],
        "who": sec["who"],
        "goal": sec["goal"],
        "budget": meta.get("budget", "40"),
        "outdir": meta["outdir"],
        "serial": meta["serial"],
        "package": meta["package"],
        "droid": str(wrapper),
        "allowed_commands": "`droid.sh`" + (" and `sms-inbox.sh`" if sms else ""),
        "rules_extra": sec.get("rules", ""),
        "sms_line": f"{sms}   # your Messages app: open it when you are waiting for a text\n" if sms else "",
        "device_note": meta.get("device_note", ""),
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
