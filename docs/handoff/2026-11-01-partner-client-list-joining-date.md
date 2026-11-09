# Partner profile Client list: Joining Date is the day the client was created

**Date:** 2026-11-01
**Branch:** bugfix/all-bugfix (working tree, not committed)

## Problem
Partners › a partner › **Client** tab. The "Joining Date" column showed `business_start_date` (when the business started) instead of the day the client was created.

## Solution
The column, its filter and the global filter fields now use `created_at`. The API returns it as a date only through the backend's `toDateOnly()` helper (fch-api handoff of the same name), so the page shows the value unchanged.

## Files changed
- `src/pages/partners/components/ClientListSection.jsx`: the Joining Date column, its filter key and `globalFilterFields` use `created_at`.
- `e2e/sidebar/partners/partner-profile.spec.ts`: new test. The column shows `created_at` and not `business_start_date`.

## Testing
- The new E2E test failed before the change and passes after it.
- `e2e/sidebar/partners/partner-profile.spec.ts`: 39 passed (mock project).
- `npm run typecheck`: clean.

## Open items
- `ClientListSection.jsx` still calls `fetchBorrowers` from `services.ts` directly instead of through a query hook. It was left as is to keep this change small.
- Needs the fch-api change deployed at the same time; without it the column is empty.
