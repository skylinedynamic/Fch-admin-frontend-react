# BUG-041: deciding a change request that was already decided

2026-11-02

## Problem
QA flow R2-OP-CHG-03, Owner portal › Intake & Review › Change Requests. Open the same pending change request in tab A and tab B, reject it in tab A, then approve it in tab B. The API correctly refuses with 422 "This change request has already been processed and cannot be modified." But the page showed only a "Something went wrong" toast, the review modal stayed open, and the list still said Pending.

## Solution
In `ChangeRequests.tsx`, a 422 from `PATCH /admin/change-requests/{id}` now:
1. closes the review modal;
2. opens a dialog titled "Request Not Updated" with the API's own reason (via `apiErrorMessage`), and no toast;
3. reloads the list (`refetch`) when its one button, "Reload list", is clicked, so the row shows its real status.

The dialog reuses `DeleteBlockedModal`, which shows a title, a reason and one button and changes nothing. It gained an optional `closeLabel` prop (default "Close"). Other errors (500, network) still show the "Something went wrong" toast, as before. No backend change: `ChangeRequestService::updateStatus()` already returns the 422 and the message.

## Files changed
- `src/pages/applications/change-requests/ChangeRequests.tsx`: 422 handling, `refused` state, the dialog.
- `src/components/Common/Modals/DeleteBlockedModal.tsx`: optional `closeLabel` prop.
- `tests/pages/applications/change-requests/ChangeRequests.staleDecision.test.tsx`: new integration test (MSW against the real `apiClient`).
- `tests/components/Common/Modals/DeleteBlockedModal.test.tsx`: 2 tests for `closeLabel`.
- `e2e/sidebar/intake-review/change-requests/change-requests.spec.ts`: new BUG-041 spec.

## Testing
- Vitest: change-request + modal tests 19 files / 135 tests passed. The new page test failed before the fix (red), then passed.
- Full Vitest suite: 342 files, 2437 passed, 2 expected-fail, 0 failed.
- `npm run typecheck`: clean.
- Playwright `change-requests.spec.ts`: 14/14 passed with `--workers=2`. With 8 workers, 8 unrelated specs timed out at `page.goto` on a cold dev server; they all passed on re-run.

## Open items
- Other 422s on this endpoint (e.g. the new sign-in email is already taken) now show the same dialog and close the review. The request stays Pending after the reload, so the admin can reopen it to reject.
- `ChangeRequests.tsx` still calls `fetchBorrowers` from `modules/partner/services` directly, not through a query hook. That was not changed here.
- Update the QA sheet: BUG-041 → Fixed, ready for retest.
