# Business Insights by developer-only permission; reserved Developer role name

**Date:** 2026-11-18

## Problem
Business Insights (`/business-insights`, sidebar item) was open to one hard-coded login (`OWNER_SUMMARY_ALLOWED_EMAILS = ['developer@fch.com']`), whatever its role. fch-api now has a permission group for it, held by the Developer role alone. fch-api also reserves the "Developer" role name and hides Developer accounts from every list (see the fch-api handoff `2026-11-18-reserved-developer-role-and-business-insights-permissions.md`).

## Solution
- `src/config/ownerSummary.ts`: `OWNER_SUMMARY_ALLOWED_EMAILS` replaced by `OWNER_SUMMARY_PERMISSION` (`VIEW` / `EXPORT` / `MANAGE_REPORT`), which mirrors fch-api `App\Enums\Permission`.
- `useCanViewOwnerSummary` now checks `view business insights`. The sidebar item and `OwnerSummaryRoute` follow it.
- On the page, **Report settings** (and its modal) shows only with `manage business insights report`, and **Export PDF** only with `export business insights`. The API checks each one again.
- **Roles screen follows the API's `is_editable`** (`src/modules/role` types/services, `RolesPermissions.tsx`, `EditRole.tsx`):
  - A Developer gets **Edit Role** on Admin; there the name is locked and the permissions and Update are enabled.
  - The Developer role, and every static role for anyone else, stays **View Role** (read-only).
  - Delete is still hidden for static roles.
  - A response without `is_editable` falls back to "editable unless static".
- Role form: no code change. fch-api's 422 `errors.name` ("Developer is a reserved role name…") already shows under Role name. New tests pin this.
- Users/employees lists: no change. fch-api now leaves Developer accounts out of the responses.

## Files changed
- `src/config/ownerSummary.ts` — permission constants instead of the email list
- `src/lib/auth/useCanViewOwnerSummary.ts` — permission check
- `src/pages/owner-summary/OwnerSummary.tsx` — export / report-settings buttons behind their permissions
- `src/components/Layout/Sidebar.jsx`, `src/App.jsx` — comments only
- `e2e/sidebar/business-insights/business-insights.spec.ts`, `e2e/sidebar/menu/navigation.spec.ts` — seed the permissions instead of the email
- `e2e/insights.auth.setup.ts`, `e2e/sidebar/business-insights/*.live.spec.ts`, `.env.e2e.example` — the live account must be a Developer
- `e2e/sidebar/roles-permissions/roles.spec.ts` — reserved-name case

## Testing
- Updated: `tests/lib/auth/OwnerSummaryRoute.test.tsx`, `tests/components/Layout/SidebarOwnerSummary.test.tsx`, `tests/pages/owner-summary/OwnerSummary.export.test.tsx`, `tests/pages/owner-summary/ReportSettings.test.tsx`.
- New: `tests/pages/owner-summary/OwnerSummary.permissions.test.tsx`, plus a reserved-name case in `tests/pages/roles/Roles.test.tsx`.
- Full Vitest suite: 465 files, **3554 passed**, plus 2 tests marked as expected to fail. `npm run typecheck`: clean.
- E2E (mocked, after `npm run build`, `--workers=1`):
  - `business-insights.spec.ts`: 20/20 passed.
  - `navigation.spec.ts`, Business Insights case: passed.
  - `roles.spec.ts`, reserved-name case: passed.
- E2E fixes in `business-insights.spec.ts`:
  - The "other host owner" case now relies on missing permissions, not the email.
  - The focus test pressed Shift+Tab one time too many. With one recipient there is no Remove button.
- Parallel e2e runs on this machine time out under load. Run them with `--workers=1`.

## Open items
- Not fixed here; they fail for reasons this change doesn't touch. On a baseline run without this change, 4 of the 6 roles/focus failures also failed (which 4 wasn't recorded):
  - `roles.spec.ts`: the three delete-dialog cases (lines 67, 77, 84), "an empty name does not call the API" (105) and "clearing the name blocks the update" (199). The last two still expect the pre-BUG-038 behaviour.
  - `navigation.spec.ts` "lists every module, in order" expects "Notification", but the menu says "Notifications".
- Live e2e needs the `E2E_INSIGHTS_*` account to hold the Developer role. Run fch-api's `BusinessInsightsPermissionSeeder` on the local DB first.
- The host owner login no longer sees Business Insights unless it is also a Developer.
