# BUG-202 retest: the invoice window names the user who paid

**Date:** 2026-11-14
**Branch:** round-1-run-2-fix
**Author:** Awlad Hossain

## Problem
The BUG-202 retest on 12-Nov-26 failed on one of its three points, "Paid By".

QA-TEST Run2 Cert Staff A paid INV-20261112002 (payment 408). The two screens disagreed about who paid it:
- **Payment details** showed "PAID BY: QA-TEST Run2 Cert Staff A". This is correct.
- **The invoice window** (Invoices > View Details, for both the host and the partner) showed "Paid By: QA-TEST Run2 Cert Owner". That is the partner owner, not the user who paid.

INV-20261105001 / payment 389 showed the same problem.

The cause is in `InvoicePreviewModal`. It printed the **billed party's** name (`billed_to.name`) as the payer. It never read the `paid_by_name` that the API sends.

The Invoice details page (`/invoices/:id`) was fixed on 11-Nov. The modal was missed.

The API itself was correct:
- `GET /common/invoices/{id}` returns `paid_by_name` (`InvoiceDetailResource`, covered by `PayerAndReviewerNamesTest`).
- `invoices.paid_by` is set when a card payment completes, and when a manual payment is approved.

## Solution
- The modal shows "Paid By: {paid_by_name}" when the API gives a payer. This applies to card payments too. The user who paid is more useful than the "Card Holder" label, which only repeated the billed party.
- An invoice paid before payers were recorded has no `paid_by_name`. For those, the modal falls back to the billed party with the previous label ("Card Holder" for a card, "Paid By" otherwise).
- Commission payouts are unchanged ("Payee Name").

## Files changed
- `src/pages/invoices/components/InvoicePreviewModal.jsx`: the payer is `paid_by_name`, falling back to the billed party.
- `tests/pages/invoices/components/InvoicePreviewModal.test.tsx`: +2 tests (manual and card payment, both naming the user who paid).
- `e2e/sidebar/invoices/invoices.spec.ts`: +1 test, "View Details names the user who paid the invoice".

## Testing
- **Seen failing before the fix:**
  - The 2 unit tests.
  - The E2E test. Without the fix it received "Paid By: Johnathan Smithfield", the billed party, which is the bug QA reported.
- **After the fix:**
  - `tests/pages/invoices`: 78 passed (11 files).
  - Mock E2E `e2e/sidebar/invoices` + `e2e/sidebar/payments/payments.spec.ts`: 35 passed.
  - `npm run typecheck`: clean.

## Open items
- **Retest:** check that the invoice window shows Staff A for INV-20261112002 and for INV-20261105001, both as the host and as the partner.
- **Old invoices:** an invoice paid before 11-Nov has no recorded payer, so its window still shows the billed party.
- **Still separate:** the server-side check of Pay Invoice on `POST /api/v1/payment/process`, per the 12-Nov dev note.
