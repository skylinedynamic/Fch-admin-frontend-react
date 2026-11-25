# R3-BUG-030: Your own user record locks role and status

2026-11-25

## Problem
User Details on your own record (for example `/user-details/1`) offered Account Status and User Role. A user could deactivate or demote themselves, and the last admin could lock the team out of Users. (QA Round 3, R3-BUG-030.)

fch-api now refuses your own status or role change, and protects the last user who can manage users: `fch-api/docs/handoff/2026-11-25-r3-bug-030-user-self-and-last-manager-guard.md`.

## Solution
- **On your own record**, User Role and Account Status are disabled. Under them it says "You can't change your own role or account status. Ask another administrator." (`USER_SELF_GUARD_TEXT` in `src/config/statusOptions.ts`).
- Other fields, and other users' records, are unchanged.
- **The API's refusals reach the user without new code:**
  - a refused save shows under the field, through the existing backend-error mapping;
  - a refused delete (yourself, or the last user manager) is shown in the delete dialog, from `check-deletable`'s reason.

## Files changed
- `src/config/statusOptions.ts`: `USER_SELF_GUARD_TEXT`.
- `src/pages/users/UserDetails.jsx`: `isSelf` disables role and status and shows the note.
- `tests/pages/users/UserDetails.selfGuard.test.tsx` (new): locked on your own record, open on someone else's.
- `e2e/sidebar/users/users.spec.ts`: new mock spec for your own record.

## Testing
- The new test failed first: the fields were enabled. It passes now.
- `tests/pages/users` and `tests/config`: 76 passed.
- `npm run typecheck`: clean.
- Playwright mock, `e2e/sidebar/users`: 35 passed (after `npm run build`).

## Open items
- Not retested on admin-stage yet.
