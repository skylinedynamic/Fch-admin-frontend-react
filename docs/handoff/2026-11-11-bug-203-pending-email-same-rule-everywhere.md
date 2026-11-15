# BUG-203: one pending-email rule on Profile, Clients, Partners, Employees and Users

**Date:** 2026-11-11
**Branch:** round-1-run-2-fix
**Author:** Awlad Hossain

## Problem
Each form with a sign-in email handled a pending change differently. On Profile (BUG-204), any save that resubmitted the current email withdrew the change. Every save resubmits it, so editing only the name withdrew it too. On Clients, Partners, Employees and Users, typing the current email back in could never withdraw a change.

## Solution
This follows the fch-api change of the same date: one rule everywhere.
- **While a change waits:**
  - the email field shows the **pending** email
  - the notice names the one still in use: "Sign-in stays x until the link sent there is clicked."
- **Saving other fields** sends the pending email back and the change stays.
- **Typing the current email back in** withdraws it.
- **Cancel change** puts the current email back in the field.
- **New helper:** `emailFieldValue(current, pending)` in `modules/account` gives the field value.
- **Each screen keeps the current email next to the field:**
  - Profile: from the signed-in user
  - Users, Employees, Clients: a `signInEmail` state
  - Partners: `formData.signin_email`, which is never sent back

## Files changed
- `src/modules/account/emailField.ts` (new), `index.ts`: `emailFieldValue`.
- `src/components/Account/PendingEmailNotice.tsx`: optional `currentEmail`, in the text and the tooltip.
- `src/pages/auth-profile/Profile.tsx`: field from `emailFieldValue`; `currentEmail`.
- `src/pages/users/UserDetails.jsx`: field and notice; Cancel puts the current email back.
- `src/pages/employees/EmployeeDetails.jsx`: field and notice; Cancel puts the current email back.
- `src/pages/clients/components/ClientInfoSection.tsx`: field and notice; Cancel puts the current email back.
- `src/pages/partners/PartnerProfile.jsx`: field and notice (`signin_email`).
- `src/pages/partners/components/PartnerInformationSection.jsx`: Cancel puts the current email back.
- `src/modules/partner/logic.ts`: `signin_email` is never sent.

## Tests
- **Added:**
  - `tests/modules/account/emailField.test.ts`
  - `tests/pages/{users/UserDetails,employees/EmployeeDetails,clients/ClientDetails,partners/PartnerProfile}.pendingEmail.test.tsx`: 4 each (field and notice, save keeps, current email withdraws, Cancel)
  - payload case in `tests/modules/partner/logic.test.ts`
- **Updated:** `tests/pages/auth-profile/Profile.test.tsx`: the field shows the pending email; two new cases (save keeps, current email withdraws). All failed first, then passed.
- **E2E (mock):**
  - new `e2e/support/pendingEmail.ts` with `e2e/sidebar/{users,employees,clients,partners}/*-pending-email-save.spec.ts`: 12 passed
  - `e2e/topbar/profile/profile.spec.ts` updated plus one new case: 12 passed
- **Run:** see the Vitest/typecheck result in the session summary.

## Open / follow-up
- **Deploy together with fch-api and borrower-fch.** See `fch-api/docs/handoff/2026-11-11-bug-203-pending-email-same-rule-everywhere.md`.
- Not committed.
