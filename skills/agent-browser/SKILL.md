---
name: agent-browser
description: Drive Chrome or Chromium through the agent-browser CLI for page navigation, interaction, screenshots, extraction, local UI checks, and browser-based QA. Prefer it for shell-driven Chrome work; use Playwright when Firefox, WebKit, or a project-specific Playwright harness is required.
---

# agent-browser

Use the installed native CLI for ordinary Chrome browser work. It keeps browser state in a daemon between short shell calls and returns compact accessibility snapshots with stable element refs.

Before the first browser command in a task, load the version-matched guide:

```bash
agent-browser skills get core
```

Load only the reference or specialized skill that task needs. For QA and bug hunts, also load `agent-browser skills get dogfood`. Use `agent-browser skills list` to discover other installed workflows.

Always create a task-specific session and pass it on every command:

```bash
agent-browser session id --scope worktree --prefix task
agent-browser --session <name> open <url>
agent-browser --session <name> snapshot -i
agent-browser --session <name> click @e1
```

Prefer the snapshot → ref → action → fresh snapshot loop. Wait for the expected text, URL, element, or app condition after page-changing actions. Use screenshots when visual evidence matters or the DOM cannot represent the content. Write temporary screenshots and traces outside the repository unless a project workflow supplies a gitignored evidence location; never commit review evidence.

Use `--restore` or the auth vault when login state must survive. Do not put secrets in command arguments or source-controlled files; load `agent-browser skills get core --ref references/authentication.md` for sensitive login flows.

Keep Playwright available for Firefox/WebKit coverage, existing project test harnesses, purpose-built persona drivers, or flows whose route interception and instrumentation already depend on Playwright. Playwright MCP's default settle delay is a stability guard. Disable it only for a measured, deterministic flow that waits explicitly for its own post-action condition.

Close the task session when the work is finished.
