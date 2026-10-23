---
name: persona-walkthrough
description: Test a web or Android app through blind first-time-user personas using Codex subagents and real screen drivers. Use when asked whether new users can understand or complete a flow, or to compare old and new designs. Reports observed friction and verified causes; does not fix.
---

# Persona walkthrough in Codex

Read `../../skills/persona-walkthrough/SKILL.md` relative to this file's real path, then read only the referenced files needed for the chosen mode. Follow that shared workflow, with these Codex-specific substitutions:

- Spawn each persona with `collaboration.spawn_agent` and `fork_turns: "none"`. Give it only the generated brief's absolute path, the screen driver wrapper path, and the instruction below. Do not pass the current conversation or any code-derived facts. Use a distinct task name for each persona. The shared skill explicitly calls for blind subagents, so this delegation is part of the workflow.
- The generated brief says to read PNG screenshots with a “Read tool.” In Codex, inspect each screenshot with `functions.exec` calling `tools.view_image({path: ...})`, and forward the image result with `image(...)`. Tell the persona this tool substitution in its launch message. The persona still must not inspect source, docs, logs, APIs, or the database.
- Keep persona judgement on the current strong model; do not override the model just to reduce cost. Wait for each persona's report before code-based triage.
- Give each persona an isolated app/backend instance and URL when the app has mutable shared state, then run personas in parallel up to the available agent slots. For web apps, use separate backend/mock servers, app ports, and browser `OUT` directories. Run sequentially only when per-persona isolation is not practical, resetting shared state between runs.
- Use the shared skill's scripts and references through their real paths in `../../skills/persona-walkthrough/`. The existing project `.claude/persona-walkthrough/` folder is shared run history, not a Claude-only tool dependency; keep using it when present so comparisons remain possible across agents.

A launch message should contain no product explanation: “Read `<brief-absolute-path>` and follow it exactly. Use `<wrapper-absolute-path>` for all screen actions. For PNGs, call `tools.view_image` through `functions.exec` and inspect the returned image. Do not read the repository, docs, logs, APIs, or database. Report only what you observed on screen.”

If blind subagents or the screen driver are unavailable, report that coverage limit rather than simulating a persona yourself.
