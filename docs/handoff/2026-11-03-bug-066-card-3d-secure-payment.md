# BUG-066: paying an invoice with a 3-D Secure (OTP) card (partner portal)

**Date:** 2026-11-03
**Branch:** bugfix/round-2
**Author:** Awlad Hossain

## Problem
QA (R2-OP-PAY-03/04): Stripe card payments from the portal (Invoices › invoice › Pay Now › Stripe) could not succeed with a card whose bank asks for 3-D Secure. They failed with "This card requires verification from your bank, which is not supported yet". The attempt also left no Failed payment row for the host or the payer.

## Solution
The API now supports 3-D Secure (fch-api handoff `2026-11-03-bug-066-card-3d-secure-checkout.md`). The partner portal follows the same flow as client-fch:

1. `POST /payment/process`.
2. On `requires_action`, `stripe.handleNextAction({ clientSecret })`. The button reads "Waiting for your bank to verify..." meanwhile.
3. `POST /payment/confirm { payment_id }`. The outcome comes from the API: Paid, Failed with the reason, or still Pending.

**How it is built:**
- **`StripeForm`** moved out of `PaymentMethodForms.jsx` into a new `StripeForm.tsx`, which uses the hook `pages/invoices/hooks/useStripeCardCheckout.ts`.
- **`PaymentMethodForms.jsx`** keeps only the old raw-card forms. They are unused; see Open.
- **The `invoice` module** gets the `queries.ts` it was missing.

## Files changed
- `src/modules/invoice/types.ts`: `ProcessPaymentPayload`, `ProcessPaymentResult`, `ProcessPaymentResponse`.
- `src/modules/invoice/services.ts`: typed `processUnifiedPayment`; new `confirmAuthenticatedPayment` (`/payment/confirm`).
- `src/modules/invoice/queries.ts` (new): `useProcessPayment`, `useConfirmAuthenticatedPayment`.
- `src/modules/invoice/index.ts`: exports the queries.
- `src/pages/invoices/hooks/useStripeCardCheckout.ts` (new): charge → bank challenge → confirm.
- `src/pages/invoices/components/StripeForm.tsx` (new): the Stripe card form, typed, on the hook.
- `src/pages/invoices/components/PaymentMethodForms.jsx`: the Stripe form and its Stripe imports removed.
- `src/pages/invoices/components/InvoicePaymentModal.jsx`: imports `StripeForm` from `./StripeForm`.

## Tests
- **Added `tests/pages/invoices/components/StripeForm.test.tsx`** (MSW against the real `apiClient`; only Stripe's SDK is mocked):
  - plain payment (only the `pm_` token is sent);
  - Stripe tokenising error;
  - API decline;
  - challenge completed;
  - "Waiting for your bank";
  - the bank refuses;
  - pending;
  - Stripe's own error.
- **Added `tests/pages/invoices/hooks/useStripeCardCheckout.test.tsx` (6).**
- **Updated `tests/modules/invoice/services.test.ts`:** `confirmAuthenticatedPayment` posts only `payment_id`.
- **Red first:** the new files failed on the missing modules, and the service test failed.
- **Run:**
  - `npx vitest run tests/modules/invoice tests/pages/invoices`: 68 passed;
  - `npm run typecheck`: clean;
  - full `npm test`: 350 files, 2482 passed and 2 expected-fail.
- **E2E: none added here.** The mocked suite has no Stripe card flow; it would have to fake Stripe.js itself. The live suite signs in as the host, who never pays invoices. The real flow (fch-api plus the Stripe sandbox, Fail and Complete) is covered by client-fch's `e2e/sidebar/invoices/invoice-3ds-payment.spec.ts`. The logic is the same here, and pinned by the tests above.

## Open / follow-up
- **Deploy together with fch-api.**
- **Partner live E2E:** this needs a partner E2E login and a seeded unpaid partner invoice before a live 3-D Secure spec can be added here.
- **Raw-card forms still in this repo (E2E-017 in client-fch).** `AuthorizeNetForm`, `SquareForm` and `EcryptForm` remain in `PaymentMethodForms.jsx`. Nothing imports them, and the API refuses their payload (422), but they should be deleted as client-fch's were.
