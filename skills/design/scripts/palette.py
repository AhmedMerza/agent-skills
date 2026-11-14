#!/usr/bin/env python3
"""Measure a palette instead of eyeballing it.

  palette.py contrast FG:BG [FG:BG ...]   WCAG ratio per pair (FG may be #rrggbbaa, composited on BG)
  palette.py hues HEX [HEX ...]           OKLCH per colour + hue families (chromatic colours, 30deg apart)
  palette.py hex L C H [L C H ...]        OKLCH -> hex, chroma reduced until in sRGB gamut (L 0-1 or 0-100)
  palette.py tint FG:ALPHA:BG [...]       alpha colour over a ground -> effective hex (ALPHA 0-1 or 0-100)

Hex only, with or without '#'. `contrast` reports failing pairs but exits 0; add --strict to
exit 1 when any pair is under 4.5:1.
"""
import math
import sys


def rgba(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) not in (6, 8):
        sys.exit(f"not a hex colour: {h}")
    v = [int(h[i:i + 2], 16) / 255 for i in range(0, len(h), 2)]
    return v[:3], (v[3] if len(v) == 4 else 1.0)


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = map(lin, rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg):
    (f, a), (b, _) = rgba(fg), rgba(bg)
    f = [a * x + (1 - a) * y for x, y in zip(f, b)]
    hi, lo = sorted((lum(f), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def oklch(h):
    r, g, b = map(lin, rgba(h)[0])
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def srgb(L, C, H):
    """OKLCH -> (r, g, b) linear, unclipped."""
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)


def to_hex(rgb):
    enc = lambda c: 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{round(min(1, max(0, enc(c))) * 255):02x}" for c in rgb)


def oklch_hex(L, C, H):
    L = L / 100 if L > 1 else L
    ok = lambda c: all(-1e-6 <= x <= 1 + 1e-6 for x in srgb(L, c, H))
    if not ok(C):
        lo, hi = 0.0, C
        for _ in range(30):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if ok(mid) else (lo, mid)
        C = lo
    return to_hex(srgb(L, C, H)), C


def tint(fg, alpha, bg):
    """Blend in gamma-encoded sRGB, as CSS and Flutter do."""
    f, _ = rgba(fg)
    b, _ = rgba(bg)
    alpha = alpha / 100 if alpha > 1 else alpha
    return "#" + "".join(f"{round((alpha * x + (1 - alpha) * y) * 255):02x}" for x, y in zip(f, b))


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("contrast", "hues", "hex", "tint"):
        sys.exit(__doc__)
    if sys.argv[1] == "hex":
        v = [float(x) for x in sys.argv[2:]]
        if len(v) % 3:
            sys.exit("hex needs L C H triples")
        for i in range(0, len(v), 3):
            h, c = oklch_hex(*v[i:i + 3])
            note = "" if abs(c - v[i + 1]) < 1e-4 else f"  (chroma clipped {v[i + 1]} -> {c:.3f})"
            print(f"oklch({v[i]:g} {v[i + 1]:g} {v[i + 2]:g}) = {h}{note}")
        return
    if sys.argv[1] == "tint":
        for spec in sys.argv[2:]:
            fg, a, bg = spec.split(":")
            print(f"{fg}@{a} over {bg} = {tint(fg, float(a), bg)}")
        return
    if sys.argv[1] == "contrast":
        strict = "--strict" in sys.argv
        worst = 99.0
        for pair in [x for x in sys.argv[2:] if x != "--strict"]:
            fg, bg = pair.split(":")
            r = ratio(fg, bg)
            worst = min(worst, r)
            grade = "AA body" if r >= 4.5 else "large/UI only" if r >= 3 else "FAIL"
            print(f"{fg} on {bg}  {r:5.2f}:1  {grade}")
        if worst < 4.5:
            print("\nsome pairs are under 4.5:1" + (" (--strict: exit 1)" if strict else ""))
        sys.exit(1 if strict and worst < 4.5 else 0)
    families = []  # [hue, [hex...]]
    for h in sys.argv[2:]:
        L, C, H = oklch(h)
        chromatic = C >= 0.03
        print(f"{h}  L {L * 100:5.1f}%  C {C:.3f}  h {H:5.1f}  {'' if chromatic else 'neutral'}")
        if not chromatic:
            continue
        for fam in families:
            if min(abs(fam[0] - H), 360 - abs(fam[0] - H)) < 30:
                fam[1].append(h)
                break
        else:
            families.append([H, [h]])
    print(f"\n{len(families)} hue families (chroma >= 0.03, 30deg apart):")
    for H, members in sorted(families):
        print(f"  h~{H:3.0f}  {' '.join(members)}")


if __name__ == "__main__":
    main()
