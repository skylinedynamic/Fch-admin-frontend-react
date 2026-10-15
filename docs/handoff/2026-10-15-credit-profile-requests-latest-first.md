# Request Credit Profile — latest request first

**Date:** 2026-10-15 · **Branch:** `bugfix/scrum-182` (uncommitted)

## Problem
Intake & Review → Request Credit Profile did not show the latest request first. The screen sent `sort_field: id`, the API ignored it and sorted by `created_at`, and the Request Date column showed `created_at`. A borrower's credit profile request is now one row updated in place when they submit again (fch-api `2026-10-15-credit-profile-request-one-per-borrower.md`), so a resubmission kept its old position and date.

## Solution
The screen opens with `sort_field: updated_at`, `sort_order: desc`, and the Request Date column shows and sorts by `updated_at` — when the request was last submitted. The API now honours the sort (whitelisted) and defaults to `updated_at desc`.

## Files changed
- `src/pages/applications/credit-profile-requests/CreditProfileRequests.tsx` — default sort `updated_at`; date column `updated_at` (falls back to `created_at`).
- `tests/pages/applications/credit-profile-requests/CreditProfileRequests.test.tsx` — asks for `updated_at desc`; dates a row by its latest submission; keeps the API's order.
- `e2e/credit-profile-requests-latest-first.spec.ts` (new, mocked at the API origin) — latest first at the top, resubmission date shown, clicking Request Date sorts by `updated_at`.

## Testing
- Vitest: credit-profile-request suites 24/24 (the two behaviour tests failed before the change).
- `npm run typecheck`: clean.
- Playwright: the new spec 3/3 after `npm run build` (the config only previews `dist/`).

## Open items
- None for the portal. Backend ordering is covered against a real database in fch-api `CreditProfileRequestListOrderTest`.
