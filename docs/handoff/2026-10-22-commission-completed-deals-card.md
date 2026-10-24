# Commissions page: Completed Deals card

**Date:** 2026-10-22
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
On the Commissions page (`/commissions`), a white-label or certified partner saw a "Total Deals" card that counted every commission row, whatever its status. The business wanted the card to show completed deals.

## Solution
The card is renamed "Completed Deals" and shows `statistics.completed_deals`. That field is new in `fch-api` (`CommissionService::getCommissions()`) and counts commissions with status `Completed`. The API still sends `total_deals`, so nothing else breaks.

As part of the same `fch-api` change, every card on this page now shows the full totals and no longer changes when the table is filtered by payment/commission status or search. Only the host's Partner filter still narrows them. The frontend needed no change for that.

## Files changed
- `src/pages/commissions/CommissionList.tsx`: card title and value switched to `completed_deals`
- `src/modules/commission/types.ts`: `CommissionStatistics.completed_deals`

## Testing
- Added `tests/pages/commissions/CommissionList.cards.test.tsx`: a partner sees "Completed Deals" with the API's `completed_deals` value, and no "Total Deals" card. It failed before the change and passes after.
- Ran `tests/pages/commissions` and `tests/modules/commission`: 5 files, 16 tests passed. `npm run typecheck` passed.

## Open items
- No Playwright spec covers this card.
- `npm run typecheck` and vitest crashed once with "Fatal process out of memory: Zone" while the machine had only about 2 GB of RAM free. They passed when rerun.
