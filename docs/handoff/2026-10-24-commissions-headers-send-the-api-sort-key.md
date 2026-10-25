# Commissions — each header sends the sort key the API knows (BUG-073)

2026-10-24

## Problem
QA defect log **BUG-073** (OP-COMM-04): sorting Commissions by Date, Borrower, Partner, Requested or Funded Amount answered 500 and emptied the table and cards. The Date, Borrower and Partner headers sent their display fields (`date`, `borrower`, `partner`) as `sort_field`; the API had no column by those names, nor any sort for the borrower, partner or the two amounts.

## Solution
- `CommissionList.tsx`: the Date, Borrower and Partner columns carry PrimeReact's `sortField` — `created_at`, `borrower_name`, `partner_name` — so the header shows the display field but sorts by the API's key. Requested / Funded Amount already sent `requested_amount` / `funded_amount`.
- The API now sorts by all of these, and falls back to newest first for any field it does not know — see fch-api `docs/handoff/2026-10-24-commissions-sort-by-every-column.md`.

## Files changed
- `src/pages/commissions/CommissionList.tsx` — `sortField` on Date, Borrower, Partner.
- `tests/pages/commissions/CommissionList.sort.test.tsx` — new, 7 tests (one per sortable header).
- `e2e/sidebar/commissions/commissions.spec.ts` — +5 tests: each header sends its key and the rows stay.

## Testing
- New Vitest: Date and Borrower failed first (sent `date` / `borrower`), pass after; full suite 245 files, 1718 passed. `npm run typecheck` clean.
- E2E (mock) `e2e/sidebar/commissions`: 26 passed.

## Open items
- Mark BUG-073 in the QA defect log Fixed after the stage retest.
