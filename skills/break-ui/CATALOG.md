# Worst-Case Catalog


> Adapted from [emilkowalski/skills](https://github.com/emilkowalski/skills) `break-ui/CATALOG.md` (MIT, © 2026 Emil Kowalski). The *Commerce and bilingual (en/ar)* section is local.
Realistic values that break UI, grouped by what kind of value the component renders. Use the rows that apply to the fields in your Phase 1 table. Each value is something a real user could produce; the note says what it tends to break.

Use `example.com`, `example.org`, or `.test` domains for emails and URLs, so the fixture never points at a real inbox or site.

---

## People and names

| Value | Breaks |
| --- | --- |
| `Aleksandra Wiśniewska-Kowalczyk` | Long, hyphenated, diacritics; wraps to two lines, and the hyphen is a line-break point |
| `Christopher Alexander Montgomery III` | Long with a suffix; naive first + last initials give `CI` |
| `Konstantin Oberhauser-Wettstein` | Long and compound; overflows single-line rows |
| `Jo` | Two letters; leaves the name column mostly empty, and naive initials give `J` |
| `J` | One letter; single-character initials, very short click target if the name is the link |
| `Ólafur Darri Ólafsson` | Leading accented capital; uppercase/sort logic, initials `ÓÓ` |
| `Đặng Thị Ngọc Hân` | Stacked Vietnamese diacritics; clipped by tight `line-height` + `overflow: hidden` |
| `王秀英` | CJK, no spaces; "first + last word" initials logic finds one word, and CJK breaks anywhere |
| `نور الهدى عبد الرحمن` | RTL; punctuation and icons land on the wrong side without `dir="auto"` |
| `Seán O'Brien-Ó Súilleabháin` | Apostrophe and accents; escaping, initials, search |
| `María José de la Cruz y Fernández` | Lowercase particles; initials `Md` or `MF`, sorting by "last name" |
| `dana` | All lowercase; initials should still be uppercase |
| `🦊 Fox` | Emoji first; `.charAt(0)` returns half a surrogate pair (`�`) |
| `👩🏽‍💻 Priya` | ZWJ emoji sequence; `.length` is 7+, slicing breaks it into pieces |
| `  Sam   Lee ` | Leading, trailing, and repeated spaces; initials from empty words, odd gaps |
| *(missing)* | No name at all, only an email; the UI must fall back to something |

## Emails, URLs, identifiers

Unbreakable strings: they have no spaces, so the browser has nowhere to wrap them.

| Value | Breaks |
| --- | --- |
| `bartholomew.fitzgerald@northwind-industries-holdings.example.com` | The classic. Pushes every sibling off the row without `overflow-wrap: anywhere` |
| `a@b.co` | Shortest realistic; layout that assumed a long email looks empty |
| `first.last+billing-notifications@example.com` | Plus-addressing; validation that rejects `+`, display that truncates the meaningful part |
| `ops@sub.department.region.example.co.uk` | Many subdomains, two-part TLD; "domain" extraction logic |
| `https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved` | Long URL; overflow, and end-truncation hides the part that differs |
| `9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f` | UUID; monospace width, middle-truncation candidate |
| `Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf` | File name; end-truncation hides the version and extension, brackets and dashes in paths |
| `IMG_20250914_183022_HDR_portrait_edited_edited.HEIC` | Camera file name; unbreakable, uppercase extension |
| `@a` / `@thisisaverylongusernamethatisallowed` | Handle extremes |

## Labels, titles, and copy from data

| Value | Breaks |
| --- | --- |
| `Senior Product Design Engineer, Platform Infrastructure` | Long job title; wraps to three lines in a secondary slot |
| `Invitation expired 12 days ago` | Long status badge; badge wraps or squeezes the name column |
| `Benachrichtigungseinstellungen` | German compound (30 chars, no spaces); label overflow, unbreakable |
| `Paramètres de confidentialité et de sécurité` | French expansion of "Privacy & security"; UI copy runs ~30% longer in translation |
| Twelve tags on one item: `design`, `frontend`, `q3`, `urgent`, `needs-review`, … | Tag rows that wrap into a wall; needs a `+8` overflow |
| A tag named `customer-feedback-from-enterprise-onboarding` | One tag wider than its container |
| `Untitled` / empty string / `   ` | Title missing; collapsed heading, zero-height row |
| `<script>alert(1)</script>` / `&amp;` / `**bold**` | Escaping; must render as literal text |
| `Line one` + newline + `Line two` | Newline in a single-line field; doubles row height or is silently dropped |
| A 2,000-character pasted description | Clamps, "show more", and textarea growth |

## Numbers and money

| Value | Breaks |
| --- | --- |
| `0` | Zero states: "0 members", empty progress bar, division by zero in percentages |
| `1` | Plurals: "1 members", "1 days ago" |
| `1284` | Needs a thousands separator: `1,284` |
| `1000000` | Width of the count badge; consider compact form `1M` where precision doesn't matter |
| `12345678.9` as currency | `$12,345,678.90`; overflows totals columns |
| `-42.5` | Negative sign, red color logic, parentheses in accounting formats |
| `0.1 + 0.2` | `0.30000000000000004` rendered raw |
| `142%` / `-3%` | Progress bars and meters past their bounds |
| `null` / `undefined` / `NaN` | Rendered literally |
| `1.284` in `de-DE` vs `1,284` in `en-US` | Locale formatting; hardcoded separators are wrong for half the world |
| A value that changes live (`99` → `100`) | Width jump and jitter without `tabular-nums` |

## Visual data devices (steppers, meters, split wells, key figures — see ui-polish screen-patterns)

| Value | Breaks |
| --- | --- |
| Meter at `0`, exactly at target, `1.8×` target | Empty bar invisible on glass; tick hidden under the fill; overfill clipped or spilling out of the card |
| Meter with **no target** (`par_level: null`) | Divide by zero, a full bar that means nothing — fall back to the number alone |
| Meter, `on_hand` negative (oversold) | Bar drawn backwards; severity must be `bad`, not hidden |
| Stepper with no status history / a skipped step / a cancelled or returned order | Missing dates render "Invalid Date"; skipped step shown as done; cancel has no place in the line — needs an off-track state |
| Stepper with 9 steps on a 390px phone | Labels overlap — vertical layout or current-step-only on narrow widths |
| Split well 100% paid, 0% paid, overpaid (credit) | Zero-width segment still shows a rounded cap; overpaid has no state |
| Key figure `987,654,321.50` / `-42` / missing comparison | Overflows the tile; delta pill shows `NaN%`; arrow direction wrong for "lower is better" metrics |
| Words for time: `runs_out_at` in the past, `null`, 400 days away, in Arabic | "Runs out in -2 days"; plural forms (Arabic has six); "in 1 year" vs a date |
| Sparkline with 1 point, all zeros, all equal, one huge spike | Flat line at the bottom reads as "broken"; spike flattens the rest — clamp or log only with a note |
| Segmented bar with one segment at 0.3% | Invisible sliver with an orphan legend; minimum visible width + legend still lists it |
| Device colour in RTL | Fill grows from the wrong edge; stepper runs left-to-right in Arabic |
| Severity enum the client doesn't know (`critical` added server-side) | No colour, or crash — map unknown to the neutral tone |

## Collections

| Value | Breaks |
| --- | --- |
| 0 items | The empty state, and whether one exists at all |
| 1 item | Grids that look broken with one card; "1 of 1" |
| Exactly page size, and page size + 1 | Off-by-one in "Showing 40 of 40", pagination that shows an empty page 2 |
| 1,000+ items, unpaginated | Scroll performance, render time, memory; also "Showing 40 of 1,284" copy |
| One item 10× the size of the others | Masonry and grid rows stretching to the tallest item |
| Items with identical names | Lists where the name is the only distinguishing field |

## Time

| Value | Breaks |
| --- | --- |
| Now | "0 seconds ago" instead of "just now" |
| 12 days ago, 11 months ago, 3 years ago | Relative-time thresholds; switch to an absolute date after a week or so |
| A future date | "in 3 days" vs "-3 days ago" |
| `1970-01-01` | A zero timestamp shown as a real date |
| `2025-12-31T23:30:00-08:00` | Shows as a different day in UTC and the user's timezone |
| Very long duration (`1,284 hours`) | Duration formatting that never rolls up to days |

Use `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat`, not hand-built strings.

## Images and media

| Value | Breaks |
| --- | --- |
| Avatar URL that 404s | Broken-image icon instead of the initials fallback |
| No avatar at all | The fallback itself: initials, color, size parity with real avatars |
| 4000×200 panorama as avatar or cover | Distortion without `object-fit: cover` |
| 200×4000 tall image | Same, other axis; can also blow out a card's height |
| Transparent PNG logo, dark logo on dark mode | Invisible on the background |
| Slow-loading image | Layout shift without fixed dimensions or `aspect-ratio` |

## States

| Value | Breaks |
| --- | --- |
| Loading | Skeletons that don't match final layout, spinners that shift content |
| Error from the API | No error state, or a raw error message (`TypeError: Cannot read properties of undefined`) |
| Partial data | Some optional fields filled, others not, in the same list; misaligned rows |
| Every status at once | All enum values in one list (`active`, `invited`, `expired`, `suspended`); badge widths vary |
| No permission | Disabled actions; does the row still lay out the same? |
| The current user in the list | "You" labels, actions that shouldn't apply to yourself |

## Environment

Not data, but checked the same way: flip to the worst case, then change these.

| Condition | Breaks |
| --- | --- |
| Container at 320px | Every overflow above, at once |
| Narrow sidebar placement | Components designed full-width, reused in a 280px column |
| 2560px wide | Lines too long to read, content stranded on one side |
| Browser zoom 200% / large text setting | Fixed heights that clip growing text |
| Dark mode | Hardcoded colors, invisible borders and logos |
| `dir="rtl"` | Icons, chevrons, padding, and the order of trailing actions |
| Touch device | Hover-only actions (the ••• that appears on hover) are unreachable |

## Commerce and bilingual (en/ar)

Local additions for storefronts, POS and admin screens that ship in English and Arabic.

| Value | Breaks |
| --- | --- |
| `قميص قطني رجالي بأكمام طويلة وياقة كلاسيكية مناسب للعمل والمناسبات الرسمية` | 90-char Arabic product name; clamps, card height, ascender clipping under tight `line-height` |
| `مؤسسة النخبة للتجارة العامة والمقاولات والخدمات اللوجستية` | Long vendor/shop title in a one-line slot |
| `SKU-MODEL-XL-2024-BLK-WIDE-EDITION` | Unbreakable token; widens a `1fr` grid column without `min-width: 0` |
| Name present in English only (`name_ar` empty) | The fallback path; mixed-direction text inside an RTL card |
| Price `null` / missing `price_range` | Empty price line next to a live "Add to cart" button |
| Price `0` / free item | "BHD 0.000" vs "Free"; division by zero in discount % |
| `BHD 1,234.500` (3 decimals), `SAR 12,345,678.90` | Currency width in a narrow price row; mixing 2- and 3-decimal currencies |
| "From" price (product with required priced options) | Longer price string; sibling cards that show the base price instead |
| Old price + new price + rating on one row | Three items competing for ~150px on a 2-column phone grid |
| `-20%` / `20%` discount badge | Shows as `%20-` in RTL without `<bdi>` / `dir="ltr"` |
| `١٢٬٤٨٠` vs `12,480` | Arabic-Indic vs Latin digits on one screen; hand-formatted numbers next to `Intl`-formatted ones |
| Review count `0`, `1`, `12480` | Hidden vs "(0)"; Arabic plural forms (0, 1, 2, 3–10, 11–99, 100+); thousands separator |
| Rating `4.9` from 1 review | Reads like a strong rating without the count beside it |
| Stock `0`, `1` ("Only 1 left"), backorder | Out-of-stock overlay vs still-enabled buy button; disabled button keeping its "Add" label |
| Product with no `url_key` / slug | Card keeps a pointer cursor but links nowhere |
| Twelve option values (sizes, colours) | Chip rows that wrap into a wall |
| Phone `+973 3312 3456` and an address in Arabic | LTR number inside RTL text; reversed digits without isolation |
