# Android native notifications

Use this reference when designing or implementing custom Android notification content, including
Flutter apps that bridge to native `RemoteViews`. The goal is a notification that belongs in the
device's notification shade while making one important state easier to understand.

Android's standard template is the default. Use custom content only when a standard title/body,
progress notification, messaging style or another built-in template cannot express the essential
information. Apps targeting Android 12+ cannot own the whole notification surface: System UI adds
the standard header, icon and expansion affordance. Build inside that contract with
`NotificationCompat.DecoratedCustomViewStyle`.

Official constraints:

- [Create a custom notification layout](https://developer.android.com/develop/ui/views/notifications/custom-notification)
- [Android 12 custom-notification behavior](https://developer.android.com/about/versions/12/behavior-changes-12#custom-notifications)

## Native-surface rules

- Let System UI draw the outer card, header, app identity, time and expand/collapse affordance.
  Keep the custom root transparent. Never paint a second rounded card or background image inside it.
- Use `TextAppearance.Compat.Notification.Title`, `.Info` and `.Line2` for ordinary notification
  text. Status/accent colors may be explicit, but need separate light and dark tones with measured
  contrast.
- Treat 48dp as the collapsed content budget, 88dp as the heads-up budget and 252dp as the expanded
  budget. OEMs can provide less horizontal room than the emulator.
- Use only `RemoteViews`-safe widgets and methods. Prefer `LinearLayout`, `TextView` and `ImageView`;
  vector drawables belong in `ImageView`. A generic `<View>` used as a line or spacer can fail on an
  OEM even when it works elsewhere, so use a permitted concrete widget.
- Do not add app motion. System UI owns arrival, heads-up, expansion and collapse.

## Information hierarchy

Design collapsed first. It is the normal state, not a teaser for the expanded state.

1. One compact metadata row: category plus the identifier that lets the user recognize the item.
2. The single state answer the notification exists to provide.
3. Optional expansion only for genuinely additional information or actions.

Remove repetition. If the category says "Order update" and a labeled journey already marks
"Delivering", another "Out for delivery" title and generic body are redundant. Body text is opt-in,
not reserved empty space. Keep it available in the data contract so a later high-value message can
enable it deliberately.

Exceptions are different: do not force a failed, cancelled or returned item onto the successful
journey rail. Show a plain problem statement and the next useful action instead.

## Compact journey rail

A journey rail works when the stages are few, stable and mutually understood.

- Keep it to roughly 3–5 labeled milestones. Labels remain visible in the collapsed notification.
- Mark completed connectors and milestones, emphasize the current label, and leave future stages
  neutral. Never communicate state through color alone.
- One meaningful icon at the current milestone is usually stronger than four competing pictograms:
  use a package, truck, plane or check where it adds recognition; keep other milestones as dots.
- If every milestone truly needs its own icon, prove all icons remain distinguishable at notification
  size and that translated labels still fit. Otherwise return to the active-icon pattern.
- Let RTL reverse the visual journey through layout direction while keeping identifiers and numbers
  isolated LTR where appropriate.

## Delivery path and preview parity

- Set collapsed, expanded and heads-up views explicitly. They should be the same design at different
  information densities, not three unrelated cards.
- Preserve a standard notification fallback when native custom rendering is unavailable.
- Confirm whether the server sends an FCM `notification` payload, a data payload, or both. Foreground,
  background and terminated delivery may take different rendering paths; visual parity requires each
  path to reach the intended renderer.
- A debug preview must post through the same native notification code as production. A Flutter-only
  mock is useful for iteration but is not evidence of what System UI will render. Keep mock and native
  preview hierarchy, labels and icons aligned.
- Notification taps carry the smallest routing payload needed to open the correct detail screen.

## Verification gate

Before calling the notification done, verify:

- collapsed, expanded and heads-up states;
- light and dark notification shade;
- English and the longest supported RTL locale;
- long but realistic category, reference and stage labels;
- large font scale without clipping the essential state;
- foreground, background and terminated delivery paths;
- tap routing and the standard fallback;
- at least one real target OEM device. Samsung One UI is especially valuable because it exposes
  nested-card styling and `RemoteViews` compatibility mistakes that an emulator can miss.

Capture evidence outside the repository. Do not commit notification screenshots or review images.
