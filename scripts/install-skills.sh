#!/usr/bin/env bash
# Link every skill in this repo into every installed agent CLI that has a skills dir.
# Add a CLI = add one line to TARGETS ("command|skills dir|per-CLI override dir or -").
set -euo pipefail

repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=(
  "claude|$HOME/.claude/skills|-"
  "codex|${CODEX_HOME:-$HOME/.codex}/skills|codex-skills"
  "gemini|$HOME/.gemini/skills|-"
  "agy|$HOME/.gemini/config/skills|-"
  "qwen|$HOME/.qwen/skills|-"
)
# Kimi needs no entry: its config.toml extra_skill_dirs already includes ~/.claude/skills.
replace_local=false
if [[ "${1:-}" == --replace-local ]]; then
  replace_local=true
elif [[ $# -ne 0 ]]; then
  echo "Usage: $0 [--replace-local]" >&2
  exit 2
fi

install_skill() {
  local target="$1" name="$2" source="$3" destination="$1/$2"
  if [[ -L "$destination" && "$(readlink -f "$destination")" == "$(readlink -f "$source")" ]]; then
    return
  fi
  if [[ -L "$destination" ]]; then
    local old_source
    old_source="$(readlink -f "$destination")"
    if [[ "$old_source" == "$repo/skills/$name" || "$old_source" == "$repo/codex-skills/$name" ]]; then
      ln -sfn "$source" "$destination"
      echo "  relinked $name"
      return
    fi
  fi
  if [[ -e "$destination" || -L "$destination" ]]; then
    if [[ "$replace_local" == true && -d "$destination" && ! -L "$destination" ]]; then
      local backup="$target/../skill-backups/$(date +%Y%m%d-%H%M%S)"
      mkdir -p "$backup"
      mv "$destination" "$backup/$name"
      echo "  backed up $name to $backup/$name"
    else
      echo "  skipped $name: $destination already exists" >&2
      return
    fi
  fi
  ln -s "$source" "$destination"
  echo "  linked $name"
}

for entry in "${TARGETS[@]}"; do
  IFS='|' read -r cmd target override <<<"$entry"
  command -v "$cmd" >/dev/null || { echo "$cmd: not installed, skipped"; continue; }
  if [[ -L "$target" && "$(readlink -f "$target")" == "$repo/skills" ]]; then
    echo "$cmd: $target is the repo skills dir"
    continue
  fi
  echo "$cmd: $target"
  mkdir -p "$target"
  for skill in "$repo"/skills/*; do
    [[ -f "$skill/SKILL.md" ]] || continue
    name="${skill##*/}" source="$skill"
    [[ "$override" != - && -f "$repo/$override/$name/SKILL.md" ]] && source="$repo/$override/$name"
    install_skill "$target" "$name" "$source"
  done
  if [[ "$override" != - ]]; then
    for skill in "$repo/$override"/*; do
      [[ -f "$skill/SKILL.md" ]] || continue
      name="${skill##*/}"
      [[ -f "$repo/skills/$name/SKILL.md" ]] && continue
      install_skill "$target" "$name" "$skill"
    done
  fi
done

# Claude slash commands and the helper scripts several skills call by their ~/.claude/scripts path.
if command -v claude >/dev/null; then
  mkdir -p "$HOME/.claude/commands" "$HOME/.claude/scripts"
  for f in "$repo"/commands/*.md; do ln -sf "$f" "$HOME/.claude/commands/${f##*/}"; done
  for f in browse.mjs diff-anchor.py mr-note.py usage-report.py; do ln -sf "$repo/scripts/$f" "$HOME/.claude/scripts/$f"; done
fi
