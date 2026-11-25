# R3-BUG-053: Edit page read the funding request three times

2026-11-25

## Problem
Opening `/intake-review/funding-application/113/edit` sent `GET common/funding-application/funding-request` three times. Every other step was read once.
1. By `funding_application_id=113`: 200.
2. With **no parameter**: 404 "Funding request information not found".
3. By `funding_application_id=113` again: 200.

(QA Round 3, R3-BUG-053, Low / P3, Reopened after the 18-Nov retest.)

Cause: the wizard mounts every step at once (`FundApplication.tsx`, `tabs.map(... renderStep ...)`). Every step got the URL's application id except `DocumentUploadStep`, which got `fundingData?.id` from the page's own funding request read.
- **Read 2:** before that first answer came back, the Documents step had no id. `useFundingRequest` with no id reads the "current" record, by design (`tests/modules/funding-application/queries.test.tsx`). So the step asked with no parameter, and the admin API answered 404.
- **Read 3:** when the answer brought `id: 113`, the step joined the page's cache entry. Because the app's `staleTime` is 0, a new observer re-read it.

## Solution
- `FundApplication.tsx`: the Documents step gets `applicationId ?? fundingApplicationId`. This is the URL's application id when there is one, as the other steps get. Its read then shares the page's cache entry from the start.
  - On `/fund-application/:id`, with no application id in the URL, the step still falls back to the id from the answer, as before.
- `DocumentUploadStep.tsx`: the funding request is read only once there is an id to read it by (`enabled: !!(requestId || appId)`).
- `useFundingRequest` and the other step hooks are unchanged. Reading "current" with no id stays their contract.

## Files changed
- `src/pages/applications/fundapplication/FundApplication.tsx`: the Documents step gets the URL's application id.
- `src/pages/applications/fundapplication/components/steps/DocumentUploadStep.tsx`: no funding request read without an id.
- `tests/pages/applications/fundapplication/FundApplication.loadsOnce.test.tsx`: the edit page reads the funding request exactly once, as `?funding_application_id=113`.
- `tests/pages/applications/fundapplication/components/DocumentUploadStep.test.tsx`: with no ids, the step sends no funding request read.
- `e2e/fund-application-funding-sequence.spec.ts`:
  - `openEditPage()` was split out of `openStep()`, and it records each funding request GET.
  - A read with no id answers 404, as the API does.
  - New spec: the page reads the funding request once, by application id.

## Testing
- Both new Vitest tests failed first:
  - the page test got `['?funding_application_id=113', '', '?funding_application_id=113']`, the three reads QA saw;
  - the step test got one read with no id.
- After the fix, `tests/pages/applications/fundapplication` and `tests/modules/funding-application`: 21 files, 205 tests passed.
- `npm run typecheck`: clean.
- Playwright mock, `e2e/fund-application-funding-sequence.spec.ts`:
  - the new spec failed on a build without the fix;
  - with the fix, all 6 passed.

## Open items
- Not retested on admin-stage yet.
- Not changed: `DocumentUploadStep` still falls back to the funding request id as the application id (`initialAppId || initialRequestId || fundingData?.id`). This was not part of this bug.
