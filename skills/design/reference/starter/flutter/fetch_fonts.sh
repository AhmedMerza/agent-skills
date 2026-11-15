#!/usr/bin/env sh
# Fetch the house fonts as static TTFs into assets/fonts/ (run from the Flutter project root).
# Both families are SIL Open Font License 1.1: bundling them in an app is allowed. Keep the
# licence texts next to the fonts. Nothing is committed to the skills repo itself.
set -eu
dir="${1:-assets/fonts}"
base="https://cdn.jsdelivr.net/fontsource/fonts"
mkdir -p "$dir"
for w in 400 500 600 700; do
  curl -fsSL -o "$dir/Urbanist-$w.ttf" "$base/urbanist@latest/latin-$w-normal.ttf"
  curl -fsSL -o "$dir/IBMPlexSansArabic-$w.ttf" "$base/ibm-plex-sans-arabic@latest/arabic-$w-normal.ttf"
done
curl -fsSL -o "$dir/OFL-Urbanist.txt" "https://raw.githubusercontent.com/google/fonts/main/ofl/urbanist/OFL.txt"
curl -fsSL -o "$dir/OFL-IBMPlexSansArabic.txt" "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsansarabic/OFL.txt"
ls -l "$dir"
