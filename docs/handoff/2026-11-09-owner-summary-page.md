# Owner Summary page

2026-11-09

## Problem

The host owner had no single screen for the business. The Owner Dashboard design existed only as a mockup (claude.ai artifact `65CMXxY6EEW5jxy66oEKue`).

## Solution

New page at `/owner-summary`, in the sidebar right after Dashboard, built to that design with live data from `GET /common/owner-summary` (see `fch-api` `docs/handoff/2026-11-09-owner-summary-endpoint.md`).

- **Access:** `HostOwnerRoute` and `useIsHostOwner` follow the API's `CommissionViewer::HOST_OWNER` rule. The API checks again.
- **Sections:** headline numbers, needs attention, cash by stream, funding commissions, owed to Four Corner, open applications, lead sources, two monthly charts, partner network, top partners, stalled deals, definitions.
- **Styling:** `ownerSummary.css` carries the design's colours and card styles, scoped under `.os-page` so nothing else in the admin panel changes.
- **Export PDF:** uses the browser's print dialog, with print styles that hide the menus.

Differences from the design:

| Design | Page | Why |
|---|---|---|
| This week / This month / Custom | This month, Last month, Last 30 days, This quarter, This year | The API has no week or custom range yet |
| Report settings button and modal | Left out | No weekly email job exists |
| Month-to-date column in Cash collected | Payments count | The API returns one period |
| "Overdue" | "Unpaid over 30 days" | Invoices have no due date |
| Last change column, pagination in Stalled deals | Left out; longest-waiting 10 shown | The API returns days idle and a capped list |
| Funded volume from partners row | Left out | The API has no such total |
| Seven months in the charts | Six | `CHART_MONTHS` in the API |
| No environment switch | Live / Sandbox switch added | Lets test payments be viewed apart from live ones |

## Files changed

- `src/config/ownerSummary.ts`: new; options, labels, links
- `src/modules/owner-summary/`: new; `services`, `queries`, `types`, `index`
- `src/lib/auth/useIsHostOwner.ts`, `src/lib/auth/HostOwnerRoute.tsx`: new
- `src/lib/auth/index.ts`: exports
- `src/pages/owner-summary/`: new; the page, `ownerSummary.css`, `components/`
- `src/App.jsx`: the route
- `src/components/Layout/Sidebar.jsx`: the menu item and `isHostOwnerOnly` flag. Still `.jsx`; converting a 700-line file was out of scope.
- `e2e/support/routes.ts`: `hostOwner` guard and route entry
- `e2e/sidebar/menu/navigation.spec.ts`: host menu includes Owner Summary
- `e2e/sidebar/owner-summary/`: new mocked and live specs
- `tests/`: new tests for the module, hook, guard, sidebar and page, plus `tests/mocks/ownerSummary.ts`
- `docs/e2e/ISSUES.md`: logged the menu failures below

## Testing

- **Vitest:** full suite, 393 files, 2861 pass, 2 expected fail.
- **Typecheck and build:** pass.
- **E2E, Owner Summary:** 6 mocked and 2 live specs pass. These include no sideways scroll at 390px and all six headline cards on one row at 1440px.
- **E2E, `e2e/sidebar/menu`:** 15 fail. The same 15 fail with this change stashed, so none come from this work. One of them, "lists every module", was updated for the new menu item but still fails on the older "Notification" label mismatch.
- **Checked by eye:** screenshots at 1440px (mock and real local data) and 390px (mock, before the final layout fixes).

## Open items

- Real local data shows cash collected as $0 under Live for November. That is correct: all 3 succeeded local payments that month ($1,002) are sandbox.
- The 15 menu E2E failures still need fixing; see `docs/e2e/ISSUES.md`.
- Weekly report email and Report settings are not built.
- Week and custom-range periods are not built.
- Compliance: this page shows financial data, and its route and API are owner-only. The printed PDF is whatever the owner chooses to do with it.
