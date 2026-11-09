# Loan application details: "Other" industry / entity type details

2026-11-08

## Problem
The embedded form now asks what "Other" is for Industry Type and Entity Type (fch-api, same-named handoff). The admin panel's loan application details showed only "Other".

## Solution
Embed Form > Loan Applications > details, Business section:
- An "Industry Type Details" row follows Industry Type, and an "Entity Type Details" row follows Entity Type, when the API sends `industry_type_note` / `entity_type_note`.
- The API sends them for "Other" only, so a listed type shows no extra row.

## Files changed
- `src/pages/embed-form/EmbedFormSubmissionDetails.tsx`: the two conditional `DetailFieldItem` rows.
- `tests/pages/embed-form/EmbedFormSubmissionDetails.test.tsx`: two tests, one where the details are shown for "Other" and one with no rows for a listed type.

## Testing
- The new test failed first and passes now.
- `tests/pages/embed-form`: 10 files, 67 tests passed.
- `npm run typecheck`: clean.

## Open items
- **Deploy order:** deploy with the fch-api change (it adds the columns and the fields).
- **Not deployed:** not committed or pushed.
