---
name: api-docs-complete
description: Finish an API docblock that already has its happy path — find the status codes the endpoint can ACTUALLY return but that never appear in the handler's body (401 from auth middleware, 429 from a throttle, 403 from an authorization layer, 422 from validation, 500 from the catch-all), and document each with a body captured from a real run rather than invented. Invoke with /api-docs-complete right after annotating a new or changed endpoint, when asked to "finish the API docs" or "check the docs are complete", or before regenerating generated API reference. Tool-agnostic — Scribe, OpenAPI/Swagger annotations, FastAPI, drf-spectacular. Restraint-gated: an endpoint that genuinely only returns 200 and 401 is complete at two responses; never pad with codes it cannot emit.
---

# /api-docs-complete — the responses your first pass didn't write

Writing the `200` is the easy part, and everyone does it. What gets shipped undocumented is everything else — and it is not laziness, it is that **the missing codes are not visible where you'd look for them.**

This skill runs *after* a docblock exists. It does not teach annotation syntax — your codebase already has examples. It finds what the first pass left out.

## Why a linter or grep can't do this for you

Grep the handler for `4\d\d` and you find the codes the method returns *itself*. The ones that actually break clients come from somewhere else entirely:

| Code | Where it really comes from | Why grepping the handler misses it |
|---|---|---|
| `401` | auth middleware on the route/group | It's route config, not method code |
| `429` | a rate-limit / throttle middleware | Same — and usually inherited from a group, so it isn't even on the route line |
| `403` | an authorization layer: policy, guard object, decorator | Thrown a call or two away, often in a shared service |
| `404` | route-model binding, `findOrFail`, "not yours" branches | Framework-thrown before your code runs |
| `422` | schema/request validation | Thrown, never returned — no status literal exists anywhere |
| `500` | the catch-all that flattens unexpected errors | The status is computed, not written |

A static check can enforce *"every endpoint has at least one response"*. It cannot enforce *"this endpoint documents the 429 it inherits from a middleware group three files away"*. That gap is the entire reason to run a checklist.

**Real example:** a careful hand-written pass produced 77 response examples across 12 endpoints — 200/201, 401, 403, 404, 422, 500, and a domain-specific 402. Every endpoint still missed `429`, because the throttle was inherited from a framework-level middleware group and appeared nowhere near the controller. The checklist caught it; the author hadn't.

## The pass

### 1. Read the route definition, not just the handler

Find where the endpoint is *registered*, and read what's wrapped around it:

- **auth middleware** → `401` is reachable. Always.
- **throttle / rate-limit middleware** → `429` is reachable. Check the *group* too, not just the route: throttles are usually inherited and invisible at the route line.
- **route-model binding** (a typed model parameter) → `404` before your code runs.
- **any other middleware** that can short-circuit — maintenance mode, signature verification, tenancy.

### 2. Walk the handler for what it emits directly

List every exit:

- each error-response helper call — note the **status AND any machine-readable error code** it carries. That `error`/`code` key is what clients branch on; a status alone isn't enough.
- each explicit response-with-status construction
- each validation call → a `422`
- each `abort`/`throw`/guard clause
- the final catch → what does it return when something unexpected blows up?

### 3. Follow the calls that can throw

The step that catches what step 2 misses. For every collaborator the handler calls, ask *"can this raise an HTTP status?"*:

- authorization guards / policies → `403`
- domain services raising validation errors → `422`
- anything doing a fetch-or-fail → `404`
- payment, quota or entitlement checks → `402` and friends

If a helper method inside the same class returns a response, its statuses belong on the endpoint too. **This is the most-missed case after middleware** — a handler that delegates "is the wallet short?" to a private helper looks, to any body-scoped search, like it can only return `200`.

### 4. Capture the real bodies — never hand-write them

**Do not invent response JSON.** Envelopes differ per project, per base class, and sometimes per middleware. A wrong example is worse than no example: the client codes against it and fails in production.

Write a throwaway test that hits each case, dump the real response, read it, then delete the test:

```
function dumpShape(label, response):
    print("===== {label} [{response.status}] =====")
    print(pretty_json(response.body))

test "capture shapes":
    dumpShape("401", GET /endpoint)          # before authenticating
    authenticate_as(user)
    dumpShape("200", GET /endpoint)
    dumpShape("422", POST /endpoint, {})     # empty/invalid body
    dumpShape("403", GET /endpoint?target=someone_elses_id)
    # ...one per case found in steps 1-3
```

This routinely catches envelope surprises. Two seen in practice:

- an unauthenticated call returning a **custom** envelope, not the framework default that the existing docblocks all claimed
- a throttled `429` using a **different success key** (`success`) than every other response in the same API (`status`) — so a client checking one field gets `null` on rate-limit

Neither is findable by reading code. Both change how a client must be written.

### 5. Write them, with scenarios

Give each response a scenario label. It matters most where **one status carries several meanings** — a `422` meaning "already subscribed" is a different client branch from a `422` meaning "your input was malformed". Same code, different recovery.

Document a **second success response** whenever the shape meaningfully varies: an empty collection, a "not entitled" state, a branch returning a different object. The client has to handle both, so both belong in the docs.

### 6. Regenerate — and never hand-edit generated output

Run your generator. If the project has more than one doc target (public vs internal, v1 vs v2), pick by **audience**: an endpoint carrying admin-only or privileged actions does not belong in the integrator-facing set. Check the route is actually matched by that target's include rules — an unmatched route is silently absent, not an error.

### 7. Verify the generated output, not just the source

**Do not trust that what you wrote is what got generated.** Annotation blocks are parsed loosely; a malformed one frequently produces *wrong* output rather than an error.

Seen in practice: a bulk edit inserted a new response block one line off, nesting it inside the previous block's scenario string. The generator emitted a duplicate of the earlier status and dropped the new one — silently, exit code 0. It was only caught by diffing the generated status codes before and after.

So after regenerating, read back the **status codes per endpoint** from the generated artifact and confirm they match what you intended:

```
for each endpoint in generated_output:
    print(endpoint.method, endpoint.uri, sorted(unique(r.status for r in endpoint.responses)))
```

Counts alone are not enough — a corrupted block can keep the total steady while changing which codes are present.

## Pair it with a floor check

A checklist is a human pass and doesn't run in CI. If the project can carry one, add a cheap test that fails when an endpoint has **no** response example at all, and when a status the handler *visibly* emits is undocumented. That catches the obvious regressions for everyone, whether or not they run this skill.

Two things worth building into such a test:

- **attribute per endpoint, not across the API.** A union check ("some endpoint documents 402") lets one endpoint's documented status mask a sibling that emits the same status and documented nothing.
- **inline one level of same-class helpers** before scanning for statuses, or the check is blind to exactly the delegation described in step 3.

Keep it honest about its ceiling: it cannot see middleware, guards or validation. Those stay this skill's job.

## Restraint

Some endpoints really are complete at two responses. A public read that can only succeed or fail auth needs `200` + `401` and nothing else. Do not add a `403` to an endpoint with no authorization, or a `422` to one that takes no input. Padding docs with codes the endpoint cannot emit teaches clients to write dead branches, and trains the reader to stop trusting the docs.

## Checklist

- [ ] `401` — behind auth middleware?
- [ ] `429` — any throttle on the route **or its group**?
- [ ] `403` — any policy, guard, or authorization service in the call path?
- [ ] `404` — route-model binding, fetch-or-fail, or a "not found / not yours" branch?
- [ ] `422` — any validation, on the route or raised by a service? One per distinct error code.
- [ ] domain codes (`402`, `409`, `423`…) — every error-response status in the body **and in the helpers it calls**, each with its machine-readable error key
- [ ] `500` — what the catch-all actually returns
- [ ] a second success response per meaningfully different shape
- [ ] every body captured from a real run, not written by hand
- [ ] route matched by the right doc target, docs regenerated
- [ ] generated output read back and status codes verified per endpoint
