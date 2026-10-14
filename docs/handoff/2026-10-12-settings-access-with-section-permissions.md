# 2026-10-12 — Settings — access with section permissions

**Date:** 2026-10-12  
**Title:** Settings — access with section permissions  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 15 | The `/settings` route admitted only the payment and the two agreement permissions, but the page has sections for email, SMS, branding, domain and MicroBilt, each behind its own permission. | The route and the sidebar entry now accept every settings-section permission. | `src/App.jsx`, `src/components/Layout/Sidebar.jsx`, `e2e/persona-access.spec.ts`, `e2e-live/routes.ts` | Fixed and verified |

## 2026-10-12 — 15. Settings was unreachable with only section permissions

- **Problem:** The `/settings` route admitted only the payment and the two agreement permissions, but the page has sections for email, SMS, branding, domain and MicroBilt, each behind its own permission. A user holding only those could never open the page. Known bug in the suite.
- **Solution:** The route and the sidebar entry now accept every settings-section permission. The live route table was updated to match.
- **Files:** `src/App.jsx`, `src/components/Layout/Sidebar.jsx`, `e2e/persona-access.spec.ts`, `e2e-live/routes.ts`
- **Verified:** Spec passes with its known-bug marker removed.
- **Status:** Fixed and verified. **Check before release:** see "Things to confirm" in [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md).
