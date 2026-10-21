# Agent skill routing

Use the skills installed from `agent-skills` when the task reaches their trigger. Say which skill you are applying and why. The skill is a procedure to follow, not just a label to mention. Read its `SKILL.md` before acting. An explicit user request for a skill takes priority; do not force every task through the entire chain.

- An unclear idea or problem with no route: `scout` to settle the destination and decisions. For a reported bug that needs diagnosis: `root-cause`. If a plan already exists and its assumptions matter: `validate-plan` before implementation.
- During implementation: `ponytail` for minimal, grounded code. When a new regression test matters: `prove-the-test`. For a changed UI flow, `qa-sweep` checks failures; `persona-walkthrough` is for testing whether a first-time human can understand and finish the flow. Use it when usability is material and a runnable app is available.
- Once a PR/MR is open and the change is ready: `ship-check` checks completeness against the original ask; `mr-review` checks the diff line by line. Use both for a substantive merge, scaling effort to risk. Do not infer readiness from green CI alone.
- When review finds defects or threads need resolution: `fix-review`, then rerun affected checks and the relevant review gates. Merge only when CI and review are settled and the user has authorized merging. After merge, `spinoff` is optional for newly cheap follow-ups.

Choose the applicable next step from the current state. Do not run planning gates retroactively on a finished change, or repeat a gate without a new change or unresolved concern. If a skill is unavailable or its tools cannot run, state that limitation and use the closest safe workflow. Never claim a skill ran merely because its name appeared in a summary.
