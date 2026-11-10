# BUG-064: the Convert dialog lists the profile fields it would fill and asks first

**Date:** 2026-11-02
**Author:** awlad

## Problem
BUG-064: converting an embedded-form submission onto an existing client quietly filled the client's blank profile fields (address, DOB, SSN, business details) from the anonymous submission. The Convert dialog ("Existing Client Found") said only that a funding application would be added.

## Solution
The API now sends `existing_borrower.fields_to_fill` in the preview and in the 409 answer, and fills the fields only when `fill_profile_fields: true` is sent. See fch-api `docs/handoff/2026-11-02-bug-064-embed-convert-profile-fill-consent.md`.

In this app:
- **New `ProfileFillConsent`**, shown under the existing client's details:
  - "Empty profile fields this application can fill", each with its value. SSN and EIN arrive masked.
  - A checkbox, "Also fill these empty fields on the client's profile", **unticked** by default and reset each time the dialog opens.
  - A note that filled fields are never changed, and that unticked means only the application is added.
  - With nothing to fill, it says "The client's profile is not changed."
- **`EmbedFormConvertModal`:** the confirm payload adds `fill_profile_fields: true` only when the box is ticked.
- **`modules/embed-form/types.ts`:** new `ProfileFieldToFill`, and `fields_to_fill` on `ExistingBorrowerSummary`.

## Files changed
- `src/pages/embed-form/components/ProfileFillConsent.tsx`: new.
- `src/pages/embed-form/components/EmbedFormConvertModal.tsx`: the consent state, the block and the payload.
- `src/modules/embed-form/types.ts`: the types.

## Testing
- **Vitest:** `tests/pages/embed-form/components/EmbedFormConvertModal.test.tsx`, +2 tests, both failed first:
  - the list, and the payload with and without the tick;
  - "not changed" when there is nothing to fill.
- **E2E:** `e2e/embed-form-convert-existing-borrower.spec.ts`, +2 tests (ticked sends the flag, unticked does not). These were added after the component, so they passed on their first run.
- **Run:**
  - `tests/pages/embed-form`: 31 passed.
  - `npm run typecheck`: clean.
  - The E2E spec, against the built app: 6 passed.

## Follow-up: a readable field list, wider dialog (same day)
**Feedback:** the list was one long, raw column, and the dialog was too narrow for it.

**Grouped and formatted:**
- The new `groupProfileFields()` in `src/utils/profileFillDisplay.ts` groups the fields: Personal, Home address, Business, Business address, Revenue, then Other.
- Labels, groups and field types live in the new `src/config/embedFormProfileFill.ts`.
- Labels are readable ("Date of birth", "EIN", "Industry").
- Dates show as "Nov 1, 2008", amounts as "$2,000.00", and the employee count with a thousands separator.
- An address shows on one line.
- The country calling code ("+1") is left out.

**Layout** (`ProfileFillConsent`, `.ef-fill*` in `assets/css/custom.css`):
- A header with an icon, the title "Client profile has empty fields", and a count ("10 fields").
- Each group has a small title. The fields are in a grid with the label above the value.
- The list scrolls, with a fade at the bottom edge.
- The consent is a tinted row with a hint that changes with the tick. The block's border takes the brand colour when ticked.

**Wider dialog:**
- `EmbedFormConvertModal` uses `modal-lg` while there are fields to list.
- The grid then has 3 columns, and the list is up to 360px tall.

**Tests:**
- New `tests/utils/profileFillDisplay.test.ts`, 3 tests. They failed first.
- The modal test now expects the readable label and date, the count, and `modal-lg` only when there are fields. It failed first.

**Run:**
- `tests/pages/embed-form` + `tests/utils/profileFillDisplay.test.ts`: 34 passed. `npm run typecheck` clean.
- The E2E spec: 6 passed.

## Open items
- `EmbedFormSubmissions.tsx` and `EmbedFormSubmissionDetails.tsx` still call `convertEmbedFormSubmissionToBorrower` directly rather than through a query hook. That was already the case and was left as is.
