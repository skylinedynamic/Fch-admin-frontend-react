# Convert is disabled on a rejected loan application (BUG-098)

Date: 2026-10-27

## Problem
Embedded Form › Loan Applications › a submission set to Rejected › Convert to Free Plan Borrower stayed active, and the conversion completed (status became Converted).

## Solution
- On the details page the Convert button is disabled for a rejected submission, with a note under it: "Rejected applications cannot be converted. Change the status to convert it."
- On the list the row's Convert button is disabled, with the same text as its tooltip.
- The API refuses it as well (fch-api handoff of the same day), so this is not only a screen rule.
- The text and the status values are constants in `src/modules/embed-form/types.ts` (`REJECTED_CANNOT_CONVERT`, `SUBMISSION_STATUS`).

## Files changed
- `src/modules/embed-form/types.ts`: `SUBMISSION_STATUS`, `REJECTED_CANNOT_CONVERT`.
- `src/pages/embed-form/EmbedFormSubmissionDetails.tsx`: disabled button and note.
- `src/pages/embed-form/EmbedFormSubmissions.tsx`: disabled row button and tooltip.
- `tests/pages/embed-form/EmbedFormSubmissionDetails.test.tsx`: disabled with the note when rejected; enabled when in review.
- `tests/pages/embed-form/EmbedFormSubmissions.test.tsx`: the rejected row's button is disabled; a new row's is not.

## Testing
- The new tests failed first, then passed. `tests/pages/embed-form`: 29/29.

## Open items
- None.
