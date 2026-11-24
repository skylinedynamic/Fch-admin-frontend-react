# R3-BUG-054: Pre-Qualification list column filters (error hidden, no Amount / Date filter)

2026-11-24

## Problem
Intake & Review › Pre-Qualification (`/intake-review/pre-qualification`). QA Round 3, R3-BUG-054, Reopened after the 18-Nov retest.
- The Name and Funding Type column filters failed with HTTP 500. The cause was on the API side, fixed in fch-api: see `fch-api/docs/handoff/2026-11-24-r3-bug-054-pre-qualification-column-filters.md`.
- The page hid the failure: a failed request showed "No applications found", as if no data matched.
- Requested Amount and Date had no column filter. Only the Select Date Range picker was available.

## Solution
- **Error message:** when the list request fails (`isError`), the table shows "Could not load the applications. Please try again." instead of "No applications found". An empty list still says "No applications found".
- **Requested Amount:** now has a numeric column filter (`dataType="numeric"`, an `InputNumber`). Its match modes are equals / not equals / less than / greater than etc., and it sends a number.
- **Date:** now has a date column filter (`dataType="date"`, a `Calendar`). Its match modes are date is / is not / before / after.
- **Date value sent to the API:** the filter holds a `Date`. JSON would send it as a UTC ISO string, which east of UTC is the previous day. So the filters go through `toApiColumnFilters()`, which sends each date as the viewer's local `YYYY-MM-DD` (via `toLocalYmd`).
- **Duplication:** the empty filter set was written out twice (`initFilters` and Clear). It is now one `emptyColumnFilters()`.

## Files changed
- `src/pages/applications/pre-qualification/PreQualificationApplication.tsx`: error message, amount and date column filters, filters sent through `toApiColumnFilters`, `emptyColumnFilters()`.
- `src/pages/applications/pre-qualification/components/ColumnFilterInputs.tsx` (new): `AmountFilterInput`, `DateFilterInput`.
- `src/utils/columnFilters.ts` (new): `toApiColumnFilters()`.
- `tests/utils/columnFilters.test.ts` (new): 4 unit tests.
- `tests/pages/applications/pre-qualification/PreQualificationApplication.columnFilters.test.tsx` (new): 4 integration tests.
  - a failed request shows the load error, not "No applications found";
  - an empty list still says "No applications found";
  - Requested Amount and Date have filter buttons;
  - the amount filter sends a number.
- `e2e/sidebar/intake-review/pre-qualification/pre-qualification.spec.ts`: 3 new mock specs.
  - the load error;
  - the amount filter sends a number;
  - the date filter sends the picked local day.

## Testing
- The new Vitest tests were written first: the unit file failed (module missing) and 3 of 4 page tests failed. All pass now.
- Full Vitest suite: 468 files, 3577 passed, 2 expected fail.
- `npm run typecheck`: clean.
- Playwright mock project, `pre-qualification.spec.ts`: 16 passed (after `npm run build`).

## Open items
- Not retested on admin-stage against the live API yet. After deploy, QA should re-run R3-OP-PREQ-02.
- Other lists that use `filterElement`-less date columns could use `toApiColumnFilters` too. They were not touched.
