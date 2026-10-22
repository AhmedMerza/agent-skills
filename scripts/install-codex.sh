#!/usr/bin/env bash
# Kept as an alias: one installer now covers every agent CLI.
exec "$(dirname -- "${BASH_SOURCE[0]}")/install-skills.sh" "$@"
