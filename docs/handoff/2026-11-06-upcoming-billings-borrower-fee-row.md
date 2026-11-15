# Upcoming Billings: borrower fee row on the host's list

**Date:** 2026-11-06

## Problem
On Upcoming Billings (`/billing`), the $800 borrower fee a partner owes the host was counted in the client's Outstanding on the **partner's** list. The **host** never saw it.

The API now sends the fee as its own row on the host's list (fch-api `docs/handoff/2026-11-06-upcoming-billings-receivables-and-borrower-fee.md`). The table had to show that row correctly.

## Solution
- `src/config/billingOptions.ts`: `BILLING_ROW_SUBSCRIPTION` / `BILLING_ROW_BORROWER_FEE`. These match fch-api `BillingResource::ROW_*`.
- `BillingTable.jsx`, for a row with `billing_row = borrower_fee`:
  - The Name cell adds "For client: <name>" under the partner.
  - The Status badge uses invoice colours (`INVOICE_STATUS_COLORS`: Unpaid red, Processing amber).
  - A click opens the fee invoice (`/invoices/<fee_invoice_id>`) instead of the client's billing details.
- Other rows are unchanged.

## Files changed
- `src/config/billingOptions.ts`
- `src/pages/billing/components/BillingTable.jsx`
- `tests/pages/billing/Billing.list.test.tsx`: new "borrower fee row" test.
- `e2e/support/live/backend.ts`: `seedUnpaidBorrowerFee()`, which strips artisan's ANSI colours from the seeder output.
- `e2e/sidebar/upcoming-billings/borrower-fee.live.spec.ts` (new).

## Testing
- `Billing.list.test.tsx`: the new test failed first ("For client: Dee Client" not found), then passed. `tests/pages/billing`: 11 passed. `npm run typecheck` is clean.
- Mocked E2E `e2e/sidebar/upcoming-billings/`: 17 passed.
- Live E2E (`E2E_PHP=<php 8.3> E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live e2e/sidebar/upcoming-billings/`): 5/5 passed.
  - The new spec seeds an unpaid fee and searches "E2E Fee Client".
  - The API row is the partner's (`borrower_fee`, Borrower Fee, 800, Unpaid).
  - The table row names the client, and a click opens `/invoices/<id>`.

## Follow-up: details header icon tile
- **Problem:** the header icon tile on Billing Details (`/billing/:id`) was coloured by subscriber type. A partner got `bg-primary`, and because this theme ignores `bg-opacity-10` the tile was solid dark and the dark icon was invisible. A client got green. Subscription Details also coloured its tile by type.
- **Fix:** both pages now use the same light tile as Payment and Invoice details (`bg-gray-subtle bg-opacity-10 text-primary`). The type badge keeps its colour.
- **Files changed:** `src/pages/billing/BillingDetails.jsx`, `src/pages/subscriptions/SubscriptionDetails.tsx`.
- **Tests:**
  - New tile tests in `tests/pages/billing/BillingDetails.finalInstallment.test.tsx` (Partner, Borrower) and `tests/pages/subscriptions/SubscriptionDetails.finalInstallment.test.tsx` (Partner, Borrower, User). All failed first.
  - `tests/pages/billing` + `tests/pages/subscriptions`: 22 passed. Typecheck clean.
  - Live `e2e/sidebar/upcoming-billings/billing-details-header.live.spec.ts`: passed. A partner's and a client's tile have the same computed colours, and the icon colour differs from the tile.

## Open items
- The partner's side was checked through the API (fch-api tests and a local MySQL run). Admin live E2E signs in only as the host.
- Not committed.
