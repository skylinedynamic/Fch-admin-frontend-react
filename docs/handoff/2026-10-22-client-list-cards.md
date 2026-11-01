# Clients list cards per viewer

**Date:** 2026-10-22
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
The Clients page (`/clients`) showed everyone the same four cards: Active Clients, New This Month, Total Clients and Inactive Clients. The host couldn't see how its book splits between its own clients and its partners'. Partners had no count of suspended clients.

## Solution
`ClientStats` now picks the cards from `isHost`. Host owner and host staff see the host cards; every other partner login sees the partner cards.

| Viewer | Cards |
|---|---|
| Host | Total Clients · Host Clients · Partner Clients · Active Clients |
| Partner | Total Clients · Active Clients · Inactive Clients · Suspended Clients |

The figures come from `fch-api`'s `BorrowerService::list()` statistics. That endpoint gained `host_borrowers`, `partner_borrowers` and `suspended_borrowers` (see the fch-api handoff of the same date). As before, the cards count the partner-scoped totals, exclude deleted and archived clients, and ignore the table's search and filters. "New This Month" is no longer shown, but the API still sends it.

Local data: the host sees 49 total, 35 host, 14 partner, 32 active. Partner 6 sees 4 total, 2 active, 2 inactive, 0 suspended.

## Files changed
- `src/pages/clients/components/ClientStats.tsx`: per-viewer cards
- `src/modules/client/types.ts`: `ClientListStatistics` gains `suspended_borrowers`, `host_borrowers`, `partner_borrowers`
- `e2e/sidebar/clients/clients-list.spec.ts`: statistics cases for the host and partner card sets

## Testing
- Added `tests/pages/clients/components/ClientStats.test.tsx`: host cards, partner cards, loading skeleton. The card tests failed before the change and pass after. The loading test's selector was fixed, since the skeleton is also a `.card`.
- `tests/pages/clients`: 6 files, 34 tests passed. `npm run typecheck` passed.
- E2E updated but **not run**: there's no Playwright browser on this machine (`npx playwright install chromium`).

## Open items
- Run the Playwright clients specs once the browser is installed.
