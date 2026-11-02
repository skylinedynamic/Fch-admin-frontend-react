# BUG-070: seat-limit message says inactive users still take a seat

2026-11-02

## Problem
QA flow R2-PP-USR-07, Partner portal › Users & Seats. A partner at the seat limit (3 of 3) marks one staff user Inactive, then clicks Add User. "User Limit Reached" still appears, because the inactive user still counts. The message only said "You have reached your limit. Purchase additional users to add more accounts. Payment is required." It never said that inactive users hold a seat, or how to free one.

## Solution
Decision (Awlad, 2026-11-02): keep seat counting as it is, and change only the message. `Partner::usedUserSeats()` in fch-api counts every login of the partner, whatever its status. `User` uses soft deletes, so a deleted user stops counting.

`UserLimitModal` now says: "All {limit} user seats are in use. Inactive users still take a seat. To free one, delete a user you no longer need, or buy an additional seat below." One modal serves Users › Add User, /users/create and Employee › Create account, so all three show the new text.

## Files changed
- `src/pages/users/components/UserLimitModal.jsx`: new message (`data-testid="user-limit-message"`).
- `tests/pages/users/components/UserLimitModal.test.tsx`: new test for the message.
- `e2e/sidebar/users/users.spec.ts`: new BUG-070 spec in the "opened directly at the seat limit" group.

## Testing
- Vitest `tests/pages/users` + `tests/pages/employees`: 11 files, 47 passed. The new test failed before the change (red).
- `npm run typecheck`: clean.
- Playwright `users.spec.ts` + `employees.spec.ts`: 54/54 passed (`--workers=2`).

## Open items
- No backend change; seats are counted as before.
- The free-trial dialog ("This feature is available in Paid version…") does not mention inactive users. It was not part of this report.
- `UserLimitModal.jsx` is still `.jsx`. It was not converted to `.tsx` in this text-only change.
- Update the QA sheet: BUG-070 → Fixed, ready for retest.
