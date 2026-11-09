# BUG-069: partners can resume a cancelled subscription

**Date:** 2026-11-03

## Problem
A partner who cancelled from **My Subscription** had no way to reactivate. Paying an invoice still open on the cancelled subscription reactivated it silently, with no warning.

Access was already right for partners. A cancelled partner stays open until the end date (`isSubscriptionRestricted()`). Dashboard, Invoices, Payments and My Subscription stay reachable afterwards, since `NonHostPartnerRoute` does not check the restriction.

## Solution
The client decided how this should work (2026-11-03); see fch-api `docs/handoff/2026-11-03-bug-069-cancel-and-resume-subscription.md`.

- **Resume button:** **My Subscription** shows **Resume Subscription** while the subscription is Cancelled (`components/ResumeSubscription.tsx`, `useResumeMySubscription`).
  - **Before the end date:** active at once, a toast, the stored subscription is refreshed, and the page reloads.
  - **After it:** the partner is taken to the invoice to pay (`/invoices/:id`).
- **Payment warning:** the invoice payment modal warns that paying will reactivate the subscription when the API flags `reactivates_subscription` (`ReactivationNotice.tsx`). Once paid, it refreshes the stored subscription.

## Files changed
- `src/modules/my-subscription/{types,services,queries,index}.ts`: `RESUME_RESULT`, `resumeMySubscription`, `useResumeMySubscription`. The module had only `services.ts`.
- `src/pages/my-subscription/components/ResumeSubscription.tsx` (new) and `MySubscription.tsx`: the button.
- `src/pages/invoices/components/ReactivationNotice.tsx` (new) and `InvoicePaymentModal.jsx`: the warning and the refresh.

## Testing
- **New:**
  - 5 tests in `tests/pages/my-subscription/MySubscription.test.tsx`: Resume only while cancelled; active at once with the store refreshed; to the invoice after the end date; the API's refusal.
  - `tests/pages/invoices/components/ReactivationNotice.test.tsx` (4).
- **Characterization:** `tests/lib/auth/subscriptionUtils.test.ts` (cancelled before and after the end date) and `tests/lib/auth/NonHostPartnerRoute.test.tsx` (My Subscription stays reachable while restricted).
- **Vitest full suite:** 348 files, 2466 tests passed, 2 expected failures. `npm run typecheck`: clean.

## Open items
- **E2E:** none was added or run for the partner flow; client-fch's live E2E covers the shared API.
