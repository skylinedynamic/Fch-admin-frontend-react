# Partner profile › Subscription — "Total Amount" is the whole enrollment, "Installment Balance" the rest (BUG-126)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-126** (E2E-05), second part: the partner's Subscription tab showed **Total Amount $6,696.70** and **Payable Amount $7,696.70** for a $7,696.70 installment plan with $1,000 down, which reads as if the labels were swapped.

The data was right. For an installment plan `EnrollmentService` saves `payable_amount` as the whole enrollment and `total_subscription_amount` as the balance left after the down payment. The column labelled "Total Amount" showed that balance.

The main part (Next Payment Due showed the down payment after it was paid) is fixed in fch-api: `docs/handoff/2026-10-26-installment-next-payment-after-down-payment.md`.

## Solution
Labels only. The data and the API are unchanged.
- **Total Amount:** `payable_amount`, the whole enrollment ($7,696.70).
- **Installment Balance:** `total_subscription_amount`, the balance the installments repay ($6,696.70). It shows "—" for a non-installment plan, where both values are the same. The check compares `enrollment_type` with `ENROLLMENT_TYPE_INSTALLMENT` from `src/config/subscriptionConfig.ts`.

## Files changed
- `src/pages/partners/components/SubscriptionListSection.jsx`: column labels and order; the Installment Balance cell.
- `tests/pages/partners/components/SubscriptionListSection.test.tsx`: new, 2 tests.

## Testing
- **New:**
  - an installment row shows Total Amount $7,696.70 and Installment Balance $6,696.70, with no "Payable Amount" column;
  - a one time row shows Total Amount $6,997.00 and Installment Balance "—".
- Both failed first. `tests/pages/partners`: 53 passed. `npm run typecheck` clean.
- **E2E:** none reads these headings, and a heading change is not a user flow, so none was added.

## Open items
- QA sheet: BUG-126 → Fixed after the stage retest.
