# Credit profile: no save on upload, SSN masked (BUG-144, BUG-145, BUG-147)

**Date:** 2026-10-30
**Branch:** bugfix/all-bugfix
**Author:** Awlad

## Problem
On Client > Credit Profile (host):
- **BUG-144:** after Choose PDF Report the page saved the parsed data straight away (`uploadFile()` called `saveCreditProfile` itself, an "auto-save"). The host never had to click **Save Credit Profile**, so a PDF that wasn't a credit report became the client's (empty) profile, and Capital Access readiness changed.
- **BUG-147:** that auto-save is a save, so the client got "Your credit profile has been updated" on upload, and again when the host clicked Save.
- **BUG-145:** Personal & Address Info showed the report's SSN as a plain input with all 9 digits.

## Solution
- Removed the auto-save. Reading a PDF only fills the form, with the toast "PDF read. Review the details, then click Save Credit Profile." Only Save writes the profile, so the client gets one notification.
- The SSN field is now `RevealableInput`, the same control as Client Info:
  - A saved profile's SSN arrives masked from the API, and the eye button calls `revealClientField(id, 'credit_profile_ssn')`. Each reveal is logged by the API.
  - An SSN just read from a PDF is held in full until saved, but starts masked (new optional `initiallyHidden` prop).
- The API changes (refusing a non-report PDF, masking, the reveal field) are in fch-api: see `docs/handoff/2026-10-30-credit-profile-bugs-143-144-145-147.md` there.

## Files changed
- `src/pages/clients/components/CreditProfileSection.tsx`: removed the auto-save, new toast text, SSN field changed to `RevealableInput` (with `htmlFor` on its label).
- `src/components/Common/RevealableInput.tsx`: optional `initiallyHidden` prop.
- `src/modules/client/types.ts`: `RevealableClientField` gained `'credit_profile_ssn'`.

## Tests
- Added in `tests/pages/clients/components/CreditProfileSection.test.tsx`:
  - upload fills the form but saves nothing until Save
  - a 422 "not a credit report" message is shown
  - a just-read SSN is masked until the eye is pressed
  - a saved SSN is revealed through `POST /borrowers/3/reveal {field: credit_profile_ssn}`
- Added in `tests/components/Common/RevealableInput.test.tsx`: `initiallyHidden` starts a full number masked and opens it without a fetch. Seen failing without the change.
- Added in `e2e/client-credit-profile.spec.ts` (mock project): the read → review (SSN masked) → Save flow, and refusal of a non-report.
- Results: `npm run typecheck` passes. Full Vitest suite: 291 files, 2043 passed (2 expected fail). Playwright `client-credit-profile.spec.ts --project=mock`: 5/5 passed.

## Open / follow-up
- A PDF that was read but never saved still leaves its `borrower_documents` row (`is_credit_report`, hidden from Documents). The same was true before.
- BUG-146 was not changed: it isn't a bug. The borrower asks for the update (borrower portal > Profile > Credit Profile), and the host gets the bell and email.
