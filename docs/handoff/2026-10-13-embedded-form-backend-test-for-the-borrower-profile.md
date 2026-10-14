# 2026-10-13 — Embedded Form — backend test for the borrower profile

**Date:** 2026-10-13  
**Title:** Embedded Form — backend test for the borrower profile  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-13-summary-pending-and-test-data.md](2026-10-13-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 6 | The change that copies the applicant's details onto the borrower profile (2026-10-12, entry 35) had been verified through the browser and the database only. | A feature test was added. It converts an application through the API and checks that date of birth, the full business address, entity type, industry type, years in business, number of employees, monthly and annual revenue and existing business debt are on the new borrower, and that the application is marked converted. | `tests/Feature/EmbedForm/EmbedFormConversionProfileTest.php` (new) | Fixed and verified |

## 2026-10-13 — 6. No backend test covered what conversion copies onto the borrower

- **Problem:** The change that copies the applicant's details onto the borrower profile (2026-10-12, entry 35) had been verified through the browser and the database only.
- **Solution:** A feature test was added. It converts an application through the API and checks that date of birth, the full business address, entity type, industry type, years in business, number of employees, monthly and annual revenue and existing business debt are on the new borrower, and that the application is marked converted.
- **Files:** `tests/Feature/EmbedForm/EmbedFormConversionProfileTest.php` (new)
- **Verified:** `php artisan test tests/Feature/EmbedForm` — 39 passed (38 existing + 1 new).
- **Status:** Fixed and verified
