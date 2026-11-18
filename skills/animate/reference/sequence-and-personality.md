# Sequence and personality: reference-led entrance work

Use for a named motion reference, an expressive landing page, or feedback that an entrance is missing or barely perceptible. Preserve an established motion system on ordinary product work.

## Observe before prescribing

Watch the actual route at normal speed and inspect its implementation when available. Record starting opacity, direction/distance, scale, duration/ease, group start offsets and sibling stagger. Separate entrance, state changes and continuous scroll/pointer motion. A function exported by a bundle is not evidence it runs on this route. Do not infer animation quality from a settled screenshot.

Fitlo Explore was inspected in Chrome on 2026-11-17. Observed route calls: heading controls use y14/550ms/power3.out; bento tiles use y26/scale .985/opacity0/800ms/expo.out with 100ms group offset and 60ms sibling stagger; the shell uses x−16 for sidebar items and y−14 for topbar items. Category-change sampling confirmed translation/scale/opacity settling, separate from the entrance. These are calibration values, not a requirement to copy its retail layout, fonts, assets or all its effects. Mobile Fitlo inspection was incomplete. Source: https://demo.codeandchill.store/fitlo/#/explore

## Author a short motion score

Before markup changes, name each region’s visual units, role, onset and purpose. For example:

| Region | Units | Role / beat | Purpose |
|---|---|---|---|
| Shell | brand and navigation links | directional nav/topbar, 0ms | establish the frame |
| Hero copy | eyebrow, title lines, paragraph, CTA | content/title, 0ms; bounded sibling stagger | introduce the message |
| Hero art | two portraits, captions, one accent | surfaces, 100ms; accent last | add depth and finish the composition |
| Service options | each complete label/value row | row, 0ms on first visibility | make choices readable together |

Choose personality through this hierarchy and easing, not random variety. Clear ease-out suits content; overshoot is an optional accent. Split headlines only when wrapping and reading order stay correct. Keep a simple card’s contents together when another nested cascade adds no meaning. Explicitly name unchanged/still parts with a reason.

Do not serialize the entire page behind the navigation. Bound the last start delay (the included example caps it at 420ms), and finish the first view within roughly 1–2s. Use the reference and real content to tune these values; they are starting points.

## Optional native implementation

[../assets/choreography.js](../assets/choreography.js) is a small, original WAAPI driver exercised on two production admin layouts. Reuse the app’s existing helper when it can express the score; do not add a second competing driver. Otherwise copy this file into the project and load it before the adapter:

```html
<section data-motion-group data-motion-beat="100">
  <h2 data-motion="title" data-motion-order="0">A clear next step.</h2>
  <p data-motion="content" data-motion-order="1">Supporting information.</p>
</section>
<script src="choreography.js"></script>
<script>
  const entrance = createChoreography(document);
  entrance.refresh();
  // Tag genuine replacement rows, then refresh. Existing units do not replay.
  // entrance.enter(element, 'content', 0) for an explicit local state change.
  // entrance.destroy() on teardown.
</script>
```

Roles: nav, toolbar, title, surface, content, row, accent. data-motion-group defines a sibling sequence; data-motion-beat is its onset in milliseconds; data-motion-order optionally overrides DOM order. Preserve logical DOM reading order and mirror directional travel under RTL. The driver includes first-viewport observation, current-pose retargeting, reduced-motion cancellation, focus reveal and teardown. Closed accordion content must be genuinely visible before it counts as entered. Transform-owning scroll/hover effects need a separate wrapper. It does not implement FLIP, split text, scroll scrubbing or every framework lifecycle for you.

## Two gates, with different conclusions

**Runtime gate:** exercise cold/cached load, below-fold arrival, replacement rows, repeated triggers, keyboard focus during entrance, reduced motion (initial and changed mid-flight), missing JS, phone/tablet/desktop and RTL. Confirm no broken controls, overflow or retained hidden content. Capture intermediate frames and a normal-speed recording. Mutation/negative controls should make relevant assertions fail when direction, scale or staggering is removed. Animation-call count is not a quality score.

**Preference gate:** keep layout/assets/content identical, preserve the old treatment, and give the user Previous / Candidate / Replay at the same viewport. Replay must return to the start. Report the measured differences, ask which feels better, then tune. A technical pass is not permission to call it beautiful, smooth on real devices, or the winning default.

The two-layout study validates implementation portability, not skill efficacy. To claim the instructions improve model outputs, use `reflect` with separately authorized paired runs. Until those and user preference are established, label the example a tested candidate, not a universally superior preset.
