# 2026-10-28 — Coverage run exit 1, and the Funding Request step loading by the wrong id

## At a glance
| | |
|---|---|
| **Problem** | `npm run test:coverage` ended with exit code 1. Two causes: (1) runs overlapping in the same folder crashed Vitest with "Something removed the coverage directory coverage/.tmp"; (2) the Funding Request step tests were flaky because the step re-fetched the request with the wrong id. |
| **Solution** | (1) No code change — run one coverage run at a time per folder. (2) The step now loads only by the funding request id; the application's own id is kept just for saving. |
| **Changed** | `src/pages/applications/fundapplication/components/steps/FundingRequestStep.tsx`, `tests/pages/applications/fundapplication/components/steps/FundingRequestStep.test.tsx` |

## 2026-10-28 — Coverage directory removed (exit 1)
**Problem:** Every `vitest run --coverage` empties `coverage/.tmp` when it starts. A second run started in the same folder (another terminal, editor test runner, another session) deletes the first run's files; the first then fails with an Unhandled Rejection and exit code 1. Branch checkouts/merges during a run also gave random failures (`... is not a function`, `Cannot find module`), and two suites at once starved CPU so tests hit the 20 s timeout.
**Solution:** Not a code bug. Run one coverage run at a time and don't switch branches while it runs. CI is unaffected (one run per job). A run with `--coverage.reportsDirectory=<own folder>` no longer crashed.
**Status:** Explained; no change.

## 2026-10-28 — Funding Request step re-fetched by the application id
**Problem:** The step loaded `GET common/funding-application/funding-request?funding_request_id=7`, then stored the response's `id` (the funding *application* id, 11) in the same state it loads by, so it fetched again with `funding_request_id=11`. The API treats that as funding request 11 — another request, or nothing — and the step pre-filled the form from that answer. In tests (where the mock answers any id) the second load swapped the form for its skeleton under the user, so the purpose-of-funds tests failed at random under load.
**Solution:** Load with `loadRequestId` (the funding request id from props/route) only. `applicationId` holds the loaded record's `id` and is sent as `id` on save, as before.
**Files:** `FundingRequestStep.tsx`.
**Tests:**
- Added: `loads the request by its funding request id only, never by the application id` (Defect docblock) — failed before the fix.
- Added: `saves to the loaded application, under its funding request` — save sends `id: 11`, `funding_request_id: 7`.
- Updated: `settled()` waited for the wrong `11` fetch; it now waits for the load by `funding_request_id` (7).
- E2E: `e2e/fund-application-funding-request.spec.ts` not changed — its mock uses the same number for both ids.
**Verified:** `FundingRequestStep.test.tsx` 14/14, three runs in a row; `tests/pages/applications` 19 files / 99 tests pass; `tsc --noEmit` clean for the file.
**Status:** Fixed.

## Open / follow-up
- Other full-suite failures seen only under load (MailConfigurationSection, VerificationCenter list, Leads bulk delete, FundingList delete, BlogEdit taxonomy, ContactDetails, Leads convertOwner) all pass on their own; they timed out while two suites ran at once. Re-check with a single clean full run.
- Before saving the application id, the step now sends `id: null` instead of the funding request id. The form shows a skeleton until the load finishes, so a save can't happen in that gap.
