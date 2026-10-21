#!/usr/bin/env bash
set -euo pipefail

repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
target="${CODEX_HOME:-$HOME/.codex}/skills"
replace_local=false
if [[ "${1:-}" == --replace-local ]]; then
  replace_local=true
elif [[ $# -ne 0 ]]; then
  echo "Usage: $0 [--replace-local]" >&2
  exit 2
fi
mkdir -p "$target"
backup="${CODEX_HOME:-$HOME/.codex}/skill-backups/$(date +%Y%m%d-%H%M%S)"

install_skill() {
  local name="$1" source="$2" destination="$target/$1"
  if [[ -L "$destination" && "$(readlink -f "$destination")" == "$(readlink -f "$source")" ]]; then
    return
  fi
  if [[ -e "$destination" || -L "$destination" ]]; then
    if [[ "$replace_local" == true && -d "$destination" && ! -L "$destination" ]]; then
      mkdir -p "$backup"
      mv "$destination" "$backup/$name"
      echo "Backed up $name to $backup/$name"
    else
      echo "Skipped $name: $destination already exists" >&2
      return
    fi
  fi
  ln -s "$source" "$destination"
  echo "Linked $name"
}

for skill in "$repo"/skills/*; do
  [[ -f "$skill/SKILL.md" ]] || continue
  name="${skill##*/}"
  source="$skill"
  [[ -f "$repo/codex-skills/$name/SKILL.md" ]] && source="$repo/codex-skills/$name"
  install_skill "$name" "$source"
done
for skill in "$repo"/codex-skills/*; do
  [[ -f "$skill/SKILL.md" ]] || continue
  name="${skill##*/}"
  [[ -f "$repo/skills/$name/SKILL.md" ]] && continue
  install_skill "$name" "$skill"
done
