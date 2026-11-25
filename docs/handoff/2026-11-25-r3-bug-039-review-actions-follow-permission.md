# R3-BUG-039: Funding request Review Actions follow "update funding request"

2026-11-25

## Problem
Host role 133 had "update funding request" removed, and staff 385 refreshed Funding Request 91. The refreshed permission list no longer had the permission (that part was fixed earlier, through `is_refresh` → refresh-user in `apiClient.ts`). The page still showed Review Actions (Status + Confirm), usable. The API accepting the call is decision D1 and not part of this bug. (QA Round 3, R3-BUG-039, Medium / P2, Partially Fixed on the 17-Nov retest.)

Cause: `FundingRequestDetail.tsx` showed Review Actions to anyone on the host's team (`isHost`). It never checked the permission.

## Solution
- **`canUpdate`** = host **and** "update funding request" in the stored user's permissions. It reads the auth store, which the refresh updates, so a removed permission takes effect on the next refresh.
- **Review Actions** show only with `canUpdate`.
- **Lender Information** still lists the matched lenders, but Assign is off without `canUpdate`, with the reason "You don't have permission to change this funding request.".
- The permission names and that reason are constants in `src/config/funding.ts`: `FUNDING_REQUEST_PERMISSION` and `FUNDING_REQUEST_NO_UPDATE_PERMISSION`.

## Files changed
- `src/config/funding.ts`: `FUNDING_REQUEST_PERMISSION`, `FUNDING_REQUEST_NO_UPDATE_PERMISSION`.
- `src/pages/applications/funding-request/FundingRequestDetail.tsx`: `canUpdate` gates Review Actions and Assign.
- `tests/pages/applications/funding-request/FundingRequestDetail.test.tsx`:
  - the four host suites that use Review Actions now sign in with the permission;
  - new suite: without it, no Review Actions, Assign disabled with the reason, and the lenders still listed; with it, Review Actions and an enabled Assign.
- `e2e/sidebar/intake-review/funding-request/funding-request-details.spec.ts`: new mock spec. A host staff member with only "view funding request" sees no Review Actions, and Assign is disabled.

## Testing
- The new "without the permission" test failed first (Review Actions shown), then passed.
- `tests/pages/applications/funding-request` and `tests/components/Common/Lender`: 100 passed.
- `npm run typecheck`: clean.
- Playwright mock, `e2e/sidebar/intake-review/funding-request`: 20 passed (after `npm run build`).

## Open items
- The API still accepts the status change and the lender assignment without the permission (D1). The UI no longer offers them.
- Not retested on admin-stage yet.
