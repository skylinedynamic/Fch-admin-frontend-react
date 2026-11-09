# Open tabs reload onto the maintenance page

2026-11-05

## Problem
Maintenance mode is switched on by hand on the server (`sudo fch-maintenance on`). Nginx then:
- serves its static maintenance page for every portal page load;
- answers every API call with `503 {"status":false,"maintenance":true,"message":"..."}`.

A partner who already had the portal open never reloads, so never saw that page. Their API calls just failed, leaving empty screens, generic errors, or forms that silently did nothing.

## Solution
**Reload on the maintenance 503.** The shared `apiClient` response interceptor recognises the maintenance 503: status 503 **and** `maintenance: true` in the body. It reloads the page once, so the server serves its static maintenance page. That page already checks every 30s and brings the user back when maintenance is over. There is no error toast and no logout.

**Other 503s are untouched.** Laravel's own `artisan down`, an overloaded server and similar have no `maintenance: true`, so they get the normal error handling.

**Loop guard.** At most one reload per `MAINTENANCE_RELOAD_GUARD_MS` (60s), recorded in sessionStorage. If the API says maintenance but the portal page still loads (for example, only the API block has the switch), the second time shows the server's message as a toast instead of reloading again. If sessionStorage is blocked, it never reloads.

**Why not an in-app screen.** An in-app maintenance screen was built first and then dropped in favour of this. The server page already does the job, so there is no second design to keep in step. The user's unsaved form input is lost either way, since the screen also had to reload at the end.

## Files changed
- `src/config/maintenance.ts` (new): `MAINTENANCE_HTTP_STATUS`, `MAINTENANCE_RELOAD_GUARD_MS`, `MAINTENANCE_RELOAD_KEY`, `MAINTENANCE_DEFAULT_MESSAGE`, `MAINTENANCE_TOAST_ID`.
- `src/lib/http/maintenance.ts` (new): `isMaintenanceResponse`, `reloadForMaintenance` (the guard).
- `src/lib/http/apiClient.ts`: on the maintenance 503, `reloadForMaintenance(message)` runs before the other error handling.

## Testing
- New: `tests/lib/http/maintenance.test.ts` (9). Covers which bodies count as maintenance (Laravel down, false, string, empty, HTML do not), the first reload, no second reload inside the window (message shown instead), the default message, reloading again after the window, and never reloading when storage is blocked.
- Updated: `tests/lib/http/apiClient.test.ts`. The maintenance 503 reloads with no toast and no logout; any other 503 does not reload.
- E2E: `e2e/maintenance-reload.spec.ts` (2). Maintenance starts in an open tab (Settings → Email Configuration):
  - the tab lands on the static maintenance page;
  - when only the API is in maintenance, it reloads exactly once and then shows the message.

  Result: 2 passed, plus settings-routes.spec.ts 3 passed alongside (mock project, `E2E_BASE_URL=` cleared).
- Full Vitest suite: 2742 passed, 2 expected fail (377 files). `npm run typecheck` clean.

## Open items
- Server setup is a manual runbook, not in this repo.
- Not yet seen against the real Nginx on stage. Check:
  1. Open the portal.
  2. Run `sudo fch-maintenance on`, then click anything. The tab should land on the maintenance page.
  3. Run `sudo fch-maintenance off`. It should come back within 30s.
