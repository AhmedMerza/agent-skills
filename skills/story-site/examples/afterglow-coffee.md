# Worked example — "Afterglow Coffee" (from a reference reel)

Source: an Instagram reel (polanaeem.tech, 2026, labelled "AI content") — a 10 s laptop mock-up.
Small text in it was garbled, so the "site" was an AI-generated concept, not a live page.
"Afterglow" is the creator's brand; for a real build swap in the user's.

## Timeline

| Time | On screen |
|---|---|
| 0–1s | Empty glass on stone coaster. Left: *Signature drink* / PISTACHIO TIRAMISU ICED LATTE / $7.50 / ADD TO ORDER, pistachio bowl. Right: vertical rail (Crave → 02 …) |
| 1–2s | Ice drops in |
| 2–4s | Espresso head slides in, two streams pour over milk; rail → 02 Espresso |
| 4–5s | Green pistachio cream swirls down the glass; rail → 03 Tiramisu |
| 5–6s | Mascarpone cream crown piped on |
| 6–7s | Cocoa dusted; left text clears; side cards MORE PISTACHIO / MORE COCOA; rail → Finish |
| 7–8s | Crushed pistachio topping; orbit ring with layer labels; rail moves into header as horizontal tracker |
| 8–10s | Customize panel: size, milk, extras, pickup card "Ready in 8–10 min", total $9.00 → ADD TO ORDER → green "Added to your order", bag badge counts up; olive promo bar on top |

## Concept

Pattern: **Assemble**. Stages = ingredients, each with one selling line. Finish beat = upsells.
Ends in a configurator with live total.

## Visuals prompt

> Static locked-off camera, product shot on a warm cream seamless backdrop, soft window light
> with diagonal leaf shadows. A tall clear glass on a round stone coaster. Over 8 seconds: ice
> cubes drop in, cold milk pours, an espresso stream from above creates marbled layers, green
> pistachio cream swirls down the inside of the glass, a tall mascarpone cream crown is piped on
> top, cocoa is dusted, crushed pistachios land on top. No camera movement, no hands,
> photorealistic, 4K.

## Fable build prompt

> Build a single-page website for a premium coffee brand "Afterglow Coffee" as one self-contained
> HTML file (GSAP 3 + ScrollTrigger + Lenis from cdnjs, pinned versions, no build step).
>
> **Look:** warm minimal luxury. Cream background (#EFEAE2) with a soft diagonal leaf-shadow
> overlay, near-black text, olive accent (#7A8450). Condensed uppercase serif for headlines,
> small italic serif for "Signature drink", clean sans for UI. Header: "AFTERGLOW / COFFEE"
> logo; nav (Home, About Us, Products, Contact, Menu); search, "Bag (0)" + bag icon with badge.
>
> **Scroll story (pinned, ~500vh):** centred `<canvas>` scrubs `frames/0001.webp…` by scroll
> progress — a tall glass being built on a stone coaster. Preload, draw DPR-sharp. Stages:
> 1. **Crave (0–15%)** — empty glass → ice. Left: "Signature drink", "PISTACHIO TIRAMISU ICED
>    LATTE", one-line description, "$7.50", black "ADD TO ORDER", pistachio bowl.
> 2. **Espresso (15–35%)** — espresso head pours two streams.
> 3. **Pistachio (35–55%)** — green pistachio cream swirls down the glass.
> 4. **Tiramisu (55–70%)** — mascarpone crown, cocoa dust.
> 5. **Finish (70–85%)** — left text fades; "MORE PISTACHIO" and "MORE COCOA" cards fade in
>    either side (photo + add button); clicking adds an extra.
> 6. **Taste (85–100%)** — thin elliptical ring orbits the glass with pill labels (Espresso,
>    Pistachio, Mascarpone) at their layer heights.
>
> Right: vertical rail (Crave → Espresso → Tiramisu → Finish) fills with scroll; active step
> gets a numbered black dot; at pin end it becomes a horizontal tracker in the header.
>
> **Customize (after the pin):** glass left, panel right "07 Summary — CUSTOMIZE": line item
> with thumbnail; size (Regular / Large +$1.00); milk (Whole / Oat +$1.00); extras chips; pickup
> card "Ready in 8–10 min — Afterglow Café, change location"; live total (base $7.50). "ADD TO
> ORDER" turns olive with a check ("Added to your order") and the bag badge bounces up. Heart
> and "Shop more" pill in the image corners. Olive promo bar on top ("Free pastry with your
> first order — See order").
>
> **Fallback:** if `frames/` is missing, draw the glass in CSS/SVG with layers that fill by
> stage (ice, milk, espresso, pistachio swirl, cream crown, cocoa, pistachio topping).
>
> **Mobile & a11y:** columns stack, pin ~300vh, customize panel → bottom sheet;
> `prefers-reduced-motion` shows the finished drink, no scrub.
