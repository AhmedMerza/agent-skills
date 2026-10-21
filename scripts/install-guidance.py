#!/usr/bin/env python3
"""Install the repository's short skill-routing policy into global agent instructions."""

import os
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GUIDANCE = (REPO / "guidance" / "AGENT_WORKFLOW.md").read_text().strip()
START = "<!-- agent-skills workflow: start -->"
END = "<!-- agent-skills workflow: end -->"
BLOCK = f"{START}\n{GUIDANCE}\n{END}"

home = Path.home()
targets = (
    home / ".claude" / "CLAUDE.md",
    Path(os.environ.get("KIMI_CODE_HOME", home / ".kimi-code")) / "AGENTS.md",
    Path(os.environ.get("CODEX_HOME", home / ".codex")) / "AGENTS.md",
)

for target in targets:
    target.parent.mkdir(parents=True, exist_ok=True)
    current = target.read_text() if target.exists() else ""
    if current.count(START) != current.count(END) or current.count(START) > 1:
        raise SystemExit(f"Refusing to edit malformed managed block: {target}")
    if START in current:
        before, rest = current.split(START, 1)
        _, after = rest.split(END, 1)
        updated = before + BLOCK + after
    else:
        updated = current.rstrip() + ("\n\n" if current.strip() else "") + BLOCK + "\n"
    if updated != current:
        target.write_text(updated)
        print(f"Updated {target}")
    else:
        print(f"Current {target}")
