# R3-BUG-057: A refused installment Save showed nothing

2026-11-24

## Problem
Partners › Add Partner › White-Label › Installment › 36 months › Apply › Save. The API answered 422 on `enrollment.months` ("must not be greater than 24"), and the page showed **no toast and no field message**: the form just stayed there. (QA Round 3, R3-BUG-057.)

Cause: `mapPartnerBackendErrors` (partner) and `ClientInfoSection`'s map (client) put `enrollment.months`, `down_payment`, `monthly_amount` and `remaining_balance` under `installment_*` keys. No field showed those keys: they are set in the calculator modal, which has no error slot.

The API side, where months now follow the plan's "Installment Upto" (WL 36), is fixed in fch-api: `docs/handoff/2026-11-24-r3-bug-057-installment-months-follow-plan.md`.

## Solution
- New `src/components/Common/Payment/InstallmentError.tsx`:
  - `InstallmentError` shows the first installment error as `invalid-feedback d-block`, `role="alert"`;
  - helpers `INSTALLMENT_ERROR_KEYS` and `installmentErrorOf()`.
- Where it is shown:
  - Partner form: under **Enrollment Type** (`PartnerInformationSection.jsx`).
  - Client form: under **Enrollment plan** (`ClientInfoSection.tsx`).

  Both fields are always on screen when an installment is chosen.

## Files changed
- `src/components/Common/Payment/InstallmentError.tsx` (new).
- `src/pages/partners/components/PartnerInformationSection.jsx`: renders `InstallmentError`.
- `src/pages/clients/components/ClientInfoSection.tsx`: renders `InstallmentError`.
- `tests/components/Common/Payment/InstallmentError.test.tsx` (new): 3 unit tests.
- `tests/pages/partners/PartnerProfile.installment.test.tsx`: a refused months Save shows the API message. Checked to fail with the component removed.
- `tests/pages/clients/ClientDetails.requiredErrors.test.tsx`: the same check for Add Client.
- `e2e/sidebar/partners/partner-profile.spec.ts`: new mock spec. Installment (Upto 36) › Save answered 422 on `enrollment.months` shows the message.

## Testing
- `tests/components/Common/Payment`, `tests/pages/partners`, `tests/pages/clients`: 39 files, 236 passed.
- `npm run typecheck`: clean.
- Playwright mock, `partner-profile.spec.ts`: 41 passed (after `npm run build`).

## Open items
- Not retested on admin-stage yet.
