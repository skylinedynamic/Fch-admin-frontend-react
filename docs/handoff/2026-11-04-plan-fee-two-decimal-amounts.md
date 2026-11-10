# Plan & Fee: amounts take at most 2 decimal places (BUG-076)

**Date:** 2026-11-04
**Branch:** bugfix/round-2

## Problem
In Plan & Fee › Borrower Enrollment, a Total Amount of `10.555` reached the "Confirm Rate Changes" dialog.
- The dialog showed `$10.55`, from `toFixed(2)` on `10.5549…`.
- The API would have saved `10.56`.
- No field error was shown.

## Solution
- **API:** fch-api refuses an amount or platform fee with more than 2 decimal places (`decimal:0,2`; see the fch-api handoff with the same name). The refusal is a 422 keyed to the field, and the screen shows it under that field (BUG-096).
- **Input (user request, "10.22-er beshi parbe na"):**
  - The Total Amount and Platform Fee boxes do not take a 3rd digit after the decimal point. Typing `10.555` leaves `10.55`, and `10.55` is what is checked and confirmed.
  - `handleInputChange` ignores the change when `hasMoreDecimalsThan(value, PLAN_AMOUNT_DECIMAL_PLACES)`.
  - The limit and the fields it applies to are constants in `src/config/subscriptionConfig.ts` (`PLAN_AMOUNT_DECIMAL_PLACES = 2`, `PLAN_AMOUNT_FIELDS`).
  - Server-side format checks remain the rule. This is an input mask on top of the API rule, added because the user asked for it.

## Files changed
- `src/utils/amountInput.ts`: new; `hasMoreDecimalsThan(value, places)`.
- `src/config/subscriptionConfig.ts`: `PLAN_AMOUNT_DECIMAL_PLACES`, `PLAN_AMOUNT_FIELDS`.
- `src/pages/plan-fee/PlanFee.tsx`: amount and platform fee changes past 2 decimals are not taken.
- `tests/utils/amountInput.test.ts`: new.
- `tests/pages/plan-fee/PlanFee.test.tsx`: 3 new cases.
- `e2e/sidebar/plan-fee/plan-fee.spec.ts`: 2 new cases.

## Testing
- **Unit:** `tests/utils/amountInput.test.ts`. Values that fit 2 places (`''`, `10`, `10.`, `10.22`, `.55`) pass; values that do not (`10.222`, `0.001`, `1.0000`) are caught; other place counts work. It failed first, because the module did not exist.
- **Integration:** `PlanFee.test.tsx`, run before the fix to watch the new cases fail.
  - Total Amount: typing `10.555` gives `10.55`, the check is sent `10.55`, and the dialog shows `$10.55`. This failed first.
  - Platform fee: typing `1.005` leaves `1.00`. This failed first.
  - The API's 2-decimal refusal still shows under the field, with no confirmation.
- **Results:**
  - Vitest (`tests/utils/amountInput.test.ts`, `tests/pages/plan-fee`, `tests/modules/subscription-plan`): 36 passed.
  - `npm run typecheck`: clean.
- **E2E (mock):** `e2e/sidebar/plan-fee/plan-fee.spec.ts`, 20 passed.
  - Total Amount, typed key by key: `10.555` stays `10.55` and is confirmed as `$10.55`.
  - Platform fee: `1.005` stays `1.00`.

## Open items
- **Pasting:** a paste of `10.555` is not taken at all; the box keeps its value.
- **Live spec, Borrower Fee tab:** `plan-fee.live.spec.ts › shows the plan tabs` fails because fch-api's `SubscriptionPlan::active()` does not return the local `borrower_fee` plan, so the tab is not offered. This comes from local data, not from this change.
