---
name: explore-site
description: "Build a premium site the visitor drives with the POINTER, not the scroll wheel: (A) a real-time 3D object showcase they drag, swing, turn and customise (three.js — jerseys on a rail, a sneaker on a plinth, a bottle they spin, live name/number painted on), or (B) a click-to-explore world (hotspots on a hero photo → transition clip → cutaway / floorplan → room-by-room tour, like luxury real-estate and hotel sites). Invoke with /explore-site, or when the user says \"make a site like this\" about an interactive 3D or explorable reference (a URL or a reel), \"make it like garuda / the jersey rail\", \"hotspots on the building\", \"let people walk through the apartment\", \"3D product they can play with\". Reverse-engineers the reference first (bundles for a URL, frames via /video-teardown for a reel), picks the mode, builds a Vite project, and verifies it with GPU screenshots. Restraint-gated: if the reference is scroll-driven (a page that plays as you scroll, a product that builds itself) hand off to story-site / scroll-craft instead; if nothing needs to be touched, build a strong static page."
---

# /explore-site — a site you play with, not scroll past

Two kinds of reference land here, and they are built differently:

| Mode | The visitor… | Built from | Reference examples |
|---|---|---|---|
| **A — Live object** | drags, swings, spins, flips, customises one thing (or a row of them) | three.js scene, procedural motion, canvas-painted textures | garuda2026.offwg.com/rail (kit rail), the Bahrain kit rail (`/srv/dev/projects/private/bahrain-kit-rail`) |
| **B — Explorable world** | clicks hotspots and travels between fixed views | stills + short transition clips (AI image-to-video or renders) driven by a state graph, HTML overlays on top | Real-estate tower → residence → cutaway floorplan → rooms → rooftop |

## Restraint gate — run first

- **Scroll is the input** (page plays as you scroll, product assembles, frame-sequence hero) →
  not this skill. `story-site` plans it, `scroll-craft` builds it. Say so and hand off.
- **Nothing in the reference responds to the pointer** → a static page with good photography
  beats a fake 3D gimmick. Say so.
- **Mixed** (an explorable world inside a scroll page) → build the explorable part here as a
  section, and leave the scroll shell to scroll-craft.

## 0. Reverse-engineer the reference (always — never guess the stack)

- **URL:** `curl` the HTML with a browser UA into the scratchpad, list `<script src>` /
  modulepreload, download the bundles, and grep them for the stack and the assets:
  `THREE|WebGPURenderer|isWebGPUBackend|GLTFLoader|KTX2|Draco|Meshopt|gsap|ScrollTrigger|lenis|rive|spline|lottie`
  plus `\.(glb|gltf|hdr|ktx2|mp4|webm|riv|json)`. Download one `.glb` and read its JSON chunk:
  `animations`, `skins`, morph `targets`. **0 animations = the motion is procedural in code** — then
  grep around words like `cloth|wind|sway|bend|flutter|spring` to see which uniforms drive it.
- **Reel / video:** run `/video-teardown` in its single-clip mode: frames, then one contact sheet per
  clip (`ffmpeg … -vf "fps=2,scale=320:-1,tile=6x4"`). Describe the states and transitions, not the
  thumbnail.
- Report in a few lines: stack, asset types, how the motion is made, which mode (A/B). Reproduce
  the **technique**, never their code, models or brand.

## 1. Brief (keep it short — ask only what blocks the build)

What is the object/world, what assets the user already has (photos, `.glb`, renders, brand marks),
what the one "touch moment" is (swing a shirt, turn the bottle, open the apartment), and where it
should live. Build in a **new project directory**, never inside an unrelated repo. Default: a
sibling under the user's projects dir.

## 2A. Mode A — Live object (three.js)

Stack: **Vite + vanilla JS + three** (pin versions). `WebGLRenderer` unless the reference needs
WebGPU/TSL. React only if the user's app is already React (`@react-three/fiber` + `drei`).

**Asset ladder — stop at the first rung you have:**
1. A real `.glb` of the object → `gltf-transform optimize in.glb out.glb --texture-compress ktx2`.
2. Only photos (front/back) → a **subdivided plane (64×64) per face**: pillow depth from a blurred
   silhouette height map, front mesh + back mesh back-to-back. Honest limit: edge-on it is a thin
   lens — say so, and say a `.glb` fixes it.
3. Nothing → ask for photos; don't invent the product.

**Photo cutouts:** key the background out with ImageMagick (floodfill ~2% fuzz from the edges,
erode the mask 1–2 px, feather), then **fill transparent texels with the edge colour** so
mip-mapping never bleeds a white halo. Use `alphaTest`/alpha-to-coverage for the edge.

**Motion is procedural, not baked:**
- Each object has a **damped spring** state (sway/tilt/yaw + velocities), integrated with a
  **fixed step (1/120 s, sub-stepped)**. A `dt` clamp alone makes a slow machine run in slow
  motion.
- A **vertex shader bends the mesh** from uniforms (`bend`, `twist`, `flutter`): the far end lags
  `(1−v)²`, flutter scales with speed. JS writes uniforms each frame; eased values use
  `x += (target − x) * k`.
- Pointer: drag pans with momentum + rubber-band ends; pan velocity and brushing past push
  neighbours; hover = small lift; click = focus (camera eases in, others dim); double-click or a
  button = turn 180° with overshoot; Esc / click outside = unfocus. Pointer events, so touch works.
  No tap-duration limits (a busy main thread breaks them).
- **Make the motion visible.** If a swing is not obvious in a mid-drag screenshot, it is too
  stiff. Tune until it reads, then make sure neighbours never clip.

**Customisation:** paint names/numbers/text on a 2D `<canvas>` over the plain texture and use it
as a `CanvasTexture`. One asset serves every variant, and a form repaints it live. **Back faces
sample `(1−u, v)`**, or the lettering comes out mirrored.

**Look:** HDR environment (Poly Haven or PMREM of the room), ACES tone mapping, a dark room with a
spot pool per object, painted contact shadows under each object, fog or a curved backdrop so the
floor never meets the wall in a hard line, a CSS vignette. A themed loader with copy in the brand's
voice ("Hanging the shirts…"). Cap DPR at 2 and pause rendering when the tab is hidden.

**HTML overlays vs the scene:** the camera moves on focus, so check that 3D geometry never
lands behind the title/UI in any state. Hide or move the overlay per state (`body.is-focused`).

## 2B. Mode B — Explorable world (state graph)

Model it as a **graph of views**: each node is a still (or a looping clip), each edge is a short
**transition clip** (1–3 s) from node A's frame to node B's. Example: `tower` →(hotspot residence 3)→
`residence-zoom` → `cutaway` →(room chip)→ `living` ↔ `bedroom` ↔ `bath`; `tower` → `rooftop`.

- **Assets:** renders or photos per node; transitions from an image-to-video tool given the
  *first and last frame* (Veo / Kling / Google Flow / kie.ai, which scroll-craft already
  scripts). Prompt each edge with both frames and "locked camera path, no new objects". The user
  generates them; write the per-edge prompts as a list. Encode H.264 + WebM, `playsinline muted`,
  preload the neighbouring edges only.
- **Playback:** on click, play the edge clip, and on `ended` swap to the node still (same frame →
  invisible cut). Reverse edges play a reversed clip (export it; don't rely on negative
  `playbackRate`). Ignore clicks while a transition is running.
- **Hotspots:** absolutely positioned in **image-relative %** over an `object-fit: cover` media box
  (recompute on resize), with a hover card (unit, beds, area, price, status) and a keyboard-focusable
  button. The cutaway's room chips sit on the same layer.
- **Chrome:** breadcrumb/back, a room switcher, a persistent CTA (book a viewing / enquire), and
  `history.pushState` per node so Back and deep links work.
- A real 3D cutaway (a three.js `.glb` dollhouse they can orbit) only if a model exists. Otherwise
  a rendered orbit clip looks the same and costs nothing at runtime.

## 3. Verify — screenshots on the real GPU, every state

- Start your own server on a **free port** (`--port 5190 --strictPort --host 127.0.0.1`). Other dev
  servers are usually running. Stop **only the PID you started**; never `pkill -f vite`.
- Playwright with **GPU Chrome** (`CHROME=/home/amerza/.local/bin/google-chrome`, ANGLE/EGL).
  Headless SwiftShader runs at ~2 fps and makes motion look frozen. That's an artefact of the test
  environment, not proof the motion is fine.
- Keep a small `tools/shots.cjs` + a `window.__app` test hook, and shoot desktop 1440×900 and phone
  390×844: loading, idle, **mid-interaction** (~140 ms after a simulated drag/click), focused, the
  turned/back or each node of the graph, and after-unfocus. Log console errors to `console.log`.
- **Look at every shot** and read it for defects: halos, mirrored text, z-fighting, clipping,
  geometry behind UI, stiff motion, hard horizons, grey rims. Fix and re-shoot. Report what you
  fixed and what remains, honestly.
- `npm run build` must pass.

## Delegation

The build is visual work: per the user's rules, delegate it to a `general-purpose` agent with
`model: "fable"`, a full brief (mode, assets, the rules above, verification steps) and **"do not
spawn subagents"**. Keep the reverse-engineering inline (it's a few greps), then review its
screenshots yourself before reporting. When fixes come back, resume the same agent; it already
holds the code.

## Output

A runnable project path, the run command, the screenshot folder, what works, the known limits
(e.g. plane vs real model, user-generated clips still pending), and, for Mode B, the per-edge
generation prompts the user still has to run. Nothing is published or hosted unless asked.
