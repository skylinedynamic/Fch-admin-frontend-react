# Merge origin/qa-round2-bugfix into bugfix/round-2

**Date:** 2026-11-04
**Branch:** bugfix/round-2

## Problem
Merging `origin/qa-round2-bugfix` into `bugfix/round-2` left eight files in conflict:
- `FundedAmountModal`;
- the funding-application `services.ts`;
- `FundingRequestDetail`;
- `FundingApplicationDetails`;
- `EmployeeDetails`;
- three test files.

The two branches had changed the same screens in different ways:
- **This branch:**
  - moved the lender table into the shared `LenderInformationCard`;
  - moved the commission from the Commission Details card into the Closed (Completed) modal.
- **The incoming branch:** fixed R2 bugs in the old copies of both.

## Solution
- **`FundedAmountModal`:**
  - **Kept:** this branch's redesign, with the commission inside the modal.
  - **Added, R2 BUG-038:** a funded amount above the requested amount shows a warning and an "I have checked this amount" checkbox, and Confirm stays disabled until it is ticked. The checkbox clears when the amount changes or the modal opens again.
  - **Added, R2 BUG-036 (user decision: move it to the Closed modal):** the Success Fee field takes the API's range, `min=1`, `max=100`, `step=0.01`. The admin and partner split stays 0–100. A refused fee shows inline under the field, and the application is not closed.
- **`services.ts`:** each step loader keeps this branch's `(fundingRequestId, fundingApplicationId)` lookup and loads through the incoming `loadStep`, which adopts the loaded version (R2 BUG-033).
- **`FundingRequestDetail`:**
  - **Kept:** this branch's `LenderInformationCard`.
  - **Moved into the card, R2 BUG-008:** the table row, the Lender filter options and matching, the search, the assign dialog and the assigned-lender card all use `lenderDisplayName()`.
  - **Types:** `MatchedLender` gained `legal_name` and `display_name`.
  - **Imports:** the stale-record imports stay, since the auto-merged R2 BUG-037 code uses them.
- **`FundingApplicationDetails`:**
  - **Kept:** this branch's layout, with no Commission Details card and with the `ClosedApplicationSummary`.
  - **Added:** `handleFundedConfirm` now sends `withExpectedStatus(...)` (R2 BUG-037).
  - **Removed:** a duplicate `requestedAmount` prop, from the auto-merge. `requestedAmountValue` stays, because it also covers an application from a funding request, whose own amount is empty.
- **`EmployeeDetails`:** both imports are kept.
- **Tests:**
  - **FundedAmountModal:** this branch's tests, plus 3 for BUG-038 and 1 for the BUG-036 ranges.
  - **FundingRequestDetail:** both describe blocks are kept, this branch's assign tests and the incoming BUG-008 tests.
  - **FundingApplicationDetails:** this branch's mocks. The incoming Status Notes test now uses `mutations.updateStatus`.
  - **`FundingApplicationDetails.r2.test.tsx`:** the BUG-036 case is rewritten against the Closed modal.

## Files changed
- `src/components/Common/Modals/FundedAmountModal.tsx`: BUG-038 and the BUG-036 Success Fee range.
- `src/modules/funding-application/services.ts`: `lookupParams` together with `loadStep`.
- `src/pages/applications/funding-request/FundingRequestDetail.tsx`: the conflict, resolved to the card.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: the conflict resolved, `withExpectedStatus` added, the duplicate prop removed.
- `src/pages/employees/EmployeeDetails.jsx`: both imports.
- `src/components/Common/Lender/LenderInformationCard.tsx` and `lenderFilter.ts`: display names (BUG-008).
- `src/modules/application/types.ts`: `MatchedLender.legal_name` and `display_name`.
- `tests/components/Common/Modals/FundedAmountModal.test.tsx`, `tests/components/Common/Lender/LenderInformationCard.test.tsx`, `tests/components/Common/Lender/lenderFilter.test.ts`, `tests/pages/applications/funding-request/FundingRequestDetail.test.tsx`, `tests/pages/applications/funding/FundingApplicationDetails.test.tsx` and `tests/pages/applications/funding/FundingApplicationDetails.r2.test.tsx`.

## Testing
- **BUG-008:** the 2 incoming tests failed on this branch's card, as did 5 new card and filter tests. All pass after the port (55 passed).
- **BUG-036:** 2 new tests failed on `min` and pass after the fix.
- **Affected suites:** FundedAmountModal, Lender, the applications pages, the funding-application module, employees, fundapplication and lender: 357 tests, all passing after the fixes.
- **`npm run typecheck`:** clean.
- **Full Vitest run:** see the session result.

## Open items
- **Not committed:** the merge itself is not committed yet.
- **E2E not run:** the Closed modal and Lender Information E2E specs were not run in this merge.
