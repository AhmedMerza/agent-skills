---
name: reel-to-site
description: "Turn a short video of a website (an Instagram reel, TikTok, YouTube Short, Dribbble shot) into a buildable recipe — download it, pull frames onto contact sheets, read the timeline second by second, work out how the effect is really made, then write two prompts: one for an outside video/image tool that makes the visuals, one for Fable that builds the page with a fallback that works before the visuals exist. Invoke with /reel-to-site <url> or when the user says \"I want a website like this video\" / \"how do I make this landing page\". Restraint-gated: a page with no motion story gets a plain build prompt, not an image-sequence pipeline."
---

# /reel-to-site — "I want a website like the one in this video"

The user saw a landing page in a short video and wants one like it. The question underneath is
never "describe the video" — it's **"what is this actually made of, and what do I paste where to
get one?"** The answer is two prompts and an honest note on what needs a paid outside tool.

You cannot watch video. You can read frames, and for a 10–30 s design reel 16 frames on two
contact sheets is enough to reconstruct every stage.

## Restraint gate

- **No motion story, no pipeline.** If the page in the video is static or only has hover/fade
  effects, skip the image-sequence part entirely and write one build prompt. The pipeline below
  is for scroll-scrubbed product builds (the drink fills, the shoe assembles, the phone explodes).
- **Inspiration, not a clone.** The brand in the video belongs to someone. The prompts use the
  user's brand (ask if unknown; otherwise leave a clearly-fake placeholder) and re-describe the
  layout — never the creator's logo, name or copy.

## 1. Get the video

Toolchain is shared with `video-teardown` — set it up once:

```bash
python3.11 -m venv ~/.cache/youtube-capture-venv
~/.cache/youtube-capture-venv/bin/pip install -U yt-dlp youtube-transcript-api imageio-ffmpeg
```

System python on these boxes is 3.9, which current yt-dlp has dropped; a stale yt-dlp fails on
Instagram with *"login required"* even for public reels. **Update before reaching for cookies** —
2026-10-17 a public reel failed on yt-dlp 2025.10 with and without cookies and downloaded fine,
logged out, on 2026.08. Only if the current build still says login-required, ask the user to run
`--cookies-from-browser chrome` themselves (it reads their session; you don't). A Chrome that
yields cookies but still gets the login page is simply not logged in to that site.

```bash
V=~/.cache/youtube-capture-venv/bin/python
T=~/.claude/skills/video-teardown/scripts/capture_youtube_walkthroughs.py
export YTX_OUT=<scratchpad>/reel
$V $T frames --panel full --every <dur/16> --min-gap <dur/20> --width 540 -- "<url>"
```

`frames` takes a full URL as well as a YouTube id. Scene detection rarely fires on these
(smooth camera, no cuts), so `--every` does the work: aim for ~16 frames. Unknown duration?
Run once with `--every 1`, read the `dur=` it prints, rerun.

Then contact sheets — 8 frames per image so each read is one call:

```bash
FF=$($V -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
$FF -hide_banner -loglevel error -pattern_type glob -i "$YTX_OUT/frames/<id>/*.jpg" \
    -vf "scale=450:-2,tile=4x2:padding=4" -q:v 3 "$YTX_OUT/sheet_%02d.jpg"
```

Read the sheets. Read a single full frame only where small UI text matters (a checkout panel,
a step label).

## 2. Read it

Produce a **timeline table** — time → what's on screen → what changed. Then pull out:

- **Design system** — background, text and accent colours (name hex guesses), type pairing
  (display serif / UI sans…), layout grid, signature details (shadow overlay, rail, pills).
- **The motion story** — the stages, in order, and what drives them (scroll? click? time?).
- **Interactions** — buttons that change state, counters, panels that slide in, live totals.
- **Is the site even real?** Garbled small text ("Stinnetiene", "Pistachio Tiramsu"), an
  "AI content" label, physically impossible camera moves → it is an AI-generated mock-up of a
  site. Say so plainly: it's a concept, it can be built, but nobody has proven it works.

## 3. Say how it's really made

Almost every "3D" product-build site is **an image sequence scrubbed on scroll** (Apple's
technique): a 5–10 s clip of the object being built from a locked-off camera, exported as
~120–180 frames, drawn to a `<canvas>` by scroll progress (GSAP ScrollTrigger + Lenis), with
text and UI timed to stages. Real-time WebGL is the exception — only recommend Three.js when
the user must *rotate* or *configure* the object freely, and say the cost (modelling, lighting).

## 4. The two prompts

**Visuals prompt** — for the outside tool (Kling, Veo, Runway, Higgsfield; paid per clip).
Fable writes pages and SVG/CSS art; it does not make photoreal video. Include: locked-off
camera, backdrop and light matching the design system, the object's starting state, each
build stage in order with rough timing, total length, "no hands, no camera movement,
photorealistic". Then the export line:

```bash
ffmpeg -i clip.mp4 -vf fps=24,scale=1280:-1 frames/%04d.webp
```

**Fable build prompt** — one self-contained HTML file, pinned CDN versions, no build step.
Sections, in this order:

1. Brand + look (the design system from step 2, re-described for the user's brand)
2. Header
3. The scroll story — pin length, canvas sequence path, **each stage with its scroll range**
   and what the side text / rail / floating UI does in it
4. What comes after the pin (configurator, cards, footer) with the real interactions
5. **Fallback**: if `frames/` is missing, draw the object in CSS/SVG filling by stage — so the
   page is demoable before anyone pays for visuals
6. Mobile (stack, shorter pin, panels → bottom sheets) and `prefers-reduced-motion`
   (final frame, no scrub)

Stage ranges come from the timeline table, not from a template — a reel with three stages gets
three.

## 5. Offer to build

Offer, don't start: building runs on `model: "fable"`, in its own folder **outside any project
repo**. If the user says yes, build with the fallback first and say what's placeholder.

## Output

Timeline table → one paragraph "how it's really made" (incl. the AI-mock-up note if it
applies) → visuals prompt → Fable prompt → one line on cost (which part is paid, roughly) →
the offer. Name the frame/sheet paths in full so the user can hand them to Fable as references.
