# Force a password change on first sign-in: partner portal

**Date:** 2026-11-26
**Author:** Awlad Hossain

## Problem
A partner owner, staff member or Users-screen user signing in with an issued password could keep using it forever. That covers the welcome email's generated password, one an admin typed, and the one emailed on seat activation. They must choose their own first.

This depends on the fch-api change; see fch-api `docs/handoff/2026-11-26-force-password-change.md`.

## Solution
The same design as the client portal (borrower-fch handoff of the same date):
- **Screen:** full-page `/set-password` (`src/pages/set-password/`), using the sign-in `Auth` layout.
- **Guards:** `ForcePasswordRoute` guards the screen, and `ProtectedRoute` redirects a flagged user to it.
- **`apiClient`:** handles the 403 `password_change_required` code.
- **Store helpers:** mark helpers in `src/lib/auth/auth.ts`, written with `setAuthState`, because this store has no `setUserData`.
- **Constants:** `src/config/passwordChange.ts`. This portal's home is `/` (it has no `/dashboard` route), so `PORTAL_HOME_ROUTE = '/'`.

**Design (on review, several rounds):** one centred card on the sign-in background.
- **Header:** the title and one line explaining why the screen is shown, greeting the user by first name ("Hi Ada, you signed in with a temporary password…"; the plain wording when there is no name). No icon. Compact spacing keeps the card about 510px tall at 1440×900.
- **Fields:** laid out like Profile > Change Password. The temporary password is on its own row; the new password and its confirmation sit side by side, flush with the field above. Each field has an eye toggle and is 37.5px tall.
- **Requirements:** a light "Password Requirements" card, the same as Profile's, without the strength meter. Each rule shows an empty circle that turns into a filled green check as the new password meets it (`data-met`), using the same rules the server checks.
- **Actions:** the sign-in green button, and a Log Out link with an icon.

## Files changed
- `src/config/passwordChange.ts`, `src/pages/set-password/SetPassword.tsx`, `src/pages/set-password/components/SetPasswordForm.tsx`, `src/lib/auth/ForcePasswordRoute.tsx`: new.
- `src/lib/auth/ProtectedRoute.tsx`, `src/lib/auth/auth.ts`, `src/lib/auth/index.ts`, `src/lib/http/apiClient.ts`, `src/App.jsx`: wiring.
- `e2e/auth/force-password-change.spec.ts`: new mocked spec.

## Tests
- **Vitest:**
  - `tests/lib/auth/ProtectedRoute.test.tsx`: 1 added.
  - `tests/lib/auth/ForcePasswordRoute.test.tsx`: new, 3 tests.
  - `tests/lib/auth/auth.test.ts`: 3 added.
  - `tests/lib/http/apiClient.test.ts`: 2 added.
  - `tests/pages/set-password/SetPassword.test.tsx`: new, 5 tests.

  50 passed. These were written before the code, mirroring borrower-fch's (which were run red), but were not run red separately here.
- **E2E (mocked):** `e2e/auth/force-password-change.spec.ts`, 3 tests:
  - a flagged user is kept on `/set-password` with no sidebar;
  - choosing a password sends the right body and opens `/`;
  - a 422 reason shows under its field.

  Run with `E2E_BASE_URL= npx playwright test ... --project=mock` after `npm run build`: 3 passed.
- **Full Vitest suite and typecheck:** see below.

## Open / follow-up
- **`ReminderModal`** still asks for due reminders while the Set password screen is open. The server answers 403 and the portal ignores it there (no toast). After the password is chosen, the reminder query does not refetch until reload, because its key is the token. Gating it on `must_change_password` would fix this.
