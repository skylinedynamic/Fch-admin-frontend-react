# Users — a free-trial partner adds users up to its seat limit, then sees "Paid Version Only" (BUG-112)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-112** (PP-USR-14): a free-trial WL partner clicked Users › + Add User and got the Add User form. QA expected a "Paid Version Only" modal right away ("user creation is a paid feature").

## Solution
No code change. **The rule as decided:** every partner, free trial included, may add users up to its seat limit, and the owner counts as one seat. Past the limit:
- a **free-trial** partner gets "Paid Version Only" ("You can only add N users in Free trial.") and cannot add more;
- a **paid** partner gets the buy-a-seat modal.

This is what `Users.jsx` › `handleAddUserClick` and `utils/seatLimit.ts` › `checkSeatLimit` already do; the employee form's "Create account" follows the same rule. QA's trial partner had only the owner against a limit of 3, so the form opened, as it should. The local trial partners are the same: 1 user, limit 3.

The Users page had no test for the free-trial case, so two were added to pin the rule.

## Files changed
- `tests/pages/users/Users.test.tsx`: +2 tests.

## Testing
- New, characterization of the decided behaviour:
  - a free-trial partner under its limit opens the Add User page;
  - at its limit it gets "Paid Version Only" with "You can only add 3 users in Free trial." and stays on the list.
- `Users.test.tsx`, `seatLimit.test.ts`, `EmployeeDetails.seatLimit.test.tsx`: 13 passed. `npm run typecheck` clean.

## Open items
- **QA sheet:** BUG-112 → by design; QA's expected result should read "Add User opens until the seat limit, then Paid Version Only".
- **Not enforced by the API for a trial partner:** fch-api `UserService` skips the seat check when the request sends `is_paid`, and it does not look at the free trial. The screen never offers a paid seat to a trial partner, so this is reachable only by calling the API directly.
