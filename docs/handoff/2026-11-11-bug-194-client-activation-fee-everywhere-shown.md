# BUG-194 retest: My Subscription, Subscription Details and the Invoices type filter say "Client Activation Fee"

**Date:** 2026-11-11
**Branch:** round-1-run-2-fix

## Problem
QA Round 1 Run 2, BUG-194 retest on 10-Nov: **Partially Fixed**. Partner > My Subscription > Recent Payments History still showed INVOICE TYPE "Borrower Fee" for the $800 fee.

The page turned the API's stored type (`borrower_fee`) into a name with `INVOICE_TYPE_OPTIONS` in `src/config/invoiceConfig.ts`, which still said "Borrower Fee". The same list fed the Invoices "All Types" dropdown. Subscription Details had a hard-coded "Borrower Fee" heading (fch-api open item O85).

## Solution
The name comes from the API. The stored type is unchanged and is still what filters send.
- **My Subscription:** the INVOICE TYPE column shows the API's new `invoice_type_label`, or "-" when it is empty. It no longer turns the code into a name on its own.
- **`src/config/invoiceConfig.ts`:**
  - New constant `INVOICE_TYPE_BORROWER_FEE_LABEL = 'Client Activation Fee'`.
  - The type dropdown option uses it. Its value stays `borrower_fee`, so the filter request is unchanged.
- **Subscription Details:** the fee heading uses `INVOICE_TYPE_BORROWER_FEE_LABEL`. The amount still comes from `borrower_fee_amount`.

## Files changed
- `src/config/invoiceConfig.ts`: `INVOICE_TYPE_BORROWER_FEE_LABEL`; option label
- `src/pages/my-subscription/MySubscription.tsx`: `invoice_type_label` on the row type; column shows it; unused `INVOICE_TYPE_OPTIONS` import removed
- `src/pages/subscriptions/SubscriptionDetails.tsx`: heading from the constant
- Tests:
  - `tests/pages/my-subscription/MySubscription.test.tsx`
  - `tests/pages/invoices/Invoices.typeFilter.test.tsx`
  - `tests/pages/subscriptions/SubscriptionDetails.finalInstallment.test.tsx`
  - Fixtures now use the API's name: `tests/pages/billing/Billing.list.test.tsx`, `tests/pages/invoices/components/InvoiceTable.test.tsx`, `tests/pages/invoices/components/InvoicePreviewModal.test.tsx`, `tests/pages/invoices/InvoiceDetails.test.tsx`
- E2E:
  - `e2e/topbar/my-subscription/my-subscription.spec.ts`: new mocked test
  - `e2e/sidebar/invoices/invoices-filters.live.spec.ts`, `e2e/sidebar/upcoming-billings/borrower-fee.live.spec.ts`: new name

## Testing
New tests were written first and failed (5 failed), then passed:
- **My Subscription:** shows the API's name for each payment. The borrower fee reads "Client Activation Fee" and never "Borrower Fee". An empty name shows "-".
- **Invoices type filter:** offers "Client Activation Fee", and picking it sends `type: 'borrower_fee'`.
- **Subscription Details:** the fee heading is "Client Activation Fee".

Results:
- Affected Vitest suites (my-subscription, invoices, subscriptions, billing, config): 26 files, 145 passed. Full Vitest run: 409 files, 3053 passed (2 expected fail).
- `npm run typecheck` clean.
- Playwright mock (after `npm run build`, `--workers=1`): `e2e/topbar/my-subscription/my-subscription.spec.ts`, 9 passed.
- Playwright live (local fch-api, `E2E_BACKEND_PATH=../fch-api`): `invoices-filters.live.spec.ts` + `upcoming-billings/borrower-fee.live.spec.ts`, 5 passed.
- API side: `fch-api/docs/handoff/2026-11-11-bug-194-client-activation-fee-everywhere-shown.md`.

## Open items
- Deploy together with the fch-api change. Without it, My Subscription shows "-" for the type, because the API doesn't send `invoice_type_label` yet.
- `e2e/sidebar/plan-fee/plan-fee.live.spec.ts` still looks for a `/Borrower Fee/` Plan & Fee tab name, which the local API's plan group still provides. It passed here (2 passed) and was not changed.
