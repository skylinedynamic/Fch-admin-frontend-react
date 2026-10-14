# 2026-10-12 — Lenders — product categories sent as names

**Date:** 2026-10-12  
**Title:** Lenders — product categories sent as names  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 18 | Until the category list loaded, the form offered a hardcoded fallback list whose values are names. | Only categories returned by the API are offered, and the field is disabled while they load. | `src/pages/lenders/LenderForm.tsx` | Fixed and verified |

## 2026-10-12 — 18. Lender form sent category names where the API needs ids

- **Problem:** Until the category list loaded, the form offered a hardcoded fallback list whose values are names. Picking one early sent `["Business Line of Credit"]` and the save failed with "The product_categories.0 field must be an integer." Found during the real-database create pass.
- **Solution:** Only categories returned by the API are offered, and the field is disabled while they load. The hardcoded fallback is no longer used.
- **Files:** `src/pages/lenders/LenderForm.tsx`
- **Verified:** Browser, host — the form sends `[1]`, the API answers 201 "Lender created successfully", and the lender was deleted again.
- **Status:** Fixed and verified
