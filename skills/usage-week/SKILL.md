---
name: usage-week
description: "Weekly Claude Code usage breakdown — what is eating the weekly limit. Usage: usage-week [days, default 7]"
---
Run `python3 ~/.claude/scripts/usage-report.py $ARGUMENTS` (timeout 420000) and report,
in under 15 lines:

- the grand total and the tokens/day trend from BY DAY,
- the share of spend above 300k context and the 11+-call stretch share (the two levers),
- the top 3 projects and top 3 sessions,
- anything that moved versus the last run if the user mentions one.

Facts to keep straight: the weekly plan limit is ONE bucket for all models (Fable included,
capped at 50% of it) — the by-model split is mix, not separate budgets. Cache reads are ~97%
of tokens, so context size, not model choice or output, is what moves the number.
Report only what the script printed; do not compute new figures.
