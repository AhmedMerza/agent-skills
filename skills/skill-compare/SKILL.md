---
name: skill-compare
description: Evaluate an external skill (a single SKILL.md, a gist, or a whole skills repo) against the collection you already have, and return a verdict — adopt it, graft specific mechanisms from it, or skip it. Invoke with /skill-compare when handed a link to someone's skill or skills repo and the question "should I add any of these?". Measures real content vs. boilerplate, prices the infrastructure it assumes, diffs it against your incumbents by procedure step (not by description), and tests the runnable core on real repo work before recommending anything. Restraint-gated: "skip, you already have this" is the most common correct verdict and never needs padding.
---

# /skill-compare — should I actually add this?

Someone published a skill, or a repo full of them, and the question is whether any of it earns a place in your collection. The failure mode is deciding from the README: descriptions are written to sell, file sizes lie about content, and a skill that reads brilliantly can be welded to a framework you don't run. The other failure mode is the opposite — dismissing 60 KB of prompt as bloat when three of its steps are things your version genuinely lacks.

The deliverable is a **verdict per candidate**, and the most valuable verdicts are usually *skip* (you already have this, leaner) and *graft* (take these two mechanisms, leave the skill).

**The restraint gate.** You are done when every candidate has a verdict backed by evidence. Don't review 57 skills at equal depth — triage on overlap first and go deep only on the handful that survive. Don't manufacture a "gap" so the answer looks useful; if the honest result is "nothing here you need," that's the finding, delivered in a paragraph. And never install a framework to evaluate one skill.

## The passes

### 1. Resolve the source, and inventory *both* sides

Get the actual files, not the README's account of them. For a repo, list the tree and find every `SKILL.md` (`gh api 'repos/<owner>/<repo>/git/trees/HEAD?recursive=1'`, or a shallow clone if it's large); for a single file or gist, just read it.

Then inventory what you already have — and not just skills. Overlap hides in four places:
- `~/.claude/skills/` — the skills themselves
- `~/.claude/commands/` — slash commands often cover the same ground
- the project's `.claude/` — repo-local skills, commands, and **subagent definitions**
- **Claude Code built-ins** — `/code-review`, `/security-review`, plan mode, memory, hooks

A "security audit skill" is not a gap if a built-in and a `security-reviewer` subagent already cover it. Check before calling anything novel.

### 2. Measure the real payload, not the file size

Big skill files are usually mostly shared boilerplate. Look for the tell: a `SKILL.md.tmpl` beside the `SKILL.md`, an `AUTO-GENERATED` header comment, or `{{PLACEHOLDER}}` include markers. Where a generator exists, the template is the authored content and everything else is expansion.

Quantify it — `wc -l` on both, per skill — and report unique content vs. boilerplate as a ratio. This is what tells you whether a 100 KB skill is 100 KB of thinking or 15 KB of thinking wrapped in 85 KB of framework preamble replicated across every skill in the repo. It also tells you the real context cost of invoking it.

### 3. Price the infrastructure tax

Skills are markdown; they have no plugin API. So any "tooling" a skill appears to have is really *the prompt instructing the model to run shell commands*. Find out what those commands need before you assume the skill is portable:

- **Runtime deps** — does it shell out to `bun`, `node`, `python`, a compiled binary?
- **State directories** — does it read/write a home-dir tree that only its own installer creates?
- **`settings.json` mutation** — does setup register hooks or rewrite Claude Code config? This is the only part that's a genuine harness integration, and the only part you can't replicate with plain markdown.
- **Per-invocation overhead** — network calls, update checks, telemetry fired on every run.

Count the framework references inside the file (`grep -c '<framework-prefix>'`). A high count in the *shipped* file but near-zero in the *template* means the coupling is all in the generated preamble — and the ideas underneath are portable.

### 4. Diff by procedure step, not by description

Put the candidate's steps beside your incumbent's steps and compare what each one actually *instructs the model to do*. Descriptions converge ("systematic debugging", "root cause analysis") while procedures diverge sharply — and the divergence is the whole finding.

Look specifically for:
- **Steps yours doesn't have.** A triage table, a stop rule, a search step, a sanitization rule. These are the graft candidates.
- **Steps yours has that it doesn't.** Just as important — it tells you what adopting it would *cost* you.
- **Same word, different meaning.** Two skills can both say "blast radius" and mean *how much data is affected* vs. *how many files the fix touches*. That divergence changes the output completely and is invisible from the description.

### 5. Test the runnable core on real work

Don't judge from reading alone once a candidate has survived to here. Extract the core — drop the generated preamble and framework calls, keep the authored instructions — and run it on a **real fixture from the repo you actually work in**: an open bug from the tracker, a live page, a finished diff. Synthetic fixtures reward whichever skill is wordier.

Two rules that decide whether the test means anything:

- **Run the unknown skill first.** Whichever you run second knows the answer already, and its result is contaminated. If the unfamiliar one wins going first, that's a strong signal; if yours wins going second, that's inconclusive and must be reported as such.
- **Prefer a fixture with checkable ground truth** — a bug whose cause you can verify in code or data — so "better output" is a fact rather than a preference.

Where a candidate fills a genuine gap there's nothing to race it against; run it alone and judge the output on its own merits.

### 6. Verdict

One verdict per candidate that survived triage, plus a one-line dismissal for the rest.

## Output shape

```
## skill-compare: <source>

**Inventory** — <N candidates; M overlap with what you have; K genuinely novel>

### Verdicts
| Candidate | Verdict | Why |
|---|---|---|
| <name> | skip | <what of yours already covers it, and which is leaner> |
| <name> | graft | <the specific mechanisms worth lifting> |
| <name> | adopt | <the gap it fills, and what it costs to run> |

**Infrastructure tax** — <deps, state, settings.json, per-invoke overhead — or "none, plain markdown">
**Real payload** — <unique content vs. boilerplate, if a generator is involved>
**Tested** — <fixture used, what was run, what the result was — or "not tested: why">

**Recommendation: <one line>**
```

## Guardrails

- **The README is marketing; the steps are the product.** Never issue a verdict from a description or a skill list alone.
- **File size is not content size.** Check for a template/generator before quoting any number.
- **Compare against everything** — skills, commands, subagents, and Claude Code built-ins. Most "gaps" are already covered somewhere.
- **Never install a framework to evaluate one of its skills.** Extract the core and run that; it's what you'd adopt from anyway.
- **Run the unknown skill first**, and label any second-run result as contaminated.
- **Graft is usually the right answer.** Whole-skill adoption is rare; two or three specific mechanisms is the common real outcome.
- **Skip is first-class.** "You already have this, and yours is smaller" is a complete, valuable verdict — don't pad it into a maybe.
- **Note provenance on anything adopted or grafted**, per the collection's convention, so the source is traceable later.
