#!/usr/bin/env python3
"""Blind two outputs for grading: strip what gives the skill away, shuffle, write X.txt / Y.txt and key.json.

A skill that has an output template stamps its headings, emoji and phrases on its output, so a grader
can tell which arm ran it. This removes markdown markers, emoji, and every line of the output that also
appears verbatim in the skill's SKILL.md, then assigns X/Y at random. The key stays in key.json; the
grader must not read it.

Device arms: PNG screenshots next to each input are copied to <out>/X/ and <out>/Y/, and the arm's own
directory path in the text is rewritten to X/ or Y/ (a path like .../new/step-006.png names the arm).
Structural markers can still de-blind: if one arm's output uses a line format the other never does
(SCREEN:, CLARITY:, a new log tag), the script lists those markers. Normalise them with --strip REGEX
when that doesn't remove what is being graded; otherwise report the grading as not fully blind.

usage: blind.py --skill NAME --with FILE --without FILE --out DIR [--strip REGEX ...]
"""
import argparse, glob, json, os, random, re, shutil

MARKER = re.compile(r"^\s*(?:\d+[.)]\s*)?(?:[-*]\s*)?([A-Z][A-Z-]{2,})\s*[:\[]", re.M)

EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F]")


def clean(text, skill_lines):
    out = []
    for line in text.splitlines():
        if len(line.strip()) > 12 and line.strip() in skill_lines:
            continue
        line = EMOJI.sub("", line)
        line = re.sub(r"^\s{0,3}#{1,6}\s*", "", line)
        line = line.replace("**", "").replace("__", "").replace("`", "")
        out.append(line.rstrip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skill", required=True)
    ap.add_argument("--with", dest="with_", required=True)
    ap.add_argument("--without", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--strip", action="append", default=[])
    a = ap.parse_args()
    path = os.path.expanduser(f"~/.claude/skills/{a.skill}/SKILL.md")
    skill_lines = {l.strip() for l in open(path, errors="replace")} if os.path.exists(path) else set()
    pair = [("with", a.with_), ("without", a.without)]
    random.shuffle(pair)
    os.makedirs(a.out, exist_ok=True)
    key, texts = {}, {}
    for label, (arm, f) in zip("XY", pair):
        src = os.path.dirname(os.path.abspath(f))
        text = open(f, errors="replace").read().replace(src + "/", f"{label}/")
        for rx in a.strip:
            text = re.sub(rx, "", text, flags=re.M)
        texts[label] = clean(text, skill_lines)
        open(os.path.join(a.out, f"{label}.txt"), "w").write(texts[label])
        pngs = glob.glob(os.path.join(src, "*.png"))
        if pngs:
            os.makedirs(os.path.join(a.out, label), exist_ok=True)
            for png in pngs:
                shutil.copy(png, os.path.join(a.out, label))
        key[label] = arm
    json.dump(key, open(os.path.join(a.out, "key.json"), "w"))
    print("wrote X.txt and Y.txt; key in key.json (do not show the grader)")
    mx, my = (set(MARKER.findall(texts[l])) for l in "XY")
    if mx ^ my:
        print(f"de-blind risk: markers only in X: {sorted(mx - my)}, only in Y: {sorted(my - mx)}. "
              "Normalise with --strip, or report the grading as not fully blind.")


if __name__ == "__main__":
    main()
