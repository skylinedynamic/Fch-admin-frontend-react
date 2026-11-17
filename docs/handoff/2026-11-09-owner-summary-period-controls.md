# Owner Summary period controls

2026-11-09

## Problem

The Owner Summary page (`/owner-summary`) offered This month, Last month, Last 30 days, This quarter and This year. The approved design has This week, This month and Custom, with a From/To panel using dates the owner chooses.

## Solution

- **Period buttons:** now This week, This month and Custom. This month is still the default.
- **Custom panel:** choosing Custom opens From and To, starting on the year up to today (9 Nov 2025 to 9 Nov 2026), at the owner's request. On 29 Feb, From uses the 28th. The numbers only change on Apply.
- **Calendar:** the app's own `primereact/calendar` (`CalendarWrapper`), set up the same way as the app's other form calendars. It stops at today and prevents To before From.
- **No length limit:** the design's 366-day limit was removed at the owner's request; the helper text now reads "Not in the future. Compared with the same number of days just before."
- **Validation:** the API decides what is allowed. A refused range shows under its field, never as a toast, and clears when that date changes.
- **Refused ranges keep the numbers:** TanStack Query drops the previous data when a request fails, so the page keeps its last good summary when the API returns 422. A 422 is also not retried.
- **Live and Sandbox:** kept at first, then removed; see `2026-11-09-owner-report-settings.md`.
- **Labels now follow the response:** the "Showing" line and the cash column come from `data.period.key`, not the selected button, so they always describe the numbers on screen.

Also fixed: `dateRange()` wrote "Sept" because of the `en-GB` locale, and a one-day range now shows its date once.

- **Headline cards (changed later at the owner's request):** seven cards in `KpiCards.tsx`: Net earnings, Funded volume, Funded deals, Partners, Clients, Leads and Lead-to-funded, with Host and Partners rows where they apply. Seven across only at 1920px and wider, four otherwise, then two, then one on a phone. Cash collected is now called Net Earnings on its card and chart too. The Net Earnings, Funding Commissions and Owed row sits straight after the cards, above Needs Attention. Visible text says FCH, never Host, and card and section titles capitalize every word. Definitions are in `fch-api` `docs/handoff/2026-11-09-owner-weekly-report.md`.

- **Loading state:** on first load, `OwnerSummarySkeleton.tsx` mirrors the top of the page (Showing line, seven cards, the Net Earnings row, Needs Attention) using the real layout classes, so the grid matches at every width. Changing the period or payments switch keeps the numbers on screen instead. The Report settings dialog keeps its single block.

## Files changed

- `src/pages/owner-summary/components/OwnerSummarySkeleton.tsx`: new
- `src/pages/owner-summary/components/KpiCards.tsx`: rewritten for the seven cards
- `src/pages/owner-summary/components/CashCard.tsx`, `Definitions.tsx`, `OwnerSummary.tsx`, `ownerSummary.css`: new names, wording and card layout
- `src/modules/owner-summary/types.ts`, `tests/mocks/ownerSummary.ts`: the API's new `kpis` fields

- `src/config/ownerSummary.ts`: `THIS_WEEK`, `CUSTOM`, the three options and the maximum days
- `src/modules/owner-summary/types.ts`: `from` and `to` params
- `src/modules/owner-summary/queries.ts`: dates in the query key; no retry on 422
- `src/pages/owner-summary/OwnerSummary.tsx`: selected and requested period, refused ranges, "Showing" line
- `src/pages/owner-summary/components/CustomRangePanel.tsx`: new
- `src/pages/owner-summary/components/format.ts`: `daysInRange()`, `lastYearRange()`, `dateRange()` fixes
- `src/pages/owner-summary/ownerSummary.css`: panel styles, 37.5px fields, hidden when printing
- `tests/pages/owner-summary/OwnerSummary.test.tsx`: period and custom range cases
- `tests/pages/owner-summary/format.test.ts`: new
- `tests/modules/owner-summary/queries.test.tsx`, `services.test.ts`: query key, retry and date params
- `e2e/sidebar/owner-summary/owner-summary.spec.ts`, `owner-summary.live.spec.ts`: new periods and custom range flows

## Testing

- **Vitest:** owner summary, sidebar and calendar tests: 61 pass. New tests were written first and failed before the change.
- **After the skeleton loader:** Vitest owner summary page and module tests: 67 pass. `owner-summary.spec.ts` and `owner-summary.live.spec.ts`: 20 pass with `--workers=1`. Typecheck passes.
- **After the one-year start dates:** Vitest owner summary page and module tests: 56 pass. `owner-summary.spec.ts`: 12 pass with `--workers=1`; run in parallel on a cold dev server, pages can time out on first load.
- **Mocked E2E:** `owner-summary.spec.ts`: 9 pass.
- **Live E2E:** `owner-summary.live.spec.ts` against the local API: 4 passed, including login setup. Run before the final CSS-only height fix.
- **Typecheck:** passes.
- **Not run:** the full Vitest and E2E suites.
- **Unrelated failures:** 4 tests in `e2e/sidebar/menu/navigation.spec.ts` fail. Three expect the label "Notification" where the sidebar says "Notifications", and one expects `/admin/settings` to stay put where it now goes to `/settings/payment-integration`. No file in this change affects them, so they were left alone.

## Open items

- **Report settings:** built afterwards, see `2026-11-09-owner-report-settings.md`.
- **Page name:** the design says "Owner Dashboard"; the page and sidebar still say "Owner Summary".
- **Removed from the screen:** Last month, Last 30 days, This quarter and This year. The API still accepts them.
- API side: `fch-api` `docs/handoff/2026-11-09-owner-summary-week-and-custom-periods.md`.
