# Client Enrollment Details: the note names the partner fee (BUG-140)

2026-10-29

## Problem
In Clients › a paid client › Client Info › Enrollment Details, seen as a white-label or certified partner, the two parts disagreed:
- **The Partner Invoice line:** "$800.00 — Charged automatically on Partner's account."
- **The blue note under it:** "…The Borrower pays $2,497.00, and upon successful payment, **$0.00** is automatically charged to the Partner account immediately."

An $800 Borrower Fee invoice is in fact raised for the partner.

**Cause.** In `ClientInfoSection.tsx` the two read different values:
- **The line** reads the client's saved `borrower_fee_amount_formatted` (from `enrollment_details`).
- **The note** read only `fixedEnrollmentAmount`. That is the partner's current fee, fetched only for a new or free-trial client; for an existing paid client it stays at its initial 0.

## Solution
One `partnerFeeLabel` is worked out once and used by both the line and the note: the client's saved fee, else the partner's fetched fee. They cannot drift apart again.

## Files changed
- `src/pages/clients/components/ClientInfoSection.tsx`: `partnerFeeLabel`, used by the Partner Invoice line and the note.
- `tests/pages/clients/components/ClientEnrollmentPartnerFee.test.tsx` (new).
- `e2e/sidebar/clients/client-enrollment-partner-fee.spec.ts` (new).

## Testing
- **Vitest:** `ClientEnrollmentPartnerFee.test.tsx` (1 test, MSW). A paid client of a white-label partner has the note saying "$800.00 is automatically charged to the Partner account", with no "$0.00", and the same amount on the Partner Invoice line. It was red first, receiving "$0.00".
  - Together with `ClientEinFormat` and `ClientAssignTo`, which also render `ClientInfoSection`: 9 passed.
- **E2E:** `client-enrollment-partner-fee.spec.ts` (mocked): 1 passed. It also failed against the old note.
- `npm run typecheck`: clean.

## Open items
- `LeadConvertModal.jsx` has a similar note. It reads `fixedEnrollmentAmount` there too, but that is always fetched for a new client, so it is not affected.
