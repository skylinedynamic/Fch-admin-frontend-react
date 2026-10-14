# 2026-10-12 — Embedded Form — admin screen fixes

**Date:** 2026-10-12  
**Title:** Embedded Form — admin screen fixes  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 10 | As host the cards showed "Total Applications 10" and the paginator offered one page, with 21 applications in the database. | Total and statistics are now read from `res.meta` first. | `src/pages/embed-form/EmbedFormSubmissions.tsx` | Fixed and verified |
| 11 | Changing the status within a second of the page opening saved correctly on the server but the dropdown went back to the old value. | On success the page now sets the status the server returned. | `src/pages/embed-form/EmbedFormSubmissionDetails.tsx` | Fixed and verified |
| 12 | `ConfigurationGuardModal` logged a debug object to the console on every render. | Removed. | `src/components/Common/ConfigurationGuardModal.tsx` | Fixed |
| 30 | A comment above the Embedded Form menu in the sidebar said the feature was hidden and on hold. | The comment was removed. The menu itself is unchanged. | `src/components/Layout/Sidebar.jsx` | Fixed |

## 2026-10-12 — 10. Loan Applications total and paginator stopped at ten

- **Problem:** As host the cards showed "Total Applications 10" and the paginator offered one page, with 21 applications in the database. The page read `meta` from inside `data`, but the API returns `meta` beside `data`, so the total fell back to the size of the current page.
- **Solution:** Total and statistics are now read from `res.meta` first.
- **Files:** `src/pages/embed-form/EmbedFormSubmissions.tsx`
- **Verified:** Browser, host — cards show 22, paginator shows three pages, page 2 loads ten rows.
- **Status:** Fixed and verified

## 2026-10-12 — 11. Status dropdown showed the old value

- **Problem:** Changing the status within a second of the page opening saved correctly on the server but the dropdown went back to the old value. A details request still in flight overwrote the optimistic value, and the success path never applied the server's answer.
- **Solution:** On success the page now sets the status the server returned.
- **Files:** `src/pages/embed-form/EmbedFormSubmissionDetails.tsx`
- **Verified:** Browser — changed 300 ms after load, dropdown and server agree.
- **Status:** Fixed and verified

## 2026-10-12 — 12. Debug log left in the configuration guard

- **Problem:** `ConfigurationGuardModal` logged a debug object to the console on every render.
- **Solution:** Removed.
- **Files:** `src/components/Common/ConfigurationGuardModal.tsx`
- **Status:** Fixed

## 2026-10-12 — 30. Sidebar comment said the Embedded Form menu was hidden

- **Problem:** A comment above the Embedded Form menu in the sidebar said the feature was hidden and on hold. The menu is visible and in use, so the comment was misleading.
- **Solution:** The comment was removed. The menu itself is unchanged.
- **Files:** `src/components/Layout/Sidebar.jsx`
- **Verified:** Typecheck clean.
- **Status:** Fixed
