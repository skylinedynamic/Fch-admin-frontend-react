# My Subscription: plan section first, invoice type in Recent Payments

**Date:** 2026-11-06

## Problem
Requested 2026-11-06 for a partner's My Subscription (`/my-subscription`):
1. The **Active Subscription Plan** section (plan name, amounts, start / next billing date, Cancel Subscription) should come first, above the three summary cards.
2. **Recent Payments History** should list the partner's own plan, seat and borrower fee payments, with each payment's invoice type. Before, it held only plan payments and had no invoice type.

## Solution
- `MySubscription.tsx`:
  - The plan section is moved above the Current / Recent Bill, Upcoming Billing and Default Payment Method cards.
  - The payments table has a new **INVOICE TYPE** column. It shows Enrollment, Down Payment, Installment, Platform Fee, User Seat or Borrower Fee, using the labels from `INVOICE_TYPE_OPTIONS`, the same as the Invoices filter. It shows "-" when the API gives no type.
  - `PaymentHistoryItem.invoice_type` added.
- Which payments are listed is decided by the API (fch-api `docs/handoff/2026-11-06-my-subscription-recent-payments-partner-bills.md`).

## Files changed
- `src/pages/my-subscription/MySubscription.tsx`
- `tests/pages/my-subscription/MySubscription.test.tsx`: 2 new tests, for the plan section above the cards and the invoice type per payment.

## Testing
- Both new tests failed first, then passed. `tests/pages/my-subscription`: 22 passed. `npm run typecheck` is clean.
- **Real browser check:** the page was opened as partner 41 (Demetria May) against the local API. This used a temporary Passport token; the token was revoked afterwards and its file deleted.
  - The plan section comes first.
  - Headers: DATE, INVOICE #, PAYMENT METHOD, AMOUNT, INVOICE TYPE, TYPE, STATUS.
  - Rows: INV-20260922002 $800 **Borrower Fee** and INV-20260922001 $6,997 **Enrollment**.
- No live Playwright spec: the admin live suite signs in only as the host, and the host has no My Subscription page (403).

## Open items
- **Upcoming Billing badge:** it shows the subscription status ("Active") while the plan section says "Completed" for a paid-off one-time plan.
- **Current / Recent Bill (BUG-187):** this card can still show a commission payout.
- Not committed.
