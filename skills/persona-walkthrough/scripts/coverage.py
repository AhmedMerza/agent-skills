#!/usr/bin/env python3
"""Which screens did nobody visit? Compare what the personas SAW against the app's screen inventory.

usage: coverage.py --screens flutter/lib/screens [--l10n flutter/lib/l10n]
                   --texts RUN_DIR [RUN_DIR ...] [--texts-artist DIR ...] [--texts-admin DIR ...]
                   [--manifest screens.json] [-v]

Evidence: every `droid.sh shot` saves the on-screen text (what a screen reader hears) as <name>.txt next to the PNG.
Inventory: one entry per screen source file. A screen's signature = its string literals that are (nearly) unique to
it, plus the strings of the l10n members it references (resolved through a small reference graph).

Per screen, four honest states:
  VISITED      >=3 signature literals seen, and >=15% of them (or >=6)
  MAYBE        2 seen: shared words appear on several screens, so check a screenshot (`-v` shows the matches)
  NOT VISITED  fewer
  CAN'T TELL   no usable literals (text lives elsewhere)

Role-aware: with --texts-artist / --texts-admin, artist and admin screens are judged ONLY against those sessions, so a
customer run cannot be credited with artist screens that merely share strings. --texts judges customer/shared screens.
Dart sources are supported; other stacks can pass --glob '*.vue' (literals are matched by quotes).
"""
import argparse, json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

LIT = re.compile(r"""(?<![\w$])(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")""")
DECL = re.compile(r"(?:^|\n)[ \t]*(?:(?:static|const|final|late)\s+)*(?:[\w<>?,\[\]. ]+?\s+)?(?:get\s+)?(_?[A-Za-z]\w*)\s*(?:\([^)]*\))?\s*(=>|=)\s*")


def literals(src):
    out = set()
    for m in LIT.finditer(src):
        s = (m.group(1) if m.group(1) is not None else m.group(2)).replace("\\'", "'").replace('\\"', '"')
        if "$" in s or len(s) < 5 or not re.search(r"[A-Za-z؀-ۿ]", s):
            continue
        if re.fullmatch(r"[\w./:#%-]+", s) and (("/" in s) or ("_" in s) or (s.islower() and " " not in s)):
            continue  # routes, keys, identifiers
        if s.startswith(("package:", "dart:", "http", "assets/")):
            continue
        out.add(s.strip().lower())
    return out


def parse_members(src):
    """name -> (literals, referenced identifiers) for `name => expr;` / `name = expr;` declarations (bracket-aware)."""
    members = {}
    for m in DECL.finditer(src):
        i, depth, q, j = m.end(), 0, None, m.end()
        while j < len(src):
            c = src[j]
            if q:
                if c == "\\":
                    j += 1
                elif c == q:
                    q = None
            elif c in "'\"":
                q = c
            elif c in "([{":
                depth += 1
            elif c in ")]}":
                depth -= 1
            elif c == ";" and depth <= 0:
                break
            j += 1
        body = src[i:j]
        refs = set(re.findall(r"[A-Za-z_]\w*", re.sub(r"'[^']*'|\"[^\"]*\"", "", body)))
        old = members.get(m.group(1), (set(), set()))
        members[m.group(1)] = (old[0] | literals(body), old[1] | refs)
    return members


def role_of(name):
    n = name.lower()
    if n.startswith("admin_"):
        return "admin"
    if n.startswith(("artist_", "edit_service", "deposit_", "working_hours", "services_screen", "plan_", "plans_",
                     "pay_for_plan", "confirm_final", "register_about", "under_review", "ticket_thread",
                     "service_options", "choose_options")):
        return "artist"
    return "customer/shared"


def load(dirs):
    seen, n = set(), 0
    for d in dirs:
        for f in Path(d).rglob("*.txt"):
            n += 1
            for line in f.read_text(errors="ignore").splitlines():
                for part in line.split(" | "):
                    seen.add(part.strip().lower())
    return seen, n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--screens", required=True)
    ap.add_argument("--l10n", help="dir of string files; a screen inherits the strings of the members it references")
    ap.add_argument("--texts", nargs="+", required=True, help="run dirs judged against customer/shared screens (and every role when no role list is given)")
    ap.add_argument("--texts-artist", nargs="+")
    ap.add_argument("--texts-admin", nargs="+")
    ap.add_argument("--manifest")
    ap.add_argument("--min-hits", type=int, default=3)
    ap.add_argument("--glob", default="*.dart")
    ap.add_argument("-v", "--verbose", action="store_true", help="list visited/maybe screens with the matching literals")
    a = ap.parse_args()

    seen_all, nfiles = load(a.texts + (a.texts_artist or []) + (a.texts_admin or []))
    if not nfiles:
        sys.exit("no <shot>.txt files found: were the runs made with a droid.sh whose `shot` saves texts?")
    evidence = {"customer/shared": load(a.texts)[0],
                "artist": load(a.texts_artist)[0] if a.texts_artist else seen_all,
                "admin": load(a.texts_admin)[0] if a.texts_admin else seen_all}

    members = {}
    if a.l10n:
        for f in Path(a.l10n).glob(a.glob):
            members.update(parse_members(f.read_text(errors="ignore")))
    cache = {}

    def closure(name, stack=()):
        if name in cache:
            return cache[name]
        lits, refs = members.get(name, (set(), set()))
        out = set(lits)
        for r in refs:
            if r != name and r not in stack:
                out |= closure(r, stack + (name,))
        cache[name] = out
        return out

    screens = {}
    for p in sorted(Path(a.screens).glob(a.glob)):
        src = p.read_text(errors="ignore")
        lits = literals(src)
        for ident in set(re.findall(r"[A-Za-z_]\w*", src)) & members.keys():
            lits |= closure(ident)
        screens[p.stem] = lits
    df = Counter(l for lits in screens.values() for l in lits)

    res = defaultdict(list)
    for name, lits in screens.items():
        sig = {l for l in lits if df[l] <= 2}
        role = role_of(name)
        ev = evidence[role]
        blob = "\n".join(ev)
        hits = sorted(l for l in sig if l in blob or any(len(x) >= 10 and x in l for x in ev))
        n, k = len(sig), len(hits)
        if not sig:
            state = "CAN'T TELL"
        elif (k >= a.min_hits and (k / n >= 0.15 or k >= 6)) or (n <= 4 and k == n):
            state = "VISITED"
        elif k >= 2 or (n <= 4 and k >= 1):
            state = "MAYBE"
        else:
            state = "NOT VISITED"
        res[role].append((name, state, k, n))
        if a.verbose and state in ("VISITED", "MAYBE"):
            print(f"  {state.lower()} {name}: {k}/{n} e.g. {hits[:3]}")

    total = Counter(r[1] for rows in res.values() for r in rows)
    print(f"Screens: {sum(total.values())}  visited {total['VISITED']}  maybe {total['MAYBE']}  "
          f"not visited {total['NOT VISITED']}  can't tell {total[chr(67) + 'AN' + chr(39) + 'T TELL']}   "
          f"({nfiles} screen captures)")
    for role in ("customer/shared", "artist", "admin"):
        rows = res.get(role, [])
        if not rows:
            continue
        v = sum(1 for r in rows if r[1] == "VISITED")
        print(f"\n## {role}: {v}/{len(rows)} visited")
        for state in ("MAYBE", "NOT VISITED", "CAN'T TELL"):
            names = [r[0] for r in rows if r[1] == state]
            if names:
                print(f"  {state}: " + ", ".join(names))
    if a.manifest:
        sc = json.load(open(a.manifest)).get("screens", [])
        by = Counter((s.get("version"), s.get("role")) for s in sc)
        print("\nDesign manifest (designed screens, not necessarily built): "
              + ", ".join(f"{v}/{r}: {n}" for (v, r), n in sorted(by.items(), key=str)))


if __name__ == "__main__":
    main()
