# 2026-10-12 — Payments — search term from the URL

**Date:** 2026-10-12  
**Title:** Payments — search term from the URL  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 14 | The invoice list's "Review" button links to `/payments?search=<invoice id>`, but the Payments page never read the query string, so the list opened unfiltered. | The search box and the applied search both start from the URL value. | `src/pages/payments/Payments.jsx`, `e2e/payments-invoices.spec.ts` | Fixed and verified |

## 2026-10-12 — 14. Payments ignored `?search=` in the URL

- **Problem:** The invoice list's "Review" button links to `/payments?search=<invoice id>`, but the Payments page never read the query string, so the list opened unfiltered. Known bug in the suite.
- **Solution:** The search box and the applied search both start from the URL value.
- **Files:** `src/pages/payments/Payments.jsx`, `e2e/payments-invoices.spec.ts`
- **Verified:** Spec passes with its known-bug marker removed.
- **Status:** Fixed and verified
