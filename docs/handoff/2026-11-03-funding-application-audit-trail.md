# Funding application Audit Trail page (replaces Document Audit History)

**Date:** 2026-11-03
**Branch:** bugfix/round-2
**Author:** Awlad Hossain

## Problem
Intake & Review › Funding Application › Audit History showed only downloads. It came from the old `download_histories` API, which fch-api has replaced with a full audit trail (fch-api handoff with the same name). Only the host could open it. A partner was redirected away, and the details page hid the button from partners. The page's "download from history" served a copy that later downloads had overwritten. The details page also had an unreachable "Document Audit History" table built on `download_histories`.

## Solution
- **New module `src/modules/application-audit`** (`types` / `services` / `queries` / `index`):
  - `getFundingApplicationAuditTrail`: GET, only the filters that are set.
  - `exportFundingApplicationAuditTrail`: CSV.
  - `downloadAuditEventFile`: the copy the trail kept.
  - `useFundingApplicationAuditTrail` (keeps the previous page while the next loads), plus export and file-download mutations.
- **`src/config/auditConfig.ts`:** the event constants (they mirror the API), filter options, icons, page sizes, and which context keys are shown.
- **New page `FundingApplicationAuditTrail.tsx`** on the same route (`/intake-review/funding-application/:id/audit-history`), laid out like the other Intake & Review lists (user request): `page-content-fit`, a filter row (search box, event Dropdown, Filters / Clear applied on click), and the PrimeReact DataTable with its paginator. The cells are in `components/audit/AuditEventCells.tsx` and the filter row in `AuditTrailFilters.tsx`. The integrity badge, an **Actions** menu (`AuditTrailActions.tsx`: Export CSV, Export PDF, from `AUDIT_EXPORT_OPTIONS`) and Back sit in the page header:
  - **Event rows:** each event with when (local time; the API keeps UTC), who, role, IP, and each changed field old → new (SSNs as the API masked them).
  - **Download events:** "Password protected", what was downloaded and its SHA-256.
  - **Badges:** imported (legacy) events are badged.
  - **Integrity:** a header badge, "Integrity verified (N)" or "Integrity check failed at event #N".
  - **Controls:** filter by event, search, CSV or PDF export (the API's `format`; the applied filters go with it), rows per page, previous and next.
  - **Errors:** the API's own message, e.g. "Funding application not found." for another partner's application.
- **Documents:** the API keeps no copy of a document, only its SHA-256, so a document event shows the hash with no Download button (`downloadable: false`). Signed copies still download.
- **No hard-coded text:** every word and message on the page is in `AUDIT_TEXT` (`src/config/auditConfig.ts`).
- **Who sees it:** host and partner both. The details page shows **Audit Trail** to everyone who can open the application. The API scopes the trail: host all, partner own.
- **Removed:**
  - `FundingApplicationAuditHistory.tsx` and `assets/css/audit-history.css`
  - `getFundingApplicationAuditHistory`, `downloadHistoryFile`, `useFundingApplicationAuditHistory`
  - the `DownloadHistory` type and `download_histories`
  - the unreachable download-history table on the details page (the certificate section next to it is unchanged)

## Files changed
- **New:**
  - `src/config/auditConfig.ts`
  - `src/modules/application-audit/{types,services,queries,index}.ts`
  - `src/pages/applications/funding/FundingApplicationAuditTrail.tsx`
  - `src/pages/applications/funding/components/audit/{AuditEventCells,AuditTrailFilters,AuditTrailActions}.tsx`
- **Changed:**
  - `src/App.jsx` (route component)
  - `src/pages/applications/funding/FundingApplicationDetails.tsx`: Audit Trail link for all; old table removed.
  - `src/modules/application/{services,queries,types}.ts`: old audit code removed.
- **Deleted:** `src/pages/applications/funding/FundingApplicationAuditHistory.tsx`, `assets/css/audit-history.css`.

## Testing
- **Unit:** `tests/modules/application-audit/services.test.ts` (4, incl. the PDF export with `format=pdf`) and `queries.test.tsx` (3).
- **Integration:** `tests/pages/applications/funding/FundingApplicationAuditTrail.test.tsx` (10: partner reads it; changes old/new; download details; file download; integrity; filter; CSV and PDF export from the Actions menu; empty; not found). `FundingApplicationDetails.test.tsx` has a new "Audit Trail" block: the link for host and partner, and no old table.
- The old audit-history tests in `tests/modules/application/{services,queries}` were removed with the endpoint they called. The new module tests cover the new endpoint.
- **E2E:**
  - New `e2e/sidebar/intake-review/funding-application/funding-application-audit-trail.spec.ts` (8, mocked, incl. Actions › Export CSV and Export PDF): 8/8 passed.
  - `funding-application.live.spec.ts` updated to "Audit Trail" and passes against the local API.
  - `funding-application.spec.ts` and `activity-task-assign.spec.ts` failed once under heavy parallel load, then passed 9/9 with 2 workers. They were untouched.
- The new tests failed first (missing modules and page).
- `npm run typecheck`: clean. Vitest full run (final): 353 files, 2507 passed, 2 expected fail, 0 failed.

## Open items
- Rebuild before the mock e2e (`npm run build`): it serves `dist/`.
- The page has no column sorting by field; the API offers newest or oldest first only.
