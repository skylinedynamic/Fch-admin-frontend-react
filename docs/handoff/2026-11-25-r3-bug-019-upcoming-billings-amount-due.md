# R3-BUG-019: Upcoming Billings says "Amount Due", not "Outstanding"

2026-11-25

## Problem
Upcoming Billings (`/billing`): the OUTSTANDING column, and the Outstanding card, were read as what is left on an installment plan.
- Awlad Hossain, sub 72: total $7,696.70, 1 of 11 installments paid. It showed $699.70, where QA expected $6,997.00.

The figure is fch-api `BillingResource::owed()`: the invoices raised and still unpaid. That was designed so (BUG-126 and the 2026-10-29 / 11-06 handoffs). A plan's later installments are not invoiced yet, so they are not in it. QA asked for a product decision. (QA Round 3, R3-BUG-019, Low / P3.)

## Solution
Decision (2026-11-25, option ক): keep the figure and rename it.
- The column is now **Amount Due**. Its title carries the hint "Unpaid invoices raised so far. Installments not billed yet are not included.".
- The stats card is now **Amount Due** as well, since it is the same total.
- The label and the hint are constants in `src/config/billingOptions.ts`: `BILLING_AMOUNT_DUE_LABEL` and `BILLING_AMOUNT_DUE_HINT`.
- Not changed: the API fields (`outstanding_amount`, `outstanding_total`) and the sort.

## Files changed
- `src/config/billingOptions.ts`: `BILLING_AMOUNT_DUE_LABEL`, `BILLING_AMOUNT_DUE_HINT`.
- `src/pages/billing/components/BillingTable.jsx`: the column header and its hint.
- `src/pages/billing/components/BillingStats.jsx`: the card title.
- `tests/pages/billing/Billing.list.test.tsx`:
  - new test: the column and the card say Amount Due, the column has the hint, and nothing says "Outstanding";
  - the BUG-012 sort test now names the column Amount Due.
- `e2e/sidebar/upcoming-billings/upcoming-billings.spec.ts`:
  - the sort spec names the column Amount Due;
  - the header is matched by its exact title, so "Amount" does not also match "Amount Due".

## Testing
- The new test and the renamed sort test failed first. Both pass now.
- `tests/pages/billing` and `tests/config`: 55 passed.
- `npm run typecheck`: clean.
- Playwright mock, `e2e/sidebar/upcoming-billings`: 17 passed (after `npm run build`).

## Open items
- If the plan's remaining balance is wanted on the list later, it would be a new column (option খ), with the figure from the API.
- Not retested on admin-stage yet.
