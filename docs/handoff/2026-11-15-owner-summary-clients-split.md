# Owner Summary: clients split between FCH and partners

2026-11-15

## Problem
On `/owner-summary` the Clients KPI card showed a total with Active / New this period rows. It didn't show FCH's own clients and partners' clients separately, unlike Funded Volume, Funded Deals and Leads.

## Solution
fch-api now returns `kpis.clients.host` and `kpis.clients.partners` (non-archived; together they equal the total). The card uses the same FCH / Partners rows as the other split cards. Active and new move to the card note ("35 active · 8 new this period"), so the card stays the same height as its neighbours.

## Files changed
- `src/modules/owner-summary/types.ts`: `clients` gains `host` / `partners`
- `src/pages/owner-summary/components/KpiCards.tsx`: Clients card shows FCH/Partners rows plus an active/new note
- `tests/mocks/ownerSummary.ts`: fixture follows the new API shape
- `tests/pages/owner-summary/OwnerSummary.test.tsx`: asserts the split and the note
- `e2e/sidebar/owner-summary/owner-summary.spec.ts`: mocked flow asserts the split and the note
- `e2e/sidebar/owner-summary/owner-summary.live.spec.ts`: asserts the real API gives FCH/Partners rows

## Testing
- Vitest `tests/pages/owner-summary` + `tests/modules/owner-summary`: 67 passed (the integration assertion was red first). `npm run typecheck`: clean.
- Playwright mocked `owner-summary.spec.ts`: 15 passed with `--workers=1`. With the default workers, 8 timed out under load; each one passes alone.
- Playwright live `owner-summary.live.spec.ts`: 4 passed, 1 failed. `pageHeading(page, 'Owner Summary')` no longer matches because of the uncommitted heading rename to "Business Insights" in `OwnerSummary.tsx`. The failure is before the new clients assertions, so those were not run live.
- Vitest must be run from an uppercase `C:\` path. Running from `c:\` fails with "Vitest failed to find the runner".

## Open items
- After the heading rename is decided, update the live spec's heading (and the sidebar label if it changes too), then re-run the live spec.
