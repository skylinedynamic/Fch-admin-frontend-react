# Employees — "Create account" at the seat limit behaves like Users › Add User

**Date:** 2026-10-23
**Branch:** `hotfix` (uncommitted)

## Problem
At the user seat limit, the two ways of adding a login disagreed:
- **Users › Add User:** a **partner on a free trial** got "Paid Version Only — This feature is available in Paid version. You can only add N users in Free trial." Only a paid partner was offered a seat to buy.
- **Employees › Create account checkbox** (`EmployeeDetails.jsx`): always opened the seat purchase modal ("User Limit Reached", with payment details). So a free-trial partner could start buying a paid seat there.

## Solution
- New `src/utils/seatLimit.ts` → `checkSeatLimit(userCount, user, subscription)`:
  - returns `available`, `free_trial` or `purchase`, plus count, limit and price
  - limit fallback: `seat_limit`, then `user_seats`, then the subscription's `user_seats`, then 3
  - free trial = signed-in entity is the Partner **and** `is_free_trail`
  - this is the Users page's existing rule, moved into one place
- `EmployeeDetails.jsx`:
  - uses `checkSeatLimit`
  - `free_trial` unticks the box and shows `PaidVersionOnlyModal` with the same message as the Users page
  - `purchase` keeps the existing `UserLimitModal` flow
- `Users.jsx`: uses `checkSeatLimit` too, so the two screens can't drift apart again. Behaviour is unchanged.

## Files changed
- `src/utils/seatLimit.ts`: new shared rule.
- `src/pages/employees/EmployeeDetails.jsx`: free-trial branch and `PaidVersionOnlyModal`.
- `src/pages/users/Users.jsx`: uses the shared rule.
- `tests/utils/seatLimit.test.ts`: new unit tests.
- `tests/pages/employees/EmployeeDetails.seatLimit.test.tsx`: new integration tests (free trial → Paid Version Only, box unticked; paid → User Limit Reached; seats left → box stays ticked).
- `e2e/sidebar/employees/employees.spec.ts`: 2 new E2E tests (free trial / paid at the limit).

## Testing
- The new unit and integration tests failed before the change.
- Vitest full suite: **210 files, 1530 passed** (+2 expected fail). `npm run typecheck`: clean.
- Playwright (`--project=mock --workers=2`, fresh build, `E2E_BASE_URL=`): users + employees **47 passed** before the new tests were added. The 2 new seat-limit tests also passed.

## Open items
- **Backend gap (not changed):** fch-api `UserService::create()` and `EmployeeService::create()` accept `is_paid: true` from a partner on a free trial. The screens now stop this, but the API doesn't. Recommended follow-up: refuse paid seats for free-trial partners server-side.
- Not committed.
