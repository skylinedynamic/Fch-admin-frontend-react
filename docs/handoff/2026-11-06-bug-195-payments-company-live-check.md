# BUG-195: Payments COMPANY column (live check)

**Date:** 2026-11-06

## Problem
The Payments list COMPANY column showed "-" on every row. The API sent `company: null` because the list did not load the payer's company columns.

## Solution
The fix is in fch-api (`docs/handoff/2026-11-06-bug-195-payments-company-column.md`). The table already showed `company`, so no UI change was needed. This repo adds the live check.

## Files changed
- `e2e/sidebar/payments/payments-company.live.spec.ts` (new). It opens `/payments` against the real API and checks that:
  - at least one row has a company
  - each row's COMPANY cell shows the response's company, or "-" when there is none

## Testing
- Before the fch-api fix: failed (no row with a company). After: passed.
- `E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live e2e/sidebar/payments/`: 8/8 passed.

## Open items
- Live E2E runs as the host only. The partner side is covered by the fch-api feature test and an API check as partners 42 and 38.
- Not committed.
