# Sidebar: Owner Summary renamed to Business Insights

2026-11-15

## Problem
The page heading had been renamed to "Business Insights", but the sidebar item still read "Owner Summary", so the menu and the screen used different names.

## Solution
The name now lives in one constant, `OWNER_SUMMARY_TITLE = 'Business Insights'` in `src/config/ownerSummary.ts`, used by both the sidebar item and the page `<h1>`. The URL stays `/owner-summary` so existing links and bookmarks keep working. Code identifiers (`OwnerSummary`, `owner-summary` module, `owner-kpi-*` test ids) are unchanged.

## Files changed
- `src/config/ownerSummary.ts`: new `OWNER_SUMMARY_TITLE`
- `src/components/Layout/Sidebar.jsx`: sidebar label uses the constant
- `src/pages/owner-summary/OwnerSummary.tsx`: heading uses the constant
- `tests/components/Layout/SidebarOwnerSummary.test.tsx`: looks for "Business Insights"
- `tests/pages/owner-summary/OwnerSummary.test.tsx`: new test that the heading is "Business Insights"
- `e2e/sidebar/menu/navigation.spec.ts`: host menu order and links use the new label
- `e2e/sidebar/owner-summary/*.spec.ts`: sidebar link, suite names and the live heading check use the new label
- `e2e/support/routes.ts`: route display name

## Testing
- Vitest (`tests/components/Layout`, `tests/pages/owner-summary`, `tests/modules/owner-summary`, `HostOwnerRoute`): 115 passed; the sidebar test failed first. `npm run typecheck`: clean.
- Playwright `e2e/sidebar/owner-summary` + `e2e/sidebar/menu/navigation.spec.ts` (`--workers=1`): 73 passed, 4 failed. All 4 failures are the existing E2E-024 (sidebar says "Notifications", spec says "Notification"; `/settings` now redirects to its first section). "Business Insights -> /owner-summary" passes. The live heading check that failed earlier because of the rename now passes.

## Open items
- E2E-024 (unrelated) is still open in `docs/e2e/ISSUES.md`.
- The weekly report email/PDF from fch-api still says "Owner Summary" (`lang/en/owner_summary.php`: `report.heading`, `report.open_dashboard`); rename it there if wanted.
