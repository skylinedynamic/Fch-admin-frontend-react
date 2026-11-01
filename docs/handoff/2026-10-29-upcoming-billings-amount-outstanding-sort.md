# Upcoming Billings: Amount and Outstanding sort again (BUG-012, reopened)

Date: 2026-10-29

## Problem
Owner › Upcoming Billings (`/billing`). The first fix for BUG-012 (`2026-10-26-upcoming-billings-date-order.md`) removed the Amount sort instead of fixing it. QA's 28-Oct retest found no sort arrow on AMOUNT, and none on OUTSTANDING, and reopened the bug: Amount should sort as numbers ($1 … $7,999 and back).

## Solution
- The API now sorts both columns on the figure each row shows (fch-api handoff of the same name). The table only had to offer the sort again.
- `BillingTable.jsx`: the Amount and Outstanding columns are `sortable` again. Clicking one sends `sort_field` `upcoming_billing_amount` / `outstanding_amount` with `sort_order` `asc`, and `desc` on the second click, through the existing `onSort`.
- The list still loads by upcoming billing date, soonest first.

## Files changed
- `src/pages/billing/components/BillingTable.jsx`: `sortable` on Amount and Outstanding.

## Testing
- Updated `tests/pages/billing/Billing.list.test.tsx`: "offers no sort on the Amount column" is replaced by "Amount / Outstanding sorts ascending, then descending". It checks the header is sortable and that the request carries the field and order on each click. Both cases failed first (no `p-sortable-column`), then passed. File: 8/8.
- Updated E2E `e2e/sidebar/upcoming-billings/upcoming-billings.spec.ts`: the BUG-012 case now checks only the default date sort; two new cases click Amount and Outstanding twice in a real browser and check the requests. Mock project: 17/17 passed. The E2E cases were not run against the old code first.
- `npm run typecheck`: clean.

## Open items
- The order itself is the API's. It is covered by fch-api's `UpcomingBillingSortTest`, not by a real-API E2E here.
- Retest BUG-012 on stage after both repos deploy; the sheet's status is still "Reopened".
