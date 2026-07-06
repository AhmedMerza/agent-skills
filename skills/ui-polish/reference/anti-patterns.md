# AI Anti-Patterns

Common patterns that make AI-generated interfaces look generic. Use this as a checklist when building or reviewing frontend code.

## Visual & Color

- **Pure `#000000` black**: Use off-black, dark charcoal, or tinted dark (`#0a0a0a`, `#121212`, dark navy)
- **Purple/blue "AI gradient" aesthetic**: The most common AI design fingerprint. Use neutral bases with a single considered accent
- **Oversaturated accent colors**: Keep saturation below 80%. Desaturate to blend with neutrals
- **More than one accent color**: Pick one. Consistency beats variety
- **Mixing warm and cool grays**: Stick to one gray family, tint all grays with a consistent hue
- **Neon/outer glows**: No default `box-shadow` glows. Use inner borders or subtle tinted shadows
- **Generic `box-shadow`**: Tint shadows to match the background hue instead of pure black at low opacity
- **Flat design with zero texture**: Add subtle noise, grain, or micro-patterns to backgrounds
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

- **Single icon library for everything**: Mix icon sets or use a custom set for differentiation
- **Cliche metaphors**: Rocketship for "Launch", shield for "Security" — use less obvious icons (bolt, fingerprint, spark)
- **Inconsistent stroke widths**: Audit all icons and standardize to one stroke weight
- **Emojis as icons in UI**: Use proper icon components instead

## Missing Elements (What AI Typically Forgets)

- **No legal links**: Privacy policy and terms of service in footer
- **No "back" navigation**: Dead ends in user flows
- **No custom 404 page**: Design a branded "not found" experience
- **No form validation**: Client-side validation for emails, required fields, formats
- **No skip-to-content link**: Essential for keyboard users
- **No favicon**: Always include a branded favicon
- **No meta tags**: `<title>`, description, `og:image`, social sharing tags
