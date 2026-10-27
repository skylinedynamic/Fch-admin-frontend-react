# Upcoming Billings ordered by date, soonest first (BUG-012)

Date: 2026-10-26

## Problem
Owner › Upcoming Billings: sorting the Amount column did not follow the amounts shown, because the API sorted on different columns from the amount each row displays. It was decided the list goes by upcoming billing date, soonest first, and Amount does not sort.

## Solution
- The list loads with `upcoming_billing_date asc` (was `desc`).
- The Amount column is no longer sortable.
- The API puts rows with no date (awaiting a first payment) last (`fch-api` handoff of the same name).

## Files changed
- `src/pages/billing/Billing.jsx`: default `sortOrder` `asc`.
- `src/pages/billing/components/BillingTable.jsx`: Amount column not `sortable`.
- `tests/pages/billing/Billing.list.test.tsx`: `sort` spec, plus a test that Amount does not sort.
- `e2e/sidebar/upcoming-billings/upcoming-billings.spec.ts`: new case for the load sort and Amount.

## Testing
- Vitest `tests/pages/billing`: 2 failed before the change, 7/7 passed after.
- `npm run typecheck`: clean.
- Mock E2E `e2e/sidebar/upcoming-billings`: 15/15 passed.

## Open items
- None.
