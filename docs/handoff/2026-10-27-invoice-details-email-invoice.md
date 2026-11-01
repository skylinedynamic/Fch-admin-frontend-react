# Invoice details page can e-mail an unpaid invoice (BUG-091)

Date: 2026-10-27

## Problem
Admin › Invoices › an unpaid invoice › its details page had only Download PDF, with no way to send the invoice by e-mail. The list's preview (PDF icon) already had "E-Mail Invoice", but QA looked on the details page.

## Solution
The details page shows an "E-Mail Invoice" button next to Download PDF. It appears for the host, on an invoice that is unpaid (not Paid and not Processing). It calls the same `POST /common/invoices/{id}/send` as the preview and reports success, or the API's message on failure. Partners do not get it; they see Pay Now.

## Files changed
- `src/pages/invoices/InvoiceDetails.jsx`: `handleSend` and the button.
- `tests/pages/invoices/InvoiceDetails.test.tsx`: the host e-mails an unpaid invoice; a failure is reported; no button for Paid or Processing, or for a partner.

## Testing
- The new tests failed first, then passed. `tests/pages/invoices`: 41/41.
- Full Vitest run: 1838 passed, 2 expected fail (262 files). `npm run typecheck`: 0 errors. Mock E2E for appointments, invoices, embedded form and users after `npm run build`: 119/119.

## Open items
- The preview modal still offers E-Mail Invoice on Processing invoices (it only hides it for Paid). It was left unchanged.
