# Add User opened at the seat limit shows the purchase window right away (BUG-109 retest)

2026-10-29

## Problem
The 28-Oct retest of BUG-109 failed. QA opened `/users/create` by URL, as a partner at its seat limit, and got the normal Add User form with no "User Limit Reached" window. The 27-Oct fix ([2026-10-27-add-user-seat-limit-purchase.md](2026-10-27-add-user-seat-limit-purchase.md)) only offered the window on **Save**. QA expected it as soon as the page opened, as the Users list's + Add User does. QA could not try Save either, because no employee was left without a user.

## Solution
The page now runs the seat check as it opens, the same check as the list. It skips the host, and a page opened from the list with a purchase already chosen.

| Plan at the limit | Window on opening | Close / Cancel | Proceed |
|---|---|---|---|
| Paid | "User Limit Reached" | Back to the Users list | The window closes and the form shows "seat purchase pending". Save then creates a paid seat without asking again. |
| Free trial | "Paid Version Only" | Back to the Users list | (none) |

- **The Save-time check stays.** It covers the last seat going while the form was open. A window opened from Save closes back to the form, keeping what was typed.
- **The check waits for the subscription to load**, since free trial or paid decides which window opens. It then runs once and is not cancelled by a later subscription refresh.

**Overlay left behind:** after Cancel → Users list, the grey backdrop stayed over the list. `UserLimitModal` had no unmount cleanup, so a modal unmounted while open (the page change) was never hidden. It now hides and disposes itself on unmount with `hideAndDisposeModal`, as `PaidVersionOnlyModal` does.

## Files changed
- `src/pages/users/UserDetails.jsx`: the on-open seat check (`seatCheckedOnOpen`). `closeSeatLimit` goes back to the list for an on-open window. `handleSeatPurchase` only creates when Proceed came from Save.
- `src/pages/users/components/UserLimitModal.jsx`: unmount cleanup (`hideAndDisposeModal`), so no backdrop is left.
- `tests/pages/users/components/UserLimitModal.test.tsx` (new): hides and disposes on unmount while open. Red first.
- `e2e/sidebar/users/users.spec.ts`: Cancel and the free-trial Close also check that no `.modal-backdrop` is left.

## Testing
- `tests/pages/users/UserDetails.create.test.tsx`: the seat-limit block is rewritten. It covers:
  - the window on opening
  - Close → list
  - Proceed → form → paid seat
  - Save-time window when the last seat went meanwhile
  - a free seat → created
  - the free trial on opening
  - waiting for the subscription

  The new cases were red first. `tests/pages/users`: 25/25. `npm run typecheck` is clean.
- `e2e/sidebar/users/users.spec.ts`: +3 tests (paid: Cancel → list; Proceed → form with pending seat; free trial: Close → list). They fail on the previous page and pass now. `users.spec.ts` + `employees.spec.ts`: 53/53.

## Open items
- **QA retest:** the partner must be at its seat limit. To try Save after Proceed, QA needs an employee without a user account.
