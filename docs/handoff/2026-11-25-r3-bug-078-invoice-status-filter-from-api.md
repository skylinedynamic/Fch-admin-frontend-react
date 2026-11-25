# R3-BUG-078: The Invoices Status filter offers the API's statuses

2026-11-25

## Problem
The admin and partner Invoices › "All Status" offered a list kept in this app (`INVOICE_STATUS_OPTIONS`, from BUG-021). The client portal offered a different one, with Overdue. Neither matched what the API actually writes to an invoice. (QA Round 3, R3-BUG-078, raised on the client portal.)

## Solution
- `POST common/invoices/fetch-invoices` now sends `status_options`: fch-api `Invoice::STATUSES`, which is Paid, Unpaid, Processing and Expired. The client list sends the same list. See `fch-api/docs/handoff/2026-11-25-r3-bug-078-invoice-status-options.md`.
- `Invoices.jsx` keeps those options and passes them to the filter row and to the table's column filter.
- `invoiceStatusFilterOptions()` puts "All Status" in front. `INVOICE_STATUS_OPTIONS` is removed.
- So Pending, Success, Failed, Disputed and Canceled are no longer offered: no invoice is given them.

## Files changed
- `src/config/invoiceConfig.ts`: `INVOICE_STATUS_OPTIONS` replaced by `invoiceStatusFilterOptions()` and `InvoiceStatusOption`.
- `src/pages/invoices/Invoices.jsx`: keeps `status_options` and passes it down.
- `src/pages/invoices/components/InvoiceFilters.jsx`, `InvoiceTable.jsx`: options from the prop.
- `tests/pages/invoices/Invoices.statusFilter.test.tsx`: the list mock sends `status_options`, and the filter offers exactly All Status plus those. It was updated from BUG-021's "offers Expired and Canceled".
- `tests/config/invoiceConfig.test.ts`: the options test now checks `invoiceStatusFilterOptions()`. The Canceled spelling and the badge colours are still checked.
- `e2e/sidebar/invoices/invoices.spec.ts`: the mock list sends `status_options`, and the status-filter spec expects exactly those.

## Testing
- The updated tests failed first: the old list, and no helper. They pass now.
- `tests/pages/invoices`, `tests/config` and `tests/modules/invoice`: 124 passed.
- `npm run typecheck`: clean.
- Playwright mock, `invoices.spec.ts`: 17 passed (after `npm run build`).

## Open items
- Not retested on admin-stage yet.
