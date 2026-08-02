---
name: skill-audit
description: Maintenance loop for the skills you already own. Stage 1 (cheap, runs after a merge or on demand) records how skills actually behaved this session — but ONLY from observable evidence: a user override, a correction, a misfire, padding they rejected, an instruction the repo made impossible. Appends to ~/.claude/skill-audit/log.jsonl and never edits a skill. Stage 2 (rare) fires when the same complaint about the same skill reaches 2+ occurrences across DIFFERENT sessions, and proposes a minimal diff to that SKILL.md for approval. Invoke with /skill-audit after merging, or when the user says "did the skills work / should I change a skill / review my skills". This is skill-compare's sibling — that judges EXTERNAL skills for intake; this judges INCUMBENTS for maintenance. Restraint-gated: logging nothing is the normal outcome, and self-assessment ("I could have applied it better") is never evidence.
---

# /skill-audit — are the skills I already own still right?

Skills are prompts, and prompts rot. The repo changes, the conventions move, a step that read well on day one turns out to produce noise on real work — and nothing ever tells you. `skill-compare` guards the front door (should I adopt this external skill?). Nothing guards the ones already inside. This is that loop.

The evidence for whether a skill works is generated every session and then thrown away when the session ends. This skill's entire job is to catch a little of it before it's gone, and — only once the same thing has happened twice — act on it.

**What this is NOT — so you invoke the right thing:**
- **Not `skill-compare`.** That prices an *external* skill against your collection: adopt / graft / skip. This audits an *incumbent* against its own real-world performance.
- **Not a retro on the code.** The merge is only the trigger. Nothing here judges the branch, the diff, or the work — `ship-check` already did that. The subject is the **tooling**.
- **Not a memory writer.** Observations go to `~/.claude/skill-audit/log.jsonl`, *not* to `~/.claude/projects/<project>/memory/`. Memory is per-project and is loaded into context on every session; skills are global and their telemetry must not tax every future session. (Stage 2 *reads* the feedback memories — it never writes them.)
- **Not a self-review.** See the gate.

## The gate — evidence is observable, never introspective

The failure mode that kills this skill is me grading myself. *"Did I apply `ponytail` well?"* is unfalsifiable, and I will rationalize the answer every time. So introspection is banned outright:

> **If the only source for an observation is my own judgment about my own performance, it is not evidence. Do not log it.**

Every entry must quote a **concrete artifact** — either the instruction line in the SKILL.md that caused the problem, or the user's actual words correcting it. If you cannot quote it, you do not have an entry.

### What counts (all externally observable)

| Kind | What it looks like |
|---|---|
| `override` | The user countermanded an explicit instruction in the skill. **Strongest signal there is** — the skill said do X, they said don't. |
| `correction` | The user said the output was wrong, useless, or off-target, and it had to be redone. |
| `misfire` | Fired when it shouldn't have, or *didn't* fire when it should — the user had to invoke by hand something whose trigger claims it auto-fires. |
| `padding` | Produced findings the user rejected as noise. Especially telling for the restraint-gated skills, whose whole promise is not doing this. |
| `blocked` | An instruction the environment makes impossible — a path that moved, a tool that isn't installed, a convention that changed, a command that no longer exists. |

### What never counts
- **"I could have applied it better."** Introspection. Banned.
- **The skill worked.** Log nothing. This is the normal outcome.
- **The user disagreed with a *finding*.** A skill that surfaces candidates for a human to reject is *working* — rejection is the design, not a defect. Only log it if they rejected the finding as *noise the skill should never have raised*.
- **Project-specific weirdness** that says nothing about the skill.
- **Anything without a quotable artifact.**

## Stage 1 — observe (after a merge, or on demand)

Cheap, non-destructive, runs often. It writes to a log and **never touches a SKILL.md**.

1. **List the skills actually used this session.** If none were, say so and stop.
2. **Scan for the five kinds above** — over what's in context, and if the session is long or compacted, over the transcript on disk (`~/.claude/projects/<project-slug>/*.jsonl`, matched by session id).
3. **Apply the gate to each candidate.** Most die here. That's correct.
4. **Append survivors** to `~/.claude/skill-audit/log.jsonl`, one JSON object per line:

```json
{"date":"2026-08-02","skill":"fix-review","kind":"override","what":"user blocked the Phase 3 auto-push","artifact":"SKILL line: 'do not stop between steps or ask for additional confirmation'","session":"<id>","branch":"<branch>","resolved":false}
```

Get `date` from `date -I`, `branch` from `git branch --show-current`. Use the real session id.

5. **Check for a pattern.** After appending, count prior *unresolved* entries with the same `skill` and the same substantive complaint:

```bash
grep '"skill":"<name>"' ~/.claude/skill-audit/log.jsonl | grep '"resolved":false'
```

Entries from the **same session** count once — one incident is one data point no matter how many times it recurred within it. If the count reaches **2 across different sessions**, say so and offer stage 2. **Do not run stage 2 unprompted.**

6. **Report.** Usually: `No skill issues logged — <skills used>, all behaved.`

## Stage 2 — propose (only on a real pattern, only with approval)

Rare, careful, and it is the only part that can change a file.

**Entry conditions — one of these, or don't run:**
- 2+ unresolved log entries, same skill, same complaint, **different sessions**; or
- 1 log entry **plus** a pre-existing `type: feedback` memory saying the same thing. Search them all — this corpus predates the log and is where the strongest evidence currently lives:
  ```bash
  grep -rl "type: feedback" ~/.claude/projects/*/memory/*.md
  ```
  The same correction written down in two different projects is the same n≥2 signal, already recorded.

**Then:**

1. **State the pattern and cite the evidence.** Every occurrence, with its artifact. If the two occurrences aren't actually the same complaint, stop — that's one anecdote twice, not a pattern.
2. **Find the exact cause in the file.** The specific line or step that produced the behavior. "The skill is too aggressive" is not a cause; `fix-review.md:93 "do not ask first"` is.
3. **Propose the minimal diff.** Change the instruction that caused it. Do **not** rewrite the skill, restructure it, or "improve" adjacent prose while you're in there — that's the same scope creep `/spinoff` exists to prevent, aimed at your tooling.
4. **Check the blast radius.** Does the edit break another step that depends on the old behavior? A skill is a program; changing step 3 can strand step 5.
5. **Show before → after and ask.** Never edit unasked.
6. **On approval:** apply the edit, then mark those log entries `"resolved":true` so the pattern stops re-firing. Note the change in the skill's provenance comment if it has one.
7. **On rejection:** mark them `"resolved":true` with `"outcome":"rejected"`. A rejected proposal must not come back every merge.

**Expect rejections.** The user knows why a skill says what it says; you're reading it cold. A proposal turned down is the loop working, not failing.

## Output shape

Stage 1, the normal case:
```
## Skill-audit: <branch>
Skills used: <list>
**Nothing logged** — no overrides, corrections, misfires, padding, or blocks.
```

Stage 1, with a finding:
```
## Skill-audit: <branch>
Skills used: <list>

**Logged 1**
- `<skill>` · `<kind>` — <what happened>
  Artifact: "<the quoted instruction or correction>"

**Pattern:** `<skill>` now has 2 unresolved entries across 2 sessions (<dates>). Run stage 2?
  (or: "No pattern — 1 entry, needs a second occurrence.")
```

Stage 2:
```
## Skill-audit — proposed change: <skill>

**Pattern (n=<n>):** <the recurring complaint>
- <date> · <session/branch> — "<artifact>"
- <date> · <session/branch> — "<artifact>"

**Cause:** <file>:<line> — "<the offending instruction>"

**Proposed diff**
- <before>
+ <after>

**Blast radius:** <what else in the skill depends on this / "nothing — step is self-contained">

Apply?
```

## Guardrails
- **Introspection is not evidence.** No artifact, no entry. This single rule is what keeps the skill from becoming a rationalization engine.
- **Stage 1 never edits a skill.** It logs. That separation is why stage 1 is safe to run often.
- **n≥2, across different sessions.** One bad run is an anecdote. Editing a tuned prompt on n=1 overfits — and a bad prompt edit is *silent*: nothing fails, every future run just gets quietly worse.
- **Minimal diffs only.** Change the line that caused it. Never rewrite a skill because you were in the file.
- **Never write to the memory system.** Read it for evidence; write only to the log. Memory costs context on every session, forever.
- **Nothing logged is the normal result.** If the log grows at every merge, the gate has failed and the skill is manufacturing telemetry. A log that gains a handful of entries a month is healthy.
- **Resolve what you act on.** Applied *or* rejected, mark it. A loop that can't converge will re-propose the same edit forever.
- **The user's skills are theirs.** Propose, cite, ask. Never apply unasked.
