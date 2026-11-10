# BUG-204: Profile email can be changed, with confirmation

**Date:** 2026-11-07

## Problem
Profile → Profile Details had the Email input `readOnly` (`src/pages/auth-profile/Profile.tsx`), so a partner or staff user could not change their own sign-in email. Save reported success and changed nothing.

## Solution
- **Editable field:** the Email field is now editable. Save sends it.
- **The API decides** (fch-api `docs/handoff/2026-11-07-bug-204-partner-profile-email-change.md`):
  - a new email waits for confirmation from the link sent to it
  - the current email withdraws a pending change
- **Toast:** shows the API's message.
- **Pending notice:** the same `PendingEmailNotice` as the Users and Employees screens ("Waiting for confirmation from …", Resend link / Cancel change) sits over the field.
  - It shows from the save response, and from the signed-in user's new `pending_email` after a reload.
  - The field keeps the current email until the link is followed.
- **Type:** `AuthUser` has `pending_email`.
- **Follow-up (same day):** Cancel change (and Resend link) also update `pending_email` on the signed-in user kept in the browser (`handlePendingEmailChange` → `setCredentials`). Before this, a cancelled change came back after a reload, because the notice reads that stored user.

## Files changed
- `src/pages/auth-profile/Profile.tsx`: email editable, pending notice, pending state from the save response and from the user. Cancel/Resend write the result back to the stored user.
- `src/store/auth/authStore.ts`: `pending_email` on `AuthUser`.
- `tests/setup.ts`: jsdom shim for `Range.getBoundingClientRect` (PendingEmailNotice measures its label; jsdom has no layout).
- `tests/pages/auth-profile/Profile.test.tsx`: 5 new tests. One covers a host cancelling the change: the API sets `is_refresh`, and when the signed-in user is reloaded without the change, the notice goes. The other 4: The email is editable; a new email shows the API message and the pending notice while the field keeps the current one; a pending change shows when the page opens; Cancel change clears it from the stored user, so a remount shows no notice.
- `e2e/topbar/profile/profile.spec.ts`: new. A new email is sent, waits for confirmation, and Cancel change withdraws it.

## Testing
- **Vitest:** the 3 new tests failed first (read-only; no notice), then passed. The follow-up test failed first (stored user still had the old `pending_email`), then passed. Full suite: 2764 passed, 2 expected fail (379 files).
- `npm run typecheck`: clean.
- **Playwright `e2e/topbar/profile/`:** 14 passed (mock + live).
- **Live probe (real API on :8001 with mail to the log, partner 41's owner):**
  - save → message + notice; reload → notice still there
  - Cancel change → 200 and toast "The pending email change has been cancelled."; stored user `pending_email` null
  - reload → no notice; DB `pending_email` null, email unchanged
  - The data was restored afterwards.

## Open items
- Not committed.
