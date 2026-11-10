# Invoices list: Type filter

**Date:** 2026-11-06

## Problem
The Invoices list (host and partner portals) could be filtered by payer, status and date, but not by invoice type (enrollment, installment, commission payout, ...). Requested together with the BUG-178 fix.

## Solution
- `src/config/invoiceConfig.ts`: `INVOICE_TYPE_*` constants with the API's stored values (fch-api `Invoice::INVOICE_TYPES`), plus `INVOICE_TYPE_OPTIONS`, which starts with "All Types" (`null`).
- `InvoiceFilters.jsx`: a Type dropdown with `optionValue="value"`, so "All Types" sends `null`. The xxl column widths were rebalanced from 3/3/2/2/2 to 2/2/2/2/2/2, and the loader skeleton was updated to match.
- `Invoices.jsx`: `selectedType` / `appliedType` state. `type` is sent in the fetch-invoices payload, applied with Filters and reset by Clear.
- API: `type` is validated and applied by fch-api (see its BUG-178 handoff).

## Files changed
- `src/config/invoiceConfig.ts`
- `src/pages/invoices/components/InvoiceFilters.jsx`
- `src/pages/invoices/Invoices.jsx`
- `tests/pages/invoices/Invoices.typeFilter.test.tsx` (new)
- `e2e/sidebar/invoices/invoices-filters.live.spec.ts` (new): live checks for Type, Borrower Only and Partner Only.

## Testing
- `Invoices.typeFilter.test.tsx`, 2 tests: every type is offered; the picked type is sent (`commission_payout`), and "All Types" sends `null`. Red first (both failed), then green.
- `tests/pages/invoices` and `tests/config`: 95 passed. `npm run typecheck` is clean. Full Vitest: 378 files, 2740 passed (2 expected fail).
- Live E2E (`E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live e2e/sidebar/invoices/`): 7/7 passed against the local API and DB.

## Open items
- `INVOICE_TYPE_*` here duplicates fch-api's `Invoice::INVOICE_TYPES`. A new type has to be added in both places.
