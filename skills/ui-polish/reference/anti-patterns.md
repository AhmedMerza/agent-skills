# AI Anti-Patterns

Common patterns that make AI-generated interfaces look generic. Use this as a checklist when building or reviewing frontend code.

In an existing app, its own kit, tokens and sibling screens win over any rule here (see Build mode in SKILL.md). These rules decide new choices; they are not a reason to restyle what the app already does consistently.

## Visual & Color

- **Pure `#000000` black**: Use off-black, dark charcoal, or tinted dark (`#0a0a0a`, `#121212`, dark navy)
- **Purple/blue "AI gradient" aesthetic**: The most common AI design fingerprint. Use neutral bases with a single considered accent
- **Oversaturated accent colors**: Keep saturation below 80%. Desaturate to blend with neutrals
- **More than one accent color**: Pick one. Consistency beats variety
- **Mixing warm and cool grays**: Stick to one gray family, tint all grays with a consistent hue
- **Neon/outer glows**: No default `box-shadow` glows. Use inner borders or subtle tinted shadows
- **Generic `box-shadow`**: Tint shadows to match the background hue instead of pure black at low opacity
- **Decoration spread across the chrome**: Keep chrome quiet (nav, cards, borders, backgrounds). Put richness in one or two moments of content. Don't swap one trend (glass, grain, bento) for another
- **Random dark sections in a light page**: A sudden jump to `#111` in a cream page looks like copy-paste. Use subtle shade variation instead
- **Excessive gradient text**: Don't use text-fill gradients on large headers
- **Inconsistent lighting direction**: All shadows should suggest a single, consistent light source

## Typography

- **Overused fonts**: Inter, Roboto, Open Sans, Lato, Montserrat — these scream "default". Alternatives: Instrument Sans, Plus Jakarta Sans, Outfit, Onest, Figtree, DM Sans
- **Only Regular (400) and Bold (700)**: Introduce Medium (500) and SemiBold (600) for hierarchy
- **Oversized H1**: Control hierarchy with weight and color, not just massive scale
- **All-caps subheaders everywhere**: Try sentence case, small-caps, or lowercase italics
- **Title Case On Every Header**: Use sentence case instead
- **Missing letter-spacing**: Negative tracking for large headers, positive for small caps/labels
- **Orphaned words**: Single words on last line. Fix with `text-wrap: balance` or `text-wrap: pretty`

## Layout

- **Everything centered and symmetrical**: Break symmetry with offset margins, mixed aspect ratios, or left-aligned headers
- **Three equal card columns**: The most generic AI layout. Use 2-column zig-zag, asymmetric grid, or masonry instead
- **Cards for everything**: Use spacing and alignment for visual grouping. Cards only when elevation communicates hierarchy
- **Nested cards inside cards**: Never. Use spacing, typography, and dividers for inner hierarchy
- **No max-width container**: Add ~1200-1440px constraint with auto margins
- **Uniform border-radius on everything**: Vary radius — tighter on inner elements, softer on containers
- **No overlap or depth**: Use negative margins for layering
- **Symmetrical vertical padding**: Bottom padding often needs to be slightly larger (optical adjustment)
- **Buttons not bottom-aligned in card groups**: Pin buttons to card bottoms so they form a clean horizontal line

## Content & Data

- **Generic placeholder names**: "John Doe", "Jane Smith" — use diverse, realistic names
- **Fake round numbers**: `99.99%`, `50%`, `$100.00` — use organic data: `47.2%`, `$99.00`
- **Startup slop names**: "Acme", "Nexus", "SmartFlow" — invent contextual, believable names
- **AI copywriting cliches**: Never use "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer", "Delve"
- **"Oops!" error messages**: Be direct: "Connection failed. Please try again."
- **Exclamation marks in success messages**: Be confident, not loud
- **Lorem Ipsum**: Write real draft copy
- **Same avatar for multiple users**: Use unique assets for every person

## Components

- **Always one filled button + one ghost button**: Add text links or tertiary styles
- **Pill-shaped "New"/"Beta" badges**: Try square badges, flags, or plain text
- **Accordion FAQ sections**: Use side-by-side lists, searchable help, or inline progressive disclosure
- **3-card carousel testimonials**: Replace with masonry wall or embedded social posts
- **Modals for everything**: Use inline editing, slide-over panels, or expandable sections
- **Avatar circles exclusively**: Try squircles or rounded squares
- **Footer link farm with 4 columns**: Simplify to main nav paths + legally required links

## Icons

- **Mixed icon sets or sizes**: One line-icon set, one size, one stroke weight across the app
- **Cliche metaphors**: Rocketship for "Launch", shield for "Security" — use less obvious icons (bolt, fingerprint, spark)
- **Inconsistent stroke widths**: Audit all icons and standardize to one stroke weight
- **Emojis as icons in UI**: Use proper icon components instead

## App and admin tells (sign -> fix)

Adapted from [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir), CC BY 4.0.

| Sign | Fix |
| --- | --- |
| Every element tinted or highlighted (each bubble, row or card has its own accent fill or border) | Neutral surface steps with 6-10% hairlines; the accent marks only the one thing that must stand out |
| One colour means two things (amber = "internal note" and "warning") | One meaning per colour on a screen; give the other meaning a different signal |
| Bold on every value, label and action | Hierarchy from size and colour; weights 400-500, 600 at most |
| Uppercase, wide-tracked section labels | Sentence case, normal tracking (and caps do nothing in Arabic) |
| Off-grid spacing (6, 10, 13, 18) | 4px grid; equal gaps for equal things |
| Hard-coded radii | Theme radius tokens; nested radius = outer minus padding, minimum 4 |
| Mixed number formats ($48,210 vs $124,860.40) | One format per column; tabular figures for numbers that line up |
| Emoji in pills, counts or badges; "New", "PRO" or "Beta" badges with emoji | Plain text or one icon from the set |
| Greeting headlines ("Welcome back!"), `!` in UI text, hype words | State the content; no exclamation marks |
| Stat cards padded with sparklines or icons | Label, figure, and change with what it compares to |
| Charts with a colour per series by default | One accent for the series that matters, neutral steps for the rest |

**Template check:** swap the product name for another. If the screen still fits, it has no character of its own.

## Scaffold and surface reflexes (sign -> fix)

Adapted from [impeccable](https://github.com/pbakaus/impeccable) `craft-floor.md` by Paul Bakaus, Apache-2.0. These are the defaults a model reaches for when nothing was decided; the first is a hard ban, the rest need a reason from the brief or the app's own kit.

| Sign | Fix |
| --- | --- |
| **Eyebrow / kicker above a heading** ("Saved for later" over "Your wishlist"; Vuetify `text-overline` or `v-card-subtitle` above a title; Flutter `labelSmall` above `headlineSmall`) | Ban. Delete the label; the heading carries its own weight |
| Section numbers `01 / 02 / 03` | Only when the sequence itself is information the reader needs (steps they follow in order) |
| Hero-metric template: big number, small label, supporting stats, accent | Lead with what the user came for; a figure earns size only if it is the decision |
| Coloured `border-left`/`border-right` > 1px on cards, rows, callouts, alerts (side stripe) | A tinted surface, an icon, or a plain 1px border; in RTL a side stripe also lands on the wrong side unless logical |
| Glass and blur as decoration (`backdrop-filter`, Flutter `BackdropFilter`) | Only for a specific effect — content scrolling under a sticky bar — never as the card style |
| Hard offset shadow (`box-shadow: 4px 4px 0`) outside a deliberately neobrutalist kit | The kit's elevation tokens; declare elevation once, border *or* shadow |
| Unicode glyphs or emoji as icons (★ ✓ → ♥ in markup) | The app's icon set (`v-icon` / `Icon` component / `Icons.*`), one stroke and weight |
| Geometric masks (circle, polygon) faking an organic cut-out of a photo | A real alpha cut-out asset, or no effect |
| Light or dark chosen by product category ("finance = dark") | Choose from the use scene: who, where, what ambient light |
| Browser surfaces left at defaults: text selection, caret, scrollbars, focus ring, link underline offset, table numerals | Theme them from the palette: `::selection`, `caret-color`, `accent-color`, `scrollbar-color`, `text-underline-offset`, `font-variant-numeric: tabular-nums` |
| Perpetual decorative loops (floating, pulsing, bobbing) on a resting screen | One entrance at most; resting UI is still (motion decisions belong to `animate`) |

## Missing Elements (What AI Typically Forgets)

- **No legal links**: Privacy policy and terms of service in footer
- **No "back" navigation**: Dead ends in user flows
- **No custom 404 page**: Design a branded "not found" experience
- **No form validation**: Client-side validation for emails, required fields, formats
- **No skip-to-content link**: Essential for keyboard users
- **No favicon**: Always include a branded favicon
- **No meta tags**: `<title>`, description, `og:image`, social sharing tags
