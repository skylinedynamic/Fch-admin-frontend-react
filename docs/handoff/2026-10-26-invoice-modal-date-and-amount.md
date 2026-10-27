# Invoices — the details modal shows the invoice's own amount and date (BUG-122)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-122** (OP-INV-08): the details modal for a $1,000 down-payment invoice showed $7,696.70 (the whole enrollment) and 21 Oct; the list and the PDF said $1,000.00 and 20 Oct.

- **Amount:** already fixed in 73dbec0d (14 Oct: the modal uses the invoice's `payment_amount`), on `origin/stage` since 24 Oct, after QA's test on 21 Oct.
- **Date:** the API sent it in the viewer's zone (fixed in fch-api: `toDateOnly`, `docs/handoff/2026-10-26-invoice-date-is-the-stored-date.md`). The modal also parsed the `Y-m-d` string with `new Date()`, which is UTC midnight, so a viewer behind UTC saw the day before.

## Solution
The modal reads the date with `parseDateOnly()` (`src/utils/helper.ts`), which keeps the calendar day in every zone.

## Files changed
- `src/pages/invoices/components/InvoicePreviewModal.jsx`: the date via `parseDateOnly`.
- `tests/pages/invoices/components/InvoicePreviewModal.test.tsx`: +2 tests.

## Testing
- **New:**
  - a down-payment invoice shows $1,000.00 and not $7,696.70 (pins the 14 Oct fix);
  - the date `2026-10-20` shows as "20 Oct 2026" and is read through `parseDateOnly`. That failed first.
  - The test workers are threads sharing one process time zone, so the test cannot switch the browser to Chicago; it holds the modal to the day-safe helper instead.
- `tests/pages/invoices`: 36 passed. `npm run typecheck` clean. E2E (mock) `e2e/sidebar/invoices`: 27 passed.

## Open items
- QA sheet: BUG-122 → Fixed after the stage retest.
