# My Subscription: remove the default payment method

**Date:** 2026-10-13
**Branch:** bugfix-awlad
**Author:** Awlad Hossain

## Problem
- **No way to take a method off.** On My Subscription a partner could change its default payment method but not remove it, so a saved card was always auto-charged.
- **Wrong display with no default.** The card fell back to "Stripe / Sandbox Card" even when no default was set.

## Solution
- **New service.** `removeMySubscriptionDefaultPaymentMethod()` in `modules/my-subscription/services.ts` posts to `/common/my-subscription/remove-default-payment-method` (fch-api F110).
- **Remove button.** The Default Payment Gateway card has a "Remove" button next to "Change", shown only when a default is set. It opens a warning modal: invoices will not be charged automatically and must be paid manually until a default is set again, and payments already made are not affected. On confirm the page reloads the details.
- **Empty state.** With no default, the card reads "No default payment method" and the page no longer falls back to Stripe or Sandbox Card.

**Access, no change needed.** My Subscription is the partner owner's only. `NonHostPartnerRoute` and the header link already require a non-host `Partner` login. fch-api F109 now enforces the same rule on the API.

## Files changed
- `src/modules/my-subscription/services.ts`: `removeMySubscriptionDefaultPaymentMethod()`
- `src/pages/my-subscription/MySubscription.tsx`: Remove button, empty state, confirmation modal

## Tests
- **Added:** `tests/pages/my-subscription/MySubscription.removeDefault.test.tsx`, the real page with MSW and a synchronous Bootstrap modal fake. It checks two cases:
  - remove → warning → one call → "No default payment method", with no Remove button left;
  - with no default set: no Stripe/Sandbox fallback and no Remove button.
- **Updated:**
  - `tests/modules/my-subscription/services.test.ts`: the remove route.
  - `tests/lib/auth/NonHostPartnerRoute.test.tsx`: an Employee (staff) login is redirected. This is a characterisation of the existing guard.
- The new page and service tests failed first, then passed.
- The page test waits up to 5s, because a full parallel run can be slower than `findBy`'s 1s default.
- **E2E:** none. There is no My Subscription Playwright spec, so the flow is covered at page level.
- **Run:** `npm test` passed (112 files, 665 tests). `npm run typecheck` is clean.

## Open / follow-up
Deploy with fch-api (F109/F110) and borrower-fch.
