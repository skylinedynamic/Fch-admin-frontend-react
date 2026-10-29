# Funding Applications list: Company Name column

**Date:** 2026-10-27
**Branch:** feature/new-walk-through
**Author:** Awlad Hossain

## Problem
Host Admin > Intake & Review > Funding Application > the Funding Applications list showed the person's Name but not the company. One person can apply for several companies, so staff mistook which business an application belonged to, and the system emailed the wrong company.

## Solution
- The **Entity Type** column is replaced by **Company Name**. The list now starts Name | Company Name | App No | …
- Company Name shows the application's own `business_name`. Each application stores its own company, so a person with two companies shows a different company on each row. It shows "-" when empty.
- The column is sortable and has a filter, like the others. Its filter took Entity Type's place in the filter setup.
- List display only: `entity_type` is still sent by the API and kept on the application (the detail page still shows it). No API change was needed: the list response already includes `business_name`, and the search box already searches it.

### Dashboard: Recent Funding Applications
- Same change on the admin Dashboard: **Entity Type** is replaced by **Company Name**, right after Borrower. It shows "N/A" when empty.
- **Funding Type** no longer stretches the table: a long list of types stays on one line, at most 260px wide (`FUNDING_TYPE_MAX_WIDTH`), cut off with "…". The full text shows on hover (`title`).
- This needed the company in the dashboard data: fch-api's `DashboardFundingApplicationResource` now sends `business_name` (fch-api handoff of the same date).

## Files changed
- `src/pages/applications/funding/FundingApplication.tsx`: Company Name column after Name; Entity Type column and its filter removed
- `src/modules/application/types.ts`: `business_name` on the list row type
- `src/pages/dashboard/Dashboard.jsx`: Recent Funding Applications shows Company Name instead of Entity Type; Funding Type capped at 260px with the full text on hover

## Testing
- Added `tests/pages/applications/funding/FundingApplication.test.tsx` (3; the first two failed before the change):
  - column order is Name, Company Name, with no Entity Type
  - the same person's two applications each show their own company
  - "-" for an application with no company
- Updated E2E `e2e/sidebar/intake-review/funding-application/funding-application.spec.ts`: the rows carry company names, and a new test checks the header order and each row's company.
- Dashboard: `tests/pages/dashboard/Dashboard.test.tsx`, three new tests, all failing before the change:
  - Company Name right after Borrower, with no Entity Type
  - each row's own company, and "N/A" when there is none
  - Funding Type is cut off at 260px with the full text in `title`
- Dashboard E2E: `e2e/sidebar/dashboard/dashboard.spec.ts` checks the same in a real browser, including that the Funding Type cell is at most 300px wide.
- Run: `tests/pages/applications` 76/76; `tests/pages/dashboard` 11/11; `npm run typecheck` clean; E2E (mock project) funding-application spec 6/6, dashboard spec 5/5.

## Open items
- The Dashboard card's "View All" link goes to the Funding Request list (`/intake-review/funding-request`), not Funding Applications. Left as it is; confirm which list it should open.
- The list endpoint returns the full application for every row (`FundingApplicationResource`), including the applicant's SSN, date of birth and address, although the table shows none of them. A slimmer list response in fch-api would stop sending that data. Not part of this change.
