# 2026-10-12 — Client documents — host employee permission

**Date:** 2026-10-12  
**Title:** Client documents — host employee permission  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 13 | The Documents tab treated any user with `is_host` as fully permitted, so a host employee holding neither "delete borrower documents" nor "update borrower documents status" could delete documents and change their status. | Only the host account itself (`is_host` and `entity_type` "Partner") keeps the full access. | `src/pages/clients/components/ClientDocumentsSection.tsx`, `e2e/client-profile-tabs.spec.ts` | Fixed and verified |

## 2026-10-12 — 13. Host employee could manage client documents without permission

- **Problem:** The Documents tab treated any user with `is_host` as fully permitted, so a host employee holding neither "delete borrower documents" nor "update borrower documents status" could delete documents and change their status. Marked in the suite as a known bug.
- **Solution:** Only the host account itself (`is_host` and `entity_type` "Partner") keeps the full access. Host employees are limited to their role's permissions. The test's "all permissions" fixture relied on the old bypass and did not include the view/upload permissions; it now does.
- **Files:** `src/pages/clients/components/ClientDocumentsSection.tsx`, `e2e/client-profile-tabs.spec.ts`
- **Verified:** Client-profile specs, 56 passed.
- **Status:** Fixed and verified
