# 2026-10-12 — Resources — form error handling

**Date:** 2026-10-12  
**Title:** Resources — form error handling  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 16 | Typing into a field after a validation error left it red. | The error key is removed instead of emptied. | `src/pages/resources/ResourceForm.tsx`, `e2e/resources.spec.ts` | Fixed and verified |
| 17 | A non-validation failure was stored in a `general` error that no part of the form renders, so the user got no feedback. | The message is now shown in a toast. | `src/pages/resources/ResourceForm.tsx`, `e2e/resources.spec.ts` | Fixed and verified |
| 32 | The "Business Services" summary card linked to `/business-services`. | The business services are listed further down the same Resources page, so the card now goes to that section (`/resources#business-services`) and scrolls it into view. | `src/pages/resources/Resource.tsx`, `e2e/resources-page.spec.ts` | Fixed and verified |

## 2026-10-12 — 16. Resource form kept a corrected field marked invalid

- **Problem:** Typing into a field after a validation error left it red. The error was reset to an empty array, which is still truthy. Known bug in the suite.
- **Solution:** The error key is removed instead of emptied.
- **Files:** `src/pages/resources/ResourceForm.tsx`, `e2e/resources.spec.ts`
- **Status:** Fixed and verified

## 2026-10-12 — 17. Resource form showed nothing on a server failure

- **Problem:** A non-validation failure was stored in a `general` error that no part of the form renders, so the user got no feedback. Known bug in the suite.
- **Solution:** The message is now shown in a toast.
- **Files:** `src/pages/resources/ResourceForm.tsx`, `e2e/resources.spec.ts`
- **Status:** Fixed and verified

## 2026-10-12 — 32. "Business Services" card on Resources led to a 404

- **Problem:** The "Business Services" summary card linked to `/business-services`. No such route exists, so the card opened the "Page Not Found" screen. Marked in the suite as a known bug.
- **Solution:** The business services are listed further down the same Resources page, so the card now goes to that section (`/resources#business-services`) and scrolls it into view. The test was updated to check the address, that no "Page Not Found" appears and that the section is on screen; its known-bug marker was removed.
- **Files:** `src/pages/resources/Resource.tsx`, `e2e/resources-page.spec.ts`
- **Verified:** `e2e/resources-page.spec.ts` and `e2e/resources.spec.ts` on `http://localhost:5174`, headed — passed. No `test.fail()` marker is left anywhere in `e2e/`.
- **Status:** Fixed and verified
