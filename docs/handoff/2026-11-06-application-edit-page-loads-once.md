# Application edit page loads once, not twice

**Date:** 2026-11-06
**Branch:** bugfix-round1-run2
**Author:** awlad

## Problem
Refreshing `/intake-review/funding-application/:applicationId/edit` (for example `/61/edit`) loaded the page twice: the loaders appeared, the steps rendered, and then everything loaded again.

The page opens by application id, so the wizard's step queries were first keyed `[…, 'current', '61']`. The first `funding-request` response carries `funding_request_id`, which `FundApplication.tsx` stores in `fundingRequestId`. That changed the key of the page query and of every step query to `[…, '<requestId>', '61']`. React Query treated these as new queries and fetched all of them again.

The second fetch was pure waste. With an application id, `lookupParams` sends only `funding_application_id`, so the request id never changes what is read.

## Solution
The six step-read hooks in `modules/funding-application/queries.ts` (`useBusinessInfo`, `useOwnershipInfo`, `useFinancialInfo`, `useDisclosuresConsent`, `useFederalCompliance`, `useFundingRequest`) now build their key with a new `wizardKey()` helper:
- When opened by application id, the key is `[…, 'application', '<id>']`, matching the request, which is also by application id only. The funding request id arriving later no longer changes the key.
- Without an application id, the keys are exactly as before (`[…, id ?? 'current']`, or a string id for `useFundingRequest`), so the `/fund-application/:id` route and the existing tests are unchanged.

Invalidation after a save uses the key prefixes (`fundingApplication.ownershipInfo()` and so on), so saves still refresh the steps.

`useAttestation` keeps its own key. `AttestationStep` calls it without an id, so it played no part in the double load.

## Files changed
- `src/modules/funding-application/queries.ts`: new `wizardKey()`, used by the six step-read hooks.
- `tests/modules/funding-application/queries.test.tsx`: new `'$name opened by application id'` block for the six hooks.

## Testing
- New test: for each of the six hooks, open by application id, then pass the funding request id. The test checks there is no loading state and still exactly one request, by `funding_application_id`. Red first: all 6 failed (`isLoading` went back to true).
- Full Vitest suite: 376 files, 2735 passed, 2 expected fail. `npm run typecheck` is clean.
- Not run: Playwright E2E. Check by hand by refreshing `/intake-review/funding-application/61/edit`: the Network tab should show each step GET once.

## Open items
- In local dev, React StrictMode still mounts components twice, so effects (for example the 700 ms initial loader timer) run twice. That is dev-only and does not cause a second set of requests.
