---
name: video-teardown
description: Reverse-engineer a product you can only see in videos — pull a YouTube channel's walkthroughs, extract narration and UI screenshots, map their flows/screens/fields, then diff that against your own codebase with file:line evidence and return a ranked build-or-skip call. Invoke with /video-teardown when handed a competitor's channel, a product demo, or a conference talk and asked "what do they have that we don't / should we add this". Restraint-gated: "they built that for a market you're not in" is a first-class verdict — but ONLY after you've asked where the product is heading. Not for videos you cannot get captions or frames for.
---

# /video-teardown — What does their product actually do, and should we copy it?

Someone hands you a link: a competitor's YouTube channel, a demo reel, a product tour. The
question underneath is never "what's in the video" — it's **"what do they have that we don't,
and which of it should we build?"**

You cannot watch video. You *can* read captions and look at frames, and for narrated screen
recordings that is enough to reconstruct a product in real detail — every wizard step, every
form field, every status tab.

## The restraint gate — read before anything else

Two failure modes, and the second one is the expensive one.

**Failure 1 — the feature-list dump.** Transcribing their nav menu into a table is not
analysis. Nobody needs a list of what a competitor has; they need to know what to *do*. If you
finish with a comparison matrix and no ranked call, you haven't done the job.

**Failure 2 — judging their features against the product as it exists today.** This is the one
that will bite you, so it gets its own rule:

> **Before you rule anything "out of market", ask where the product is going.**

You will read the current codebase, infer the product's shape from its constraints, and start
filing the competitor's bigger ideas under "different market, don't copy". That inference is
almost always wrong, because a young product's constraints describe **what got built first**,
not what it is for. A radius cap, a single vertical, one payment rail, a short timeout — those
are v1 decisions, not a market definition.

Ask the question explicitly and early: *what's the ambition — more verticals, more geographies,
a different class of user?* One sentence back from the user re-ranks the entire output. A
capability that is "irrelevant" for a single-vertical v1 is often the exact thing that unblocks
vertical number two.

Rule the thing out only when it's tied to something genuinely immovable — a regulator in a
country you don't operate in, a payment method that doesn't exist in your currency — and say
*which* immovable thing, so the user can tell you if it moves.

## Setup

System python is often too old for a current `yt-dlp`; pip then silently installs a stale build
whose downloader gets **403 Forbidden**. Use 3.11+:

```bash
python3.11 -m venv ~/.cache/youtube-capture-venv
~/.cache/youtube-capture-venv/bin/pip install -U yt-dlp youtube-transcript-api imageio-ffmpeg
```

- `imageio-ffmpeg` ships a **static ffmpeg** — no root, no system package.
- `youtube-transcript-api` is separate **on purpose**: yt-dlp's own caption path is PO-token
  gated and returns nothing, while this one works unauthenticated.

Bundled: `scripts/capture_youtube_walkthroughs.py` with `list` / `transcript` / `frames`.

## The passes

### 1. Index — is this even teardown-able?

```bash
export YTX_OUT=./teardown
V=~/.cache/youtube-capture-venv/bin/python
$V scripts/capture_youtube_walkthroughs.py list "https://www.youtube.com/@handle/videos" --limit 100
```

Read the **titles** before pulling anything. Product channels label walkthroughs plainly
("create X step by step", "how to Y"), and the titles alone usually reveal the whole product
surface and which 4-6 videos carry the flows that matter. A channel of ads and testimonials is
not teardown-able — say so and stop.

Then check you can actually get both halves on ONE video before committing:

- **captions** — if `transcript` returns nothing, the videos are music-over-screencapture and
  you're frames-only. Still workable; say so.
- **frames** — if the download 403s, fix the toolchain before pulling 15 videos.

### 2. Transcripts — the narrated flow

```bash
$V scripts/capture_youtube_walkthroughs.py transcript -- <id> [<id>...]
```

Narration gives you the *sequence* and the *vocabulary* — what they call things, what order the
steps come in, what happens after payment. It will not give you field names or layout.

### 3. Frames — the actual UI

```bash
$V scripts/capture_youtube_walkthroughs.py frames --panel right --scene 0.045 --every 4 --min-gap 1.5 -- <id>...
```

**Scene detection on the full frame is useless for app walkthroughs.** A map or video panel
changes constantly, so every pan reads as a new screen while the actual form steps don't
register at all. `--panel` crops to the form region and detects changes *there*, then extracts
the **full** frame at those timestamps. Use `right` for RTL layouts, `left` for LTR sidebars,
`full` only for full-screen content. `--every` guarantees coverage of slowly-typed forms that
never "cut".

**Name the output for what it shows, not for the video id.** `frames/tpbwDljGxEw/` is
unreadable a week later; `frames/10-carrier-submit-price-offer/` tells you what is in it. Slug
each video by *what it demonstrates*, numbered in the order a real user moves through the product
(signup → onboarding → create → transact → track → get paid), and prefix by which side of the
product it shows. Keep the id↔slug map in the index file so a video is still findable. Do this
**before** you start reading frames — renaming afterwards means rewriting every citation you have
already written, in the analysis and in any tickets filed from it.

Then **read frames selectively, not exhaustively.** Use the transcript timestamps to jump
straight to the moments that matter — the narration says "enter your price and pick a vehicle"
at 00:33, so read the frame at 00:40. Reading all ~300 frames is the expensive, low-yield path.

What to harvest from a screen: **every field and its requiredness**, status tabs and their
counts, sort/filter controls, badges the system computes for you, what's downloadable, and what
the nav menu reveals about surfaces you never saw.

### 4. Diff against your own code — with evidence

For every capability you found, establish what *you* have. **Delegate this**; it's broad
search across modules and it produces file dumps you don't want in context. Hand each agent a
numbered checklist and demand a fixed shape back:

> HAS / PARTIAL / MISSING + one sentence + `file:line`. No file contents, no raw grep output.
> Do not spawn subagents.

Cap the fan-out and pin cheap models. Split by surface (core mechanic / user-facing flow /
money and admin), not by file count.

**Verify before asserting absence.** "We don't have X" is the claim most likely to be wrong and
most embarrassing when it is. Every MISSING needs someone to have actually looked.

**Distrust a tidy answer.** An agent that reports back about *other agents* rather than about
the code has failed — re-run it with a tighter scope and an explicit no-delegation instruction.

### 5. The call

Rank by value-to-us, and separate the categories that get confused:

| Bucket | What belongs in it |
|---|---|
| **Found-while-looking** | Things broken on their own merit, unrelated to the competitor. Usually the cheapest real wins — file these first. |
| **Small** | Real gaps that sit inside existing seams; no schema upheaval. |
| **Real gaps** | Apply regardless of the competitor's market — compliance, data you're silently dropping, loops that don't close. |
| **Project-sized** | Genuine feature decisions. Present as a decision, not a defect. |
| **Not recommended** | With the *specific* reason, and re-checked against the roadmap answer from the restraint gate. |

Two rules for the last row:

- **Never recommend building something you already have.** Check first. Recommending a payout
  flow to a team that shipped one is the fastest way to lose the reader.
- **State what makes each small item small** — often it's a current constraint (a short
  timeout, a single vertical). If that constraint is on the roadmap to disappear, the item's
  value changes, and the user needs to know that to sequence it.

## Gotchas

- **Pass `--` before video IDs.** IDs beginning with `-` are read as flags otherwise.
- **zsh does not word-split unquoted variables** — `$IDS` arrives as one argument. Use `${=IDS}`
  or list them literally.
- **YouTube rate-limits after ~10 rapid downloads** with 403. Retry the failures with a pause;
  `--sleep-requests 2 --retries 15` is usually enough. A 403 on the *first* download is a stale
  yt-dlp instead.
- Videos cache under `_video_cache/` and are deleted after extraction unless `--keep-video`.
  Frames are the artifact; the cache is disposable.
- Frames are large. Keep them out of version control.

## Output

Write findings to a file, not just the terminal — this is reference material the user will come
back to. Anchor every claim: their capabilities to `frames/<id>/<file>` or a transcript
timestamp, yours to `file:line`. A claim with no anchor will be re-litigated later.
