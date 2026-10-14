# 2026-10-12 — Invoices — rejected cash payment shown as confirmed

**Date:** 2026-10-12  
**Title:** Invoices — rejected cash payment shown as confirmed  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 31 | In the invoice payment modal, paying by cash (manual processing) called `/payment/process` inside its own `try/catch` that only logged the error. | The inner `try/catch` was removed, so a refusal from the API stops the flow. | `src/pages/invoices/components/InvoicePaymentModal.jsx`, `e2e/invoice-payment.spec.ts` | Fixed and verified |

## 2026-10-12 — 31. A rejected cash payment still showed the confirmation receipt

- **Problem:** In the invoice payment modal, paying by cash (manual processing) called `/payment/process` inside its own `try/catch` that only logged the error. When the API refused the payment, the modal still showed the "Payment Confirmation" receipt and told the payer that administration was reviewing it. Marked in the suite as a known bug.
- **Solution:** The inner `try/catch` was removed, so a refusal from the API stops the flow. The error toast now shows the server's own message, as the bank-transfer view already did. The known-bug marker was removed from the test.
- **Files:** `src/pages/invoices/components/InvoicePaymentModal.jsx`, `e2e/invoice-payment.spec.ts`
- **Verified:** `e2e/invoice-payment.spec.ts` on `http://localhost:5174`, headed — passed, including "a rejected cash payment is not reported as submitted".
- **Status:** Fixed and verified
