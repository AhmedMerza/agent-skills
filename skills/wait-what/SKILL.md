---
name: wait-what
description: Stop — that last message did not land. Re-pitch it from a running start, in plain controlled English, keeping the project's domain terms intact. Trigger ONLY on an explicit signal that the user did not follow the previous explanation - /wait-what, "wait, what?", "I don't follow", "you lost me", "say that again". Do NOT fire when "wait, what" signals alarm at an action rather than confusion at an explanation ("wait what, you deleted it?") - answer for the action instead. Adapted from Matt Pocock's wait-what skill (github.com/mattpocock/skills).
---

Wait — I don't understand where you've got to here.

Don't clarify the confusing sentence; that just adds more jargon on top. **Re-pitch the whole
thing from a running start.** Assume the setup is what I missed, not the vocabulary.

Give me a little bit of context first — where we are and why this came up — then the point.

Write it in ASD-STE100 Simplified Technical English:

- One idea per sentence. Roughly 20 words maximum.
- Active voice. Present tense where you can.
- One word, one meaning — don't rotate synonyms for the same thing.
- No jargon, no metaphor, no nested parentheticals.

**Except** for this project's own vocabulary — keep those terms exactly as they are. Take them
from whichever of `CONTEXT.md`, `CLAUDE.md`, the project docs, or the memory index this repo
actually has. Simplify the connective tissue around the domain terms, never the terms
themselves. Flattening a named setting like `max_retry_backoff_ms` into "the timing config"
makes the re-pitch *less* useful, not more.

One caution: this register flattens hedges along with jargon. If something was genuinely
conditional — "depends on load", "usually but not always" — keep the hedge as its own short
sentence rather than dropping it to keep the prose clean.

If the re-pitch still doesn't land, stop re-pitching and switch modes: ask me questions one at
a time until you find where the model in my head differs from yours.
