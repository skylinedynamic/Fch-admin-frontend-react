# Loan Applications: delete selected, and a partner filter for the host

**Date:** 2026-11-02
**Author:** awlad

## Problem
Embedded Form › Loan Applications (`/embed-form/loan-applications`):
- There was no way to delete an application.
- The host sees every partner's applications but could not narrow the list to one partner.

## Solution
**Delete selected:**
- **Checkboxes:** the table has a checkbox column. A **converted** application cannot be ticked (`isDataSelectable`), because it belongs to a client and a funding application.
- **Row click:** ticking a box does not open the row.
- **Actions button:** once rows are ticked, an **Actions** split button appears in the page header with **Delete Selected**, the same as Partners and Clients.
  - Delete Selected opens the shared `DeleteConfirmationModal`: "The N selected applications will be deleted."
- **After deleting:** the list reloads, and the selection clears on every reload.
- **If the API refuses** (one was converted in the meantime), `DeleteBlockedModal` names those applications with the API's message.
- **Where it lives:** the new `components/DeleteSelectedSubmissions.tsx` (the button and both modals), using the new `useDeleteEmbedFormSubmissions` mutation in `modules/embed-form`.
- **No permission check.** The API has none for now either (product owner's decision).

**Partner filter, host only:**
- An "All Partners" dropdown with search, from `usePartnerOptions` (`/common/get-all-partners`), as on Change Requests.
- Applying it sends `partner_id` to `submissions/fetch`, and Clear resets it.
- With it, the filter row narrows to fit five controls.

## Files changed
- `src/modules/embed-form/services.ts`: `deleteEmbedFormSubmissions`.
- `src/modules/embed-form/queries.ts`: `useDeleteEmbedFormSubmissions`.
- `src/modules/embed-form/types.ts`: `ConvertedSubmission`, `DeleteSubmissionsResponse`.
- `src/pages/embed-form/components/DeleteSelectedSubmissions.tsx`: new.
- `src/pages/embed-form/EmbedFormSubmissions.tsx`: the selection column, the Actions button in the header, and the partner filter.

## Testing
- **New:** `tests/pages/embed-form/Submissions.deleteAndPartner.test.tsx`, 4 tests.
  - Delete the ticked ones, with a converted one disabled.
  - The API's refusal names the rows.
  - The host filters by partner.
  - A partner gets no filter.
  - Three failed first. "A partner gets no filter" passed before the filter existed.
- **New E2E**, in `e2e/sidebar/embedded-form/loan-applications/loan-applications.spec.ts`, +2 tests: delete from Actions (with a converted row disabled and the row not opening), and the host's partner filter.
- **Run:**
  - `tests/pages/embed-form`: 35 passed.
  - `npm run typecheck`: clean.
  - The Loan Applications E2E folder: 30 passed.

## Open items
- `EmbedFormSubmissions.tsx` still loads the list with `fetchEmbedFormSubmissions` directly, not through a query hook. It was already like that and is now about 700 lines; moving the list into a query hook and smaller components is a follow-up.
