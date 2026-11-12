# Data for visuals — what the backend must send so the screen can be a picture

A page turns into a block of text when the API returns raw entity rows and the client has to guess
meaning. Before building a screen, list each device from [screen-patterns.md](screen-patterns.md)
and the fields it needs, then propose the backend change (Laravel resource / endpoint) alongside
the UI. This is a suggestion to the user, not a silent backend edit.

## Rules

1. **The server decides meaning.** Send `severity` (`ok|warn|bad`), `payment_state`,
   `is_late`, `behind` — enums, not thresholds the client recomputes. The client maps enum → token.
2. **The server decides what's next.** `next_action {label_key, transition, amount?}` and
   `allowed_transitions[]`. The primary button and stage drag read these; the client never encodes
   the workflow.
3. **Status has history.** `status_history [{status, entered_at, by}]` feeds the stepper's dates.
   A bare `status` column only draws "current". **Our own records only:** never fill a stepper's
   state, captions or dates from a third-party feed (carrier/provider tracking, webhook payloads,
   free-text event logs). Those differ per provider in order, wording and duplicates, and can
   contradict our status. Show them as-is in their own timeline, labelled by source; if the product
   needs them to move a stage, the backend normalises them into our status history first. (the reference app
   !3969 captioned the current stage with "the newest carrier event" assuming newest-first arrays —
   wrong for several providers.)
4. **Every list has a summary.** One aggregate per list screen: `counts_by_stage`,
   `value_by_stage`, `below_par_count`, `outstanding_total` — feeds key figures, ribbons, tab and
   chip counts in one call. Respect the active filters.
5. **Quantities come with their target.** `on_hand` + `par_level` (+ `capacity`), `paid_total` +
   `balance_due`, `progress_pct` + `behind`. A number without its comparison can't become a meter.
6. **Time comes as instants the client can phrase.** `runs_out_at`, `valid_until`, `eta`,
   `ship_by` (ISO, server-computed from usage/plan); the client renders words in the locale.
7. **Series for sparklines are fixed-length.** `series [{date, value}]` for 7/14/30 days, zero-filled,
   plus the previous-period series when the chart compares.
8. **Lists carry their row summary.** `first_item_name` + `extra_item_count`, `owner {initials, tint}`,
   thumbnails with sizes — so a row never needs a second request.
9. **Mutations return the recomputed view.** A count change, receive or stage move returns the
   updated row **and** the summary, so the header re-counts without a refetch. Undo needs the
   previous value or a revert endpoint.
10. **Money is minor units + currency**, formatted by the client (`Intl.NumberFormat` /
    `NumberFormat`), one numbering system per screen.

## Output when building a screen

Give the user a short table before or with the UI:

| Device | Fields | Exists? | Backend change |
| --- | --- | --- | --- |
| Stage stepper | `stages[]`, `current_index`, `status_history[]` | status only | add history relation to `OrderResource` |

Mark what already exists (check the resource/controller), and keep the change minimal — one
aggregate endpoint or resource field, not a new service layer.
