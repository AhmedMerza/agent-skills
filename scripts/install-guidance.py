#!/usr/bin/env python3
"""Install the repository's short skill-routing policy into global agent instructions."""

import os
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GUIDANCE = (REPO / "guidance" / "AGENT_WORKFLOW.md").read_text().strip()
START = "<!-- agent-skills workflow: start -->"
END = "<!-- agent-skills workflow: end -->"
BLOCK = f"{START}\n{GUIDANCE}\n{END}"

home = Path.home()
# (command that proves the CLI is installed, its global instructions file).
# Add a CLI = add one line. agy reads ~/.gemini/GEMINI.md too, so gemini covers both.
TARGETS = (
    ("claude", home / ".claude" / "CLAUDE.md"),
    ("kimi", Path(os.environ.get("KIMI_CODE_HOME", home / ".kimi-code")) / "AGENTS.md"),
    ("codex", Path(os.environ.get("CODEX_HOME", home / ".codex")) / "AGENTS.md"),
    ("gemini", home / ".gemini" / "GEMINI.md"),
    ("agy", home / ".gemini" / "GEMINI.md"),
    ("qwen", home / ".qwen" / "QWEN.md"),
)
targets = sorted({t for cmd, t in TARGETS if shutil.which(cmd)})

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
