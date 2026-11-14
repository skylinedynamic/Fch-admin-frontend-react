# BUG-202: Pay Now only for users holding "Pay Invoice"

**Date:** 2026-11-07

## Problem
Pay Now showed on a partner's unpaid invoices for anyone who was not the host (`InvoiceDetails.jsx`, `InvoiceTable.jsx`), including staff the API refused. Their payment failed with 400 "Unauthorized invoice payment attempt.".

## Solution
- The API now lets the partner's staff pay the partner's own invoices. It also records `paid_by`, `approved_by` and `rejected_by` (fch-api `docs/handoff/2026-11-07-bug-202-staff-pay-invoice-and-payer-tracking.md`).
- The new permission "Pay Invoice" is checked in the panel only. Pay Now (details page and list) needs `hasPermission('Pay Invoice')`, on top of the existing rules (unpaid, not host, partner invoice).
- The name is written inline, as decided (no config constant).
- Every static Admin role and its users got the permission from the seeder, so owners keep Pay Now.

## Files changed
- `src/pages/invoices/InvoiceDetails.jsx`: Pay Now needs "Pay Invoice" (`usePermissions`).
- `src/pages/invoices/components/InvoiceTable.jsx`: same, for the row's Pay Now.
- `tests/pages/invoices/InvoiceDetails.test.tsx`:
  - the partner Pay Now tests sign in with "Pay Invoice"
  - new: no Pay Now without it
- `tests/pages/invoices/components/InvoiceTable.test.tsx`:
  - the payment flow signs in with "Pay Invoice"
  - new: Pay Now with and without it
- `e2e/sidebar/invoices/invoice-payment.spec.ts`:
  - the `PARTNER` session holds "Pay Invoice"
  - new: a staff user without it sees no Pay Now

## Testing
- **Vitest:** the 2 new "without Pay Invoice" tests failed first, then passed. `tests/pages/invoices`: 68 passed. Full suite: 2760 passed, 2 expected fail (379 files).
- `npm run typecheck`: clean.
- **Playwright `e2e/sidebar/invoices/`:** 36 passed. The mock payment specs failed until their partner session held "Pay Invoice".
- **Live (probe against the real API, temporary staff user of partner 41):** Pay Now showed with the permission, and a cash payment went through (200). Without the permission, no Pay Now. The data was removed afterwards.

## Open items
- The payment modal opened straight after buying a paid seat (`users/UserDetails.jsx`, `employees/EmployeeDetails.jsx`) is not gated by the permission.
- Paid by / approved by are not shown on the invoice or payment pages yet.
- Not committed.
