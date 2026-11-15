# BUG-202 follow-ups: seat payment needs Pay Invoice, save-card checkbox, Paid By shown

**Date:** 2026-11-11
**Branch:** round-1-run-2-fix
**Author:** Awlad Hossain

## Problem
1. **Seat purchase:** after buying a paid seat on Users or Employees, the payment modal opened at once. Anyone who could create users could pay the seat invoice there, while Invoices hid Pay Now from the same person without "Pay Invoice".
2. **Card saved silently:** a card used to pay could become the payer's saved card without asking. See the fch-api handoff.
3. **No names:** who paid, approved or rejected a payment was not shown. Payment Details showed Approved/Rejected By only from the name written at the time.

## Solution
- **Seat payment:**
  - With "Pay Invoice", the seat invoice's payment modal opens as before.
  - Without it, the user or employee is still created and the modal does not open. An info toast says "User/Employee created. Its seat invoice is still unpaid - someone with the Pay Invoice permission can pay it from Invoices.", then the page goes to the Users list or the new employee.
  - The message lives in `config/limitOptions.ts` (`SEAT_INVOICE_WAITING`).
- **Save card:**
  - New `SaveCardCheckbox`, "Save card as default payment method", unticked by default, in `StripeForm`. Every card payment in the panel goes through `StripeForm`: Invoices, seat payment, clients.
  - It sends `save_card`.
  - `LeadPaymentModal` was left as it is: it is rendered but never opened, and it posts a payload the API refuses (`tests/modules/unreachableServices.test.ts`).
- **Names:**
  - Payment Details shows **Paid By** (new `PaidByInfo`).
  - Approved By and Rejected By use the API's `approved_by_name` / `rejected_by_name`, and fall back to the old name in `raw_details`.
  - Invoice Details shows "Paid By: …".
- **Also fixed:** `pages/partners/PartnerProfile.jsx` imported `'../../modules/acc0ount'` (typo, in commit `fbb91ef3`). Vite could not resolve it, so the whole panel failed to load. Now `'../../modules/account'`.

## Files changed
- `src/pages/users/UserDetails.jsx`: the seat modal needs "Pay Invoice".
- `src/pages/employees/EmployeeDetails.jsx`: the seat modal needs "Pay Invoice".
- `src/config/limitOptions.ts`: `SEAT_INVOICE_WAITING`.
- `src/pages/invoices/components/SaveCardCheckbox.tsx` (new).
- `src/pages/invoices/components/StripeForm.tsx`: checkbox; sends `save_card`.
- `src/modules/invoice/types.ts`: `save_card` on `ProcessPaymentPayload`.
- `src/pages/payments/components/PaidByInfo.tsx` (new).
- `src/pages/payments/PaymentDetails.jsx`: Paid By; names from the API.
- `src/pages/invoices/InvoiceDetails.jsx`: Paid By.
- `src/pages/partners/PartnerProfile.jsx`: the import typo.

## Tests
- **Vitest (new and changed; the new cases failed first, then passed):**
  - `tests/pages/users/UserDetails.create.test.tsx`: +2, with and without Pay Invoice.
  - `tests/pages/employees/EmployeeDetails.seatLimit.test.tsx`: +2.
  - `tests/pages/invoices/components/StripeForm.test.tsx`: the payload now carries `save_card: false`; +2 for the checkbox unticked by default and for sending it ticked.
  - `tests/pages/payments/PaymentDetails.test.tsx`: +4.
  - `tests/pages/invoices/InvoiceDetails.test.tsx`: +2.
- **E2E (mock):** all passed.
  - `e2e/sidebar/users/users.spec.ts`: +2 (seat payment with and without Pay Invoice).
  - `e2e/sidebar/payments/payments.spec.ts`: +2 (Paid By, Approved By).
  - `e2e/sidebar/invoices/invoices.spec.ts`: +1 (Paid By).
  - Before the typo fix, every spec that loads the panel failed on it.
- **No E2E for the checkbox here:** the mock project cannot load Stripe Elements. The borrower live spec checks the checkbox and the payload.
- **Full suite and typecheck:** see the session summary.

## Open / follow-up
- **Deploy with fch-api and borrower-fch.**
- **Employees seat payment has no E2E.** It is covered by the integration tests.
- **The `'Pay Invoice'` permission name** is still written inline, like every other permission in this app (decided 11-Nov to leave as is).
- Not committed.
