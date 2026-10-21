#!/usr/bin/env python3
"""Deep en/ar key-drift scanner for JSON i18n locale modules.

Usage:
    scan_drift.py                       # defaults to the primary Vue locales
    scan_drift.py <en_dir> <ar_dir>     # any matching en/ar pair of dirs

Reports, per module file present in both locales:
  - missing in ar : key in en, absent in ar   -> silent English fallback
  - empty in ar   : key in ar but value ""     -> blank render
  - orphan in ar  : key in ar, absent in en    -> dead key
Run from the repo root.
"""
import json, sys, glob, os

DEFAULT_EN = "resources/ts/plugins/i18n/locales/en"
DEFAULT_AR = "resources/ts/plugins/i18n/locales/ar"


def flatten(d, prefix=""):
    out = {}
    if isinstance(d, dict):
        for k, v in d.items():
            out.update(flatten(v, f"{prefix}.{k}" if prefix else k))
    else:
        out[prefix] = d
    return out


def main():
    en_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EN
    ar_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_AR
    if not os.path.isdir(en_dir) or not os.path.isdir(ar_dir):
        sys.exit(f"en/ar dir not found: {en_dir} | {ar_dir} (run from repo root)")

    missing, empty, orphan = [], [], []
    en_files = sorted(glob.glob(f"{en_dir}/*.json"))
    for en_path in en_files:
        mod = os.path.basename(en_path)
        ar_path = os.path.join(ar_dir, mod)
        if not os.path.exists(ar_path):
            missing.append(f"{mod}:<ENTIRE FILE>")
            continue
        try:
            en = flatten(json.load(open(en_path)))
            ar = flatten(json.load(open(ar_path)))
        except Exception as e:
            print(f"  ! parse error in {mod}: {e}")
            continue
        for k in en:
            if k not in ar:
                missing.append(f"{mod}:{k}")
            elif isinstance(ar[k], str) and ar[k].strip() == "" and str(en[k]).strip() != "":
                empty.append(f"{mod}:{k}")
        for k in ar:
            if k not in en:
                orphan.append(f"{mod}:{k}")

    print(f"Scanned {len(en_files)} modules in {en_dir}")
    for label, items, note in (
        ("missing in ar", missing, "silent English fallback"),
        ("empty in ar", empty, "blank render"),
        ("orphan in ar", orphan, "dead ar-only keys"),
    ):
        print(f"\n[{label}] {len(items)} keys ({note}):")
        for x in items[:40]:
            print("  -", x)
        if len(items) > 40:
            print(f"  ... and {len(items) - 40} more")

    # non-zero exit if actionable drift exists (missing/empty), for CI use
    sys.exit(1 if (missing or empty) else 0)


if __name__ == "__main__":
    main()
