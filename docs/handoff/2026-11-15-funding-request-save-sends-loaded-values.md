# Funding Request step: a save right after the load sends the loaded values (CI flake)

2026-11-15

## Problem
CI failed on `tests/pages/applications/fundapplication/components/steps/FundingRequestStep.test.tsx > … Additional Funding Types > sends them with the funding request`, with `expected [] to deeply equal ['SBA Financing', 'Business Line of Credit']`. The failure was intermittent.

Cause: `FundingRequestStep` gave the wizard its `handleSave` through `onRegisterSave(handleSave)` inside a passive `useEffect`. `handleSave` closes over the `funding` state of one render. After the loaded request rendered (the chips were on screen), the effect that registered the new closure had not run yet. A save called in that gap ran the previous closure and posted the empty form (`additional_funding_types: []`). In the app, this was a Save & Next clicked right after the step loaded.

## Solution
The step now registers one stable function, `registeredSave`, which calls `latestSave.current()`. `latestSave` is a ref, updated to the newest `handleSave` in a `useLayoutEffect`, so it is current before anything can see the render. The registered function never goes stale, and the step stops re-registering on every keystroke. `FundApplication.registerSave` only stores the function in a ref, so a stable identity is safe.

## Files changed
- `src/pages/applications/fundapplication/components/steps/FundingRequestStep.tsx`: registers a stable save that delegates to the latest `handleSave` through a ref.
- `tests/pages/applications/fundapplication/components/steps/FundingRequestStep.test.tsx`: new test, "sends the loaded values from a save the wizard took before the load".

## Testing
- New test failed before the fix (`[]` posted, the same as CI) and passes after.
- `tests/pages/applications/fundapplication`: 13 files, 106 tests passed. `FundingRequestStep.test.tsx` was run five times in a row to check the flake.
- `npm run typecheck`: clean.

## Open items
- `BusinessInformationStep`, `DisclosuresStep`, `FederalComplianceStep`, `FinancialInformationStep` and `OwnershipInformationStep` still call `onRegisterSave(handleSave)` from an effect, so they have the same gap. They could use the same stable-save pattern, ideally through a shared hook.
- The borrower portal (`client-fch`) patched its copy of this test with a `waitFor` retry instead of fixing the component, so the gap is still there in that component.
