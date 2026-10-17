---
name: story-site
description: "Design a scroll-story landing page and product page for a brand — the concept (what the product's 'build' moment is), the stages mapped to real selling points, the product page/configurator, an asset list, and two ready-to-paste prompts: one for an outside video/image tool that makes the visuals, one for Fable that builds the page with a CSS fallback that works before any visuals exist. Starts from a brief (brand + product) or from a reference video (Instagram reel, TikTok, Short) it downloads and reverse-engineers first. Invoke with /story-site <brand/product or url>, or when the user says \"make me an insane landing page\", \"I want a website like this video\", \"how do I make a product page like this\". Restraint-gated: a product with no visual build moment gets a strong static page, not a forced scroll story."
---

# /story-site — an "insane" landing page, as a recipe someone can actually build

The user wants a landing page that sells a product the way the viral reels do: you scroll and the
product **builds itself** — the drink fills, the burger stacks, the shoe assembles — and the page
ends in a product page where you configure it and add to cart.

The deliverable is not a page and not a moodboard. It is: **one concept, a stage plan, a product
page spec, an asset list with costs, and two prompts** — one for the paid tool that makes the
visuals, one for Fable that builds the page. Worked example: `examples/afterglow-coffee.md`.
Read it before writing your first one; match its level of detail.

## Restraint gate

- **No build moment, no scroll story.** A SaaS dashboard, a law firm, a service with nothing
  physical to assemble — say so and write a strong static page prompt instead. Forcing a
  scrubbed sequence onto a product with nothing to show is the expensive, cheesy failure.
- **Inspiration, not a clone.** A reference video's brand, logo and copy belong to its creator.
  Re-describe the layout for the user's brand; never reuse names or text from the video.
- **One concept, not a menu.** Pick the strongest story and commit. Mention a runner-up in one
  line only if it is genuinely close.

## 0. Inputs

Need: **brand, product, the one action** (order / buy / book), **market + language** (RTL?),
and **what assets exist** (real product to film? photos? logo?). Ask only for what is missing,
in one batch; unknown brand → a clearly-fake placeholder name.

Given a reference video? Do step 1 first. Otherwise skip to 2.

## 1. Reverse-engineer a reference video (optional)

Toolchain is shared with `video-teardown` — set up once:

```bash
python3.11 -m venv ~/.cache/youtube-capture-venv
~/.cache/youtube-capture-venv/bin/pip install -U yt-dlp youtube-transcript-api imageio-ffmpeg
```

System python on these boxes is 3.9, which current yt-dlp has dropped; a stale yt-dlp fails on
Instagram with *"login required"* even for public reels. **Update before reaching for cookies**
(2026-10-17: a public reel failed on 2025.10 with and without cookies, downloaded fine logged
out on 2026.08). Still login-required on a current build → the user runs
`--cookies-from-browser chrome` themselves; it reads their session, you don't.

```bash
V=~/.cache/youtube-capture-venv/bin/python
T=~/.claude/skills/video-teardown/scripts/capture_youtube_walkthroughs.py
export YTX_OUT=<scratchpad>/reel
$V $T frames --panel full --every <dur/16> --min-gap <dur/20> --width 540 -- "<url>"
FF=$($V -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
$FF -hide_banner -loglevel error -pattern_type glob -i "$YTX_OUT/frames/<id>/*.jpg" \
    -vf "scale=450:-2,tile=4x2:padding=4" -q:v 3 "$YTX_OUT/sheet_%02d.jpg"
```

Unknown duration → run once with `--every 1`, read `dur=`, rerun for ~16 frames. Read the two
sheets; open a single frame only for small UI text. Produce a **timeline table** (time → on
screen → what changed) and note: design system, stages, interactions.

**Is the site even real?** Garbled small text, an "AI content" label, impossible camera moves →
it is an AI-generated mock-up. Say so: it's a concept that can be built, not a proven site.

## 2. The concept — find the build moment

Pick the pattern that fits the product:

| Pattern | Story | Fits |
|---|---|---|
| **Assemble** | empty → layers added one by one | drinks, desserts, burgers, bowls, skincare routines, perfume notes |
| **Explode** | whole → parts float apart, labelled → snap back | gadgets, shoes, watches, furniture, cars |
| **Reveal** | closed → opens → product rises out | boxes, gift sets, jewellery, launches |
| **Transform** | before → after, scrubbed | cleaning, beauty, renovation, fitness |
| **Origin** | raw ingredient → process → product | coffee beans, honey, dates, fashion fabric |

Then map **each stage to a real selling point** — the stage is the excuse, the copy is the sell.
"Pistachio cream" is a stage; "Sicilian pistachio, no syrups" is the line that sells. 3–6 stages;
more feels slow. The last stage lands on the finished product, at its most desirable, and hands
off to the product page.

## 3. The page

Always this skeleton — adapt, don't decorate:

1. **Header** — logo, 4–6 nav items, search, bag with counter. Optional promo bar above.
2. **Pinned story** (~100vh per stage) — canvas sequence centre; left: name, one-liner, price,
   primary CTA (visible from frame one — nobody should scroll 500vh to find "buy"); right:
   a stage rail that fills with scroll. Per stage: headline + one selling line swap in.
3. **Finish beat** — the side text clears; 2 upsell cards flank the product ("More pistachio",
   "Extra shot"), clickable as add-ons. Optional orbit ring with labels pinned to the layers.
4. **Product page / configurator** — product left, panel right: variants (size, base), add-ons
   with prices, fulfilment (pickup time / delivery), **live total**, "Add to order" → success
   state (colour change + check + bag badge bounce). Favourite button. This is the money
   section; spec every control and price.
5. **Proof** — 3 reviews or a rating, and/or "made with" ingredient cards.
6. **More products** — 3 cards, each a link to its own story page.
7. **Footer.**

Mobile: columns stack, pin ~60% as long, configurator → bottom sheet. `prefers-reduced-motion`:
final frame, no scrub. RTL brand → mirror the layout, not the product.

## 4. How it's built (say it plainly)

The "3D" is an **image sequence scrubbed on scroll** (Apple's technique): a 5–10 s clip from a
locked-off camera, exported to ~120–180 frames, drawn to a `<canvas>` by scroll progress (GSAP
ScrollTrigger + Lenis). **No 3D model.** Recommend Three.js only if the visitor must rotate or
configure the object freely — and price that (modelling, texturing, lighting).

## 5. Assets — what's missing and what it costs

List every asset the page needs, where it comes from, and the rough cost:

| Asset | Source | Cost |
|---|---|---|
| Build clip → frames | AI video (Kling, Veo, Runway, Higgsfield) or film the real product on a tripod | a few $ per clip; budget 3–5 tries |
| Stills (ingredients, thumbnails, upsell cards) | AI image tool or stock (Unsplash, Pexels) | free–cheap |
| Logo | brand's own, else text wordmark | free |

Fable writes pages and SVG/CSS art; **it does not make photoreal video**. Say which line is the
only paid one. Never reuse frames from a reference video — wrong angle, low-res, someone else's.

## 6. The two prompts

**Visuals prompt** (for the video tool): locked-off camera; backdrop and light matching the
page's palette; the object's starting state; each stage in order with rough timing; total
length; "no hands, no camera movement, photorealistic, 4K". Then a style-matched prompt per
still, sharing one style line so they look like one shoot. Then the export line:

```bash
ffmpeg -i clip.mp4 -vf fps=24,scale=1280:-1 frames/%04d.webp
```

**Fable build prompt**: one self-contained HTML file, CDN libraries with pinned versions, no
build step. Sections in the order of step 3, with: the design system (hex colours, type pairing,
signature details), each stage **with its scroll range** and what the text/rail/UI does in it,
every configurator control and price, and the **fallback** — if `frames/` is missing, draw the
product in CSS/SVG changing by stage, so the page is demoable before anyone pays for visuals.

## 7. Offer to build

Offer, don't start. Building runs on `model: "fable"`, in its own folder **outside any project
repo**, fallback first — say what's placeholder. Order of work for the user: page with fallback
(free) → one clip (paid) → drop frames in.

## Output

(Timeline table, if from a video) → the concept in 2–3 sentences + stage table (stage → visual →
selling line) → how it's built → asset table → visuals prompt → Fable prompt → the offer.
Name any frame/sheet paths in full so the user can hand them to Fable as references.
