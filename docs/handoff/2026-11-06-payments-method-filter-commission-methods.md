# Payments Method filter: commission payout methods

**Date:** 2026-11-06

## Problem
A commission payout is recorded with the method picked in the payout dialog (`COMMISSION_PAYMENT`: Card, Cash, Cheque, Paypal, Stripe, Apple Pay, Google Pay). The payment's `payment_from` is that method (`CommissionPayoutService`). The Payments **Method** filter offered only the gateway methods (Stripe, Bank Transfer, Square, Ecrypt, Authorize.Net, Cash Payment), so a commission paid by Cash or Cheque could not be filtered.

## Solution
`PAYMENT_METHOD_OPTIONS` (`src/config/paymentConfig.ts`) now appends `COMMISSION_PAYMENT` from `statusOptions.ts`, leaving out Stripe because it is already listed. The payout dialog's list stays the single source, so a method added there appears in the filter too. No API change: the common payment list already filters `payment_from` by exact value. The Invoices pages have no Method filter, and none was added (the user decided Payments only).

## Files changed
- `src/config/paymentConfig.ts`: commission methods added to `PAYMENT_METHOD_OPTIONS` (imports `COMMISSION_PAYMENT`).
- `tests/config/paymentConfig.test.ts` (new).

## Testing
- `tests/config/paymentConfig.test.ts`: 3 tests. They check that every commission method is offered, that the gateways and "All Methods" come first, and that no method is listed twice. Red first ("offers every commission payout method" failed), then green.
- `tests/config`, `tests/pages/payments` and `tests/pages/commissions`: 71 passed. `npm run typecheck` is clean.
- No admin E2E run. The admin suite needs a build and the `E2E_BASE_URL` override.

## Open items
- `PaymentFilters.jsx` Dropdowns still lack `optionValue`, so "All ..." sends the option object. This works only because `FCH\Common\PaymentService::extractFilterValue` unwraps it. The client portal was fixed the same day.
- 'Cash' (commission) and 'Cash Payment' (gateway) are different stored values, so both appear in the list.
