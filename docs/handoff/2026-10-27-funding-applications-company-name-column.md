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

## Files changed
- `src/pages/applications/funding/FundingApplication.tsx`: Company Name column after Name; Entity Type column and its filter removed
- `src/modules/application/types.ts`: `business_name` on the list row type

## Testing
- Added `tests/pages/applications/funding/FundingApplication.test.tsx` (3; the first two failed before the change):
  - column order is Name, Company Name, with no Entity Type
  - the same person's two applications each show their own company
  - "-" for an application with no company
- Updated E2E `e2e/sidebar/intake-review/funding-application/funding-application.spec.ts`: the rows carry company names, and a new test checks the header order and each row's company.
- Run: `tests/pages/applications` 76/76; `npm run typecheck` clean; that E2E spec 6/6 (mock project).

## Open items
- The list endpoint returns the full application for every row (`FundingApplicationResource`), including the applicant's SSN, date of birth and address, although the table shows none of them. A slimmer list response in fch-api would stop sending that data. Not part of this change.
