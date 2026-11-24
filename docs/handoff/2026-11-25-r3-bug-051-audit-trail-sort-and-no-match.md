# R3-BUG-051: Audit Trail sort, and the "nothing matches" message

2026-11-25

## Problem
Intake & Review › Funding Application › Audit Trail (`/intake-review/funding-application/:id/audit-history`):
- **No sort control.** The trail was always newest first, although the API takes `sort_dir=asc|desc`.
- **Wrong empty message.** A search that found nothing showed "No audit events recorded yet". The events exist; they just don't match.

The search finding labels ("Business Phone", "Status changed") in any case is fixed in fch-api: `docs/handoff/2026-11-25-r3-bug-051-audit-trail-search-labels-any-case.md`.

(QA Round 3, R3-BUG-051.)

## Solution
- **Sort:** a dropdown in the filter row, "Newest first" (the default) or "Oldest first".
  - It takes effect at once and goes back to page 1, like the event filter's Clear.
  - It sends `sort_dir` with the list and with both exports, so the CSV/PDF is in the order shown.
- **Empty message:** with a search or an event filter applied, an empty table says "No audit events match your search or filter.". With no filter, it still says "No audit events recorded yet".
- The sort values, options and texts are in `src/config/auditConfig.ts`: `AUDIT_SORT`, `AUDIT_SORT_OPTIONS`, `AUDIT_TEXT.NO_MATCH` and `AUDIT_TEXT.SORT_LABEL`.

## Files changed
- `src/config/auditConfig.ts`: `AUDIT_SORT`, `AuditSortDirection`, `AUDIT_SORT_OPTIONS`, `NO_MATCH`, `SORT_LABEL`.
- `src/modules/application-audit/types.ts`: `sort_dir` typed as `AuditSortDirection`.
- `src/pages/applications/funding/components/audit/AuditTrailFilters.tsx`: the sort dropdown (`.audit-sort-filter`).
- `src/pages/applications/funding/FundingApplicationAuditTrail.tsx`: sort state, `sort_dir` on the list and the export, and the empty message by filter.
- `tests/pages/applications/funding/FundingApplicationAuditTrail.test.tsx`: 2 new tests.
  - The list opens with `sort_dir=desc`. "Oldest first" sends `asc` at once, and the CSV export carries it.
  - A search that finds nothing shows the no-match message, not "recorded yet".
- `e2e/sidebar/intake-review/funding-application/funding-application-audit-trail.spec.ts`: 2 new mock specs for the same two behaviours.

## Testing
- Both new Vitest tests failed first. After the change, `tests/pages/applications/funding`, `tests/modules/application-audit` and `tests/config`: 25 files, 210 passed.
- `npm run typecheck`: clean.
- Playwright mock, `funding-application-audit-trail.spec.ts`: 10 passed (after `npm run build`).

## Open items
- Not retested on admin-stage yet.
