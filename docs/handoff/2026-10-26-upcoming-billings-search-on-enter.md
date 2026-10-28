# Upcoming Billings search applies on Enter (BUG-006)

Date: 2026-10-26

## Problem
Owner › Upcoming Billings (`/billing`): typing in **Search** and pressing **Enter** did nothing (no API call, the rows stayed). The search applied only after clicking **Filters**. Every other list (Funding Applications, Credit Profile Requests, Change Requests, …) applies on Enter. `BillingFilters.jsx` blocked Enter on purpose with `e.preventDefault()`.

## Solution
The search box now calls `onApply()` on Enter, the same one-liner the other lists use. The dropdowns still apply only via **Filters**, and typing still fires no request per keystroke. The comment explaining the staged filters was updated.

## Files changed
- `src/pages/billing/components/BillingFilters.jsx`: Enter in the search box applies the filters.
- `tests/pages/billing/Billing.list.test.tsx`: the list suite's search case now applies with Enter (`apply: 'enter'`).
- `e2e/sidebar/upcoming-billings/upcoming-billings.spec.ts`: new case, Enter sends `search` to `POST /common/billing/fetch-upcoming`.

## Testing
- Vitest `tests/pages/billing`: failed first (1 failed, 3 passed), then 4/4 passed after the fix.
- `npm run typecheck`: clean.
- Mock E2E `e2e/sidebar/upcoming-billings/upcoming-billings.spec.ts`: 7/7 passed.

## Open items
- None.
