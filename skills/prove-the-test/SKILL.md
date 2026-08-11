---
name: prove-the-test
description: Before trusting a test you just wrote, break the thing it guards and confirm it actually fails. Catches tests that pass no matter what — a wrong assertion API, an assertion that cannot observe the thing, a path the test never reaches. Invoke with /prove-the-test after writing or changing a regression test, or when the user asks "is that test actually testing anything / would it catch it / does it fail without the fix". Runs on tests you or someone else just wrote; it does NOT audit a whole suite. Restraint-gated: one targeted revert per test, not a mutation-testing campaign.
---

A passing test proves nothing on its own. It passes when the code is right, and it *also* passes
when the assertion is pointed at the wrong thing, when the framework read your failure message as
an expected value, when the branch under test is never reached, or when the value would have been
there regardless. Every one of those looks exactly like success.

So don't trust a new test until you've watched it fail.

## The move

For each test that guards a specific change:

1. **Revert the production code it guards** — just that, in place. The one line, the one condition,
   the one flag. Not a stash of everything.
2. **Run only that test.** It must fail.
3. **Read the failure.** It must fail *for the stated reason*, at the assertion you care about. A
   test that fails with a fatal, a missing key, or a setup error is not proving what you think.
4. **Restore the code**, and confirm the test passes again.

If it passes at step 2, the test is decorative. Fix the test — that is the finding.

## When to apply it

Every test written to pin a bug fix or a behavioral guarantee. That is the case where "it passes"
is most likely to be an illusion, because the code is *already correct* when the test first runs —
you never see red unless you make it.

Skip it for tests whose failure you have already seen naturally (you wrote the test first, or it
caught something on the way in). Skip it for pure scaffolding.

## What it typically catches

- **Assertion-API misuse.** A helper whose second argument is an expected *value*, not a message.
  A `null` assertion that resolves through a getter answering `null` for absent keys just as
  readily as for present-and-null ones. Both pass against nothing at all.
- **Boundary tests decided by something other than the code** — an unfrozen clock, ordering, a
  random seed. These pass, then flake later. If a test needs a revert to fail *sometimes*, it is
  already flaky; find the hidden input and pin it.
- **Unreachable branches.** The fallback you are testing cannot be triggered through the path the
  test uses, so the test exercises the happy path and reports green.
- **Tests that assert a value the setup guarantees** regardless of the code under test.

## Restraint

This is one targeted revert per test, taking seconds. It is not mutation testing, and it is not an
audit of an existing suite — do not go reverting production code across a repo to score old tests.
If a test is expensive or impossible to falsify this way, say so and move on rather than
contorting the code to force red.

## Reporting

State it plainly and briefly: which test, what you reverted, that it failed, that it passed on
restore. One line each. If a test failed to fail, that is the headline — lead with it, say what
made it vacuous, and show the fixed assertion.
