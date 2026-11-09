# BUG-049: show the adjusted last installment

**Date:** 2026-11-03

## Problem
The API now bills an installment plan's last installment at balance − monthly × (months − 1), so the plan totals exactly (see fch-api `docs/handoff/2026-11-03-bug-049-final-installment-adjusted.md`). Subscriptions › details, the subscriber's Billing Details and the partner's My Subscription showed only the monthly amount. My Subscription did not show the installment at all.

## Solution
- **Subscriptions › details** (`/subscriptions/:id`, the host's Subscriptions menu): shows **Last Installment** after "Monthly Installment" while the plan is being paid. It is hidden once the plan is paid off, and on an even split.
- **Billing Details** (`/billing/:id`): shows **Last Installment** beside "Monthly Installment" when the API sends `subscription.final_installment_amount`. That field is null on an even split.
- **My Subscription:** on an installment plan, shows **Monthly Installment** and, when adjusted, **Last Installment**.
- **Note:** every page explains the difference with "The last payment differs by a few cents from the monthly amount so that all payments add up to exactly the plan total."

## Files changed
- `src/config/subscriptionConfig.ts`: `FINAL_INSTALLMENT_NOTE`.
- `src/pages/subscriptions/SubscriptionDetails.tsx`: the type and the Last Installment field.
- `src/pages/billing/BillingDetails.jsx`: the Last Installment field.
- `src/pages/my-subscription/MySubscription.tsx`: the type, plus the Monthly and Last Installment fields.

## Testing
- **New:**
  - `tests/pages/subscriptions/SubscriptionDetails.finalInstallment.test.tsx` (3): shown, even split, paid off.
  - `tests/pages/billing/BillingDetails.finalInstallment.test.tsx` (2).
- **Added:** 2 tests to `tests/pages/my-subscription/MySubscription.test.tsx`.
- All of them failed first.
- **Vitest full suite:** 346 files, 2452 tests passed, 2 expected failures. `npm run typecheck`: clean.

## Open items
- None.
