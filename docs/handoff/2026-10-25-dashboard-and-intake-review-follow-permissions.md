# Request Credit Profile needs "manage credit profile requests" (BUG-097)

**Date:** 2026-10-25
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-097** (OP-ROLE-06): a host staff user whose role has only "view leads" saw **Intake & Review** in the sidebar.

The cause: Request Credit Profile was `isHostOnly` with `permission: ''`, so every host user got it, and it brought the Intake & Review group with it. The URL opened for any host user too.

The ticket also reported company-wide dashboard totals. As decided, **the dashboard stays the same for everyone**, with no permission check on its cards.

## Solution
- **Sidebar:** Request Credit Profile needs `manage credit profile requests`, written as a plain string like the other menu items. A host user without it no longer sees Intake & Review unless they hold another of its permissions.
- **Route:** `credit-profile-requests` and `credit-profile-requests/:id` are behind `HostRoute`, then `PermissionRoute`. Opening the URL without the permission shows Access Denied.
- **API:** fch-api adds the permission and a seeder for roles 1 and 2 and their users (fch-api `docs/handoff/2026-10-25-view-credit-profile-requests-permission.md`). As decided, the API has no server-side check.

## Files changed
- `src/components/Layout/Sidebar.jsx`: the permission on Request Credit Profile.
- `src/App.jsx`: `PermissionRoute` inside `HostRoute` for the two credit-profile routes.
- E2E support files:
  - `e2e/support/routes.ts`: new guard kind `hostPermission` in the route oracle.
  - `e2e/fixtures/personaProfiles.ts`: the host Admin persona holds the permission, as roles 1 and 2 now do.
- Tests (details below):
  - `tests/components/Layout/SidebarIntakeReview.test.tsx`: new.
  - E2E: `e2e/sidebar/intake-review/credit-profile-requests/*.spec.ts`, `e2e/credit-profile-requests-latest-first.spec.ts` and `e2e/credit-profile-update-notification.spec.ts`.

## Tests
- **Vitest:** `SidebarIntakeReview.test.tsx`, 3 tests:
  - a "view leads" host user has no Intake & Review (failed first)
  - with the permission, Request Credit Profile links to its page
  - a partner never gets it
- **Full Vitest suite:** 248 files, 1,740 passed. `npm run typecheck` clean.
- **E2E (mock):**
  - `credit-profile-requests.spec.ts`: +1 test, a host user without the permission gets Access Denied and the list is not loaded.
  - The credit-profile specs now sign in with the permission.
  - **Run:** `e2e/sidebar/dashboard`, `e2e/sidebar/intake-review/credit-profile-requests`, both credit-profile specs and `e2e/sidebar/menu`: 442 passed, 9 failed.
  - **The 9 failures are in `e2e/sidebar/menu` and were there before this change:**
    - the specs still expect the old menu label "Notification" (renamed to "Notifications" in b38cc696)
    - `/admin/settings` and the persona Settings checks land on `/settings/payment-integration`

## Open items
- **Run on stage:** `php artisan db:seed --class=CreditProfileRequestPermissionSeeder` (fch-api). Without it, the host Admin and Developer lose Request Credit Profile.
- **Dashboard:** it still shows company totals to every host user, as decided.
- **BUG-125** (the same role opening Lenders, Tiers, Verification Center, Credit Accounts and Capital Access by URL) is not covered.
- **The 9 pre-existing `e2e/sidebar/menu` failures** listed above.
- **QA sheet:** BUG-097 → Fixed after the stage retest.
