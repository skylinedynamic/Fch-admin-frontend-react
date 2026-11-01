# QA round 1 - batch 3 (admin portal: BUG-048, BUG-025, BUG-049, BUG-050)

**Date:** 2026-10-24
**Branch:** `bugfix/qa-round1-release` - not committed
**Author:** arafat-invento (with Claude Code)
**API side:** `fch-backend-api/docs/handoff/2026-10-24-qa-round1-batch-3.md` (all 14 bugs)

## Problem
- **BUG-048** Intake & Review > Funding Application: the Status filter listed pre-qualification statuses and did nothing.
- **BUG-025** Client > Funding detail: "1-5 Days Days" (same code as the borrower portal).
- **BUG-049 / BUG-050** Manage Funding Groups / Product Categories: a duplicate name showed "lender.category_name_unique" (API fix); a rename was reported to say "added".

## Solution
- `FundingApplication.tsx` uses `FUNDING_APPLICATION_STATUS_OPTIONS` (the API now applies the status).
- `src/utils/formatters.js` `formatSpeedToFunds()` (+ `.d.ts`), used by `ClientFundingDetail.tsx`.
- BUG-049: no code change - rename already toasts "updated" (✓ and Enter); pinned by tests. BUG-050's message now arrives readable from the API.

- **BUG-003 regression (F150)**: the 21-Oct `release` merge replaced the Leads columns with `LeadTableCells`, which showed "Null" again. Missing values are "—" again, and "null"/"undefined" strings count as empty. `LeadTableCells.test.tsx` expected "Null" - updated to "—".
- `e2e/lead-owner-team.spec.ts`: pre-existing e2e type error (`convert_to: null` inferred as `null`) - type widened, no behaviour change.

## Files changed
- `src/pages/leads/components/LeadTableCells.tsx` - "—" for missing, "null" text is empty
- `e2e/lead-owner-team.spec.ts` - type only
- `src/pages/applications/funding/FundingApplication.tsx`
- `src/utils/formatters.js`, `src/utils/formatters.d.ts`
- `src/pages/clients/components/ClientFundingDetail.tsx`

## Tests
- Added: `tests/pages/applications/funding/FundingApplication.statusFilter.test.tsx`, `tests/pages/funding/components/ManageNamesModals.test.tsx`, `formatSpeedToFunds` cases in `tests/utils/formatters.test.ts`
- e2e (mock): status filter case in `e2e/sidebar/intake-review/funding-application/funding-application.spec.ts`; rename/duplicate checks in `e2e/sidebar/lenders/lenders.spec.ts` and `e2e/sidebar/funding-sequence/funding.spec.ts`
- Suites run: `npx vitest run`, `tsc --noEmit`, `typecheck:e2e`, `npm run test:e2e` - see the report for this branch

## Open / follow-up
- API O69 (BUG-049) - QA to retest.
