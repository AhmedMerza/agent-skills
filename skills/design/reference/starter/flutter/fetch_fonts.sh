#!/usr/bin/env sh
# OPTIONAL refresh. The kit already bundles these files in ../fonts/flutter/ - copy those.
# Run this only to pull newer builds; it needs network and fails loudly without it.
set -eu
dir="${1:-assets/fonts}"
base="https://cdn.jsdelivr.net/fontsource/fonts"
mkdir -p "$dir"
for w in 400 500 600 700; do
  curl -fsSL -o "$dir/Urbanist-$w.ttf" "$base/urbanist@latest/latin-$w-normal.ttf"
  curl -fsSL -o "$dir/IBMPlexSansArabic-$w.ttf" "$base/ibm-plex-sans-arabic@latest/arabic-$w-normal.ttf"
done
ls -l "$dir"
