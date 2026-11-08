---
name: reimagine
description: "Give it a website (a brand, a shop, a restaurant, a club, a person) and it invents AND builds a cinematic one-page experience for it, with no idea needed from the user: it reads the site, finds the brand's hero object and the one moment worth touching or watching, writes the concept, picks how it should move (scroll story, live 3D object, or click-to-explore world), builds it, and verifies it with screenshots. Invoke with /reimagine <url>, or when the user says \"make something insane for this site\", \"do a cool page for <brand>\", \"make a page like the coffee / jersey one for this\", \"I don't have an idea, just make it amazing\". Original by design: references are a pattern library, never a template to copy. Builds through scroll-craft (scroll-driven) or explore-site (pointer-driven). Restraint-gated: a site with nothing visual to stage gets one strong static page, not a forced gimmick."
---

# /reimagine — a URL in, an original cinematic page out

The user hands over a site and no idea. The job is the whole chain: **understand the brand →
invent the concept → choose how it moves → build it → prove it works.** The user should only
need to say "go" or "try the other one".

Two things this is not:
- **Not a copy.** The coffee reel, Garuda's kit rail and the real-estate tower are *patterns*
  (below), not templates. The concept must come from *this* brand's product, story and assets.
  If the result could swap in another brand's logo unchanged, the idea isn't done.
- **Not a redesign of their website.** It is one showpiece page: a hero experience plus just
  enough sections to carry it (story, product, call to action).

## 0. Harvest the site (inline, a few calls)

Fetch into the scratchpad with a browser UA: the home page, plus 2–4 linked pages that carry the
product (menu, shop, about, collection). Extract:

| What | Where |
|---|---|
| Name, tagline, voice | `<title>`, `og:*`, hero heading, about copy. Note the language/direction (Arabic → RTL page) |
| Hero objects | the products/things they sell or are known for, with the image URLs (`og:image`, product `<img>`, `srcset` largest) |
| Brand marks | logo (SVG/PNG), palette (CSS custom properties, the most frequent hex values), fonts (`@font-face`, Google Fonts links) |
| Place | a physical venue? (address, photos of the space) → hints at Mode C |
| Proof | prices, awards, numbers, signature item |

Download the best 6–12 images into the project's `assets/source/`. Note their resolution and
whether they have plain backgrounds (cut-outable). **Assets decide what is buildable**, so this
table feeds the concept. Don't write the concept first and discover the assets afterwards.

If the site is thin (one page, no product images), ask for photos once. If there are none, the
concept must work with generated or typographic assets, so say which.

## 1. Find the idea (this is the skill — spend the thinking here)

Work it out, in order:

1. **The hero object:** the one thing a fan would hold up. A shirt, a cup, a bottle, a building,
   a dish, a car, a book. One, not a catalogue.
2. **The verb:** what that object *does* at its best moment. Pour, bloom, assemble, hang and
   swing, unfold, open, rise, light up, fly, sizzle. The verb is the motion of the page.
3. **The input that verb wants:**

   | If the verb is… | It wants… | Mode | Built by |
   |---|---|---|---|
   | a **process or transformation** (bean → cup, dough → bread, raw → finished, day → night) | time you control → **scroll** | **A. Scroll story** | `scroll-craft` (plan with `story-site` if there's a configurator/shop) |
   | **touching the object itself** (swing it, spin it, flip it, put your name on it) | the **pointer** on a live object | **B. Live object** | `explore-site` Mode A |
   | **moving through a place** (tower → apartment → room, venue → table, campus → hall) | **clicks** between views | **C. Explorable world** | `explore-site` Mode B |

4. **The signature twist:** one detail only this brand could have, taken from the harvest. Their
   flag's zig-zag as the hanger trim, their roast names as the scroll chapters, their real
   prices on the hotspot cards, the customer's name painted live onto their product.
5. **The peak:** the single moment the whole page builds to (the shirt turns to show *your* name;
   the latte art resolves; the apartment door opens). One peak.

Write **three** concepts (one per mode if the brand allows, otherwise three variants of the best
mode), each in four lines: *hero object · verb · twist · peak*. **Pick one yourself** with a
one-line reason (fits the verb, buildable from the harvested assets, strongest peak). Then
**proceed without waiting**, listing the two alternates in one line each so the user can redirect.
Ask first only if the build would need assets the user must generate or pay for (AI video clips,
a 3D model).

### Pattern library (inspiration, never templates)

- **Pour sequence** (coffee reel): AI video of the product transforming, scrubbed frame by frame
  on a canvas by scroll; oversized serif chapter titles; ends on the finished product with
  orbiting info cards → Mode A.
- **Kit rail** (Garuda, Bahrain): products hanging in a dark room, procedural spring + cloth
  bend, drag to browse, click to focus, turn to see the back, live name/number → Mode B.
- **Tower explorer** (real-estate reel): hotspots on a photo, click → zoom clip → cutaway floor
  plan → room renders → rooftop, with a price card per unit → Mode C.
- **Menu comes alive** (menu reel): a flat menu or photo where the dish rises off the page as an
  image-to-video asset. This is an *asset technique* any mode can use, not a mode itself.

Combine and invert them. A rail can be shoes, a scroll story can run backwards
(cup → bean), an explorable world can be a dish's layers.

## 2. Build

- New project directory, a sibling under the user's projects dir (e.g.
  `/srv/dev/projects/private/<brand>-showcase/`). Never inside an unrelated repo.
- **Mode A** → follow `scroll-craft` (its brief is already answered by step 1, so skip its interview
  and feed it the concept, harvested assets, palette and fonts).
  **Modes B / C** → follow `explore-site` from its step 2 (the reverse-engineering step is replaced
  by the harvest).
- Use the brand's own palette, fonts and logo from the harvest; real product names, real prices.
  Copy in the brand's voice and language (RTL when Arabic).
- Delegate the build to a `general-purpose` agent with `model: "fable"`, "do not spawn
  subagents", and a complete brief: concept (the four lines + peak), mode, the builder skill's rules
  to follow, asset paths, brand tokens, the verification list. Resume the same agent for fixes.

## 3. Verify, then judge the *idea*, not just the pixels

- The builder skill's verification runs (GPU screenshots, desktop + phone, every state, mid-motion
  frame, console clean, build passes). Look at the shots yourself before reporting.
- Then the originality check, honestly:
  - Swap test: would this page work for a competitor with the logo changed? If yes, the twist is
    missing. Go back to step 1.4.
  - Is the peak visible in one screenshot? If you can't point at it, it isn't there.
  - Does a first-time visitor know what to do within 3 s (drag / scroll / click)? One hint, once.

## Rules

- **Their brand, their assets.** Use the brand's real content. Build locally. Never publish or host
  a page in a real organisation's name unless the user owns it or has said they're authorised;
  for anyone else it is a pitch/demo, so label it that way in the README.
- Never invent prices, awards or claims. Use only what the harvest found.
- AI-generated video/images: write the exact prompts and the shot list; generate only through a
  tool the user has set up (scroll-craft's kie.ai). Otherwise build a fallback that works without
  them (stills + CSS/three motion) and say what the clips would add.

## Output

The concept (chosen + two alternates, four lines each), the project path, the run command, the
screenshot folder, what the peak is and where to see it, known limits, and any asset prompts the
user still has to run.
