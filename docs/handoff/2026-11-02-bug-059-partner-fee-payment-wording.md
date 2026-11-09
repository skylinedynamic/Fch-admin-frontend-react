# BUG-059: the partner fee wording says auto-charge or pay from Invoices

**Date:** 2026-11-02
**Author:** awlad

## Problem
BUG-059 (R2-PP-LEAD-08, Partner › Leads › Convert to Borrower):
- The convert dialog said the $800 borrower fee was "Charged automatically on Partner's card".
- The fee is not charged at conversion. The invoices stayed Unpaid with "Pay Now", and the new clients stayed restricted.
- The client's Enrollment Details made the same claim: "is automatically charged to the Partner account immediately".

## Solution
**Decision (product owner):** the message tells the partner the fee will be charged automatically when the client pays their enrollment, **or** they can pay it manually from Invoices.

**How the fee is charged today, in fch-api:**
- The partner's card is charged when the client's **first enrollment payment** succeeds: `UnifiedPaymentService` step 6 for a card payment, and `PaymentService` when a manual payment is approved.
- So the fee is not taken at conversion. QA's invoices were still Unpaid because those clients had not paid yet.
- Both texts are now constants in `src/config/invoiceConfig.ts`:
  - `PARTNER_FEE_PAYMENT_HINT`: "You'll be charged automatically when the client pays their enrollment, or you can pay it manually from Invoices."
  - `partnerFeePaymentNote(amount)`: "$800.00 will be charged to you automatically when the client pays, or you can pay it manually from Invoices."
- Both are used in:
  - the Convert to Borrower dialog;
  - the client's Enrollment Details.
- The note's lead-in now reads "Two separate invoices are created" in both places.

## Files changed
- `src/config/invoiceConfig.ts`: the two texts.
- `src/pages/leads/components/LeadConvertModal.jsx`: the hint and note use them.
- `src/pages/clients/components/ClientInfoSection.tsx`: the same.

## Testing
- **New:** `tests/pages/leads/components/LeadConvertModal.partnerFee.test.tsx`. It failed first.
- **Updated** to the new wording; it failed first:
  - `tests/pages/clients/components/ClientEnrollmentPartnerFee.test.tsx`
  - `e2e/sidebar/clients/client-enrollment-partner-fee.spec.ts`
- **Run:**
  - Vitest `tests/pages/leads` + `tests/pages/clients`: 149 passed.
  - `npm run typecheck`: clean.
  - E2E `client-enrollment-partner-fee.spec.ts`: 1 passed.

## Open items
- **No message when the auto-charge fails.** If the partner's card is declined, `triggerPartnerAutoChargeForBorrowerInvoice` only writes a log. The partner gets no failed-payment notice (QA expected F116). The invoice stays Unpaid and can be paid from Invoices.
