# Invoice window shows the method the invoice was really paid with (BUG-206)

**Date:** 2026-11-11
**Branch:** round-1-run-2-fix

## Problem
QA Round 1 Run 2, BUG-206: Host admin > Invoices > View Details on INV-20261105004 and INV-20261105007, both paid by Bank Transfer. PAYMENT DETAILS read "Payment Method: Stripe" and "Card Holder: …", and the notes said "To be paid by Stripe."

`InvoicePreviewModal.jsx` had "Stripe" hard-coded, and labelled every payer "Card Holder".

## Solution
The modal reads the API's new `payment_method`, `payment_reference` and `is_card_payment` (fch-api handoff of the same name):
- **Payment Method:** the real method. "Not paid yet" (`PAYMENT_METHOD_NOT_PAID_LABEL`) when nothing has paid it. "-" for a paid invoice with no record.
- **Reference:** shown when the payer gave one.
- **Payer line:** "Card Holder" only for a card payment, "Paid By" otherwise. A commission payout still says "Payee Name".
- **Notes:** leave out "To be paid by Stripe." when it was paid another way.
- The duplicated `id="payment-method"` on Payment Status is now `payment-status`.

## Files changed
- `src/config/invoiceConfig.ts`: `PAYMENT_METHOD_NOT_PAID_LABEL`
- `src/pages/invoices/components/InvoicePreviewModal.jsx`: Payment Details and notes from the API
- `tests/pages/invoices/components/InvoicePreviewModal.test.tsx`: new "payment details" block (3 tests)
- `e2e/sidebar/invoices/invoices.spec.ts`: new mocked test, View Details on a bank-transfer invoice

## Testing
- **Vitest:** the Bank Transfer and Not-paid tests failed before the change (2 failed); the card test already passed. All pass now. `tests/pages/invoices`: 11 files, 72 passed. Full run: see the session report.
- **Playwright mock** (after `npm run build`): `e2e/sidebar/invoices/invoices.spec.ts` + `e2e/sidebar/settings/payment-integration-setup.spec.ts`, 21 passed.
- `npm run typecheck` clean.

## Open items
- Deploy with the fch-api change. Without it the API sends no `payment_method`, so a paid invoice shows "-" and an unpaid one "Not paid yet". Either way, never "Stripe".
