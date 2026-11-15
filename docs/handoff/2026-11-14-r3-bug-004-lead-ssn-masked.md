# R3-BUG-004: Lead Contact Info shows the SSN and EIN masked, with a logged reveal

**Date:** 2026-11-14
**Author:** Awlad Hossain

## Problem

The lead API returned the lead's full SSN and EIN on every read, and the host opens every partner's leads. fch-api now masks both (`***-**-6789`, `**-***4321`) and adds `POST /common/leads/{id}/reveal`. See `fch-api/docs/handoff/2026-11-14-r3-bug-004-lead-ssn-masked.md`.

The lead form (Leads › lead › Contact Info) was not ready for masked values:
- **On load,** it ran the SSN through `formatSSN` and the EIN through `displayEIN`. `***-**-6789` turned into `678-9`.
- **On save,** it sent that as `6789`, which the API refuses (422). It sent the EIN in the same broken way.
- **Show button:** the SSN field's eye button could only show what the form already held. There was no way to fetch the full number.

## Solution

The client form's pattern (BUG-014):
- **On load,** the SSN and EIN are kept masked as the API sends them.
- **The fields use `RevealableInput`,** the client profile's component:
  - the mask shows read-only
  - the eye button calls `POST leads/{id}/reveal` (logged by the API) and opens the full number for editing
  - with no number on file, it is a plain input
- **On save,** `leadSensitiveNumbers()` decides what to send:
  - an SSN or EIN still masked is left out, so the API keeps the number on file
  - a revealed or typed SSN goes as its 9 digits, and a cleared one as `null`, which removes it
  - the EIN goes as written

## Files changed

- `src/modules/leads/types.ts`: `RevealableLeadField`. Documents `ssn` / `business_ein` as masked.
- `src/modules/leads/services.ts`: `revealLeadField()`.
- `src/modules/leads/queries.ts` (new): `useRevealLeadField()` (a mutation, not cached).
- `src/modules/leads/logic.ts`: `leadSensitiveNumbers()`.
- `src/modules/leads/index.ts`: exports `queries`.
- `src/pages/leads/LeadDetails.jsx`:
  - SSN and EIN use `RevealableInput`
  - the masked values are kept on load
  - the save uses `leadSensitiveNumbers()`
  - `SsnInput` and `unformatSSN` are no longer used here
- Tests:
  - `tests/modules/leads/services.test.ts` (+2): reveal posts the field and returns the value or null.
  - `tests/modules/leads/logic.test.ts` (+3): masked numbers are left out; revealed or typed ones are sent; a cleared SSN is sent as null.
  - `tests/pages/leads/LeadDetails.ssn.test.tsx`:
    - fixtures now use the API's masked shape
    - the reveal is called only on the eye button
    - a masked SSN is left out of the save
    - a cleared SSN is sent only after a reveal
  - `tests/pages/leads/LeadDetails.formats.test.tsx`:
    - the EIN fixture is masked
    - the eye button reveals it
    - a revealed EIN is sent as shown
    - a masked EIN is left out
  - `e2e/sidebar/leads/lead-ssn-masked.spec.ts` (new, 3):
    - the lead's partner and the host see both numbers masked, and the full SSN only through the reveal
    - saving without revealing sends neither number

## Testing

- **Seen failing first:**
  - unit, 11 tests (module and page)
  - E2E, the 3 new tests on a build of the old `LeadDetails.jsx`
- **After the change:**
  - `tests/modules/leads` and `tests/pages/leads`: 105 passed (17 files)
  - `npm run typecheck`: clean
  - Mock E2E `e2e/sidebar/leads` (live specs left out): 46 passed and 2 failed
    - The 2 failures are `leads.spec.ts` › "a complete lead opens the convert dialog" and › "Contact Person is required before anything is posted".
    - Both fail the same way with this change stashed, so they were already failing.

## Open items

- **Deploy in the same release as fch-api.** The old form sends a broken number (`6789`) for a masked SSN, so saving Contact Info on a lead that has an SSN or EIN would fail until this is out.
- **Convert flows:** `LeadConvertModal` / `LeadMissingInfoModal` send no SSN or EIN, so nothing to change there.
- **`LeadDetails.jsx`** is still `.jsx`.
- **The 2 failing `leads.spec.ts` tests** need a separate look.
