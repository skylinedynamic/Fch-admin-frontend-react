# BUG-187: Current / Recent Bill card shows the invoice's own date

**Date:** 2026-11-11
**Branch:** round-1-run-2-fix
**Author:** Awlad Hossain

## Problem
On My Subscription › CURRENT / RECENT BILL (partner portal), INV-20261020008 showed `Date: 2026-10-21`, while the invoice itself says 2026-10-20. The API shifted the invoice timestamp into the viewer's timezone (Dhaka, UTC+6) for the card only. QA reopened BUG-187 on 10-Nov-26 for this one point.

## Solution
The fix is in `fch-api`: `recent_bill.created_at` now uses `toDateOnly()`, the same as the invoice. See `fch-api/docs/handoff/2026-11-11-bug-187-recent-bill-date.md`. No code in this app changed. The card renders the API string, and the new tests pin that.

## Files changed
- `tests/pages/my-subscription/MySubscription.test.tsx`: new test. The card shows `Date: 2026-10-20` exactly as the API sends it.
- `e2e/topbar/my-subscription/my-subscription.spec.ts`: new mocked-API test, run with the browser in `Asia/Dhaka`.

## Tests
- `npx vitest run tests/pages/my-subscription`: 24 passed (2 files).
- `npm run typecheck`: clean.
- `npx playwright test e2e/topbar/my-subscription/my-subscription.spec.ts`: **failing, and not because of this change.** The app does not compile. `src/pages/partners/PartnerProfile.jsx:27` imports `'../../modules/acc0ount'` (a typo for `account`), committed in `fbb91ef3`. Every test in the spec fails at the Vite error overlay, the same with or without this change (9 failed when this change was stashed).

## Open / follow-up
- Fix the `acc0ount` import in `PartnerProfile.jsx`, then rerun the My Subscription E2E spec.
