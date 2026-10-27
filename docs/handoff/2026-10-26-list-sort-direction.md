# List sort direction no longer inverted (BUG-010)

Date: 2026-10-26

## Problem
The first click on a sortable header (shown as ascending) listed Z-A on Capital Access, Credit Accounts and Employees: the API inverted the order it was sent (fixed in `fch-api`, handoff of the same name). Manage Tier loaded pre-sorted on Name ascending, so its first Name click went Tier 4…Tier 0.

## Solution
- Capital Access, Credit Accounts and Employees now load with `id desc`, which keeps newest first now that the API no longer inverts.
- Manage Tier loads by `order` (the API's default, not a column), so no header starts pre-sorted and the first Name click is A-Z.
- The shared list test contract gained a `sort` option: the first request's sort and the first header click asking for ascending.

## Files changed
- `src/pages/capital-access/CapitalAccessList.tsx`: default `sortOrder` `desc`.
- `src/pages/credit-builder/credit-accounts/CreditAccountsList.jsx`: default `sortOrder` `desc`.
- `src/pages/employees/hooks/useEmployeeList.js`: default `sortOrder` `desc`.
- `src/pages/tiers/TiersList.jsx`: default `sortField` `order`.
- `tests/pages/listPageSuite.tsx`: new `sort` spec option (2 tests).
- `tests/pages/capital-access/CapitalAccess.list.test.tsx`, `tests/pages/credit-builder/CreditAccounts.list.test.tsx`, `tests/pages/tiers/Tiers.list.test.tsx`: `sort` specs.
- `tests/pages/employees/Employees.list.test.tsx`: new list test for Employees.
- `e2e/sidebar/capital-access/capital-access.spec.ts`, `e2e/sidebar/credit-builder/credit-accounts/credit-accounts.spec.ts`, `e2e/sidebar/credit-builder/manage-tier/tiers.spec.ts`, `e2e/sidebar/employees/employees.spec.ts`: one case each for the load sort and the first header click.

## Testing
- Vitest on the four lists: 5 failed before the change, 33/33 passed after. Full suite: 259 files, 1814 passed (2 expected fail).
- `npm run typecheck`: clean.
- Mock E2E on the four specs: 95/95 passed.

## Open items
- Deploy together with the `fch-api` change.
