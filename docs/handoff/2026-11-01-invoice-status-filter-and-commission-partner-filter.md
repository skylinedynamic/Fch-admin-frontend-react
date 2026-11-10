# Invoices status filter matches real statuses; Commissions partner filter verified (BUG-021, BUG-022, round 2)

**Date:** 2026-11-01
**Branch:** bugfix/round-2

## Problem
**BUG-021** (R2-OP-INV-05, Medium/P3), Owner › Invoices: QA expected unpaid invoices to turn "Overdue" after a due date. The Status filter offered Overdue, and it always returned nothing. "Expired" (e.g. INV-20260719003) was not in the filter.

Under the billing model, no invoice is ever Overdue. An unpaid invoice leaves `subscription_end_date` where it is, so the profile locks once today passes it (`isSubscriptionRestricted()`). A late payment starts the next month from the payment date (`SubscriptionService::nextCycleFrom()`). So the request for a due date and an Overdue status is "by design". The filter itself was wrong in three ways:
- It offered `Overdue`, which nothing sets (only `InvoiceSeeder`).
- It had no `Expired`. fch-api stopped writing Expired on 2026-10-11 (commit `a87d3fff`), but older invoices carry it (5 in the local DB).
- It spelt `Cancelled`. The API's `Invoice::STATUS_CANCELED` is `Canceled`, so that option could never match.

**BUG-022** (R2-OP-COMM-05, Medium/P2), Owner › Commissions: "Select Partner" listed only the 10 newest partners, so Wanda could not be found. QA logged it on 21 October. It was fixed after that:
- fch-api `POST /common/get-all-partners` (21 October) returns every partner.
- `CommissionList.tsx` uses `usePartnerOptions()` (`5f24cbd0`, 28 October).
- Round 1 BUG-073 (sort gives a 500) was fixed on 24 October (`6c749811`).

All of these are on `stage` and `master`.

## Solution
- `src/config/invoiceConfig.ts`: removed `STATUS_OVERDUE`. Added `STATUS_EXPIRED` (kept for older invoices, per product decision). Renamed `STATUS_CANCELLED` to `STATUS_CANCELED = 'Canceled'`. Updated the options and badge colours to match.
- `src/modules/invoice/types.ts`: the `status` union now lists the statuses the API stores.
- BUG-022: no code change. Added the missing test that a partner found past the first ten actually filters the list.
- fch-api: comments only, so they no longer say a missed cycle still creates an Expired invoice (see the fch-api handoff with the same date).

## Files changed
- `src/config/invoiceConfig.ts`: invoice status options and colours.
- `src/modules/invoice/types.ts`: invoice status type.
- `tests/config/invoiceConfig.test.ts` (new): the options are the API's statuses.
- `tests/pages/invoices/Invoices.statusFilter.test.tsx` (new): the filter lists Expired and Canceled but not Overdue, sends Expired, and shows a coloured badge for it.
- `tests/pages/commissions/CommissionList.partnerFilter.test.tsx`: picking partner 12 of 12 (found by name) sends `partner_id`.
- `e2e/sidebar/invoices/invoices.spec.ts`: status filter options and the request it sends.
- `e2e/partner-filter-options.spec.ts`: the seeded user now has `view verification request`. The route has been guarded since 2026-10-25, so the Verification Center cases had timed out since then. That failure was there before this change.

## Testing
- New tests failed before the fix (7 of 7), then passed.
- Vitest invoices, commissions and partner suites: 13 files, 69 tests passed. Billing, dashboard and invoice module suites: 78 tests passed.
- `npm run typecheck`: clean.
- Playwright (mock, after `npm run build`): invoices, commissions and partner-filter-options, 53 passed.
- fch-api PHPUnit: `PartnerOptionsApiTest` and `tests/Feature/Commission` 35 passed, `tests/Feature/Subscription` and `tests/Feature/Invoice` 23 passed.
- Local DB: `PartnerService::options()` returns 24 of 24 partners.

## Open items
- Defect log: mark BUG-021 as "by design" for due date, Overdue and the dashboard alert, and "fixed" for the filter. Mark BUG-022 for retest on stage (fixed after the 21 October run).
- The fch-api invoice stats still count `Overdue` in `unpaid_amount` (`InvoiceService.php`). It's harmless, since nothing has that status, and was left as is.
