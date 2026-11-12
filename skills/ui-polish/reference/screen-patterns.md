# Screen patterns — answer the question with a picture, not a paragraph

A data screen exists to answer one question ("where is this order", "what runs out first", "what
do I do next"). Generic agent screens answer it with a table of fields or a block of text. The
screens worth copying answer it with a **visual device per fact**, backed by data the API shapes
for that device. Pick the archetype, use its devices, and hand the backend the contract in
[data-for-visuals.md](data-for-visuals.md).

Patterns distilled from studying commercial admin templates (codeandchill: Kerfa, Tavola, Cadra,
Fitlo). Reuse the ideas, never their code or assets.

## Suggest mode — tell the user before they ask

Whenever you build, change, or even just open a data page (web or Flutter), scan what it shows as
text and **propose** the upgrades in this shape, at most 5, biggest win first. Suggest; don't
restyle a page the user didn't ask you to change.

> **Visual upgrades for `<page>`** — the question this page answers: *"…"*
> | Now (text) | Show instead | Tells the user at a glance | Data needed | API has it? |
> | --- | --- | --- | --- | --- |
> | `Qty: 2` | stock meter with par tick, red/amber/green | "running low" without reading | `on_hand`, `par_level`, `severity` | `on_hand` only — add `par_level` |
> | `Status: in_transit` | order stepper, date under each step | where it is and how long each step took | `stages[]`, `status_history[]` | status only |

### Field → device (the lookup)

| The data is… | Don't show | Show |
| --- | --- | --- |
| a quantity with a target, limit or par (stock, capacity, credit, quota, drivers on shift) | `12` / `12 of 30` | **threshold meter**, colour by server severity, tick at the target |
| a status in an ordered flow (order, shipment, onboarding, approval) | a status word or dropdown | **stage stepper** with dates; in a list row, a mini stepper or "3 of 5" ring |
| a status with no order (active, blocked, failed) | plain text | **status pill** (dot + tint) |
| money paid vs owed, used vs left | two numbers | **split well**: both figures over one bar |
| a percentage or completion | `67%` | **ring or bar** with the number inside/beside it |
| a deadline, ETA, expiry, run-out | a timestamp | **words for time** ("late by 2 days", "runs out tonight"), tinted by urgency |
| a trend or history | a column of numbers | **sparkline** (real series) + delta vs last period |
| a share of a whole (by category, stage, channel) | a totals table | **segmented bar** or ribbon with legend |
| a count of related things (items, people, attachments) | `4 items` | "Oak chair **+3**", avatar stack, thumbnails |
| a person or customer | a name column | **avatar mark** + name |
| a category or type | a word | **colour-dot chip** or icon tile |
| a yes/no | "Yes"/"No" | icon or toggle, coloured only when it matters |
| a location or route | an address string | mini map or route line (only if location is the question) |
| long free text (notes, descriptions) | the full paragraph | a one-line summary + expand |
| the thing to do next | a generic "Save" | **value-carrying action** ("Record balance $4,611") |

### Tables are not exempt
A table of plain text is the most overwhelming screen there is. In every table:
- each column passes through the lookup above — cells hold pills, mini meters, avatars, words for time;
- 5–7 columns max on desktop; the rest move to the row's drawer;
- sort worst-first by default when the page is about problems (late, low, behind);
- the first column is the identity (avatar/thumbnail + name + one-line summary), not an ID;
- numbers right-aligned, tabular, with their unit; totals row or key figures above, not below;
- mobile: rows become stacked cards with the same devices, first N + "Show all".

## Device vocabulary (build these once, in the kit — web and Flutter)

| Device | Replaces | Web (Vue/Vuetify) | Flutter |
| --- | --- | --- | --- |
| **Key figure** — big number, label, change vs a comparison, optional real sparkline | a summary sentence | `KeyFigure` (tabular-nums, count-up on first entrance only) | `KeyFigure` widget, `TweenAnimationBuilder<double>` |
| **Stage stepper** — done ✓ / current ring / future hollow, connector filled to current, date under each reached step | a status dropdown or history table | `StageStepper` (not `v-stepper`, which is a wizard) | custom `Row` of `StepDot`s; vertical on narrow widths |
| **Threshold meter** — "2 / 6 kg" over a bar with a par/target tick; fill colour by server severity; can overfill | three numeric columns | `ThresholdMeter` | `ThresholdMeter` (`FractionallySizedBox` + tick) |
| **Split well** — paid vs balance (or used vs left) side by side over one bar | a payments table | `SplitWell` | same |
| **Proportional ribbon / segmented bar** — one segment per stage or category, sized by value, with legend | a totals table | `SegmentedBar` | `Row` of `Expanded(flex:)` |
| **Status pill** — dot at full strength on a ~12–15% tint of the same hue; meaning from a server enum | a status word | `StatusPill` | `StatusPill` |
| **Words for time** — "runs out tonight", "valid 3 more days", "late by 2 days", tinted by urgency | raw dates/decimals | i18n helper from `runs_out_at` / `due_at` | same helper |
| **Identity mark** — initials avatar with a stable tint, or a thumbnail | a name column | `AvatarMark` | `AvatarMark` |
| **Value-carrying action** — the button says what it does with the number: "Record balance $4,611", "Add 4 pieces · $276", "→ Shipped" | "Submit", "Save" | `v-btn` text from `next_action` | same |
| **Counted tabs / chips** — every tab and filter chip carries its count; chips have a colour dot | a filter form | `v-tabs` + `v-chip-group` with badges | `ChoiceChip`s in a horizontal `ListView` |
| **Inline edit + undo** — −/+ stepper or toggle in the row; row, totals and header re-count; toast with Undo | an edit page | `v-snackbar` with Undo action | `SnackBar(action: Undo)` |
| **Linked record card** — work order / invoice / PO as a small card with its own progress and status inside the parent drawer | "see related" links | card + `router-link` | `ListTile` card |

All devices take colour from tokens and meaning from server enums — never invent thresholds in the
client.

## Archetypes

### 1. Board / pipeline list (orders, deals, tickets)
Question: *what is in each stage and what needs me?*
- Key-figure row (3–4) with a status pill each ("1 behind plan", "none late").
- Proportional ribbon over the board; columns with dot, count, stage sum.
- Card per item: identity mark, code, one-line summary ("4 × Oak chair +2 more"), **one
  stage-specific line** (quote countdown, production meter, carrier + ETA), flags (Rush), value,
  due chip, owner avatar.
- Owner filter as a segmented pill; tabs with counts. Drag between stages = `PATCH stage`.
- Mobile: columns become a horizontal snap scroller or stage tabs; cards full width.

### 2. Record detail (order, shipment, invoice) — a drawer that is a route
Question: *where is it, what is in it, what is still owed, what's next?*
- Header: big total + status pill + meta (placed, rep, ship-by).
- Stage stepper; line items with icon/thumbnail, "qty × unit · variant", right-aligned total;
  discount as its own negative row; split well for payment; linked record cards; account card.
- Sticky footer: **one** primary value-carrying action from `next_action`, one secondary.
- Drawer has a URL (back/Escape returns to the list), list stays visible and dimmed behind.
- Mobile: bottom sheet with grab handle (`showModalBottomSheet` / `DraggableScrollableSheet` in
  Flutter, `v-bottom-sheet` on web).

### 3. Stock / capacity list (inventory, drivers, slots)
Question: *what runs out or overloads first, and is it handled?*
- Key figures (value, below-par count, on order).
- Category chips with dot + count, a "problems only" toggle, search.
- Rows sorted **worst first**: threshold meter, words-for-time, inline count stepper with undo.
- Side cards: open orders (status, ETA, Receive), value by category (segmented bar), suppliers
  with shortfall badge and "On order" vs Order button.
- Item drawer: stat tiles, big meter, 14-day usage sparkline with daily average, linked PO, actions.
- Mobile: rows → stacked cards, first 8 + "Show all 26"; chips scroll horizontally.

### 4. Overview / dashboard
Question: *is anything off today, compared with usual?*
- Key figures with delta vs the previous period and a 7–30 point series.
- One main chart with the previous period as a dashed line (see the `dataviz` skill).
- Ranked bars with thumbnails; live list with status pills. Every number has a comparison.

### 5. Catalog / gallery (products, looks, listings)
Question: *which one do I want, and can I get it in one move?*
- Image-led cards on a tinted placeholder (tint from the image, so loading isn't grey).
- Bundle actions with the total in the label; drawer with per-item choices preselected (size from
  profile) and a live total.

## Motion for these devices (owned by `animate`)
Meters grow, steppers fill, ribbons grow `scaleX` from the start edge (mirror in RTL), key figures
count up — **once, on the shared entrance**, never on refresh. Drawer slides in, its sections
cascade top-down. Inline edits update instantly, then the header re-counts.

## Checklist
- [ ] The page's one question is written down, and the first screenful answers it.
- [ ] Every status, progress, quantity-vs-target and money-owed fact uses a device, not text.
- [ ] Every number has a comparison (target, previous period, par, total).
- [ ] The primary action names its effect and its number.
- [ ] Devices come from the kit; a missing one is added to the kit, not hand-rolled in the page.
- [ ] The API contract for each device is listed ([data-for-visuals.md](data-for-visuals.md)).
- [ ] Mobile layout chosen per archetype (sheet, stacked cards, scrolling chips, bottom dock).
