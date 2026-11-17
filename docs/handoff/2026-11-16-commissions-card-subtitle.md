# Funding Commissions card: subtitle

2026-11-16

## Problem
On Business Insights (`/owner-summary`), the Funding Commissions card said "Booked on deals funded this period; not cash until the lender pays". The card only counts Closed - Completed deals, and a deal closes once the lender pays, so "not cash until the lender pays" was wrong.

## Solution
The subtitle now reads **"Commission on deals closed this period"**. The weekly email and the PDF use the same wording from `fch-api` (`owner_summary.report.commissions_sub`); see `fch-api/docs/handoff/2026-11-16-commissions-card-subtitle.md`.

## Files changed
- `src/pages/owner-summary/components/CommissionsCard.tsx`: new subtitle; doc comment updated.
- `src/modules/owner-summary/types.ts`: `OwnerCommissions` comment updated.
- `tests/pages/owner-summary/OwnerSummary.test.tsx`: expects the new subtitle and checks the old one is gone.
- `e2e/sidebar/owner-summary/owner-summary.live.spec.ts`: checks the new subtitle against the real API.

## Testing
- Vitest test changed first: failed (red), as expected.
- After the fix: `tests/pages/owner-summary` 61 passed, 1 failed (see below). `npm run typecheck` clean.
- Playwright live: `owner-summary.live.spec.ts` "shows the headline numbers and every section" passed.

## Open items
- `OwnerSummary.test.tsx` › "says which period is showing and what it is compared with" was already failing before this change (it looks for the text "FCH owner only"). It is not related to this change and was not touched.
