# Application documents open the borrower's folder

**Date:** 2026-10-13
**Branch:** bugfix-awlad
**Author:** Awlad Hossain

## Problem
In a funding application's **Documents** step, the "select files" file manager opened `borrowers/{getUser().entity_id}`. That is the signed-in partner's or staff member's own entity id, not a borrower's. So it showed some unrelated borrower's folder, possibly another partner's borrower.

After fch-api F120, the file manager refuses another partner's borrower folder. So for a non-host partner this step would have shown a 403 instead of the files.

## Solution
- **fch-api** (F120): the partner funding-request response now includes `borrower_id`.
- **`DocumentUploadStep`:** passes `fundingData?.borrower_id` as the file manager's `entityId` (the type stays `borrowers`). The `getUser` import is removed.
- **`FundingRequestData`:** gains `borrower_id?: number | null`.

## Files changed
- `src/pages/applications/fundapplication/components/steps/DocumentUploadStep.tsx`
- `src/modules/funding-application/types.ts`
- `tests/pages/applications/fundapplication/components/DocumentUploadStep.test.tsx` (new)

## Tests
- **Added:** `tests/pages/applications/fundapplication/components/DocumentUploadStep.test.tsx`.
  - Setup: a partner admin is signed in with entity id 999, and the funding request's `borrower_id` is 57. The step loads its data through MSW. `FileManagerModal` is mocked only to read the folder it is asked to open.
  - It asserts `borrowers` / `57`. It failed first (received 999), then passed.
- **E2E:** none. This flow has no Playwright spec.
- **Run:** `npm test` passed (113 files, 666 tests). `npm run typecheck` is clean.

## Open / follow-up
- Deploy together with fch-api F120. The new `borrower_id` comes from there.
