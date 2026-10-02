#!/usr/bin/env bash
# Throwaway worktree of a repo at a ref, so other sessions' uncommitted work can never leak into a run.
#   isolate.sh create <repo> <ref> <dir>   detached worktree + copies of the gitignored files a build needs
#   isolate.sh remove <repo> <dir>
# Heavy/generated dirs are NOT copied (vendor, node_modules, build outputs, caches, logs): the project's
# stack script rebuilds them (e.g. `cp -cR vendor` + `composer dump-autoload`, `flutter pub get`).
# To test uncommitted work on purpose, commit it to a branch (or `git stash create`) and pass that as <ref>.
set -euo pipefail
cmd=${1:-}; repo=${2:-}; 
case "$cmd" in
  create)
    ref=${3:?ref}; dir=${4:?dir}
    git -C "$repo" worktree prune
    [ -e "$dir" ] && { echo "$dir already exists (run: isolate.sh remove $repo $dir)"; exit 1; }
    git -C "$repo" worktree add -q --detach "$dir" "$ref"
    # carry over gitignored files the build needs (secrets, sdk paths, generated config)
    git -C "$repo" ls-files --others --ignored --exclude-standard -z \
      | tr '\0' '\n' \
      | grep -vE '(^|/)(vendor|node_modules|build|\.dart_tool|\.gradle|\.idea|Pods|ephemeral|\.git)(/|$)|(^|/)storage/(logs|framework)/|\.sqlite$|\.log$|\.DS_Store$|\.result\.cache$' \
      | while IFS= read -r f; do
          mkdir -p "$dir/$(dirname "$f")"; cp -cp "$repo/$f" "$dir/$f" 2>/dev/null || cp -p "$repo/$f" "$dir/$f"
        done
    echo "$dir  ($(git -C "$dir" rev-parse --short HEAD) $(git -C "$dir" log -1 --format=%s | cut -c1-60))";;
  remove)
    dir=${3:?dir}; git -C "$repo" worktree remove --force "$dir"; git -C "$repo" worktree prune; echo "removed $dir";;
  *) sed -n '2,9p' "$0"; exit 1;;
esac
