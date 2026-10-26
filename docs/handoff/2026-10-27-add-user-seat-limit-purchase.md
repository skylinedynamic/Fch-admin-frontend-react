# Add User at the seat limit offers to buy a seat (BUG-109)

Date: 2026-10-27

## Problem
Partner at its seat limit › `/users/create` opened directly › fill the form › Save. The page only showed the toast "User limit reached. Please purchase additional seats." The "User Limit Reached" window (choose months, Proceed, pay) was only on the Users list's + Add User, and going back to it lost the password that had been typed.

## Solution
Save on the Add User page now runs the same seat check as the Users list (`getUserCount` + `checkSeatLimit`) before creating the user:
- **A seat is free:** the user is created as before.
- **At the limit on a paid plan:** the same `UserLimitModal` opens. Proceed creates the user as a paid seat with the months chosen and everything typed. The seat-purchase summary appears and the invoice payment follows, as when coming from the list.
- **At the limit on the free trial:** the same "Paid version" notice as the list, and nothing is created.

The host has no limit and skips the check. A page opened from the list with a purchase already chosen skips it too. If the count cannot be read, the server's own check answers.

## Files changed
- `src/pages/users/UserDetails.jsx`: `purchase` is state; `seatAvailable()`, `handleSeatPurchase()`; `UserLimitModal` and `PaidVersionOnlyModal` on the create page.
- `tests/pages/users/UserDetails.create.test.tsx`: at the limit the window opens and Proceed creates a paid seat with the typed data; a free seat creates straight away; the free trial gets the notice and nothing is created.

## Testing
- The new tests failed first, then passed. `tests/pages/users`: 21/21.

## Open items
- None.
